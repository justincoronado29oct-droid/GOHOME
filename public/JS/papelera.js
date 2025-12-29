/* ======================================================
   🗑️ PAPELERA LOCAL (Inquilinos / Inmuebles)
   ====================================================== */

const TRASH_KEY = 'papelera_items';

/* =========================
   Storage helpers
   ========================= */
function readTrash() {
  try {
    return JSON.parse(localStorage.getItem(TRASH_KEY)) || [];
  } catch (e) {
    console.warn('Error leyendo papelera', e);
    return [];
  }
}

function writeTrash(items) {
  localStorage.setItem(TRASH_KEY, JSON.stringify(items));
}

/* =========================
   Mover a papelera
   ========================= */
function moveToTrash(item) {
  if (!item || !item.id) return;

  const trash = readTrash();

  // evitar duplicados
  if (trash.some(x => String(x.id) === String(item.id))) return;

  trash.push({
    ...item,
    deletedAt: Date.now(),
    type: item.N_casa ? 'inquilino' : 'inmueble'
  });

  writeTrash(trash);
  console.log('🗑️ Movido a papelera:', item.id);
}

/* =========================
   Renderizar papelera
   ========================= */
function renderTrash() {
  const container = document.getElementById('papelera_lista');
  if (!container) return;

  const trash = readTrash();
  container.innerHTML = '';

  if (trash.length === 0) {
    container.innerHTML = `
      <div class="papelera_empty">
        <p>La papelera está vacía 🧹</p>
      </div>
    `;
    return;
  }

  trash.forEach(item => {
    const card = document.createElement('div');
    card.className = 'papelera_card';

    card.innerHTML = `
      <h3>${item.nombre || 'Sin nombre'}</h3>
      <p><strong>Tipo:</strong> ${item.type}</p>
      <p><strong>Eliminado:</strong> ${new Date(item.deletedAt).toLocaleDateString()}</p>

      <div class="papelera_actions">
        <button class="btn_restore">Restaurar</button>
        <button class="btn_delete">Eliminar</button>
      </div>
    `;

    card.querySelector('.btn_restore').addEventListener('click', () => {
      restoreItem(item.id);
    });

    card.querySelector('.btn_delete').addEventListener('click', () => {
      deleteForever(item.id);
    });

    container.appendChild(card);
  });
}

/* =========================
   Restaurar elemento
   ========================= */
function restoreItem(id) {
  let trash = readTrash();
  const item = trash.find(x => String(x.id) === String(id));
  if (!item) return;

  // quitar de papelera
  trash = trash.filter(x => String(x.id) !== String(id));
  writeTrash(trash);

  // volver a lista principal
  if (typeof readBoxesStorage === 'function' && typeof writeBoxesStorage === 'function') {
    const items = readBoxesStorage();
    items.push(item);
    writeBoxesStorage(items);
  }

  // volver a render principal
  if (typeof createBox === 'function') {
    createBox(item);
  }

  renderTrash();

  Swal.fire({
    icon: 'success',
    title: 'Restaurado',
    text: 'El elemento volvió a la lista principal',
    confirmButtonColor: '#10b981'
  });
}

/* =========================
   Eliminar definitivamente
   ========================= */
function deleteForever(id) {
  Swal.fire({
    title: 'Eliminar definitivamente',
    text: 'Esta acción no se puede deshacer',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#10b981',
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  }).then(result => {
    if (!result.isConfirmed) return;

    const trash = readTrash().filter(x => String(x.id) !== String(id));
    writeTrash(trash);
    renderTrash();
  });
}

/* =========================
   API GLOBAL (para removeBox)
   ========================= */
window.papelera = {
  moveToTrash,
  renderTrash,
  restoreItem,
  deleteForever
};

/* =========================
   Auto-render al entrar
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('papelera_lista')) {
    renderTrash();
  }
});
