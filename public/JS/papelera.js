// papelera.js
(() => {
  const TRASH_KEY = 'papelera_inquilinos';
  const TTL_DAYS = 20;
  const DAY = 24 * 60 * 60 * 1000;

  const read = () => JSON.parse(localStorage.getItem(TRASH_KEY) || '[]');
  const write = (arr) => localStorage.setItem(TRASH_KEY, JSON.stringify(arr));

  const moveToTrash = (item) => {
    if (!item || !item.id) return;

    const trash = read();
    if (trash.some(x => String(x.id) === String(item.id))) return;

    trash.push({
      ...item,
      eliminado_en: Date.now(),
      borrar_en: Date.now() + TTL_DAYS * DAY
    });

    write(trash);
    renderTrash();
  };

  const removeFromTrash = (id) => {
    write(read().filter(x => String(x.id) !== String(id)));
    renderTrash();
  };

  const restoreFromTrash = (id) => {
    const trash = read();
    const item = trash.find(x => String(x.id) === String(id));
    if (!item) return;

    // volver al storage principal
    const main = readBoxesStorage();
    main.push(item);
    writeBoxesStorage(main);

    removeFromTrash(id);
    location.hash = '#inquilinosCrudd';
  };

  const autoClean = () => {
    const now = Date.now();
    write(read().filter(x => x.borrar_en > now));
  };

  // 🔹 RENDER
  const renderTrash = () => {
    const container = document.getElementById('papelera_lista');
    if (!container) return;

    autoClean();
    const trash = read();
    container.innerHTML = '';

    if (!trash.length) {
      container.innerHTML = `<p style="opacity:.6">La papelera está vacía</p>`;
      return;
    }

    trash.forEach(item => {
      const div = document.createElement('div');
      div.className = 'papelera-item';
      div.innerHTML = `
        <div>
          <strong>${item.nombre || 'Sin nombre'}</strong>
          <div style="font-size:.8rem;opacity:.7">
            Se elimina definitivamente en 
            ${Math.ceil((item.borrar_en - Date.now()) / DAY)} días
          </div>
        </div>
        <div class="papelera-actions">
          <button class="restore">↩ Restaurar</button>
          <button class="delete">✖ Eliminar</button>
        </div>
      `;

      div.querySelector('.restore').onclick = () => restoreFromTrash(item.id);
      div.querySelector('.delete').onclick = () => {
        Swal.fire({
          title: 'Eliminar definitivamente',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#ef4444'
        }).then(r => r.isConfirmed && removeFromTrash(item.id));
      };

      container.appendChild(div);
    });
  };

  // API GLOBAL
  window.papelera = {
    moveToTrash,
    renderTrash
  };

  document.addEventListener('DOMContentLoaded', renderTrash);
})();
