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

app.prepare().then(async () => {
  console.log("[3] Next.js พร้อมแล้ว กำลังตั้งค่าฐานข้อมูล...");
  const db = await initDb(); // รอให้ฐานข้อมูลโหลดและสร้างตารางเสร็จ

  const expressApp = express();
  expressApp.use(express.json());

  expressApp.post('/api/alert', async (req, res) => {
    try {
      const data = req.body;
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
      const data = req.body;
      const result = await db.run(
        'INSERT INTO devices (node_id, lat, lng) VALUES (?, ?, ?)',
        [data.node_id,data.lat, data.lng]
      );

      const new_Device= await db.get('SELECT * FROM devices WHERE id = ?', result.lastID);

      io.emit('new_devices', new_Device);
      res.status(201).json({ success: true, id: new_Device.id });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: 'Invalid data format' });
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
expressApp.get('/api/device_alerts', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT 
        devices.node_id,
        devices.lat,
        devices.lng,
        tree_events.id AS event_id,
        tree_events.event_type,
        tree_events.status,
        tree_events.created_at
      FROM devices 
      LEFT JOIN tree_events ON devices.node_id = tree_events.node_id 
      ORDER BY tree_events.created_at DESC
    `);

    // จัดกลุ่มตาม node_id
    const devicesMap = {};
    rows.forEach(row => {
      if (!devicesMap[row.node_id]) {
        devicesMap[row.node_id] = {
          node_id: row.node_id,
          lat: row.lat,
          lng: row.lng,
          alerts: []
        };
      }
      // ถ้ามีประวัติแจ้งเตือน ให้ดันเข้าอาร์เรย์ alerts
      if (row.event_id) {
        devicesMap[row.node_id].alerts.push({
          id: row.event_id,
          event_type: row.event_type,
          status: row.status,
          created_at: row.created_at
        });
      }
    });

    res.status(200).json(Object.values(devicesMap));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Database error' });
  }
});

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
  const io = new Server(server, { cors: { origin: "*" }, path: '/socket.io/' });

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