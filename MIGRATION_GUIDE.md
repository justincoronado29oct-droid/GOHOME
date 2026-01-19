# 📚 GUÍA DE MIGRACIÓN: De fetch() a apiClient

## Paso 0: Verificar que los scripts estén cargados

En [index.html](index.html), al inicio del `<head>` debe haber:

```html
<!-- Sistema de sincronización offline -->
<script src="/public/JS/sync.js"></script>
<script src="/public/JS/api-client.js"></script>
```

✅ **YA ESTÁ HECHO**

---

## Paso 1: Migración de Peticiones GET

### ANTES (Obtener inquilinos)
```javascript
// En agregar_inquilino.js, inmuebles.js, etc
async function getInquilinos() {
  const response = await fetch('/inquilinos', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (!response.ok) {
    console.error('Error al obtener inquilinos');
    return [];
  }
  
  const data = await response.json();
  return data;
}
```

### DESPUÉS
```javascript
async function getInquilinos() {
  const result = await apiClient.getInquilinos();
  
  if (result.success) {
    return result.data;
  } else {
    console.error('Error:', result.error);
    return [];
  }
}
```

**Cambios:**
- ❌ Eliminar: `fetch()`, `response.ok`, `response.json()`
- ✅ Agregar: `apiClient.getInquilinos()`, verificar `result.success`

---

## Paso 2: Migración de Peticiones POST (Crear)

### ANTES (Crear inquilino)
```javascript
async function crearInquilino(datos) {
  try {
    const response = await fetch('/inquilinos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error crear inquilino:', error);
    alert('No se pudo guardar el inquilino');
    return { success: false, error: error.message };
  }
}
```

### DESPUÉS
```javascript
async function crearInquilino(datos) {
  const result = await apiClient.createInquilino(datos);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else if (result.queued) {
    // ✨ AQUÍ ESTÁ LA MAGIA: Silencioso, se sincronizará después
    console.log('Guardado localmente');
    return { success: true, data: null, local: true };
  } else {
    console.error('Error:', result.error);
    return { success: false, error: result.error };
  }
}
```

**Cambios:**
- ❌ Eliminar: `fetch()`, `try/catch` complejo, `alert()`
- ✅ Agregar: `apiClient.createInquilino()`, manejar `queued: true`
- ⭐ **IMPORTANTE**: NO mostrar alert cuando `queued: true`

---

## Paso 3: Migración de Peticiones PUT (Actualizar)

### ANTES (Actualizar inquilino)
```javascript
async function editarInquilino(id, datos) {
  const response = await fetch(`/inquilinos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  
  if (!response.ok) throw new Error('Error al actualizar');
  return await response.json();
}
```

### DESPUÉS
```javascript
async function editarInquilino(id, datos) {
  const result = await apiClient.updateInquilino(id, datos);
  
  if (result.success) {
    return result.data;
  } else if (result.queued) {
    console.log('Guardado localmente, se sincronizará después');
    return { id, ...datos };
  } else {
    throw new Error(result.error);
  }
}
```

---

## Paso 4: Migración de Peticiones DELETE (Eliminar)

### ANTES (Eliminar inquilino)
```javascript
async function eliminarInquilino(id) {
  const response = await fetch(`/inquilinos/${id}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) throw new Error('Error al eliminar');
  return true;
}
```

### DESPUÉS
```javascript
async function eliminarInquilino(id) {
  const result = await apiClient.deleteInquilino(id);
  
  if (result.success || result.queued) {
    return true;
  } else {
    throw new Error(result.error);
  }
}
```

---

## Tabla Rápida de Equivalencias

| Operación | Antes | Después |
|-----------|-------|---------|
| Obtener todos | `fetch('/inquilinos')` | `apiClient.getInquilinos()` |
| Obtener uno | `fetch('/inquilinos/5')` | `apiClient.getInquilino(5)` |
| Crear | `fetch('/inquilinos', {POST})` | `apiClient.createInquilino(data)` |
| Actualizar | `fetch('/inquilinos/5', {PUT})` | `apiClient.updateInquilino(5, data)` |
| Eliminar | `fetch('/inquilinos/5', {DELETE})` | `apiClient.deleteInquilino(5)` |

---

## Métodos Disponibles Completos

### Inquilinos
```javascript
apiClient.getInquilinos()
apiClient.getInquilino(id)
apiClient.createInquilino({ nombre, cedula, telefono, ... })
apiClient.updateInquilino(id, { nombre, telefono, ... })
apiClient.deleteInquilino(id)
```

### Inmuebles
```javascript
apiClient.getInmuebles()
apiClient.getInmueble(id)
apiClient.createInmueble({ N_casa, direccion, sector, ... })
apiClient.updateInmueble(id, { direccion, ... })
apiClient.deleteInmueble(id)
```

### Pagos
```javascript
apiClient.getPagosPendientes()
apiClient.createPagoPendiente({ id_inquilino, monto, ... })
apiClient.deletePagoPendiente(id)
```

### Usuarios
```javascript
apiClient.getUsuarios()
apiClient.createUsuario({ nombre, apellido, N_usuario, ... })
apiClient.loginUsuario({ N_usuario, contrasena })
```

---

## Archivos a Migrar

Estos archivos contienen peticiones fetch que deberían ser migradas:

1. **public/JS/agregar_inquilino.js** - Crear/editar inquilinos
2. **public/JS/inmuebles.js** - CRUD de inmuebles
3. **public/JS/poblar_select.js** - GET inmuebles
4. **public/JS/contratos.js** - Peticiones de contratos
5. **public/JS/PAGOS_VENCIDOS_PROGRESIVOS.js** - Operaciones de pagos
6. **public/JS/papeleo.js** - Operaciones de papeleo
7. **public/JS/s_alserver.js** - Funciones de sync (PUEDE SER ELIMINADO)
8. **public/JS/login_registrer.js** - Login/registro

---

## Patrón Común de Manejo de Resultados

```javascript
async function miOperacion() {
  const result = await apiClient.createInquilino(data);
  
  // Pattern 1: Éxito o Queued
  if (result.success || result.queued) {
    actualizarUI(result.data);
    return;
  }
  
  // Pattern 2: Solo éxito
  if (result.success) {
    guardarEnUI(result.data);
  } else {
    mostrarError(result.error);
  }
}
```

---

## Manejo de Errores Recomendado

```javascript
async function operacionConErrorHandling() {
  try {
    const result = await apiClient.createInquilino(datos);
    
    if (result.success) {
      console.log('✅ Guardado exitosamente');
      mostrarNotificacion('Guardado', 'success');
    } else if (result.queued) {
      // Silencioso - no notificar al usuario
      console.log('📝 Guardado localmente');
      mostrarNotificacion('Guardado. Se sincronizará cuando hay conexión', 'info');
    } else {
      console.error('❌ Error:', result.error);
      mostrarNotificacion('Error: ' + result.error, 'error');
    }
  } catch (err) {
    console.error('Exception:', err);
    mostrarNotificacion('Error inesperado', 'error');
  }
}
```

---

## Testing de Migración

Para cada archivo migrado:

1. Abre DevTools (F12)
2. Abre Network Tab
3. Realiza una operación (crear, editar, eliminar)
4. Verifica que el fetch salga correctamente
5. Prueba en modo Offline (Network → Offline)
6. Verifica que se guarde en localStorage
7. Vuelve Online y verifica sincronización

**Comando en consola para verificar:**
```javascript
syncManager.getStatus()
// { online: true, pendingChanges: 0, queue: [] }
```

---

## Checklist de Migración

- [ ] Verify `sync.js` y `api-client.js` están en el HTML
- [ ] Migrar `agregar_inquilino.js`
- [ ] Migrar `inmuebles.js`
- [ ] Migrar `poblar_select.js`
- [ ] Migrar `contratos.js`
- [ ] Migrar `PAGOS_VENCIDOS_PROGRESIVOS.js`
- [ ] Migrar `papeleo.js`
- [ ] Migrar `login_registrer.js`
- [ ] Probar en modo offline
- [ ] Probar sincronización automática
- [ ] Verificar no hay conflicts con código antiguo
- [ ] Remover referencias a `s_alserver.js` si es redundante

---

## Soporte

Si tienes dudas:
1. Revisa [SYNC_EXAMPLES.js](public/JS/SYNC_EXAMPLES.js) para ver ejemplos
2. Revisa [SYNC_SYSTEM.md](SYNC_SYSTEM.md) para entender el sistema
3. Abre DevTools console para ver logs de sincronización
