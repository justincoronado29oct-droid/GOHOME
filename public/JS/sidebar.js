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
  const isOpen = sidebar.classList.contains('open');
  toggleBtn.setAttribute('role', 'button');
  toggleBtn.setAttribute('aria-expanded', isOpen.toString());

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;
  const themeLabel = themeToggleBtn ? themeToggleBtn.querySelector('span') : null;

  const setTheme = (mode) => {
    document.body.classList.toggle('theme-dark', mode === 'dark');
    document.body.classList.toggle('theme-light', mode === 'light');
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('aria-pressed', (mode === 'dark').toString());
      themeToggleBtn.setAttribute('aria-label', mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    }
    if (themeIcon) {
      themeIcon.className = 'bx ' + (mode === 'dark' ? 'bx-sun' : 'bx-moon');
    }
    if (themeLabel) {
      themeLabel.textContent = mode === 'dark' ? 'Modo claro' : 'Modo oscuro';
    }
    localStorage.setItem('gohome-theme', mode);
  };

  const storedTheme = localStorage.getItem('gohome-theme');
  const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : preferredTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const nextMode = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
      setTheme(nextMode);
    });
  }
});

 