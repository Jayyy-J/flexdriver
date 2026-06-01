const express = require('express');
const db = require('../database/db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/dashboard?mes=05&anio=2026
router.get('/', (req, res) => {
  const now = new Date();
  const mes = (req.query.mes || String(now.getMonth() + 1)).padStart(2, '0');
  const anio = req.query.anio || String(now.getFullYear());
  const uid = req.usuario.id;

  const usuario = db.prepare(
    'SELECT meta_mensual, consumo_km_litro, precio_combustible FROM usuarios WHERE id = ?'
  ).get(uid);

  // Resumen bloques del mes
  const resumenBloques = db.prepare(`
    SELECT
      COUNT(*) as total_bloques,
      SUM(CASE WHEN estado='completado' THEN 1 ELSE 0 END) as completados,
      SUM(CASE WHEN estado='pendiente' THEN 1 ELSE 0 END) as pendientes,
      SUM(CASE WHEN estado='cancelado' THEN 1 ELSE 0 END) as cancelados,
      ROUND(SUM(CASE WHEN estado='completado' THEN pago ELSE 0 END), 2) as ingresos_brutos,
      ROUND(SUM(CASE WHEN estado='completado' THEN km_recorridos ELSE 0 END), 2) as km_totales,
      ROUND(AVG(CASE WHEN estado='completado' THEN pago/NULLIF(duracion_horas,0) ELSE NULL END), 2) as pago_por_hora
    FROM bloques
    WHERE usuario_id = ? AND strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?
  `).get(uid, mes, anio);

  // Resumen gastos del mes
  const resumenGastos = db.prepare(`
    SELECT
      ROUND(SUM(monto), 2) as total_gastos,
      ROUND(SUM(CASE WHEN tipo='combustible' THEN monto ELSE 0 END), 2) as combustible,
      ROUND(SUM(CASE WHEN tipo='mantenimiento' THEN monto ELSE 0 END), 2) as mantenimiento,
      ROUND(SUM(CASE WHEN tipo='seguro' THEN monto ELSE 0 END), 2) as seguro,
      ROUND(SUM(CASE WHEN tipo='datos_moviles' THEN monto ELSE 0 END), 2) as datos_moviles,
      ROUND(SUM(CASE WHEN tipo='otro' THEN monto ELSE 0 END), 2) as otro
    FROM gastos
    WHERE usuario_id = ? AND strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?
  `).get(uid, mes, anio);

  // Ingresos por semana del mes
  const porSemana = db.prepare(`
    SELECT
      CAST((CAST(strftime('%d', fecha) AS INTEGER) - 1) / 7 + 1 AS TEXT) as semana,
      ROUND(SUM(pago), 2) as ingresos
    FROM bloques
    WHERE usuario_id = ? AND estado='completado'
      AND strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?
    GROUP BY semana
    ORDER BY semana
  `).all(uid, mes, anio);

  // Mejores zonas por pago/hora
  const mejoresZonas = db.prepare(`
    SELECT
      zona,
      COUNT(*) as bloques,
      ROUND(AVG(pago / NULLIF(duracion_horas, 0)), 2) as pago_por_hora,
      ROUND(SUM(pago), 2) as total_ganado
    FROM bloques
    WHERE usuario_id = ? AND estado='completado'
      AND strftime('%m', fecha) = ? AND strftime('%Y', fecha) = ?
    GROUP BY zona
    ORDER BY pago_por_hora DESC
    LIMIT 5
  `).all(uid, mes, anio);

  // Últimos 5 bloques
  const ultimosBloques = db.prepare(`
    SELECT * FROM bloques WHERE usuario_id = ?
    ORDER BY fecha DESC, hora_inicio DESC LIMIT 5
  `).all(uid);

  const ingresos = resumenBloques.ingresos_brutos || 0;
  const gastos = resumenGastos.total_gastos || 0;
  const ganancia_neta = Math.round((ingresos - gastos) * 100) / 100;
  const km = resumenBloques.km_totales || 0;
  const margen = ingresos > 0 ? Math.round((ganancia_neta / ingresos) * 100) : 0;
  const costo_km = km > 0 ? Math.round((gastos / km) * 100) / 100 : 0;
  const progreso_meta = usuario.meta_mensual > 0
    ? Math.min(100, Math.round((ganancia_neta / usuario.meta_mensual) * 100))
    : 0;

  res.json({
    periodo: { mes, anio },
    resumen: {
      ingresos_brutos: ingresos,
      ganancia_neta,
      total_gastos: gastos,
      margen_neto: margen,
      km_totales: km,
      costo_por_km: costo_km,
      progreso_meta,
      meta_mensual: usuario.meta_mensual
    },
    bloques: resumenBloques,
    gastos_detalle: resumenGastos,
    ingresos_por_semana: porSemana,
    mejores_zonas: mejoresZonas,
    ultimos_bloques: ultimosBloques
  });
});

module.exports = router;
