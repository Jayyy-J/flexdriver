require('dotenv').config();
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, '../../database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = process.env.DB_PATH || path.join(dbDir, 'flexdriver.db');

// Wrapper síncrono sobre sql.js para mantener la misma API de better-sqlite3
class SyncDB {
  constructor(sqlJs, dbPath) {
    this.dbPath = dbPath;
    if (fs.existsSync(dbPath)) {
      const buf = fs.readFileSync(dbPath);
      this.db = new sqlJs.Database(buf);
    } else {
      this.db = new sqlJs.Database();
    }
    // Guarda al disco cada vez que haya cambios
    this._save = () => {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    };
  }

  pragma(str) {
    this.db.run('PRAGMA ' + str);
  }

  exec(sql) {
    this.db.run(sql);
    this._save();
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        self.db.run(sql, params);
        self._save();
        // Obtener lastInsertRowid
        const res = self.db.exec('SELECT last_insert_rowid() as id');
        const lastInsertRowid = res[0]?.values[0][0] || 0;
        return { lastInsertRowid, changes: self.db.getRowsModified() };
      },
      get(...params) {
        const stmt = self.db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const stmt = self.db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      }
    };
  }
}

let dbInstance = null;

async function getDB() {
  if (dbInstance) return dbInstance;
  const SQL = await initSqlJs();
  dbInstance = new SyncDB(SQL, dbPath);
  return dbInstance;
}

// Exportamos una Promise que resuelve el db — cada módulo hace `await getDB()`
module.exports = { getDB, dbPath };
