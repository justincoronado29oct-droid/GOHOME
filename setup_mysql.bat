@echo off
REM Script para configurar MySQL para GOHOME
REM Este script ayuda a crear la BD y el usuario necesarios

echo.
echo ========================================
echo  CONFIGURACION DE MYSQL PARA GOHOME
echo ========================================
echo.

setlocal enabledelayedexpansion

REM Pedir credenciales de MySQL
echo Ingresa tus credenciales de MySQL:
set /p MYSQL_ROOT_USER="Usuario de MySQL (por defecto root): " || set "MYSQL_ROOT_USER=root"
set /p MYSQL_ROOT_PASS="Contraseña de MySQL: "

echo.
echo Conectando a MySQL...
echo.

REM Crear la BD y ejecutar SQL
echo Ejecutando comandos SQL...

mysql -h 127.0.0.1 -u %MYSQL_ROOT_USER% -p%MYSQL_ROOT_PASS% << EOF

CREATE DATABASE IF NOT EXISTS gohome_db;
USE gohome_db;

-- Tabla inmuebles
CREATE TABLE IF NOT EXISTS inmuebles (
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
CREATE TABLE IF NOT EXISTS inquilinos (
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
CREATE TABLE IF NOT EXISTS pagos_pendientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_inquilino INT,
  monto DECIMAL(12,2),
  fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_inquilino) REFERENCES inquilinos(id) ON DELETE CASCADE
);

-- Tabla pagos_incompletos
CREATE TABLE IF NOT EXISTS pagos_incompletos (
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
CREATE TABLE IF NOT EXISTS info_usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120),
  apellido VARCHAR(120),
  N_usuario VARCHAR(100) UNIQUE,
  gmail VARCHAR(200),
  contrasena VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla papelera
CREATE TABLE IF NOT EXISTS papelera (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(50),
  objeto JSON,
  eliminado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

SHOW TABLES;
SELECT 'Tablas creadas exitosamente!' AS Estado;

EOF

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Base de datos creada exitosamente
    echo.
    echo Ahora actualiza el archivo .env con:
    echo   DB_USER=%MYSQL_ROOT_USER%
    echo   DB_PASS=(tu contraseña de MySQL)
    echo.
    echo Luego ejecuta: npm start
) else (
    echo.
    echo ❌ Error al crear la base de datos
    echo Verifica que:
    echo   1. MySQL está corriendo
    echo   2. Usuario y contraseña son correctos
    echo   3. Tienes permisos para crear BDs
    echo.
)

pause
