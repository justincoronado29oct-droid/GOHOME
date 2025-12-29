// casas-select.js — versión mejorada: sincroniza updates y deletes
(function () {
  const DEFAULTS = { apiBase: (window.API_BASE || ''), preferServer: true, optionValueUseId: false, pollIntervalMs: 2000 };

  // --------------------- UTIL: enviarAlServer ---------------------
  // Versión robusta que devuelve JSON o { error: true, ... } en fallo
  const API_BASE = window.API_BASE || DEFAULTS.apiBase;
  async function enviarAlServer(endpoint, method = 'GET', datos = null) {
    const url = `${(API_BASE || DEFAULTS.apiBase).replace(/\/$/, '')}/${String(endpoint).replace(/^\/+/, '')}`;
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (datos !== null && method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD') opts.body = JSON.stringify(datos);
    try {
      const res = await fetch(url, opts);
      const txt = await res.text();
      let payload = null;
      try { payload = txt ? JSON.parse(txt) : null; } catch (e) { payload = txt; }
      if (!res.ok) {
        return { error: true, status: res.status, body: payload || txt || `HTTP ${res.status}` };
      }
      return payload;
    } catch (err) {
      console.warn('[enviarAlServer] error:', err && err.message ? err.message : err);
      return { error: true, message: err && err.message ? err.message : String(err) };
    }
  }

  // Exponer enviarAlServer si no existe (no sobrescribir)
  if (!window.enviarAlServer) window.enviarAlServer = enviarAlServer;

  // --------------------- Estado ---------------------
  const STATE = { cfg: { ...DEFAULTS } , lastLocalSnapshot: null };

  // helper: normaliza clave (N_casa / nombre)
  function _keyOf(i) {
    return String(i && (i.N_casa || i.nombre || '')).trim();
  }

  // --------------------- normalizador por defecto ---------------------
  function normalizeServerInmueble(raw) {
    if (!raw) return { N_casa: '', direccion: '' };
    const item = { ...raw };
    // manejar posibles nombres distintos en server: m_construccion vs m_contruccion etc.
    if (item.m_construccion === undefined && item.m_contruccion !== undefined) item.m_construccion = item.m_contruccion;
    // asegurar strings
    item.N_casa = item.N_casa !== undefined ? String(item.N_casa).trim() : (item.nombre ? String(item.nombre).trim() : '');
    item.direccion = (item.direccion || item.direccion_fisica || '').trim();
    return item;
  }

  // Exponer normalizeServerInmueble si no existe
  if (!window.normalizeServerInmueble) window.normalizeServerInmueble = normalizeServerInmueble;

  // helper fetch inmuebles (usa enviarAlServer si existe)
  async function _fetchInmuebles(apiBase) {
    // preferir enviarAlServer global si está
    if (typeof window.enviarAlServer === 'function') {
      try {
        const res = await window.enviarAlServer('inmuebles', 'GET');
        if (Array.isArray(res)) return res;
        if (res && res.error) return []; // fallo controlado
      } catch (e) { /* fallback */ }
    }
    try {
      const r = await fetch(`${(apiBase || API_BASE).replace(/\/$/, '')}/inmuebles`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('[casas-select] fetch inmuebles failed:', e && e.message ? e.message : e);
      return [];
    }
  }

  // normalizador (usa normalizeServerInmueble si existe)
  function _normalize(item) {
    if (typeof window.normalizeServerInmueble === 'function') {
      try { return window.normalizeServerInmueble(item); } catch (e) { /* ignore */ }
    }
    return {
      ...item,
      N_casa: item.N_casa !== undefined ? String(item.N_casa) : (item.nombre || ''),
      direccion: item.direccion || item.direccion_fisica || ''
    };
  }

  // Construye el valor que usa cada <option> según config
  function _optionValueOf(item, cfg) {
    return cfg.optionValueUseId && item.id !== undefined ? String(item.id) : String(item.N_casa || item.nombre || '').trim();
  }

  // ------------------ populateCasaSelect ------------------
  async function populateCasaSelect(opts = {}) {
    const cfg = { ...STATE.cfg, ...(opts || {}) };
    STATE.cfg = cfg; // persistir config si se pasó
    const select = document.getElementById('nombre_casa_inquilino');
    if (!select) return;

    // datos locales
    const localArr = (() => { try { return JSON.parse(localStorage.getItem('inmuebles')) || []; } catch (e) { return []; } })();

    // servidor
    const serverArrRaw = await _fetchInmuebles(cfg.apiBase);
    const serverArr = Array.isArray(serverArrRaw) ? serverArrRaw.map(_normalize) : [];

    // consolidar por clave (N_casa)
    const map = new Map();
    const push = (it, source = 'local') => {
      const key = _keyOf(it);
      if (!key) return;
      if (!map.has(key)) map.set(key, { ...it, _source: source });
      else if (cfg.preferServer && source === 'server') map.set(key, { ...it, _source: source });
    };

    if (cfg.preferServer) {
      localArr.forEach(i => push(_normalize(i), 'local'));
      serverArr.forEach(i => push(_normalize(i), 'server'));
    } else {
      serverArr.forEach(i => push(_normalize(i), 'server'));
      localArr.forEach(i => push(_normalize(i), 'local'));
    }

    const entries = Array.from(map.values()).sort((a, b) => {
      const A = _keyOf(a), B = _keyOf(b);
      return A.localeCompare(B, 'es', { numeric: true });
    });

    // reconstruir select — formatear texto como "Casa #<N> - <direccion>"
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Selecciona la casa --';
    placeholder.selected = true;
    placeholder.disabled = true;
    select.appendChild(placeholder);

    entries.forEach(item => {
      const opt = document.createElement('option');
      opt.value = _optionValueOf(item, cfg);
      // formato solicitado:
      const n = String(item.N_casa || item.nombre || '').trim();
      const dir = String(item.direccion || item.direccion_fisica || '').trim();
      opt.textContent = n ? `Casa #${n}${dir ? ' - ' + dir : ''}` : (opt.value || '');
      // guardar direccion en dataset para uso posterior
      opt.dataset.direccion = dir;
      if (item.id !== undefined) opt.dataset.id = String(item.id);
      select.appendChild(opt);
    });

    // actualizar snapshot para detectar cambios
    try { STATE.lastLocalSnapshot = JSON.stringify(localArr); } catch(e){ STATE.lastLocalSnapshot = null; }
  }

  // ------------------ attach listener ------------------
  function attachCasaSelectListener() {
    const select = document.getElementById('nombre_casa_inquilino');
    if (!select) return;

    select.addEventListener('change', async (e) => {
      const opt = e.target.options[e.target.selectedIndex];
      const direccionInput = document.getElementById('direccion_fisica_inquilino');
      if (!direccionInput) return;

      const direccion = opt?.dataset?.direccion || '';
      if (direccion) {
        direccionInput.value = direccion;
        // opcional: deshabilitar edición si viene desde inmueble
        direccionInput.setAttribute('disabled', 'disabled');
        return;
      }

      const val = String(opt?.value || '').trim();
      if (!val) {
        direccionInput.value = '';
        direccionInput.removeAttribute('disabled');
        return;
      }

      const local = (() => { try { return JSON.parse(localStorage.getItem('inmuebles')) || []; } catch (e) { return []; } })();
      const found = local.find(i => String(i.N_casa || i.nombre || '').trim().toLowerCase() === val.toLowerCase() || String(i.id || '').trim() === val);
      if (found) {
        const dirFound = found.direccion || found.direccion_fisica || '';
        direccionInput.value = dirFound;
        if (opt) opt.dataset.direccion = dirFound;
        direccionInput.setAttribute('disabled', 'disabled');
        return;
      }

      // fallback servidor
      try {
        const apiBase = (window.API_BASE || STATE.cfg.apiBase);
        const r = await fetch(`${apiBase.replace(/\/$/, '')}/inmuebles`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (r.ok) {
          const arr = await r.json();
          const f = arr.find(i => String(i.N_casa || i.nombre || '').trim().toLowerCase() === val.toLowerCase() || String(i.id || '').trim() === val);
          if (f) {
            const dir = f.direccion || f.direccion_fisica || '';
            direccionInput.value = dir;
            if (opt) opt.dataset.direccion = dir;
            direccionInput.setAttribute('disabled', 'disabled');
            return;
          }
        }
      } catch (e) { /* ignore */ }

      direccionInput.value = '';
      direccionInput.removeAttribute('disabled');
    });
  }

  // ------------------ actualizar una opción existente ------------------
  function updateCasaOption(item, opts = {}) {
    const cfg = { ...STATE.cfg, ...(opts || {}) };
    const select = document.getElementById('nombre_casa_inquilino');
    if (!select || !item) return false;

    const valueToFind = _optionValueOf(item, cfg);
    let opt = Array.from(select.options).find(o => o.value === valueToFind);
    if (!opt && item.id !== undefined) {
      opt = Array.from(select.options).find(o => o.dataset && o.dataset.id === String(item.id));
    }
    if (!opt) {
      const newOpt = document.createElement('option');
      newOpt.value = valueToFind;
      const n = String(item.N_casa || item.nombre || '').trim();
      const dir = String(item.direccion || item.direccion_fisica || '').trim();
      newOpt.textContent = n ? `Casa #${n}${dir ? ' - ' + dir : ''}` : valueToFind;
      newOpt.dataset.direccion = dir;
      if (item.id !== undefined) newOpt.dataset.id = String(item.id);
      select.appendChild(newOpt);
      return true;
    }

    const n = String(item.N_casa || item.nombre || '').trim();
    const dir = String(item.direccion || item.direccion_fisica || '').trim();
    opt.textContent = n ? `Casa #${n}${dir ? ' - ' + dir : ''}` : valueToFind;
    if (item.direccion !== undefined) opt.dataset.direccion = String(item.direccion).trim();
    if (item.id !== undefined) opt.dataset.id = String(item.id);
    const shouldUseId = cfg.optionValueUseId && item.id !== undefined;
    if (shouldUseId && opt.value !== String(item.id)) opt.value = String(item.id);
    return true;
  }

  // ------------------ eliminar opción por id o N_casa ------------------
  function removeCasaOptionByIdOrN(idOrN) {
    const select = document.getElementById('nombre_casa_inquilino');
    if (!select) return false;
    const v = String(idOrN || '').trim();
    if (!v) return false;
    const opts = Array.from(select.options);
    const target = opts.find(o => o.value === v || (o.dataset && (o.dataset.id === v || String(o.textContent || '').trim().toLowerCase() === v.toLowerCase())));
    if (!target) return false;
    target.remove();
    return true;
  }

  // ------------------ notificar cambios (llámalo desde tu flujo) ------------------
  async function notifyInmueblesChanged(changedItem = null) {
    if (changedItem) {
      const n = _normalize(changedItem);
      updateCasaOption(n);
      return;
    }
    await populateCasaSelect();
  }

  // ------------------ detecta cambios en localStorage (otros tabs) ------------------
  window.addEventListener('storage', (e) => {
    if (!e.key || e.key !== 'inmuebles') return;
    populateCasaSelect();
  });

  // ------------------ polling fallback (si nadie llama notify) ------------------
  (function startPolling() {
    try {
      STATE.lastLocalSnapshot = JSON.stringify(JSON.parse(localStorage.getItem('inmuebles') || '[]'));
    } catch (e) { STATE.lastLocalSnapshot = null; }
    setInterval(() => {
      try {
        const current = JSON.stringify(JSON.parse(localStorage.getItem('inmuebles') || '[]'));
        if (STATE.lastLocalSnapshot !== current) {
          STATE.lastLocalSnapshot = current;
          populateCasaSelect();
        }
      } catch (e) { /* ignore parse errors */ }
    }, STATE.cfg.pollIntervalMs);
  })();

  // ------------------ Exponer API global ------------------
  window.populateCasaSelect = populateCasaSelect;
  window.attachCasaSelectListener = attachCasaSelectListener;
  window.notifyInmueblesChanged = notifyInmueblesChanged;
  window.updateCasaOption = updateCasaOption;
  window.removeCasaOptionByIdOrN = removeCasaOptionByIdOrN;

  // auto-init
  function _tryAutoInit() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { populateCasaSelect(); attachCasaSelectListener(); });
    } else {
      populateCasaSelect(); attachCasaSelectListener();
    }
  }
  _tryAutoInit();

})();
