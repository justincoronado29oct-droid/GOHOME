document.addEventListener('DOMContentLoaded', () => {
  const formInmuebles = document.querySelector('.ingresoInmu');

  // ======================================================
  // 🔹 NAVEGACIÓN ENTRE INPUTS CON ENTER (formulario inmuebles)
  // ======================================================
  if (formInmuebles) {
    const inputs = Array.from(formInmuebles.querySelectorAll('input, textarea, button[type="button"]'));
    inputs.forEach((input, index) => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const next = inputs[index + 1];
          if (next) next.focus();
        }
      });
    });
  }

  // ======================================================
  // 🔹 REFERENCIAS DEL DOM
  // ======================================================
  const btnAgregarInmu = document.getElementById('agregarInmu');
  const inputN_casa = document.getElementById('N_casa');
  const inputDireccion = document.getElementById('direccion');
  const inputSector = document.getElementById('sector');
  const inputMunicipio = document.getElementById('municipio');
  const inputM_contruccion = document.getElementById('m_contruccion');
  const inputM_terreno = document.getElementById('m_terreno');
  const inputDescripcion = document.getElementById('descript_inmuebles');
  const contenedorInmuebles = document.querySelector('.box_container_inmuebles');

  const API_BASE = (window.API_BASE || '') + '/inmuebles';

  // -----------------------------
  // Enviar petición genérica
  // -----------------------------
  async function enviarAlServidor({ url, method = 'GET', body = null, okStatus = [200, 201, 204], timeout = 10000, headers = {} } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        signal: controller.signal
      };
      if (body != null && !['GET', 'HEAD'].includes(method.toUpperCase())) opts.body = JSON.stringify(body);

      const res = await fetch(url, opts);
      clearTimeout(timer);

      const contentType = res.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) {
        try { data = await res.json(); } catch (e) { data = null; }
      } else {
        try { data = await res.text(); } catch (e) { data = null; }
      }

      if (!okStatus.includes(res.status)) return { ok: false, status: res.status, data };
      return { ok: true, status: res.status, data };
    } catch (error) {
      clearTimeout(timer);
      if (error.name === 'AbortError') return { ok: false, error: 'timeout', message: `La petición a ${url} excedió ${timeout} ms.` };
      return { ok: false, error };
    }
  }

  // -----------------------------
  // Helpers específicos para "inmuebles"
  // -----------------------------
  function _mapInmuebleClientToServer(inmueble) {
    // Corrige typo m_contruccion -> m_construccion (si aplica)
    const mapped = { ...inmueble };

    // Nota: aquí solo preservamos el campo; la lógica de servidor decide nombre real
    if (mapped.m_contruccion !== undefined) {
      mapped.m_construccion = mapped.m_contruccion;
      delete mapped.m_contruccion; // eliminar typo si estaba
    }

    // Asegurar campos esperados
    if (mapped.descripcion === undefined) mapped.descripcion = '';
    if (mapped.N_casa !== undefined) mapped.N_casa = String(mapped.N_casa).trim();
    if (mapped.direccion === undefined) mapped.direccion = '';
    if (mapped.sector === undefined) mapped.sector = '';
    if (mapped.municipio === undefined) mapped.municipio = '';

    return mapped;
  }

  // Normalizar respuesta del servidor a formato usado en cliente
  function normalizeServerInmueble(raw) {
    const item = { ...raw };
    // unificar m_construccion / m_contruccion a m_contruccion en cliente
    if (item.m_construccion !== undefined && item.m_construccion !== null) {
      item.m_contruccion = String(item.m_construccion);
    } else if (item.m_contruccion !== undefined && item.m_contruccion !== null) {
      item.m_contruccion = String(item.m_contruccion);
    } else {
      item.m_contruccion = item.m_contruccion || '';
    }
    if (item.N_casa !== undefined) item.N_casa = String(item.N_casa);
    return item;
  }

  // ================== LocalStorage helpers (REEMPLAZADAS: evitar duplicados) ==================
  // normalizar clave de búsqueda (trim + toLowerCase)
  function normKey(s) {
    return String(s || '').trim().toLowerCase();
  }

  // guardar sin duplicados por N_casa (reemplaza si existe)
  function guardarLocalStorage(inmueble) {
    const data = JSON.parse(localStorage.getItem('inmuebles')) || [];
    const key = normKey(inmueble.N_casa || inmueble.nombre);
    const idx = data.findIndex(i => normKey(i.N_casa || i.nombre) === key);
    if (idx !== -1) {
      // reemplazar manteniendo id si ya existe
      data[idx] = { ...data[idx], ...inmueble };
    } else {
      data.push(inmueble);
    }
    localStorage.setItem('inmuebles', JSON.stringify(data));
  }

  function setLocalStorageAll(arr) {
    localStorage.setItem('inmuebles', JSON.stringify(arr));
  }

  // actualizar por id o por N_casa (busca por id primero, si no por N_casa)
  function actualizarLocalStorageById(idOrNCasa, nuevosDatos = {}) {
    let data = JSON.parse(localStorage.getItem('inmuebles')) || [];
    // intentar por id
    let idx = data.findIndex(i => i.id !== undefined && String(i.id) === String(idOrNCasa));
    // si no por N_casa (normalizado)
    if (idx === -1) {
      const key = normKey(idOrNCasa);
      idx = data.findIndex(i => normKey(i.N_casa || i.nombre) === key);
    }
    // si aún no, intentar por nuevosDatos.N_casa (si cambió el nombre)
    if (idx === -1 && nuevosDatos.N_casa) {
      const key2 = normKey(nuevosDatos.N_casa);
      idx = data.findIndex(i => normKey(i.N_casa || i.nombre) === key2);
    }

    if (idx !== -1) {
      data[idx] = { ...data[idx], ...nuevosDatos };
    } else {
      // si no existía, añadir (evitamos duplicados con misma N_casa)
      const keyNew = normKey(nuevosDatos.N_casa || nuevosDatos.nombre || idOrNCasa);
      const exists = data.some(i => normKey(i.N_casa || i.nombre) === keyNew);
      if (!exists) data.push({ ...nuevosDatos, id: nuevosDatos.id || undefined });
    }

    localStorage.setItem('inmuebles', JSON.stringify(data));
  }

  // (opcional) actualizarLocalStorage delega en la nueva función
  function actualizarLocalStorage(N_casa, nuevosDatos) {
    actualizarLocalStorageById(N_casa, nuevosDatos);
  }

  // eliminar por N_casa normalizado
  function eliminarDeLocalStorage(N_casa) {
    let data = JSON.parse(localStorage.getItem('inmuebles')) || [];
    data = data.filter(i => normKey(i.N_casa || i.nombre) !== normKey(N_casa));
    localStorage.setItem('inmuebles', JSON.stringify(data));
  }

  function moverAPapeleraLocal(inmueble) {
    // Asegurar que el inmueble tenga un ID
    const itemToDelete = { ...inmueble };
    if (!itemToDelete.id) {
      itemToDelete.id = `inmu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Usar la función global moveToTrash de papelera.js
    if (typeof window.papelera !== 'undefined' && typeof window.papelera.moveToTrash === 'function') {
      window.papelera.moveToTrash(itemToDelete);
    } else {
      // Fallback si papelera.js no está disponible
      const trash = JSON.parse(localStorage.getItem('papelera_items') || '[]');
      trash.push({
        ...itemToDelete,
        deletedAt: Date.now(),
        type: 'inmueble'
      });
      localStorage.setItem('papelera_items', JSON.stringify(trash));
    }
  }

  // ================== Visual: crear caja ==================
  function crearCajaInmueble(data) {
    const item = { ...data }; // copia
    const inmuebleBox = document.createElement('div');
    inmuebleBox.classList.add('inmuebleBox');
    inmuebleBox.innerHTML = `
      <img src="/IMG/casa-silueta-negra-sin-puerta.png" alt="casa" class="box_icon_inmu">
      <div class="textoI_inmu">
        <h4 class="N_inmueble">Casa #${item.N_casa}</h4>
        <span class="direccion_inmu">${item.direccion}</span>
        <span class="sector_inmu">Sector: ${item.sector}</span>
        <span class="municipio_inmu">Municipio: ${item.municipio}</span>
        <p class="descripcion_inmu">${item.descripcion || ''}</p>
      </div>
      <button class="btn_ver_mas_inmu">Ver más</button>
    `;

    inmuebleBox.querySelector('.btn_ver_mas_inmu').addEventListener('click', () => {
      Swal.fire({
        title: `🏠 Casa #${item.N_casa}`,
        html: `
          <div style="text-align:left;">
            <p><strong>Dirección:</strong> ${item.direccion}</p>
            <p><strong>Sector:</strong> ${item.sector}</p>
            <p><strong>Municipio:</strong> ${item.municipio}</p>
            <p><strong>M. construcción:</strong> ${item.m_contruccion || ''}</p>
            <p><strong>M. terreno:</strong> ${item.m_terreno || ''}</p>
            <p><strong>Descripción:</strong><br>${item.descripcion || ''}</p>
          </div>
        `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '📝 Editar',
        denyButtonText: '🗑️ Eliminar',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#3085d6',
        denyButtonColor: '#d33',
      }).then(async (result) => {
        // EDITAR
        if (result.isConfirmed) {
          const { value: formValues } = await Swal.fire({
            title: 'Editar inmueble',
            html: `
              <input id="editN" class="swal2-input" value="${item.N_casa}" placeholder="Número de casa">
              <input id="editDireccion" class="swal2-input" value="${item.direccion}" placeholder="Dirección">
              <input id="editSector" class="swal2-input" value="${item.sector}" placeholder="Sector">
              <input id="editMunicipio" class="swal2-input" value="${item.municipio}" placeholder="Municipio">
              <input id="editConstruccion" class="swal2-input" value="${item.m_contruccion || ''}" placeholder="M. construcción">
              <input id="editTerreno" class="swal2-input" value="${item.m_terreno || ''}" placeholder="M. terreno">
              <textarea id="editDescripcion" class="swal2-textarea" placeholder="Descripción">${item.descripcion || ''}</textarea>
            `,
            focusConfirm: false,
            preConfirm: () => {
              return {
                N_casa: document.getElementById('editN').value,
                direccion: document.getElementById('editDireccion').value,
                sector: document.getElementById('editSector').value,
                municipio: document.getElementById('editMunicipio').value,
                m_contruccion: document.getElementById('editConstruccion').value,
                m_terreno: document.getElementById('editTerreno').value,
                descripcion: document.getElementById('editDescripcion').value,
              };
            },
          });

          if (formValues) {
            // Actualizar en localStorage
            actualizarLocalStorage(item.N_casa, formValues);

            // Actualizar en servidor: preferir id, si no buscar id por N_casa
            try {
              if (item.id) {
                // usa id
                await enviarAlServidor({ url: `${API_BASE}/${encodeURIComponent(item.id)}`, method: 'PUT', body: _mapInmuebleClientToServer(formValues), okStatus: [200, 204] });
                actualizarLocalStorageById(item.id, formValues);
              } else {
                // buscar id en servidor por N_casa
                const listRes = await enviarAlServidor({ url: API_BASE, method: 'GET' });
                if (listRes.ok && Array.isArray(listRes.data)) {
                  const found = listRes.data.find(i => String(i.N_casa) === String(item.N_casa));
                  if (found && found.id) {
                    await enviarAlServidor({ url: `${API_BASE}/${encodeURIComponent(found.id)}`, method: 'PUT', body: _mapInmuebleClientToServer(formValues), okStatus: [200, 204] });
                    actualizarLocalStorageById(found.id, formValues);
                  } else {
                    // no se encontró: intentar crear nuevo registro en servidor con los datos actualizados
                    const createRes = await enviarAlServidor({ url: API_BASE, method: 'POST', body: _mapInmuebleClientToServer({ ...formValues, N_casa: item.N_casa }), okStatus: [200, 201] });
                    if (createRes.ok && createRes.data) {
                      // actualizar local con id si vino
                      if (createRes.data.id) actualizarLocalStorageById(createRes.data.id, createRes.data);
                    }
                  }
                }
              }
            } catch (e) {
              console.warn('⚠️ No se pudo conectar al servidor, pero el cambio se guardó localmente.');
            }

            Swal.fire('Actualizado', 'El inmueble fue editado con éxito.', 'success');
            try {
              if (window.notifications) {
                const runNotify = () => { if (typeof window.notifications.notifyInmuebleUpdated === 'function') window.notifications.notifyInmuebleUpdated(formValues || item); };
                if (typeof window.notifications.requestPermission === 'function' && Notification && Notification.permission === 'default') {
                  window.notifications.requestPermission().then(() => runNotify()).catch(() => runNotify());
                } else runNotify();
              }
            } catch(e) {}
            contenedorInmuebles.innerHTML = '';
            cargarInmuebles();
          }
        }

        // ELIMINAR
        else if (result.isDenied) {
          Swal.fire({
            title: '¿Eliminar este inmueble?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33',
          }).then(async (res) => {
            if (res.isConfirmed) {
              moverAPapeleraLocal(item); // mover local
              eliminarDeLocalStorage(item.N_casa);

              // intentar eliminar en servidor (por id o por búsqueda por N_casa)
              try {
                if (item.id) {
                  await enviarAlServidor({ url: `${API_BASE}/${encodeURIComponent(item.id)}`, method: 'DELETE', okStatus: [200, 204] });
                } else {
                  const listRes = await enviarAlServidor({ url: API_BASE, method: 'GET' });
                  if (listRes.ok && Array.isArray(listRes.data)) {
                    const found = listRes.data.find(i => String(i.N_casa) === String(item.N_casa));
                    if (found && found.id) {
                      await enviarAlServidor({ url: `${API_BASE}/${encodeURIComponent(found.id)}`, method: 'DELETE', okStatus: [200, 204] });
                    }
                  }
                }
              } catch (e) {
                console.warn('⚠️ No se pudo conectar al servidor; el inmueble se movió a la papelera local.');
              }

              inmuebleBox.remove();
              Swal.fire('Eliminado', 'El inmueble fue movido a la papelera.', 'success');
              try {
                if (window.notifications) {
                  const runNotify = () => { if (typeof window.notifications.notifyInmuebleDeleted === 'function') window.notifications.notifyInmuebleDeleted(item); };
                  if (typeof window.notifications.requestPermission === 'function' && Notification && Notification.permission === 'default') {
                    window.notifications.requestPermission().then(() => runNotify()).catch(() => runNotify());
                  } else runNotify();
                }
              } catch(e) {}
            }
          });
        }
      });
    });

    contenedorInmuebles.appendChild(inmuebleBox);
  }

  // ======================================================
  // 🔹 CARGAR INMUEBLES (LocalStorage + Servidor) - REEMPLAZADA
  // ======================================================
  async function cargarInmuebles() {
    contenedorInmuebles.innerHTML = '';

    // 1) cargar desde servidor (si posible)
    let serverData = [];
    try {
      const res = await enviarAlServidor({ url: API_BASE, method: 'GET' });
      if (res.ok && Array.isArray(res.data)) {
        serverData = res.data.map(normalizeServerInmueble);
      }
    } catch (err) {
      console.warn('⚠️ No se pudo conectar al servidor para obtener inmuebles.', err);
    }

    // 2) cargar desde localStorage
    const localData = JSON.parse(localStorage.getItem('inmuebles')) || [];

    // 3) fusionar por clave normalizada, preferir server
    const map = new Map();
    const pushToMap = (i, source = 'local') => {
      const key = normKey(i.N_casa || i.nombre);
      if (!key) return;
      if (!map.has(key)) map.set(key, { ...i, _source: source });
      else if (source === 'server') map.set(key, { ...i, _source: source }); // servidor sobrescribe
    };

    localData.forEach(i => pushToMap(i, 'local'));
    serverData.forEach(i => pushToMap(i, 'server'));

    const finalList = Array.from(map.values()).map(i => {
      const copy = { ...i };
      delete copy._source;
      return copy;
    });

    // renderizar
    contenedorInmuebles.innerHTML = '';
    finalList.forEach(crearCajaInmueble);

    // sincronizar localStorage con la lista final
    setLocalStorageAll(finalList);
  }

  // ======================================================
  // 🔹 AGREGAR NUEVO INMUEBLE
  // ======================================================
  btnAgregarInmu.addEventListener('click', async (e) => {
    e.preventDefault();

    const nuevoInmueble = {
      N_casa: inputN_casa.value.trim(),
      direccion: inputDireccion.value.trim(),
      sector: inputSector.value.trim(),
      municipio: inputMunicipio.value.trim(),
      m_contruccion: inputM_contruccion.value.trim(),
      m_terreno: inputM_terreno.value.trim(),
      descripcion: inputDescripcion.value.trim(),
    };

    if (Object.values(nuevoInmueble).some(v => v === '')) {
      Swal.fire('Campos incompletos', 'Por favor completa todos los campos.', 'warning');
      return;
    }

    // Guardar localmente primero (optimistic UI) — ahora reemplaza si ya existe
    guardarLocalStorage(nuevoInmueble);
    crearCajaInmueble(nuevoInmueble);

    // Intentar crear en servidor y si retorna el registro creado, actualizar localStorage con el id real
    try {
      const res = await enviarAlServidor({ url: API_BASE, method: 'POST', body: _mapInmuebleClientToServer(nuevoInmueble), okStatus: [200, 201] });
      if (res.ok && res.data) {
        // Si el servidor devuelve el registro creado (con id), actualizar localStorage
        const created = Array.isArray(res.data) ? res.data[0] : res.data;
        if (created && created.id) {
          // Reemplazar la entrada local (buscar por N_casa)
          let data = JSON.parse(localStorage.getItem('inmuebles')) || [];
          const idx = data.findIndex(i => String(i.N_casa) === String(created.N_casa));
          if (idx !== -1) {
            data[idx] = { ...data[idx], ...created };
            localStorage.setItem('inmuebles', JSON.stringify(data));
          } else {
            // si no existe, añadir
            data.push(created);
            localStorage.setItem('inmuebles', JSON.stringify(data));
          }
        }
      } else {
        console.warn('⚠️ El servidor respondió con error al crear inmueble:', res);
      }
    } catch (err) {
      console.warn('⚠️ No se pudo conectar al servidor, pero se guardó localmente.');
    }

    Swal.fire('Inmueble agregado', 'Guardado con éxito.', 'success');
    try {
      const toNotify = (typeof created !== 'undefined' && created) ? created : nuevoInmueble;
      if (window.notifications) {
        if (typeof window.notifications.requestPermission === 'function') {
          window.notifications.requestPermission().then(p => {
            if (p === 'granted') {
              if (typeof window.notifications.notifyInmuebleAdded === 'function') window.notifications.notifyInmuebleAdded(toNotify);
            } else if (p === 'denied') {
              Swal.fire({ title: 'Notificaciones bloqueadas', text: 'Activa las notificaciones en la configuración del navegador para recibir alertas.', icon: 'info', confirmButtonColor: '#3085d6' });
            }
          }).catch(() => {
            if (typeof window.notifications.notifyInmuebleAdded === 'function') window.notifications.notifyInmuebleAdded(toNotify);
          });
        } else if (typeof window.notifications.notifyInmuebleAdded === 'function') {
          window.notifications.notifyInmuebleAdded(toNotify);
        }
      }
    } catch(e){}
    [inputN_casa, inputDireccion, inputSector, inputMunicipio, inputM_contruccion, inputM_terreno, inputDescripcion].forEach(i => i.value = '');
    // refrescar vista y select de casas si existe esa función global
    if (typeof cargarInmuebles === 'function') await cargarInmuebles();
    if (typeof populateCasaSelect === 'function') populateCasaSelect();
  });

  // ======================================================
  // 🔹 INICIAR
  // ======================================================
  cargarInmuebles();
  
  // ======================================================
  // 🔹 EXPONER GLOBALMENTE (para papelera)
  // ======================================================
  window.cargarInmuebles = cargarInmuebles;
  
  // Función para renderizar un solo inmueble (para papelera - restauración)
  window.renderSingleInmueble = function(inmueble) {
    const item = { ...inmueble };
    crearCajaInmueble(item);
  };
});
