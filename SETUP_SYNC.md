# 🚀 CONFIGURACIÓN FINAL DEL SISTEMA DE SINCRONIZACIÓN

## ¿Qué se ha hecho?

Se ha implementado un **sistema de sincronización offline-first** que permite que la aplicación funcione sin conexión a internet y sincronice automáticamente cuando hay conexión. Todo esto ocurre **de forma transparente para el usuario**.

## 📁 Archivos Creados/Modificados

### Nuevos Archivos JavaScript
- **`public/JS/sync.js`** - Motor de sincronización (detecta online/offline, guarda en localStorage, sincroniza automáticamente)
- **`public/JS/api-client.js`** - Cliente API simplificado con métodos para todas las operaciones
- **`public/JS/SYNC_EXAMPLES.js`** - Ejemplos de cómo usar el nuevo sistema

### Archivos Modificados
- **`public/index.html`** - Se agregaron scripts de sincronización al inicio
- **`server.js`** - Se mejoró el manejo de errores con función `safeQuery()`
- **`.env`** - Actualizado con comentarios explicativos

### Documentación
- **`SYNC_SYSTEM.md`** - Documentación completa del sistema
- **`SETUP_SYNC.md`** - Este archivo

## 🔧 Configuración de la Base de Datos

El archivo `.env` está configurado para usar una BD local:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=F9!qZ7@M#2sLxW8$
DB_NAME=gohome_db
```

Si tu BD está en otro servidor, actualiza `DB_HOST` con la IP o dominio.

## ⚡ Cómo Funciona

### Flujo Normal (Con Conexión)
```
Usuario hace acción → API Call → Server → Database ✅ → UI Actualizada
```

### Flujo Offline (Sin Conexión)
```
Usuario hace acción → API Call → Guardar en localStorage 💾 → UI Actualizada
```

### Flujo de Sincronización (Vuelve Conexión)
```
Detectar online → Sincronizar automáticamente → Server → Database ✅ → UI Actualizada
```

## 📝 Ejemplo de Uso

### Antes (antigua forma con fetch):
```javascript
const response = await fetch('/inquilinos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
if (!response.ok) throw new Error('Error');
const result = await response.json();
```

### Ahora (con sincronización automática):
```javascript
const result = await apiClient.createInquilino(data);

if (result.success) {
  console.log('✅ Guardado:', result.data);
} else if (result.queued) {
  console.log('📝 Guardado localmente, se sincronizará luego');
} else {
  console.error('❌ Error:', result.error);
}
```

## 🛠️ Próximos Pasos

1. **Actualizar peticiones existentes** - Reemplaza los `fetch()` directo por llamadas a `apiClient`
   - Ejemplo: en `agregar_inquilino.js`, `inmuebles.js`, etc.
   - Referencia: Ver `SYNC_EXAMPLES.js`

2. **Probar offline** - Abre DevTools → Network → Offline
   - Intenta crear/editar datos
   - Verifica que se guarden en localStorage
   - Cambia a Online y verifica que se sincronicen

3. **Monitorear sincronización** (opcional):
   ```javascript
   // En la consola del navegador
   console.log(syncManager.getStatus())
   ```

## ⚙️ Métodos Disponibles del API Client

```javascript
// INQUILINOS
await apiClient.getInquilinos()
await apiClient.getInquilino(id)
await apiClient.createInquilino(data)
await apiClient.updateInquilino(id, data)
await apiClient.deleteInquilino(id)

// INMUEBLES
await apiClient.getInmuebles()
await apiClient.getInmueble(id)
await apiClient.createInmueble(data)
await apiClient.updateInmueble(id, data)
await apiClient.deleteInmueble(id)

// PAGOS
await apiClient.getPagosPendientes()
await apiClient.createPagoPendiente(data)
await apiClient.deletePagoPendiente(id)

// USUARIOS
await apiClient.getUsuarios()
await apiClient.createUsuario(data)
await apiClient.loginUsuario(data)
```

## 🚨 Manejo de Errores

| Escenario | Respuesta | Acción |
|-----------|-----------|--------|
| Éxito | `{ success: true, data: ... }` | Mostrar éxito |
| Offline (POST/PUT/DELETE) | `{ success: false, queued: true }` | Proceder silenciosamente |
| Error de red | `{ success: false, error: "..." }` | Guardar en localStorage, reintentar |
| Error del servidor | `{ success: false, error: "..." }` | Mostrar error después de 5 reintentos |

## 🔒 Seguridad

⚠️ **IMPORTANTE**: 
- El `.env` contiene credenciales sensibles
- Nunca subas el `.env` a Git (ya está en `.gitignore`)
- Usa variables de entorno diferentes para producción
- Cambiar `FORCE_HTTPS=1` en producción

## 📊 Límites de localStorage

- Máximo típico: 5-10 MB por dominio
- Si superas el límite, la sincronización fallará
- Los datos se limpian después de 5 reintentos fallidos

## 🐛 Debugging

### Ver estado actual:
```javascript
syncManager.getStatus()
// { online: true, pendingChanges: 2, queue: [...] }
```

### Limpiar queue (solo testing):
```javascript
syncManager.clearQueue()
```

### Ver logs en consola:
- La sincronización registra mensajes con ✅, ❌, 📝, 🔄

## 📞 Soporte

Si algo no funciona:

1. Abre DevTools → Console
2. Revisa los mensajes de error
3. Verifica `syncManager.getStatus()` para ver cambios pendientes
4. Revisa `localStorage.getItem('gohome_sync_queue')` para ver la cola

---

**Sistema listo para usar. ¡Los cambios se sincronizarán automáticamente!** 🎉
