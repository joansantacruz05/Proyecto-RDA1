-- Migración 006: Trazabilidad del canal de origen de reservas (Booking Core vs Directa Web)
-- Permite distinguir reservas cobradas directamente en Booking Core ('BOOKING_HUB')
-- de las reservas cobradas/gestionadas directamente en LuxeStays ('WEB_DIRECT').

ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS "canalOrigen" VARCHAR(40);

UPDATE reservas r
SET "canalOrigen" = CASE
  WHEN EXISTS (
    SELECT 1 FROM pagos p WHERE p."reservaId" = r.id
  ) THEN 'WEB_DIRECT'
  WHEN EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = r."usuarioId"
      AND COALESCE(u.contrasena, '') <> 'EXTERNAL_JWT_USER'
      AND u.id NOT LIKE 'CLI-%'
  ) THEN 'WEB_DIRECT'
  ELSE 'BOOKING_HUB'
END
WHERE r."canalOrigen" IS NULL OR TRIM(r."canalOrigen") = '';

CREATE INDEX IF NOT EXISTS idx_reservas_canal_origen ON reservas ("canalOrigen");
