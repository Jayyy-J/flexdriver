const express = require('express');
const db = require('../database/db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/bloques
router.get('/', (req, res) => {
  const { mes, anio, estado } = req.query;
  let query = 'SELECT * FROM bloques WHERE usuario_id = ?';
  const params = [req.usuario.id];

  if (mes && anio) {
    query += ` AND strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?`;
    params.push(mes.padStart(2, '0'), anio);
  }
  if (estado) { query += ' AND estado = ?'; params.push(estado); }
  query += ' ORDER BY fecha DESC, hora_inicio DESC';

  const bloques = db.prepare(query).all(...params);
  res.json(bloques);
});

// GET /api/bloques/:id
router.get('/:id', (req, res) => {
  const bloque = db.prepare('SELECT * FROM bloques WHERE id = ? AND usuario_id = ?').get(req.params.id, req.usuario.id);
  if (!bloque) return res.status(404).json({ error: 'Bloque no encontrado' });
  res.json(bloque);
});

// POST /api/bloques
router.post('/', (req, res) => {
  const { fecha, hora_inicio, hora_fin, zona, pago, km_recorridos, estado, notas } = req.body;
  if (!fecha || !hora_inicio || !hora_fin || !zona || pago == null)
    return res.status(400).json({ error: 'fecha, hora_inicio, hora_fin, zona y pago son requeridos' });

  const duracion = calcularDuracion(hora_inicio, hora_fin);

  const result = db.prepare(`
    INSERT INTO bloques (usuario_id, fecha, hora_inicio, hora_fin, duracion_horas, zona, pago, km_recorridos, estado, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.usuario.id, fecha, hora_inicio, hora_fin, duracion, zona, pago, km_recorridos || 0, estado || 'pendiente', notas || null);

  const bloque = db.prepare('SELECT * FROM bloques WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(bloque);
});

// PUT /api/bloques/:id
router.put('/:id', (req, res) => {
  const existe = db.prepare('SELECT id FROM bloques WHERE id = ? AND usuario_id = ?').get(req.params.id, req.usuario.id);
  if (!existe) return res.status(404).json({ error: 'Bloque no encontrado' });

  const { fecha, hora_inicio, hora_fin, zona, pago, km_recorridos, estado, notas } = req.body;
  const duracion = hora_inicio && hora_fin ? calcularDuracion(hora_inicio, hora_fin) : null;

  db.prepare(`
    UPDATE bloques SET
      fecha = COALESCE(?, fecha),
      hora_inicio = COALESCE(?, hora_inicio),
      hora_fin = COALESCE(?, hora_fin),
      duracion_horas = COALESCE(?, duracion_horas),
      zona = COALESCE(?, zona),
      pago = COALESCE(?, pago),
      km_recorridos = COALESCE(?, km_recorridos),
      estado = COALESCE(?, estado),
      notas = COALESCE(?, notas),
      updated_at = datetime('now')
    WHERE id = ? AND usuario_id = ?
  `).run(fecha, hora_inicio, hora_fin, duracion, zona, pago, km_recorridos, estado, notas, req.params.id, req.usuario.id);

  const bloque = db.prepare('SELECT * FROM bloques WHERE id = ?').get(req.params.id);
  res.json(bloque);
});

// DELETE /api/bloques/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM bloques WHERE id = ? AND usuario_id = ?').run(req.params.id, req.usuario.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Bloque no encontrado' });
  res.json({ mensaje: 'Bloque eliminado' });
});

function calcularDuracion(inicio, fin) {
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  return Math.max(0, mins / 60);
}

module.exports = router;
