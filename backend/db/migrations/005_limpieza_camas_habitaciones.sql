-- ============================================================================
-- Migración 005: Estado 'En Limpieza', 'Finalizada', y gestión por camas y habitaciones
-- ============================================================================

-- 1. Registrar estados de ciclo post-estancia en la tabla catálogo estados_reserva
INSERT INTO estados_reserva (id, nombre) VALUES
  ('EST-004', 'En Limpieza'),
  ('EST-005', 'Finalizada')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- 2. Seguimiento de finalización de limpieza en reservas
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS "limpiezaCompletada" BOOLEAN NOT NULL DEFAULT false;

-- 3. Atributos físicos y marca temporal de limpieza en alojamientos
ALTER TABLE alojamientos
  ADD COLUMN IF NOT EXISTS "enLimpiezaDesde" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "numHabitaciones" INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "numCamas" INT NOT NULL DEFAULT 1;

-- 4. Atributos por habitaciones físicas y camas en espacios_rentables
ALTER TABLE espacios_rentables
  ADD COLUMN IF NOT EXISTS "numHabitaciones" INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "numCamas" INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "tipoCamas" VARCHAR(100) NOT NULL DEFAULT '1 Cama Doble / Queen',
  ADD COLUMN IF NOT EXISTS "enLimpiezaDesde" TIMESTAMPTZ;

-- 5. Inicializar camas descriptivas en espacios existentes que aún tienen el default genérico
UPDATE espacios_rentables
SET "numHabitaciones" = GREATEST(COALESCE("numHabitaciones", 1), 1),
    "numCamas" = CASE
      WHEN COALESCE("capacidadAdultos", 1) + COALESCE("capacidadNinos", 0) >= 4 THEN 2
      ELSE 1
    END,
    "tipoCamas" = CASE
      WHEN COALESCE("capacidadAdultos", 1) + COALESCE("capacidadNinos", 0) >= 4 THEN '2 Camas Queen / Dobles'
      WHEN COALESCE("capacidadAdultos", 1) >= 2 THEN '1 Cama King / Queen'
      ELSE '1 Cama Sencilla'
    END
WHERE "tipoCamas" = '1 Cama Doble / Queen';

-- 6. Sincronizar totales de habitaciones físicas y camas hacia alojamientos
UPDATE alojamientos a
SET "numHabitaciones" = COALESCE(s.total_habs, 1),
    "numCamas" = COALESCE(s.total_camas, 1)
FROM (
  SELECT "alojamientoId",
         GREATEST(SUM(COALESCE("numHabitaciones", 1))::int, 1) AS total_habs,
         GREATEST(SUM(COALESCE("numCamas", 1))::int, 1) AS total_camas
  FROM espacios_rentables
  GROUP BY "alojamientoId"
) s
WHERE s."alojamientoId" = a.id;

-- 7. Vista del dashboard admin (mantiene el orden exacto de las columnas existentes)
CREATE OR REPLACE VIEW vista_dashboard_admin AS
SELECT
  (SELECT count(*) FROM alojamientos WHERE estado::text = 'Activo'::text) AS total_alojamientos,
  (SELECT count(*) FROM reservas WHERE "estadoId"::text = ANY (ARRAY['EST-001'::varchar, 'EST-002'::varchar]::text[]) AND "fechaSalida" >= CURRENT_DATE AND COALESCE("checkoutRealizado", false) = false) AS reservas_activas,
  (SELECT COALESCE(sum(pagos.monto), 0::numeric) FROM pagos WHERE pagos.estado::text = 'Completado'::text) AS ingresos_totales,
  (SELECT count(*) FROM alojamientos WHERE estado::text = 'En Limpieza'::text) AS alojamientos_en_limpieza;
