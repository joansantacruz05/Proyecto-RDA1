-- =========================================================================
-- SCRIPT DE CREACIÓN DE TABLAS (ESQUEMA RELACIONAL RDA1)
-- Ejecutar en el SQL Editor de Supabase
-- =========================================================================

-- ¡ATENCIÓN! Esto borrará las tablas existentes para evitar conflictos
DROP TABLE IF EXISTS HISTORIAL_RESERVAS CASCADE;
DROP TABLE IF EXISTS RESERVAS CASCADE;
DROP TABLE IF EXISTS ESTADOS_RESERVA CASCADE;
DROP TABLE IF EXISTS ESPACIOS_RENTABLES CASCADE;
DROP TABLE IF EXISTS ALOJAMIENTOS_SERVICIOS CASCADE;
DROP TABLE IF EXISTS ALOJAMIENTOS CASCADE;
DROP TABLE IF EXISTS SERVICIOS CASCADE;
DROP TABLE IF EXISTS TIPOS_ALOJAMIENTO CASCADE;
DROP TABLE IF EXISTS USUARIOS_ROLES CASCADE;
DROP TABLE IF EXISTS USUARIOS CASCADE;
DROP TABLE IF EXISTS ROLES CASCADE;
DROP TABLE IF EXISTS UBICACIONES CASCADE;
DROP TABLE IF EXISTS CIUDADES CASCADE;
DROP TABLE IF EXISTS PAISES CASCADE;

-- 1. PAISES
CREATE TABLE PAISES (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL
);

-- 2. CIUDADES
CREATE TABLE CIUDADES (
    id VARCHAR(50) PRIMARY KEY,
    "paisId" VARCHAR(50) REFERENCES PAISES(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL
);

-- 3. UBICACIONES
CREATE TABLE UBICACIONES (
    id VARCHAR(50) PRIMARY KEY,
    "ciudadId" VARCHAR(50) REFERENCES CIUDADES(id) ON DELETE CASCADE,
    direccion_detallada TEXT NOT NULL,
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION
);

-- 4. ROLES
CREATE TABLE ROLES (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- 5. USUARIOS
CREATE TABLE USUARIOS (
    id VARCHAR(50) PRIMARY KEY,
    "nombreCompleto" VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(50),
    contrasena VARCHAR(255) NOT NULL
);

-- 6. USUARIOS_ROLES
CREATE TABLE USUARIOS_ROLES (
    "usuarioId" VARCHAR(50) REFERENCES USUARIOS(id) ON DELETE CASCADE,
    "rolId" VARCHAR(50) REFERENCES ROLES(id) ON DELETE CASCADE,
    PRIMARY KEY ("usuarioId", "rolId")
);

-- 7. TIPOS_ALOJAMIENTO
CREATE TABLE TIPOS_ALOJAMIENTO (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- 8. SERVICIOS
CREATE TABLE SERVICIOS (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    icono VARCHAR(100)
);

-- 9. ALOJAMIENTOS
CREATE TABLE ALOJAMIENTOS (
    id VARCHAR(50) PRIMARY KEY,
    "anfitrionId" VARCHAR(50) REFERENCES USUARIOS(id) ON DELETE SET NULL,
    "tipoId" VARCHAR(50) REFERENCES TIPOS_ALOJAMIENTO(id) ON DELETE SET NULL,
    "ubicacionId" VARCHAR(50) REFERENCES UBICACIONES(id) ON DELETE SET NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT
);

-- 10. ALOJAMIENTOS_SERVICIOS
CREATE TABLE ALOJAMIENTOS_SERVICIOS (
    "alojamientoId" VARCHAR(50) REFERENCES ALOJAMIENTOS(id) ON DELETE CASCADE,
    "servicioId" VARCHAR(50) REFERENCES SERVICIOS(id) ON DELETE CASCADE,
    PRIMARY KEY ("alojamientoId", "servicioId")
);

-- 11. ESPACIOS_RENTABLES
CREATE TABLE ESPACIOS_RENTABLES (
    id VARCHAR(50) PRIMARY KEY,
    "alojamientoId" VARCHAR(50) REFERENCES ALOJAMIENTOS(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    "capacidadAdultos" INT NOT NULL,
    "capacidadNinos" INT NOT NULL,
    "precioPorNoche" DECIMAL(10, 2) NOT NULL,
    "cantidadDisponible" INT NOT NULL
);

-- 12. ESTADOS_RESERVA
CREATE TABLE ESTADOS_RESERVA (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- 13. RESERVAS
CREATE TABLE RESERVAS (
    id VARCHAR(50) PRIMARY KEY,
    "usuarioId" VARCHAR(50) REFERENCES USUARIOS(id) ON DELETE SET NULL,
    "espacioId" VARCHAR(50) REFERENCES ESPACIOS_RENTABLES(id) ON DELETE SET NULL,
    "estadoId" VARCHAR(50) REFERENCES ESTADOS_RESERVA(id) ON DELETE SET NULL,
    "fechaEntrada" DATE NOT NULL,
    "fechaSalida" DATE NOT NULL,
    "precioTotal" DECIMAL(10, 2) NOT NULL
);

-- 14. HISTORIAL_RESERVAS
CREATE TABLE HISTORIAL_RESERVAS (
    id VARCHAR(50) PRIMARY KEY,
    "reservaId" VARCHAR(50) REFERENCES RESERVAS(id) ON DELETE CASCADE,
    "estadoAnteriorId" VARCHAR(50) REFERENCES ESTADOS_RESERVA(id) ON DELETE SET NULL,
    "estadoNuevoId" VARCHAR(50) REFERENCES ESTADOS_RESERVA(id) ON DELETE SET NULL,
    "fechaCambio" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notas TEXT
);

-- =========================================================================
-- SCRIPT DE INSERCIÓN DE DATOS
-- =========================================================================

-- 1. PAISES
INSERT INTO PAISES (id, nombre) VALUES ('PAI-001', 'Ecuador');

-- 2. CIUDADES
INSERT INTO CIUDADES (id, "paisId", nombre) VALUES 
('CIU-001', 'PAI-001', 'Quito'),
('CIU-002', 'PAI-001', 'Guayaquil'),
('CIU-003', 'PAI-001', 'Cuenca'),
('CIU-004', 'PAI-001', 'Manta'),
('CIU-005', 'PAI-001', 'Baños');

-- 3. TIPOS DE ALOJAMIENTO
INSERT INTO TIPOS_ALOJAMIENTO (id, nombre) VALUES 
('TIP-001', 'Hotel'),
('TIP-002', 'Hostal'),
('TIP-003', 'Airbnb (Casa)'),
('TIP-004', 'Airbnb (Departamento)'),
('TIP-005', 'Resort');

-- 4. ROLES
INSERT INTO ROLES (id, nombre) VALUES 
('ROL-001', 'Anfitrión'),
('ROL-002', 'Cliente'),
('ROL-003', 'Admin');

-- 5. USUARIOS (Anfitriones y Admin)
-- La contraseña por defecto para estos usuarios es "123456" (hasheada con bcrypt)
INSERT INTO USUARIOS (id, "nombreCompleto", email, telefono, contrasena) VALUES 
('USU-001', 'Sebastian Admin', 'admin@rda.com', '0999999999', '$2a$10$xWw7T5HqjZ7Q7kX2v1V4.ejhO5K/Xq7M/r2L/9Q1V5V0m/m5.n2K'), 
('USU-002', 'Host Ecuador', 'host@ecuador.com', '0988888888', '$2a$10$xWw7T5HqjZ7Q7kX2v1V4.ejhO5K/Xq7M/r2L/9Q1V5V0m/m5.n2K');

-- Asignar Roles
INSERT INTO USUARIOS_ROLES ("usuarioId", "rolId") VALUES 
('USU-001', 'ROL-003'), -- Es Admin
('USU-002', 'ROL-001'); -- Es Anfitrión

-- 6. SERVICIOS
INSERT INTO SERVICIOS (id, nombre, icono) VALUES 
('SER-001', 'Piscina', 'pool'),
('SER-002', 'Wi-Fi', 'wifi'),
('SER-003', 'Parqueadero', 'car'),
('SER-004', 'Aire Acondicionado', 'wind'),
('SER-005', 'Pet Friendly', 'dog');

-- 7. ESTADOS RESERVA
INSERT INTO ESTADOS_RESERVA (id, nombre) VALUES 
('EST-001', 'Pendiente'),
('EST-002', 'Confirmada'),
('EST-003', 'Cancelada');

-- 8. UBICACIONES
INSERT INTO UBICACIONES (id, "ciudadId", direccion_detallada, latitud, longitud) VALUES 
('UBI-001', 'CIU-002', 'Calle Principal 1, Guayaquil', -0.210, -78.490),
('UBI-002', 'CIU-003', 'Calle Principal 2, Cuenca', -0.211, -78.491),
('UBI-003', 'CIU-004', 'Calle Principal 3, Manta', -0.212, -78.492),
('UBI-004', 'CIU-005', 'Calle Principal 4, Baños', -0.213, -78.493),
('UBI-005', 'CIU-001', 'Calle Principal 5, Quito', -0.214, -78.494),
('UBI-006', 'CIU-002', 'Calle Principal 6, Guayaquil', -0.215, -78.495),
('UBI-007', 'CIU-003', 'Calle Principal 7, Cuenca', -0.216, -78.496),
('UBI-008', 'CIU-004', 'Calle Principal 8, Manta', -0.217, -78.497),
('UBI-009', 'CIU-005', 'Calle Principal 9, Baños', -0.218, -78.498),
('UBI-010', 'CIU-001', 'Calle Principal 10, Quito', -0.219, -78.499),
('UBI-011', 'CIU-002', 'Calle Principal 11, Guayaquil', -0.2110, -78.4910),
('UBI-012', 'CIU-003', 'Calle Principal 12, Cuenca', -0.2111, -78.4911),
('UBI-013', 'CIU-004', 'Calle Principal 13, Manta', -0.2112, -78.4912),
('UBI-014', 'CIU-005', 'Calle Principal 14, Baños', -0.2113, -78.4913),
('UBI-015', 'CIU-001', 'Calle Principal 15, Quito', -0.2114, -78.4914),
('UBI-016', 'CIU-002', 'Calle Principal 16, Guayaquil', -0.2115, -78.4915),
('UBI-017', 'CIU-003', 'Calle Principal 17, Cuenca', -0.2116, -78.4916),
('UBI-018', 'CIU-004', 'Calle Principal 18, Manta', -0.2117, -78.4917),
('UBI-019', 'CIU-005', 'Calle Principal 19, Baños', -0.2118, -78.4918),
('UBI-020', 'CIU-001', 'Calle Principal 20, Quito', -0.2119, -78.4919),
('UBI-021', 'CIU-002', 'Calle Principal 21, Guayaquil', -0.2120, -78.4920),
('UBI-022', 'CIU-003', 'Calle Principal 22, Cuenca', -0.2121, -78.4921),
('UBI-023', 'CIU-004', 'Calle Principal 23, Manta', -0.2122, -78.4922),
('UBI-024', 'CIU-005', 'Calle Principal 24, Baños', -0.2123, -78.4923),
('UBI-025', 'CIU-001', 'Calle Principal 25, Quito', -0.2124, -78.4924);

-- 9. ALOJAMIENTOS
INSERT INTO ALOJAMIENTOS (id, "anfitrionId", "tipoId", "ubicacionId", nombre, descripcion) VALUES 
('ALO-001', 'USU-002', 'TIP-002', 'UBI-001', 'Hostal RDA 1 - Guayaquil', 'Excelente hostal ubicado en Guayaquil con todas las comodidades. Numero 1.'),
('ALO-002', 'USU-001', 'TIP-003', 'UBI-002', 'Villa RDA 2 - Cuenca', 'Excelente villa ubicado en Cuenca con todas las comodidades. Numero 2.'),
('ALO-003', 'USU-002', 'TIP-004', 'UBI-003', 'Departamento RDA 3 - Manta', 'Excelente departamento ubicado en Manta con todas las comodidades. Numero 3.'),
('ALO-004', 'USU-001', 'TIP-005', 'UBI-004', 'Resort RDA 4 - Baños', 'Excelente resort ubicado en Baños con todas las comodidades. Numero 4.'),
('ALO-005', 'USU-002', 'TIP-001', 'UBI-005', 'Hotel RDA 5 - Quito', 'Excelente hotel ubicado en Quito con todas las comodidades. Numero 5.'),
('ALO-006', 'USU-001', 'TIP-002', 'UBI-006', 'Hostal RDA 6 - Guayaquil', 'Excelente hostal ubicado en Guayaquil con todas las comodidades. Numero 6.'),
('ALO-007', 'USU-002', 'TIP-003', 'UBI-007', 'Villa RDA 7 - Cuenca', 'Excelente villa ubicado en Cuenca con todas las comodidades. Numero 7.'),
('ALO-008', 'USU-001', 'TIP-004', 'UBI-008', 'Departamento RDA 8 - Manta', 'Excelente departamento ubicado en Manta con todas las comodidades. Numero 8.'),
('ALO-009', 'USU-002', 'TIP-005', 'UBI-009', 'Resort RDA 9 - Baños', 'Excelente resort ubicado en Baños con todas las comodidades. Numero 9.'),
('ALO-010', 'USU-001', 'TIP-001', 'UBI-010', 'Hotel RDA 10 - Quito', 'Excelente hotel ubicado en Quito con todas las comodidades. Numero 10.'),
('ALO-011', 'USU-002', 'TIP-002', 'UBI-011', 'Hostal RDA 11 - Guayaquil', 'Excelente hostal ubicado en Guayaquil con todas las comodidades. Numero 11.'),
('ALO-012', 'USU-001', 'TIP-003', 'UBI-012', 'Villa RDA 12 - Cuenca', 'Excelente villa ubicado en Cuenca con todas las comodidades. Numero 12.'),
('ALO-013', 'USU-002', 'TIP-004', 'UBI-013', 'Departamento RDA 13 - Manta', 'Excelente departamento ubicado en Manta con todas las comodidades. Numero 13.'),
('ALO-014', 'USU-001', 'TIP-005', 'UBI-014', 'Resort RDA 14 - Baños', 'Excelente resort ubicado en Baños con todas las comodidades. Numero 14.'),
('ALO-015', 'USU-002', 'TIP-001', 'UBI-015', 'Hotel RDA 15 - Quito', 'Excelente hotel ubicado en Quito con todas las comodidades. Numero 15.'),
('ALO-016', 'USU-001', 'TIP-002', 'UBI-016', 'Hostal RDA 16 - Guayaquil', 'Excelente hostal ubicado en Guayaquil con todas las comodidades. Numero 16.'),
('ALO-017', 'USU-002', 'TIP-003', 'UBI-017', 'Villa RDA 17 - Cuenca', 'Excelente villa ubicado en Cuenca con todas las comodidades. Numero 17.'),
('ALO-018', 'USU-001', 'TIP-004', 'UBI-018', 'Departamento RDA 18 - Manta', 'Excelente departamento ubicado en Manta con todas las comodidades. Numero 18.'),
('ALO-019', 'USU-002', 'TIP-005', 'UBI-019', 'Resort RDA 19 - Baños', 'Excelente resort ubicado en Baños con todas las comodidades. Numero 19.'),
('ALO-020', 'USU-001', 'TIP-001', 'UBI-020', 'Hotel RDA 20 - Quito', 'Excelente hotel ubicado en Quito con todas las comodidades. Numero 20.'),
('ALO-021', 'USU-002', 'TIP-002', 'UBI-021', 'Hostal RDA 21 - Guayaquil', 'Excelente hostal ubicado en Guayaquil con todas las comodidades. Numero 21.'),
('ALO-022', 'USU-001', 'TIP-003', 'UBI-022', 'Villa RDA 22 - Cuenca', 'Excelente villa ubicado en Cuenca con todas las comodidades. Numero 22.'),
('ALO-023', 'USU-002', 'TIP-004', 'UBI-023', 'Departamento RDA 23 - Manta', 'Excelente departamento ubicado en Manta con todas las comodidades. Numero 23.'),
('ALO-024', 'USU-001', 'TIP-005', 'UBI-024', 'Resort RDA 24 - Baños', 'Excelente resort ubicado en Baños con todas las comodidades. Numero 24.'),
('ALO-025', 'USU-002', 'TIP-001', 'UBI-025', 'Hotel RDA 25 - Quito', 'Excelente hotel ubicado en Quito con todas las comodidades. Numero 25.');

-- 10. ALOJAMIENTOS_SERVICIOS (2 servicios por alojamiento)
INSERT INTO ALOJAMIENTOS_SERVICIOS ("alojamientoId", "servicioId") VALUES 
('ALO-001', 'SER-001'),
('ALO-001', 'SER-002'),
('ALO-002', 'SER-002'),
('ALO-002', 'SER-003'),
('ALO-003', 'SER-003'),
('ALO-003', 'SER-004'),
('ALO-004', 'SER-004'),
('ALO-004', 'SER-005'),
('ALO-005', 'SER-005'),
('ALO-005', 'SER-001'),
('ALO-006', 'SER-001'),
('ALO-006', 'SER-002'),
('ALO-007', 'SER-002'),
('ALO-007', 'SER-003'),
('ALO-008', 'SER-003'),
('ALO-008', 'SER-004'),
('ALO-009', 'SER-004'),
('ALO-009', 'SER-005'),
('ALO-010', 'SER-005'),
('ALO-010', 'SER-001'),
('ALO-011', 'SER-001'),
('ALO-011', 'SER-002'),
('ALO-012', 'SER-002'),
('ALO-012', 'SER-003'),
('ALO-013', 'SER-003'),
('ALO-013', 'SER-004'),
('ALO-014', 'SER-004'),
('ALO-014', 'SER-005'),
('ALO-015', 'SER-005'),
('ALO-015', 'SER-001'),
('ALO-016', 'SER-001'),
('ALO-016', 'SER-002'),
('ALO-017', 'SER-002'),
('ALO-017', 'SER-003'),
('ALO-018', 'SER-003'),
('ALO-018', 'SER-004'),
('ALO-019', 'SER-004'),
('ALO-019', 'SER-005'),
('ALO-020', 'SER-005'),
('ALO-020', 'SER-001'),
('ALO-021', 'SER-001'),
('ALO-021', 'SER-002'),
('ALO-022', 'SER-002'),
('ALO-022', 'SER-003'),
('ALO-023', 'SER-003'),
('ALO-023', 'SER-004'),
('ALO-024', 'SER-004'),
('ALO-024', 'SER-005'),
('ALO-025', 'SER-005'),
('ALO-025', 'SER-001');

-- 11. ESPACIOS_RENTABLES (1 por alojamiento para simplificar)
INSERT INTO ESPACIOS_RENTABLES (id, "alojamientoId", nombre, "capacidadAdultos", "capacidadNinos", "precioPorNoche", "cantidadDisponible") VALUES 
('ESP-001', 'ALO-001', 'Habitacion/Espacio Estandar 1', 1, 2, 50.00, 3),
('ESP-002', 'ALO-002', 'Habitacion/Espacio Estandar 2', 2, 2, 60.00, 3),
('ESP-003', 'ALO-003', 'Habitacion/Espacio Estandar 3', 3, 2, 70.00, 3),
('ESP-004', 'ALO-004', 'Habitacion/Espacio Estandar 4', 4, 2, 80.00, 3),
('ESP-005', 'ALO-005', 'Habitacion/Espacio Estandar 5', 1, 2, 90.00, 3),
('ESP-006', 'ALO-006', 'Habitacion/Espacio Estandar 6', 2, 2, 100.00, 3),
('ESP-007', 'ALO-007', 'Habitacion/Espacio Estandar 7', 3, 2, 110.00, 3),
('ESP-008', 'ALO-008', 'Habitacion/Espacio Estandar 8', 4, 2, 120.00, 3),
('ESP-009', 'ALO-009', 'Habitacion/Espacio Estandar 9', 1, 2, 130.00, 3),
('ESP-010', 'ALO-010', 'Habitacion/Espacio Estandar 10', 2, 2, 140.00, 3),
('ESP-011', 'ALO-011', 'Habitacion/Espacio Estandar 11', 3, 2, 150.00, 3),
('ESP-012', 'ALO-012', 'Habitacion/Espacio Estandar 12', 4, 2, 160.00, 3),
('ESP-013', 'ALO-013', 'Habitacion/Espacio Estandar 13', 1, 2, 170.00, 3),
('ESP-014', 'ALO-014', 'Habitacion/Espacio Estandar 14', 2, 2, 180.00, 3),
('ESP-015', 'ALO-015', 'Habitacion/Espacio Estandar 15', 3, 2, 190.00, 3),
('ESP-016', 'ALO-016', 'Habitacion/Espacio Estandar 16', 4, 2, 200.00, 3),
('ESP-017', 'ALO-017', 'Habitacion/Espacio Estandar 17', 1, 2, 210.00, 3),
('ESP-018', 'ALO-018', 'Habitacion/Espacio Estandar 18', 2, 2, 220.00, 3),
('ESP-019', 'ALO-019', 'Habitacion/Espacio Estandar 19', 3, 2, 230.00, 3),
('ESP-020', 'ALO-020', 'Habitacion/Espacio Estandar 20', 4, 2, 240.00, 3),
('ESP-021', 'ALO-021', 'Habitacion/Espacio Estandar 21', 1, 2, 250.00, 3),
('ESP-022', 'ALO-022', 'Habitacion/Espacio Estandar 22', 2, 2, 260.00, 3),
('ESP-023', 'ALO-023', 'Habitacion/Espacio Estandar 23', 3, 2, 270.00, 3),
('ESP-024', 'ALO-024', 'Habitacion/Espacio Estandar 24', 4, 2, 280.00, 3),
('ESP-025', 'ALO-025', 'Habitacion/Espacio Estandar 25', 1, 2, 290.00, 3);

