// --- funciones para restaurar automáticamente cuando el pago es el correcto ---
(function(){
  const INTEREST_RATE = 0.05; // 5% por día
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const PENDING_KEY = 'pagos_pendientes_v1';
  const INQ_KEY = 'inquilinos_boxes_v1';

  function safeParse(k){ try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch(e){ return []; } }
  function safeWrite(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){ console.warn('localStorage write failed', e); } }

  // calcula intereses simples por días completos desde movedAt (timestamp ms)
  function calcInterest(deudaOriginal, movedAt){
    const moved = Number(movedAt) || Date.now();
    const elapsedMs = Date.now() - moved;
    const days = Math.floor(elapsedMs / MS_PER_DAY);
    if (days <= 0) return 0;
    const interest = (deudaOriginal * INTEREST_RATE) * days;
    return Math.round(interest * 100) / 100;
  }

  // obtiene total actual esperado para un objeto pending (usa deudaOriginal y movedAt)
  function expectedTotalForPending(pending){
    const deuda = Number(pending.deudaOriginal != null ? pending.deudaOriginal : (pending.monto != null ? pending.monto : 0)) || 0;
    const interest = calcInterest(deuda, pending.movedAt || pending.movedAt === 0 ? pending.movedAt : Date.now());
    return Math.round((deuda + interest) * 100) / 100;
  }

  // eliminamos el elemento DOM de pendientes si existe (busca por data-id / .pp-card)
  function removePendingCardFromDOM(id){
    try {
      const selector = `.pp-card[data-id="${String(id)}"]`;
      const el = document.querySelector(selector) || document.querySelector(`#pagos_pendientes .pp-card[data-id="${String(id)}"]`);
      if (el) el.remove();
      // también intentar borrar en la lista de pagos_incompletos/pagos_pendientes visuales si usan otra estructura
      const other = document.querySelector(`.pp_pendings_list .pp-card[data-id="${String(id)}"]`);
      if (other) other.remove();
    } catch(e){ /* ignore */ }
  }

  // Restaurar localmente el inquilino y reiniciar cronómetro a EXACTAMENTE 30 segundos
  function restoreLocalInquilino(pending){
    if (!pending || !pending.id) return null;
    const inqList = safeParse(INQ_KEY);
    const newItem = { ...(pending || {}) };
    // normalizar campos esperados por el listado principal
    newItem.id = pending.id;
    newItem.nombre = pending.nombre || pending.inq_nombre || pending.nombre || 'Sin nombre';
    newItem.cedula = pending.cedula || pending.inq_cedula || '';
    newItem.telefono = pending.telefono || pending.inq_telefono || '';
    newItem.direccion = pending.direccion || pending.inq_direccion || '';
    newItem.N_casa = pending.N_casa || pending.N_casa || pending.N_casa || '';
    newItem.descripcion = pending.descripcion || pending.descripcion || '';
    // endTime exactamente 30 segundos desde ahora
    newItem.endTime = Date.now() + (30 * 1000);
    // fecha_registro si no existe
    if (!newItem.fecha_registro) newItem.fecha_registro = new Date().toISOString();
    // remover campos de pendiente
    delete newItem.movedAt; delete newItem.pendingReason; delete newItem.deudaOriginal; delete newItem.monto;

    // añadir al inicio (evitar duplicados)
    const existsIdx = inqList.findIndex(x => String(x.id) === String(newItem.id));
    if (existsIdx !== -1) inqList.splice(existsIdx, 1);
    inqList.unshift(newItem);
    safeWrite(INQ_KEY, inqList);

    // insertar DOM
    try {
      if (typeof window.addInquilinoToDOM === 'function') {
        window.addInquilinoToDOM(newItem);
      }
    } catch(e){ console.warn('restoreLocalInquilino: error addInquilinoToDOM', e); }

    // notificar cambios
    try { window.dispatchEvent(new Event('storage')); } catch(e){}

    return newItem;
  }

  // API pública: intenta restaurar si paidAmount == expected total (tolerancia 0.01)
  window.restoreOnFullPayment = async function(pendingId, paidAmount){
    const pendings = safeParse(PENDING_KEY);
    const idx = pendings.findIndex(p => String(p.id) === String(pendingId));
    if (idx === -1) {
      if (window.Swal) await Swal.fire({ title:'Error', text:'Registro pendiente no encontrado.', icon:'error', confirmButtonColor:'#ef4444' });
      else alert('Registro pendiente no encontrado.');
      return false;
    }
    const pending = pendings[idx];
    const expected = expectedTotalForPending(pending);
    const diff = Math.abs(Number(paidAmount) - Number(expected));
    if (diff > 0.01) {
      // monto no coincide => informar
      if (window.Swal) {
        await Swal.fire({
          title: 'Monto no coincide',
          html: `El monto pagado <strong>${paidAmount}</strong> no corresponde a la deuda total esperada <strong>${expected}</strong>.`,
          icon: 'warning',
          confirmButtonColor: '#f59e0b'
        });
      } else {
        alert(`Monto no coincide. Esperado: ${expected}, recibido: ${paidAmount}`);
      }
      return false;
    }

    // monto correcto -> eliminar del listado de pendientes (local) y del DOM, restaurar a inquilinos
    try {
      pendings.splice(idx,1);
      safeWrite(PENDING_KEY, pendings);
    } catch(e){ console.warn('restoreOnFullPayment: error updating pendings', e); }

    removePendingCardFromDOM(pendingId);
    const restored = restoreLocalInquilino(pending);

    if (window.Swal) {
      await Swal.fire({
        title: 'Pago confirmado',
        html: `✅ Se registró el pago total de <strong>${Number(paidAmount).toFixed(2)}</strong>.<br>El inquilino fue restaurado y su cronómetro reiniciado a <strong>30 segundos</strong>.`,
        icon: 'success',
        confirmButtonColor: '#10b981'
      });
    } else {
      alert(`Pago confirmado: ${paidAmount}. Inquilino restaurado con cronómetro reiniciado a 30s.`);
    }
    // devolver objeto restaurado por si el llamador lo necesita
    return restored;
  };

  // helper: si quieres restaurar pasando el objeto pending completo
  window.restoreOnFullPaymentByItem = async function(pendingItem, paidAmount){
    if (!pendingItem || !pendingItem.id) return false;
    return window.restoreOnFullPayment(String(pendingItem.id), Number(paidAmount));
  };
// --- funciones para restaurar automáticamente cuando el pago es el correcto ---
(function(){
  const INTEREST_RATE = 0.05;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const PENDING_KEY = 'pagos_pendientes_v1';
  const INQ_KEY = 'inquilinos_boxes_v1';

  function safeParse(k){ try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch(e){ return []; } }
  function safeWrite(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){ console.warn('localStorage write failed', e); } }

  function calcInterest(deudaOriginal, movedAt){
    const moved = Number(movedAt) || Date.now();
    const days = Math.floor((Date.now() - moved) / MS_PER_DAY);
    return days > 0 ? Math.round((deudaOriginal * INTEREST_RATE * days) * 100) / 100 : 0;
  }

  function expectedTotalForPending(p){
    const deuda = Number(p.deudaOriginal ?? p.monto ?? 0);
    return Math.round((deuda + calcInterest(deuda, p.movedAt)) * 100) / 100;
  }

  function removePendingCardFromDOM(id){
    document.querySelectorAll(`.pp-card[data-id="${id}"]`).forEach(e => e.remove());
  }

  // 🔹 NUEVA FUNCIÓN → inserta en #INQUILINOS
  function addInquilinoToINQUILINOS_DOM(inq){
    const container = document.querySelector('#INQUILINOS .box_container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'inquilino-box';
    div.dataset.id = inq.id;

    div.innerHTML = `
      <div class="inquilino-card">
        <h3>${inq.nombre}</h3>
        <p><strong>Casa:</strong> ${inq.N_casa || '-'}</p>
        <p><strong>Dirección:</strong> ${inq.direccion || '-'}</p>
        <p><strong>Cédula:</strong> ${inq.cedula || '-'}</p>
        <p><strong>Tel:</strong> ${inq.telefono || '-'}</p>
        <small>⏱ 30s activos</small>
      </div>
    `;

    container.prepend(div);
  }

  function restoreLocalInquilino(p){
    if (!p?.id) return null;

    const list = safeParse(INQ_KEY);
    const inq = {
      id: p.id,
      nombre: p.nombre || 'Sin nombre',
      cedula: p.cedula || '',
      telefono: p.telefono || '',
      direccion: p.direccion || '',
      N_casa: p.N_casa || '',
      descripcion: p.descripcion || '',
      endTime: Date.now() + 30000,
      fecha_registro: new Date().toISOString()
    };

    const i = list.findIndex(x => String(x.id) === String(inq.id));
    if (i !== -1) list.splice(i,1);
    list.unshift(inq);
    safeWrite(INQ_KEY, list);

    // 🔹 INSERTAR EN TU HTML
    addInquilinoToINQUILINOS_DOM(inq);

    window.dispatchEvent(new Event('storage'));
    return inq;
  }

  // 🔹 API pública
  window.restoreOnFullPayment = async function(id, paid){
    const pendings = safeParse(PENDING_KEY);
    const idx = pendings.findIndex(p => String(p.id) === String(id));
    if (idx === -1) return false;

    const pending = pendings[idx];
    const expected = expectedTotalForPending(pending);

    if (Math.abs(paid - expected) > 0.01){
      Swal?.fire({
        title:'Monto incorrecto',
        text:`Esperado ${expected}`,
        icon:'warning'
      });
      return false;
    }

    pendings.splice(idx,1);
    safeWrite(PENDING_KEY, pendings);
    removePendingCardFromDOM(id);

    const restored = restoreLocalInquilino(pending);

    Swal?.fire({
      title:'Pago confirmado',
      text:'Inquilino restaurado (30s)',
      icon:'success'
    });

    return restored;
  };

})();

})();
