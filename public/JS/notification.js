(function(){
  // notifications module
  const STORAGE_KEY = 'inq_notif_near_due_v1'; // guarda endTime notificados: { id: endTime }
  const DEFAULT_CHECK_MS = 60 * 1000; // revisar cada minuto
  const ICON = '/IMG/casa-silueta-negra-sin-puerta.png';

  function _readNotified() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e){ return {}; }
  }
  function _writeNotified(obj) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch(e){}
  }

  function requestPermissionIfNeeded() {
    if (!('Notification' in window)) return Promise.resolve('denied');
    if (Notification.permission === 'granted') return Promise.resolve('granted');
    if (Notification.permission === 'denied') return Promise.resolve('denied');
    return Notification.requestPermission();
  }

  function sendNotification(title, body, tag = undefined, data = {}) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        const options = { body, icon: ICON, tag, data };
        // si hay service worker registrado, mejor usar showNotification
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
          navigator.serviceWorker.getRegistration().then(reg => {
            if (reg && reg.showNotification) {
              try { reg.showNotification(title, options); } catch(e){ new Notification(title, options); }
            } else {
              new Notification(title, options);
            }
          }).catch(() => { try { new Notification(title, options); } catch(e){} });
        } else {
          new Notification(title, options);
        }
      } catch(e) { console.warn('Notif error', e); }
    } else if (Notification.permission === 'default') {
      requestPermissionIfNeeded().then(p => { if (p === 'granted') sendNotification(title, body, tag, data); });
    }
  }

  function formatShort(item) {
    try { return `${item.nombre || item.N_casa || 'Ítem'}`; } catch(e){ return 'Ítem'; }
  }

  // pequeño helper visual en-page: Toast usando SweetAlert2 si está disponible
  function showToast(title, body, icon = 'success') {
    if (window.Swal && typeof window.Swal.fire === 'function') {
      try {
        window.Swal.fire({ toast: true, position: 'top-end', icon, title, text: body, showConfirmButton: false, timer: 4000, timerProgressBar: true });
      } catch(e) { console.log('Toast error', e); }
    } else {
      // fallback console
      console.log('[toast]', title, body);
    }
  }

  // revisa inquilinos y notifica los que entren en zona roja (<= RED_ZONE_MS && > 0)
  let _watchInterval = null;
  function startWatching({ checkMs = DEFAULT_CHECK_MS, redZoneMs = (window.RED_ZONE_MS || (24*60*60*1000)) } = {}) {
    stopWatching();
    // chequeo inmediato
    checkOnce(redZoneMs);
    _watchInterval = setInterval(() => checkOnce(redZoneMs), checkMs);
  }
  function stopWatching(){ if (_watchInterval) { clearInterval(_watchInterval); _watchInterval = null; } }

  function checkOnce(redZoneMs) {
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem('inquilinos_boxes_v1') || '[]'); } catch(e){ arr = []; }
    const notified = _readNotified();
    const now = Date.now();
    let changed = false;

    arr.forEach(item => {
      const idStr = String(item.id);
      const end = Number(item.endTime) || 0;
      const msLeft = end - now;
      if (msLeft > 0 && msLeft <= redZoneMs) {
        // si no notificado o notificado pero endTime cambió (nuevo endTime menor o diferente)
        if (!notified[idStr] || Number(notified[idStr]) !== end) {
          // notificar
          const title = '⚠️ Pago próximo';
          const body = `${formatShort(item)} tiene ${Math.ceil(msLeft/3600000)} hora(s) restantes. Genera el pago antes de que se venza.`;
          sendNotification(title, body, `near_due_${idStr}`, { id: idStr, type: 'near_due' });
          // mostrar toast in-page para asegurar visibilidad si la página está en uso
          showToast(title, body, 'warning');
          notified[idStr] = end;
          changed = true;
        }
      } else {
        // si antes estaba notificado pero ahora endTime está lejos (se pagó o se reinició), limpiar para permitir futuras notifs
        if (notified[idStr] && end > redZoneMs + now) {
          delete notified[idStr]; changed = true;
        }
        // si vencido, también eliminar etiqueta (no volver a notificar near due)
        if (notified[idStr] && msLeft <= 0) { delete notified[idStr]; changed = true; }
      }
    });

    if (changed) _writeNotified(notified);
  }

  // funciones públicas: ADD, UPDATE, DELETE
  function notifyInquilinoAdded(item) {
    const title = '✅ Inquilino agregado';
    const body = `${formatShort(item)} fue agregado con éxito.`;
    sendNotification(title, body, `inq_added_${item.id}`, { id: item.id, type: 'inq_added' });
    showToast(title, body, 'success');
  }
  function notifyInmuebleAdded(item) {
    const title = '✅ Inmueble agregado';
    const body = `Casa ${item.N_casa || ''} agregada con éxito.`;
    sendNotification(title, body, `inm_added_${item.N_casa || item.id}`, { id: item.id, N_casa: item.N_casa, type: 'inm_added' });
    showToast(title, body, 'success');
  }

  function notifyInquilinoUpdated(item) {
    const title = '✏️ Inquilino actualizado';
    const body = `${formatShort(item)} fue actualizado.`;
    sendNotification(title, body, `inq_upd_${item.id}`, { id: item.id, type: 'inq_updated' });
    showToast(title, body, 'success');
  }

  function notifyInquilinoDeleted(item) {
    const title = '🗑️ Inquilino eliminado';
    const body = `${formatShort(item)} fue eliminado.`;
    sendNotification(title, body, `inq_del_${item.id}`, { id: item.id, type: 'inq_deleted' });
    showToast(title, body, 'info');
  }

  function notifyInmuebleUpdated(item) {
    const title = '✏️ Inmueble actualizado';
    const body = `Casa ${item.N_casa || ''} fue actualizada.`;
    sendNotification(title, body, `inm_upd_${item.N_casa || item.id}`, { id: item.id, N_casa: item.N_casa, type: 'inm_updated' });
    showToast(title, body, 'success');
  }

  function notifyInmuebleDeleted(item) {
    const title = '🗑️ Inmueble eliminado';
    const body = `Casa ${item.N_casa || ''} fue movida a la papelera.`;
    sendNotification(title, body, `inm_del_${item.N_casa || item.id}`, { id: item.id, N_casa: item.N_casa, type: 'inm_deleted' });
    showToast(title, body, 'info');
  }
  function init(opts = {}) {
    // solicita permiso si nunca se definió la respuesta (para poder notificar aunque la página esté en background)
    // no forzamos el prompt en cada carga si el usuario ya denegó
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      // le pedimos permiso la primera vez, pero sin bloquear el resto del arranque
      requestPermissionIfNeeded().then(p => {
        // si concedió, arrancar watching
        if (p === 'granted') startWatching(opts);
      });
    } else if (Notification.permission === 'granted') {
      startWatching(opts);
    }

    // intentar registrar un Service Worker ligero (mejor para notificaciones desde registration)
    if ('serviceWorker' in navigator) {
      try {
        navigator.serviceWorker.register('/JS/sw.js').then(reg => {
          // ok
        }).catch(e => {
          // no crítico
          // console.warn('No se pudo registrar sw', e);
        });
      } catch(e){}
    }

    // escuchar cambios en localStorage para reaccionar a cambios hechos por otras pestañas
    window.addEventListener('storage', (e) => {
      if (e.key === 'inquilinos_boxes_v1') {
        // re-evaluar inmediatamente
        setTimeout(() => checkOnce(opts.redZoneMs || (window.RED_ZONE_MS || (24*60*60*1000))), 100);
      }
    });

    // intentar limpiar notificaciones antiguas periódicamente
    setInterval(() => { try { checkOnce(opts.redZoneMs || (window.RED_ZONE_MS || (24*60*60*1000))); } catch(e){} }, 10 * 60 * 1000);
  }

  function requestPermission() { return requestPermissionIfNeeded(); }
  // exponer en global
  window.notifications = {
    init,
    startWatching,
    stopWatching,
    notifyInquilinoAdded,
    notifyInmuebleAdded,
    notifyInquilinoUpdated,
    notifyInquilinoDeleted,
    notifyInmuebleUpdated,
    notifyInmuebleDeleted,
    requestPermission,
    _internal: { sendNotification }
  };

  // auto init al cargar el script (si DOM ya listo, init de todas formas)
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => { try { window.notifications.init(); } catch(e){} }, 300);
  } else {
    document.addEventListener('DOMContentLoaded', () => { try { window.notifications.init(); } catch(e){} });
  }
})();