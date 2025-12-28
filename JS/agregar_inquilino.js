(() => {
  const STORAGE_KEY = 'inquilinos_boxes_v1';
  const DELETE_QUEUE_KEY = 'inquilinos_delete_queue_v1';
  const TRASH_KEY = 'inquilinos_papelera_v1';
  // Duración por defecto del cronómetro: 31 días
  const DURATION_MS = 31 * 24 * 60 * 60 * 1000; // 31 días
  // Zona roja: a partir de 24 horas restantes
  const RED_ZONE_MS = 24 * 60 * 60 * 1000; // 24 horas
  const API_BASE = 'http://localhost:3001';
  const MAX_DELETE_ATTEMPTS = 5;

  // Helper: convierte milisegundos a una cadena compacta incluyendo días, horas, minutos y segundos (ej. "2d 03h 05m 30s", "03h 25m 10s", "45m 30s", "00s")
  function humanFriendlyMs(ms) {
    if (!isFinite(ms) || ms <= 0) return '0s';
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days >= 1) return `${days}d ${String(hours).padStart(2,'0')}h ${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;
    if (hours >= 1) return `${String(hours).padStart(2,'0')}h ${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;
    if (minutes >= 1) return `${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;
    return `${String(seconds).padStart(2,'0')}s`;
  }

  const btnGuardar = document.getElementById('btn_guardar_inquilino');
  const form = document.getElementById('form_inquilinos');
  const boxesContainer = document.querySelector('.box_container');
  if (!boxesContainer) { console.error('No se encontró .box_container'); return; }

  // ---------------- helpers storage / servidor ----------------
  function readBoxesStorage() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; }
  }
  function writeBoxesStorage(arr) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch (e) { console.warn('storage write failed', e); }
  }

  function readDeleteQueue() {
    try { return JSON.parse(localStorage.getItem(DELETE_QUEUE_KEY) || '[]'); } catch (e) { return []; }
  }
  function writeDeleteQueue(q) {
    try { localStorage.setItem(DELETE_QUEUE_KEY, JSON.stringify(q)); } catch (e) { console.warn('delete queue write failed', e); }
  }
  function enqueueDelete(item) {
    const q = readDeleteQueue();
    const already = q.find(x => String(x.id) === String(item.id));
    if (already) return;
    q.push({ id: String(item.id), timestamp: Date.now(), attempts: 0, payload: item });
    writeDeleteQueue(q);
  }
  function dequeueDelete(id) {
    const q = readDeleteQueue().filter(x => String(x.id) !== String(id));
    writeDeleteQueue(q);
  }

  // Papelera helpers (local)
  function readTrash() {
    try { return JSON.parse(localStorage.getItem(TRASH_KEY) || '[]'); } catch (e) { return []; }
  }
  function writeTrash(arr) {
    try { localStorage.setItem(TRASH_KEY, JSON.stringify(arr)); } catch (e) { console.warn('papelera write failed', e); }
  }
  function addToLocalTrash(item) {
    if (!item) return;
    const arr = readTrash();
    const idStr = item.id != null ? String(item.id) : genId();
    const now = Date.now();
    const toStore = { ...item, id: idStr, __deletedAt: now };
    const idx = arr.findIndex(x => String(x.id) === idStr);
    if (idx === -1) arr.unshift(toStore);
    else arr[idx] = toStore;
    writeTrash(arr);
  }
  function removeFromLocalTrash(id) {
    const arr = readTrash().filter(x => String(x.id) !== String(id));
    writeTrash(arr);
  }

  function genId() { return `${Date.now()}-${Math.floor(Math.random()*9000+1000)}`; }
  function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // sanitización: solo dígitos y guiones
  function sanitizeIdPhone(value) {
    return String(value || '').replace(/[^0-9-]/g, '');
  }
  // Normaliza valor para atribuir a <input type="date"> (formato YYYY-MM-DD)
  function formatDateForInput(value) {
    if (!value && value !== 0) return '';
    try {
      // Si ya tiene el formato YYYY-MM-DD
      const s = String(value);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // Si viene con T (ISO) => toma parte fecha
      if (s.includes('T')) return s.split('T')[0];
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
      return '';
    } catch(e) { return ''; }
  }
  function bindSanitizeInput(el) {
    if (!el) return;
    const fn = (e) => {
      const v = sanitizeIdPhone(e.target.value);
      if (e.target.value !== v) e.target.value = v;
    };
    if (!el.dataset._sanitizeBound) {
      el.addEventListener('input', fn);
      el.dataset._sanitizeBound = '1';
      try { el.setAttribute('inputmode', 'numeric'); el.setAttribute('pattern', '[0-9-]*'); } catch(e){}
    }
  }

  async function fetchServerList(endpoint) {
    try {
      const r = await fetch(`${API_BASE}/${endpoint}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }
  async function putToServer(endpoint, body) {
    try {
      const r = await fetch(`${API_BASE}/${endpoint}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }
  async function postToServer(endpoint, body) {
    try {
      const r = await fetch(`${API_BASE}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }
  async function deleteFromServer(endpoint) {
    try {
      const r = await fetch(`${API_BASE}/${endpoint}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
      if (!r.ok) return null;
      try { return await r.json(); } catch(e) { return { ok: true }; }
    } catch (e) { return null; }
  }

  async function cedulaExiste(cedula, excludeId = null) {
    const normalized = sanitizeIdPhone(cedula || '').trim();
    const local = readBoxesStorage() || [];
    if (local.some(x => sanitizeIdPhone(x.cedula || '').trim() === normalized && String(x.id) !== String(excludeId || ''))) return true;
    const server = await fetchServerList('inquilinos');
    if (Array.isArray(server)) {
      if (server.some(x => sanitizeIdPhone(x.cedula || '').trim() === normalized && String(x.id) !== String(excludeId || ''))) return true;
    }
    return false;
  }

  // ---------------- RECEIPTS MODULE (integrado) ----------------
  // Expuesto en window.receipts.generateReceipt(inquilino, pagoData)
  (function receiptsModule(){
    function formatCurrency(n) {
      try { return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
      catch(e) { return Number(n).toFixed(2); }
    }
    function buildReceiptHtml(inquilino, pagoData) {
      const fecha = new Date(pagoData.fecha || Date.now());
      const fechaStr = fecha.toLocaleString();
      // no incluir cédula por petición

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
      const { isConfirmed: wantsPrint } = await Swal.fire({
        title: '¿Imprimir primero?',
        text: '¿Deseas abrir el diálogo de impresión antes de descargar el recibo?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, imprimir primero',
        cancelButtonText: 'No, solo descargar',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#374151'
      });

      const { value: format } = await Swal.fire({
        title: 'Selecciona formato',
        input: 'radio',
        inputOptions: { pdf: 'PDF', doc: 'DOC (abrir en Word)' },
        inputValidator: (val) => !val ? 'Selecciona un formato' : null,
        showCancelButton: false,
        confirmButtonText: 'Generar',
        confirmButtonColor: '#10b981'
      });

      return { wantsPrint: !!wantsPrint, format: format || 'pdf' };
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
      // fallback: abrir nueva ventana y permitir al usuario imprimir/guardar
      const w = window.open('', '_blank');
      if (!w) { Swal.fire('Error', 'No se pudo abrir ventana para generar PDF.', 'error'); return false; }
      w.document.write(html);
      w.document.close();
      return true;
    }

    function generateDocFromHtml(html, filename) {
      const blob = new Blob([html], { type: 'application/msword' });
      downloadBlob(blob, filename);
    }

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

      if (choices.wantsPrint) {
        const w = window.open('', '_blank');
        if (!w) { Swal.fire('Error', 'No se pudo abrir la ventana de impresión.', 'error'); return; }
        w.document.write(html);
        w.document.close();
        setTimeout(() => {
          try { w.focus(); w.print(); } catch(e) { console.warn('print failed', e); }
        }, 500);
        const { isConfirmed: downloadAfter } = await Swal.fire({
          title: '¿Descargar recibo?',
          text: '¿Quieres descargar también el recibo después de imprimir?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí, descargar',
          cancelButtonText: 'No',
          confirmButtonColor: '#10b981'
        });
        if (!downloadAfter) return;
      }

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
  })();
  // ---------------- FIN RECEIPTS MODULE ----------------


  // Navegación ENTER en formulario
  const formInquilinos = document.getElementById('form_inquilinos');
  if (formInquilinos) {
    const inputs = Array.from(formInquilinos.querySelectorAll('input, textarea, button[type="button"]'));
    inputs.forEach((input, index) => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const next = inputs[index + 1];
          if (next) next.focus();
        }
      });
    });
  }

  // Bind sanitizers en formulario principal
  (function bindMainFormSanitizers(){
    const cedMain = document.getElementById('cedula_inquilino');
    const telMain = document.getElementById('telefono_inquilino');
    bindSanitizeInput(cedMain);
    bindSanitizeInput(telMain);
  })();

  // ---------------- crear / render caja (más ancha y con timer separado) ----------------
  function createBox(item) {
    if (boxesContainer.querySelector(`.inquilino-box[data-id="${item.id}"]`)) return;

    const box = document.createElement('div');
    box.className = 'inquilino-box';
    box.dataset.id = item.id;

    box.dataset.nombre = (item.nombre || '').toString();
    box.dataset.cedula = (item.cedula || '').toString();
    box.dataset.N_casa = (item.N_casa || '').toString();
    box.dataset.direccion = (item.direccion || '').toString();
    box.dataset.telefono = (item.telefono || '').toString();
    box.dataset.descripcion = (item.descripcion || '').toString();
    box.dataset.ingreso_mensual = item.ingreso_mensual != null ? String(item.ingreso_mensual) : '';

    Object.assign(box.style, {
      position: 'relative',
      padding: '18px',
      borderRadius: '12px',
      boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
      background: '#ffffff',
      marginBottom: '18px',
      border: '1px solid #e5e7eb',
      borderLeft: '8px solid #10b981',
      transition: 'all 0.18s ease-in-out',
      cursor: 'pointer',
      overflow: 'hidden',
      minWidth: '380px',
      maxWidth: '720px',
      width: 'calc(100% - 20px)'
    });

    box.onmouseenter = () => { box.style.transform = 'translateY(-3px)'; box.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)'; };
    box.onmouseleave = () => { box.style.transform = 'translateY(0)'; box.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)'; };

    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:8px;">
        <div style="flex:1; min-width:0;">
          <div class="name" style="font-weight:800; font-size:1.25rem; color:#0f172a; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.nombre)}</div>
          <div class="meta" style="font-size:0.85rem; color:#6b7280; margin-top:6px;">
            <span style="display:inline-block; vertical-align:middle; margin-right:6px;">🏠</span> ${escapeHtml(item.N_casa || 'N/A')}
            <span style="display:inline-block; vertical-align:middle; margin-left:12px; margin-right:4px;">📅</span> ${new Date(item.fecha_registro).toLocaleDateString()}
          </div>
        </div>

        <div style="display:flex; gap:8px; align-items:flex-start;">
          <button class="btn-edit-inquilino" title="Editar" style="background-color:#ffffff; border:1px solid #9ca3af; color:#374151; padding:8px; border-radius:8px; cursor:pointer; font-weight:700; margin-left:-60px; margin-top:-10px;">✎</button>
          <button class="btn-remove-inquilino" title="Eliminar" style="background:transparent; border:1px solid #fca5a5; color:#b91c1c; padding:8px; border-radius:8px; cursor:pointer; font-weight:700;">✕</button>
        </div>
      </div>

      <div class="timer-container" style="margin-top:12px; background-color:#f0fdf4; border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; border:1px dashed #a7f3d0;">
         <div style="display:flex; align-items:center; gap:10px;">
           <span style="font-weight:800; font-size:0.78rem; color:#065f46;">⏱</span>
         </div>
         <div class="timer" style="font-weight:900; font-size:1.3rem; color:#059669; font-variant-numeric: tabular-nums;">--:--</div>
      </div>
    `;

    boxesContainer.prepend(box);

    box.querySelector('.btn-remove-inquilino').addEventListener('click', (ev) => {
      ev.stopPropagation();
      Swal.fire({
        title: '¿Eliminar inquilino?',
        text: 'Esta acción moverá el inquilino a la papelera local (puedes restaurarlo dentro de 20 días). Si no se logra eliminar en el servidor, se encolará para reintento.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#10b981',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      }).then(async r => {
        if (r.isConfirmed) {
          await removeBox(item.id);
        }
      });
    });

    box.querySelector('.btn-edit-inquilino').addEventListener('click', (ev) => { ev.stopPropagation(); openEditModal(item); });
    box.addEventListener('click', (e) => { e.stopPropagation(); openDetailModal(item); });

    startBoxTimer(box, item);
  }

  function updateBoxDom(item) {
    const box = boxesContainer.querySelector(`.inquilino-box[data-id="${item.id}"]`);
    if (!box) { createBox(item); return; }
    const nameEl = box.querySelector('.name'); if (nameEl) nameEl.textContent = item.nombre;
    const metaEl = box.querySelector('.meta');
    if (metaEl) metaEl.innerHTML = `<span style="display:inline-block; vertical-align:middle; margin-right:6px;">🏠</span> ${escapeHtml(item.N_casa || 'N/A')} <span style="display:inline-block; vertical-align:middle; margin-left:12px; margin-right:4px;">📅</span> ${new Date(item.fecha_registro).toLocaleDateString()}`;

    box.dataset.nombre = item.nombre || '';
    box.dataset.cedula = item.cedula || '';
    box.dataset.N_casa = item.N_casa || '';
    box.dataset.direccion = item.direccion || '';
    box.dataset.telefono = item.telefono || '';
    box.dataset.descripcion = item.descripcion || '';
    box.dataset.ingreso_mensual = item.ingreso_mensual != null ? String(item.ingreso_mensual) : '';

    startBoxTimer(box, item);
  }

  // ---------------- eliminar ----------------
  async function removeBox(id) {
    // find local item (to keep payload for queue / papelera)
    const arrLocal = readBoxesStorage();
    const item = arrLocal.find(x => String(x.id) === String(id));

    // attempt server delete
    let serverOk = null;
    try {
      const serverResp = await deleteFromServer(`inquilinos/${encodeURIComponent(id)}`);
      if (serverResp !== null) serverOk = true;
      else serverOk = false;
    } catch (e) {
      serverOk = false;
    }

    // always remove locally from main list
    try {
      const arr = readBoxesStorage().filter(x => String(x.id) !== String(id));
      writeBoxesStorage(arr);
    } catch (e) { console.warn('Error actualizando storage local al eliminar', e); }

    // remove DOM element
    const el = boxesContainer.querySelector(`.inquilino-box[data-id="${id}"]`);
    if (el) el.remove();

    if (serverOk) {
      // if there was a queued delete, remove it
      dequeueDelete(id);
      // also remove from local papelera if present
      removeFromLocalTrash(id);
      // notify
      Swal.fire({ title: 'Eliminado', text: 'Inquilino eliminado en el servidor y localmente.', icon: 'success', confirmButtonColor: '#10b981' });
      try {
        if (window.notifications) {
          const runNotify = () => { if (typeof window.notifications.notifyInquilinoDeleted === 'function') window.notifications.notifyInquilinoDeleted(item || { id }); };
          if (typeof window.notifications.requestPermission === 'function' && Notification && Notification.permission === 'default') {
            window.notifications.requestPermission().then(() => runNotify()).catch(() => runNotify());
          } else runNotify();
        }
      } catch(e) { }
    } else { 
      // No se pudo eliminar en el servidor -> mover a papelera local (preferible) o encolar si papelera no existe
      try {
        // preferir API global window.papelera si existe (integración con papelera.js)
        if (window.papelera && typeof window.papelera.moveToTrash === 'function') {
          // pass original item if available, else at least id
          window.papelera.moveToTrash(item || { id });
        } else {
          // local fallback: añadir a papelera local
          addToLocalTrash(item || { id });
        }
        // además encolar para intentar delete definitivo luego (opcional)
        enqueueDelete(item || { id });
        Swal.fire({ title: 'Movido a la papelera', text: 'No se pudo eliminar en el servidor. El registro fue movido a la papelera local y la eliminación se encoló para reintentos.', icon: 'warning', confirmButtonColor: '#10b981' });
        try {
          if (window.notifications) {
            const runNotify = () => { if (typeof window.notifications.notifyInquilinoDeleted === 'function') window.notifications.notifyInquilinoDeleted(item || { id }); };
            if (typeof window.notifications.requestPermission === 'function' && Notification && Notification.permission === 'default') {
              window.notifications.requestPermission().then(() => runNotify()).catch(() => runNotify());
            } else runNotify();
          }
        } catch(e) {}
        
      } catch (e) {
        // si algo falla, volver al comportamiento antiguo: encolar
        enqueueDelete(item || { id });
        Swal.fire({ title: 'Eliminado localmente', text: 'No se pudo eliminar en el servidor. Se encoló la eliminación y se intentará automáticamente más tarde.', icon: 'warning', confirmButtonColor: '#10b981' });
        try { if (window.notifications) { const runNotify = () => { if (typeof window.notifications.notifyInquilinoDeleted === 'function') window.notifications.notifyInquilinoDeleted(item || { id }); }; if (typeof window.notifications.requestPermission === 'function' && Notification && Notification.permission === 'default') { window.notifications.requestPermission().then(() => runNotify()).catch(() => runNotify()); } else runNotify(); } } catch(e) {}
      }
    }

    if (window._openSwals && window._openSwals[id]) {
      try { window._openSwals[id].close(); } catch(e) {}
      delete window._openSwals[id];
    }
  }

  // ---------------- process delete queue ----------------
  async function processDeleteQueue() {
    const q = readDeleteQueue();
    if (!Array.isArray(q) || q.length === 0) return;
    // iterate copy to allow modifications
    for (const entry of Array.from(q)) {
      // skip if attempts exceeded
      if (entry.attempts >= MAX_DELETE_ATTEMPTS) {
        console.warn(`Delete queue: max attempts reached for ${entry.id}`);
        // remove from queue to avoid infinite loops
        dequeueDelete(entry.id);
        continue;
      }
      try {
        const res = await deleteFromServer(`inquilinos/${encodeURIComponent(entry.id)}`);
        if (res !== null) {
          // success: remove queue entry and also remove local if still present
          dequeueDelete(entry.id);
          const arr = readBoxesStorage().filter(x => String(x.id) !== String(entry.id));
          writeBoxesStorage(arr);
          // also remove DOM element if present
          const el = boxesContainer.querySelector(`.inquilino-box[data-id="${entry.id}"]`);
          if (el) el.remove();
          // remove from trash if present
          removeFromLocalTrash(entry.id);
          console.log(`Delete queue: eliminado en servidor id=${entry.id}`);
        } else {
          // failure: increment attempts and persist
          const qCurr = readDeleteQueue();
          const idx = qCurr.findIndex(x => String(x.id) === String(entry.id));
          if (idx !== -1) { qCurr[idx].attempts = (qCurr[idx].attempts || 0) + 1; writeDeleteQueue(qCurr); }
        }
      } catch (e) {
        // network error: increment attempts and persist
        const qCurr = readDeleteQueue();
        const idx = qCurr.findIndex(x => String(x.id) === String(entry.id));
        if (idx !== -1) { qCurr[idx].attempts = (qCurr[idx].attempts || 0) + 1; writeDeleteQueue(qCurr); }
      }
    }
  }

  // retry queue when browser goes online
  window.addEventListener('online', () => {
    console.log('Navegador online: procesando cola de eliminaciones...');
    processDeleteQueue();
  });
function formatMsToDHMS(ms) {
  // Compacto: muestra días, horas, minutos y segundos (según corresponda) en formato corto: d,h,m,s
  if (!isFinite(ms) || ms <= 0) return '0s';
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days >= 1) return `${days}d ${String(hours).padStart(2,'0')}h ${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;
  if (hours >= 1) return `${String(hours).padStart(2,'0')}h ${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;
  if (minutes >= 1) return `${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;
  return `${String(seconds).padStart(2,'0')}s`;
}

  // ---------------- timer UI ----------------
  function startBoxTimer(boxEl, item) {
    if (!boxEl) return;
    if (boxEl._interval) { clearInterval(boxEl._interval); boxEl._interval = null; }
    const timerEl = boxEl.querySelector('.timer');
    const timerContainerEl = boxEl.querySelector('.timer-container');
    if (!timerEl || !timerContainerEl) return;

   function render(msLeft) {
  if (!isFinite(msLeft)) msLeft = 0;
  const isExpired = msLeft <= 0;
  const isRedZone = msLeft > 0 && msLeft <= RED_ZONE_MS;

  if (isExpired) {
    timerEl.textContent = '¡VENCIDO!';
    timerEl.style.color = '#ef4444';
    timerContainerEl.style.backgroundColor = '#fef2f2';
    timerContainerEl.style.borderColor = '#fecaca';
  } 
  else if (isRedZone) {
    timerEl.textContent = formatMsToDHMS(msLeft);
    timerEl.style.color = '#dc2626';
    timerContainerEl.style.backgroundColor = '#fff7ed';
    timerContainerEl.style.borderColor = '#fed7aa';
  } 
  else {
    timerEl.textContent = formatMsToDHMS(msLeft);
    timerEl.style.color = '#059669';
    timerContainerEl.style.backgroundColor = '#f0fdf4';
    timerContainerEl.style.borderColor = '#a7f3d0';
  }

  boxEl.style.borderLeftColor = (isExpired || isRedZone) ? '#ef4444' : '#10b981';
}


    // Normalizar endTime: asegurar que sea número válido y guardarlo si faltaba o estaba inválido
    let end = Number(item.endTime);
    if (!isFinite(end) || end <= 0) {
      end = Date.now() + DURATION_MS;
      item.endTime = end;
      try { const arr = readBoxesStorage(); const idx = arr.findIndex(x => String(x.id) === String(item.id)); if (idx !== -1) { arr[idx] = { ...arr[idx], endTime: item.endTime }; writeBoxesStorage(arr); } } catch(e) { console.warn('Failed to persist endTime normalization', e); }
    }

    render(item.endTime - Date.now());

    boxEl._interval = setInterval(() => {
      const rem = Number(item.endTime) - Date.now();
      if (!isFinite(rem) || rem <= 0) { render(0); clearInterval(boxEl._interval); boxEl._interval = null; return; }
      render(rem);
    }, 250);
  }

  // ---------------- modal generar pago (igual) ----------------
  async function openPaymentModal(item) {
    const msLeft = item.endTime - Date.now();
    const isTimerRunningInGreen = msLeft > RED_ZONE_MS;
    
    if (isTimerRunningInGreen) {
      Swal.fire({ title: 'Pago Denegado 🔒', text: `No se puede generar un pago. El cronómetro tiene más de ${humanFriendlyMs(RED_ZONE_MS)} restantes.`, icon: 'error', confirmButtonColor: '#ef4444' });
      return;
    }


    const maxMonto = item.ingreso_mensual != null ? item.ingreso_mensual : 0;
    const { value: montoPagado } = await Swal.fire({
      title: `<span style="color:#065f46; font-weight:700;">Generar Pago para ${item.nombre}</span>`,
      html: `
        <div style="text-align: center; margin-top: 10px;">
           <p style="font-size: 0.95rem; color: #374151; margin-bottom: 12px;">
             El monto de la renta/pago mensual es: 
             <strong style="color: #10b981; font-size: 1.4rem; margin-left: 48px;">$${maxMonto.toFixed(2)}</strong>
           </p>
           <label style="display: block; font-size: 0.85rem; color: #064e3b; font-weight: 600; margin-bottom: 6px;">Monto a Pagar</label>
           <input id="swal_in_pago_monto" type="number" step="0.01" min="0" 
              class="swal2-input" 
              placeholder="Monto (máx. ${maxMonto.toFixed(2)})"
              style="border-color: #10b981; text-align: right; font-size: 1.2rem; padding: 12px;"
           >
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Confirmar Pago',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      preConfirm: () => {
        const input = document.getElementById('swal_in_pago_monto');
        const monto = parseFloat(input?.value);
        if (isNaN(monto) || monto <= 0) { Swal.showValidationMessage('🚨 Debes ingresar un monto válido y mayor a cero.'); return false; }
        if (monto > maxMonto) { Swal.showValidationMessage(`🛑 El monto no puede exceder el pago mensual de $${maxMonto.toFixed(2)}.`); return false; }
        return monto;
      }
    });

    if (montoPagado) {
      const pagoData = { inquilinoId: item.id, monto: montoPagado, fecha: new Date().toISOString(), concepto: 'Renta Mensual', N_casa: item.N_casa };
      const newEndTime = Date.now() + DURATION_MS;
      item.endTime = newEndTime;
      try { const arr = readBoxesStorage(); const idx = arr.findIndex(x => String(x.id) === String(item.id)); if (idx !== -1) { arr[idx] = { ...arr[idx], endTime: newEndTime }; writeBoxesStorage(arr); } } catch(e){}
      updateBoxDom(item);
      try { await postToServer('pagos', pagoData); } catch(e){ console.warn('Fallo POST pagos', e); }

      // <-- GENERAR RECIBO aquí (usa receipts integrado)
      try {
        if (window.receipts && typeof window.receipts.generateReceipt === 'function') {
          // pasamos el objeto inquilino completo (item) y los datos del pago
          window.receipts.generateReceipt(item, pagoData);
        }
      } catch(e) { console.warn('Error generando recibo', e); }
      
      if (window.registrarPagoIncompleto) {
  window.registrarPagoIncompleto(item, pagoData);
}

      Swal.fire({ title: 'Pago Registrado y Cronómetro Reiniciado', html: `Se registró un pago de <strong style="color: #10b981;">$${montoPagado.toFixed(2)}</strong> de parte de ${item.nombre}. <br> El cronómetro se ha reiniciado.`, icon: 'success', confirmButtonColor: '#10b981' });
    }
  }

  // ---------------- modal detalle / editar / init / guardar ----------------
  window._openSwals = window._openSwals || {};
  function openDetailModal(item) {
    if (window._openSwals[item.id] && typeof window._openSwals[item.id].close === 'function') {
      try { window._openSwals[item.id].close(); } catch(e) {}
      delete window._openSwals[item.id];
    }

    const renta = item.ingreso_mensual != null ? `$${item.ingreso_mensual.toFixed(2)}` : 'N/A';
    const msLeft = item.endTime - Date.now();
    const canPay = msLeft <= RED_ZONE_MS;
    const paymentButtonHtml = canPay ? `<button id="btn_generar_pago" class="swal2-styled" style="background-color: #10b981; border: none; color: white; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer;">💲 Generar Pago</button>` : '';
    const footerHtml = paymentButtonHtml ? `<div style="display: flex; justify-content: center; width: 100%;">${paymentButtonHtml}</div>` : '';

    const isExpired = msLeft <= 0;
    const isRedZone = msLeft > 0 && msLeft <= RED_ZONE_MS;
    const timerBg = isExpired ? '#fef2f2' : (isRedZone ? '#fff7ed' : '#f0fdf4');
    const timerBorder = isExpired ? '#fecaca' : (isRedZone ? '#fed7aa' : '#bbf7d0');
    const timerTextColor = isExpired ? '#b91c1c' : (isRedZone ? '#9a3412' : '#166534');
    const timerValueColor = isExpired ? '#ef4444' : (isRedZone ? '#ea580c' : '#15803d');

    const redNoticeHtml = isRedZone ? `<p style="margin-top:8px; color:#b91c1c; font-weight:700; text-align:center;">Modo Rojo: queda ${formatMsToDHMS(msLeft)} — ahora puedes generar el pago antes de que se venza.</p>` : '';

    const html = `
      <div style="text-align:left; font-size:0.95rem; line-height:1.6;">
        <p style="margin-bottom: 8px;"><strong>Nombre:</strong> ${escapeHtml(item.nombre)}</p>
        <p style="margin-bottom: 8px;"><strong>Cédula:</strong> ${escapeHtml(item.cedula || '')}</p>
        <p style="margin-bottom: 8px;"><strong>Teléfono:</strong> ${escapeHtml(item.telefono || '')}</p>
        <p style="margin-bottom: 8px;"><strong>Casa:</strong> ${escapeHtml(item.N_casa || '')}</p>
        <p style="margin-bottom: 8px;"><strong>Ingreso Mensual/Renta:</strong> <strong style="color: ${isExpired || isRedZone ? '#ef4444' : '#059669'};">${renta}</strong></p>
        <p style="margin-bottom: 8px;"><strong>Dirección física:</strong> ${escapeHtml(item.direccion || '')}</p>
        <p style="margin-bottom: 8px;"><strong>Fecha hospedaje:</strong> ${item.fecha_ospedaje ? escapeHtml(item.fecha_ospedaje) : ''}</p>
        <p style="margin-bottom: 8px;"><strong>Descripción:</strong> ${escapeHtml(item.descripcion || '')}</p>
        <p style="margin-bottom: 8px;"><strong>Registrado:</strong> ${new Date(item.fecha_registro).toLocaleString()}</p>

        <div style="margin-top:15px; background:${timerBg}; padding:10px; border-radius:8px; border:1px solid ${timerBorder}; text-align:center;">
          <div style="color:${timerTextColor}; font-size:0.8rem; text-transform:uppercase; font-weight:bold;">Cronómetro de Registro</div>
          <div id="swal-timer-${item.id}" style="font-weight:800; font-size:1.8rem; color:${timerValueColor}; margin-top:2px; font-variant-numeric: tabular-nums;">--:--</div>
          ${redNoticeHtml}
        </div>
      </div>
    `;

    const p = Swal.fire({
      title: `Inquilino`,
      html,
      showCloseButton: true,
      focusConfirm: false,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Editar Información',
      customClass: { cancelButton: 'swal2-styled', footer: 'swal-footer-payment' },
      footer: footerHtml,
      didOpen: (modalEl) => {
        const el = document.getElementById(`swal-timer-${item.id}`); if (!el) return;
       function renderModalTimer(msLeft) {
  const isExpired = msLeft <= 0;
  const isRedZone = msLeft > 0 && msLeft <= RED_ZONE_MS;

  const timerValueEl = el;
  const containerEl = timerValueEl.parentElement;
  const titleEl = containerEl.querySelector('div');

  if (isExpired) {
    timerValueEl.textContent = '¡VENCIDO!';
    timerValueEl.style.color = '#ef4444';
    containerEl.style.background = '#fef2f2';
    containerEl.style.borderColor = '#fecaca';
    if (titleEl) titleEl.style.color = '#b91c1c';
  } 
  else if (isRedZone) {
    timerValueEl.textContent = formatMsToDHMS(msLeft);
    timerValueEl.style.color = '#ea580c';
    containerEl.style.background = '#fff7ed';
    containerEl.style.borderColor = '#fed7aa';
    if (titleEl) titleEl.style.color = '#9a3412';
  } 
  else {
    timerValueEl.textContent = formatMsToDHMS(msLeft);
    timerValueEl.style.color = '#15803d';
    containerEl.style.background = '#f0fdf4';
    containerEl.style.borderColor = '#bbf7d0';
    if (titleEl) titleEl.style.color = '#166534';
  }

  const footerEl = modalEl.querySelector('.swal-footer-payment');
  if (footerEl) {
    if (msLeft <= RED_ZONE_MS) {
      if (!footerEl.querySelector('#btn_generar_pago')) {
        footerEl.innerHTML = paymentButtonHtml;
        const newBtnPago = footerEl.querySelector('#btn_generar_pago');
        if (newBtnPago) {
          newBtnPago.addEventListener('click', () => {
            Swal.close();
            openPaymentModal(item);
          });
        }
      }
    } else {
      footerEl.innerHTML = '';
    }
  }
}

        renderModalTimer(item.endTime - Date.now());
        const intervalId = setInterval(() => { const rem = item.endTime - Date.now(); if (rem <= 0) { renderModalTimer(0); clearInterval(intervalId); return; } renderModalTimer(rem); }, 250);
        window._openSwals[item.id] = { close: () => Swal.close(), _intervalId: intervalId };

        const btnPago = modalEl.querySelector('#btn_generar_pago'); if (btnPago) btnPago.addEventListener('click', () => { Swal.close(); openPaymentModal(item); });
      },
      willClose: () => { if (window._openSwals[item.id] && window._openSwals[item.id]._intervalId) clearInterval(window._openSwals[item.id]._intervalId); delete window._openSwals[item.id]; }
    });

    p.then(res => { if (res.dismiss === Swal.DismissReason.cancel) openEditModal(item); });
  }

  // ---------------- openEditModal ----------------
  async function openEditModal(item) {
    const modalStyle = `
      <style>
        .swal-edit-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; text-align: left; margin-top: 10px; }
        .swal-field { display: flex; flex-direction: column; }
        .swal-field.full-width { grid-column: span 2; }
        .swal-custom-input { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; background: #fff; width: 100%; box-sizing: border-box; }
        .swal-custom-textarea { resize: vertical; min-height: 80px; font-family: inherit; }
      </style>
    `;

    const html = `
      ${modalStyle}
      <div class="swal-edit-grid">
        <div class="swal-field full-width">
          <label>Nombre Completo</label>
          <input id="swal_in_nombre" class="swal-custom-input" placeholder="Ej: Juan Pérez" value="${escapeHtml(item.nombre || '')}">
          <small style="color: #ef4444; margin-top: 4px; display: none;" id="error_nombre">El nombre es obligatorio.</small>
        </div>

        <div class="swal-field">
          <label>Cédula</label>
          <input id="swal_in_cedula" inputmode="numeric" pattern="[0-9-]*" class="swal-custom-input" placeholder="000-0000000-0" value="${escapeHtml(item.cedula || '')}">
          <small style="color: #ef4444; margin-top: 4px; display: none;" id="error_cedula">La cédula es obligatoria.</small>
        </div>
        <div class="swal-field">
          <label>Teléfono</label>
          <input id="swal_in_telefono" inputmode="numeric" pattern="[0-9-]*" class="swal-custom-input" placeholder="809-000-0000" value="${escapeHtml(item.telefono || '')}">
          <small style="color: #ef4444; margin-top: 4px; display: none;" id="error_telefono">El teléfono es obligatorio.</small>
        </div>

        <div class="swal-field">
          <label>Nº Casa</label>
          <input id="swal_in_N_casa" class="swal-custom-input" value="${escapeHtml(item.N_casa || '')}">
          <small style="color: #ef4444; margin-top: 4px; display: none;" id="error_N_casa">El Nº de Casa es obligatorio.</small>
        </div>
        <div class="swal-field">
          <label>Fecha Hospedaje</label>
          <input id="swal_in_fecha_osp" type="date" class="swal-custom-input" value="${formatDateForInput(item.fecha_ospedaje || '')}">
          <small style="color: #ef4444; margin-top: 4px; display: none;" id="error_fecha">La fecha de hospedaje es obligatoria.</small>
        </div>

        <div class="swal-field">
           <label>Ingreso Mensual</label>
           <input id="swal_in_ingreso" type="number" step="0.01" class="swal-custom-input" placeholder="0.00" value="${item.ingreso_mensual != null ? item.ingreso_mensual : ''}">
           <small style="color: #ef4444; margin-top: 4px; display: none;" id="error_ingreso">El ingreso mensual es obligatorio y debe ser ≥ 0.</small>
        </div>
        <div class="swal-field full-width">
          <label>Dirección Física</label>
          <input id="swal_in_direccion" class="swal-custom-input" placeholder="Calle, Sector..." value="${escapeHtml(item.direccion || '')}">
          <small style="color: #ef4444; margin-top: 4px; display: none;" id="error_direccion">La dirección es obligatoria.</small>
        </div>

        <div class="swal-field full-width">
          <label>Descripción / Notas</label>
          <textarea id="swal_in_desc" class="swal-custom-input swal-custom-textarea">${escapeHtml(item.descripcion || '')}</textarea>
        </div>
      </div>
    `;

    const { value: formValues } = await Swal.fire({
      title: '<span style="color:#065f46; font-weight:700;">Editar Inquilino</span>',
      html,
      width: '680px',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Guardar Cambios',
      cancelButtonText: 'Cancelar',
      didOpen: (modalEl) => {
        bindSanitizeInput(document.getElementById('swal_in_cedula'));
        bindSanitizeInput(document.getElementById('swal_in_telefono'));
      },
      preConfirm: async () => {
        const nombre = document.getElementById('swal_in_nombre')?.value.trim();
        const cedula_raw = document.getElementById('swal_in_cedula')?.value;
        const cedula = sanitizeIdPhone(cedula_raw);
        const N_casa_raw = document.getElementById('swal_in_N_casa')?.value.trim();
        const N_casa = N_casa_raw === '' ? undefined : N_casa_raw;
        const telefono_raw = document.getElementById('swal_in_telefono')?.value;
        const telefono = sanitizeIdPhone(telefono_raw);
        const direccion = document.getElementById('swal_in_direccion')?.value.trim();
        const ingreso_mensual_raw = document.getElementById('swal_in_ingreso')?.value;
        const ingreso_mensual = ingreso_mensual_raw !== '' ? parseFloat(ingreso_mensual_raw) : NaN;
        const fecha_ospedaje = document.getElementById('swal_in_fecha_osp')?.value || '';
        const descripcion = document.getElementById('swal_in_desc')?.value.trim();

        let hasError = false;
        const setValidationError = (id, message) => {
          const el = document.getElementById(id);
          if (el) { el.style.display = message ? 'block' : 'none'; el.textContent = message || ''; if (message) hasError = true; }
        };

        setValidationError('error_nombre', !nombre ? 'El nombre es obligatorio.' : null);
        setValidationError('error_cedula', !cedula ? 'La cédula es obligatoria.' : null);
        setValidationError('error_telefono', !telefono ? 'El teléfono es obligatorio.' : null);
        // Sólo requerimos Nº de casa si NO existía antes y tampoco se proporcionó ahora
        setValidationError('error_N_casa', (N_casa === undefined && !item.N_casa) ? 'El Nº de Casa es obligatorio.' : null);
        setValidationError('error_fecha', !fecha_ospedaje ? 'La fecha de hospedaje es obligatoria.' : null);
        setValidationError('error_direccion', !direccion ? 'La dirección es obligatoria.' : null);
        setValidationError('error_ingreso', (isNaN(ingreso_mensual) || ingreso_mensual < 0) ? 'El ingreso mensual es obligatorio y debe ser ≥ 0.' : null);

        if (hasError) return false;

        const dup = await cedulaExiste(cedula, item.id);
        if (dup) { Swal.showValidationMessage('⚠️ Cédula duplicada. Otra persona ya tiene esta cédula.'); return false; }

        // Retornamos N_casa sólo si se proporcionó (evita sobreescribirlo con cadena vacía)
        const out = { nombre, cedula, telefono, direccion, ingreso_mensual, fecha_ospedaje, descripcion };
        if (N_casa !== undefined) out.N_casa = N_casa;
        return out;
      }
    });

    if (!formValues) return;

    const updated = { ...item, ...formValues };

    // Preserve local endTime unless server returns one
    const localArr = readBoxesStorage();
    const localExisting = localArr.find(x => String(x.id) === String(updated.id));
    const localEndTime = localExisting ? localExisting.endTime : null;

    // Si el ingreso_mensual cambió respecto al original -> reiniciar cronómetro local
    const montoCambiado = (Number(formValues.ingreso_mensual) !== Number(item.ingreso_mensual));
    if (montoCambiado) {
      updated.endTime = Date.now() + DURATION_MS;
    }

    let serverOk = null;
    if (updated.id) {
      try {
        const toSend = Object.fromEntries(Object.entries(formValues).filter(([k,v]) => v !== undefined));
        const resp = await putToServer(`inquilinos/${encodeURIComponent(updated.id)}`, toSend);
        if (resp !== null) {
          serverOk = true;
          // si el servidor devolviera endTime (poco probable), lo usamos; si no, mantenemos local/reiniciado
          if (resp.endTime) updated.endTime = resp.endTime;
          else if (!updated.endTime) updated.endTime = localEndTime || (Date.now() + DURATION_MS);
          Object.assign(updated, resp);
        } else serverOk = false;
      } catch (e) { serverOk = false; console.warn('PUT error', e); }
    }

    // ensure updated has endTime (fallback)
    if (!updated.endTime) updated.endTime = localEndTime || (Date.now() + DURATION_MS);

    try {
      const arr = readBoxesStorage();
      const idx = arr.findIndex(x => String(x.id) === String(updated.id));
      if (idx !== -1) { arr[idx] = { ...arr[idx], ...updated }; writeBoxesStorage(arr); }
    } catch (e) { console.warn('Error updating local storage after edit', e); }

    updateBoxDom(updated);

    if (serverOk) {
      Swal.fire({ title: '¡Actualizado!', text: `Inquilino actualizado en servidor y localmente.${montoCambiado ? ' Se reinició el cronómetro por cambio de monto.' : ''}`, icon: 'success', confirmButtonColor: '#10b981' });
      try {
        if (window.notifications) {
          const runNotify = () => { if (typeof window.notifications.notifyInquilinoUpdated === 'function') window.notifications.notifyInquilinoUpdated(updated); };
          if (typeof window.notifications.requestPermission === 'function' && Notification && Notification.permission === 'default') {
            window.notifications.requestPermission().then(() => runNotify()).catch(() => runNotify());
          } else runNotify();
        }
      } catch(e) {}
    } else {
      Swal.fire({ title: 'Actualizado localmente', text: `No se pudo actualizar en el servidor. Los cambios se guardaron localmente.${montoCambiado ? ' Se reinició el cronómetro por cambio de monto.' : ''}`, icon: 'warning', confirmButtonColor: '#10b981' });
      try {
        if (window.notifications) {
          const runNotify = () => { if (typeof window.notifications.notifyInquilinoUpdated === 'function') window.notifications.notifyInquilinoUpdated(updated); };
          if (typeof window.notifications.requestPermission === 'function' && Notification && Notification.permission === 'default') {
            window.notifications.requestPermission().then(() => runNotify()).catch(() => runNotify());
          } else runNotify();
        }
      } catch(e) {}
    }
  }

  // ================= Migration: normalizar registros antiguos =================
  function migrateOldRecords() {
    const arr = readBoxesStorage() || [];
    let changed = false;
    arr.forEach(item => {
      if (!item) return;
      // ensure id
      if (!item.id) { item.id = genId(); changed = true; }
      // ingreso_mensual numeric
      if (item.ingreso_mensual == null || isNaN(Number(item.ingreso_mensual))) { item.ingreso_mensual = Number(item.ingreso_mensual) || 0; changed = true; }
      // montoPagado default 0
      if (item.montoPagado == null || isNaN(Number(item.montoPagado))) { item.montoPagado = Number(item.montoPagado) || 0; changed = true; }
      // normalize endTime
      const endNum = Number(item.endTime);
      if (!isFinite(endNum) || endNum <= 0) { item.endTime = Date.now() + DURATION_MS; changed = true; }
      // remove UI-only stale fields so tick() recalculates
      if (item.overdueSince) { delete item.overdueSince; changed = true; }
      if (item.pendienteInfo) { delete item.pendienteInfo; changed = true; }
      if (item.incompletoInfo) { delete item.incompletoInfo; changed = true; }
      if (item.status) { delete item.status; changed = true; }
      if (item._pagoConfirmado) { delete item._pagoConfirmado; changed = true; }
    });
    if (changed) {
      try { writeBoxesStorage(arr); } catch(e) { console.warn('migrateOldRecords: no se pudo escribir storage', e); }
    }
    return { changed, count: arr.length };
  }

  // ----------------- init: sync desde servidor si posible (preservando endTime local) -----------------
  (async function init() {
    // run migration for old records first
    try { const m = migrateOldRecords(); if (m && m.changed) console.info('migration: normalized', m.count, 'records'); } catch(e) { console.warn('migrateOldRecords failed', e); }
    // first attempt to process any pending delete queue (so we don't re-create items that should be deleted)
    try { await processDeleteQueue(); } catch(e){}

    const local = readBoxesStorage();
    // mapa id -> endTime local
    const localEndTimes = {};
    local.forEach(i => { if (i && i.id && i.endTime) localEndTimes[String(i.id)] = i.endTime; });

    // read trash ids to exclude from server sync
    const trashIds = readTrash().map(x => String(x.id));

    try {
      const srv = await fetchServerList('inquilinos');
      if (Array.isArray(srv)) {
        // filter out server items that are present in delete-queue or papelera (we don't want them to reappear)
        const deleteQueue = readDeleteQueue().map(x => String(x.id));
        const normalized = srv
          .filter(i => !deleteQueue.includes(String(i.id)) && !trashIds.includes(String(i.id)))
          .map(i => {
            const idStr = i.id != null ? String(i.id) : genId();
            // preserve local endTime if exists; else use server endTime; else fallback to now + DURATION_MS
            const endTime = i.endTime || localEndTimes[idStr] || (Date.now() + DURATION_MS);
            return {
              id: idStr,
              nombre: i.nombre || '',
              cedula: i.cedula || '',
              telefono: i.telefono || '',
              direccion: i.direccion || '',
              fecha_ospedaje: i.fecha_ospedaje || '',
              ingreso_mensual: (i.ingreso_mensual != null) ? Number(i.ingreso_mensual) : 0,
              descripcion: i.descripcion || '',
              N_casa: i.N_casa != null ? i.N_casa : (i.inmueble_N_casa || null),
              fecha_registro: i.fecha_registro || new Date().toISOString(),
              endTime: endTime
            };
        });
        writeBoxesStorage(normalized);
        boxesContainer.innerHTML = '';
        normalized.forEach(item => createBox(item));
        // after loading, try to process delete queue again
        await processDeleteQueue();
        return;
      }
    } catch (e) { console.warn('No se pudo sincronizar con servidor al iniciar', e); }

    const arr = readBoxesStorage();
    arr.forEach(item => {
      // ensure each item has endTime persisted
      if (!item.endTime) item.endTime = Date.now() + DURATION_MS;
      createBox(item);
    });

    // try processing delete queue at end of init as well
    try { await processDeleteQueue(); } catch(e){}
  })();

  // ---------------- save new inquilino (POST y guardado local) ----------------
  async function handleGuardarClick(e) {
    e && e.preventDefault();
    const nombre = (document.getElementById('nombre_inquilino')?.value || '').trim();
    const cedula_raw = document.getElementById('cedula_inquilino')?.value;
    const cedula = sanitizeIdPhone(cedula_raw);
    const telefono_raw = document.getElementById('telefono_inquilino')?.value;
    const telefono = sanitizeIdPhone(telefono_raw);
    const fecha_ospedaje = (document.getElementById('fecha_ospedaje')?.value || '').trim();
    const N_casa = (document.getElementById('nombre_casa_inquilino')?.value || '').trim();
    const direccion = (document.getElementById('direccion_fisica_inquilino')?.value || '').trim();
    const ingreso_mensual_raw = document.getElementById('ingreso_mensual')?.value;
    const ingreso_mensual = ingreso_mensual_raw !== '' ? parseFloat(ingreso_mensual_raw) : NaN;
    const descripcion = (document.getElementById('descripcion')?.value || '').trim();

    // ahora todos menos descripcion son obligatorios
    if (!nombre || !cedula || !telefono || !fecha_ospedaje || !N_casa || !direccion || isNaN(ingreso_mensual) || ingreso_mensual < 0) {
      Swal.fire('Faltan campos','Completa todos los campos obligatorios (nombre, cédula, teléfono, fecha hospedaje, Nº casa, dirección, ingreso mensual).','warning');
      return;
    }

    const existe = await cedulaExiste(cedula, null);
    if (existe) { Swal.fire({ icon:'warning', title:'Cédula duplicada', text:'Ya existe un inquilino con esa cédula.' }); return; }

    const now = new Date();
    // create local item with temporary id
    const item = { id: genId(), nombre, cedula, telefono, fecha_ospedaje, N_casa, direccion, ingreso_mensual, descripcion, fecha_registro: now.toISOString(), endTime: Date.now() + DURATION_MS };

    let serverResp = null;
    try {
      serverResp = await postToServer('inquilinos', {
        nombre: item.nombre, cedula: item.cedula, telefono: item.telefono,
        direccion: item.direccion, fecha_ospedaje: item.fecha_ospedaje, ingreso_mensual: item.ingreso_mensual, descripcion: item.descripcion, N_casa: item.N_casa
      });
      if (serverResp && serverResp.id) {
        // if server returns the record, use server id; preserve endTime if server doesn't provide one
        const serverId = String(serverResp.id);
        item.id = serverId;
        if (serverResp.endTime) item.endTime = serverResp.endTime;
        item.fecha_registro = serverResp.fecha_registro || item.fecha_registro;
        item.direccion = serverResp.direccion || item.direccion;
      }
    } catch (e) { console.warn('POST inquilino failed', e); }

    try { const arr = readBoxesStorage(); arr.unshift(item); writeBoxesStorage(arr); } catch(e){ console.warn(e); }
    createBox(item);
    // notificar que el inquilino fue agregado (si existe el módulo de notificaciones)
    try {
      if (window.notifications) {
        if (typeof window.notifications.requestPermission === 'function') {
          window.notifications.requestPermission().then(p => {
            if (p === 'granted') {
              if (typeof window.notifications.notifyInquilinoAdded === 'function') window.notifications.notifyInquilinoAdded(item);
            } else if (p === 'denied') {
              Swal.fire({ title: 'Notificaciones bloqueadas', text: 'Activa las notificaciones en la configuración del navegador para recibir alertas.', icon: 'info', confirmButtonColor: '#3085d6' });
            }
          }).catch(() => {
            if (typeof window.notifications.notifyInquilinoAdded === 'function') window.notifications.notifyInquilinoAdded(item);
          });
        } else if (typeof window.notifications.notifyInquilinoAdded === 'function') {
          window.notifications.notifyInquilinoAdded(item);
        }
      }
    } catch(e){}
    openDetailModal(item);
    if (form) form.reset();

    if (serverResp) Swal.fire({ title: 'Creado', text: 'Inquilino creado en servidor y guardado localmente.', icon: 'success', confirmButtonColor: '#10b981' });
    else Swal.fire({ title: 'Creado localmente', text: 'No se pudo crear en servidor; registro guardado localmente.', icon: 'warning', confirmButtonColor: '#10b981' });
  }

  if (btnGuardar) btnGuardar.addEventListener('click', handleGuardarClick);

  // Diagnóstico y reparación de cajas
  function diagnosticarCajas(fix = false) {
    const findings = [];
    const boxes = Array.from(document.querySelectorAll('.inquilino-box'));
    const stored = readBoxesStorage();
    let changed = false;

    boxes.forEach(box => {
      const id = box.dataset.id;
      const item = stored.find(x => String(x.id) === String(id));
      if (!item) {
        findings.push({ id, type: 'MISSING_STORAGE', message: 'Caja presente en DOM pero sin registro en storage', box });
        return;
      }

      // Check endTime validity
      const endNum = Number(item.endTime);
      if (!isFinite(endNum) || endNum <= 0) {
        findings.push({ id, type: 'INVALID_ENDTIME', message: `endTime inválido (${item.endTime})`, item });
        if (fix) { item.endTime = Date.now() + DURATION_MS; changed = true; }
      }

      // Check timer element
      const timerEl = box.querySelector('.timer');
      if (!timerEl) {
        findings.push({ id, type: 'MISSING_TIMER', message: 'Falta elemento .timer en la caja', box });
        // can't really fix DOM structure here
      } else {
        // Check for NaN or empty text
        const txt = timerEl.textContent || '';
        if (/NaN|undefined/.test(txt) || txt.trim() === '') {
          findings.push({ id, type: 'INVALID_TIMER_TEXT', message: `Texto de timer inválido: "${txt}"`, box, timer: timerEl });
          if (fix) {
            startBoxTimer(box, item);
            changed = true;
          }
        }
      }

      // Check panels duplication
      const pend = box.querySelectorAll('.status-pendiente');
      const inc = box.querySelectorAll('.status-incompleto');
      if (pend.length > 1) {
        findings.push({ id, type: 'DUPLICATE_PENDIENTE_PANEL', message: `Múltiples paneles pendiente (${pend.length})`, box, nodes: pend });
        if (fix) {
          pend.forEach((n, i) => { if (i > 0) n.remove(); }); changed = true;
        }
      }
      if (inc.length > 1) {
        findings.push({ id, type: 'DUPLICATE_INCOMPLETO_PANEL', message: `Múltiples paneles incompleto (${inc.length})`, box, nodes: inc });
        if (fix) { inc.forEach((n, i) => { if (i > 0) n.remove(); }); changed = true; }
      }

      // Check dataset status consistency
      const now = Date.now();
      const msLeft = now <= (Number(item.endTime) || 0) ? 1 : now - (Number(item.endTime) || 0);
      let expectedStatus = 'AL_DIA';
      if (now > item.endTime) {
        const pagado = Number(item.montoPagado || 0);
        if (pagado > 0 && pagado < (Number(item.ingreso_mensual) || 0)) expectedStatus = 'INCOMPLETO';
        else expectedStatus = 'PENDIENTE';
      }
      if (box.dataset.status !== expectedStatus) {
        findings.push({ id, type: 'STATUS_MISMATCH', message: `dataset.status="${box.dataset.status}" pero debería ser "${expectedStatus}"`, box, expected: expectedStatus, actual: box.dataset.status });
        if (fix) { box.dataset.status = expectedStatus; changed = true; }
      }

      // Check interval presence for running timers
      const isExpired = Date.now() > (Number(item.endTime) || 0);
      if (!isExpired && !box._interval) {
        findings.push({ id, type: 'MISSING_INTERVAL', message: 'Faltó intervalo de actualización en la caja (box._interval)', box });
        if (fix) { startBoxTimer(box, item); changed = true; }
      }
    });

    if (fix && changed) {
      try { writeBoxesStorage(stored); } catch(e) { console.warn('diagnosticarCajas: failed to write storage', e); }
      try { tick(); } catch(e) { /* ignore */ }
    }

    return findings;
  }

  // show quick diagnostic after load and offer to fix
  setTimeout(() => {
    try {
      const findings = diagnosticarCajas(false);
      if (findings && findings.length) {
        console.warn('Diagnóstico de cajas: ', findings);
        if (window.Swal) {
          Swal.fire({
            title: `Se detectaron ${findings.length} problemas en las cajas`,
            text: 'Revisa la consola para ver detalles. ¿Deseas intentar repararlos ahora?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Reparar ahora',
            cancelButtonText: 'Cerrar',
            confirmButtonColor: '#f59e0b'
          }).then(async (r) => {
            if (r.isConfirmed) {
              const fixed = diagnosticarCajas(true);
              console.info('Arreglos aplicados:', fixed);
              Swal.fire({ title: 'Reparación completa', text: 'Se intentaron corregir los problemas detectados. Revisa la consola para más detalles.', icon: 'success', timer: 1800, showConfirmButton: false });
            }
          });
        }
      }
    } catch(e) { console.warn('diagnosticarCajas setTimeout failed', e); }
  }, 1500);

  // expose small API
  window.inquilinosBoxesSwal = {
    getAll: () => readBoxesStorage(),
    open: (id) => { const list = readBoxesStorage(); const found = list.find(x => String(x.id) === String(id)); if (found) openDetailModal(found); },
    remove: removeBox,
    openPayment: openPaymentModal,
    processDeleteQueue, // expose for manual trigger if needed
    diagnosticar: diagnosticarCajas
  };

})();
