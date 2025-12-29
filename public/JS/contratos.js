/* -------------------------
  Funciones para generar contrato PDF usando jsPDF UMD v3.0.3
  - Detecta window.jspdf.jsPDF y window.jsPDF
  - generarContratoPDF(formValues) => crea y descarga PDF
  - generarContratoDesdeModal() => helper que abre Swal y llama a generarContratoPDF
  ------------------------- */

async function initJsPDFConstructor() {
  // El UMD de la URL que pasaste suele exponer window.jspdf.jsPDF
  if (window.jspdf && typeof window.jspdf.jsPDF === 'function') return window.jspdf.jsPDF;
  if (typeof window.jsPDF === 'function') return window.jsPDF;
  // Espera breve por si el script se está cargando dinámicamente
  await new Promise(r => setTimeout(r, 30));
  if (window.jspdf && typeof window.jspdf.jsPDF === 'function') return window.jspdf.jsPDF;
  if (typeof window.jsPDF === 'function') return window.jsPDF;
  throw new Error('jsPDF no detectado. Verifica que el script de jspdf.umd.min.js se haya cargado antes de este código.');
}

function safeFileName(name) {
  return name.replace(/[^\w\-_. ]+/g, '_').slice(0, 120);
}

async function generarContratoPDF(formValues) {
  const JsPDFCtor = await initJsPDFConstructor(); // puede lanzar
  // preparar fechas y datos
  const today = new Date().toISOString().split('T')[0];
  let fechaFin = '';
  try {
    const d = new Date(formValues.fechaInicio);
    d.setMonth(d.getMonth() + Number(formValues.duracion || 0));
    fechaFin = d.toISOString().split('T')[0];
  } catch(e) { fechaFin = ''; }

  // plantilla de cláusulas (puedes ampliar)
  const clausulas = [
    `1. PARTES: Entre ${formValues.propietario} (ARRENDADOR) y ${formValues.inquilino} (ARRENDATARIO).`,
    `2. OBJETO: El ARRENDADOR da en arrendamiento el inmueble ubicado en: ${formValues.direccion}.`,
    `3. DURACIÓN: ${formValues.duracion} meses, desde ${formValues.fechaInicio} hasta ${fechaFin}.`,
    `4. RENTA: RD$ ${Number(formValues.monto).toFixed(2)} mensuales, pagadera en el lugar y forma convenidos.`,
    `5. DEPÓSITO: Si aplica, se entregará la garantía acordada entre las partes.`,
    `6. OBLIGACIONES ARRENDADOR: Mantener el inmueble en condiciones de habitabilidad y efectuar reparaciones necesarias.`,
    `7. OBLIGACIONES ARRENDATARIO: Pagar la renta puntualmente y no destinar el inmueble a usos distintos sin autorización.`,
    `8. TERMINACIÓN: En caso de incumplimiento se aplicarán los procedimientos legales vigentes en la República Dominicana.`,
  ];
  if (formValues.clausulas) clausulas.push(`9. CLÁUSULAS ADICIONALES: ${formValues.clausulas}`);

  // crear PDF
  const doc = new JsPDFCtor({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = margin;
  const lh = 14;

  // header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('CONTRATO DE ARRENDAMIENTO', pageW / 2, y, { align: 'center' });
  y += 28;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Fecha de generación: ${today}`, margin, y);
  if (formValues.asesor) doc.text(`Asesor legal: ${formValues.asesor}`, margin + 260, y);
  y += 20;

  // Datos principales
  doc.setFontSize(11);
  const write = (text) => {
    const lines = doc.splitTextToSize(text, maxW);
    doc.text(lines, margin, y);
    y += lines.length * (lh + 2);
    if (y > pageH - 80) { doc.addPage(); y = margin; }
  };

  write(`ARRENDADOR: ${formValues.propietario}`);
  write(`ARRENDATARIO: ${formValues.inquilino}`);
  write(`INMUEBLE: ${formValues.direccion}`);
  y += 6;

  // cláusulas
  clausulas.forEach(c => write(c));
  y += 6;

  // cláusula económica y firmas
  write(`Monto de la renta mensual: RD$ ${Number(formValues.monto).toFixed(2)}`);
  write(`Duración: ${formValues.duracion} meses. Inicio: ${formValues.fechaInicio}. Fin: ${fechaFin}`);
  y += 8;

  if (y > pageH - 160) { doc.addPage(); y = margin; }
  const sigY = y + 40;
  doc.text('______________________________', margin, sigY);
  doc.text(`${formValues.propietario}`, margin, sigY + 16);
  doc.text('ARRENDADOR', margin, sigY + 32);

  doc.text('______________________________', margin + 260, sigY);
  doc.text(`${formValues.inquilino}`, margin + 260, sigY + 16);
  doc.text('ARRENDATARIO', margin + 260, sigY + 32);

  // nota final
  const nota = 'NOTA: Esta plantilla es informativa. Se recomienda revisión por un profesional del derecho antes de firmar.';
  y = sigY + 80;
  if (y > pageH - 60) { doc.addPage(); y = margin; }
  const notaLines = doc.splitTextToSize(nota, maxW);
  doc.setFontSize(9);
  doc.text(notaLines, margin, y);

  // descargar
  const todayClean = today.replace(/:/g,'-');
  const fileName = safeFileName(`Contrato_${formValues.inquilino}_${todayClean}.pdf`);
  doc.save(fileName);

  return fileName;
}

/* Helper: abrir modal SweetAlert2, recoger datos y generar PDF.
   Si no usas Swal cambia por tu propio formulario o usa el enlace-imprimir. */
function generarContratoDesdeModal() {
  if (typeof Swal === 'undefined' || typeof Swal.fire !== 'function') {
    console.warn('SweetAlert2 no encontrado. Llama directamente a generarContratoPDF(formValues).');
    return;
  }

  Swal.fire({
    title: 'Generar contrato de arrendamiento',
    html:
      `<input id="c_propietario" class="swal2-input" placeholder="Nombre del propietario">` +
      `<input id="c_inquilino" class="swal2-input" placeholder="Nombre del inquilino">` +
      `<input id="c_asesor" class="swal2-input" placeholder="Nombre del asesor legal (opcional)">` +
      `<input id="c_direccion" class="swal2-input" placeholder="Dirección del inmueble">` +
      `<input id="c_monto" class="swal2-input" placeholder="Monto mensual (ej: 15000)" type="number">` +
      `<input id="c_duracion" class="swal2-input" placeholder="Duración (meses)" type="number">` +
      `<input id="c_fecha_inicio" class="swal2-input" placeholder="Fecha inicio" type="date">` +
      `<textarea id="c_clausulas" class="swal2-textarea" placeholder="Cláusulas adicionales (opcional)"></textarea>`,
    focusConfirm: false,
    showCancelButton: true,
    preConfirm: () => {
      const propietario = document.getElementById('c_propietario').value.trim();
      const inquilino = document.getElementById('c_inquilino').value.trim();
      const asesor = document.getElementById('c_asesor').value.trim();
      const direccion = document.getElementById('c_direccion').value.trim();
      const monto = parseFloat(document.getElementById('c_monto').value);
      const duracion = parseInt(document.getElementById('c_duracion').value, 10);
      const fechaInicio = document.getElementById('c_fecha_inicio').value;
      const clausulas = document.getElementById('c_clausulas').value.trim();

      if (!propietario || !inquilino || !direccion || isNaN(monto) || isNaN(duracion) || !fechaInicio) {
        Swal.showValidationMessage('Completa los campos obligatorios: propietario, inquilino, dirección, monto, duración, fecha.');
        return false;
      }
      return { propietario, inquilino, asesor, direccion, monto, duracion, fechaInicio, clausulas };
    }
  }).then(async (res) => {
    if (!res.isConfirmed || !res.value) return;
    try {
      Swal.fire({ title: 'Generando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await generarContratoPDF(res.value);
      Swal.close();
      Swal.fire('Generado', 'Contrato PDF generado y descargado.', 'success');
    } catch (err) {
      console.error('Error generando contrato:', err);
      Swal.fire('Error', 'Ocurrió un error generando el PDF: ' + (err.message || err), 'error');
    }
  });
}

// Si quieres, enlaza el botón en tu UI:
const btn = document.getElementById('btn_generar_Contrat');
if (btn) {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    generarContratoDesdeModal();
  });
}
