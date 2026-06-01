const express = require('express');
const db = require('../database/db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/gastos
router.get('/', (req, res) => {
  const { mes, anio, tipo } = req.query;
  let query = 'SELECT * FROM gastos WHERE usuario_id = ?';
  const params = [req.usuario.id];

  if (mes && anio) {
    query += ` AND strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?`;
    params.push(mes.padStart(2, '0'), anio);
  }
  if (tipo) { query += ' AND tipo = ?'; params.push(tipo); }
  query += ' ORDER BY fecha DESC';

  const gastos = db.prepare(query).all(...params);
  res.json(gastos);
});

// GET /api/gastos/:id
router.get('/:id', (req, res) => {
  const gasto = db.prepare('SELECT * FROM gastos WHERE id = ? AND usuario_id = ?').get(req.params.id, req.usuario.id);
  if (!gasto) return res.status(404).json({ error: 'Gasto no encontrado' });
  res.json(gasto);
});

// POST /api/gastos
router.post('/', (req, res) => {
  const { fecha, tipo, monto, km_recorridos, nota } = req.body;
  if (!fecha || !tipo || monto == null)
    return res.status(400).json({ error: 'fecha, tipo y monto son requeridos' });

  const tipos = ['combustible', 'mantenimiento', 'seguro', 'datos_moviles', 'otro'];
  if (!tipos.includes(tipo))
    return res.status(400).json({ error: `tipo debe ser uno de: ${tipos.join(', ')}` });

  const result = db.prepare(
    'INSERT INTO gastos (usuario_id, fecha, tipo, monto, km_recorridos, nota) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.usuario.id, fecha, tipo, monto, km_recorridos || 0, nota || null);

  const gasto = db.prepare('SELECT * FROM gastos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(gasto);
});

// PUT /api/gastos/:id
router.put('/:id', (req, res) => {
  const existe = db.prepare('SELECT id FROM gastos WHERE id = ? AND usuario_id = ?').get(req.params.id, req.usuario.id);
  if (!existe) return res.status(404).json({ error: 'Gasto no encontrado' });

  const { fecha, tipo, monto, km_recorridos, nota } = req.body;
  db.prepare(`
    UPDATE gastos SET
      fecha = COALESCE(?, fecha),
      tipo = COALESCE(?, tipo),
      monto = COALESCE(?, monto),
      km_recorridos = COALESCE(?, km_recorridos),
      nota = COALESCE(?, nota)
    WHERE id = ? AND usuario_id = ?
  `).run(fecha, tipo, monto, km_recorridos, nota, req.params.id, req.usuario.id);

  const gasto = db.prepare('SELECT * FROM gastos WHERE id = ?').get(req.params.id);
  res.json(gasto);
});

// DELETE /api/gastos/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM gastos WHERE id = ? AND usuario_id = ?').run(req.params.id, req.usuario.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Gasto no encontrado' });
  res.json({ mensaje: 'Gasto eliminado' });
});

module.exports = router;
