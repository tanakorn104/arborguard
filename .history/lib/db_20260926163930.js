const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.join(process.cwd(), 'arborguard.db');

// ตัวแปรสำหรับเก็บ Database Instance
let dbInstance = null;

// ฟังก์ชันเปิดและเตรียมตารางฐานข้อมูล
async function initDb() {
  if (!dbInstance) {
    dbInstance = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // สร้างตาราง
    await dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS tree_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME
      )
    `);
    await dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS esp_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME
      )
    `);
  }
  return dbInstance;
}

// ส่งออกฟังก์ชัน แทนที่จะส่ง Object ตรงๆ
module.exports = { initDb };