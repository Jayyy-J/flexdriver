require('dotenv').config();
const { getDB } = require('./db');

async function init() {
  const db = await getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      vehiculo TEXT,
      consumo_km_litro REAL DEFAULT 14.5,
      precio_combustible REAL DEFAULT 1.10,
      meta_mensual REAL DEFAULT 1500,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bloques (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fin TEXT NOT NULL,
      duracion_horas REAL,
      zona TEXT NOT NULL,
      pago REAL NOT NULL,
      km_recorridos REAL DEFAULT 0,
      estado TEXT DEFAULT 'pendiente',
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gastos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      tipo TEXT NOT NULL,
      monto REAL NOT NULL,
      km_recorridos REAL DEFAULT 0,
      nota TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
  `);

  console.log('✅ Base de datos inicializada en:', require('./db').dbPath);
}

init().catch(console.error);
module.exports = { init };
