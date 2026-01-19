# ⚡ QUICK START - Sistema de Sincronización

## En 1 minuto

El sistema ya está implementado. Solo necesitas reemplazar `fetch()` con `apiClient`:

### Antes:
```javascript
const response = await fetch('/inquilinos', { method: 'POST', body: JSON.stringify(data) });
const result = await response.json();
```

### Después:
```javascript
const result = await apiClient.createInquilino(data);
```

✅ **Eso es todo. El sistema maneja todo lo demás automáticamente.**

---

## Los 3 Casos Principales

### 1️⃣ GET (obtener datos)
```javascript
const result = await apiClient.getInquilinos();
if (result.success) {
  console.log('Inquilinos:', result.data);
}
```

### 2️⃣ POST/PUT (crear/editar)
```javascript
const result = await apiClient.createInquilino(data);
if (result.success || result.queued) {
  // ✅ Éxito o guardado localmente
  actualizarUI();
} else {
  // ❌ Error
  mostrarError(result.error);
}
```

### 3️⃣ DELETE (eliminar)
```javascript
const result = await apiClient.deleteInquilino(id);
if (result.success || result.queued) {
  // ✅ Eliminado (o guardado para sincronizar)
} else {
  // ❌ Error
}
```

---

## Testing Offline (30 segundos)

1. Abre DevTools → Network → Offline
2. Crea/edita un inquilino
3. Abre Console y escribe: `syncManager.getStatus()`
4. Vuelve a Online
5. Verifica que se sincronice automáticamente

---

## Archivos Listos para Usar

✅ `public/JS/sync.js` - Motor (no tocar)
✅ `public/JS/api-client.js` - Cliente API (no tocar)
✅ `.env` - Configuración (actualizar si es necesario)

---

## Métodos Disponibles (Copia/Pega)

```javascript
// Inquilinos
apiClient.getInquilinos()
apiClient.getInquilino(id)
apiClient.createInquilino(data)
apiClient.updateInquilino(id, data)
apiClient.deleteInquilino(id)

// Inmuebles
apiClient.getInmuebles()
apiClient.getInmueble(id)
apiClient.createInmueble(data)
apiClient.updateInmueble(id, data)
apiClient.deleteInmueble(id)

// Pagos
apiClient.getPagosPendientes()
apiClient.createPagoPendiente(data)
apiClient.deletePagoPendiente(id)

// Usuarios
apiClient.getUsuarios()
apiClient.createUsuario(data)
apiClient.loginUsuario(data)
```

---

## Manejo de Errores (3 casos)

```javascript
const result = await apiClient.createInquilino(data);

if (result.success) {
  // ✅ Guardado en BD
  console.log(result.data);
} else if (result.queued) {
  // 📝 Guardado localmente, se sincronizará después
  // NO mostrar error
} else {
  // ❌ Error real
  console.error(result.error);
}
```

---

## ¿Preguntas?

| Pregunta | Respuesta |
|----------|-----------|
| ¿Dónde se guardan offline? | localStorage |
| ¿Cuándo se sincroniza? | Cada 10s si hay conexión |
| ¿Qué pasa si BD sigue offline? | Reintentos automáticos |
| ¿El usuario ve notificaciones? | No, todo es transparente |
| ¿Puedo ver el queue? | `syncManager.getStatus()` |

---

## Documentación Completa

- 📖 [SYNC_SYSTEM.md](SYNC_SYSTEM.md) - Sistema completo
- 🔧 [SETUP_SYNC.md](SETUP_SYNC.md) - Configuración
- 🛠️ [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Cómo migrar código
- 📚 [TECHNICAL_OVERVIEW.md](TECHNICAL_OVERVIEW.md) - Vista técnica
- 💾 [public/JS/SYNC_EXAMPLES.js](public/JS/SYNC_EXAMPLES.js) - Ejemplos

---

**¡Listo! El sistema está 100% operativo.** 🚀
