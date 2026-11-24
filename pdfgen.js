/* Genera el archivo PDF (hoja carta) a partir de los formatos en pantalla. */
const PDFGen = (() => {
  const cargarJS = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar ' + src)); document.head.appendChild(s); });
  async function libs() {
    if (!window.html2canvas) await cargarJS('lib/html2canvas.min.js');
    if (!window.jspdf) await cargarJS('lib/jspdf.umd.min.js');
  }
  // Cada elemento va en su propia hoja carta, ajustado al ancho (y al alto si no cabe).
  async function crear(elementos) {
    await libs();
    const pdf = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter', compress: true });
    const W = 612, H = 792, M = 28;
    for (let i = 0; i < elementos.length; i++) {
      const el = elementos[i];
      // Se captura a ancho de hoja (no de celular) para que el formato llene la página.
      const cv = await window.html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 700,
        onclone: (doc, c) => { c.style.width = '640px'; c.style.maxWidth = 'none'; c.style.margin = '0'; } });
      let w = W - 2 * M, h = cv.height * w / cv.width;
      if (h > H - 2 * M) { h = H - 2 * M; w = cv.width * h / cv.height; }
      if (i) pdf.addPage('letter');
      pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', (W - w) / 2, M, w, h, undefined, 'FAST');
    }
    return pdf.output('blob');
  }
  function descargar(blob, nombre) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  async function compartir(elementos, nombre, texto) {
    const blob = await crear(elementos), f = new File([blob], nombre, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: nombre.replace(/\.pdf$/, ''), text: texto || '' }); return 'compartido'; }
    descargar(blob, nombre); return 'descargado';
  }
  return { crear, descargar, compartir };
})();
