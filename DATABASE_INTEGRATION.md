# 🗄️ INTEGRACIÓN BASE DE DATOS CON SISTEMA DE SINCRONIZACIÓN

## Diagrama de Interacción

```
┌─────────────────────────────────────────────────────────────────┐
│                    NAVEGADOR (Cliente)                          │
│                                                                  │
│  UI (HTML)  →  apiClient.*  →  syncManager.request()           │
│                                                                  │
│  Offline: localStorage                                          │
│  Online:  fetch() → servidor                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SERVIDOR (Node.js)                           │
│                                                                  │
│  Express Routes:                                                │
│  • POST /inquilinos       →  query() → INSERT                   │
│  • GET /inquilinos/:id    →  query() → SELECT                   │
│  • PUT /inquilinos/:id    →  query() → UPDATE                   │
│  • DELETE /inquilinos/:id →  query() → DELETE                   │
│                                                                  │
│  (Similar para /inmuebles, /pagos-pendientes, etc)              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS (MySQL)                        │
│                                                                  │
│  Database: gohome_db                                            │
│                                                                  │
│  Tablas:                                                        │
│  • inmuebles                  ← Propiedades                      │
│  • inquilinos                 ← Residentes                       │
│  • pagos_pendientes           ← Pagos por cobrar                │
│  • pagos_incompletos          ← Pagos parciales                 │
│  • info_usuarios              ← Credenciales                    │
│  • papelera                   ← Datos eliminados                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tablas de la Base de Datos

### 1. inmuebles
Almacena las propiedades/casas

```sql
CREATE TABLE inmuebles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  N_casa INT NOT NULL UNIQUE,           ← ID de la casa
  direccion VARCHAR(300) NOT NULL,      ← Dirección completa
  sector VARCHAR(200) NOT NULL,         ← Barrio/Sector
  municipio VARCHAR(200) NOT NULL,      ← Ciudad/Municipio
  m_contruccion VARCHAR(100),           ← Metros construidos
  m_terreno VARCHAR(100),               ← Metros de terreno
  descripcion TEXT,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Acceso via API:**
```javascript
await apiClient.getInmuebles()
await apiClient.getInmueble(id)
await apiClient.createInmueble({ N_casa, direccion, sector, municipio })
await apiClient.updateInmueble(id, { ... })
await apiClient.deleteInmueble(id)
```

### 2. inquilinos
Almacena información de los residentes

```sql
CREATE TABLE inquilinos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  cedula VARCHAR(50) NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  fecha_ospedaje DATE NOT NULL,        ← Cuándo se mudó
  ingreso_mensual DECIMAL(12,2) NOT NULL,
  descripcion TEXT,
  pago DECIMAL(12,2) DEFAULT NULL,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  N_casa INT,                           ← FK a inmuebles
  direccion VARCHAR(300),
  
  FOREIGN KEY (N_casa) REFERENCES inmuebles(N_casa) ON DELETE SET NULL
);
```

**Acceso via API:**
```javascript
await apiClient.getInquilinos()
await apiClient.getInquilino(id)
await apiClient.createInquilino({ 
  nombre, cedula, telefono, fecha_ospedaje, 
  ingreso_mensual, N_casa 
})
await apiClient.updateInquilino(id, { ... })
await apiClient.deleteInquilino(id)
```

### 3. pagos_pendientes
Pagos que deben realizarse

```sql
CREATE TABLE pagos_pendientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_inquilino INT,
  monto DECIMAL(12,2),
  fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_inquilino) REFERENCES inquilinos(id) ON DELETE CASCADE
);
```

**Acceso via API:**
```javascript
await apiClient.getPagosPendientes()
await apiClient.createPagoPendiente({ id_inquilino, monto })
await apiClient.deletePagoPendiente(id)
```

### 4. pagos_incompletos
Pagos que no se completaron

```sql
CREATE TABLE pagos_incompletos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_inquilino INT,
  monto DECIMAL(12,2),
  fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT,
  metadata JSON,
  raw LONGTEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_inquilino) REFERENCES inquilinos(id) ON DELETE CASCADE
);
```

### 5. info_usuarios
Credenciales y datos de usuarios

```sql
CREATE TABLE info_usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120),
  apellido VARCHAR(120),
  N_usuario VARCHAR(100) UNIQUE,
  gmail VARCHAR(200),
  contrasena VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Acceso via API:**
```javascript
await apiClient.getUsuarios()
await apiClient.createUsuario({ nombre, apellido, N_usuario, gmail, contrasena })
await apiClient.loginUsuario({ N_usuario, contrasena })
```

### 6. papelera
Datos eliminados (backup)

```sql
CREATE TABLE papelera (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(50),              ← 'inquilino', 'inmueble', 'pago_pendiente'
  objeto JSON,                   ← Datos completos guardados como JSON
  eliminado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Cuando se elimina algo, se guarda aquí como backup antes de ser borrado.

---

## Configuración de Conexión (.env)

```env
DB_HOST=127.0.0.1           ← Servidor MySQL (local)
DB_PORT=3306                ← Puerto estándar MySQL
DB_USER=root                ← Usuario
DB_PASS=F9!qZ7@M#2sLxW8$   ← Contraseña
DB_NAME=gohome_db           ← Nombre de la base de datos
```

---

## Flujo de Sincronización de Datos

### Escenario 1: Crear Inquilino (ONLINE)

```
CLIENTE:
1. User fill form → "Guardar"
2. apiClient.createInquilino({nombre, cedula, ...})
3. syncManager.request('POST', '/inquilinos', data)
4. fetch() → success
5. localStorage: queue = []

SERVIDOR:
1. Recibe POST /inquilinos
2. Valida datos
3. query('INSERT INTO inquilinos (...) VALUES (...)')
4. Retorna { insertId: 123 }

BD (MySQL):
1. INSERT ejecutado
2. Nueva fila en tabla inquilinos
3. id = 123

CLIENTE:
1. Recibe respuesta exitosa
2. UI actualizada
3. Mensaje: ✅ Guardado
```

### Escenario 2: Crear Inquilino (OFFLINE)

```
CLIENTE:
1. User fill form → "Guardar"
2. apiClient.createInquilino({nombre, cedula, ...})
3. syncManager.request('POST', '/inquilinos', data)
4. fetch() → ERROR (sin conexión)
5. addToQueue({method: 'POST', endpoint: '/inquilinos', data})
6. localStorage['gohome_sync_queue'] = [{...}]
7. Retorna { success: false, queued: true }

UI:
1. Actualizada (sin error)
2. Usuario NO ve notificación

LUEGO (cuando hay conexión):
1. syncManager detecta onLine
2. startPeriodicSync cada 10s
3. Para cada item en queue:
   → fetch() → SERVIDOR
4. Si éxito: remover del queue
5. Si error: reintentar (max 5 veces)

CUANDO SE SINCRONIZA:
→ El flow es igual a Escenario 1
→ localStorage['gohome_sync_queue'] se limpia
```

---

## Pool de Conexiones MySQL

El servidor usa un pool para gestionar conexiones:

```javascript
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 5,              ← Max 5 conexiones simultáneas
  connectTimeout: 30000,           ← Timeout de 30s
  ssl: { rejectUnauthorized: false }
});
```

**Significa:**
- Máximo 5 peticiones simultáneas a BD
- Después de 30s sin respuesta, falla
- Las conexiones se reutilizan

---

## Relaciones entre Tablas

```
inmuebles (1)
    │
    ├──→ (N) inquilinos (mediante N_casa)
    │
    └──→ Inquilinos pueden estar vinculados a inmuebles
         OR tener dirección manual si no hay inmueble

inquilinos (1)
    │
    ├──→ (N) pagos_pendientes
    ├──→ (N) pagos_incompletos
    └──→ (1) papelera (cuando se elimina)
```

---

## Ejemplo Completo: Crear Inquilino Vinculado a Inmueble

### Frontend:
```javascript
// Usuario selecciona casa #101 y llena datos
const result = await apiClient.createInquilino({
  nombre: "Juan Pérez",
  cedula: "12345678",
  telefono: "3001234567",
  fecha_ospedaje: "2026-01-19",
  ingreso_mensual: 2000000,
  N_casa: 101  // ← Vinculado a inmueble
});
```

### Backend (server.js):
```javascript
app.post('/inquilinos', async (req, res) => {
  let { nombre, cedula, telefono, fecha_ospedaje, ingreso_mensual, N_casa } = req.body;
  
  // Si se proporciona N_casa, obtener dirección del inmueble
  if (N_casa != null) {
    const inmueble = await getInmuebleByNCasa(N_casa);
    if (!inmueble) {
      return res.status(400).json({ error: `No existe inmueble con N_casa = ${N_casa}` });
    }
    // Usar dirección del inmueble
    direccion = inmueble.direccion;
  }
  
  // INSERT
  const result = await query(
    `INSERT INTO inquilinos (nombre, cedula, telefono, direccion, fecha_ospedaje, 
                              ingreso_mensual, N_casa) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nombre, cedula, telefono, direccion, fecha_ospedaje, ingreso_mensual, N_casa]
  );
  
  res.status(201).json({ insertId: result.insertId, ... });
});
```

### Resultado en BD:
```sql
INSERT INTO inquilinos (
  nombre, cedula, telefono, direccion, fecha_ospedaje, ingreso_mensual, N_casa
) VALUES (
  'Juan Pérez', '12345678', '3001234567', 'Calle 5 #10-20', '2026-01-19', 
  2000000.00, 101
);
```

---

## Manejo de Errores de BD

El servidor intenta conectarse y retorna:

```javascript
// Éxito
res.status(200).json(result)

// Error (genera reintentos automáticos)
res.status(500).json({ error: 'Error leyendo inquilinos' })
```

El cliente (SyncManager) interpreta:
- **200-299**: ✅ Éxito → Remover del queue
- **400-499**: ❌ Error permanente → Mostrar error
- **500-599**: ⚠️ Error temporal → Reintentar (max 5 veces)

---

## Performance Tips

1. **Para grandes datasets:**
   - Usar paginación: `/inquilinos?page=1&limit=20`
   - Implementar en server.js si es necesario

2. **Para muchas peticiones:**
   - El pool tiene límite de 5 conexiones
   - Las peticiones esperan su turno (waitForConnections: true)

3. **Para reducir datos:**
   - Guardar en localStorage solo lo esencial
   - Sincronizar en background

4. **Para recuperación:**
   - Papelera guarda datos eliminados
   - Ver `papelera` table antes de perder datos

---

## Configuración para Producción

Cuando vayas a producción:

```env
# .env (ACTUALIZAR)
DB_HOST=tu.servidor.remoto.com
DB_PORT=3306
DB_USER=prod_user
DB_PASS=secure_password
DB_NAME=gohome_db_prod

FORCE_HTTPS=1
CORS_ORIGINS=https://tudominio.com

NODE_ENV=production
PORT=443
```

---

## Testing de Conexión BD

```javascript
// En server.js se valida automáticamente:
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Conectado a MySQL");
    conn.release();
  } catch (err) {
    console.error("❌ Error MySQL:", err.message);
  }
})();
```

Para verificar manualmente:

```bash
# En terminal (si tienes mysql client instalado)
mysql -h 127.0.0.1 -u root -p gohome_db
```

---

**Sistema BD ↔ Sincronización completamente integrado.** ✅
