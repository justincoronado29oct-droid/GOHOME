// Helper global para llamadas al API
// Establece window.API_BASE en producción ('' para mismo origen) o en desarrollo (http://localhost:3001)
(function(){
  const defaultBase = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : '';
  // Si la app ya definió window.API_BASE (por ejemplo desde un script inline), respetarlo.
  window.API_BASE = (typeof window.API_BASE !== 'undefined') ? window.API_BASE : defaultBase;

  function normalizeBase(b){ return (b||'').replace(/\/+$|^\s+|\s+$/g,''); }
  function normalizePath(p){ return (p||'').replace(/^\/+/,''); }

  window.apiUrl = function(path){
    const b = normalizeBase(window.API_BASE);
    const p = normalizePath(path);
    return b ? `${b}/${p}` : `/${p}`;
  };

  window.apiFetch = function(path, opts){
    return fetch(window.apiUrl(path), opts);
  };
})();
