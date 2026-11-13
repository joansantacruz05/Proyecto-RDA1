-- ============================================================================
-- Migración 007: Estado 'En Limpieza' exclusivo por habitación (espacios_rentables)
-- ============================================================================
-- Al completar check-out, solo la habitación ocupada pasa a 'En Limpieza';
-- el alojamiento permanece 'Activo' (En Línea) para sus demás habitaciones.

UPDATE alojamientos
SET estado = 'Activo',
    "enLimpiezaDesde" = NULL
WHERE estado = 'En Limpieza';

CREATE OR REPLACE VIEW vista_dashboard_admin AS
SELECT
  (SELECT count(*) FROM alojamientos WHERE estado::text = 'Activo'::text) AS total_alojamientos,
  (SELECT count(*) FROM reservas WHERE "estadoId"::text = ANY (ARRAY['EST-001'::varchar, 'EST-002'::varchar]::text[]) AND "fechaSalida" >= CURRENT_DATE AND COALESCE("checkoutRealizado", false) = false) AS reservas_activas,
  (SELECT COALESCE(sum(pagos.monto), 0::numeric) FROM pagos WHERE pagos.estado::text = 'Completado'::text) AS ingresos_totales,
  (SELECT count(*) FROM alojamientos WHERE estado::text = 'En Limpieza'::text) AS alojamientos_en_limpieza,
  (SELECT count(*) FROM espacios_rentables WHERE estado::text = 'En Limpieza'::text) AS habitaciones_en_limpieza;

