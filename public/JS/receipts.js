// receipts.js
// Dependencias opcionales:
// - jsPDF (opcional para mejor PDF): <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

(function(){
  function escapeHtml(s) {
    return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function formatCurrency(n) {
    try { return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    catch(e) { return Number(n).toFixed(2); }
  }

  function buildReceiptHtml(inquilino, pagoData) {
    const fecha = new Date(pagoData.fecha || Date.now());
    const fechaStr = fecha.toLocaleString();

    const ingreso = Number(inquilino.ingreso_mensual || 0);
    const pago = Number(pagoData.monto || 0);
    const debe = Math.max(0, ingreso - pago);
    const pagoCompleto = pago >= ingreso;

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Recibo - ${escapeHtml(inquilino.nombre || 'Inquilino')}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; padding:24px; color:#111827; }
          .card { max-width: 700px; margin: 0 auto; border: 1px solid #e5e7eb; padding:20px; border-radius:8px; }
          h1 { margin:0 0 8px 0; font-size:20px; color:#065f46; }
          .meta { color:#6b7280; margin-bottom:16px; }
          .row { display:flex; justify-content:space-between; margin:10px 0; }
          .label { color:#374151; font-weight:700; width:40%; }
          .value { color:#0f172a; width:58%; text-align:right; }
          .amount { font-size:1.6rem; font-weight:900; text-align:center; margin:18px 0; }
          .amount.complete { color:#10b981; }
          .amount.incomplete { color:#ef4444; }
          .status { display:inline-block; padding:8px 12px; border-radius:8px; color:#fff; font-weight:700; }
          .status.complete { background:#10b981; }
          .status.incomplete { background:#ef4444; }
          .footer { margin-top:22px; font-size:0.85rem; color:#6b7280; text-align:center; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Recibo de Pago</h1>
          <div class="meta">Fecha: ${escapeHtml(fechaStr)}</div>

          <div class="row"><div class="label">Nombre</div><div class="value">${escapeHtml(inquilino.nombre || '')}</div></div>
          <div class="row"><div class="label">Teléfono</div><div class="value">${escapeHtml(inquilino.telefono || '')}</div></div>
          <div class="row"><div class="label">Nº Casa</div><div class="value">${escapeHtml(inquilino.N_casa || '')}</div></div>
          <div class="row"><div class="label">Dirección</div><div class="value">${escapeHtml(inquilino.direccion || '')}</div></div>
          <div class="row"><div class="label">Descripción</div><div class="value">${escapeHtml(inquilino.descripcion || '')}</div></div>
          <div class="row"><div class="label">Monto mensual</div><div class="value">$${formatCurrency(inquilino.ingreso_mensual || 0)}</div></div>

          <div class="amount ${pagoCompleto ? 'complete' : 'incomplete'}">$${formatCurrency(pago)}</div>

          <div style="text-align:center; margin:8px 0;"><span class="status ${pagoCompleto ? 'complete' : 'incomplete'}">${pagoCompleto ? 'Pago completo' : 'Pago incompleto'}</span></div>

          <div class="row"><div class="label">Monto adeudado</div><div class="value">$${formatCurrency(debe)}</div></div>

          <div class="row"><div class="label">Concepto</div><div class="value">${escapeHtml(pagoData.concepto || 'Pago')}</div></div>
          <div class="row"><div class="label">Fecha de recibo</div><div class="value">${escapeHtml(fechaStr)}</div></div>

          <div class="footer">Este recibo fue generado automáticamente.</div>
        </div>
      </body>
      </html>
    `;
  }
async function askPrintThenFormat() {
  const { value: format } = await Swal.fire({
    title: 'Selecciona formato del recibo',
    input: 'radio',
    inputOptions: {
      doc: 'DOC (Word)',
      pdf: 'PDF'
    },
    inputValue: 'doc', // Word por defecto
    inputValidator: (val) => !val ? 'Selecciona un formato' : null,
    showCancelButton: true,
    confirmButtonText: 'Descargar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#10b981'
  });

  if (!format) return null;
  return { format };
}


  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function generatePdfFromHtml(html, filename) {
    if (window.jspdf && window.jspdf.jsPDF) {
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        await doc.html(html, {
          x: 20,
          y: 20,
          html2canvas: { scale: 1 },
          callback: function (doc) {
            doc.save(filename);
          }
        });
        return true;
      } catch (e) {
        console.warn('jsPDF html fallback failed', e);
      }
    }

    const w = window.open('', '_blank');
    if (!w) { Swal.fire('Error', 'No se pudo abrir ventana para generar PDF.', 'error'); return false; }
    w.document.write(html);
    w.document.close();
    return true;
  }

 async function generatePdfFromHtml(html, filename) {
  if (window.jspdf && window.jspdf.jsPDF) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      await doc.html(html, {
        x: 20,
        y: 20,
        html2canvas: { scale: 1 },
        callback: function (doc) {
          doc.save(filename);
        }
      });
      return true;
    } catch (e) {
      console.warn('jsPDF failed', e);
    }
  }

  Swal.fire(
    'Error',
    'No se pudo generar el PDF automáticamente. Intenta con DOC.',
    'error'
  );
  return false;
}


  // API pública
  window.receipts = window.receipts || {};
  window.receipts.generateReceipt = async function(inquilino, pagoData = {}) {
    if (!inquilino || !pagoData) {
      console.warn('generateReceipt: faltan parámetros', inquilino, pagoData);
      Swal.fire('Error', 'Faltan datos para generar el recibo.', 'error');
      return;
    }

    const pago = {
      monto: pagoData.monto != null ? pagoData.monto : 0,
      fecha: pagoData.fecha || new Date().toISOString(),
      concepto: pagoData.concepto || 'Pago'
    };

    const choices = await askPrintThenFormat();
    const html = buildReceiptHtml(inquilino, pago);

    const safeName = (inquilino.nombre || 'inquilino').replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_-]/g,'');
    const fechaShort = (new Date(pago.fecha)).toISOString().slice(0,19).replace(/[:T]/g,'-');
    const filenameBase = `recibo-${safeName}-${fechaShort}`;

    if (!choices) return;

  

    if (choices.format === 'pdf') {
      const filename = `${filenameBase}.pdf`;
      const ok = await generatePdfFromHtml(html, filename);
      if (!ok) Swal.fire('Atención', 'PDF generado (o abierto). Si no se descargó automáticamente, usa imprimir/guardar en la nueva ventana.', 'info');
    } else {
      const filename = `${filenameBase}.doc`;
      generateDocFromHtml(html, filename);
      Swal.fire('Listo', 'Recibo .doc descargado (ábrelo con Word).', 'success');
    }
  };

  /* ================= Generar recibo al agregar inquilino ================= */
  (function() {
    const STORAGE_KEY = 'inquilinos_boxes_v1';

    function checkNewInquilinos() {
      const oldIds = new Set(JSON.parse(localStorage.getItem('__recibos_last_ids__') || '[]'));
      const boxes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

      const newInquilinos = boxes.filter(x => !oldIds.has(x.id));
      if (newInquilinos.length > 0) {
        const currentIds = boxes.map(x => x.id);
        localStorage.setItem('__recibos_last_ids__', JSON.stringify(currentIds));

        newInquilinos.forEach(inq => {
          const pagoData = {
            monto: inq.ingreso_mensual || 0,
            fecha: new Date().toISOString(),
            concepto: 'Pago inicial/recibo de alta'
          };
          receipts.generateReceipt(inq, pagoData);
        });
      }
    }

    setInterval(checkNewInquilinos, 1000);
  })();

})();
