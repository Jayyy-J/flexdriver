const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'secret_dev';

// POST /api/auth/registro
router.post('/registro', (req, res) => {
  const { nombre, apellido, email, password } = req.body;
  if (!nombre || !apellido || !email || !password)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });

  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existe) return res.status(409).json({ error: 'El email ya está registrado' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO usuarios (nombre, apellido, email, password_hash) VALUES (?, ?, ?, ?)'
  ).run(nombre, apellido, email, hash);

  const token = jwt.sign({ id: result.lastInsertRowid, email }, SECRET, { expiresIn: '7d' });
  const usuario = db.prepare('SELECT id, nombre, apellido, email, vehiculo, consumo_km_litro, precio_combustible, meta_mensual, created_at FROM usuarios WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ token, usuario });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });

  const valido = bcrypt.compareSync(password, usuario.password_hash);
  if (!valido) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign({ id: usuario.id, email: usuario.email }, SECRET, { expiresIn: '7d' });
  const { password_hash, ...datos } = usuario;

  res.json({ token, usuario: datos });
});

// GET /api/auth/me
const auth = require('../middleware/auth');
router.get('/me', auth, (req, res) => {
  const usuario = db.prepare(
    'SELECT id, nombre, apellido, email, vehiculo, consumo_km_litro, precio_combustible, meta_mensual, created_at FROM usuarios WHERE id = ?'
  ).get(req.usuario.id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(usuario);
});

// PUT /api/auth/perfil
router.put('/perfil', auth, (req, res) => {
  const { nombre, apellido, vehiculo, consumo_km_litro, precio_combustible, meta_mensual } = req.body;
  db.prepare(`
    UPDATE usuarios SET nombre=?, apellido=?, vehiculo=?, consumo_km_litro=?, precio_combustible=?, meta_mensual=?, updated_at=datetime('now')
    WHERE id=?
  `).run(nombre, apellido, vehiculo, consumo_km_litro, precio_combustible, meta_mensual, req.usuario.id);

  const usuario = db.prepare(
    'SELECT id, nombre, apellido, email, vehiculo, consumo_km_litro, precio_combustible, meta_mensual FROM usuarios WHERE id = ?'
  ).get(req.usuario.id);
  res.json(usuario);
});

module.exports = router;
