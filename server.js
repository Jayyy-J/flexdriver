require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Inicializa DB y tablas al arrancar
require('./backend/database/init');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

app.use('/api/auth',      require('./backend/routes/auth'));
app.use('/api/bloques',   require('./backend/routes/bloques'));
app.use('/api/gastos',    require('./backend/routes/gastos'));
app.use('/api/dashboard', require('./backend/routes/dashboard'));
app.get('/api/health', (_, res) => res.json({ status: 'ok', version: '1.0.0' }));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'frontend', 'index.html')));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 FlexDriver corriendo en http://localhost:${PORT}`);
  console.log(`📦 Entorno: ${process.env.NODE_ENV || 'development'}`);
});
