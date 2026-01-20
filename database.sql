-- ============================================
-- GoHome Database Setup
-- Base de datos para gestión de inmuebles e inquilinos
-- ============================================

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS gohome_db;
USE gohome_db;

-- ============================================
-- TABLA: inmuebles
-- Almacena información de las propiedades
-- ============================================
CREATE TABLE IF NOT EXISTS inmuebles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  N_casa INT NOT NULL UNIQUE,
  direccion VARCHAR(300) NOT NULL,
  sector VARCHAR(200) NOT NULL,
  municipio VARCHAR(200) NOT NULL,
  m_contruccion VARCHAR(100),
  m_terreno VARCHAR(100),
  descripcion TEXT,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_N_casa (N_casa),
  INDEX idx_direccion (direccion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLA: inquilinos
-- Almacena información de los inquilinos
-- ============================================
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
  FOREIGN KEY (N_casa) REFERENCES inmuebles(N_casa) ON DELETE SET NULL,
  INDEX idx_nombre (nombre),
  INDEX idx_cedula (cedula),
  INDEX idx_N_casa (N_casa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLA: pagos_pendientes
-- Almacena pagos pendientes de inquilinos
-- ============================================
CREATE TABLE IF NOT EXISTS pagos_pendientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_inquilino INT,
  monto DECIMAL(12,2),
  fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_inquilino) REFERENCES inquilinos(id) ON DELETE CASCADE,
  INDEX idx_id_inquilino (id_inquilino)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLA: pagos_incompletos
-- Almacena pagos incompletos o parciales
-- ============================================
CREATE TABLE IF NOT EXISTS pagos_incompletos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_inquilino INT,
  monto DECIMAL(12,2),
  fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT,
  metadata JSON,
  raw LONGTEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_inquilino) REFERENCES inquilinos(id) ON DELETE CASCADE,
  INDEX idx_id_inquilino (id_inquilino),
  INDEX idx_usuario_id (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLA: info_usuarios
-- Almacena información de usuarios del sistema
-- ============================================
CREATE TABLE IF NOT EXISTS info_usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120),
  apellido VARCHAR(120),
  N_usuario VARCHAR(100) UNIQUE,
  gmail VARCHAR(200) UNIQUE,
  contrasena VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_N_usuario (N_usuario),
  INDEX idx_gmail (gmail)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLA: papelera
-- Almacena elementos eliminados (soft delete)
-- ============================================
CREATE TABLE IF NOT EXISTS papelera (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(50),
  objeto JSON,
  eliminado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tipo (tipo),
  INDEX idx_eliminado_en (eliminado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLA: notification_history
-- Almacena historial de notificaciones
-- ============================================
CREATE TABLE IF NOT EXISTS notification_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(80),
  entity VARCHAR(80),
  entity_id INT,
  to_email VARCHAR(255),
  subject VARCHAR(255),
  meta JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_entity (entity),
  INDEX idx_to_email (to_email),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Verificación final
-- ============================================
SELECT 'Base de datos gohome_db creada correctamente' AS Status;
SELECT COUNT(*) as total_tables FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'gohome_db';
SHOW TABLES;
