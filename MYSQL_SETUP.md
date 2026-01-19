# 🔧 CONFIGURACIÓN DE LA BASE DE DATOS

## El Problema

El servidor está intentando conectar a MySQL pero **no tiene credenciales válidas**. Vimos dos usuarios intentados:
- `JUSTIN` (contraseña: F9!qZ7@M#2sLxW8$)
- `root` (sin contraseña)

Ambos fallaron, lo que significa que necesitamos verificar qué usuario/contraseña tiene MySQL en tu sistema.

---

## 3 Soluciones

### ✅ OPCIÓN 1: Script Automático (RECOMENDADO)

1. Abre PowerShell en la carpeta del proyecto
2. Ejecuta:
```powershell
.\setup_mysql.bat
```

3. Sigue las instrucciones:
   - Te pedirá usuario y contraseña de MySQL
   - Creará automáticamente la BD
   - Te dirá cómo actualizar el `.env`

---

### ✅ OPCIÓN 2: Manual en MySQL Workbench

1. **Abre MySQL Workbench**

2. **Conecta a tu servidor local** (localhost:3306)

3. **Ejecuta este SQL:**
```sql
CREATE DATABASE IF NOT EXISTS gohome_db;
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

4. **Verifica que se crearon las tablas:**
```sql
SHOW TABLES;
```

Deberías ver: inmuebles, inquilinos, pagos_pendientes, pagos_incompletos, info_usuarios, papelera

5. **Anota tus credenciales:**
   - Usuario: (el que usaste para conectar)
   - Contraseña: (la que usaste)
   - Host: 127.0.0.1
   - Puerto: 3306
   - BD: gohome_db

---

### ✅ OPCIÓN 3: Command Line (MySQL CLI)

1. **Abre CMD o PowerShell**

2. **Conecta a MySQL:**
```bash
mysql -h 127.0.0.1 -u root -p
```
(Te pedirá la contraseña)

3. **Copia y pega el SQL de la OPCIÓN 2**

4. **Verifica:**
```sql
SHOW TABLES;
```

---

## Después de Crear la BD

### Paso 1: Actualiza el `.env`

Abre `c:\Users\justi\GOHOME\.env` y actualiza:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root              ← Tu usuario (puede ser root o JUSTIN)
DB_PASS=tu_contraseña    ← Tu contraseña (puede estar vacía)
DB_NAME=gohome_db
```

**Ejemplos:**
- Si usas `root` sin contraseña:
  ```env
  DB_USER=root
  DB_PASS=
  ```

- Si usas usuario `JUSTIN` con contraseña:
  ```env
  DB_USER=JUSTIN
  DB_PASS=F9!qZ7@M#2sLxW8$
  ```

### Paso 2: Inicia el Servidor

```bash
npm start
```

**Deberías ver:**
```
✅ Conectado a MySQL
Server ejecutándose en puerto 3001
```

### Paso 3: Prueba

En el navegador:
```
http://localhost:3001
```

O en consola:
```javascript
apiClient.getInquilinos()  // Debe funcionar
```

---

## 🆘 Si Algo Falla

### Error: "Can't connect to MySQL server"
→ MySQL no está corriendo
→ Inicia el servicio: `net start MySQL80` (en PowerShell como Admin)

### Error: "Access denied for user 'root'"
→ Contraseña incorrecta en `.env`
→ Verifica tu credencial real en MySQL

### Error: "database gohome_db doesn't exist"
→ No creaste la BD
→ Usa OPCIÓN 1, 2 o 3 para crearla

### Error: "table info_usuarios doesn't exist"
→ Las tablas no fueron creadas
→ Verifica que ejecutaste TODO el SQL

---

## 📋 Checklist

- [ ] BD `gohome_db` creada en MySQL
- [ ] Todas las 6 tablas creadas (inmuebles, inquilinos, etc)
- [ ] `.env` actualizado con credenciales correctas
- [ ] MySQL está corriendo
- [ ] `npm start` inicia sin errores de BD

---

## 🎯 Verificación Final

Si todo está bien, ejecuta:

```bash
npm start
```

Y deberías ver:
```
> gohome-server@1.0.0 start
> node server.js

✅ Conectado a MySQL
Server listening on port 3001
```

¡Sin errores de BD!

---

**Una vez hayas completado estos pasos, el sistema estará completamente funcional.** ✅
