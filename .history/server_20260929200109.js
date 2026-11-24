console.log("[1] เริ่มรันไฟล์ server.js...");
const express = require('express');
const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');

console.log("[2] โหลดโมดูลฐานข้อมูล...");
const { initDb } = require('./lib/db.js');

const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const PORT = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev, hostname: '0.0.0.0', port: PORT });
const handle = app.getRequestHandler();
const mqtt = require('mqtt');


async function startServer() {
  let db = await initDb();

  let io = null;

  //  void async function InitDBFunc(){
  // const db = await initDb();// รอให้ฐานข้อมูลโหลดและสร้างตารางเสร็จ

  // }



  // MQTT ZONE
  // ใช้ mqtts:// (มี s เพราะเป็นพอร์ต 8883 เข้ารหัส)
  const brokerUrl = 'mqtts://8ef1f963d1b148208842c37f76971b73.s1.eu.hivemq.cloud:8883';

  // ใส่ Username และ Password ที่สร้างในขั้นตอนที่ 1
  const options = {
    username: 'arborguardEsp1',
    password: 'arborguardEsp1',
    clientId: 'Nextjs_Backend_' + Math.random().toString(16).substr(2, 8)
  };

  const mqttClient = mqtt.connect(brokerUrl, options);

  mqttClient.on('connect', () => {
    console.log('🟢 Backend เชื่อมต่อ HiveMQ Cloud สำเร็จแล้ว');
    mqttClient.subscribe('arborguard/alert');
    mqttClient.subscribe('arborguard/regist_devices');
    mqttClient.subscribe('arborguard/clear');
  });

  // =========================================================
  // 2. จัดการข้อความที่ได้รับจาก ESP32 ผ่าน MQTT
  // =========================================================
  mqttClient.on('message', async (topic, message) => {
    try {
      // แปลงข้อความที่ได้จาก ESP32 กลับมาเป็น JSON Object
      const data = JSON.parse(message.toString());

      // ตรวจสอบว่าข้อความมาจากหัวข้อไหน และทำงานแบบเดียวกับ Express Route เดิม
      if (topic === 'arborguard/alert') {
        await handleAlert(data);
      }
      else if (topic === 'arborguard/regist_devices') {
        await handleRegistDevice(data);
      }
      else if (topic === 'arborguard/clear') {
        await handleClear(data);
      }
    } catch (err) {
      console.error(`[MQTT_ERROR] ข้อผิดพลาดในการจัดการข้อความหัวข้อ ${topic}:`, err);
    }
  });

  // =========================================================
  // 3. ย้าย Logic เดิมจาก Express Routes มาเป็น Functions
  // =========================================================

  async function handleAlert(data) {
    try {
      const existing = await db.get(
        "SELECT id FROM tree_events WHERE node_id = ? AND status = 'active'",
        [data.node_id]
      );

      if (existing) {
        console.log(`⚠️ มีการแจ้งเตือน active อยู่แล้วสำหรับ Node: ${data.node_id}`);
        return;
      }

      const result = await db.run(
        'INSERT INTO tree_events (node_id, event_type, lat, lng, status) VALUES (?, ?, ?, ?, ?)',
        [data.node_id, data.event_type, data.lat, data.lng, 'active']
      );

      const newEvent = await db.get('SELECT * FROM tree_events WHERE id = ?', result.lastID);

      // ส่งข้อมูลแจ้งเตือนไปยังหน้าเว็บที่เปิดอยู่ผ่าน Socket.io 
      if (io) {
        io.emit('new_alert', newEvent);
      } else {
        console.log(`❌ send io error`);
      }
      console.log(`✅ สร้างแจ้งเตือนใหม่ผ่าน MQTT สำเร็จ (Node: ${data.node_id})`);
    } catch (e) {
      console.error('❌ ข้อผิดพลาดใน handleAlert:', e);
    }
  }

  async function handleRegistDevice(data) {
    try {
      const { node_id, lat, lng } = data;

      if (!node_id || lat === undefined || lng === undefined) {
        console.log('⚠️ ข้อมูลไม่ครบ: node_id, lat, lng');
        return;
      }

      const existingDevice = await db.get(
        'SELECT * FROM devices WHERE node_id = ?',
        [node_id]
      );

      if (existingDevice) {
        console.log(`⚠️ อุปกรณ์ถูกลงทะเบียนแล้ว (Node: ${node_id})`);
        return;
      }

      const result = await db.run(
        'INSERT INTO devices (node_id, lat, lng) VALUES (?, ?, ?)',
        [node_id, lat, lng]
      );

      const new_Device = await db.get(
        'SELECT * FROM devices WHERE id = ?',
        [result.lastID]
      );

      // แจ้งเตือนหน้าเว็บผ่าน WebSocket ให้ปักหมุดใหม่ทันที
      if (io) {
        io.emit('new_devices', new_Device);
      } else {
        console.log(`❌ send io error`);
      }
      console.log(`✅ ลงทะเบียนอุปกรณ์ใหม่ผ่าน MQTT สำเร็จ (Node: ${node_id})`);
    } catch (e) {
      console.error('[REGIST_DEVICE_ERROR]:', e);
    }
  }

  async function handleClear(data) {
    try {
      const result = await db.run(`
      UPDATE tree_events 
      SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP 
      WHERE node_id = ? AND status = 'active'
    `, [data.node_id]);

      if (result.changes > 0) {
        console.log(`✅ เคลียร์การแจ้งเตือนผ่าน MQTT สำเร็จ (Node: ${data.node_id})`);
        if (io) {
          io.emit('alert_cleared', { node_id: data.node_id });
        } else {
          console.log(`❌ send io error`);
        }
      } else {
        console.log(`⚠️ ไม่พบการแจ้งเตือนที่ active สำหรับ Node: ${data.node_id}`);
      }
    } catch (e) {
      console.error('❌ ข้อผิดพลาดใน handleClear:', e);
    }
  }


  // HTTP ZONE

  app.prepare().then(async () => {
    console.log("[3] Next.js พร้อมแล้ว กำลังตั้งค่าฐานข้อมูล...");

    const expressApp = express();
    expressApp.use(express.json());

    expressApp.post('/api/alert', async (req, res) => {
      try {
        const data = req.body;

        const existing = await db.get(
          "SELECT id FROM tree_events WHERE node_id = ? AND status = 'active'",
          [data.node_id]
        );

        if (existing) {
          // ถ้ามีอยู่แล้ว ไม่บันทึกซ้ำ
          return res.status(409).json({ message: "Alert already active for this node" });
        }


        const result = await db.run(
          'INSERT INTO tree_events (node_id, event_type, lat, lng, status) VALUES (?, ?, ?, ?, ?)',
          [data.node_id, data.event_type, data.lat, data.lng, 'active']
        );

        const newEvent = await db.get('SELECT * FROM tree_events WHERE id = ?', result.lastID);

        io.emit('new_alert', newEvent);
        res.status(201).json({ success: true, id: newEvent.id });
      } catch (e) {
        console.error(e);
        res.status(400).json({ error: 'Invalid data format' });
      }
    });

    expressApp.post('/api/regist_devices', async (req, res) => {
      try {
        const { node_id, lat, lng } = req.body;

        // ตรวจสอบข้อมูลเบื้องต้น
        if (!node_id || lat === undefined || lng === undefined) {
          return res.status(400).json({ error: 'Missing required fields: node_id, lat, lng' });
        }

        // 🟢 1. ใช้ db.get เพื่อตรวจเช็คว่ามีอุปกรณ์นี้อยู่แล้วหรือไม่
        const existingDevice = await db.get(
          'SELECT * FROM devices WHERE node_id = ?',
          [node_id]
        );

        // 🟢 2. ถ้ามีอยู่แล้ว ส่ง 409 หรือ 200 (แล้วแต่ความต้องการ) และ return ทันที
        if (existingDevice) {
          // สำหรับ IoT: ถ้าเปิดเครื่องใหม่แล้วมีในระบบอยู่แล้ว อาจตอบ 200 กลับไปเพื่อให้ ESP32 ผ่าน setup ได้
          return res.status(200).json({
            success: true,
            message: 'Device already registered',
            device: existingDevice
          });
        }

        // 🟢 3. ถ้ายังไม่มี ให้บันทึกแถวใหม่
        const result = await db.run(
          'INSERT INTO devices (node_id, lat, lng) VALUES (?, ?, ?)',
          [node_id, lat, lng]
        );

        // ดึงข้อมูลแถวล่าสุดที่เพิ่ง Insert
        const new_Device = await db.get(
          'SELECT * FROM devices WHERE id = ?',
          [result.lastID]
        );

        // แจ้งเตือนหน้าเว็บผ่าน WebSocket ให้ปักหมุดใหม่ทันที
        io.emit('new_devices', new_Device);

        res.status(201).json({ success: true, id: new_Device.id });
      } catch (e) {
        console.error('[REGIST_DEVICE_ERROR]:', e);
        res.status(500).json({ error: 'Database error' });
      }
    });
    expressApp.post('/api/clear', async (req, res) => {
      try {
        const data = req.body;
        const result = await db.run(`
        UPDATE tree_events 
        SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP 
        WHERE node_id = ? AND status = 'active'
      `, [data.node_id]);

        if (result.changes > 0) {
          io.emit('alert_cleared', { node_id: data.node_id });
        }
        res.status(200).json({ success: true, cleared_count: result.changes });
      } catch (e) {
        console.error(e);
        res.status(400).json({ error: 'Invalid data format' });
      }
    });

    expressApp.get('/api/active', async (req, res) => {
      try {
        const activeEvents = await db.all("SELECT * FROM tree_events WHERE status = 'active' ORDER BY created_at DESC");
        res.status(200).json(activeEvents);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Database error' });
      }
    });
    expressApp.get('/api/alerts_all', async (req, res) => {
      try {
        const activeEvents = await db.all("SELECT * FROM tree_events WHERE status = 'active' ORDER BY created_at DESC");
        res.status(200).json(activeEvents);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Database error' });
      }
    });

    // expressApp.get('/api/device_alerts', async (req, res) => {
    //   try {
    //     const rows = await db.all(`
    //       SELECT 
    //         devices.node_id,
    //         devices.lat,
    //         devices.lng,
    //         tree_events.id AS event_id,
    //         tree_events.event_type,
    //         tree_events.status,
    //         tree_events.created_at
    //       FROM devices 
    //       LEFT JOIN tree_events ON devices.node_id = tree_events.node_id 
    //       ORDER BY tree_events.created_at DESC
    //     `);

    //     // จัดกลุ่มตาม node_id
    //     const devicesMap = {};
    //     rows.forEach(row => {
    //       if (!devicesMap[row.node_id]) {
    //         devicesMap[row.node_id] = {
    //           node_id: row.node_id,
    //           lat: row.lat,
    //           lng: row.lng,
    //           alerts: []
    //         };
    //       }
    //       // ถ้ามีประวัติแจ้งเตือน ให้ดันเข้าอาร์เรย์ alerts
    //       if (row.event_id) {
    //         devicesMap[row.node_id].alerts.push({
    //           id: row.event_id,
    //           event_type: row.event_type,
    //           status: row.status,
    //           created_at: row.created_at
    //         });
    //       }
    //     });

    //     res.status(200).json(Object.values(devicesMap));
    //   } catch (e) {
    //     console.error(e);
    //     res.status(500).json({ error: 'Database error' });
    //   }
    // });

    expressApp.get('/api/devices', async (req, res) => {
      try {
        const espUsers = await db.all("SELECT * FROM devices");
        res.status(200).json(espUsers);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Database error' });
      }
    });


    expressApp.get('/api/nonactive', async (req, res) => {
      try {
        const activeEvents = await db.all("SELECT * FROM tree_events WHERE status != 'active' ORDER BY created_at DESC");
        res.status(200).json(activeEvents);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Database error' });
      }
    });

    expressApp.all(/.*/, (req, res) => {
      return handle(req, res);
    });

    const server = createServer(expressApp);
    io = new Server(server, { cors: { origin: "*" }, path: '/socket.io/' });

    io.on('connection', (socket) => {
      console.log('🟢 Dashboard Connected:', socket.id);
    });


    server.listen(PORT, '0.0.0.0', (err) => {
      if (err) throw err;
      console.log(`🚀 ArborGuard Server ready on http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error("❌ พบข้อผิดพลาด:", err);
    process.exit(1);
  });



}

startServer();