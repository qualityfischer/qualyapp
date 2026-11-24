/* Guarda la app en el celular para que abra y capture sin señal. */
const VERSION = 'qualyapp-v1.1.0';
const BASE = ['./', 'index.html', 'config.js', 'datos.js', 'semilla.js', 'nube.js', 'ocr.js', 'pdfgen.js', 'app.js', 'manifest.json', 'img/logo.png', 'img/icono-192.png', 'img/icono-512.png'];
const PESADOS = ['lib/html2canvas.min.js', 'lib/jspdf.umd.min.js', 'lib/xlsx.full.min.js', 'lib/tesseract/tesseract.min.js', 'lib/tesseract/worker.min.js',
  'lib/tesseract/tesseract-core-lstm.wasm.js', 'lib/tesseract/tesseract-core-simd-lstm.wasm.js', 'lib/tesseract/lang/eng.traineddata.gz'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASE).then(() => c.addAll(PESADOS).catch(() => { }))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // Supabase y POST: siempre a la red
  // Archivos de la app: primero la red (para tomar actualizaciones), si no hay señal, la copia guardada.
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(k => k.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
