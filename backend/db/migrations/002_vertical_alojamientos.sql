-- ============================================================================
-- MIGRACIÓN 002: VERTICAL ALOJAMIENTOS, CÓDIGOS STABLE, TRIBUTOS Y OUTBOX gRPC
-- Proyecto: LuxeStays (Integración Booking Prototipo)
-- Idempotente: Puede ejecutarse múltiples veces de forma segura
-- ============================================================================

-- 1. Códigos unívocos y horarios de check-in / check-out
ALTER TABLE public.alojamientos ADD COLUMN IF NOT EXISTS codigo varchar;
ALTER TABLE public.alojamientos ADD COLUMN IF NOT EXISTS "horaCheckIn" time NOT NULL DEFAULT '14:00';
ALTER TABLE public.alojamientos ADD COLUMN IF NOT EXISTS "horaCheckOut" time NOT NULL DEFAULT '11:00';

ALTER TABLE public.espacios_rentables ADD COLUMN IF NOT EXISTS codigo varchar;

-- Rellenar códigos estables predeterminados para registros existentes si aún no tienen
UPDATE public.alojamientos 
SET codigo = 'HTL-UIO-' || LPAD(COALESCE(SUBSTRING(id FROM '[0-9]+'), '001'), 3, '0')
WHERE codigo IS NULL;

UPDATE public.espacios_rentables 
SET codigo = 'HAB_' || LPAD(COALESCE(SUBSTRING(id FROM '[0-9]+'), '001'), 3, '0')
WHERE codigo IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_alojamientos_codigo ON public.alojamientos(codigo);
CREATE UNIQUE INDEX IF NOT EXISTS uq_espacios_codigo ON public.espacios_rentables("alojamientoId", codigo);

-- 2. Desglose fiscal exacto en reservas
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS subtotal numeric(12,2);
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS iva numeric(12,2);
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS "tasaMunicipal" numeric(12,2);
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS moneda varchar(3) NOT NULL DEFAULT 'USD';
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS "correlationId" varchar;

-- 3. Tasa municipal en facturación
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS "tasaMunicipal" numeric(12,2) NOT NULL DEFAULT 0;

-- 4. Tabla Outbox para tolerancia a fallos en sincronización gRPC hacia Booking
CREATE TABLE IF NOT EXISTS public.stock_outbox (
  id varchar PRIMARY KEY,
  "itemId" varchar NOT NULL,
  fecha date NOT NULL,
  unidades int NOT NULL,
  ts bigint NOT NULL,
  estado varchar NOT NULL DEFAULT 'Pendiente',
  intentos int NOT NULL DEFAULT 0,
  "ultimoError" text,
  "creadoEn" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de registro de eventos Webhooks recibidos
CREATE TABLE IF NOT EXISTS public.webhook_eventos (
  id varchar PRIMARY KEY,
  tipo varchar,
  cuerpo jsonb NOT NULL,
  "recibidoEn" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Habilitar RLS en tablas nuevas
ALTER TABLE public.stock_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_eventos ENABLE ROW LEVEL SECURITY;
