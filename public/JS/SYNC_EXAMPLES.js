/**
 * EJEMPLO: Cómo refactorizar las peticiones fetch existentes
 * para usar el nuevo sistema de sincronización
 */

// ============================================
// ANTES (método antiguo con fetch directo)
// ============================================

// Obtener inquilinos
async function oldGetInquilinos() {
  try {
    const response = await fetch('/inquilinos', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Error al obtener inquilinos');
    const data = await response.json();
    console.log('Inquilinos:', data);
  } catch (err) {
    console.error('Error:', err.message);
    // Sin manejo offline - la app simplemente falla
  }
}

// Crear inquilino
async function oldCreateInquilino(inquilinoData) {
  try {
    const response = await fetch('/inquilinos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inquilinoData)
    });
    if (!response.ok) throw new Error('Error al crear inquilino');
    const data = await response.json();
    console.log('Inquilino creado:', data);
  } catch (err) {
    console.error('Error:', err.message);
    alert('No se pudo guardar el inquilino');
  }
}

// ============================================
// AHORA (nuevo método con sincronización)
// ============================================

// Obtener inquilinos
async function newGetInquilinos() {
  const result = await apiClient.getInquilinos();
  
  if (result.success) {
    console.log('Inquilinos:', result.data);
  } else {
    console.error('Error:', result.error);
    // Si está offline, puedes mostrar datos del localStorage si existen
  }
}

// Crear inquilino
async function newCreateInquilino(inquilinoData) {
  const result = await apiClient.createInquilino(inquilinoData);
  
  if (result.success) {
    console.log('Inquilino creado:', result.data);
    // Mostrar éxito silenciosamente
  } else if (result.queued) {
    console.log('Guardado localmente, se sincronizará cuando hay conexión');
    // El usuario NO ve un error, el dato se sincroniza automáticamente después
    // Puedes mostrar un ícono de "reloj" o similar si lo deseas
  } else {
    console.error('Error:', result.error);
  }
}

// ============================================
// MÉTODOS COMPLETOS DEL API CLIENT
// ============================================

/**
 * INQUILINOS
 */
// Obtener todos los inquilinos
apiClient.getInquilinos()

// Obtener un inquilino por ID
apiClient.getInquilino(5)

// Crear nuevo inquilino
apiClient.createInquilino({
  nombre: 'Juan Pérez',
  cedula: '12345678',
  telefono: '3001234567',
  fecha_ospedaje: '2026-01-19',
  ingreso_mensual: 2000000,
  N_casa: 101
})

// Actualizar inquilino
apiClient.updateInquilino(5, {
  nombre: 'Juan Pedro Pérez',
  telefono: '3009876543'
})

// Eliminar inquilino
apiClient.deleteInquilino(5)

/**
 * INMUEBLES
 */
apiClient.getInmuebles()
apiClient.getInmueble(1)
apiClient.createInmueble({
  N_casa: 101,
  direccion: 'Calle 5 #10-20',
  sector: 'Centro',
  municipio: 'Bogotá'
})
apiClient.updateInmueble(1, { sector: 'Sur' })
apiClient.deleteInmueble(1)

/**
 * PAGOS
 */
apiClient.getPagosPendientes()
apiClient.createPagoPendiente({
  id_inquilino: 5,
  monto: 1500000
})
apiClient.deletePagoPendiente(10)

/**
 * USUARIOS
 */
apiClient.getUsuarios()
apiClient.createUsuario({
  nombre: 'Admin',
  apellido: 'User',
  N_usuario: 'admin',
  gmail: 'admin@gohome.com',
  contrasena: 'hashed_password'
})

// ============================================
// EJEMPLO PRÁCTICO: Formulario de Inquilino
// ============================================

async function handleInquilinoForm(formData) {
  // Mostrar spinner de carga
  showLoadingSpinner();
  
  // Hacer la petición (usa sync automáticamente)
  const result = await apiClient.createInquilino(formData);
  
  // Esconder spinner
  hideLoadingSpinner();
  
  if (result.success) {
    // Éxito - mostrar confirmación
    showNotification('✅ Inquilino guardado exitosamente', 'success');
    clearForm();
    refreshInquilinosList();
  } else if (result.queued) {
    // Guardado localmente, sincronización pendiente
    // NO mostrar error, simplemente proceder
    showNotification('📝 Guardado. Se sincronizará cuando hay conexión', 'info');
    clearForm();
    refreshInquilinosList();
  } else {
    // Error real
    showNotification('❌ Error al guardar: ' + result.error, 'error');
  }
}

// ============================================
// MONITOREO DE SINCRONIZACIÓN (OPCIONAL)
// ============================================

// Ver estado actual
console.log(syncManager.getStatus());

// Ver cambios pendientes
if (syncManager.getStatus().pendingChanges > 0) {
  console.log('Hay cambios pendientes por sincronizar');
}

// Forzar sincronización (no necesario, se hace automáticamente)
// syncManager.syncAll();
