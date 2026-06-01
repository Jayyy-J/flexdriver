const API = (() => {
  const BASE = '/api';

  function token() {
    return localStorage.getItem('fd_token');
  }

  async function req(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const t = token();
    if (t) opts.headers['Authorization'] = 'Bearer ' + t;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(BASE + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error de servidor');
    return data;
  }

  return {
    // Auth
    login:    (email, password) => req('POST', '/auth/login',   { email, password }),
    registro: (body)            => req('POST', '/auth/registro', body),
    me:       ()                => req('GET',  '/auth/me'),
    perfil:   (body)            => req('PUT',  '/auth/perfil',  body),

    // Dashboard
    dashboard: (mes, anio) => req('GET', `/dashboard?mes=${mes}&anio=${anio}`),

    // Bloques
    bloques:       (params = {}) => req('GET',    '/bloques?' + new URLSearchParams(params)),
    crearBloque:   (body)        => req('POST',   '/bloques',       body),
    actualizarBloque: (id, body) => req('PUT',    '/bloques/' + id, body),
    eliminarBloque:   (id)       => req('DELETE', '/bloques/' + id),

    // Gastos
    gastos:       (params = {}) => req('GET',    '/gastos?' + new URLSearchParams(params)),
    crearGasto:   (body)        => req('POST',   '/gastos',       body),
    eliminarGasto: (id)         => req('DELETE', '/gastos/' + id),

    setToken: (t) => localStorage.setItem('fd_token', t),
    clearToken: () => localStorage.removeItem('fd_token'),
  };
})();
