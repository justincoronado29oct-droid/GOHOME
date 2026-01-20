# Configuración de Base de Datos - GoHome

## Requisitos
- MySQL Server 8.0 o superior
- Usuario `root` con contraseña: `F9!qZ7@M#2sLxW8$`

## Instalación

### Opción 1: Usando línea de comandos (Windows)

```bash
mysql -h 127.0.0.1 -u root -p"F9!qZ7@M#2sLxW8$" < database.sql
```

### Opción 2: Usando MySQL Workbench
1. Abre MySQL Workbench
2. Ve a File → Open SQL Script
3. Selecciona `database.sql`
4. Haz clic en el icono de ejecutar (rayo)

### Opción 3: Usando el script batch (Windows)

```bash
create_db.bat
```

## Configuración en .env

El archivo `.env` debe contener:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS="F9!qZ7@M#2sLxW8$"
DB_NAME=gohome_db
```

## Estructura de Base de Datos

### Tablas

#### `inmuebles`
- Almacena información de las propiedades
- Campos: id, N_casa, direccion, sector, municipio, m_contruccion, m_terreno, descripcion, fecha_registro

#### `inquilinos`
- Almacena información de los inquilinos
- Campos: id, nombre, cedula, telefono, fecha_ospedaje, ingreso_mensual, descripcion, pago, N_casa, direccion

#### `pagos_pendientes`
- Almacena pagos pendientes
- Campos: id, id_inquilino, monto, fecha_pago

#### `pagos_incompletos`
- Almacena pagos incompletos o parciales
- Campos: id, id_inquilino, monto, fecha_pago, usuario_id, metadata, raw, created_at

#### `info_usuarios`
- Almacena usuarios del sistema
- Campos: id, nombre, apellido, N_usuario, gmail, contrasena, created_at

#### `papelera`
- Almacena elementos eliminados (soft delete)
- Campos: id, tipo, objeto, eliminado_en

#### `notification_history`
- Almacena historial de notificaciones
- Campos: id, type, entity, entity_id, to_email, subject, meta, created_at

## Verificación

Para verificar que la base de datos fue creada correctamente:

```sql
USE gohome_db;
SHOW TABLES;
```

Deberías ver 7 tablas:
- inmuebles
- inquilinos
- pagos_pendientes
- pagos_incompletos
- info_usuarios
- papelera
- notification_history

## Resetear la Base de Datos

Para eliminar y recrear la base de datos desde cero:

```sql
DROP DATABASE IF EXISTS gohome_db;
```

Luego ejecuta el archivo `database.sql` nuevamente.
