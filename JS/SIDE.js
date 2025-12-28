// ================================
// 🧭 Navegación del Sidebar y Secciones (IIFE) — con funciones de despliegue añadidas
// ================================
(() => {
  const sectionMap = {
    hom: 'home',
    add_inqui: 'inquilinosCrudd',
    add_house: 'CRUDDinmu',
    inquilinos: 'INQUILINOS',
    inmuebles: 'INMUEBLES',
    papeleo: 'papeleo_section',
    p_pendientes: 'pagos_pendientes',
    p_incompletos: 'pagos_incompletos',
    papelera: 'papelera_section'
  };

  const possibleSections = Array.from(new Set([
    ...Object.values(sectionMap),
    'home', 'inquilinosCrudd', 'INQUILINOS', 'pagos_pendientes'
  ]));

  const getDomElements = () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleBtn');
    const sidebarLinks = document.querySelectorAll('.side_list a');
    const stageSections = possibleSections
      .map(id => document.getElementById(id))
      .filter(Boolean);
    if (!sidebar || sidebarLinks.length === 0) {
      console.error('Sidebar o enlaces no encontrados');
      return null;
    }
    return { sidebar, toggleBtn, sidebarLinks, stageSections };
  };

  let domElements = null;

  const hideAllSections = () => {
    if (!domElements) return;
    domElements.stageSections.forEach(sec => sec.style.display = 'none');
  };

  const clearActiveLinks = () => {
    if (!domElements) return;
    domElements.sidebarLinks.forEach(a => a.classList.remove('active'));
  };

  const normalizeSectionId = (id) => id.toLowerCase();

  const showSectionById = (sectionId) => {
    let target = document.getElementById(sectionId);
    if (!target) target = document.getElementById(normalizeSectionId(sectionId));
    if (!target) {
      console.warn(`Sección no encontrada: ${sectionId}`);
      return showSectionById('home');
    }
    hideAllSections();
    target.style.display = 'block';
    try { history.replaceState(null, '', `#${normalizeSectionId(sectionId)}`); } catch(e){}
  };

  const findSidebarLinkForSection = (sectionId) => {
    const normalizedId = normalizeSectionId(sectionId);
    return Array.from(domElements.sidebarLinks)
      .find(a => sectionMap[a.id] && normalizeSectionId(sectionMap[a.id]) === normalizedId);
  };

  const setupNavigation = () => {
    domElements.sidebarLinks.forEach(link => {
      link.addEventListener('click', (evt) => {
        evt.preventDefault();
        const targetSection = sectionMap[link.id];
        if (!targetSection) return;
        clearActiveLinks();
        link.classList.add('active');
        showSectionById(targetSection);
        // al navegar dejamos el sidebar desplegado
        if (window.sidebarControl && typeof window.sidebarControl.show === 'function') window.sidebarControl.show();
      });
    });
  };

  const setupInternalButtons = () => {
    const internalNavButtons = [
      { id: 'btn_crudd_inquilinos', target: 'inquilinosCrudd' },
      { id: 'btn_crudd_inmuebles', target: 'CRUDDinmu' },
      { id: 'btn_crudd_papeleo', target: 'papeleo_section' },
      { id: 'btn_crudd_pagos_incompletos', target: 'pagos_incompletos' },
      { id: 'btn_pagos_pendientes', target: 'pagos_pendientes' },
      { id: 'btn_generar_Contrat', target: 'inquilinosCrudd' }
    ];
    internalNavButtons.forEach(cfg => {
      const button = document.getElementById(cfg.id);
      if (!button) return;
      button.addEventListener('click', () => {
        clearActiveLinks();
        const sidebarLink = findSidebarLinkForSection(cfg.target);
        if (sidebarLink) sidebarLink.classList.add('active');
        showSectionById(cfg.target);
        if (window.sidebarControl && typeof window.sidebarControl.show === 'function') window.sidebarControl.show();
      });
    });
  };

  // ---------- Toggle & accesibilidad ----------
  const setupToggle = () => {
    const { sidebar, toggleBtn } = domElements;
    if (!toggleBtn) return;

    // asegurar existencia de ícono y atributos ARIA
    let icon = toggleBtn.querySelector('i');
    if (!icon) {
      icon = document.createElement('i');
      icon.className = 'bx bx-chevron-left';
      toggleBtn.appendChild(icon);
    }
    toggleBtn.setAttribute('role', 'button');

    const COLLAPSED_CLASS = 'collapsed';

    function isCollapsed() { return sidebar.classList.contains(COLLAPSED_CLASS); }
    function setAria(open) { toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); }

    function showSidebar() {
      sidebar.classList.remove(COLLAPSED_CLASS);
      icon.className = 'bx bx-chevron-left';
      setAria(true);
    }
    function hideSidebar() {
      sidebar.classList.add(COLLAPSED_CLASS);
      icon.className = 'bx bx-chevron-right';
      setAria(false);
    }
    function toggleSidebar() {
      if (isCollapsed()) showSidebar(); else hideSidebar();
    }

    // Exponer API mínima por si otros scripts la usan
    window.sidebarControl = {
      show: showSidebar,
      hide: hideSidebar,
      toggle: toggleSidebar,
      isCollapsed
    };

    // click del botón
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleSidebar();
    });

    // atajos de teclado: Esc cierra, Ctrl+B alterna
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !isCollapsed()) {
        hideSidebar();
      }
      if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        toggleSidebar();
      }
    });

    // iniciar aria según estado actual
    setAria(!isCollapsed());
  };

  const initFromHash = () => {
    const hash = location.hash.replace('#', '');
    const section = hash || 'home';
    showSectionById(section);
    clearActiveLinks();
    const activeLink = findSidebarLinkForSection(section);
    if (activeLink) activeLink.classList.add('active');
  };

  const setupHashChange = () => {
    window.addEventListener('hashchange', () => {
      const hash = location.hash.replace('#', '');
      if (hash) {
        showSectionById(hash);
        clearActiveLinks();
        const link = findSidebarLinkForSection(hash);
        if (link) link.classList.add('active');
      }
    });
  };

  const initDom = () => {
    domElements = getDomElements();
    if (!domElements) return false;
    setupNavigation();
    setupInternalButtons();
    setupToggle();
    initFromHash();
    return true;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDom);
  } else {
    initDom();
  }
  setupHashChange();

  // Debug
  window.__nav = { showSectionById, hideAllSections, initFromHash };
})();
