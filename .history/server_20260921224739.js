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

  expressApp.all(/.*/, (req, res) => {
    return handle(req, res);
  });

  const server = createServer(expressApp);
  const io = new Server(server, { cors: { origin: "*" }, path: '/socket.io/' });

  io.on('connection', (socket) => {
    console.log('🟢 Dashboard Connected:', socket.id);
  });

  server.on('upgrade', (req, socket, head) => {
      // ถ้า URL เป็น /_next/hmr (หรือของ webpack) ให้ Next.js จัดการ
      if (req.url?.startsWith('/_next/') || req.url?.startsWith('/__next')) {
        handle(req, socket, head);
      } 
      // นอกนั้นให้ผ่านไปหา Socket.io
    });
    
  server.listen(PORT, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log(`🚀 ArborGuard Server ready on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("❌ พบข้อผิดพลาด:", err);
  process.exit(1);
});