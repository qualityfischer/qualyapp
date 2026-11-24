/* =====================================================================
   QualyApp · capa de datos
   - Con config.js lleno: habla con Supabase (funciones aud_*).
   - Con config.js vacío: MODO DEMOSTRACIÓN, todo vive en este navegador.
   - Sin señal: las auditorías se guardan en una cola (IndexedDB) y se
     envían solas al recuperar internet.
   ===================================================================== */
const Nube = (() => {
  const CFG = window.CFG || {};
  const DEMO = !CFG.url || !CFG.key;
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };

  /* ---------- IndexedDB: cola sin señal y caché ---------- */
  const idb = (() => {
    let p;
    const abrir = () => p || (p = new Promise((res, rej) => {
      const r = indexedDB.open('calidad_en_piso', 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('cola', { keyPath: 'id' }); r.result.createObjectStore('cache', { keyPath: 'k' }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
    const tx = (st, modo, fn) => abrir().then(db => new Promise((res, rej) => {
      const t = db.transaction(st, modo), rq = fn(t.objectStore(st));
      t.oncomplete = () => res(rq ? rq.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    }));
    // Si el navegador no deja usar IndexedDB (vista previa, modo privado), se usa memoria.
    const mem = { cola: new Map(), cache: new Map() }, llave = st => st === 'cola' ? 'id' : 'k';
    const o = (f, m) => (...a) => f(...a).catch(() => m(...a));
    return {
      put: o((st, v) => tx(st, 'readwrite', s => s.put(v)), (st, v) => { mem[st].set(v[llave(st)], v); }),
      del: o((st, k) => tx(st, 'readwrite', s => s.delete(k)), (st, k) => { mem[st].delete(k); }),
      all: o(st => tx(st, 'readonly', s => s.getAll()), st => [...mem[st].values()]),
      get: o((st, k) => tx(st, 'readonly', s => s.get(k)), (st, k) => mem[st].get(k))
    };
  })();
  const cacheGet = async k => { try { const r = await idb.get('cache', k); return r ? r.v : undefined; } catch (e) { return undefined; } };
  const cacheSet = (k, v) => idb.put('cache', { k, v }).catch(() => { });

  /* ---------- Supabase ---------- */
  class SinSenal extends Error { }
  async function rpcSupabase(fn, args) {
    let r;
    try {
      r = await fetch(CFG.url.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
        method: 'POST', body: JSON.stringify(args || {}),
        // Llave nueva (sb_publishable_…) va solo en apikey; la anon antigua (JWT) también en Authorization.
        headers: Object.assign({ apikey: CFG.key, 'Content-Type': 'application/json' }, /^eyJ/.test(CFG.key) ? { Authorization: 'Bearer ' + CFG.key } : {})
      });
    } catch (e) { throw new SinSenal('Sin conexión'); }
    const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { }
    if (!r.ok) throw new Error((j && (j.message || j.hint)) || ('Error del servidor ' + r.status));
    return j;
  }

  /* ---------- Modo demostración (simula las mismas funciones del SQL) ---------- */
  const Demo = (() => {
    let db = null;
    const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
    async function cargar() {
      if (db) return db;
      db = await cacheGet('demo_db');
      if (!db) {
        db = { usuarios: {}, sesiones: {}, articulos: {}, calendario: SEMILLA.calendario, registros: [], fotos: {}, folios: {} };
        SEMILLA.usuarios.forEach(([v, n, r]) => db.usuarios[v] = { visa: v, nombre: n, rol: r, pin: '123456', cambiar_pin: true, intentos: 0, bloq: 0, activo: true });
        SEMILLA.articulos.forEach(([i, d]) => db.articulos[i] = d);
        await guardarDB();
      }
      if (!db.formatos) db.formatos = JSON.parse(JSON.stringify(FMT_BASE));
      return db;
    }
    const guardarDB = () => cacheSet('demo_db', db);
    const puede = (rol, t) => rol === 'admin' || rol === 'inspector' || (['ingeniero', 'jefe', 'gerente'].includes(rol) && ['ino', 'cap'].includes(t));
    const veTodo = rol => ['admin', 'jefe', 'gerente', 'director'].includes(rol);
    function usuario(token) {
      const s = db.sesiones[token], u = s && s.expira > Date.now() && db.usuarios[s.visa];
      if (!u || !u.activo) throw new Error('Sesión no válida o vencida. Vuelve a entrar.');
      s.expira = Math.max(s.expira, Date.now() + 10 * 3600e3); return u;
    }
    function folio(serie, fecha) {
      const a = new Date(fecha).getFullYear(), k = serie + a; db.folios[k] = (db.folios[k] || 0) + 1;
      return `${serie}-${String(a).slice(2)}-${String(db.folios[k]).padStart(4, '0')}`;
    }
    const F = {
      async aud_login({ p_visa, p_pin }) {
        const u = db.usuarios[String(p_visa || '').trim().toUpperCase()];
        if (!u || !u.activo) return { error: 'VISA no registrada o inactiva.' };
        if (u.bloq > Date.now()) return { error: 'Usuario bloqueado por intentos fallidos. Intenta en 15 minutos.' };
        if (u.pin !== p_pin) { u.intentos++; if (u.intentos >= 5) { u.intentos = 0; u.bloq = Date.now() + 15 * 60e3; } await guardarDB(); return { error: 'PIN incorrecto.' }; }
        u.intentos = 0; u.bloq = 0; const t = uuid(); db.sesiones[t] = { visa: u.visa, expira: Date.now() + 10 * 3600e3 }; await guardarDB();
        return { token: t, visa: u.visa, nombre: u.nombre, rol: u.rol, cambiar_pin: u.cambiar_pin };
      },
      async aud_logout({ p_token }) { delete db.sesiones[p_token]; await guardarDB(); },
      async aud_cambiar_pin({ p_token, p_actual, p_nuevo }) {
        const u = usuario(p_token);
        if (u.pin !== p_actual) throw new Error('El PIN actual no es correcto.');
        if (!/^\d{6}$/.test(p_nuevo || '')) throw new Error('El PIN nuevo debe tener 6 números.');
        if (['123456', '000000', '111111', '654321'].includes(p_nuevo)) throw new Error('Elige un PIN menos obvio.');
        u.pin = p_nuevo; u.cambiar_pin = false; await guardarDB();
      },
      async aud_catalogo({ p_token }) {
        usuario(p_token);
        return { articulos: Object.entries(db.articulos).sort(), calendario: db.calendario, usuarios: Object.values(db.usuarios).filter(u => u.activo).map(u => [u.visa, u.nombre, u.rol]), formatos: db.formatos };
      },
      async aud_alta_articulo({ p_token, p_item, p_desc }) {
        const u = usuario(p_token); if (u.rol === 'director') throw new Error('Tu perfil no da de alta artículos.');
        if (!String(p_item || '').trim() || !String(p_desc || '').trim()) throw new Error('Faltan número o descripción.');
        if (!db.articulos[p_item.trim()]) db.articulos[p_item.trim()] = p_desc.trim(); await guardarDB();
      },
      async aud_guardar({ p_token, p_reg }) {
        const u = usuario(p_token), r0 = db.registros.find(r => r.id === p_reg.id);
        if (r0) return { id: r0.id, folio: r0.folio, reporte: r0.reporte, repetido: true };
        if (!puede(u.rol, p_reg.tipo)) throw new Error('Tu perfil no puede registrar este tipo de auditoría.');
        const fecha = p_reg.fecha || new Date().toISOString();
        const serie = { iny: 'INY', sop: 'SOP', ino: 'INO', paq: 'PAQ', fug: 'FUG' }[p_reg.tipo] || (p_reg.area === 'iny' ? 'CAPI' : 'CAPS');
        let rep = null;
        if (p_reg.con_reporte) { const g = p_reg.grupo && db.registros.find(r => r.grupo === p_reg.grupo && r.reporte); rep = g ? g.reporte : folio(p_reg.tipo === 'paq' ? 'PM' : 'H', fecha); }
        const r = { id: p_reg.id, grupo: p_reg.grupo || null, folio: folio(serie, fecha), tipo: p_reg.tipo, area: p_reg.area || null, fecha, turno: p_reg.turno, visa: u.visa,
          nivel: p_reg.nivel || null, titulo: p_reg.titulo, datos: p_reg.datos || {}, hallazgos: p_reg.hallazgos || 0, parada: !!p_reg.parada, reporte: rep, firmas: p_reg.firmas || null };
        db.registros.push(r); db.fotos[r.id] = p_reg.fotos || []; await guardarDB();
        return { id: r.id, folio: r.folio, reporte: rep, fotos: (p_reg.fotos || []).length, repetido: false };
      },
      async aud_historial({ p_token, p_limite }) {
        const u = usuario(p_token);
        return db.registros.filter(r => veTodo(u.rol) || r.visa === u.visa).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, p_limite || 150)
          .map(r => ({ id: r.id, grupo: r.grupo, folio: r.folio, tipo: r.tipo, area: r.area, fecha: r.fecha, turno: r.turno, visa: r.visa, nombre: db.usuarios[r.visa].nombre, nivel: r.nivel, titulo: r.titulo, hallazgos: r.hallazgos, parada: r.parada, reporte: r.reporte }));
      },
      async aud_registro({ p_token, p_id }) {
        const u = usuario(p_token), r = db.registros.find(x => x.id === p_id);
        if (!r) throw new Error('No se encontró el registro.');
        if (!(veTodo(u.rol) || r.visa === u.visa)) throw new Error('No tienes acceso a este registro.');
        return { registro: r, nombre: db.usuarios[r.visa].nombre, fotos: db.fotos[r.id] || [] };
      },
      async aud_hechas_hoy({ p_token }) {
        usuario(p_token); const h = new Date().toDateString();
        return db.registros.filter(r => new Date(r.fecha).toDateString() === h).map(r => ({ tipo: r.tipo, turno: r.turno, visa: r.visa }));
      },
      async aud_admin_usuarios({ p_token }) {
        if (usuario(p_token).rol !== 'admin') throw new Error('Solo el administrador.');
        return Object.values(db.usuarios).sort((a, b) => a.visa.localeCompare(b.visa)).map(u => ({ visa: u.visa, nombre: u.nombre, rol: u.rol, activo: u.activo, cambiar_pin: u.cambiar_pin, bloqueado: u.bloq > Date.now() }));
      },
      async aud_admin_usuario({ p_token, p_visa, p_nombre, p_rol, p_activo }) {
        const u = usuario(p_token); if (u.rol !== 'admin') throw new Error('Solo el administrador.');
        const v = p_visa.trim().toUpperCase(); if (v === u.visa && (p_rol !== 'admin' || !p_activo)) throw new Error('No puedes quitarte el perfil de administrador.');
        const x = db.usuarios[v] || (db.usuarios[v] = { visa: v, pin: '123456', cambiar_pin: true, intentos: 0, bloq: 0 });
        Object.assign(x, { nombre: p_nombre.trim(), rol: p_rol, activo: p_activo }); await guardarDB();
      },
      async aud_admin_formato({ p_token, p_clave, p_codigo, p_ret, p_rev, p_fcr }) {
        if (usuario(p_token).rol !== 'admin') throw new Error('Solo el administrador.');
        if (!String(p_codigo || '').trim()) throw new Error('Falta el código del formato.');
        const f = db.formatos[p_clave]; if (!f) throw new Error('Formato no encontrado.');
        Object.assign(f, { codigo: p_codigo.trim(), ret: (p_ret || '').trim(), rev: (p_rev || '').trim(), fcr: (p_fcr || '').trim() }); await guardarDB(); return null;
      },
      async aud_admin_reset_pin({ p_token, p_visa }) {
        if (usuario(p_token).rol !== 'admin') throw new Error('Solo el administrador.');
        const x = db.usuarios[p_visa]; if (x) Object.assign(x, { pin: '123456', cambiar_pin: true, intentos: 0, bloq: 0 }); await guardarDB();
      },
      async aud_admin_calendario({ p_token, p_tipo, p_anio, p_filas }) {
        if (usuario(p_token).rol !== 'admin') throw new Error('Solo el administrador.');
        db.calendario = db.calendario.filter(c => !(c[0] === p_tipo && c[1].startsWith(p_anio + '-'))).concat(p_filas.map(f => [p_tipo, f[0], f[1], f[2]]));
        await guardarDB(); return p_filas.length;
      },
      async aud_admin_articulos({ p_token, p_filas }) {
        if (usuario(p_token).rol !== 'admin') throw new Error('Solo el administrador.');
        let n = 0; p_filas.forEach(([i, d]) => { if (i && !db.articulos[i]) { db.articulos[i] = d || '(sin descripción)'; n++; } }); await guardarDB(); return n;
      }
    };
    return { async rpc(fn, args) { await cargar(); if (!F[fn]) throw new Error('Función no disponible: ' + fn); return F[fn](JSON.parse(JSON.stringify(args || {}))); } };
  })();

  const rpc = (fn, args) => DEMO ? Demo.rpc(fn, args) : rpcSupabase(fn, args);

  /* ---------- Sesión ---------- */
  let ses = LS.get('cep_sesion', null);
  if (ses && ses.expira < Date.now()) { ses = null; LS.del('cep_sesion'); }
  const token = () => ses && ses.token;

  async function login(visa, pin) {
    const r = await rpc('aud_login', { p_visa: visa, p_pin: pin });
    if (!r || r.error) throw new Error((r && r.error) || 'No se pudo entrar.');
    ses = Object.assign({}, r, { expira: Date.now() + 10 * 3600e3 }); LS.set('cep_sesion', ses);
    // Reasigna el token a los pendientes de esta persona que se quedaron sin sesión
    const cola = await idb.all('cola').catch(() => []);
    for (const it of cola) if (it.visa === r.visa && it.sinSesion) { it.token = r.token; it.sinSesion = false; it.error = ''; await idb.put('cola', it); }
    return ses;
  }
  async function logout() {
    const pend = (await idb.all('cola').catch(() => [])).some(it => it.token === token());
    // Si hay pendientes por enviar con esta sesión, no se cierra en el servidor (la cola la sigue usando).
    if (token() && !pend) rpc('aud_logout', { p_token: token() }).catch(() => { });
    ses = null; LS.del('cep_sesion');
  }
  const conToken = (fn, args) => rpc(fn, Object.assign({ p_token: token() }, args || {}));

  /* ---------- Catálogo (con copia para trabajar sin señal) ---------- */
  async function catalogo() {
    try { const c = await conToken('aud_catalogo'); await cacheSet('catalogo', c); return c; }
    catch (e) { if (e instanceof SinSenal) { const c = await cacheGet('catalogo'); if (c) return c; } throw e; }
  }

  /* ---------- Guardar con cola ---------- */
  async function guardar(reg) {
    try { return await conToken('aud_guardar', { p_reg: reg }); }
    catch (e) {
      if (!(e instanceof SinSenal)) throw e;
      await idb.put('cola', { id: reg.id, fn: 'aud_guardar', token: token(), visa: ses.visa, nombre: ses.nombre, reg, creado: new Date().toISOString(), error: '' });
      return { id: reg.id, folio: null, reporte: null, pendiente: true };
    }
  }
  let sincronizando = false;
  async function sincronizar() {
    if (sincronizando) return { enviados: 0, pendientes: (await pendientes()).length };
    sincronizando = true; let env = 0;
    try {
      const cola = (await idb.all('cola')).sort((a, b) => a.creado.localeCompare(b.creado));
      for (const it of cola) {
        if (it.sinSesion) continue;
        try { const r = await rpc(it.fn, { p_token: it.token, p_reg: it.reg }); await idb.del('cola', it.id); env++; await cacheSet('folio_' + it.id, r); }
        catch (e) {
          if (e instanceof SinSenal) break;
          it.error = e.message; if (/Sesión no válida/.test(e.message)) it.sinSesion = true; await idb.put('cola', it);
        }
      }
    } finally { sincronizando = false; }
    return { enviados: env, pendientes: (await pendientes()).length };
  }
  const pendientes = () => idb.all('cola').catch(() => []);

  /* ---------- Historial y consulta ---------- */
  async function historial() {
    let lista = [];
    try { lista = await conToken('aud_historial', { p_limite: 200 }); await cacheSet('hist_' + ses.visa, lista); }
    catch (e) { if (e instanceof SinSenal) lista = (await cacheGet('hist_' + ses.visa)) || []; else throw e; }
    const pend = (await pendientes()).filter(it => it.visa === ses.visa || ['admin', 'jefe', 'gerente', 'director'].includes(ses.rol))
      .map(it => ({ id: it.reg.id, grupo: it.reg.grupo, folio: null, tipo: it.reg.tipo, area: it.reg.area, fecha: it.reg.fecha, turno: it.reg.turno, visa: it.visa, nombre: it.nombre,
        nivel: it.reg.nivel, titulo: it.reg.titulo, hallazgos: it.reg.hallazgos, parada: it.reg.parada, reporte: null, pendiente: true, error: it.error }));
    return pend.concat(lista.filter(x => !pend.some(p => p.id === x.id)));
  }
  async function registro(id) {
    const it = await idb.get('cola', id).catch(() => null);
    if (it) return { registro: Object.assign({}, it.reg, { visa: it.visa, folio: null, reporte: null }), nombre: it.nombre, fotos: it.reg.fotos || [], pendiente: true };
    const k = 'reg_' + id;
    try { const r = await conToken('aud_registro', { p_id: id }); await cacheSet(k, r); return r; }
    catch (e) { if (e instanceof SinSenal) { const r = await cacheGet(k); if (r) return r; throw new Error('Sin señal: este registro no está guardado en el celular.'); } throw e; }
  }
  async function hechasHoy() {
    let h = []; const hoy = new Date().toDateString(), k = 'hechas_' + (ses && ses.visa);
    try { h = await conToken('aud_hechas_hoy') || []; await cacheSet(k, { hoy, h }); }
    catch (e) { if (!(e instanceof SinSenal)) throw e; const c = await cacheGet(k); h = c && c.hoy === hoy ? c.h.slice() : []; }
    (await pendientes()).forEach(it => { if (new Date(it.reg.fecha).toDateString() === hoy) h.push({ tipo: it.reg.tipo, turno: it.reg.turno, visa: it.visa }); });
    return h;
  }

  /* reintento automático */
  window.addEventListener('online', () => sincronizar().then(r => r.enviados && window.dispatchEvent(new CustomEvent('cep-sync', { detail: r }))));
  setInterval(() => { if (navigator.onLine) sincronizar().then(r => r.enviados && window.dispatchEvent(new CustomEvent('cep-sync', { detail: r }))); }, 60000);

  return {
    DEMO, SinSenal, sesion: () => ses, login, logout, catalogo, guardar, sincronizar, pendientes, historial, registro, hechasHoy,
    cambiarPin: (a, n) => conToken('aud_cambiar_pin', { p_actual: a, p_nuevo: n }).then(() => { ses.cambiar_pin = false; LS.set('cep_sesion', ses); }),
    altaArticulo: (i, d) => conToken('aud_alta_articulo', { p_item: i, p_desc: d }),
    admin: {
      usuarios: () => conToken('aud_admin_usuarios'),
      usuario: (v, n, r, a) => conToken('aud_admin_usuario', { p_visa: v, p_nombre: n, p_rol: r, p_activo: a }),
      resetPin: v => conToken('aud_admin_reset_pin', { p_visa: v }),
      calendario: (t, anio, filas) => conToken('aud_admin_calendario', { p_tipo: t, p_anio: anio, p_filas: filas }),
      articulos: filas => conToken('aud_admin_articulos', { p_filas: filas }),
      formato: (k, f) => conToken('aud_admin_formato', { p_clave: k, p_codigo: f.codigo, p_ret: f.ret, p_rev: f.rev, p_fcr: f.fcr })
    }
  };
})();
