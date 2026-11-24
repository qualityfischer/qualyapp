/* =====================================================================
   QualyApp · Fischer S.A. de C.V. · Departamento de Calidad
   App de auditorías (Inyección, Soplado, Inocuidad, Por capas, Paquete muestra)
   ===================================================================== */
const IMG = { logo: 'img/logo.png' };
let INSPECTOR = null;
let ARTS = new Map();
let CAL = [];          // [tipo, 'YYYY-MM-DD', nivel, texto]
const desc = a => ARTS.get(String(a || '').trim()) || '';
const pad = n => String(n).padStart(2, '0');
const hoy = () => { const d = new Date(); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const hora = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const turnoN = () => { const h = new Date().getHours(); return h >= 6 && h < 14 ? 1 : h >= 14 && h < 22 ? 2 : 3; };
const turno = () => ['', '1.er turno', '2.º turno', '3.er turno'][turnoN()];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const semana = () => { const d = new Date(); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y) / 864e5 + 1) / 7); };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
const esInsp = () => ['inspector', 'admin'].includes(INSPECTOR.rol);
const tNum = t => { const m = String(t).match(/^(\d)/); return m ? +m[1] : 0; };
const puede = m => ({ inspector: ['iny', 'sop', 'paq', 'ino', 'cap', 'fug'], admin: ['iny', 'sop', 'paq', 'ino', 'cap', 'fug'], ingeniero: ['ino', 'cap'], jefe: ['ino', 'cap'], gerente: ['ino', 'cap'], director: [] }[INSPECTOR.rol] || []).includes(m);
function mios(tipo) {
  const u = INSPECTOR;
  return CAL.filter(c => c[0] === tipo).filter(c => {
    const n = c[2], t = c[3];
    if (esInsp()) return n === 1;
    if (tipo === 'ino') return (n === 2 && t.includes(' ' + u.visa + ' ')) || (n === 3 && u.visa === 'CV') || (n === 4 && u.rol === 'gerente');
    return ((n === 2 || n === 3) && ['ingeniero', 'jefe'].includes(u.rol)) || (n === 4 && ['gerente', 'ingeniero'].includes(u.rol));
  });
}
function prox(tipo) { const h = hoyISO(), t = turnoN(); return mios(tipo).filter(c => c[1] > h || (c[1] === h && (!tNum(c[3]) || tNum(c[3]) >= t))).sort((a, b) => a[1].localeCompare(b[1]))[0]; }
function hoyToca(tipo) { const h = hoyISO(), t = turnoN(); return mios(tipo).find(c => c[1] === h && (!tNum(c[3]) || tNum(c[3]) === t)); }
const maqDe = txt => (String(txt).match(/\(([^)]+)\)/) || [])[1] || '';
const fechaCorta = iso => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

let FMTS = JSON.parse(JSON.stringify(FMT_BASE));
let S = { view: 'login', hist: [], hechas: {}, pend: 0, cargando: false };

function toast(m, ms) { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), ms || 2600); }
function go(v, extra) {
  if (v === 'home' || v === 'seg') { S.pdfBack = v === 'seg' ? 'seg' : null; S.editando = null; }
  S.view = v; Object.assign(S, extra || {}); render(); window.scrollTo(0, 0);
  if (v === 'home' || v === 'seg') refrescar();
}
function banner() {
  const demo = Nube.DEMO ? '<div class="proto">MODO DEMOSTRACIÓN · los datos se guardan solo en este celular</div>' : '';
  const E = S.editando, fol = E && Object.values(E.folios || {}).filter(Boolean).join(' · ');
  return demo + (E && ['iny', 'sop', 'ino', 'cap', 'fug', 'paq', 'firma'].includes(S.view) ? `<div class="editando">✏️ Corrigiendo ${fol ? esc(fol) : 'la auditoría'} · se guarda con el mismo folio</div>` : '');
}
function header(t, back = 'home') { return banner() + `<header class="top">${back ? `<button class="back" onclick="go('${back}')" aria-label="Regresar">‹</button>` : ''}<h1>${t}</h1><span class="chip">${INSPECTOR ? INSPECTOR.visa + ' · ' : ''}${turno()}</span></header>` + prog(); }
function prog() {
  if (!S.au || !['iny', 'sop', 'ino', 'cap', 'fug'].includes(S.view)) return ''; let d = 0, n = 0; const a = S.au;
  if (S.view === 'iny') { if (!a.area) return ''; n = INY[a.area].items.length; d = INY[a.area].items.filter((_, i) => a.r[i]?.v).length; }
  if (S.view === 'fug') { n = MAQ_FUG.length; d = MAQ_FUG.filter(fugLista).length; }
  if (S.view === 'sop') { n = SOP.length; d = SOP.filter((_, i) => a.r[i]?.v).length; }
  if (S.view === 'ino') { n = INO.length + EPP.length; d = INO.filter((_, i) => a.r[i]?.v).length + EPP.filter((_, i) => a.e[i]?.v).length; }
  if (S.view === 'cap') { ['iny', 'sop'].forEach(ar => { const A = a.A[ar]; n++; if (A.est === 'parada') { d++; return; } if (A.est !== 'ok') return; d++; const cols = colsCap(ar); preguntas(ar).forEach(([sc, q], i) => cols.forEach(c => { if (aplica(sc, c)) { n++; if (a.r[ar + '|' + i + '|' + c]?.v) d++; } })); }); }
  if (!n) return ''; const pct = Math.round(d / n * 100);
  return `<div class="progress"><span>${d} de ${n} respondidas · ${pct} %</span><div class="bar2"><i style="width:${pct}%"></i></div></div>`;
}
const ICO_USR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';
const ICO_ADM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
function tabbar() {
  return `<nav class="tabbar"><button class="${S.view === 'home' ? 'on' : ''}" onclick="go('home')">${ICO.home}Inicio</button><button class="${S.view === 'seg' ? 'on' : ''}" onclick="go('seg')">${ICO.hist}Historial${S.pend ? ` <b class="badge">${S.pend}</b>` : ''}</button>`
    + `<button class="${S.view === 'cuenta' ? 'on' : ''}" onclick="go('cuenta')">${ICO_USR}Mi cuenta</button>`
    + (INSPECTOR.rol === 'admin' ? `<button class="${S.view === 'admin' ? 'on' : ''}" onclick="go('admin')">${ICO_ADM}Admin</button>` : '') + `</nav>`;
}
async function refrescar() {
  if (!INSPECTOR) return;
  try {
    const [h, hechas, pend] = await Promise.all([Nube.historial(), Nube.hechasHoy(), Nube.pendientes()]);
    S.hist = h; S.pend = pend.length; S.hechas = {};
    hechas.filter(x => x.turno === turno()).forEach(x => S.hechas[x.tipo] = (S.hechas[x.tipo] || 0) + 1);
    S.hoyTotal = hechas.length; S.fugHoy = hechas.some(x => x.tipo === 'fug');
    if (['home', 'seg'].includes(S.view)) render();
  } catch (e) { if (/Sesión no válida/.test(e.message)) { toast('Tu sesión venció. Vuelve a entrar.'); salir(true); } }
}

/* ---------- ENTRADA ---------- */
function vLogin() {
  return banner() + `<div class="login"><div class="top3"><div class="lg"><img src="${IMG.logo}" alt="Fischer"></div><h2>QualyApp</h2><p>Auditorías de calidad en piso</p></div>
 <div class="panel"><label class="f">VISA</label><input class="i" id="lv" maxlength="4" autocapitalize="characters" autocomplete="off" placeholder="Ej. LX" onkeydown="if(event.key==='Enter')document.getElementById('lp').focus()">
 <label class="f">PIN</label><input class="i" id="lp" type="password" inputmode="numeric" maxlength="6" placeholder="••••••" onkeydown="if(event.key==='Enter')entrar()">
 <div class="note" style="margin-top:16px">El celular es compartido: al terminar tu turno, entra a <b>Mi cuenta</b> y toca <b>Salir</b>.${Nube.DEMO ? '<br>Demostración: PIN inicial de todos 123456.' : ''}</div></div></div>
 <div class="bar"><button class="btn" id="btnEntrar" onclick="entrar()">Entrar</button></div>`;
}
async function entrar() {
  const v = document.getElementById('lv').value.trim().toUpperCase(), p = document.getElementById('lp').value, b = document.getElementById('btnEntrar');
  if (!v || !p) { toast('Escribe tu VISA y tu PIN'); return; }
  b.disabled = true; b.textContent = 'Entrando…';
  try {
    const s = await Nube.login(v, p); INSPECTOR = { visa: s.visa, nombre: s.nombre, rol: s.rol };
    await cargarCatalogo();
    if (s.cambiar_pin) go('pin', { pinObligatorio: true }); else go('home');
    Nube.sincronizar().then(r => r.enviados && toast(`${r.enviados} pendiente(s) enviados`));
  } catch (e) { toast(e instanceof Nube.SinSenal ? 'Sin señal: para entrar se necesita internet.' : e.message); b.disabled = false; b.textContent = 'Entrar'; }
}
async function cargarCatalogo() {
  const c = await Nube.catalogo(); ARTS = new Map(c.articulos); CAL = c.calendario || []; FMTS = Object.assign(JSON.parse(JSON.stringify(FMT_BASE)), c.formatos || {});
}
function salir(sinServidor) { if (!sinServidor) Nube.logout(); else Nube.logout(); INSPECTOR = null; S = { view: 'login', hist: [], hechas: {}, pend: 0 }; render(); }

/* ---------- PIN ---------- */
function vPin() {
  return banner() + `<header class="top">${S.pinObligatorio ? '' : `<button class="back" onclick="go('cuenta')">‹</button>`}<h1>Cambiar PIN</h1></header><main>
 ${S.pinObligatorio ? '<div class="note">Es tu primer ingreso: elige un PIN personal de 6 números. Nadie más debe conocerlo, porque con él firmas tus auditorías.</div>' : ''}
 <label class="f">PIN actual</label><input class="i" id="p0" type="password" inputmode="numeric" maxlength="6">
 <label class="f">PIN nuevo (6 números)</label><input class="i" id="p1" type="password" inputmode="numeric" maxlength="6">
 <label class="f">Repite el PIN nuevo</label><input class="i" id="p2" type="password" inputmode="numeric" maxlength="6">
 </main><div class="bar"><button class="btn" onclick="cambiarPin()">Guardar PIN</button></div>`;
}
async function cambiarPin() {
  const g = id => document.getElementById(id).value; if (g('p1') !== g('p2')) { toast('El PIN nuevo no coincide'); return; }
  try { await Nube.cambiarPin(g('p0'), g('p1')); toast('PIN actualizado'); S.pinObligatorio = false; go('home'); } catch (e) { toast(e instanceof Nube.SinSenal ? 'Sin señal: intenta cuando haya internet.' : e.message); }
}
function selMaq(tipo, m) { S.au.maq = m; render(); }
function artInfo() {
  const a = S.au; const d = a.desc || desc(a.art); if (!a.art) return '';
  if (d) return `<div class="muted" style="margin-top:4px">${esc(d)}</div>`;
  return `<div class="card" style="margin-top:8px;background:#fffaf0"><b style="font-size:13px;color:var(--mid)">El artículo ${esc(a.art)} no está en el catálogo</b>
 <label class="f">Descripción</label><input class="i" id="nuevoArt" placeholder="Ej. 2560-KE/UN BLANCO 1300 APM"><button class="btn" style="width:100%;margin-top:8px" onclick="altaArt()">Dar de alta el artículo</button></div>`;
}
async function altaArt() {
  const v = document.getElementById('nuevoArt').value.trim(), it = String(S.au.art).trim(); if (!v) { toast('Escribe la descripción'); return; }
  try { await Nube.altaArticulo(it, v); ARTS.set(it, v); S.au.desc = v; toast('Artículo ' + it + ' agregado al catálogo'); render(); }
  catch (e) { if (e instanceof Nube.SinSenal) { ARTS.set(it, v); S.au.desc = v; toast('Sin señal: se usa en esta auditoría; da de alta el artículo cuando haya internet.'); render(); } else toast(e.message); }
}

/* ---------- INICIO ---------- */
function vHome() {
  const u = INSPECTOR, hall = S.hist.filter(h => h.hallazgos).length, dir = u.rol === 'director';
  const ag = (tipo, nombre, start) => {
    const h = hoyToca(tipo), n = prox(tipo); if (dir) return '';
    if (h && !S.hechas[tipo]) return `<div class="agenda today" onclick="${start}"><div class="day"><b>${new Date().getDate()}</b><span>hoy</span></div><div class="tx"><b>${nombre}</b><span>Nivel ${h[2]} · ${esc(h[3])}</span></div><span class="go">Empezar ›</span></div>`;
    if (n) { const f = new Date(n[1] + 'T12:00'); return `<div class="agenda"><div class="day"><b>${f.getDate()}</b><span>${DIAS[f.getDay()].slice(0, 3)}</span></div><div class="tx"><b>${nombre}</b><span>Nivel ${n[2]} · ${esc(n[3])}${f.getMonth() !== new Date().getMonth() ? ' · ' + f.toLocaleDateString('es-MX', { month: 'long' }) : ''}</span></div></div>`; } return '';
  };
  const tile = (k, t, sub, onc, wide) => `<button class="tile ${wide ? 'wide' : ''} ${k === 'paq' ? 'alert' : ''}" onclick="${onc}"><span class="ic" style="${k === 'paq' ? '' : 'background:' + COL[k]}">${ICO[k]}</span><span><b>${t}</b><small>${sub}</small></span>${S.hechas[k] && k !== 'paq' ? '<span class="done">✓ Hecha</span>' : ''}</button>`;
  const pend = puede('iny') ? [!S.hechas.iny && 'Inyección', !S.hechas.sop && 'Soplado'].filter(Boolean) : [];
  const agenda = ag('ino', 'Auditoría de inocuidad', "startIno(maqDe((hoyToca('ino')||[])[3]))") + ag('cap', 'Auditoría por capas', "startCap()") + agFug();
  const H = new Date().getHours();
  return banner() + `<div class="hero"><div class="top2"><div class="logo"><img src="${IMG.logo}" alt="Fischer"></div>${S.pend ? `<span class="out" style="background:#f59e0b">${S.pend} sin enviar</span>` : ''}</div>
 <h2>${H < 12 ? 'Buenos días' : H < 19 ? 'Buenas tardes' : 'Buenas noches'}, ${esc(u.nombre.split(' ')[0])}</h2><p>${ROL[u.rol]} · ${turno()} · ${hoy()}</p></div>
 <div class="stats"><div class="stat"><b>${S.hoyTotal || 0}</b><span>auditorías hoy</span></div><div class="stat"><b>${hall}</b><span>con hallazgo</span></div><div class="stat"><b>${turnoN()}.º</b><span>turno</span></div></div>
 <main style="padding-top:6px">
 ${pend.length ? `<div class="pend" style="margin-top:14px">⏰ <span>Pendiente en este turno: <b>${pend.join(' y ')}</b></span></div>` : ''}
 ${agenda ? `<h2 class="sec">Tu agenda</h2>${agenda}` : ''}
 ${dir ? `<div class="note" style="margin-top:16px">Tu perfil consulta el historial y los reportes de todas las auditorías.</div>` : `<h2 class="sec">Auditorías</h2><div class="tiles">
  ${puede('paq') ? tile('paq', 'Paquete muestra', 'Foto de etiqueta y defecto → reporte listo', "go('paq',{au:{label:null,leyendo:false,art:'',desc:'',op:'',maq:'',paq:'',visa:'',fprod:'',cliente:'',def:'',pz:'',obs:'',fotos:[]}})", true) : ''}
  ${puede('iny') ? tile('iny', 'Inyección', 'Lainer · BRP · BTT', "go('iny',{au:{area:null,r:{},maq:'',art:'',op:''}})") : ''}
  ${puede('sop') ? tile('sop', 'Soplado', '9 puntos de producto', "go('sop',{au:{r:{},maq:'',art:'',op:'',paq:'',visa:'',cliente:'',desc:'',label:null,leyendo:false}})") : ''}
  ${puede('fug') ? tile('fug', 'Comprobadores de fuga', 'Soplado · cada viernes', 'startFug()') : ''}
  ${tile('ino', 'Inocuidad', 'Inocuidad, EPP y BPM', "startIno('')")}
  ${tile('cap', 'Por capas', 'Inyección y Soplado · niveles 1–4', "startCap()")}
 </div>`}
 <h2 class="sec">Últimos registros</h2>
 ${S.hist.length ? S.hist.slice(0, 5).map(cardHist).join('') : '<div class="empty">Aún no hay registros</div>'}
 </main>` + tabbar();
}
function agFug() { // cada viernes, todas las máquinas de soplado
  if (!puede('fug')) return ''; const d = new Date(), dv = (5 - d.getDay() + 7) % 7;
  if (dv === 0 && !S.fugHoy) return `<div class="agenda today" onclick="startFug()"><div class="day"><b>${d.getDate()}</b><span>hoy</span></div><div class="tx"><b>Comprobadores de fuga</b><span>Viernes · todas las máquinas de soplado</span></div><span class="go">Empezar ›</span></div>`;
  const f = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (dv || 7));
  return `<div class="agenda"><div class="day"><b>${f.getDate()}</b><span>vie</span></div><div class="tx"><b>Comprobadores de fuga</b><span>${dv === 0 ? 'Esta semana ya quedó · próximo viernes' : 'Viernes · todas las máquinas de soplado'}</span></div></div>`;
}
function startIno(z) { const h = hoyToca('ino'); const lv = h ? h[2] : esInsp() ? 1 : INSPECTOR.visa === 'CV' ? 3 : INSPECTOR.rol === 'gerente' ? 4 : 2; go('ino', { au: { r: {}, e: {}, zona: z || '', nivel: String(lv), res: '' } }); }
function startCap() { const h = hoyToca('cap'); const lv = h ? h[2] : esInsp() ? 1 : INSPECTOR.rol === 'gerente' ? 4 : 2; const t = h && h[3] === 'Mixto' ? 'Mixto' : ['', '1°', '2°', '3°'][turnoN()]; go('cap', { au: { nivel: lv, turno: t, ct: !!(h && /CT/.test(h[3])), A: { iny: { est: null, maqs: [], arts: {} }, sop: { est: null, partes: [] } }, r: {}, obs: '' } }); }
function cardHist(h) {
  return `<div class="card hist" style="cursor:pointer" onclick="abrirHist('${h.id}')"><span class="ic" style="background:${COL[h.tipo] || 'var(--blue)'}">${ICO[h.tipo] || ''}</span><div class="tx"><b>${esc(h.titulo)}</b><div class="muted">${fechaCorta(h.fecha)} · ${esc(h.visa)}${h.folio ? ' · ' + esc(h.folio) : ''}${h.hallazgos ? ` · ${h.hallazgos} hallazgo${h.hallazgos > 1 ? 's' : ''}` : ''}</div></div>`
    + (h.pendiente ? `<span class="pill" style="background:#FFF1C2;color:#8A5A00">${h.error ? 'Revisar' : 'Sin enviar'}</span>` : h.parada ? `<span class="pill p-mid">Parada</span>` : h.hallazgos ? `<span class="pill p-open">${esc(h.reporte || 'Hallazgo')}</span>` : '<span class="pill p-ok">Conforme</span>')
    + `<span style="color:#b0bac8;font-size:18px;margin-left:2px">›</span></div>`;
}

/* ---------- COMPONENTES DE AUDITORÍA ---------- */
function seg(key,i,na){const v=S.au.r[i]?.v;return `<div class="seg"><button class="ok ${v==='ok'?'on':''}" onclick="mark('${key}',${i},'ok')">${key==='iny'?'Pasa':'OK'}</button><button class="bad ${v==='bad'?'on':''}" onclick="mark('${key}',${i},'bad')">${key==='iny'?'No pasa':'NOK'}</button>${na?`<button class="na ${v==='na'?'on':''}" onclick="mark('${key}',${i},'na')">N/A</button>`:''}</div>`}
function mark(k,i,v){S.au.r[i]=Object.assign(S.au.r[i]||{},{v});render()}
function setR(i,f,val){S.au.r[i]=Object.assign(S.au.r[i]||{},{[f]:val})}
function addPhoto(store,i){tomarFoto(d=>{const o=store==='e'?S.au.e:S.au.r;o[i]=o[i]||{};(o[i].fotos=o[i].fotos||[]).push(d);render()})}
function photos(store,i){const o=(store==='e'?S.au.e:S.au.r)[i]||{};return `<div class="photo">${(o.fotos||[]).map((p,k)=>`<div class="ph" style="background-image:url(${p})"><button class="x" onclick="quitarFoto('${store}','${i}',${k})" aria-label="Quitar foto">×</button></div>`).join('')}<button class="add" onclick="addPhoto('${store}','${i}')">+ Foto</button></div>`}
function resultBox(list){const vals=list.map((_,i)=>S.au.r[i]?.v);const done=vals.filter(Boolean).length;const bad=vals.filter(v=>v==='bad').length;
 if(done<list.length)return `<div class="result r-none">Faltan ${list.length-done} de ${list.length} puntos por evaluar</div>`;
 return bad?`<div class="result r-bad">✘ NO CONFORME · ${bad} punto${bad>1?'s':''}</div>`:`<div class="result r-ok">✔ CONFORME</div>`}
function complete(list){return list.every((_,i)=>S.au.r[i]?.v)}

/* ---------- INYECCIÓN ---------- */
function vIny(){const a=S.au;const area=a.area;const list=area?INY[area].items:[];
 return header('Auditoría Inyección')+`<main>
 <div class="grid2"><div><label class="f">Fecha</label><input class="i auto" value="${hoy()}" readonly></div><div><label class="f">Hora</label><input class="i auto" value="${hora()}" readonly></div></div>
 <label class="f">Área a auditar</label><div class="chips">${Object.keys(INY).map(k=>`<button class="chipb ${area===k?'on':''}" onclick="S.au.area='${k}';S.au.r={};render()">${k}</button>`).join('')}</div>
 ${area?`<div class="muted" style="margin-top:6px">${INY[area].sub}</div>
 <div class="grid2"><div><label class="f">Máquina</label><select class="i" onchange="selMaq('iny',this.value)"><option value="">Elegir…</option>${MAQ_INY.map(m=>`<option ${a.maq===m?'selected':''}>${m}</option>`).join('')}</select></div>
 <div><label class="f">Piezas revisadas</label><input class="i" inputmode="numeric" placeholder="0" value="${esc(a.pz||'')}" oninput="S.au.pz=this.value"></div></div>
 <div class="grid2"><div><label class="f">Artículo</label><input class="i" inputmode="numeric" placeholder="Ej. 4807" value="${esc(a.art)}" onchange="S.au.art=this.value;S.au.desc='';renderLuego()"></div><div><label class="f">Orden / lote</label><input class="i" placeholder="Ej. 404212" value="${esc(a.op)}" oninput="S.au.op=this.value"></div></div>${artInfo()}
 <h2 class="sec">Puntos de control</h2>
 ${list.map((it,i)=>`<div class="item"><div class="row" style="justify-content:flex-start"><span class="n">${i+1}</span><span class="t">${it[0]}</span></div><div class="c">${it[1]}</div>${seg('iny',i,true)}
  ${S.au.r[i]?.v==='bad'?`<div class="extra"><label class="f" style="margin-top:0">Qué se encontró y acción tomada</label><textarea class="i" placeholder="Ej. 3 piezas con lainer arrugado; se ajustó la prensa" oninput="setR(${i},'acc',this.value)">${esc(S.au.r[i].acc||'')}</textarea><label class="f">Piezas con defecto</label><input class="i" inputmode="numeric" value="${esc(S.au.r[i].pz||'')}" oninput="setR(${i},'pz',this.value)"><label class="f">Evidencia</label>${photos('r',i)}</div>`:''}</div>`).join('')}
 ${resultBox(list)}`:'<div class="empty">Elige el área que vas a auditar en este turno</div>'}
 </main><div class="bar"><button class="btn" ${area&&complete(list)?'':'disabled'} onclick="go('firma',{tipo:'iny'})">Terminar y firmar</button></div>`}

/* ---------- SOPLADO ---------- */
function vSop(){const a=S.au;
 return header('Auditoría Soplado')+`<main>
 <div class="grid2"><div><label class="f">Fecha</label><input class="i auto" value="${hoy()}" readonly></div><div><label class="f">Hora</label><input class="i auto" value="${hora()}" readonly></div></div>
 ${!a.label&&!a.leyendo?`<button class="tile" style="width:100%;min-height:auto;flex-direction:row;align-items:center;gap:12px;margin-top:12px" onclick="leerEtiqueta()"><span class="ic">◉</span><span><b style="margin:0">Foto de la etiqueta del paquete</b><small>Llena máquina, artículo, orden, paquete y operador</small></span></button>`:''}
 ${a.leyendo?`<div class="scan" style="margin-top:12px"><img src="${a.labelTmp}"><div class="laser"></div></div><p class="muted" style="text-align:center">${esc(a.leyendoMsg||'Leyendo etiqueta…')}</p>`:''}
 ${a.label?`<div class="found">${a.leidos?'✓ Etiqueta leída: '+a.leidos+' dato(s) · revisa que estén bien':'Foto guardada · no se pudo leer el texto, llena los datos'}</div>`:''}
 <div class="grid2"><div><label class="f">Máquina</label><select class="i ${a.label?'auto':''}" onchange="selMaq('sop',this.value)"><option value="">Elegir…</option>${MAQ_SOP.map(m=>`<option ${a.maq===m?'selected':''}>${m}</option>`).join('')}</select></div>
 <div><label class="f">Visa operador</label><input class="i ${a.label?'auto':''}" value="${esc(a.visa)}" oninput="S.au.visa=this.value"></div></div>
 <div class="grid2"><div><label class="f">Artículo</label><input class="i ${a.label?'auto':''}" inputmode="numeric" value="${esc(a.art)}" onchange="S.au.art=this.value;S.au.desc='';renderLuego()"></div><div><label class="f">No. de orden / lote</label><input class="i ${a.label?'auto':''}" value="${esc(a.op)}" oninput="S.au.op=this.value"></div></div>${artInfo()}
 <div class="grid2"><div><label class="f">Paquete número</label><input class="i ${a.label?'auto':''}" value="${esc(a.paq)}" oninput="S.au.paq=this.value"></div>
 <div><label class="f">Cliente</label><input class="i" value="${esc(a.cliente)}" oninput="S.au.cliente=this.value"></div></div>
 <h2 class="sec">Revisión del producto</h2>
 ${SOP.map((it,i)=>`<div class="item"><div class="row" style="justify-content:flex-start"><span class="n">${i+1}</span><span class="t">${it[0]}</span></div>${it[1]?`<div class="c">${it[1]}</div>`:'<div style="height:8px"></div>'}${seg('sop',i,it[2])}
  ${S.au.r[i]?.v==='bad'?`<div class="extra"><label class="f" style="margin-top:0">Qué se encontró</label><textarea class="i" placeholder="Ej. Envase con hundimiento en costado" oninput="setR(${i},'acc',this.value)">${esc(S.au.r[i].acc||'')}</textarea><label class="f">Piezas con defecto</label><input class="i" inputmode="numeric" value="${esc(S.au.r[i].pz||'')}" oninput="setR(${i},'pz',this.value)"><label class="f">Fotos del defecto</label>${photos('r',i)}</div>`:''}</div>`).join('')}
 ${resultBox(SOP)}
 </main><div class="bar"><button class="btn" ${complete(SOP)?'':'disabled'} onclick="go('firma',{tipo:'sop'})">Terminar y firmar</button></div>`}
function leerEtiqueta(){tomarFoto(async d=>{S.au.labelTmp=d;S.au.leyendo=true;S.au.leyendoMsg='Leyendo etiqueta…';render();
 try{const r=await OCR.leer(d,ARTS,g=>{if(g){S.au.leyendoMsg='Probando otra orientación…';render()}});const f=r.campos;['art','op','maq','paq','visa','fprod'].forEach(k=>{if(f[k])S.au[k]=f[k]});if(f.art)S.au.desc=desc(f.art);S.au.leidos=r.encontrados}
 catch(e){S.au.leidos=0;toast('No se pudo usar el lector de etiquetas. Llena los datos a mano.',3500)}
 S.au.label=await comprimir(d,1100);S.au.leyendo=false;render()},1600)}
/* ---------- INOCUIDAD ---------- */
function vIno(){const a=S.au;
 const segE=i=>{const v=a.e[i]?.v;return `<div class="seg"><button class="ok ${v==='ok'?'on':''}" onclick="S.au.e[${i}]=Object.assign(S.au.e[${i}]||{},{v:'ok'});render()">OK</button><button class="bad ${v==='bad'?'on':''}" onclick="S.au.e[${i}]=Object.assign(S.au.e[${i}]||{},{v:'bad'});render()">NOK</button></div>`};
 const doneI=INO.every((_,i)=>a.r[i]?.v),doneE=EPP.every((_,i)=>a.e[i]?.v);
 const bad=INO.filter((_,i)=>a.r[i]?.v==='bad').length+EPP.filter((_,i)=>a.e[i]?.v==='bad').length;
 const badE=EPP.some((_,i)=>a.e[i]?.v==='bad');
 return header('Auditoría de Inocuidad')+`<main>
 <div class="grid2"><div><label class="f">Fecha</label><input class="i auto" value="${hoy()}" readonly></div><div><label class="f">Hora</label><input class="i auto" value="${hora()}" readonly></div></div>
 <div class="grid2"><div><label class="f">Máquina / zona</label><select class="i" onchange="S.au.zona=this.value"><option value="">Elegir…</option>${ZONAS.map(z=>`<option ${a.zona===z?'selected':''}>${z}</option>`).join('')}</select></div>
 <div><label class="f">Nivel</label><select class="i" onchange="S.au.nivel=this.value">${[1,2,3,4].map(n=>`<option ${a.nivel==n?'selected':''}>${n}</option>`).join('')}</select></div></div>
 <h2 class="sec">Revisión de inocuidad</h2>
 ${INO.map((it,i)=>`<div class="item"><div class="row" style="justify-content:flex-start"><span class="n">${i+1}</span><span class="t">${it[0]}</span></div>${it[1]?`<div class="c">${it[1]}</div>`:'<div style="height:8px"></div>'}${seg('ino',i,it[2])}
 ${a.r[i]?.v==='bad'?`<div class="extra"><label class="f" style="margin-top:0">Dónde</label><input class="i" value="${esc(a.r[i].donde||'')}" oninput="setR(${i},'donde',this.value)"><label class="f">Corrección</label><input class="i" value="${esc(a.r[i].corr||'')}" oninput="setR(${i},'corr',this.value)"><label class="f">Plan de acción</label><input class="i" value="${esc(a.r[i].plan||'')}" oninput="setR(${i},'plan',this.value)">${photos('r',i)}</div>`:''}</div>`).join('')}
 <h2 class="sec">Revisión de EPP y BPM</h2>
 ${EPP.map((it,i)=>`<div class="item"><div class="row" style="justify-content:flex-start"><span class="n">${i+1}</span><span class="t">${it[0]}</span></div>${it[1]?`<div class="c">${it[1]}</div>`:'<div style="height:8px"></div>'}${segE(i)}
 ${a.e[i]?.v==='bad'?`<div class="extra"><div class="grid2"><div><label class="f" style="margin-top:0">Visa</label><input class="i" value="${esc(a.e[i].visa||'')}" oninput="S.au.e[${i}].visa=this.value"></div><div><label class="f" style="margin-top:0">Razón</label><input class="i" value="${esc(a.e[i].raz||'')}" oninput="S.au.e[${i}].raz=this.value"></div></div></div>`:''}</div>`).join('')}
 ${badE?`<label class="f">¿Los hallazgos de EPP y BPM se resolvieron al momento?</label><div class="chips">${['Sí','No'].map(x=>`<button class="chipb ${a.res===x?'on':''}" onclick="S.au.res='${x}';render()">${x}</button>`).join('')}</div>`:''}
 <div class="note">Si un hallazgo es de alto riesgo para el producto, avisa de inmediato al equipo de inocuidad.</div>
 ${!(doneI&&doneE)?`<div class="result r-none">Faltan puntos por evaluar</div>`:bad?`<div class="result r-bad">${bad} hallazgo${bad>1?'s':''} registrado${bad>1?'s':''}</div>`:`<div class="result r-ok">✔ Sin hallazgos</div>`}
 </main><div class="bar"><button class="btn" ${doneI&&doneE&&a.zona?'':'disabled'} onclick="go('firma',{tipo:'ino'})">Terminar y firmar</button></div>`}

/* ---------- POR CAPAS ---------- */

function colsCap(ar){return ar==='sop'?['Semiterminado','Terminado'].filter(c=>S.au.A.sop.partes.includes(c)):S.au.A.iny.maqs}
const aplica=(sc,c)=>sc[2]===undefined||['Semiterminado','Terminado'][sc[2]]===c;
function preguntas(ar){const out=[];CAPAS[ar][S.au.nivel].forEach(sc=>sc[1].forEach(q=>out.push([sc,q])));return out}
function areaLista(ar){const a=S.au,A=a.A[ar];if(!A.est)return false;if(A.est==='parada')return true;const cols=colsCap(ar);if(!cols.length)return false;
 return preguntas(ar).every((x,i)=>cols.every(c=>!aplica(x[0],c)||a.r[ar+'|'+i+'|'+c]?.v))}
function capasParada(){return S.au.A.iny.est==='parada'&&S.au.A.sop.est==='parada'}
function bloqueArea(ar){const a=S.au,A=a.A[ar];const cols=A.est==='ok'?colsCap(ar):[];let html=`<div class="card" style="margin-top:16px;border-width:1.5px;${A.est==='parada'?'background:#f4f5f7':''}"><div class="row"><b style="color:var(--navy);font-size:16px">${AREAS[ar]}</b>${A.est==='parada'?'<span class="pill p-mid">Máquina parada</span>':''}</div>
 <div class="chips" style="margin-top:10px"><button class="chipb ${A.est==='ok'?'on':''}" onclick="setEst('${ar}','ok')">Trabajando</button><button class="chipb ${A.est==='parada'?'on':''}" onclick="setEst('${ar}','parada')">Máquina parada</button></div>`;
 if(A.est==='parada')html+=`<div class="muted" style="margin-top:8px">No hay máquina por auditar. Su formato se registra como máquina parada, por requisito.</div>`;
 if(A.est==='ok'&&ar==='iny')html+=`<label class="f">Máquinas trabajando (proceso automotriz)</label><div class="chips">${MAQ_CAP.map(m=>`<button class="chipb ${A.maqs.includes(m)?'on':''}" style="padding:7px 12px;font-size:13px" onclick="togMaq('${m}')">${m}</button>`).join('')}</div>
  ${A.maqs.map(m=>`<div class="grid2" style="align-items:end"><div><label class="f">Artículo en ${m}</label><input class="i" value="${esc(A.arts[m]||'')}" oninput="S.au.A.iny.arts['${m}']=this.value"></div><div class="muted" style="padding-bottom:12px">${esc(desc(A.arts[m]))}</div></div>`).join('')}`;
 if(A.est==='ok'&&ar==='sop')html+=`<label class="f">¿Qué se está trabajando?</label><div class="chips">${['Semiterminado','Terminado'].map(c=>`<button class="chipb ${A.partes.includes(c)?'on':''}" onclick="togParte('${c}')">${c}</button>`).join('')}</div><div class="muted" style="margin-top:6px">Marca uno o los dos. Solo se evalúa lo que está trabajando.</div>`;
 html+='</div>';
 if(A.est==='ok'&&cols.length){let cur='';preguntas(ar).forEach(([sc,q],i)=>{const cs=cols.map(c=>[c]).filter(([c])=>aplica(sc,c));if(!cs.length)return;if(sc[0]!==cur){cur=sc[0];html+=`<h2 class="sec">${AREAS[ar].split(' ·')[0]} · ${sc[0]}</h2>`}const key=ar+'|'+i,ck=ar+'|c'+i;const anyBad=cs.some(([c])=>a.r[key+'|'+c]?.v==='bad');const C=a.r[ck]||{};
  html+=`<div class="item"><div class="t" style="font-size:14px">${q}</div><div style="margin-top:8px">${cs.map(([c])=>{const v=a.r[key+'|'+c]?.v;return `<div class="row" style="margin-top:6px">${cols.length>1?`<span class="muted" style="width:96px;font-weight:bold">${c}</span>`:''}<div class="seg" style="flex:1"><button class="ok ${v==='ok'?'on':''}" onclick="capMark('${key}|${c}','ok')">✓ Cumple</button><button class="bad ${v==='bad'?'on':''}" onclick="capMark('${key}|${c}','bad')">✗ No cumple</button></div></div>`}).join('')}</div>
  ${anyBad?`<div class="extra"><label class="f" style="margin-top:0">Falla y corrección</label><textarea class="i" oninput="S.au.r['${ck}']=Object.assign(S.au.r['${ck}']||{},{t:this.value})">${esc(C.t||'')}</textarea><label class="f">Evidencia</label>${photos('r',ck)}
   <label class="f">¿Se corrigió al momento?</label><div class="chips">${['Sí','No, queda pendiente'].map(x=>`<button class="chipb ${C.pend===x?'on':''}" style="font-size:13px;padding:7px 12px" onclick="S.au.r['${ck}']=Object.assign(S.au.r['${ck}']||{},{pend:'${x}'});render()">${x}</button>`).join('')}</div>
   ${C.pend==='No, queda pendiente'?'<div class="note">Producción debe entregar plan de acción (SG.FO.09.02) en máximo 4 días.</div>':''}</div>`:''}</div>`})}
 return html}
function vCap(){const a=S.au;const listo=areaLista('iny')&&areaLista('sop');const parada=capasParada();
 const bad=Object.entries(a.r).filter(([k,x])=>!k.includes('|c')&&x.v==='bad').length;
 return header('Auditoría por capas')+`<main>
 <div class="grid2"><div><label class="f">Fecha · semana</label><input class="i auto" value="${hoy()} · S${semana()}" readonly></div><div><label class="f">Nivel</label><div class="chips">${[1,2,3,4].map(n=>`<button class="chipb ${a.nivel==n?'on':''}" style="padding:8px 13px" onclick="S.au.nivel=${n};S.au.r={};render()">${n}</button>`).join('')}</div></div></div>
 <label class="f">Turno</label><div class="chips">${['1°','2°','3°','Mixto'].map(t=>`<button class="chipb ${a.turno===t?'on':''}" style="padding:7px 12px;font-size:13px" onclick="S.au.turno='${t}';render()">${t}</button>`).join('')}
 <button class="chipb ${a.ct?'on':''}" style="padding:7px 12px;font-size:13px" onclick="S.au.ct=!S.au.ct;render()">${a.ct?'✓ ':'+ '}Cambio de turno</button></div>
 <div class="note" style="margin-top:14px">Se auditan las dos áreas. Si un área no está trabajando, márcala como máquina parada.</div>
 ${bloqueArea('iny')}${bloqueArea('sop')}
 ${a.A.iny.est==='ok'||a.A.sop.est==='ok'?`<h2 class="sec">Observaciones adicionales</h2><textarea class="i" oninput="S.au.obs=this.value">${esc(a.obs)}</textarea>`:''}
 ${!listo?'<div class="result r-none" style="margin-top:14px">Falta marcar el estado de cada área o contestar preguntas</div>':parada?'<div class="result r-bad" style="margin-top:14px;background:#eceff3;color:#4b5563">Máquina parada en ambas áreas · se registran los dos formatos</div>':bad?`<div class="result r-bad" style="margin-top:14px">${bad} incumplimiento${bad>1?'s':''}</div>`:'<div class="result r-ok" style="margin-top:14px">✔ Todo cumple</div>'}
 </main><div class="bar"><button class="btn" ${listo?'':'disabled'} onclick="go('firma',{tipo:'cap'})">${parada?'Registrar máquina parada':'Terminar y firmar'}</button></div>`}
function setEst(ar,e){S.au.A[ar].est=e;Object.keys(S.au.r).filter(k=>k.startsWith(ar+'|')).forEach(k=>delete S.au.r[k]);render()}
function togParte(c){const l=S.au.A.sop.partes;const i=l.indexOf(c);i<0?l.push(c):l.splice(i,1);Object.keys(S.au.r).filter(k=>k.startsWith('sop|')).forEach(k=>delete S.au.r[k]);render()}
function togMaq(m){const l=S.au.A.iny.maqs;const i=l.indexOf(m);i<0?l.push(m):l.splice(i,1);Object.keys(S.au.r).filter(k=>k.startsWith('iny|')).forEach(k=>delete S.au.r[k]);render()}
function capMark(key,v){S.au.r[key]=Object.assign(S.au.r[key]||{},{v});render()}

/* ---------- PAQUETE MUESTRA ---------- */
function paqListo(a){return !!(a.label&&a.def&&String(a.pz||'').trim()&&a.fotos.length&&(a.def!=='Otro'||String(a.defOtro||'').trim()))}
function paqOk(){const b=document.getElementById('paqGen');if(b)b.disabled=!paqListo(S.au)}
function vPaq(){const a=S.au;const ok=paqListo(a);
 const campo=(k,t,num)=>`<div><label class="f">${t}</label><input class="i ${a.leidos&&a[k]?'auto':''}" ${num?'inputmode="numeric"':''} value="${esc(a[k]||'')}" ${k==='art'?`onchange="S.au.art=this.value;S.au.desc='';render()"`:`oninput="S.au.${k}=this.value"`}></div>`;
 return header('Paquete muestra')+`<main>
 ${!a.label&&!a.leyendo?`<button class="tile" style="width:100%;min-height:150px;align-items:center;justify-content:center;text-align:center" onclick="leerEtiqueta()"><span class="ic" style="width:60px;height:60px;border-radius:18px;background:var(--c-paq)">${ICO.paq}</span><b>1. Foto de la etiqueta</b><small>Se leen artículo, lote, máquina, paquete y fecha</small></button>`:''}
 ${a.leyendo?`<div class="scan"><img src="${a.labelTmp}"><div class="laser"></div></div><p class="muted" style="text-align:center">${esc(a.leyendoMsg||'Leyendo etiqueta…')}</p>`:''}
 ${a.label?`<div class="scan"><img src="${a.label}"></div><div class="found">${a.leidos?'✓ Etiqueta leída: '+a.leidos+' dato(s) · revisa que estén bien':'Foto guardada · no se pudo leer el texto, llena los datos'}</div>
  <button class="chipb" style="font-size:12px" onclick="S.au.label=null;S.au.leidos=0;render()">Repetir foto</button>
  <div class="grid2">${campo('art','Artículo',1)}${campo('op','Lote',1)}</div>${artInfo()}
  <div class="grid2">${campo('maq','Máquina')}${campo('paq','Paquete')}</div>
  <div class="grid2">${campo('visa','Operador')}${campo('fprod','Fecha de producción')}</div>
  <label class="f">2. ¿Qué se detectó?</label><div class="chips">${DEFECTOS.map(d=>`<button class="chipb ${a.def===d?'on':''}" style="padding:7px 12px;font-size:13px" onclick="S.au.def='${d}';render();if('${d}'==='Otro')setTimeout(()=>{const x=document.getElementById('defOtro');x&&x.focus()},60)">${d==='Otro'?'✏️ Otro':d}</button>`).join('')}</div>
  ${a.def==='Otro'?`<input class="i" id="defOtro" style="margin-top:8px" placeholder="Escribe el defecto que encontraste" value="${esc(a.defOtro||'')}" oninput="S.au.defOtro=this.value;paqOk()">`:''}
  <div class="grid2"><div><label class="f">3. ¿Cuántas piezas?</label><input class="i" inputmode="numeric" value="${esc(a.pz)}" oninput="S.au.pz=this.value;paqOk()"></div><div><label class="f">Cliente</label><input class="i" value="${esc(a.cliente)}" oninput="S.au.cliente=this.value"></div></div>
  <label class="f">4. Fotos del defecto</label><div class="photo">${a.fotos.map((p,k)=>`<div class="ph" style="background-image:url(${p})"><button class="x" onclick="quitarFoto('p',0,${k})">×</button></div>`).join('')}<button class="add" onclick="fotoPaq()">+ Foto</button></div>
  <label class="f">Comentario (opcional)</label><textarea class="i" oninput="S.au.obs=this.value">${esc(a.obs)}</textarea>`:''}
 </main><div class="bar"><button class="btn sec" onclick="go('home')">Cancelar</button><button class="btn red" id="paqGen" ${ok?'':'disabled'} onclick="S.tipo='paq';S.firmas=null;finish()">${S.editando?'Guardar corrección':'Generar reporte'}</button></div>`}
function fotoPaq(){tomarFoto(d=>{S.au.fotos.push(d);render()})}
/* ---------- FIRMA ---------- */
function vFirma(){const t='Supervisor o Líder de turno';
 const caja=(id,titulo,sub,nom)=>`<div class="card"><b style="color:var(--navy)">${titulo}</b><div class="muted">${sub}</div>${nom?`<label class="f">Nombre y visa</label><input class="i" id="${nom}" placeholder="Ej. Juan Pérez · JP">`:''}
  <canvas class="sig" id="${id}" style="margin-top:10px"></canvas><div class="row"><span class="muted">Firma con el dedo</span><button class="chipb" onclick="clearSig('${id}')">Borrar</button></div></div>`;
 const yo=caja('sigA','Firma de Calidad',`${INSPECTOR.nombre} · ${INSPECTOR.visa} · ${ROL[INSPECTOR.rol]}`);
 const otros=S.tipo==='cap'?['iny','sop'].map(ar=>caja('sig_'+ar,'Formato '+(ar==='iny'?'Inyección':'Soplado')+' · Supervisor o Líder de turno',S.au.A[ar].est==='parada'?'Máquina parada · firma de enterado':'Firma del área auditada','nom_'+ar)).join('')
  :caja('sigB','Firma del Supervisor o Líder de turno','Área auditada','nomSup');
 return header('Firmas',S.tipo)+`<main>${S.tipo==='cap'?'<div class="note">Se generan dos formatos separados: uno de Inyección y otro de Soplado, cada uno con la firma de su líder.</div>':''}${yo}${otros}</main><div class="bar"><button class="btn" onclick="guardarFirmas()">Guardar y generar PDF</button></div>`}
function initSig(){document.querySelectorAll('canvas.sig').forEach(c=>{const r=c.getBoundingClientRect();c.width=r.width*2;c.height=r.height*2;const x=c.getContext('2d');x.scale(2,2);x.lineWidth=2.2;x.lineCap='round';x.strokeStyle='#0C2340';let d=false;c._firmado=false;
 const p=e=>{const b=c.getBoundingClientRect();return[e.clientX-b.left,e.clientY-b.top]};
 c.onpointerdown=e=>{d=true;c._firmado=true;const[a,b]=p(e);x.beginPath();x.moveTo(a,b)};c.onpointermove=e=>{if(!d)return;const[a,b]=p(e);x.lineTo(a,b);x.stroke()};c.onpointerup=c.onpointerleave=()=>d=false})}
function clearSig(id){const c=document.getElementById(id);c.getContext('2d').clearRect(0,0,c.width,c.height);c._firmado=false}
function guardarFirmas(){const g=id=>document.getElementById(id),A=g('sigA');if(!A._firmado){toast('Falta la firma de Calidad');return}
 if(S.tipo==='cap'){const f={a:A.toDataURL()};for(const ar of ['iny','sop']){const c=g('sig_'+ar),n=g('nom_'+ar).value.trim();if(!n||!c._firmado){toast('Falta nombre y firma del Supervisor o Líder de turno de '+(ar==='iny'?'Inyección':'Soplado'));return}f[ar]={img:c.toDataURL(),n}}S.firmas=f;finish();return}
 const B=g('sigB'),n=g('nomSup').value.trim();if(!n||!B._firmado){toast('Falta nombre y firma del Supervisor o Líder de turno');return}
 S.firmas={a:A.toDataURL(),b:B.toDataURL(),bn:n};finish()}
function hallazgos(){const a=S.au,t=S.tipo,out=[];
 if(t==='iny')INY[a.area].items.forEach((it,i)=>{const r=a.r[i];if(r?.v==='bad')out.push({p:it[0],crit:it[1],obs:r.acc||'',pz:r.pz||'',fotos:r.fotos||[],cls:'calidad'})});
 if(t==='sop')SOP.forEach((it,i)=>{const r=a.r[i];if(r?.v==='bad')out.push({p:it[0],crit:it[1],obs:r.acc||'',pz:r.pz||'',fotos:r.fotos||[],cls:CLS_SOP[i]})});
 if(t==='ino'){INO.forEach((it,i)=>{const r=a.r[i];if(r?.v==='bad')out.push({p:it[0],crit:it[1],obs:[r.donde&&'Dónde: '+r.donde,r.corr&&'Corrección: '+r.corr,r.plan&&'Plan: '+r.plan].filter(Boolean).join(' · '),pz:'',fotos:r.fotos||[],cls:'inocuidad'})});
  EPP.forEach((it,i)=>{const r=a.e[i];if(r?.v==='bad')out.push({p:it[0],crit:it[1],obs:[r.visa&&'Visa: '+r.visa,r.raz&&'Razón: '+r.raz].filter(Boolean).join(' · '),pz:'',fotos:[],cls:'inocuidad'})})}
 if(t==='cap')['iny','sop'].forEach(ar=>{if(a.A[ar].est!=='ok')return;const cols=colsCap(ar);preguntas(ar).forEach(([sc,q],i)=>{const malos=cols.filter(c=>a.r[ar+'|'+i+'|'+c]?.v==='bad');if(malos.length){const c=a.r[ar+'|c'+i]||{};out.push({p:q,crit:AREAS[ar].split(' ·')[0]+' · '+malos.join(', '),obs:(c.t||'')+(c.pend?' · '+(c.pend==='Sí'?'Corregido al momento':'PENDIENTE: plan de acción SG.FO.09.02 en 4 días'):''),pz:'',fotos:c.fotos||[],cls:'calidad'})}})});
 if(t==='fug')return hallazgosFug(a);
 if(t==='paq')out.push({p:a.def==='Otro'?(String(a.defOtro||'').trim()||'Otro'):a.def,crit:'',obs:a.obs||'',pz:a.pz,fotos:a.fotos,cls:DEF[a.def]||'calidad'});
 return out}
function titulo(){const a=S.au;if(S.tipo==='fug'){const f=hallazgosFug(a).length,p=MAQ_FUG.filter(m=>a.r[m].est==='parada').length;return `Comprobadores de fuga · semana ${(S.pdf&&S.pdf.sem)||semana()}${f?' · '+f+' NOK':''}${p?' · '+p+' parada'+(p>1?'s':''):''}`}if(S.tipo==='cap')return `Auditoría por capas · nivel ${a.nivel}${capasParada()?' · MÁQUINA PARADA':''}`;if(S.tipo==='paq')return `Paquete muestra · ${a.maq} · Art. ${a.art}`;return S.tipo==='iny'?`Auditoría Inyección · ${a.area}${a.maq?' · '+a.maq:''}`:S.tipo==='sop'?`Auditoría Soplado · ${a.maq||'—'} · Art. ${a.art||'—'}`:`Auditoría de Inocuidad · ${a.zona}`}


function vDone(){const n={iny:'Auditoría de producto · Inyección',sop:'Auditoría de producto · Soplado',ino:'Auditoría de inocuidad',cap:'Auditoría por capas',fug:'Auditoría de comprobadores de fuga'}[S.tipo];const fol=Object.values(S.pdf.folios||{}).filter(Boolean);
 const par=S.tipo==='cap'&&capasParada();
 return header('Listo',null)+`<main style="text-align:center;padding-top:40px">
 <div style="width:80px;height:80px;border-radius:50%;background:${S.ultimoPendiente?'#FFF1C2':'var(--okbg)'};color:${S.ultimoPendiente?'#8A5A00':'var(--ok)'};font-size:40px;line-height:80px;margin:0 auto">${S.ultimoPendiente?'⏳':'✓'}</div>
 <h2 style="color:var(--navy)">${n} guardada</h2>${btnEditar()}
 <p class="muted">${S.ultimoPendiente?'Sin señal: quedó guardada en el celular y se enviará sola al recuperar internet.':par?'Máquina parada: se registraron los dos formatos, Inyección y Soplado.':'Sin hallazgos. Quedó registrada en el historial.'}</p>
 <div class="card" style="text-align:left"><div class="row"><b>${n}</b><span class="pill p-ok">${fol.length?esc(fol.join(' · ')):'Por enviar'}</span></div><div class="muted">${hoy()} · ${hora()} · ${turno()}</div></div>
 </main><div class="bar"><button class="btn sec" onclick="go('pdf')">Ver PDF</button><button class="btn" onclick="go('home')">Inicio</button></div>`}

/* ---------- REPORTE DE HALLAZGO ---------- */
const COMO={iny:'Durante auditoría de producto en Inyección',sop:'Durante auditoría de producto en Soplado',ino:'Durante auditoría de inocuidad',cap:'Durante auditoría por capas',fug:'Durante la auditoría semanal de comprobadores de fuga',paq:'Durante auditoría de paquetes muestra'};
function vRep(){const R=S.rep,a=R.au;const h0=R.h[0];
 const dond=R.tipo==='fug'?'Soplado · '+R.h.map(x=>x.p.split(' · ')[1]).join(', '):R.tipo==='ino'?a.zona:R.tipo==='cap'?'Inyección y Soplado':R.tipo==='paq'?'Laboratorio de calidad':`${R.tipo==='iny'?'Inyección':'Soplado'}${a.maq?' · '+a.maq:''}`;
 const pzs=R.h.map(x=>x.pz).filter(Boolean).join(' + ');
 const filas=[
  ['Tipo de auditoría',{iny:'Producto · Inyección ('+a.area+')',sop:'Producto · Soplado',ino:'Inocuidad',cap:'Por capas · nivel '+a.nivel+' · semana '+semana()+' · turno '+a.turno+(a.ct?' · cambio de turno':''),paq:'Paquete muestra',fug:'Comprobadores de fuga · Soplado · semana '+semana()}[R.tipo]],
  ['Fecha y hora',`${R.fecha} · ${R.hora} · ${R.turno}`],['Formato',Object.values(S.pdf.folios||{}).filter(Boolean).join(' · ')||'Por asignar'],['Inspector',(R.insp||INSPECTOR).nombre],
  ...(R.tipo==='fug'?[['Máquinas',(p=>`${MAQ_FUG.length} en total · ${MAQ_FUG.length-p-R.h.length} OK · ${R.h.length} NOK · ${p} parada${p===1?'':'s'}`)(MAQ_FUG.filter(m=>a.r[m].est==='parada').length)]]:R.tipo==='ino'?[['Zona / nivel',`${a.zona} · nivel ${a.nivel}`]]:R.tipo==='cap'?[['Inyección',a.A.iny.est==='parada'?'MÁQUINA PARADA':a.A.iny.maqs.map(m=>m+(a.A.iny.arts[m]?' (art. '+a.A.iny.arts[m]+')':'')).join(', ')],['Soplado · filler pipe',a.A.sop.est==='parada'?'MÁQUINA PARADA':a.A.sop.partes.join(' y ')]]:[['Máquina',a.maq||'—'],['Artículo',(a.art||'—')+(a.desc||desc(a.art)?' · '+(a.desc||desc(a.art)):'')],['Orden / lote',a.op||'—']]),
  ...(R.tipo==='sop'||R.tipo==='paq'?[['Paquete',a.paq||'—'],['Operador',a.visa||'—'],['Cliente',a.cliente||'—']]:[]),...(R.tipo==='cap'&&a.obs?[['Observaciones',a.obs]]:[]),
  ...(R.tipo==='paq'?[]:[['Supervisor o Líder de turno',R.sup||'(firmado en pantalla)']])];
 const alerta=[
  ['¿Qué ha pasado?',R.h.map(x=>R.tipo==='fug'?x.p+': '+x.crit+(x.obs?'. '+x.obs:''):x.obs||('No cumple: '+x.p.toLowerCase())).join('; ')],
  ['¿Por qué es un problema?',[...new Set(R.h.map(x=>PORQUE[x.cls]))].join(' / ')],
  ['¿Quién lo ha detectado?','Proceso de calidad'],['¿Cómo ha sido detectado?',COMO[R.tipo]],
  ['¿Cuántas piezas?',pzs?pzs+' pzas':'—'],['¿Cuándo detectado / producido?',`${R.fecha}${a.fprod?' / '+a.fprod:''}`],
  ['¿Dónde ha sido detectado?',dond]];
 return header(R.h.length?'Reporte de hallazgo':'Registro de auditoría',S.pdfBack||'home')+`<main>
 ${R.h.length?`<div class="result r-bad" style="margin-top:0">${R.h.length} hallazgo${R.h.length>1?'s':''} · ${R.folio?'reporte '+R.folio:'reporte por asignar (sin señal)'}</div>`:`<div class="result" style="margin-top:0;background:#eceff3;color:#4b5563">Formatos registrados · MÁQUINA PARADA</div>`}
 ${btnEditar()}<div class="doc" style="margin-top:12px">
  <div class="hd"><img src="${IMG.logo}"><div style="flex:1;text-align:center;font-weight:bold;font-size:13px;color:var(--navy)">${R.tipo==='paq'?'REPORTE DE PAQUETE MUESTRA':'REPORTE DE HALLAZGO'}</div><div class="code">${esc(R.folio||'Por asignar')}</div></div>
  <table>${filas.map(f=>`<tr><td class="k">${f[0]}</td><td class="v">${esc(f[1])}</td></tr>`).join('')}</table>
  ${R.h.length?'':`<div style="margin:10px;border:3px solid #9aa4b1;color:#6b7280;font-weight:bold;font-size:20px;text-align:center;padding:10px;transform:rotate(-4deg);letter-spacing:2px">MÁQUINA PARADA<br><span style="font-size:13px">sin máquina por auditar</span></div>`}
  ${R.h.length?`<div style="background:var(--navy);color:#fff;font-weight:bold;padding:3px 6px;font-size:9px;letter-spacing:1px">HALLAZGOS</div>`:''}
  ${R.h.map((x,i)=>`<div style="padding:6px;border-bottom:1px solid #eef2f7"><b style="color:var(--bad)">${i+1}. ${esc(x.p)}${R.tipo==='paq'?'':' · NO CUMPLE'}</b>${x.crit?`<div style="color:#777">Criterio: ${esc(x.crit)}</div>`:''}${x.obs?`<div>${esc(x.obs)}</div>`:''}${x.pz?`<div>Piezas: ${esc(x.pz)}</div>`:''}${x.fotos.length?`<div style="display:flex;gap:4px;margin-top:4px">${x.fotos.map(f=>`<img src="${f}" style="width:70px;height:70px;object-fit:cover;border-radius:4px">`).join('')}</div>`:''}</div>`).join('')}
  ${a.label?`<div style="padding:6px"><b>Etiqueta del paquete</b><br><img src="${a.label}" style="width:100%;border-radius:4px;margin-top:4px"></div>`:''}
  ${R.tipo==='cap'?'':`<div style="background:var(--blue);color:#fff;font-weight:bold;padding:3px 6px;font-size:9px;letter-spacing:1px">DATOS PARA LA ALERTA DE CALIDAD (SG.FO.10.02)</div>
  <table>${alerta.map(f=>`<tr><td class="k">${f[0]}</td><td class="v">${esc(f[1])}</td></tr>`).join('')}</table>`}
 </div>
 <p class="muted">${R.tipo==='cap'&&!R.h.length?'Los formatos de Inyección y Soplado quedan registrados como máquina parada, para cumplir con el calendario.':R.tipo==='cap'?'Se comparte al grupo de WhatsApp de Producción del área con hallazgos. Los pendientes quedan marcados para pedir el plan de acción.':'Con este reporte se llena la alerta de calidad. Ya trae las respuestas del formato, las fotos y la trazabilidad.'}</p>
 </main><div class="bar"><button class="btn sec" onclick="S.rep.tipo==='paq'?go(S.pdfBack||'home'):go('pdf')">${R.tipo==='paq'?'Listo':R.tipo==='cap'&&!S.pdf.area?'Ver formatos':'Ver PDF'}</button><button class="btn" onclick="compartir()">Compartir</button></div>`}

/* ---------- PDF CON EL FORMATO ---------- */
const XM=v=>v?'<b style="font-size:13px">X</b>':'';
function pdfSecciones(P,area){const a=P.au,t=P.tipo,S3=[];
 const std=(titulo,list,store,okL)=>({titulo,cols:okL,rows:list.map((it,i)=>{const v=store[i]?.v;return {n:i+1,t:it[0],c:it[1]||'',m:[v==='ok',v==='bad',v==='na'].slice(0,okL.length).map(XM),o:store[i]?.acc||[store[i]?.donde,store[i]?.corr,store[i]?.plan,store[i]?.visa,store[i]?.raz].filter(Boolean).join(' · ')}})});
 if(t==='iny')S3.push(std({LAINER:'COMPONENTES Y ENSAMBLE (SECCIÓN LAINER)',BRP:'FUNCIONALIDAD Y PROCESO (SECCIÓN BRP)',BTT:'FUNCIONALIDAD Y PROCESO (SECCIÓN BTT)'}[a.area],INY[a.area].items,a.r,['PASA','NO PASA','N/A']));
 if(t==='sop')S3.push(std('REVISIÓN DEL PRODUCTO',SOP,a.r,['OK','NOK','N/A']));
 if(t==='ino'){S3.push(std('REVISIÓN DE INOCUIDAD',INO,a.r,['OK','NOK','N/A']));S3.push(std('REVISIÓN DE EPP Y BPM',EPP,a.e,['OK','NOK']))}
 if(t==='cap')[area].forEach(ar=>{const A=a.A[ar];if(A.est==='parada')return;
  const cols=colsCap(ar);let cur=null;preguntas(ar).forEach(([sc,q],i)=>{if(!cur||cur.titulo!==AREAS[ar].split(' ·')[0].toUpperCase()+' · '+sc[0].toUpperCase()){cur={titulo:AREAS[ar].split(' ·')[0].toUpperCase()+' · '+sc[0].toUpperCase(),cols,rows:[]};S3.push(cur)}
  const C=a.r[ar+'|c'+i]||{};cur.rows.push({n:i+1,t:q,c:'',m:cols.map(c=>!aplica(sc,c)?'—':(v=>v==='ok'?'<b style="color:#1E7B3C">✓</b>':v==='bad'?'<b style="color:#B3261E">✗</b>':'')(a.r[ar+'|'+i+'|'+c]?.v)),o:[C.t,C.pend==='No, queda pendiente'?'PENDIENTE':'' ].filter(Boolean).join(' · ')})})});
 return S3}
function vPdf(){const P=S.pdf,t=P.tipo;const areas=t==='cap'?(P.area?[P.area]:['iny','sop']):[null];return header('PDF · vista previa',S.rep&&S.rep.au===P.au&&S.rep.h.length?'rep':S.pdfBack||'done')+`<main style="background:#e9eef5;padding:10px">${btnEditar()}${areas.map((ar,k)=>(areas.length>1?`<div class="muted noprint" style="margin:${k?14:0}px 4px 6px;font-weight:700">Formato ${k+1} de 2 · ${ar==='iny'?'Inyección':'Soplado'}</div>`:'')+docPdf(P,ar)).join('')}
 <div class="note noprint" style="margin-top:12px">Para entregar en físico: toca <b>Imprimir</b>. Cada formato sale en su propia hoja tamaño carta. En el celular se puede mandar a una impresora de la red o guardar como PDF. Con <b>Compartir PDF</b> se manda el archivo por WhatsApp o correo.</div></main>
 <div class="bar noprint"><button class="btn sec" onclick="window.print()">Imprimir</button><button class="btn" onclick="compartirPDF()">Compartir PDF</button></div>`}
function docPdf(P,area){if(P.tipo==='fug')return docPdfFug(P);const a=P.au,t=P.tipo;const secs=pdfSecciones(P,area);
 const tit={iny:'AUDITORÍA DE PRODUCTO · INYECCIÓN',sop:'AUDITORÍA DE PRODUCTO · SOPLADO',ino:'AUDITORÍA DE INOCUIDAD',cap:'AUDITORÍA POR CAPAS · '+(area==='iny'?'INYECCIÓN':'SOPLADO')}[t];
 const sub={iny:'ÁREA AUDITADA: '+a.area,sop:'PRODUCTO SOPLADO',ino:P.virgen?'INOCUIDAD · EPP · BPM':'NIVEL '+a.nivel+' · '+(a.zona||''),cap:'NIVEL '+a.nivel+' · SEMANA '+(P.sem||semana())+(area==='iny'?' · PROCESO AUTOMOTRIZ':' · FILLER PIPE')}[t];
 const campos=t==='iny'?[['Fecha',P.fecha],['Turno',P.turno],['Hora',P.hora],['Máquina',a.maq],['Artículo',a.art],['Orden / lote',a.op],['Piezas revisadas',a.pz],['Inspector',P.insp.nombre]]
  :t==='sop'?[['Fecha',P.fecha],['Turno',P.turno],['Hora',P.hora],['Máquina',a.maq],['Artículo',a.art],['Orden',a.op],['Paquete',a.paq],['Visa operador',a.visa]]
  :t==='ino'?[['Fecha',P.fecha],['Turno',P.turno],['Hora',P.hora],['Zona',a.zona],['Nivel',a.nivel],['Auditor',P.insp.nombre]]
  :[['Fecha',P.fecha],['Semana',P.sem||semana()],['Turno',a.turno+(a.ct?' · cambio de turno':'')],['Nivel',a.nivel],[area==='iny'?'Máquinas':'Auditado',a.A[area].est==='parada'?'Máquina parada':area==='iny'?a.A.iny.maqs.map(m=>m+(a.A.iny.arts[m]?' ('+a.A.iny.arts[m]+')':'')).join(', '):a.A.sop.partes.join(' y ')],['Auditor',P.insp.nombre]];
 const h=(S.rep&&S.rep.au===a?S.rep.h:[]).filter(x=>t!=='cap'||x.crit.startsWith(area==='iny'?'Inyección':'Soplado'));const parada=t==='cap'&&a.A[area].est==='parada';
 return `<div class="pdfdoc" style="background:#fff;padding:14px 12px;font-size:9px;box-shadow:0 1px 4px rgba(0,0,0,.15)">
  <div style="height:4px;background:var(--blue);border-radius:2px"></div>
  <div style="display:flex;gap:8px;align-items:stretch;margin:6px 0"><img src="${IMG.logo}" style="height:34px"><div style="flex:1"><div style="background:var(--navy);color:#fff;font-weight:bold;font-size:10.5px;padding:5px 8px">${tit}</div><div style="background:var(--blue);color:#fff;font-weight:bold;padding:3px 8px">${esc(sub)}</div></div></div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px 8px;margin:8px 0">${campos.map(c=>`<div><div style="color:#7a7a7a;font-size:7px;font-weight:bold">${c[0].toUpperCase()}</div><div style="border-bottom:1px solid var(--navy);font-weight:bold;color:var(--navy);min-height:12px">${esc(c[1]||'')}</div></div>`).join('')}</div>
  ${parada?`<div style="border:3px solid #9aa4b1;color:#6b7280;font-weight:bold;font-size:18px;text-align:center;padding:10px;margin:14px 0;transform:rotate(-3deg)">MÁQUINA PARADA</div>`:''}
  ${secs.map(sc=>`<div style="background:var(--navy);color:#fff;font-weight:bold;padding:3px 6px;margin-top:6px">${sc.titulo}</div>${sc.rows.length?`<table style="width:100%;border-collapse:collapse">
   <tr style="background:#DCEBFA;color:var(--navy);font-weight:bold"><td style="padding:2px 4px;width:16px">#</td><td>Punto de control</td>${sc.cols.map(c=>`<td style="text-align:center;width:${sc.cols.length>2?36:44}px">${c}</td>`).join('')}<td style="width:${sc.cols.length>4?18:30}%">Observaciones</td></tr>
   ${sc.rows.map(r=>`<tr style="border-bottom:1px solid #e3e9f2"><td style="padding:3px 4px;background:var(--blue);color:#fff;font-weight:bold;text-align:center">${r.n}</td><td style="padding:3px 4px"><b style="color:var(--navy)">${esc(r.t)}</b>${r.c?`<br><span style="color:#666">${esc(r.c)}</span>`:''}</td>${r.m.map(m=>`<td style="text-align:center;border-left:1px solid #e3e9f2">${m}</td>`).join('')}<td style="padding:3px 4px;border-left:1px solid #e3e9f2">${esc(r.o||'')}</td></tr>`).join('')}</table>`:''}`).join('')}
  ${P.virgen?resVirgen(t==='cap'):!parada?`<div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:8px"><b style="color:var(--navy)">RESULTADO</b><span style="border:2px solid var(--navy);padding:4px 12px;font-weight:bold;font-size:11px;${h.length?'background:#FAD4D4;color:#B3261E':'background:#D7F2DF;color:#1E7B3C'}">${h.length?'✘ NO CONFORME':'✔ CONFORME'}</span></div>`:''}
  ${P.virgen?accVirgen():h.length?`<div style="background:var(--blue);color:#fff;font-weight:bold;padding:3px 6px;margin-top:8px">ACCIONES CORRECTIVAS EN NO CONFORMIDADES</div><div style="border:1px solid #e3e9f2;padding:4px">${h.map((x,i)=>`<div>${i+1}. <b>${esc(x.p)}</b>${x.obs?' — '+esc(x.obs):''}${x.pz?' · '+esc(x.pz)+' pzas':''} · Reporte ${S.rep.folio}</div>`).join('')}</div>`:''}
  <div style="display:flex;gap:16px;margin-top:16px">${[[P.firmas?.a,P.virgen?'':P.insp.nombre+' · '+P.insp.visa,'Calidad'],t==='cap'?[P.firmas?.[area]?.img,P.firmas?.[area]?.n||'','Supervisor o Líder de turno'+(area==='iny'?' · Inyección':' · Soplado')]:[P.firmas?.b,P.firmas?.bn||'','Supervisor o Líder de turno']].map(f=>`<div style="flex:1;text-align:center">${f[0]?`<img src="${f[0]}" style="height:42px;max-width:100%">`:'<div style="height:42px"></div>'}<div style="border-top:1px solid var(--navy);font-weight:bold;padding-top:2px">${esc(f[1])}</div><div style="color:#666">${f[2]}</div></div>`).join('')}</div>
  ${pieFmt(P,t==='cap'?(area==='iny'?'capi':'caps'):t)}
  <div style="height:3px;background:var(--blue);border-radius:2px;margin-top:3px"></div>
 </div>`}


/* ---------- COMPROBADORES DE FUGA (PR.FO.01.69) ----------
   Cada viernes, en todas las máquinas de soplado: 5 pruebas activando y desactivando
   la válvula que simula la fuga. Se registra qué hizo el comprobador y la app marca
   ✓ (prueba satisfactoria) o ✗ (falla en prueba). */
const MAQ_FUG = ['M3', 'M5', 'M11', 'M13', 'M14', 'M15', 'M22', 'M23', 'M24', 'M25', 'M26', 'Filler Pipe'];
// [lo que debe hacer el comprobador, válvula activada]
const FUG = [['bota', true], ['pasa', false], ['pasa', false], ['bota', true], ['pasa', false]];
const FUG_COL = ['No pasa', 'Pasa', 'Pasa', 'No pasa', 'Pasa'];

function startFug() {
  const r = {}; MAQ_FUG.forEach(m => r[m] = { est: '', p: [null, null, null, null, null], obs: '', fotos: [] });
  go('fug', { au: { r, abierta: MAQ_FUG[0] } });
}
const fugBien = (i, v) => v === FUG[i][0];
function fugEstado(m) { // '', 'parada', 'ok', 'nok', 'curso'
  const x = S.au.r[m]; if (x.est === 'parada') return 'parada'; if (x.est !== 'ok') return '';
  if (x.p.some(v => !v)) return 'curso'; return x.p.every((v, i) => fugBien(i, v)) ? 'ok' : 'nok';
}
const fugLista = m => { const e = fugEstado(m); return e === 'parada' || e === 'ok' || (e === 'nok' && S.au.r[m].obs.trim()); };
const fugCompleta = () => MAQ_FUG.every(fugLista);

function vFug() {
  const a = S.au, est = MAQ_FUG.map(fugEstado), n = k => est.filter(e => e === k).length;
  const listas = MAQ_FUG.filter(fugLista).length;
  const pill = e => ({ ok: '<span class="pill p-ok">✓ OK</span>', nok: '<span class="pill p-open">✗ NOK</span>', parada: '<span class="pill p-mid">Parada</span>', curso: '<span class="pill" style="background:#E3EEFF;color:var(--blue)">En curso</span>' }[e] || '<span class="pill" style="background:#eef1f5;color:#6b7280">Pendiente</span>');
  const dots = m => { const x = a.r[m]; if (x.est !== 'ok') return ''; return `<span class="fdots">${x.p.map((v, i) => `<i class="${!v ? '' : fugBien(i, v) ? 'b' : 'm'}">${!v ? '' : fugBien(i, v) ? '✓' : '✗'}</i>`).join('')}</span>`; };
  const card = m => {
    const x = a.r[m], e = fugEstado(m), abierta = a.abierta === m;
    return `<div class="fcard ${abierta ? 'open' : ''} f-${e || 'pend'}" id="fug_${m.replace(/\W/g, '')}">
   <button class="fhead" onclick="fugAbrir('${m}')"><span class="fm">${m === 'Filler Pipe' ? 'Filler<br>Pipe' : m}</span><span class="fmid">${dots(m) || `<span class="muted">${e === 'parada' ? 'Máquina parada' : 'Toca para probar'}</span>`}</span>${pill(e)}</button>
   ${abierta ? `<div class="fbody">
    <div class="chips" style="margin:0 0 10px">${[['ok', 'Trabajando'], ['parada', 'Máquina parada']].map(([k, t]) => `<button class="chipb ${x.est === k ? 'on' : ''}" onclick="fugEst('${m}','${k}')">${t}</button>`).join('')}</div>
    ${x.est === 'parada' ? `<div class="note" style="margin:0">Se registra en el formato como <b>MÁQUINA PARADA</b>.</div>` : ''}
    ${x.est === 'ok' ? FUG.map(([deb, act], i) => { const v = x.p[i]; return `<div class="fprueba ${!v ? '' : fugBien(i, v) ? 'bien' : 'mal'}">
      <span class="fn">${i + 1}</span>
      <div class="ft"><b><span class="valv ${act ? 'on' : ''}">${act ? '● Válvula activada' : '○ Válvula desactivada'}</span></b><small>Debe ${deb === 'bota' ? '<b>botar</b> el envase (No pasa)' : '<b>dejarlo pasar</b> (Pasa)'}</small></div>
      <div class="fbtn"><button class="${v === 'bota' ? 'on' : ''}" onclick="fugP('${m}',${i},'bota')">Lo botó</button><button class="${v === 'pasa' ? 'on' : ''}" onclick="fugP('${m}',${i},'pasa')">Pasó</button></div>
      <span class="fres">${!v ? '' : fugBien(i, v) ? '✓' : '✗'}</span></div>`; }).join('') : ''}
    ${e === 'nok' ? `<div class="extra" style="margin-top:10px"><b style="color:var(--bad)">El comprobador falló ${x.p.filter((v, i) => !fugBien(i, v)).length} de 5 pruebas</b>
      <label class="f">¿Qué se hizo? (obligatorio)</label><textarea class="i" placeholder="Ej. Se avisó a mantenimiento, se detuvo la máquina y se revisó el producto desde la última prueba buena" oninput="S.au.r['${m}'].obs=this.value;fugBarra()">${esc(x.obs)}</textarea>
      <label class="f">Fotos (opcional)</label><div class="photo">${x.fotos.map((p, k) => `<div class="ph" style="background-image:url(${p})"><button class="x" onclick="quitarFoto('r','${m}',${k})">×</button></div>`).join('')}<button class="add" onclick="fugFoto('${m}')">+ Foto</button></div></div>`
          : x.est === 'ok' ? `<label class="f">Observaciones (opcional)</label><input class="i" value="${esc(x.obs)}" oninput="S.au.r['${m}'].obs=this.value">` : ''}
    ${fugLista(m) && MAQ_FUG.some(k => !fugLista(k)) ? `<button class="btn sec" style="margin-top:12px;width:100%" onclick="fugSiguiente()">Siguiente máquina ›</button>` : ''}
   </div>` : ''}</div>`;
  };
  return header('Comprobadores de fuga') + `<main>
 <div class="grid2"><div><label class="f">Fecha</label><input class="i auto" value="${hoy()}" readonly></div><div><label class="f">Semana</label><input class="i auto" value="${semana()}" readonly></div></div>
 <div class="note">Prueba de fuga simulada en <b>todas las máquinas</b>. En cada una se hacen <b>5 pruebas</b> activando y desactivando la válvula. Marca qué hizo el comprobador y la app indica si la prueba salió bien.</div>
 <div class="fsum"><div><b>${listas}</b><span>de ${MAQ_FUG.length} listas</span></div><div class="ok"><b>${n('ok')}</b><span>OK</span></div><div class="nok"><b>${n('nok')}</b><span>NOK</span></div><div class="par"><b>${n('parada')}</b><span>paradas</span></div></div>
 ${MAQ_FUG.map(card).join('')}
 ${listas === MAQ_FUG.length ? (n('nok') ? `<div class="result r-bad">✗ NO CONFORME · ${n('nok')} comprobador${n('nok') > 1 ? 'es' : ''} con falla</div>` : n('ok') ? `<div class="result r-ok">✓ CONFORME · todos los comprobadores detectan la fuga</div>` : `<div class="result" style="background:#eceff3;color:#4b5563">Todas las máquinas paradas</div>`) : ''}
 </main><div class="bar"><button class="btn" id="fugFin" ${fugCompleta() ? '' : 'disabled'} onclick="go('firma',{tipo:'fug'})">Terminar y firmar</button></div>`;
}
function fugBarra() { const b = document.getElementById('fugFin'); if (b) b.disabled = !fugCompleta(); }
function fugAbrir(m) { S.au.abierta = S.au.abierta === m ? null : m; render(); fugVer(m); }
function fugVer(m) { setTimeout(() => { const el = document.getElementById('fug_' + String(m).replace(/\W/g, '')); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 30); }
function fugEst(m, k) { const x = S.au.r[m]; x.est = k; if (k === 'parada') { x.p = [null, null, null, null, null]; x.fotos = []; } render(); if (k === 'parada') setTimeout(fugSiguiente, 350); }
function fugP(m, i, v) {
  const x = S.au.r[m]; x.p[i] = v; render();
  if (fugEstado(m) === 'ok') setTimeout(fugSiguiente, 450); // las 5 bien: pasa sola a la que sigue
}
function fugSiguiente() {
  const i = MAQ_FUG.indexOf(S.au.abierta), sig = [...MAQ_FUG.slice(i + 1), ...MAQ_FUG.slice(0, i + 1)].find(k => !fugLista(k));
  S.au.abierta = sig || null; render(); if (sig) fugVer(sig);
}
function fugFoto(m) { tomarFoto(d => { S.au.r[m].fotos.push(d); render(); }); }

function hallazgosFug(a) {
  return MAQ_FUG.filter(m => a.r[m] && a.r[m].est === 'ok' && a.r[m].p.some((v, i) => v && !fugBien(i, v))).map(m => {
    const x = a.r[m], malas = x.p.map((v, i) => v && !fugBien(i, v) ? i : -1).filter(i => i >= 0);
    return {
      p: 'Comprobador de fuga · ' + m, pz: '', fotos: x.fotos || [], cls: 'fuga', obs: x.obs || '',
      crit: malas.map(i => `Prueba ${i + 1} (válvula ${FUG[i][1] ? 'activada' : 'desactivada'}): ${FUG[i][0] === 'bota' ? 'no botó el envase' : 'botó un envase bueno'}`).join(' · ')
    };
  });
}

function docPdfFug(P) {
  const a = P.au, h = S.rep && S.rep.au === a ? S.rep.h : hallazgosFug(a);
  const mk = (i, v) => !v ? '' : fugBien(i, v) ? '<b style="color:#1E7B3C;font-size:12px">✓</b>' : '<b style="color:#B3261E;font-size:12px">✗</b>';
  const campos = [['Fecha', P.fecha], ['Semana', P.virgen ? '' : P.sem || semana()], ['Turno', P.turno], ['Hora', P.hora], ['Área', 'Soplado'], ['Máquinas', MAQ_FUG.length], ['Paradas', P.virgen ? '' : MAQ_FUG.filter(m => a.r[m].est === 'parada').length], ['Inspector', P.insp.nombre]];
  const td = 'border-left:1px solid #e3e9f2;text-align:center';
  return `<div class="pdfdoc" style="background:#fff;padding:14px 12px;font-size:9px;box-shadow:0 1px 4px rgba(0,0,0,.15)">
  <div style="height:4px;background:var(--blue);border-radius:2px"></div>
  <div style="display:flex;gap:8px;align-items:stretch;margin:6px 0"><img src="${IMG.logo}" style="height:34px"><div style="flex:1"><div style="background:var(--navy);color:#fff;font-weight:bold;font-size:10.5px;padding:5px 8px">AUDITORÍA DE COMPROBADORES DE FUGA</div><div style="background:var(--blue);color:#fff;font-weight:bold;padding:3px 8px">SOPLADO · PRUEBA DE FUGA SIMULADA</div></div></div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px 8px;margin:8px 0">${campos.map(c => `<div><div style="color:#7a7a7a;font-size:7px;font-weight:bold">${c[0].toUpperCase()}</div><div style="border-bottom:1px solid var(--navy);font-weight:bold;color:var(--navy);min-height:12px">${esc(String(c[1] ?? ''))}</div></div>`).join('')}</div>
  <div style="background:var(--navy);color:#fff;font-weight:bold;padding:3px 6px;margin-top:6px;display:flex;justify-content:space-between"><span>PRUEBA DE FUGA SIMULADA</span><span style="font-weight:normal">✓ prueba satisfactoria · ✗ falla en prueba</span></div>
  <table style="width:100%;border-collapse:collapse">
   <tr style="background:#DCEBFA;color:var(--navy);font-weight:bold"><td style="padding:3px 4px;width:58px">Máquina</td>${FUG_COL.map((c, i) => `<td style="${td};width:46px;padding:2px 0">${i + 1}<br><span style="font-size:7px;font-weight:normal">${FUG[i][1] ? 'Válv. activada' : 'Válv. desact.'}</span><br>${c}</td>`).join('')}<td style="${td};width:44px">Estatus</td><td style="padding-left:4px;border-left:1px solid #e3e9f2">Observaciones</td></tr>
   ${MAQ_FUG.map(m => {
    const x = a.r[m] || { est: '', p: [] }, e = x.est === 'parada' ? 'parada' : x.p.length && x.p.every(Boolean) ? (x.p.every((v, i) => fugBien(i, v)) ? 'ok' : 'nok') : '';
    return `<tr style="border-bottom:1px solid #e3e9f2"><td style="padding:4px;background:var(--blue);color:#fff;font-weight:bold">${m}</td>
    ${e === 'parada' ? `<td colspan="5" style="${td};color:#6b7280;font-weight:bold;letter-spacing:1px;background:#f3f4f6">MÁQUINA PARADA</td><td style="${td};color:#6b7280">—</td>`
      : FUG.map((_, i) => `<td style="${td}">${mk(i, x.p[i])}</td>`).join('') + `<td style="${td};font-weight:bold;${e === 'ok' ? 'color:#1E7B3C;background:#D7F2DF' : e === 'nok' ? 'color:#B3261E;background:#FAD4D4' : ''}">${e === 'ok' ? 'OK' : e === 'nok' ? 'NOK' : ''}</td>`}
    <td style="padding:3px 4px;border-left:1px solid #e3e9f2">${esc(x.obs || '')}</td></tr>`; }).join('')}
  </table>
  <div style="color:#555;margin-top:5px">* La auditoría a los comprobadores de fuga se realiza una vez a la semana (viernes) en todas las máquinas. Un comprobador que no bota el envase con la válvula activada deja pasar envases con fuga como producto bueno.</div>
  ${P.virgen ? resVirgen(false) + accVirgen() : `<div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:8px"><b style="color:var(--navy)">RESULTADO</b><span style="border:2px solid var(--navy);padding:4px 12px;font-weight:bold;font-size:11px;${h.length ? 'background:#FAD4D4;color:#B3261E' : 'background:#D7F2DF;color:#1E7B3C'}">${h.length ? '✘ NO CONFORME' : '✔ CONFORME'}</span></div>`}
  ${!P.virgen && h.length ? `<div style="background:var(--blue);color:#fff;font-weight:bold;padding:3px 6px;margin-top:8px">ACCIONES CORRECTIVAS EN NO CONFORMIDADES</div><div style="border:1px solid #e3e9f2;padding:4px">${h.map((x, i) => `<div>${i + 1}. <b>${esc(x.p)}</b> — ${esc(x.crit)}${x.obs ? '. ' + esc(x.obs) : ''}${S.rep && S.rep.folio ? ' · Reporte ' + esc(S.rep.folio) : ''}</div>`).join('')}</div>` : ''}
  <div style="display:flex;gap:16px;margin-top:18px">${[[P.firmas?.a, P.virgen ? '' : P.insp.nombre + ' · ' + P.insp.visa, 'Calidad'], [P.firmas?.b, P.firmas?.bn || '', 'Supervisor o Líder de turno']].map(f => `<div style="flex:1;text-align:center">${f[0] ? `<img src="${f[0]}" style="height:42px;max-width:100%">` : '<div style="height:42px"></div>'}<div style="border-top:1px solid var(--navy);font-weight:bold;padding-top:2px">${esc(f[1])}</div><div style="color:#666">${f[2]}</div></div>`).join('')}</div>
  ${pieFmt(P, 'fug')}
  <div style="height:3px;background:var(--blue);border-radius:2px;margin-top:3px"></div>
 </div>`;
}

/* ---------- Formato virgen: casillas para llenar a mano ---------- */
const CAS = t => `<span style="display:inline-flex;align-items:center;gap:4px;border:2px solid var(--navy);padding:4px 10px;font-weight:bold;font-size:10px;color:var(--navy)"><span style="width:11px;height:11px;border:1.5px solid var(--navy);display:inline-block;background:#fff"></span>${t}</span>`;
function resVirgen(parada) { return `<div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:8px"><b style="color:var(--navy)">RESULTADO</b>${parada ? CAS('MÁQUINA PARADA') : ''}${CAS('CONFORME')}${CAS('NO CONFORME')}</div>`; }
function accVirgen() { return `<div style="background:var(--blue);color:#fff;font-weight:bold;padding:3px 6px;margin-top:8px">ACCIONES CORRECTIVAS EN NO CONFORMIDADES</div><div style="border:1px solid #e3e9f2;padding:0 6px">${[1, 2, 3].map(() => '<div style="height:17px;border-bottom:1px solid #d5dde8"></div>').join('')}</div>`; }

/* ---------- Impresión: cada formato cabe en una hoja carta ---------- */
// Hoja carta con márgenes de .45 in y zoom 1.22 → ~598 × 795 px de contenido.
function ajustarHojas() {
  document.querySelectorAll('.pdfdoc').forEach(el => {
    el.style.zoom = ''; const w = el.style.width, p = el.style.padding; el.style.width = '570px'; el.style.padding = '0';
    const h = el.scrollHeight; el.style.width = w; el.style.padding = p;
    if (h > 760) el.style.zoom = (760 / h).toFixed(3);
  });
}
window.addEventListener('beforeprint', ajustarHojas);
window.addEventListener('afterprint', () => document.querySelectorAll('.pdfdoc').forEach(el => el.style.zoom = ''));

/* Pie de cada formato: planta y control documental (código · retención · revisión · FCR) */
function pieFmt(P, clave) {
  const f = (P.fmt && P.fmt[clave]) || FMTS[clave] || FMT_BASE[clave];
  return `<div style="display:flex;justify-content:space-between;gap:10px;color:#7a7a7a;font-size:7px;margin-top:10px"><span>Fischer S.A. de C.V. · Amatlán de los Reyes, Ver.</span><span style="text-align:right">${esc(f.codigo)} · Tiempo de retención: ${esc(f.ret)} · ${esc(f.rev)} · ${esc(f.fcr)}</span></div>`;
}


/* ---------- GUARDAR ---------- */
function tomarFoto(cb, max) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
  inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { cb(await comprimir(f, max || 1280)); } catch (e) { toast('No se pudo leer la foto'); } };
  inp.click();
}
function comprimir(src, max, q) {
  return new Promise((res, rej) => {
    const img = new Image(), url = typeof src === 'string' ? src : URL.createObjectURL(src);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      if (typeof src !== 'string') URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q || 0.72));
    };
    img.onerror = rej; img.src = url;
  });
}
function quitarFoto(store, i, k) { const o = (store === 'e' ? S.au.e : store === 'p' ? null : S.au.r); if (store === 'p') S.au.fotos.splice(k, 1); else o[i].fotos.splice(k, 1); render(); }
function extraerFotos(au, area) {
  const c = JSON.parse(JSON.stringify(au)), fotos = []; let n = 0;
  const tomar = d => { const k = 'f' + (n++); fotos.push({ clave: k, data: d }); return 'foto:' + k; };
  const recorrer = st => st && Object.keys(st).forEach(k => { const o = st[k]; if (o && Array.isArray(o.fotos)) { if (area && !k.startsWith(area + '|')) { o.fotos = []; return; } o.fotos = o.fotos.map(tomar); } });
  recorrer(c.r); recorrer(c.e);
  if (Array.isArray(c.fotos)) c.fotos = c.fotos.map(tomar);
  if (c.label && String(c.label).startsWith('data:')) c.label = tomar(c.label);
  delete c.labelTmp; delete c.leyendo;
  return { au: c, fotos };
}
function insertarFotos(au, fotos) {
  const m = {}; (fotos || []).forEach(f => m[f.clave] = f.data);
  const g = v => typeof v === 'string' && v.startsWith('foto:') ? (m[v.slice(5)] || '') : v;
  const recorrer = st => st && Object.values(st).forEach(o => { if (o && Array.isArray(o.fotos)) o.fotos = o.fotos.map(g).filter(Boolean); });
  recorrer(au.r); recorrer(au.e); if (Array.isArray(au.fotos)) au.fotos = au.fotos.map(g).filter(Boolean); if (au.label) au.label = g(au.label);
  return au;
}
async function finish() {
  const t = S.tipo, a = S.au, h = hallazgos(), E = S.editando;
  S.sup = (S.firmas && S.firmas.bn) || (S.firmas && S.firmas.iny ? S.firmas.iny.n + ' / ' + S.firmas.sop.n : '');
  const insp = E ? E.insp : { nombre: INSPECTOR.nombre, visa: INSPECTOR.visa }, ahora = E ? E.fechaISO : new Date().toISOString();
  // Al corregir se conservan fecha, hora, turno y pie de formato originales; solo se anota cuándo se corrigió.
  const base = E ? { insp, fecha: E.fecha, hora: E.hora, turno: E.turno, sem: E.sem, sup: S.sup, fmt: E.fmt, editado: new Date().toISOString(), editadoPor: INSPECTOR.visa }
    : { insp, fecha: hoy(), hora: hora(), turno: turno(), sem: semana(), sup: S.sup, fmt: JSON.parse(JSON.stringify(FMTS)) };
  S.pdf = Object.assign({ tipo: t, au: a, firmas: S.firmas, folios: {} }, base);
  const grupo = E ? E.grupo : t === 'cap' ? uid() : null, formatos = t === 'cap' ? ['iny', 'sop'] : [null];
  const ids = {}, regTurno = E ? E.regTurno : turno();
  go('guardando'); const resp = [];
  try {
    for (const ar of formatos) {
      const { au, fotos } = extraerFotos(a, ar), k = ar || 'x';
      const hh = ar ? h.filter(x => x.crit.startsWith(ar === 'iny' ? 'Inyección' : 'Soplado')) : h;
      const reg = {
        id: E ? E.ids[k] : uid(), grupo, tipo: t, area: ar || (t === 'iny' ? a.area : null), fecha: ahora, turno: regTurno,
        nivel: (t === 'ino' || t === 'cap') ? +a.nivel : null,
        titulo: ar ? `Capas · ${ar === 'iny' ? 'Inyección' : 'Soplado'} · nivel ${a.nivel}${a.A[ar].est === 'parada' ? ' · máquina parada' : ''}` : titulo(),
        datos: Object.assign({ au }, base), hallazgos: hh.length, parada: ar ? a.A[ar].est === 'parada' : false, con_reporte: h.length > 0,
        firmas: t === 'cap' ? { a: S.firmas.a, [ar]: S.firmas[ar] } : S.firmas, fotos, editar: !!E
      };
      ids[k] = reg.id;
      const r = await Nube.guardar(reg); resp.push(r); S.pdf.folios[k] = r.folio || (E && E.folios[k]) || null;
    }
  } catch (e) { toast('No se pudo guardar: ' + e.message, 5000); go(t === 'paq' ? 'paq' : 'firma'); return; }
  S.ultimoPendiente = resp.some(r => r.pendiente);
  S.rep = h.length ? { folio: resp.map(r => r.reporte).find(Boolean) || (E && E.reporte) || null, h, tipo: t, au: a, fecha: base.fecha, hora: base.hora, turno: base.turno, insp, sup: S.sup } : null;
  S.edit = { tipo: t, ids, grupo, fechaISO: ahora, fecha: base.fecha, hora: base.hora, turno: base.turno, regTurno, sem: base.sem, fmt: base.fmt, insp, folios: Object.assign({}, S.pdf.folios), reporte: S.rep && S.rep.folio };
  S.editando = null;
  if (S.ultimoPendiente) toast('Sin señal: quedó guardado en el celular y se enviará solo al haber internet.', 4500);
  else if (E) toast('Corrección guardada', 2500);
  S.pdfBack = null; go(h.length ? 'rep' : 'done');
}
/* ---------- Corregir una auditoría (antes de enviarla o imprimirla) ---------- */
const MAX_EDICION = 48 * 3600e3;
function puedeEditar() { const E = S.edit; return !!(E && S.pdf && E.tipo === S.pdf.tipo && Date.now() - new Date(E.fechaISO) < MAX_EDICION); }
function btnEditar() { return puedeEditar() ? `<button class="btn-editar noprint" onclick="editar()">✏️ Editar auditoría</button>` : ''; }
function editar() {
  if (!puedeEditar()) { toast('Esta auditoría ya no se puede corregir'); return; }
  const E = S.edit, au = JSON.parse(JSON.stringify(S.pdf.au));
  if (E.tipo === 'fug') au.abierta = null;
  S.editando = E; S.firmas = null;
  go(E.tipo, { au, tipo: E.tipo });
  toast(E.tipo === 'paq' ? 'Corrige lo necesario y vuelve a guardar' : 'Corrige y vuelve a firmar para guardar', 2500);
}
function vGuardando() { return banner() + `<main style="text-align:center;padding-top:120px"><div class="spin"></div><h2 style="color:var(--navy)">Guardando…</h2><p class="muted">No cierres la app.</p></main>`; }
async function abrirHist(id) {
  toast('Abriendo…', 1500);
  try {
    const r = await Nube.registro(id), reg = r.registro, d = reg.datos || {};
    const au = insertarFotos(JSON.parse(JSON.stringify(d.au || {})), r.fotos);
    S.au = au; S.tipo = reg.tipo;
    S.pdf = { tipo: reg.tipo, au, firmas: reg.firmas || {}, fecha: d.fecha, hora: d.hora, turno: d.turno, insp: d.insp || { nombre: r.nombre, visa: reg.visa }, sem: d.sem, fmt: d.fmt, area: reg.tipo === 'cap' ? reg.area : undefined, folios: { [reg.tipo === 'cap' ? reg.area : 'x']: reg.folio } };
    let h = hallazgos(); if (reg.tipo === 'cap') h = h.filter(x => x.crit.startsWith(reg.area === 'iny' ? 'Inyección' : 'Soplado'));
    S.rep = h.length ? { folio: reg.reporte, h, tipo: reg.tipo, au, fecha: d.fecha, hora: d.hora, turno: d.turno, insp: S.pdf.insp, sup: d.sup } : null;
    S.edit = reg.visa === INSPECTOR.visa && reg.tipo !== 'cap' ? { tipo: reg.tipo, ids: { x: reg.id }, grupo: reg.grupo || null, fechaISO: reg.fecha, fecha: d.fecha, hora: d.hora, turno: d.turno,
      regTurno: reg.turno, sem: d.sem, fmt: d.fmt, insp: S.pdf.insp, folios: { x: reg.folio }, reporte: reg.reporte } : null;
    S.pdfBack = S.view === 'home' ? 'home' : 'seg'; S.view = S.rep ? 'rep' : 'pdf'; render(); window.scrollTo(0, 0);
  } catch (e) { toast(e.message, 4000); }
}
async function compartir() {
  const R = S.rep, a = R.au;
  const txt = `${R.tipo === 'paq' ? 'REPORTE DE PAQUETE MUESTRA' : 'REPORTE DE HALLAZGO'} ${R.folio || ''}\n${titulo()}\n${R.fecha} ${R.hora} · ${R.turno}\n`
    + R.h.map((x, i) => `${i + 1}. ${x.p}: ${x.obs || 'no cumple'}${x.pz ? ' (' + x.pz + ' pzas)' : ''}`).join('\n') + (a.op ? `\nOrden/lote ${a.op}${a.paq ? ' · paquete ' + a.paq : ''}` : '');
  toast('Preparando PDF…', 2500);
  try {
    const r = await PDFGen.compartir([document.querySelector('.doc')], `${R.folio || 'reporte'}.pdf`, txt);
    if (r === 'descargado') { try { await navigator.clipboard.writeText(txt); } catch (e) { } toast('PDF descargado y resumen copiado: adjúntalo en WhatsApp.', 4500); }
  } catch (e) { if (e && e.name === 'AbortError') return; toast('No se pudo compartir: ' + e.message, 4500); }
}
async function compartirPDF() {
  const els = [...document.querySelectorAll('.pdfdoc')], fol = Object.values(S.pdf.folios || {}).filter(Boolean).join('_') || 'formato';
  toast('Preparando PDF…', 2500);
  try { const r = await PDFGen.compartir(els, fol + '.pdf', titulo()); if (r === 'descargado') toast('PDF descargado', 3000); }
  catch (e) { if (e && e.name === 'AbortError') return; toast('No se pudo generar el PDF: ' + e.message, 4500); }
}

/* ---------- HISTORIAL ---------- */
function vSeg() {
  const f = S.filtro || '', lista = S.hist.filter(h => !f || h.tipo === f);
  const chip = (k, t) => `<button class="chipb ${f === k ? 'on' : ''}" style="padding:7px 12px;font-size:13px" onclick="S.filtro='${k}';render()">${t}</button>`;
  return header('Historial', null) + `<main>
 ${S.pend ? `<div class="pend">⏳ <span><b>${S.pend}</b> registro(s) guardados en el celular, esperando señal. <a href="#" onclick="sincronizarYa();return false">Enviar ahora</a></span></div>` : ''}
 <div class="chips" style="margin-bottom:12px">${chip('', 'Todas')}${chip('iny', 'Inyección')}${chip('sop', 'Soplado')}${chip('ino', 'Inocuidad')}${chip('cap', 'Capas')}${chip('fug', 'Fugas')}${chip('paq', 'Paquete')}</div>
 ${lista.length ? lista.map(cardHist).join('') : '<div class="empty">Sin registros</div>'}
 <p class="muted" style="text-align:center">${['admin', 'jefe', 'gerente', 'director'].includes(INSPECTOR.rol) ? 'Ves las auditorías de todo el equipo.' : 'Ves las auditorías que tú registraste.'}</p>
 </main>` + tabbar();
}
async function sincronizarYa() { toast('Enviando…'); const r = await Nube.sincronizar(); toast(r.enviados ? `${r.enviados} enviado(s)` : (r.pendientes ? 'Aún sin señal o con error; se reintentará solo.' : 'Todo enviado')); refrescar(); }

/* ---------- MI CUENTA ---------- */
function vCuenta() {
  return header('Mi cuenta', null) + `<main>
 <div class="card hist"><span class="ic" style="background:var(--navy)">${ICO_USR}</span><div class="tx"><b>${esc(INSPECTOR.nombre)}</b><div class="muted">${INSPECTOR.visa} · ${ROL[INSPECTOR.rol]}</div></div></div>
 <button class="btn sec" style="width:100%;margin-top:8px" onclick="go('pin',{pinObligatorio:false})">Cambiar mi PIN</button>
 <button class="btn sec" style="width:100%;margin-top:10px" onclick="sincronizarYa()">Enviar pendientes${S.pend ? ' (' + S.pend + ')' : ''}</button>
 <button class="btn sec" style="width:100%;margin-top:10px" onclick="actualizarCatalogo()">Actualizar artículos y calendario</button>
 <button class="btn red" style="width:100%;margin-top:22px" onclick="if(confirm('¿Salir de la app?'))salir()">Salir</button>
 <p class="muted" style="text-align:center;margin-top:18px">${Nube.DEMO ? 'Modo demostración' : 'Conectado a Supabase'} · versión ${VERSION}</p>
 </main>` + tabbar();
}
async function actualizarCatalogo() { try { await cargarCatalogo(); toast(`Catálogo actualizado: ${ARTS.size} artículos`); } catch (e) { toast(e instanceof Nube.SinSenal ? 'Sin señal' : e.message); } }

/* ---------- ADMINISTRACIÓN ---------- */
function vAdmin() {
  const u = S.admUsuarios;
  return header('Administración', null) + `<main>
 <h2 class="sec" style="margin-top:4px">Usuarios</h2>
 ${!u ? '<div class="empty">Cargando…</div>' : u.map(x => `<div class="card"><div class="row"><div><b style="color:var(--navy)">${esc(x.visa)} · ${esc(x.nombre)}</b><div class="muted">${ROL[x.rol]}${x.activo ? '' : ' · INACTIVO'}${x.bloqueado ? ' · bloqueado' : ''}${x.cambiar_pin ? ' · PIN inicial' : ''}</div></div>
   <div class="chips"><button class="chipb" style="padding:6px 10px;font-size:12px" onclick="admReset('${x.visa}')">PIN</button><button class="chipb" style="padding:6px 10px;font-size:12px" onclick="admEditar('${x.visa}')">Editar</button></div></div></div>`).join('')}
 <button class="btn sec" style="width:100%" onclick="admEditar('')">+ Agregar usuario</button>
 <h2 class="sec">Calendarios</h2>
 <div class="card"><div class="muted" style="margin-bottom:10px">Sube el Excel del calendario del año (una hoja por mes, como el de 2026). Reemplaza el calendario de ese año.</div>
  <div class="chips"><button class="chipb" onclick="admCal('ino')">Calendario de inocuidad</button><button class="chipb" onclick="admCal('cap')">Calendario de capas</button></div></div>
 <h2 class="sec">Formatos · pie de página</h2>
 <div class="muted" style="margin:-4px 2px 8px">Código, tiempo de retención, revisión y FCR que se imprimen en cada formato. Las auditorías ya guardadas conservan los datos con que se hicieron.</div>
 ${Object.keys(FMT_BASE).map(k => { const f = FMTS[k]; return `<div class="card"><div class="row"><div><b style="color:var(--navy)">${esc(f.nombre || FMT_BASE[k].nombre)}</b><div class="muted">${esc(f.codigo)} · Tiempo de retención: ${esc(f.ret)} · ${esc(f.rev)} · ${esc(f.fcr)}</div></div><button class="chipb" style="padding:6px 10px;font-size:12px" onclick="go('admfmt',{fmtK:'${k}'})">Editar</button></div></div>`; }).join('')}
 <h2 class="sec">Artículos</h2>
 <div class="card"><div class="muted" style="margin-bottom:10px">Sube la lista de artículos exportada de IQMS (columnas Item# y Description). Solo se agregan los nuevos.</div>
  <button class="chipb" onclick="admArts()">Subir lista de artículos</button></div>
 </main>` + tabbar();
}
function vAdmFmt() {
  const k = S.fmtK, f = FMTS[k], campo = (id, l, v, ej) => `<label class="f">${l}</label><input class="i" id="${id}" value="${esc(v)}" placeholder="${ej}">`;
  return header('Pie de formato', 'admin') + `<main><div class="card"><b style="color:var(--navy)">${esc(f.nombre || FMT_BASE[k].nombre)}</b>
  ${campo('fCod', 'Código', f.codigo, 'PR.XX.XX.XX')}${campo('fRet', 'Tiempo de retención', f.ret, 'x.x años')}${campo('fRev', 'Fecha y revisión', f.rev, 'DD.MM.AA Rev X')}${campo('fFcr', 'Referencia FCR', f.fcr, 'FCRXXX-XX')}
  <div class="muted" style="margin-top:12px">Así se verá al pie:</div><div class="note" style="margin-top:6px;font-size:12px" id="fPrev">${esc(f.codigo)} · Tiempo de retención: ${esc(f.ret)} · ${esc(f.rev)} · ${esc(f.fcr)}</div></div>
  </main><div class="bar"><button class="btn sec" onclick="go('admin')">Cancelar</button><button class="btn" onclick="guardarFmt()">Guardar</button></div>`;
}
document.addEventListener('input', e => { if (S.view === 'admfmt' && /^f(Cod|Ret|Rev|Fcr)$/.test(e.target.id)) { const v = id => document.getElementById(id).value.trim(); document.getElementById('fPrev').textContent = `${v('fCod')} · Tiempo de retención: ${v('fRet')} · ${v('fRev')} · ${v('fFcr')}`; } });
async function guardarFmt() {
  const v = id => document.getElementById(id).value.trim(), f = { codigo: v('fCod'), ret: v('fRet'), rev: v('fRev'), fcr: v('fFcr') };
  if (!f.codigo) { toast('Falta el código'); return; }
  try { await Nube.admin.formato(S.fmtK, f); Object.assign(FMTS[S.fmtK], f); await Nube.catalogo().catch(() => { }); toast('Pie de formato actualizado'); go('admin'); }
  catch (e) { toast(e instanceof Nube.SinSenal ? 'Sin señal: inténtalo con internet' : e.message); }
}
async function cargarAdmin() { try { S.admUsuarios = await Nube.admin.usuarios(); if (S.view === 'admin') render(); } catch (e) { toast(e.message); } }
async function admReset(v) { if (!confirm(`¿Restablecer el PIN de ${v} a 123456? Deberá cambiarlo al entrar.`)) return; try { await Nube.admin.resetPin(v); toast('PIN restablecido'); cargarAdmin(); } catch (e) { toast(e.message); } }
async function admEditar(v) {
  const x = (S.admUsuarios || []).find(u => u.visa === v) || { visa: '', nombre: '', rol: 'inspector', activo: true };
  const visa = v || (prompt('VISA (2 o 3 letras):') || '').trim().toUpperCase(); if (!visa) return;
  const nombre = (prompt('Nombre completo:', x.nombre) || '').trim(); if (!nombre) return;
  const rol = (prompt('Perfil: inspector, ingeniero, jefe, gerente, director o admin', x.rol) || '').trim().toLowerCase();
  if (!ROL[rol]) { toast('Perfil no válido'); return; }
  const activo = v ? confirm('¿Usuario activo? (Aceptar = activo, Cancelar = inactivo)') : true;
  try { await Nube.admin.usuario(visa, nombre, rol, activo); toast('Usuario guardado' + (v ? '' : ' · PIN inicial 123456')); cargarAdmin(); } catch (e) { toast(e.message); }
}
function leerExcel(cb) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.xls';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try { if (!window.XLSX) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'lib/xlsx.full.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      cb(XLSX.read(await f.arrayBuffer(), { type: 'array' })); } catch (e) { toast('No se pudo leer el Excel: ' + e.message, 4000); }
  };
  inp.click();
}
// Lee los calendarios con el mismo formato que los de 2026: una hoja por mes, días en una fila y niveles 1 a 4 debajo.
function interpretarCalendario(wb, tipo) {
  const filas = [], anio = +(prompt('¿De qué año es el calendario?', new Date().getFullYear()) || 0); if (!anio) return null;
  wb.SheetNames.slice(0, 12).forEach((nom, mi) => {
    const ws = wb.Sheets[nom], R = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    // La columna de etiquetas ("Día del mes" / "Nivel") puede no ser la primera: se busca.
    let hr = -1, lc = -1;
    for (let r = 0; r < R.length && hr < 0; r++) { const c = R[r].findIndex(v => /^(d[ií]a|nivel)/i.test(String(v).trim())); if (c >= 0) { hr = r; lc = c; } }
    if (hr < 0) return;
    const dias = R[hr].map((v, c) => ({ v, c })).filter(x => x.c > lc && String(x.v).trim() !== '' && Number.isInteger(+x.v) && +x.v >= 1 && +x.v <= 31);
    for (let r = hr + 1; r < Math.min(R.length, hr + 8); r++) {
      const et = String(R[r][lc] || ''), m = et.match(/(\d)/); if (!m || !/nivel/i.test(et)) continue;
      dias.forEach(({ v, c }) => { const txt = String(R[r][c] || '').trim(); if (txt && !/festivo|^realizad/i.test(txt)) { const d = new Date(anio, mi, +v); if (d.getMonth() === mi) filas.push([`${anio}-${pad(mi + 1)}-${pad(+v)}`, +m[1], txt]); } });
    }
  });
  return { anio, filas };
}
function admCal(tipo) {
  leerExcel(async wb => {
    const r = interpretarCalendario(wb, tipo); if (!r) return; if (!r.filas.length) { toast('No encontré auditorías en el archivo'); return; }
    if (!confirm(`Se encontraron ${r.filas.length} auditorías programadas en ${r.anio}. ¿Reemplazar el calendario de ${tipo === 'ino' ? 'inocuidad' : 'capas'} de ese año?`)) return;
    try { const n = await Nube.admin.calendario(tipo, r.anio, r.filas); await cargarCatalogo(); toast(`Calendario cargado: ${n} auditorías`); } catch (e) { toast(e.message); }
  });
}
function admArts() {
  leerExcel(async wb => {
    const R = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    const filas = R.map(r => [String(r['Item#'] || r['Item'] || '').trim(), String(r['Description'] || r['Descripción'] || '').trim()]).filter(x => x[0]);
    if (!filas.length) { toast('No encontré las columnas Item# y Description'); return; }
    try { const n = await Nube.admin.articulos(filas); await cargarCatalogo(); toast(`${n} artículo(s) nuevo(s) de ${filas.length} en la lista`); } catch (e) { toast(e.message); }
  });
}

/* ---------- ARRANQUE ---------- */
const VERSION = '1.0.0';
function renderLuego() { clearTimeout(renderLuego.t); renderLuego.t = setTimeout(render, 250); }
function render() {
  const v = { login: vLogin, pin: vPin, home: vHome, cap: vCap, paq: vPaq, iny: vIny, sop: vSop, ino: vIno, fug: vFug, admfmt: vAdmFmt, firma: vFirma, done: vDone, rep: vRep, seg: vSeg, pdf: vPdf, cuenta: vCuenta, admin: vAdmin, guardando: vGuardando }[S.view] || vLogin;
  document.getElementById('app').innerHTML = v();
  document.querySelectorAll('.item').forEach(it => { const b = it.querySelectorAll('.seg button.on'); if (!b.length) return; const bad = [...b].some(x => x.classList.contains('bad')); const all = it.querySelectorAll('.seg').length === b.length; it.classList.toggle('isbad', bad); it.classList.toggle('isok', !bad && all); });
  if (S.view === 'firma') initSig();
  if (S.view === 'admin' && !S.admUsuarios) cargarAdmin();
}
window.addEventListener('cep-sync', e => { toast(`${e.detail.enviados} registro(s) enviados`); refrescar(); });
(async function iniciar() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
  const s = Nube.sesion();
  if (s) {
    INSPECTOR = { visa: s.visa, nombre: s.nombre, rol: s.rol };
    try { await cargarCatalogo(); } catch (e) { if (/Sesión no válida/.test(e.message)) { salir(true); return; } }
    if (s.cambiar_pin) { go('pin', { pinObligatorio: true }); return; }
    go('home'); Nube.sincronizar();
  } else render();
})();
