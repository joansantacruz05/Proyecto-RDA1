-- Migración 003: Añadir columnas y restricciones para check-in presencial e idempotencia
ALTER TABLE reservas 
  ADD COLUMN IF NOT EXISTS "checkinRealizado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "checkinHora" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "earlyCheckinAutorizado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "idempotencyKey" UUID;

-- Índices de unicidad y rendimiento para reservas
CREATE UNIQUE INDEX IF NOT EXISTS uq_reservas_idempotency 
  ON reservas ("idempotencyKey", "usuarioId") 
  WHERE "idempotencyKey" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservas_espacio_fechas 
  ON reservas ("espacioId", "fechaEntrada", "fechaSalida") 
  WHERE "estadoId" IN ('EST-001', 'EST-002');

CREATE INDEX IF NOT EXISTS idx_reservas_checkin_realizado 
  ON reservas ("checkinRealizado") 
  WHERE "checkinRealizado" = true;

-- Tabla de persistencia para notificaciones salientes de check-in (Flujo 2)
CREATE TABLE IF NOT EXISTS checkin_notificaciones (
  id BIGSERIAL PRIMARY KEY,
  reserva_id VARCHAR(50) NOT NULL,
  external_order_id VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  intentos INT NOT NULL DEFAULT 0,
  ultimo_intento TIMESTAMPTZ,
  ultimo_error TEXT,
  http_status INT,
  publicado_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_checkin_notif_reserva 
  ON checkin_notificaciones (reserva_id);
