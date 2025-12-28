/* inquilinos-search.js
   Independiente — detecta cajas .inquilino-box y añade filtrado/resaltado.
   Inclúyelo después de los scripts que crean las cajas (o en head; se espera DOMContentLoaded).
*/
(function(){

  // ================== CONFIG ==================
  const SEARCH_INPUT_ID = 'inquilinoSearchInput'; // tu input ya existe en el HTML
  const DEBOUNCE_MS = 160;

  // ================== UTIL ==================
  function _normalize(s) { return String(s || '').toLowerCase().trim(); }
  function escapeRegex(s){ return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // inyectar estilos mínimos
  function injectStyles(){
    if (document.getElementById('inquilinos-search-styles')) return;
    const style = document.createElement('style');
    style.id = 'inquilinos-search-styles';
    style.textContent = `
      .inquilino-hidden { display: none !important; opacity: .0; height: 0 !important; margin: 0 !important; padding: 0 !important; transition: none !important; }
      .inquilino-match { box-shadow: 0 6px 18px rgba(2,6,23,0.06); transform: translateY(-2px); transition: all .18s ease; }
      .match-token { background: linear-gradient(90deg, rgba(255,241,204,0.65), rgba(255,249,215,0.45)); padding: 0 2px; border-radius: 3px; }
    `;
    document.head.appendChild(style);
  }

  // debounce
  function debounce(fn, wait){
    let t;
    return function(...a){
      clearTimeout(t);
      t = setTimeout(()=> fn.apply(this,a), wait);
    };
  }

  // ================== SCAN Y NORMALIZACIÓN DE CAJAS ==================
  // Extrae texto buscable de una caja y lo pone en dataset para búsquedas rápidas.
  function indexBox(box){
    if (!box || !box.classList) return;
    // evitar re-indexado si ya tiene marca
    if (box.dataset._indexed === '1') return;
    // campos buscables: intenta leer elementos comunes de tu estructura
    const nameEl = box.querySelector('.name');
    const metaEl = box.querySelector('.meta');
    const timerEl = box.querySelector('.timer');
    const descEl = box.querySelector('textarea, .descripcion, .desc') || box.querySelector('.descripcion') || null;

    const nombre = nameEl ? nameEl.innerText : (box.dataset.nombre || '');
    // meta suele contener casa y fecha; intentamos extraer "🏠 N_casa" si existe
    let N_casa = '';
    if (metaEl) {
      // quitar emojis y fechas, tomar primera parte similar a "🏠 12" o "Casa 12"
      N_casa = metaEl.innerText.replace(/[\u{1F300}-\u{1F6FF}]/gu,'').split(/\s{2,}|\n|·|•|,/)[0] || '';
    } else {
      N_casa = box.dataset.N_casa || box.dataset.n_casa || '';
    }

    // cédula, teléfono, direccion y descripción: si existen como texto dentro de la caja, intentamos encontrarlos
    // Buscar texto 'Cedula' o 'Cédula' dentro de box (en modales estos campos podrían no estar; aquí buscaremos en dataset ya existentes o en texto)
    let cedula = box.dataset.cedula || '';
    let telefono = box.dataset.telefono || '';
    let direccion = box.dataset.direccion || '';
    let descripcion = descEl ? (descEl.innerText || descEl.value || '') : (box.dataset.descripcion || '');

    // fallback: buscar números largos que parezcan cédula dentro del texto
    const fullText = box.innerText || '';
    if (!cedula){
      const cedMatch = fullText.match(/\d{3}-\d{7}-\d/); // patrón típico RD 000-0000000-0
      if (cedMatch) cedula = cedMatch[0];
    }
    if (!telefono){
      const telMatch = fullText.match(/(?:\+?\d{1,3})?[\s-]?\d{3}[-\s]?\d{3}[-\s]?\d{4}/);
      if (telMatch) telefono = telMatch[0];
    }

    // guardar en dataset (normalizado)
    box.dataset.nombre = _normalize(nombre);
    box.dataset.cedula = _normalize(cedula);
    box.dataset.n_casa = _normalize(N_casa);
    box.dataset.direccion = _normalize(direccion);
    box.dataset.telefono = _normalize(telefono);
    box.dataset.descripcion = _normalize(descripcion);

    // mantener copia original del nombre (para poder restaurar highlights)
    if (nameEl && !nameEl.dataset.originalName) {
      nameEl.dataset.originalName = nameEl.innerHTML;
    }

    box.dataset._indexed = '1';
  }

  // indexar todas las cajas existentes
  function indexAllBoxes(){
    const boxes = Array.from(document.querySelectorAll('.inquilino-box'));
    boxes.forEach(indexBox);
  }

  // observar DOM para cajas nuevas y aplicar indexación automáticamente
  function observeBoxes(){
    const container = document.querySelector('.box_container') || document.body;
    const mo = new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.addedNodes && m.addedNodes.length){
          m.addedNodes.forEach(node => {
            if (!(node instanceof HTMLElement)) return;
            if (node.classList && node.classList.contains('inquilino-box')) {
              indexBox(node);
            } else {
              // si añadieron un fragmento que contiene cajas
              const inner = node.querySelectorAll && node.querySelectorAll('.inquilino-box');
              if (inner && inner.length) inner.forEach(indexBox);
            }
          });
        }
      });
    });
    mo.observe(container, { childList: true, subtree: true });
  }

  // ================== FILTRADO ==================
  function _resetHighlight(box){
    const nameEl = box.querySelector('.name');
    if (nameEl && nameEl.dataset && nameEl.dataset.originalName) {
      nameEl.innerHTML = nameEl.dataset.originalName;
    }
    box.classList.remove('inquilino-match');
  }

  function doFilterRaw(term){
    const q = _normalize(term || '');
    const tokens = q.split(/\s+/).filter(Boolean);
    const boxes = Array.from(document.querySelectorAll('.inquilino-box'));

    if (!q) {
      boxes.forEach(b => {
        b.classList.remove('inquilino-hidden');
        _resetHighlight(b);
      });
      return;
    }

    boxes.forEach(box => {
      // asegurar indexado
      indexBox(box);

      // compilar campos a buscar
      const hay = [
        box.dataset.nombre || '',
        box.dataset.cedula || '',
        box.dataset.n_casa || '',
        box.dataset.direccion || '',
        box.dataset.telefono || '',
        box.dataset.descripcion || ''
      ].join(' ');

      const ok = tokens.every(tok => hay.indexOf(tok) !== -1);

      if (ok) {
        box.classList.remove('inquilino-hidden');
        box.classList.add('inquilino-match');

        // resaltar tokens en el nombre (de forma segura)
        const nameEl = box.querySelector('.name');
        if (nameEl) {
          if (!nameEl.dataset.originalName) nameEl.dataset.originalName = nameEl.innerHTML;
          let original = nameEl.dataset.originalName;
          // usaremos innerText de la original para reemplazar, pero mantendremos HTML base
          // Para simplicidad hacemos reemplazo sobre texto plano y escapamos tokens en regex
          let text = original;
          tokens.forEach(tok => {
            if (!tok) return;
            try {
              const re = new RegExp(escapeRegex(tok), 'ig');
              text = text.replace(re, match => `<span class="match-token">${match}</span>`);
            } catch(e){}
          });
          nameEl.innerHTML = text;
        }

      } else {
        box.classList.add('inquilino-hidden');
        _resetHighlight(box);
      }
    });
  }

  const debouncedFilter = debounce(doFilterRaw, DEBOUNCE_MS);

  // ================== INICIALIZACIÓN Y EXPOSICIÓN ==================
  function init(){
    injectStyles();
    indexAllBoxes();
    observeBoxes();

    // conectar al input si existe
    const input = document.getElementById(SEARCH_INPUT_ID);
    if (input) {
      // si el HTML ya tiene oninput="filterInquilinos()" no pasa nada: también exponemos window.filterInquilinos
      input.removeAttribute('oninput'); // evitar dobles llamadas si prefieres (opcional)
      input.addEventListener('input', (e) => {
        debouncedFilter(e.target.value || '');
      });
    }

    // Exponer funciones globales por compatibilidad con tu HTML inline
    window.filterInquilinos = function(){
      const i = document.getElementById(SEARCH_INPUT_ID);
      const v = i ? i.value : '';
      debouncedFilter(v);
    };
    window.clearInquilinoSearch = function(){
      const i = document.getElementById(SEARCH_INPUT_ID);
      if (i) i.value = '';
      doFilterRaw('');
    };

    // Si ya había texto en el input al cargar, ejecutar filtro
    setTimeout(() => {
      const i = document.getElementById(SEARCH_INPUT_ID);
      if (i && i.value) debouncedFilter(i.value);
    }, 50);
  }

  // arrancar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // exportar (opcional) - pequeña API
  window.__InquilinosSearch = {
    reindexAll: indexAllBoxes,
    doFilter: doFilterRaw
  };

})();
