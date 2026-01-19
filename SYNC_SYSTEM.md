# Sistema de Sincronización Offline-First

## Descripción

Este sistema permite que la aplicación funcione sin conexión a internet y sincronice automáticamente los datos cuando la conexión se restaure. Todo esto ocurre **de forma transparente para el usuario**, sin mostrar alertas ni avisos.

## Características

✅ **Funcionalidad Offline**: Los datos se guardan en `localStorage` si el servidor no está disponible
✅ **Sincronización Automática**: Cuando el servidor vuelve online, los cambios se envían automáticamente
✅ **Sin Notificaciones**: El usuario no recibe avisos sobre el proceso de sincronización
✅ **Reintentos Automáticos**: Si una petición falla, se reintenta automáticamente
✅ **Queue Persistente**: Los cambios se guardan en `localStorage` hasta ser sincronizados exitosamente

## Archivos Principales

### 1. `public/JS/sync.js`
Gestor de sincronización que:
- Detecta cambios de conectividad (online/offline)
- Guarda peticiones fallidas en localStorage
- Sincroniza automáticamente cada 10 segundos cuando hay conexión
- Maneja reintentos (máximo 5 intentos por petición)

### 2. `public/JS/api-client.js`
Cliente API que proporciona métodos para:
- `apiClient.getInquilinos()`
- `apiClient.createInquilino(data)`
- `apiClient.updateInquilino(id, data)`
- `apiClient.deleteInquilino(id)`
- Similar para inmuebles, pagos y usuarios

## Uso en la Aplicación

### Antes (manera antigua con fetch directo):
```javascript
const response = await fetch('/inquilinos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
const result = await response.json();
```

### Ahora (con sincronización automática):
```javascript
const result = await apiClient.createInquilino(data);

if (result.success) {
  console.log('Guardado:', result.data);
} else if (result.queued) {
  console.log('Guardado localmente, se sincronizará cuando hay conexión');
} else {
  console.error('Error:', result.error);
}
```

## Estructura del Queue

Los cambios pendientes se guardan en localStorage bajo la clave `gohome_sync_queue`:

```javascript
[
  {
    id: 1234567890,
    timestamp: "2026-01-19T10:30:00.000Z",
    method: "POST",
    endpoint: "/inquilinos",
    data: { nombre: "Juan", cedula: "123456" },
    retries: 0
  }
]
```

## Debugging

Para ver el estado de sincronización en la consola:
```javascript
// Ver cambios pendientes
syncManager.getStatus()
// Output: { online: true, pendingChanges: 2, queue: [...] }

// Limpiar queue (solo para testing)
syncManager.clearQueue()
```

## Manejo de Errores

- **Errores de red**: Se guardan en localStorage y se reintenta automáticamente
- **Errores 4xx/5xx**: Después de 5 reintentos fallidos, se elimina del queue
- **Base de datos no disponible**: Los datos se guardan en localStorage hasta que BD esté online

## Notas Importantes

⚠️ **localStorage tiene límite**: Típicamente 5-10 MB por dominio
⚠️ **No se sincroniza en offline**: Solo se sincroniza automáticamente cuando `navigator.onLine === true`
⚠️ **Ordenes no garantizadas**: Si hay múltiples cambios pendientes, pueden sincronizarse en orden diferente al que se crearon (máximo 5 reintentos)

## Configuración en el Server

El server (`server.js`) está configurado para usar variables de entorno del `.env`:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=password
DB_NAME=gohome_db
```

Los errores de conexión deben retornar códigos HTTP 5xx para que el cliente sepa reintentar.

## Flujo de Datos

```
Cliente (Online)
    ↓
API Call → Server → Database ✅
    ↓
Actualizar UI

Cliente (Offline)
    ↓
API Call → Guardar en localStorage
    ↓
Mostrar UI con datos locales
    ↓
(Conexión restaurada)
    ↓
Sincronizar automáticamente → Server → Database ✅
    ↓
Actualizar UI
```
