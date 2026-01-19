-- Crear la base de datos gohome_db
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
  gmail VARCHAR(200) UNIQUE,
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

-- Tabla notification_history
CREATE TABLE IF NOT EXISTS notification_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(80),
  entity VARCHAR(80),
  entity_id INT,
  to_email VARCHAR(255),
  subject VARCHAR(255),
  meta JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
