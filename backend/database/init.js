const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = process.env.DB_PATH || path.join(dbDir, 'flexdriver.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
    estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','completado','cancelado')),
    notas TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('combustible','mantenimiento','seguro','datos_moviles','otro')),
    monto REAL NOT NULL,
    km_recorridos REAL DEFAULT 0,
    nota TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_bloques_usuario ON bloques(usuario_id);
  CREATE INDEX IF NOT EXISTS idx_bloques_fecha ON bloques(fecha);
  CREATE INDEX IF NOT EXISTS idx_gastos_usuario ON gastos(usuario_id);
  CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);
`);

console.log('✅ Base de datos inicializada en:', dbPath);
module.exports = db;
