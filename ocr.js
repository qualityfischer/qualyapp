/* Lectura de la etiqueta del paquete con Tesseract (todo dentro del celular, sin internet). */
const OCR = (() => {
  let worker = null;
  async function cargar() {
    if (worker) return worker;
    if (!window.Tesseract) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'lib/tesseract/tesseract.min.js'; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar el lector')); document.head.appendChild(s); });
    const base = new URL('lib/tesseract/', location.href).href;
    worker = await Tesseract.createWorker('eng', 1, { workerPath: base + 'worker.min.js', corePath: base, langPath: base + 'lang', gzip: true });
    return worker;
  }
  function rotar(dataURL, grados) {
    return new Promise(res => {
      const img = new Image(); img.onload = () => {
        const c = document.createElement('canvas'), r = grados % 180 !== 0;
        c.width = r ? img.height : img.width; c.height = r ? img.width : img.height;
        const x = c.getContext('2d'); x.translate(c.width / 2, c.height / 2); x.rotate(grados * Math.PI / 180); x.drawImage(img, -img.width / 2, -img.height / 2);
        res(c.toDataURL('image/jpeg', 0.9));
      }; img.src = dataURL;
    });
  }
  // Extrae los datos del texto de la etiqueta Fischer
  function interpretar(texto, arts) {
    const t = String(texto || ''), c = {};
    const consec = t.match(/(\d{1,4})\s*(?:of|de|0f)\s*(\d{1,4})/i); if (consec) c.paq = `${consec[1]} de ${consec[2]}`;
    const fecha = t.match(/(\d{2}\/\d{2}\/\d{4})/); if (fecha) c.fprod = fecha[1];
    const maq = t.match(/\b(M\d{1,2}|S\d{1,2}|L[1-5]|T1)\b/); if (maq) c.maq = maq[1];
    const tokens = t.split(/[^A-Za-z0-9.\-]+/).filter(Boolean);
    const art = tokens.find(k => arts && arts.has(k) && !/^\d{6,}$/.test(k)) || tokens.find(k => arts && arts.has(k)); if (art) c.art = art;
    const lotes = (t.match(/\b\d{6}\b/g) || []).filter(n => n !== c.art); if (lotes.length) c.op = lotes[0];
    const op = t.match(/Operat?or[^\n]*\n?[^A-Z]*\b([A-Z]{2,3})\b/); if (op && !['EA', 'NA', 'SA', 'CV', 'RE', 'DE'].includes(op[1])) c.visa = op[1];
    return c;
  }
  const puntos = c => ['art', 'op', 'paq', 'maq', 'fprod'].filter(k => c[k]).length;
  async function leer(dataURL, arts, avance) {
    const w = await cargar(); let mejor = { campos: {}, encontrados: 0 };
    for (const g of [0, 90, 270, 180]) {
      avance && avance(g);
      const img = g ? await rotar(dataURL, g) : dataURL;
      const r = await w.recognize(img);
      const campos = interpretar(r.data.text, arts), n = puntos(campos);
      if (n > mejor.encontrados) mejor = { campos, encontrados: n, texto: r.data.text };
      if (n >= 3) break;
    }
    return mejor;
  }
  return { leer, interpretar };
})();
if (typeof module !== 'undefined') module.exports = OCR;
