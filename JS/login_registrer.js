  // Manejadores globales para capturar errores JS y promesas no manejadas
window.addEventListener('error', (ev) => {
  try {
    console.error('[GlobalError]', ev.error || ev.message || ev);
    if (typeof swal === 'function') swal('Error de JS', String(ev.error || ev.message || ev).slice(0,250), 'error');
  } catch (e) { console.error('error mostrando swal', e); }
});
window.addEventListener('unhandledrejection', (ev) => {
  try {
    console.error('[UnhandledRejection]', ev.reason || ev);
    if (typeof swal === 'function') swal('Error de promesa', String(ev.reason || ev).slice(0,250), 'error');
  } catch (e) { console.error('error mostrando swal', e); }
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('login_registrer.js cargado y DOM listo');
  try {
  // === FUNCIONES ===
    // === Función genérica para enviar datos al backend ===
 async function sendToServer(endpoint, data) {
  try {
    showLoading();
    const res = await fetch(`http://localhost:3001/${endpoint}`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data)
    });

    // Si el backend devuelve 4xx/5xx, parsea el JSON si lo hay y devuélvelo como error
    let body;
    try {
      body = await res.json();
    } catch (e) {
      body = null;
    }

    if (!res.ok) {
      // res.status 401, 400, 500...
      return { ok: false, message: (body && body.message) ? body.message : `Error ${res.status}` , status: res.status, raw: body };
    }

    // éxito HTTP 2xx -> body esperado
    return { ...(body || {}), status: res.status, raw: body }; // body debería contener { ok: true, ... } según tu API

  } catch (err) {
    console.error('sendToServer error:', err);
    return { ok: false, message: "No se pudo conectar al servidor" };
  } finally {
    hideLoading();
  }
}


  // === Login ===
 async function login() {
  const user = document.getElementById('N')?.value || '';
  const password = document.getElementById('C')?.value || '';

  if(!user && !password){
    swal("ERROR","Nombre de usuario y contraseña vacía","error");
    return;
  }
  if(!user){
    swal("ERROR","Nombre de usuario vacío","error");
    return;
  }
  if(!password){
    swal("ERROR","Contraseña vacía","error");
    return;
  }

  // enviar
  const response = await sendToServer("login", { usuario: user, password });

  // LOG para depuración — quita en producción
  console.log('Respuesta /login ->', response);

  // Validación estricta: solo redirigir si response.ok === true (boolean)
  if (response && response.ok === true && response.user) {
    // guardar usuario localmente para mostrar perfil
    saveCurrentUser(response.user);
    renderProfile();
    swal("¡Excelente!", response.message || `Bienvenido ${user}`, "success").then(() => {
      window.location.href = "index.html";
    });
  } else {
    // Aquí mostramos detalle para que puedas ver por qué falla
    const msg = response && response.message ? response.message : 'Usuario o contraseña incorrectos';
    swal("ERROR", msg, "error");
  }
}


  // === Helpers para perfil/estado de sesión ===
  function saveCurrentUser(user) {
    try { localStorage.setItem('currentUser', JSON.stringify(user)); } catch(e){ console.warn('No se pudo guardar usuario en localStorage', e); }
  }
  function getCurrentUser(){
    try { return JSON.parse(localStorage.getItem('currentUser')||'null'); } catch(e){ return null; }
  }
  function clearCurrentUser(){ localStorage.removeItem('currentUser'); }

  function renderProfile() {
    const container = document.getElementById('userProfile');
    const user = getCurrentUser();
    if (!container) return;
    if (!user) {
      container.innerHTML = `
        <div class="anon">
          <a href="#" id="loginLink" class="sidebar-login">Iniciar sesión / Registrarse</a>
        </div>
      `;
      const link = document.getElementById('loginLink'); if (link) link.addEventListener('click', (e)=>{ e.preventDefault(); window.location.href = '/HTML/LOGIN_REGISTRER.HTML'; });
      return;
    }

    // compact sidebar profile (render inside <li>)
    container.innerHTML = `
      <div class="sidebar-profile">
        <div class="avatar" id="profileAvatarSidebar" aria-hidden="true">${(user.nombre||user.N_usuario||'')[0]?.toUpperCase()||'U'}</div>
        <div class="profile-meta">
          <div class="profile-name">${user.nombre || ''} ${user.apellido || ''}</div>
          <div class="profile-email">${user.gmail || user.N_usuario || ''}</div>
        </div>
        <div class="profile-actions">
          <button id="btn_view_profile" class="icon-btn" title="Ver perfil" aria-label="Ver perfil"><i class="bx bx-show"></i></button>
          <button id="btn_logout" class="icon-btn" title="Cerrar sesión" aria-label="Cerrar sesión"><i class="bx bx-log-out"></i></button>
        </div>
      </div>
    `;

    const avatar = document.getElementById('profileAvatarSidebar'); if (avatar) avatar.addEventListener('click', ()=> showProfilePopup());
    const btnView = document.getElementById('btn_view_profile'); if (btnView) btnView.addEventListener('click', ()=> showProfilePopup());
    const btn = document.getElementById('btn_logout'); if (btn) btn.addEventListener('click', ()=>{ clearCurrentUser(); renderProfile(); location.reload(); });

  }

  // Muestra un popup en la esquina inferior derecha con los datos del usuario (sin contraseña)
  async function showProfilePopup() {
    const popup = document.getElementById('profilePopup');
    const user = getCurrentUser();
    if (!user) {
      Swal.fire({title:'No autenticado', text:'Necesitas registrarte o iniciar sesión', icon:'warning', showCancelButton:true, confirmButtonText:'Ir a registro'}).then(r => { if (r.isConfirmed) window.location.href = '/HTML/LOGIN_REGISTRER.HTML'; });
      return;
    }

    let fresh = user;
    try {
      if (user && user.id) {
        const resp = await fetch(`http://localhost:3001/info_usuarios/${user.id}`);
        if (resp.ok) {
          const json = await resp.json();
          if (json) { fresh = { ...user, ...json }; saveCurrentUser(fresh); }
        }
      }
    } catch(e) { console.warn('fetch profile for popup failed', e); }

    if (!popup) {
      // fallback: abrir la vista completa
      showProfileSection();
      return;
    }

    popup.innerHTML = `
      <div class="pp-header">
        <div class="pp-title">Perfil — ${escapeHtml(fresh.N_usuario || fresh.gmail || '')}</div>
        <button class="pp-close" id="pp_close">×</button>
      </div>
      <div class="pp-body">
        <p><strong>Nombre:</strong> ${escapeHtml(fresh.nombre || '')} ${escapeHtml(fresh.apellido || '')}</p>
        <p><strong>Usuario:</strong> ${escapeHtml(fresh.N_usuario || '')}</p>
        <p><strong>Email:</strong> ${escapeHtml(fresh.gmail || '')}</p>
        <p><strong>Creado:</strong> ${escapeHtml(fresh.created_at || '')}</p>
      </div>
      <div class="pp-actions">
        <button class="btn secondary" id="pp_view_full" aria-label="Ver perfil"><i class="bx bx-user"></i> Ver página</button>
        <button class="btn" id="pp_logout" aria-label="Cerrar sesión"><i class="bx bx-log-out"></i> Cerrar sesión</button>
      </div>
    
        </div>
      </div>`

    popup.classList.add('visible'); popup.setAttribute('aria-hidden','false');

    // events
    document.getElementById('pp_close')?.addEventListener('click', () => { popup.classList.remove('visible'); popup.setAttribute('aria-hidden','true'); });
    document.getElementById('pp_logout')?.addEventListener('click', () => { clearCurrentUser(); renderProfile(); popup.classList.remove('visible'); popup.setAttribute('aria-hidden','true'); location.reload(); });
    document.getElementById('pp_view_full')?.addEventListener('click', () => { popup.classList.remove('visible'); popup.setAttribute('aria-hidden','true'); showProfileSection(); });

    // click outside to close
    setTimeout(() => {
      const onDocClick = (e) => {
        if (!popup.contains(e.target)) { popup.classList.remove('visible'); popup.setAttribute('aria-hidden','true'); document.removeEventListener('click', onDocClick); }
      };
      document.addEventListener('click', onDocClick);
    }, 50);
  }

  async function showProfileSection() {
    const section = document.getElementById('profileSection');
    const user = getCurrentUser();
    if (!user) {
      Swal.fire({title:'No autenticado', text:'Necesitas registrarte o iniciar sesión', icon:'warning', showCancelButton:true, confirmButtonText:'Ir a registro'}).then(r => { if (r.isConfirmed) window.location.href = '/HTML/LOGIN_REGISTRER.HTML'; });
      return;
    }
    if (!section) {
      window.location.href = '/HTML/LOGIN_REGISTRER.HTML';
      return;
    }
    section.style.display = 'block';
    // intentar cargar datos frescos del servidor si tenemos id
    let fresh = user;
    try {
      if (user && user.id) {
        const resp = await fetch(`http://localhost:3001/info_usuarios/${user.id}`);
        if (resp.ok) {
          const json = await resp.json();
          if (json) fresh = { ...user, ...json };
          saveCurrentUser(fresh);
        }
      }
    } catch(e){ /* ignore */ }

    section.innerHTML = `
      <div class="profile-card">
        <div>
          <h2>Perfil</h2>
          <p><strong>Nombre:</strong> ${fresh.nombre || ''} ${fresh.apellido || ''}</p>
          <p><strong>Usuario:</strong> ${fresh.N_usuario || ''}</p>
          <p><strong>Email:</strong> ${fresh.gmail || ''}</p>
          <p style="color:#586169; font-size:13px;"><em>Notificaciones por correo: activadas para ${fresh.gmail || ''}</em></p>
          <p><strong>Creado:</strong> ${fresh.created_at || ''}</p>
        </div>
        <div>
          <button id="editProfile" class="btn"><i class="bx bx-edit"></i> Editar perfil</button>
          <button id="logout2" class="btn secondary" aria-label="Cerrar sesión"><i class="bx bx-log-out"></i> Cerrar sesión</button>
        </div>
      </div>
    `;
    const edit = document.getElementById('editProfile'); if (edit) edit.addEventListener('click', ()=> {
      try {
        // store current user for editing and navigate
        sessionStorage.setItem('editUser', JSON.stringify(fresh || {}));
      } catch(e) { console.warn('no se pudo preparar edición', e); }
      window.location.href = '/HTML/LOGIN_REGISTRER.HTML';
    });
    const logout2 = document.getElementById('logout2'); if (logout2) logout2.addEventListener('click', ()=> { clearCurrentUser(); renderProfile(); section.style.display='none'; location.reload(); });
    section.scrollIntoView({behavior:'smooth'});
  }


  // Comprueba si un gmail existe (llama al endpoint GET /info_usuarios?gmail=...)
  async function checkGmailExists(gmail){
    try {
      const res = await fetch(`http://localhost:3001/info_usuarios?gmail=${encodeURIComponent(gmail)}`);
      if (!res.ok) return false;
      const body = await res.json();
      return !!(body && body.exists);
    } catch(e){ return false; }
  }

  // === Registro (envía a /info_usuarios) ===
  async function registrer() {
    const nombre = document.getElementById('nombre')?.value?.trim() || document.querySelector('input[name="nombre"]')?.value?.trim() || '';
    const apellido = document.getElementById('apellido')?.value?.trim() || document.querySelector('input[name="apellido"]')?.value?.trim() || '';
    // soportar id antiguo N_usuario
    const nombreUsuario = document.getElementById('nombre_usuario')?.value?.trim() || document.getElementById('N_usuario')?.value?.trim() || document.querySelector('input[name="nombre_usuario"]')?.value?.trim() || '';
    // gmail ahora es obligatorio
    const gmail = document.getElementById('gmail')?.value?.trim() || document.querySelector('input[name="gmail"]')?.value?.trim() || '';
    const contrasena = document.getElementById('contrasena')?.value || document.querySelector('input[name="contrasena"]')?.value || '';

    if (!nombre || !nombreUsuario || !gmail || !contrasena) {
      swal("ERROR", "Completa los campos: nombre, nombre de usuario, gmail y contraseña.", "error");
      return;
    }
    // validación simple de gmail
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(gmail)) {
      swal("ERROR", "Gmail inválido", "error");
      return;
    }

    // comprobar existencia previa
    const exists = await checkGmailExists(gmail);
    if (exists) {
      swal('ERROR', 'El gmail ya está registrado', 'error');
      return;
    }

    const payload = {
      nombre,
      apellido,
      N_usuario: nombreUsuario,
      gmail,
      contrasena
    };

    // enviar al endpoint seguro que hace hashing
    try {
      showLoading();
      // detectar si estamos editando
      const editing = window.__editingUser || JSON.parse(sessionStorage.getItem('editUser') || 'null');
      let resp, body;
      if (editing && editing.id) {
        // PUT a /info_usuarios/:id
        // si contraseña vacía, no la incluimos en el payload (no cambiarla)
        const updatePayload = { ...payload };
        if (!updatePayload.contrasena) delete updatePayload.contrasena;
        resp = await fetch(`http://localhost:3001/info_usuarios/${editing.id}`, {
          method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(updatePayload)
        });
        body = await (resp.headers.get('content-type')?.includes('application/json') ? resp.json() : {});
        if (resp.ok) {
          swal('¡Hecho!', 'Perfil actualizado con éxito.', 'success');
          // actualizar usuario local y limpiar sesión de edición
          const updated = body && body.user ? body.user : { ...editing, ...updatePayload };
          saveCurrentUser(updated);
          sessionStorage.removeItem('editUser'); delete window.__editingUser;
          renderProfile();
          swapBack();
          return;
        } else {
          const msg = (body && (body.error || body.message)) ? (body.error || body.message) : `Error ${resp.status}`;
          swal('ERROR', msg, 'error');
          return;
        }
      }

      // si no es edición, crear nuevo usuario (POST)
      resp = await fetch('http://localhost:3001/info_usuarios', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
      body = await (resp.headers.get('content-type')?.includes('application/json') ? resp.json() : {});
      if (resp.status === 201) {
        swal('¡Hecho!', 'Usuario registrado con éxito. Ahora iniciaré sesión automáticamente.', 'success');
        // intentar login automático
        const loginResp = await sendToServer('login', { usuario: nombreUsuario, password: contrasena });
        if (loginResp && loginResp.ok === true && loginResp.user) {
          saveCurrentUser(loginResp.user);
          renderProfile();
          swapBack();
          // recargar para aplicar cambios visibles
          location.reload();
        } else {
          swapBack();
        }
      } else {
        const msg = (body && (body.error || body.message)) ? (body.error || body.message) : `Error ${resp.status}`;
        swal('ERROR', msg, 'error');
      }
    } catch (e) {
      console.error('registrer error', e);
      swal('ERROR', 'No se pudo completar el registro', 'error');
    } finally { hideLoading(); }
  }

  function swap() {
    const caja = document.getElementById('loginB');
    const inputsL = document.getElementById('logiin');
    const inputsR = document.getElementById('registrer');
    const t2 = document.getElementById('t2');
    const subt = document.getElementById('subt');
    const diseno = document.getElementById('login');
    if (!caja || !diseno || !inputsL || !inputsR) return;
    inputsL.classList.remove('visible'); inputsL.classList.add('oculto');
    inputsR.classList.remove('oculto'); inputsR.classList.add('visible');
    t2.textContent = 'al sistema!';
    subt.textContent = 'Ingrese los datos correspondientes para crear tu cuenta';
    subt.style.color = "#c4eaf7f7";
  }

  function swapBack() {
    const caja = document.getElementById('loginB');
    const inputsL = document.getElementById('logiin');
    const inputsR = document.getElementById('registrer');
    const t2 = document.getElementById('t2');
    const subt = document.getElementById('subt');
    const diseno = document.getElementById('login');
    if (!caja || !diseno || !inputsL || !inputsR) return;
    inputsR.classList.remove('visible'); inputsR.classList.add('oculto');
    inputsL.classList.remove('oculto'); inputsL.classList.add('visible');
    
    t2.textContent = 'de nuevo!';
    subt.textContent = 'Ingrese los datos correspondientes para iniciar sesión';
  }

  // === ELEMENTOS Y EVENTOS===
  // helper: intenta múltiples ids/selectores y devuelve el primero encontrado
  function getEl(...selectors) {
    for (const s of selectors) {
      if (!s) continue;
      // intentar id primero
      const byId = document.getElementById(s);
      if (byId) return byId;
      // intentar selector CSS
      try {
        const qs = document.querySelector(s);
        if (qs) return qs;
      } catch (e) {}
    }
    return null;
  }

  // renderizar perfil al cargar la página
  try {
    renderProfile();

    // botón rápido en el profileSection si está presente
    const btnQuick = document.getElementById('btn_go_register');
    if (btnQuick) btnQuick.addEventListener('click', (e)=>{ e.preventDefault(); window.location.href = '/HTML/LOGIN_REGISTRER.HTML'; });

    // Si estamos en index y no hay usuario, pedir registrarse y redirigir (se muestra una sola vez por sesión)
    const current = getCurrentUser();
    const path = (window.location.pathname || '').toLowerCase();
    if (!current && (path.endsWith('/') || path.includes('index.html') || path === '')) {
      if (!sessionStorage.getItem('promptedRegister')) {
        sessionStorage.setItem('promptedRegister', '1');
        Swal.fire({
          title: 'Registro requerido',
          text: 'Parece que aún no has iniciado sesión. ¿Deseas registrarte ahora?',
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'Ir a registro',
          cancelButtonText: 'Ahora no'
        }).then((r) => {
          if (r.isConfirmed) window.location.href = '/HTML/LOGIN_REGISTRER.HTML';
        });
      }
    }

    // Si estamos en la página de registro y venimos a editar, rellenar el formulario
    try {
      if (path.includes('login_registrer.html')) {
        const editRaw = sessionStorage.getItem('editUser');
        if (editRaw) {
          const editUser = JSON.parse(editRaw);
          // rellenar campos si existen
          const nombreEl = document.getElementById('nombre'); if (nombreEl) nombreEl.value = editUser.nombre || '';
          const apellidoEl = document.getElementById('apellido'); if (apellidoEl) apellidoEl.value = editUser.apellido || '';
          const userEl = document.getElementById('nombre_usuario') || document.getElementById('N_usuario'); if (userEl) userEl.value = editUser.N_usuario || editUser.N_usuario_old || '';
          const gmailEl = document.getElementById('gmail'); if (gmailEl) gmailEl.value = editUser.gmail || '';
          // por seguridad no rellenamos la contraseña
          // actualizar texto del botón de registrar
          const regBtn = getEl('registrar', 'btn_registrar', 'btnRegistrer', '#registrar', '.btn-registrar');
          if (regBtn) regBtn.textContent = 'Guardar cambios';
          // marcar señal global para que registrer() haga PUT
          window.__editingUser = editUser;
        }
      }
    } catch(e) { console.warn('no se pudo prellenar editUser', e); }
  } catch(e) { console.warn('renderProfile error', e); }

  const btnL = getEl('btn_login', 'btnLogin', '#btn_login', '.btn-login');
  const btn_registrer = getEl('registrar', 'btn_registrar', 'btnRegistrer', '#registrar', '.btn-registrar');
  const linkL_swap = getEl('btnregistrer', 'linkRegister', '#btnregistrer');
  const linkR_swap = getEl('btnLogin', 'linkLogin', '#btnLogin');
  const ojo = getEl('MostrarContrasena', 'mostrarContrasena', '#MostrarContrasena');
  const ojo2 = getEl('MostrarContrasenaa', 'mostrarContrasena2', '#MostrarContrasenaa');

  if (btnL) btnL.addEventListener('click', login);
  else console.warn('[login_registrer] btn login no encontrado en DOM');
  // asegurar listener (ya estaba presente)
  if (btn_registrer) btn_registrer.addEventListener('click', registrer);
  else console.warn('[login_registrer] btn registrar no encontrado en DOM');
  if (linkL_swap) linkL_swap.addEventListener('click', e => { e.preventDefault(); swap(); });
  if (linkR_swap) linkR_swap.addEventListener('click', e => { e.preventDefault(); swapBack(); });
  if (ojo) {
    ojo.addEventListener('click', () => {
      const password = document.getElementById('C');
      if (!password) return;
      if (password.type === 'password') {
        password.type = 'text'; ojo.src = '/img/visibility.png';
      } else {
        password.type = 'password'; ojo.src = '/img/visibility_off.png';
      }
    });
  }
  if(ojo2){
    ojo2.addEventListener('click', () => {
      const password = document.getElementById('contrasena');
      if (!password) return;
      if (password.type === 'password') {
        password.type = 'text'; ojo2.src = '/img/visibility.png';
      } else {
        password.type = 'password'; ojo2.src = '/img/visibility_off.png';
      }
    });
  }

  // === Loading overlay helpers ===
  function showLoading(){
    const ov = document.getElementById('loadingOverlay');
    if(!ov) return;
    ov.setAttribute('aria-hidden','false');
  }
  function hideLoading(){
    const ov = document.getElementById('loadingOverlay');
    if(!ov) return;
    ov.setAttribute('aria-hidden','true');
  }

  // === ENTER EN INPUTS: mueve al siguiente input y en el Ultimo ejecuta login/registrer ===
  let inputs = Array.from(document.querySelectorAll('.l'));
  // si no hay inputs con clase `.l`, buscar inputs dentro de los formularios logiin/registrer
  if (!inputs || inputs.length === 0) {
    const possibleLoginForm = getEl('logiin', 'logiin', '#logiin', '#login', '#loginForm', '.login-form');
    const possibleRegisterForm = getEl('registrer', '#registrer', '#register', '#registerForm', '.register-form');
    const formCandidates = [possibleLoginForm, possibleRegisterForm].filter(Boolean);
    if (formCandidates.length > 0) {
      inputs = formCandidates.reduce((acc, f) => acc.concat(Array.from(f.querySelectorAll('input, textarea, select'))), []);
    } else {
      inputs = Array.from(document.querySelectorAll('input, textarea')).filter(el => el.type !== 'hidden');
    }
  }
  function findAncestorById(el, id) {
    while (el && el !== document) {
      if (el.id === id) return el;
      el = el.parentElement;
    }
    return null;
  }

  inputs.forEach((input) => {
    input.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter' && e.keyCode !== 13) return;
      e.preventDefault();

      // Determinar en qué formulario esta este input
      const inLogin = findAncestorById(input, 'logiin') || findAncestorById(input, 'login') || findAncestorById(input, 'loginForm');
      const inRegister = findAncestorById(input, 'registrer') || findAncestorById(input, 'register') || findAncestorById(input, 'registerForm');

      let currentForm = null;
      if (inLogin) currentForm = inLogin;
      else if (inRegister) currentForm = inRegister;
      else {
        // fallback: usa el formulario visible (si existe)
        currentForm = document.querySelector('#logiin.visible') || document.querySelector('#registrer.visible');
      }

      if (!currentForm) {
        // si no podemos detectar formulario, no hacemos nada
        return;
      }

      // intenta usar inputs con clase '.l' dentro del form; si no hay, toma inputs normales
      let focusables = Array.from(currentForm.querySelectorAll('.l'));
      if (focusables.length === 0) {
        focusables = Array.from(currentForm.querySelectorAll('input:not([type="hidden"]), textarea, select'))
          .filter(el => !el.disabled && el.offsetParent !== null);
      } else {
        focusables = focusables.filter(el => !el.disabled && el.offsetParent !== null);
      }

      const idx = focusables.indexOf(input);
      if (idx >= 0 && idx < focusables.length - 1) {
        focusables[idx + 1].focus();
      } else {
        // último input,ejecutar accion correspondiente
        if (currentForm.id === 'logiin') login();
        else if (currentForm.id === 'registrer') registrer();
      }
    });
  });

  // === ENTER GLOBAL cuando NO hay foco en un input ===
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.keyCode !== 13) return;
    const active = document.activeElement;
    const isInput = active && (['INPUT','TEXTAREA','SELECT','BUTTON'].includes(active.tagName));
    if (isInput) return; // ya manejado por los handlers anteriores

    const visible = document.querySelector('#logiin.visible') || document.querySelector('#registrer.visible');
    if (visible) {
      e.preventDefault();
      if (visible.id === 'logiin') login();
      else registrer();
    }
  });

  } catch (err) {
    console.error('[DOMContentLoaded handler error]', err);
    try { if (typeof swal === 'function') swal('Error', String(err.message || err).slice(0,200), 'error'); } catch(e){}
  }

}); // final DOMContentLoaded