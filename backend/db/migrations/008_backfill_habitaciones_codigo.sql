-- ============================================================================
-- Migración 008: Backfill de códigos estándar en habitaciones y alojamientos
-- ============================================================================
-- Garantiza que espacios_rentables y alojamientos cuenten con códigos no nulos
-- ('SUITE_DELUXE' / id) para resolver cotización 1:1 desde Booking Core.

UPDATE espacios_rentables
SET codigo = 'SUITE_DELUXE'
WHERE codigo IS NULL OR TRIM(codigo) = '';

UPDATE alojamientos
SET codigo = id
WHERE codigo IS NULL OR TRIM(codigo) = '';

