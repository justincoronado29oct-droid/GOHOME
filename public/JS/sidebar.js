 const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("toggleBtn");

 
  if (sidebar && toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      toggleBtn.innerHTML = sidebar.classList.contains("open")
        ? "<i class='bx bx-chevron-left'></i>"
        : "<i class='bx bx-chevron-right'></i>";
    });
  }


// ======================================================
  // 🔹 EVENTO TOGGLE DEL SIDEBAR
  // ======================================================
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggleBtn');

  if (!sidebar || !toggleBtn) {
    console.warn('Sidebar o toggleBtn no encontrado en el DOM.');
    return;
  }

  // asegurar que exista un <i> dentro del botón (usar el que ya tienes en el HTML)
  let icon = toggleBtn.querySelector('i');
  if (!icon) {
    icon = document.createElement('i');
    icon.className = 'bx bx-chevron-right';
    toggleBtn.appendChild(icon);
  }

  // Inicializar ARIA
  const isCollapsed = sidebar.classList.contains('collapsed');
  toggleBtn.setAttribute('role', 'button');
  toggleBtn.setAttribute('aria-expanded', (!isCollapsed).toString());

  // Manejar el click (alternamos la clase 'collapsed' en el sidebar)
  toggleBtn.addEventListener('click', () => {
    const collapsedNow = sidebar.classList.toggle('collapsed');

    // aria-expanded = true cuando el sidebar está abierto => !collapsedNow
    toggleBtn.setAttribute('aria-expanded', (!collapsedNow).toString());

    // actualizar solo la clase del icono (no tocar innerHTML)
    icon.className = 'bx ' + (collapsedNow ? 'bx-chevron-right' : 'bx-chevron-left');
  });
});



// ======================================================
// 🔹 CONTROL DE NAVEGACIÓN DE SECCIONES (SIDEBAR)
// ======================================================
(() => {
  const sectionMap = {
  hom: 'home',
  add_inqui: 'inquilinosCrudd',
  add_house: 'CRUDDinmu',
  inquilinos: 'INQUILINOS',
  inmuebles: 'INMUEBLES',
  papeleo: 'papeleo_section',
  papelera: 'papelera_section',
  p_pendientes: 'pagos_pendientes',
  p_incompletos: 'pagos_incompletos'
};


const possibleSections = Array.from(new Set([
  ...Object.values(sectionMap),
  'home',
  'inquilinosCrudd',
  'INQUILINOS',
  'INMUEBLES',
  'papeleo_section',
  'papelera_section'
]));


  const getDomElements = () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleBtn');
    const sidebarLinks = document.querySelectorAll('.side_list a');
    const stageSections = possibleSections.map(id => document.getElementById(id)).filter(Boolean);

    if (!sidebar || sidebarLinks.length === 0) return null;
    return { sidebar, toggleBtn, sidebarLinks, stageSections };
  };

  let dom = null;

  const hideAll = () => dom.stageSections.forEach(sec => sec.style.display = 'none');
  const clearActive = () => dom.sidebarLinks.forEach(a => a.classList.remove('active'));
  const normalize = id => id.toLowerCase();

  const showSectionById = (id) => {
    let section = document.getElementById(id) || document.getElementById(normalize(id));
    if (!section) return showSectionById('home');
    hideAll();
    section.style.display = 'block';
    history.replaceState(null, '', `#${normalize(id)}`);
  };

  const findLinkFor = (id) => {
    const normalized = normalize(id);
    return Array.from(dom.sidebarLinks).find(a => {
      const mapped = sectionMap[a.id];
      return mapped && normalize(mapped) === normalized;
    });
  };

  const setupNav = () => {
    dom.sidebarLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = sectionMap[link.id];
        if (!target) return;
        clearActive();
        link.classList.add('active');
        showSectionById(target);
      });
    });
  };

  const setupInternalButtons = () => {
    const buttons = [
      { id: 'btn_crudd_inquilinos', target: 'inquilinosCrudd' },
      { id: 'btn_crudd_inmuebles', target: 'CRUDDinmu' },
      { id: 'btn_ver_inquilinos', target: 'inquilinosCrudd' },
      { id: 'btn_ver_inmuebles', target: 'CRUDDinmu' },
      { id: 'papeleo', target: 'papeleo_section' },
      { id: 'btn_crudd_pagos_incompletos', target: 'pagos_incompletos' },
      { id: 'btn_pagos_pendientes', target: 'pagos_pendientes' },
      { id: 'papelera', target: 'papelera_section' }
    ];

    buttons.forEach(cfg => {
      const btn = document.getElementById(cfg.id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        clearActive();
        const link = findLinkFor(cfg.target);
        if (link) link.classList.add('active');
        showSectionById(cfg.target);
      });
    });
  };

  const setupToggle = () => {
    const { sidebar, toggleBtn } = dom;
    if (!toggleBtn) return;
    toggleBtn.setAttribute('role', 'button');
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const icon = toggleBtn.querySelector('i');
      if (icon) icon.classList.toggle('rotated');
      toggleBtn.setAttribute('aria-expanded', (!sidebar.classList.contains('collapsed')).toString());
    });
  };

  const initFromHash = () => {
    const hash = location.hash.replace('#', '');
    const initial = normalize(hash || 'home');
    showSectionById(initial);
    clearActive();
    const activeLink = findLinkFor(initial);
    if (activeLink) activeLink.classList.add('active');
  };

  const setupHashChange = () => {
    window.addEventListener('hashchange', () => {
      const hash = location.hash.replace('#', '');
      if (hash) {
        showSectionById(hash);
        clearActive();
        const link = findLinkFor(hash);
        if (link) link.classList.add('active');
      }
    });
  };

  const init = () => {
    dom = getDomElements();
    if (!dom) return;
    setupNav();
    setupInternalButtons();
    setupToggle();
    initFromHash();
    setupHashChange();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }  }) ()

 