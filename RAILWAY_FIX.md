# Fix para errores de conexión en Railway ✅

## Problema
```
Connection lost: The server closed the connection.
PROTOCOL_CONNECTION_LOST
```

## Cambios realizados en server.js

### 1. **Configuración del Pool MySQL mejorada**
- ✅ Aumentado `connectTimeout` de 30s a 60s
- ✅ Agregado `enableKeepAlive: true` para mantener conexiones vivas
- ✅ Agregado `keepAliveInitialDelayMs: 30000` (30s)
- ✅ Aumentado `connectionLimit` de 5 a 10
- ✅ SSL optimizado con `ssl: 'amazon'` (compatible con Railway/RDS)

### 2. **Reintentos automáticos en queries**
- ✅ La función `query()` ahora reintenta hasta 3 veces
- ✅ Manejo específico de `PROTOCOL_CONNECTION_LOST`
- ✅ Backoff exponencial entre reintentos

### 3. **Startup no bloqueante**
- ✅ El servidor **inicia sin esperar a la BD**
- ✅ Base de datos se conecta en background
- ✅ Reintentos de conexión hasta 10 veces (máximo 30s entre intentos)
- ✅ **Ya NO hace `process.exit(1)` en producción**

### 4. **Mejor manejo de errores**
- ✅ `ensureAllTables()` usa reintentos
- ✅ `ensureUserTable()` usa reintentos
- ✅ `ensureNotificationsTable()` usa reintentos
- ✅ Los errores se registran pero no detienen el servidor

## Variables de entorno requeridas en Railway

Asegúrate de tener estas en el dashboard:

```
DB_HOST=switchyard.proxy.rlwy.net
DB_USER=root
DB_PASS=tu_contraseña_actual
DB_NAME=gohome_db
DB_PORT=10788
NODE_ENV=production
```

## Testing local

Para probar localmente con la misma BD de Railway:

```bash
# .env
DB_HOST=switchyard.proxy.rlwy.net
DB_USER=root
DB_PASS=...
DB_NAME=gohome_db
DB_PORT=10788
NODE_ENV=development
```

```bash
npm start
```

## Signos de éxito

Deberías ver en los logs:
```
🚀 Server listening on port 3000 (env=production)
⚠️ Intento 1/10 - Error conectando a BD: ...
✅ Base de datos conectada (gohome_db)
✅ Tablas verificadas/creadas
```

## Si aún falla

1. **Verifica credenciales** en el dashboard de Railway
2. **Verifica que DB esté activa** en Railway
3. **Revisa logs en Render** (Service > Logs)
4. **Verifica el puerto MySQL** (debe ser 10788)
5. **Intenta resetear la BD** en Railway dashboard

---

**Cambios de código seguro para aplicar en producción ✅**
