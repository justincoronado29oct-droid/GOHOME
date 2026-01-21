/* ======================================================
   🗑️ PAPELERA LOCAL (Inquilinos / Inmuebles)
   
   Mejoras implementadas:
   ✅ Detección automática de tipo (inquilino vs inmueble)
   ✅ Restauración a sección correcta según tipo
   ✅ UI mejorada con información detallada del elemento
   ✅ Diferenciación clara entre inquilinos e inmuebles en display
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
   Helpers para navegación
   ========================= */
function navigateToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) {
    console.warn(`Section ${sectionId} not found`);
    return false;
  }
  
  // Ocular todas las sections
  document.querySelectorAll('section').forEach(s => {
    s.style.display = 'none';
  });
  
  // Mostrar la sección
  section.style.display = 'block';
  
  // Scroll to top
  window.scrollTo(0, 0);
  
  console.log(`✅ Navegando a sección: ${sectionId}`);
  return true;
}

/* =========================
   Mover a papelera
   ========================= */
function moveToTrash(item) {
  if (!item || !item.id) return;

  const trash = readTrash();

  // evitar duplicados
  if (trash.some(x => String(x.id) === String(item.id))) return;

  // Determinar tipo basado en campos específicos
  // PRIORIDAD: Si tiene campos de inquilino (cedula, telefono, ingreso_mensual) es INQUILINO
  // Si NO tiene esos campos pero tiene N_casa+direccion/sector, es INMUEBLE
  // Por defecto: INQUILINO
  
  let itemType = 'inquilino'; // por defecto
  
  // Si tiene propiedades ESPECÍFICAS de inquilino, es inquilino
  if (item.cedula || item.telefono || item.ingreso_mensual) {
    itemType = 'inquilino';
  }
  // Si tiene propiedades de inmueble y NO tiene propiedades de inquilino, es inmueble
  else if (item.N_casa && (item.direccion || item.sector || item.m_terreno || item.m_construccion || item.m_contruccion)) {
    itemType = 'inmueble';
  }

  trash.push({
    ...item,
    deletedAt: Date.now(),
    type: itemType
  });

  writeTrash(trash);
  console.log('🗑️ Movido a papelera:', item.id, 'tipo:', itemType, 'item:', item);
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

    // Determinar tipo del elemento - LÓGICA CORRECTA
    // PRIORIDAD: Si tiene cedula/telefono/ingreso_mensual es INQUILINO
    // Si NO tiene esos pero tiene N_casa+direccion es INMUEBLE
    const isInquilinoDeleted = item.type === 'inquilino' || item.cedula || item.telefono || item.ingreso_mensual;
    const isInmuebleDeleted = !isInquilinoDeleted; // Si no es inquilino, es inmueble
    
    const typeLabel = isInquilinoDeleted ? '👤 Inquilino' : '🏠 Inmueble';
    const typeIcon = isInquilinoDeleted ? 'persona' : 'casa';

    // Información adicional según tipo
    let additionalInfo = '';
    if (isInquilinoDeleted) {
      additionalInfo = `
        ${item.cedula ? `<p><strong>Cédula:</strong> ${item.cedula}</p>` : ''}
        ${item.telefono ? `<p><strong>Teléfono:</strong> ${item.telefono}</p>` : ''}
        ${item.N_casa ? `<p><strong>Casa:</strong> ${item.N_casa}</p>` : ''}
      `;
    } else {
      additionalInfo = `
        ${item.N_casa ? `<p><strong>N° Casa:</strong> ${item.N_casa}</p>` : ''}
        ${item.direccion ? `<p><strong>Dirección:</strong> ${item.direccion}</p>` : ''}
        ${item.sector ? `<p><strong>Sector:</strong> ${item.sector}</p>` : ''}
      `;
    }

    card.innerHTML = `
      <div class="papelera_card_header">
        <h3>${typeIcon === 'persona' ? '👤' : '🏠'} ${item.nombre || 'Sin nombre'}</h3>
        <span class="papelera_type">${typeLabel}</span>
      </div>
      <p><strong>Eliminado:</strong> ${new Date(item.deletedAt).toLocaleDateString()}</p>
      ${additionalInfo}

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

  // Determinar tipo del elemento (inquilino o inmueble)
  // PRIORIDAD: Si tiene cedula/telefono/ingreso_mensual es INQUILINO
  // Si NO tiene esos pero tiene N_casa+direccion es INMUEBLE
  const isInquilinoDeleted = item.type === 'inquilino' || item.cedula || item.telefono || item.ingreso_mensual;
  const isInmuebleDeleted = !isInquilinoDeleted;

  // Si hay API disponible, intentar restaurar en servidor
  if (typeof window.apiFetch === 'function') {
    window.apiFetch(`papelera/${encodeURIComponent(id)}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      .then(async r => {
        if (!r.ok) throw new Error('server restore failed');
        const body = await r.json().catch(()=>null) || {};
        
        // quitar de papelera local
        const newTrash = readTrash().filter(x => String(x.id) !== String(id));
        writeTrash(newTrash);
        renderTrash();

        const restored = body.item || item;

        // Restaurar según tipo
        if (isInquilinoDeleted) {
          console.log('📦 Restaurando inquilino:', restored);
          // Restaurar inquilino a storage de inquilinos
          if (typeof window.boxesManager !== 'undefined' && typeof window.boxesManager.readBoxesStorage === 'function') {
            const arr = window.boxesManager.readBoxesStorage();
            arr.push(restored);
            window.boxesManager.writeBoxesStorage(arr);
            if (typeof window.boxesManager.createBox === 'function') {
              window.boxesManager.createBox(restored);
            }
          } else if (typeof readBoxesStorage === 'function' && typeof writeBoxesStorage === 'function') {
            const arr = readBoxesStorage();
            arr.push(restored);
            writeBoxesStorage(arr);
            if (typeof createBox === 'function') {
              createBox(restored);
            }
          }
        } else if (isInmuebleDeleted) {
          console.log('📦 Restaurando inmueble:', restored);
          // Restaurar inmueble a storage de inmuebles
          const inmueblesData = JSON.parse(localStorage.getItem('inmuebles') || '[]');
          inmueblesData.push(restored);
          localStorage.setItem('inmuebles', JSON.stringify(inmueblesData));
          
          // Renderizar el inmueble individual
          if (typeof window.renderSingleInmueble === 'function') {
            console.log('Renderizando inmueble individual...');
            window.renderSingleInmueble(restored);
          } else if (typeof window.cargarInmuebles === 'function') {
            console.log('Llamando cargarInmuebles...');
            window.cargarInmuebles();
          }
        }

        // Navegar a la sección correspondiente
        if (isInquilinoDeleted) {
          navigateToSection('INQUILINOS');
        } else if (isInmuebleDeleted) {
          navigateToSection('INMUEBLES');
        }

        Swal.fire({ icon: 'success', title: 'Restaurado', text: `${isInquilinoDeleted ? 'Inquilino' : 'Inmueble'} restaurado correctamente`, confirmButtonColor: '#10b981' });
      })
      .catch(() => {
        // fallback local
        trash = trash.filter(x => String(x.id) !== String(id));
        writeTrash(trash);

        // Restaurar según tipo
        if (isInquilinoDeleted) {
          console.log('📦 Restaurando inquilino (fallback):', item);
          if (typeof window.boxesManager !== 'undefined' && typeof window.boxesManager.readBoxesStorage === 'function') {
            const items = window.boxesManager.readBoxesStorage();
            items.push(item);
            window.boxesManager.writeBoxesStorage(items);
            if (typeof window.boxesManager.createBox === 'function') {
              window.boxesManager.createBox(item);
            }
          } else if (typeof readBoxesStorage === 'function' && typeof writeBoxesStorage === 'function') {
            const items = readBoxesStorage();
            items.push(item);
            writeBoxesStorage(items);
            if (typeof createBox === 'function') {
              createBox(item);
            }
          }
        } else if (isInmuebleDeleted) {
          console.log('📦 Restaurando inmueble (fallback):', item);
          const inmueblesData = JSON.parse(localStorage.getItem('inmuebles') || '[]');
          inmueblesData.push(item);
          localStorage.setItem('inmuebles', JSON.stringify(inmueblesData));
          
          // Renderizar el inmueble individual
          if (typeof window.renderSingleInmueble === 'function') {
            console.log('Renderizando inmueble individual (fallback)...');
            window.renderSingleInmueble(item);
          } else if (typeof window.cargarInmuebles === 'function') {
            console.log('Llamando cargarInmuebles (fallback)...');
            window.cargarInmuebles();
          }
        }

        // Navegar a la sección correspondiente
        if (isInquilinoDeleted) {
          navigateToSection('INQUILINOS');
        } else if (isInmuebleDeleted) {
          navigateToSection('INMUEBLES');
        }

        renderTrash();
        Swal.fire({ icon: 'success', title: 'Restaurado', text: `${isInquilinoDeleted ? 'Inquilino' : 'Inmueble'} restaurado localmente`, confirmButtonColor: '#10b981' });
      });
    return;
  }

  // sin servidor: restauración local
  // quitar de papelera
  trash = trash.filter(x => String(x.id) !== String(id));
  writeTrash(trash);

  // Restaurar según tipo
  if (isInquilinoDeleted) {
    console.log('📦 Restaurando inquilino (sin servidor):', item);
    // Restaurar inquilino a storage de inquilinos
    if (typeof window.boxesManager !== 'undefined' && typeof window.boxesManager.readBoxesStorage === 'function') {
      const items = window.boxesManager.readBoxesStorage();
      items.push(item);
      window.boxesManager.writeBoxesStorage(items);
      if (typeof window.boxesManager.createBox === 'function') {
        window.boxesManager.createBox(item);
      }
    } else if (typeof readBoxesStorage === 'function' && typeof writeBoxesStorage === 'function') {
      const items = readBoxesStorage();
      items.push(item);
      writeBoxesStorage(items);
      if (typeof createBox === 'function') {
        createBox(item);
      }
    }
  } else if (isInmuebleDeleted) {
    console.log('📦 Restaurando inmueble (sin servidor):', item);
    // Restaurar inmueble a storage de inmuebles
    const inmueblesData = JSON.parse(localStorage.getItem('inmuebles') || '[]');
    inmueblesData.push(item);
    localStorage.setItem('inmuebles', JSON.stringify(inmueblesData));
    
    // Renderizar el inmueble individual
    if (typeof window.renderSingleInmueble === 'function') {
      console.log('Renderizando inmueble individual (sin servidor)...');
      window.renderSingleInmueble(item);
    } else if (typeof window.cargarInmuebles === 'function') {
      console.log('Llamando cargarInmuebles (sin servidor)...');
      window.cargarInmuebles();
    }
  }

  renderTrash();

  // Navegar a la sección correspondiente
  if (isInquilinoDeleted) {
    navigateToSection('INQUILINOS');
  } else if (isInmuebleDeleted) {
    navigateToSection('INMUEBLES');
  }

  Swal.fire({ icon: 'success', title: 'Restaurado', text: `${isInquilinoDeleted ? 'Inquilino' : 'Inmueble'} restaurado a su sección`, confirmButtonColor: '#10b981' });
}

/* =========================
   Eliminar definitivamente
   ========================= */
function deleteForever(id) {
  const trash = readTrash();
  const item = trash.find(x => String(x.id) === String(id));
  
  // Usar la misma lógica de detección que en restoreItem
  // PRIORIDAD: Si tiene cedula/telefono/ingreso_mensual es INQUILINO
  const isInquilinoDeleted = item && (item.type === 'inquilino' || item.cedula || item.telefono || item.ingreso_mensual);
  const itemType = isInquilinoDeleted ? 'Inquilino' : 'Inmueble';
  
  Swal.fire({
    title: 'Eliminar definitivamente',
    text: `¿Estás seguro? Esta acción no se puede deshacer.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#10b981',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then(result => {
    if (!result.isConfirmed) return;
    // si hay API, solicitar eliminación definitiva en servidor
    if (typeof window.apiFetch === 'function') {
      window.apiFetch(`papelera/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })
        .then(async r => {
          if (!r.ok) throw new Error('server delete failed');
          // limpiar local
          const trash = readTrash().filter(x => String(x.id) !== String(id));
          writeTrash(trash);
          renderTrash();
          Swal.fire({ icon: 'success', title: 'Eliminado', text: `${itemType} eliminado definitivamente`, confirmButtonColor: '#ef4444' });
        })
        .catch(() => {
          const trash = readTrash().filter(x => String(x.id) !== String(id));
          writeTrash(trash);
          renderTrash();
          Swal.fire({ icon: 'success', title: 'Eliminado', text: `${itemType} eliminado localmente`, confirmButtonColor: '#ef4444' });
        });
      return;
    }

    const trash = readTrash().filter(x => String(x.id) !== String(id));
    writeTrash(trash);
    renderTrash();
    Swal.fire({ icon: 'success', title: 'Eliminado', text: `${itemType} eliminado de la papelera`, confirmButtonColor: '#ef4444' });
  });
}

/* =========================
   API GLOBAL (para removeBox)
   ========================= */
window.papelera = {
  moveToTrash,
  renderTrash,
  restoreItem,
  deleteForever,
  // Debug helpers
  getTrash: () => readTrash(),
  getTrashCount: () => readTrash().length,
  debugTrash: () => { console.log('🗑️ Papelera:', readTrash()); }
};

/* =========================
   Auto-render al entrar
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('papelera_lista')) {
    renderTrash();
  }
});
