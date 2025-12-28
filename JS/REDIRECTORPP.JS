/* pagos_pendientes.js — compatible con gohome_db_new */

(() => {
  const INQ_KEY = 'inquilinos_boxes_v1';
  const PENDING_KEY = 'pagos_pendientes_v1';
  const API_BASE = 'http://localhost:3001';

  // ---------------- helpers ----------------
  const read = k => {
    try { return JSON.parse(localStorage.getItem(k) || '[]'); }
    catch { return []; }
  };

  const write = (k,v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch(e){ console.warn('local write failed', e); }
  };

  const existsLocalPending = id =>
    read(PENDING_KEY).some(p => String(p.id_inquilino) === String(id));

  // ---------------- server ----------------
  async function moveToPendienteServer(id_inquilino, motivo = 'tiempo vencido') {
    try {
      const r = await fetch(`${API_BASE}/move_to_pendiente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_inquilino, motivo })
      });
      if (!r.ok) throw new Error('server error');
      return await r.json();
    } catch (e) {
      console.warn('❌ Error moviendo a pendiente (server)', e);
      return null;
    }
  }

  // ---------------- core ----------------
  async function registerPending(inq) {
    if (!inq?.id) return;
    if (existsLocalPending(inq.id)) return;

    // 1️⃣ servidor (FUENTE DE VERDAD)
    const serverResp = await moveToPendienteServer(inq.id);
    if (!serverResp?.moved) return;

    // 2️⃣ respaldo local
    const localPendings = read(PENDING_KEY);
    localPendings.unshift({
      id_inquilino: inq.id,
      nombre: inq.nombre,
      cedula: inq.cedula,
      direccion: inq.direccion,
      monto: inq.ingreso_mensual || 0,
      movedAt: Date.now(),
      source: 'timer_expired'
    });
    write(PENDING_KEY, localPendings);

    console.log(`⏳ Inquilino ${inq.nombre} movido a pagos_pendientes`);
  }

  // ---------------- monitor ----------------
  function checkExpiredTimers() {
    const inquilinos = read(INQ_KEY);
    const now = Date.now();

    inquilinos.forEach(inq => {
      if (inq.endTime && inq.endTime <= now) {
        registerPending(inq);
      }
    });
  }

  // cada segundo
  setInterval(checkExpiredTimers, 1000);

  // ---------------- API debug ----------------
  window.pagosPendientes = {
    forceCheck: checkExpiredTimers,
    local: () => read(PENDING_KEY)
  };
})();
