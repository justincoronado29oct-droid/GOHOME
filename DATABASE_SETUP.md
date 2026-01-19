# 🗄️ INSTRUCCIONES DE CONEXIÓN A LA BASE DE DATOS

## Paso 1: Crear la Base de Datos

Abre MySQL Workbench o MySQL CLI y ejecuta los siguientes comandos:

```sql
CREATE DATABASE gohome_db;
USE gohome_db;

-- Tabla inmuebles
CREATE TABLE inmuebles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  N_casa INT NOT NULL UNIQUE,
  direccion VARCHAR(300) NOT NULL,
  sector VARCHAR(200) NOT NULL,
  municipio VARCHAR(200) NOT NULL,
  m_contruccion VARCHAR(100),
  m_terreno VARCHAR(100),
  descripcion TEXT,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla inquilinos
CREATE TABLE inquilinos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  cedula VARCHAR(50) NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  fecha_ospedaje DATE NOT NULL,
  ingreso_mensual DECIMAL(12,2) NOT NULL,
  descripcion TEXT,
  pago DECIMAL(12,2) DEFAULT NULL,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  N_casa INT,
  direccion VARCHAR(300),
  FOREIGN KEY (N_casa) REFERENCES inmuebles(N_casa) ON DELETE SET NULL
);

-- Tabla pagos_pendientes
CREATE TABLE pagos_pendientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_inquilino INT,
  monto DECIMAL(12,2),
  fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_inquilino) REFERENCES inquilinos(id) ON DELETE CASCADE
);

-- Tabla pagos_incompletos
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

-- Tabla info_usuarios
CREATE TABLE info_usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120),
  apellido VARCHAR(120),
  N_usuario VARCHAR(100) UNIQUE,
  gmail VARCHAR(200),
  contrasena VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla papelera
CREATE TABLE papelera (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(50),
  objeto JSON,
  eliminado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Paso 2: Actualizar credenciales en .env

Abre el archivo `.env` y actualiza:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=tu_contraseña_de_mysql    ← CAMBIAR ESTO
DB_NAME=gohome_db
```

**Donde `tu_contraseña_de_mysql` es la contraseña que configuraste para el usuario `root` de MySQL.**

## Paso 3: Iniciar el Servidor

Una vez actualizado el `.env`, ejecuta:

```bash
npm start
```

Deberías ver:
```
✅ Conectado a MySQL
Server ejecutándose en puerto 3001
```

## Paso 4: Verificar Conexión

En el navegador, ve a:
```
http://localhost:3001
```

O desde la consola:
```javascript
syncManager.getStatus()  // Debe funcionar
apiClient.getInquilinos()  // Debe retornar datos
```

---

## ❓ ¿Cuál es mi contraseña de MySQL?

Si no recuerdas tu contraseña, puedes:

1. **Resetear en MySQL Workbench:**
   - Abrir MySQL Workbench
   - Server → Users and Privileges
   - Seleccionar `root`
   - Click en "Reset Password"

2. **O crear un nuevo usuario:**
   ```sql
   CREATE USER 'gohome_user'@'localhost' IDENTIFIED BY 'nueva_contraseña';
   GRANT ALL PRIVILEGES ON gohome_db.* TO 'gohome_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
   Luego actualizar `.env`:
   ```
   DB_USER=gohome_user
   DB_PASS=nueva_contraseña
   ```

---

## Errores Comunes

### "Access denied for user 'root'"
→ Contraseña incorrecta en `.env`. Verifica que coincida con tu BD.

### "Can't connect to MySQL server"
→ MySQL no está corriendo. Inicia el servicio:
```bash
# Windows
net start MySQL80
# O busca "Servicios" y inicia MySQL
```

### "database gohome_db doesn't exist"
→ No creaste la BD. Ejecuta los comandos SQL del Paso 1.

---

**Una vez completados estos pasos, el servidor estará conectado a la BD.** ✅
