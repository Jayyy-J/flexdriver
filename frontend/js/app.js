// Estado global
let usuario = null;
let dashData = null;
let bloquesData = [];
let filtroEstado = '';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function mesActual() { return String(new Date().getMonth() + 1); }
function anioActual() { return String(new Date().getFullYear()); }

// ─── INICIO ──────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const t = localStorage.getItem('fd_token');
  if (t) {
    try {
      usuario = await API.me();
      mostrarApp();
    } catch {
      API.clearToken();
      mostrarAuth();
    }
  } else {
    mostrarAuth();
  }
  document.getElementById('g-fecha').value = hoyISO();
});

function mostrarAuth() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display = 'none';
}

async function mostrarApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'flex';
  actualizarHeaderUsuario();
  await cargarDashboard();
}

function actualizarHeaderUsuario() {
  const ini = (usuario.nombre[0] + usuario.apellido[0]).toUpperCase();
  document.getElementById('topbar-avatar').textContent = ini;
  document.getElementById('badge-periodo').textContent =
    `${MESES[new Date().getMonth()]} ${anioActual()}`;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function switchAuth(modo) {
  document.getElementById('form-login').style.display   = modo === 'login'    ? 'block' : 'none';
  document.getElementById('form-registro').style.display = modo === 'registro' ? 'block' : 'none';
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && modo === 'login') || (i === 1 && modo === 'registro'));
  });
  ocultarError('auth-error');
}

async function login() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const res = await API.login(email, password);
    API.setToken(res.token);
    usuario = res.usuario;
    mostrarApp();
  } catch (e) {
    mostrarError('auth-error', e.message);
  }
}

async function registro() {
  const body = {
    nombre:   document.getElementById('reg-nombre').value.trim(),
    apellido: document.getElementById('reg-apellido').value.trim(),
    email:    document.getElementById('reg-email').value.trim(),
    password: document.getElementById('reg-password').value,
  };
  try {
    const res = await API.registro(body);
    API.setToken(res.token);
    usuario = res.usuario;
    mostrarApp();
  } catch (e) {
    mostrarError('auth-error', e.message);
  }
}

function logout() {
  API.clearToken();
  usuario = null;
  mostrarAuth();
}

// ─── NAVEGACIÓN ───────────────────────────────────────────────────────────────
const TITULOS = { dashboard:'Dashboard', bloques:'Mis bloques', ganancias:'Ganancias', tracker:'Km & Gastos', perfil:'Perfil' };

async function navTo(id, el) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + id).classList.add('active');
  if (el) el.classList.add('active');
  document.getElementById('topbar-title').textContent = TITULOS[id] || id;

  if (id === 'dashboard')  await cargarDashboard();
  if (id === 'bloques')    await cargarBloques();
  if (id === 'ganancias')  await cargarGanancias();
  if (id === 'tracker')    await cargarTracker();
  if (id === 'perfil')     cargarPerfil();
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
async function cargarDashboard() {
  try {
    dashData = await API.dashboard(mesActual(), anioActual());
    renderDashMetrics(dashData.resumen);
    renderDashSemanas(dashData.ingresos_por_semana);
    renderDashMeta(dashData.resumen);
    renderDashUltimos(dashData.ultimos_bloques);
    renderDashGastos(dashData.gastos_detalle);
  } catch (e) {
    console.error('Dashboard error:', e);
  }
}

function renderDashMetrics(r) {
  document.getElementById('dash-metrics').innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Ingresos brutos / mes</div>
      <div class="metric-value accent">$${fmt(r.ingresos_brutos)}</div>
      <div class="metric-delta" style="color:var(--muted)">${MESES[new Date().getMonth()]}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Ganancia neta estimada</div>
      <div class="metric-value success">$${fmt(r.ganancia_neta)}</div>
      <div class="metric-delta" style="color:var(--muted)">Margen: ${r.margen_neto}%</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Bloques completados</div>
      <div class="metric-value">${dashData.bloques.completados || 0}</div>
      <div class="metric-delta" style="color:var(--muted)">de ${dashData.bloques.total_bloques || 0} totales</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Km recorridos</div>
      <div class="metric-value">${fmt(r.km_totales)} <span style="font-size:14px;color:var(--muted)">km</span></div>
      <div class="metric-delta" style="color:var(--muted)">$${r.costo_por_km}/km</div>
    </div>`;
}

function renderDashSemanas(semanas) {
  const cont = document.getElementById('weekChart');
  cont.innerHTML = '';
  if (!semanas.length) { cont.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:20px 0">Sin datos este mes</div>'; return; }
  const max = Math.max(...semanas.map(s => s.ingresos));
  semanas.forEach((s, i) => {
    const col = document.createElement('div'); col.className = 'bar-col';
    const bar = document.createElement('div'); bar.className = 'bar' + (i === semanas.length - 1 ? ' active' : '');
    bar.style.height = Math.round((s.ingresos / max) * 70) + 'px';
    bar.title = '$' + s.ingresos;
    const lbl = document.createElement('div'); lbl.className = 'bar-label'; lbl.textContent = 'S' + s.semana;
    col.append(bar, lbl); cont.appendChild(col);
  });
}

function renderDashMeta(r) {
  document.getElementById('dash-meta').innerHTML = `
    <div class="net-label">Meta mensual</div>
    <div class="net-value">$${fmt(r.meta_mensual)}</div>
    <div class="net-sub">Llevas $${fmt(r.ganancia_neta)} netos</div>
    <div class="progress-wrap" style="margin-top:12px">
      <div class="progress-header"><span>Progreso</span><span>${r.progreso_meta}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${r.progreso_meta}%"></div></div>
    </div>`;
}

function renderDashUltimos(bloques) {
  if (!bloques.length) { document.getElementById('dash-ultimos').innerHTML = '<div class="empty-state">No hay bloques registrados</div>'; return; }
  document.getElementById('dash-ultimos').innerHTML = bloques.map(b => bloqueRow(b)).join('');
}

function renderDashGastos(g) {
  const rows = [
    ['ti-gas-station', 'Combustible', g.combustible],
    ['ti-tool',        'Mantenimiento', g.mantenimiento],
    ['ti-shield',      'Seguro', g.seguro],
    ['ti-device-mobile','Datos móviles', g.datos_moviles],
    ['ti-dots',        'Otro', g.otro],
  ].filter(r => r[2] > 0);

  const total = g.total_gastos || 0;
  let html = rows.map(([ic, label, val]) => `
    <div class="expense-row">
      <div class="expense-label"><i class="ti ${ic}"></i> ${label}</div>
      <div style="font-family:var(--mono);font-weight:500;color:var(--danger)">-$${fmt(val)}</div>
    </div>`).join('');
  html += `<div class="expense-row" style="border-top:1px solid var(--border);margin-top:4px;padding-top:10px">
    <div style="color:var(--text);font-weight:600">Total gastos</div>
    <div style="font-family:var(--mono);font-size:16px;color:var(--danger)">-$${fmt(total)}</div>
  </div>`;
  document.getElementById('dash-gastos').innerHTML = html || '<div class="empty-state">Sin gastos este mes</div>';
}

// ─── BLOQUES ──────────────────────────────────────────────────────────────────
async function cargarBloques() {
  const params = {};
  if (filtroEstado) params.estado = filtroEstado;
  params.mes = mesActual(); params.anio = anioActual();
  bloquesData = await API.bloques(params);
  renderBloques();
}

function renderBloques() {
  const cont = document.getElementById('lista-bloques');
  if (!bloquesData.length) { cont.innerHTML = '<div class="empty-state">No hay bloques para mostrar</div>'; return; }
  cont.innerHTML = bloquesData.map(b => `
    <div class="block-item">
      <div class="block-dot dot-${b.estado === 'completado' ? 'done' : b.estado === 'pendiente' ? 'pending' : 'cancel'}"></div>
      <div class="block-info">
        <div class="block-zone">${b.zona}</div>
        <div class="block-date">${formatFecha(b.fecha)} · ${b.hora_inicio}–${b.hora_fin} · ${b.duracion_horas}h · ${b.km_recorridos} km</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="block-pay">$${fmt(b.pago)}</div>
        <span class="pill pill-${b.estado === 'completado' ? 'done' : b.estado === 'pendiente' ? 'pending' : 'cancel'}">${b.estado}</span>
        <div class="action-row">
          <button class="btn btn-ghost btn-sm" onclick="editarBloque(${b.id})"><i class="ti ti-edit"></i></button>
          <button class="btn btn-ghost btn-sm" onclick="eliminarBloque(${b.id})" style="color:var(--danger)"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </div>`).join('');
}

function filtrarBloques(estado, el) {
  filtroEstado = estado;
  document.querySelectorAll('#view-bloques .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  cargarBloques();
}

function abrirModalBloque() {
  document.getElementById('b-id').value = '';
  document.getElementById('b-fecha').value = hoyISO();
  document.getElementById('b-zona').value = '';
  document.getElementById('b-inicio').value = '';
  document.getElementById('b-fin').value = '';
  document.getElementById('b-pago').value = '';
  document.getElementById('b-km').value = '';
  document.getElementById('b-estado').value = 'pendiente';
  document.getElementById('b-notas').value = '';
  document.getElementById('modal-bloque-titulo').textContent = 'Nuevo bloque';
  ocultarError('bloque-error');
  document.getElementById('modal-bloque').style.display = 'flex';
}

async function editarBloque(id) {
  const b = bloquesData.find(x => x.id === id);
  if (!b) return;
  document.getElementById('b-id').value       = b.id;
  document.getElementById('b-fecha').value    = b.fecha;
  document.getElementById('b-zona').value     = b.zona;
  document.getElementById('b-inicio').value   = b.hora_inicio;
  document.getElementById('b-fin').value      = b.hora_fin;
  document.getElementById('b-pago').value     = b.pago;
  document.getElementById('b-km').value       = b.km_recorridos;
  document.getElementById('b-estado').value   = b.estado;
  document.getElementById('b-notas').value    = b.notas || '';
  document.getElementById('modal-bloque-titulo').textContent = 'Editar bloque';
  ocultarError('bloque-error');
  document.getElementById('modal-bloque').style.display = 'flex';
}

async function guardarBloque() {
  const id = document.getElementById('b-id').value;
  const body = {
    fecha:        document.getElementById('b-fecha').value,
    hora_inicio:  document.getElementById('b-inicio').value,
    hora_fin:     document.getElementById('b-fin').value,
    zona:         document.getElementById('b-zona').value.trim(),
    pago:         parseFloat(document.getElementById('b-pago').value),
    km_recorridos:parseFloat(document.getElementById('b-km').value) || 0,
    estado:       document.getElementById('b-estado').value,
    notas:        document.getElementById('b-notas').value.trim() || null,
  };
  try {
    if (id) await API.actualizarBloque(id, body);
    else    await API.crearBloque(body);
    cerrarModal('modal-bloque');
    await cargarBloques();
    await cargarDashboard();
  } catch (e) {
    mostrarError('bloque-error', e.message);
  }
}

async function eliminarBloque(id) {
  if (!confirm('¿Eliminar este bloque?')) return;
  await API.eliminarBloque(id);
  await cargarBloques();
  await cargarDashboard();
}

// ─── GANANCIAS ────────────────────────────────────────────────────────────────
async function cargarGanancias() {
  if (!dashData) dashData = await API.dashboard(mesActual(), anioActual());
  const r = dashData.resumen;
  document.getElementById('calc-ingreso').value = r.ingresos_brutos;
  document.getElementById('calc-combus').value  = dashData.gastos_detalle.combustible || 0;
  document.getElementById('calc-mant').value    = dashData.gastos_detalle.mantenimiento || 0;
  document.getElementById('calc-otros').value   = (dashData.gastos_detalle.seguro || 0) + (dashData.gastos_detalle.datos_moviles || 0) + (dashData.gastos_detalle.otro || 0);
  calcGanancia();

  // Mejor semana
  const semanas = dashData.ingresos_por_semana;
  const mejor = semanas.length ? semanas.reduce((a, b) => a.ingresos > b.ingresos ? a : b) : null;
  document.getElementById('mejor-semana').innerHTML = mejor ? `
    <div class="net-label">Mejor semana del mes</div>
    <div class="net-value">$${fmt(mejor.ingresos)}</div>
    <div class="net-sub">Semana ${mejor.semana}</div>` : `<div class="net-label">Sin datos</div>`;

  // Zonas
  const zonas = dashData.mejores_zonas;
  document.getElementById('mejores-zonas').innerHTML = zonas.length
    ? zonas.map(z => `<div class="km-stat"><div class="km-key">${z.zona}</div><div class="km-val" style="color:var(--accent)">$${z.pago_por_hora}/h</div></div>`).join('')
    : '<div class="empty-state">Sin datos de zonas</div>';
}

function calcGanancia() {
  const ing  = parseFloat(document.getElementById('calc-ingreso').value) || 0;
  const com  = parseFloat(document.getElementById('calc-combus').value)  || 0;
  const man  = parseFloat(document.getElementById('calc-mant').value)    || 0;
  const otr  = parseFloat(document.getElementById('calc-otros').value)   || 0;
  const gastos = com + man + otr;
  const neta   = ing - gastos;
  const margen = ing > 0 ? Math.round((neta / ing) * 100) : 0;
  const km     = dashData?.resumen?.km_totales || 1;
  document.getElementById('res-gastos').textContent  = '-$' + fmt(gastos);
  document.getElementById('res-neta').textContent    = '$'  + fmt(neta);
  document.getElementById('res-margen').textContent  = margen + '%';
  document.getElementById('res-km-calc').textContent = '$' + (gastos / km).toFixed(2);
}

// ─── TRACKER ──────────────────────────────────────────────────────────────────
async function cargarTracker() {
  if (!dashData) dashData = await API.dashboard(mesActual(), anioActual());
  const g = dashData.gastos_detalle;
  const r = dashData.resumen;

  document.getElementById('tracker-resumen').innerHTML = `
    <div class="km-stat"><div class="km-key">Total km recorridos</div><div class="km-val">${fmt(r.km_totales)} km</div></div>
    <div class="km-stat"><div class="km-key">Combustible</div><div class="km-val" style="color:var(--danger)">$${fmt(g.combustible)}</div></div>
    <div class="km-stat"><div class="km-key">Mantenimiento</div><div class="km-val" style="color:var(--danger)">$${fmt(g.mantenimiento)}</div></div>
    <div class="km-stat"><div class="km-key">Costo / km real</div><div class="km-val" style="color:var(--accent)">$${r.costo_por_km}</div></div>
    <div class="km-stat"><div class="km-key">Total gastos</div><div class="km-val" style="color:var(--danger)">$${fmt(g.total_gastos)}</div></div>`;

  const total = g.total_gastos || 1;
  const dist = [
    { label: 'Combustible', val: g.combustible, color: 'var(--danger)' },
    { label: 'Mantenimiento', val: g.mantenimiento, color: 'var(--accent)' },
    { label: 'Seguro', val: g.seguro, color: 'var(--success)' },
    { label: 'Datos / Otro', val: (g.datos_moviles||0)+(g.otro||0), color: 'var(--muted)' },
  ].filter(d => d.val > 0);

  document.getElementById('tracker-dist').innerHTML = dist.map(d => {
    const pct = Math.round((d.val / total) * 100);
    return `<div class="progress-wrap" style="margin-top:10px">
      <div class="progress-header"><span>${d.label}</span><span>${pct}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${d.color}"></div></div>
    </div>`;
  }).join('') || '<div class="empty-state">Sin gastos</div>';

  const gastos = await API.gastos({ mes: mesActual(), anio: anioActual() });
  const lista = document.getElementById('lista-gastos');
  lista.innerHTML = gastos.length ? gastos.map(g => `
    <div class="block-item">
      <div class="block-info">
        <div class="block-zone">${tipoLabel(g.tipo)}${g.nota ? ' · ' + g.nota : ''}</div>
        <div class="block-date">${formatFecha(g.fecha)} · ${g.km_recorridos} km</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-family:var(--mono);font-weight:700;color:var(--danger)">-$${fmt(g.monto)}</div>
        <button class="btn btn-ghost btn-sm" onclick="eliminarGasto(${g.id})" style="color:var(--danger)"><i class="ti ti-trash"></i></button>
      </div>
    </div>`).join('') : '<div class="empty-state">Sin gastos registrados este mes</div>';
}

async function guardarGasto() {
  const body = {
    tipo:          document.getElementById('g-tipo').value,
    monto:         parseFloat(document.getElementById('g-monto').value),
    fecha:         document.getElementById('g-fecha').value,
    km_recorridos: parseFloat(document.getElementById('g-km').value) || 0,
    nota:          document.getElementById('g-nota').value.trim() || null,
  };
  const msg = document.getElementById('gasto-msg');
  try {
    await API.crearGasto(body);
    document.getElementById('g-monto').value = '';
    document.getElementById('g-km').value = '';
    document.getElementById('g-nota').value = '';
    msg.style.display = 'block'; msg.style.color = 'var(--success)'; msg.textContent = '✓ Gasto guardado';
    dashData = null;
    await cargarTracker();
    setTimeout(() => { msg.style.display = 'none'; }, 3000);
  } catch (e) {
    msg.style.display = 'block'; msg.style.color = 'var(--danger)'; msg.textContent = e.message;
  }
}

async function eliminarGasto(id) {
  if (!confirm('¿Eliminar este gasto?')) return;
  await API.eliminarGasto(id);
  dashData = null;
  await cargarTracker();
}

// ─── PERFIL ───────────────────────────────────────────────────────────────────
function cargarPerfil() {
  const ini = (usuario.nombre[0] + usuario.apellido[0]).toUpperCase();
  document.getElementById('perfil-avatar').textContent = ini;
  document.getElementById('perfil-nombre').textContent = usuario.nombre + ' ' + usuario.apellido;
  document.getElementById('perfil-desde').textContent  = 'Activo desde ' + formatFecha(usuario.created_at?.split('T')[0] || '');
  document.getElementById('p-nombre').value   = usuario.nombre;
  document.getElementById('p-apellido').value = usuario.apellido;
  document.getElementById('p-vehiculo').value = usuario.vehiculo || '';
  document.getElementById('p-consumo').value  = usuario.consumo_km_litro;
  document.getElementById('p-precio').value   = usuario.precio_combustible;
  document.getElementById('p-meta').value     = usuario.meta_mensual;
}

async function guardarPerfil() {
  const body = {
    nombre:            document.getElementById('p-nombre').value.trim(),
    apellido:          document.getElementById('p-apellido').value.trim(),
    vehiculo:          document.getElementById('p-vehiculo').value.trim(),
    consumo_km_litro:  parseFloat(document.getElementById('p-consumo').value),
    precio_combustible:parseFloat(document.getElementById('p-precio').value),
    meta_mensual:      parseFloat(document.getElementById('p-meta').value),
  };
  try {
    usuario = await API.perfil(body);
    actualizarHeaderUsuario();
    const msg = document.getElementById('perfil-msg');
    msg.textContent = '✓ Guardado';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  } catch (e) {
    alert(e.message);
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function bloqueRow(b) {
  const estadoClass = b.estado === 'completado' ? 'done' : b.estado === 'pendiente' ? 'pending' : 'cancel';
  return `<div class="block-item">
    <div class="block-dot dot-${estadoClass}"></div>
    <div class="block-info">
      <div class="block-zone">${b.zona} · ${b.duracion_horas}h</div>
      <div class="block-date">${formatFecha(b.fecha)} · ${b.hora_inicio}–${b.hora_fin}</div>
    </div>
    <div style="text-align:right">
      <div class="block-pay">$${fmt(b.pago)}</div>
      <span class="pill pill-${estadoClass}">${b.estado}</span>
    </div>
  </div>`;
}

function cerrarModal(id) { document.getElementById(id).style.display = 'none'; }
function mostrarError(id, msg) { const el = document.getElementById(id); el.textContent = msg; el.style.display = 'block'; }
function ocultarError(id) { const el = document.getElementById(id); el.style.display = 'none'; }
function fmt(n) { return (n || 0).toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function hoyISO() { return new Date().toISOString().split('T')[0]; }
function formatFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d} ${MESES[parseInt(m)-1]} ${y}`;
}
function tipoLabel(t) {
  return { combustible:'Combustible', mantenimiento:'Mantenimiento', seguro:'Seguro', datos_moviles:'Datos móviles', otro:'Otro' }[t] || t;
}

// Cerrar modal al hacer clic fuera
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.style.display = 'none';
  }
});
