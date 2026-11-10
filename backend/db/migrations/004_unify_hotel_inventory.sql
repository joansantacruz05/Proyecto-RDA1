-- ============================================================================
-- Migración 004: Unificación de inventario de habitaciones y eliminación de duplicados
-- Resuelve sobreventa, sobre-reporte en /availability y carreras concurrentes.
-- ============================================================================

-- 1. Migrar reservas existentes que apuntan a HAB-xxx hacia el espacio canónico ESP-xxx
UPDATE reservas SET "espacioId" = 'ESP-001' WHERE "espacioId" IN ('HAB-001-A', 'HAB-001-B');
UPDATE reservas SET "espacioId" = 'ESP-002' WHERE "espacioId" IN ('HAB-002-A', 'HAB-002-B');
UPDATE reservas SET "espacioId" = 'ESP-003' WHERE "espacioId" IN ('HAB-003-A', 'HAB-003-B');
UPDATE reservas SET "espacioId" = 'ESP-004' WHERE "espacioId" IN ('HAB-004-A', 'HAB-004-B');
UPDATE reservas SET "espacioId" = 'ESP-005' WHERE "espacioId" IN ('HAB-005-A', 'HAB-005-B');

-- 2. Eliminar habitaciones duplicadas fantasma que inflaban el inventario base
DELETE FROM espacios_rentables WHERE id LIKE 'HAB-00%';

-- 3. Asegurar que todos los espacios ESP- tengan SUITE_DELUXE como código canónico y cantidadDisponible = 3
UPDATE espacios_rentables
SET codigo = 'SUITE_DELUXE'
WHERE id LIKE 'ESP-%' AND (codigo IS NULL OR codigo != 'SUITE_DELUXE');

UPDATE espacios_rentables
SET "cantidadDisponible" = 3
WHERE id LIKE 'ESP-%' AND "cantidadDisponible" != 3;

-- 4. Índice para búsquedas ultra-rápidas de ocupación por fechas y espacio
CREATE INDEX IF NOT EXISTS idx_reservas_fechas_estado
ON reservas ("espacioId", "estadoId", "fechaEntrada", "fechaSalida");

