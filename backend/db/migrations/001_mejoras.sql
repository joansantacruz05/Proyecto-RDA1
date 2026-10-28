-- ============================================================================
-- MIGRACIÓN 001: RESTAURACIÓN DE ESQUEMA RELACIONAL BASE, INTEGRIDAD, ÍNDICES Y RLS
-- Proyecto: LuxeStays (Proyecto RDA1)
-- Idempotente: Ejecutable múltiples veces sin errores ni duplicaciones
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Si existen vistas temporales que impiden escrituras o llaves foráneas, removerlas
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'reservas') THEN
    DROP VIEW public.reservas CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'espacios_rentables') THEN
    DROP VIEW public.espacios_rentables CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'alojamientos') THEN
    DROP VIEW public.alojamientos CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'idempotency_keys') THEN
    DROP VIEW public.idempotency_keys CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'webhook_subscriptions') THEN
    DROP VIEW public.webhook_subscriptions CASCADE;
  END IF;
END $$;

-- 2. Asegurar Tablas Relacionales Base
CREATE TABLE IF NOT EXISTS public.alojamientos (
    id VARCHAR(50) PRIMARY KEY,
    "anfitrionId" VARCHAR(50) REFERENCES public.usuarios(id) ON DELETE SET NULL,
    "tipoId" VARCHAR(50) REFERENCES public.tipos_alojamiento(id) ON DELETE SET NULL,
    "ubicacionId" VARCHAR(50) REFERENCES public.ubicaciones(id) ON DELETE SET NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'Activo',
    "imagenUrl" VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    "politicaCancelacion" TEXT DEFAULT 'Cancelación gratuita hasta 24 horas antes del check-in. Caso contrario se cobrará el 100% de la primera noche.'
);

CREATE TABLE IF NOT EXISTS public.alojamientos_servicios (
    "alojamientoId" VARCHAR(50) REFERENCES public.alojamientos(id) ON DELETE CASCADE,
    "servicioId" VARCHAR(50) REFERENCES public.servicios(id) ON DELETE CASCADE,
    PRIMARY KEY ("alojamientoId", "servicioId")
);

CREATE TABLE IF NOT EXISTS public.espacios_rentables (
    id VARCHAR(50) PRIMARY KEY,
    "alojamientoId" VARCHAR(50) REFERENCES public.alojamientos(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    "capacidadAdultos" INT NOT NULL DEFAULT 1,
    "capacidadNinos" INT NOT NULL DEFAULT 0,
    "precioPorNoche" DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
    "cantidadDisponible" INT NOT NULL DEFAULT 3,
    estado VARCHAR(20) DEFAULT 'Activo',
    "imagenesUrls" TEXT
);

CREATE TABLE IF NOT EXISTS public.reservas (
    id VARCHAR(50) PRIMARY KEY,
    "ordenId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuarioId" VARCHAR(50) REFERENCES public.usuarios(id) ON DELETE CASCADE,
    "espacioId" VARCHAR(50) REFERENCES public.espacios_rentables(id) ON DELETE CASCADE,
    "estadoId" VARCHAR(50) REFERENCES public.estados_reserva(id) ON DELETE RESTRICT,
    "fechaEntrada" DATE NOT NULL,
    "fechaSalida" DATE NOT NULL,
    "precioTotal" DECIMAL(10, 2) NOT NULL,
    "fechaCreacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numeroPersonas" INT DEFAULT 1,
    calificacion INT,
    comentario TEXT
);

CREATE TABLE IF NOT EXISTS public.contratos (
    id VARCHAR(50) PRIMARY KEY,
    "reservaId" VARCHAR(50) REFERENCES public.reservas(id) ON DELETE CASCADE,
    terminos TEXT NOT NULL,
    firmado BOOLEAN DEFAULT false,
    "fechaFirma" TIMESTAMP
);

-- Asegurar columnas en tablas existentes si faltaban
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS edad INT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS pais VARCHAR(100);

ALTER TABLE public.alojamientos ADD COLUMN IF NOT EXISTS "politicaCancelacion" TEXT DEFAULT 'Cancelación gratuita hasta 24 horas antes del check-in. Caso contrario se cobrará el 100% de la primera noche.';
ALTER TABLE public.alojamientos ADD COLUMN IF NOT EXISTS "imagenUrl" VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';

ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS "ordenId" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS "numeroPersonas" INT DEFAULT 1;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS calificacion INT;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS comentario TEXT;

-- 3. Restricciones de integridad en reservas
ALTER TABLE public.reservas DROP CONSTRAINT IF EXISTS chk_reservas_fechas;
ALTER TABLE public.reservas ADD CONSTRAINT chk_reservas_fechas CHECK ("fechaSalida" > "fechaEntrada");

ALTER TABLE public.reservas DROP CONSTRAINT IF EXISTS chk_reservas_calificacion;
ALTER TABLE public.reservas ADD CONSTRAINT chk_reservas_calificacion CHECK (calificacion IS NULL OR calificacion BETWEEN 1 AND 5);

-- 4. Índices para consultas de alta concurrencia
CREATE UNIQUE INDEX IF NOT EXISTS uq_reservas_orden ON public.reservas("ordenId");
CREATE INDEX IF NOT EXISTS idx_reservas_usuario ON public.reservas("usuarioId");
CREATE INDEX IF NOT EXISTS idx_reservas_espacio_fechas ON public.reservas("espacioId", "fechaEntrada", "fechaSalida");
CREATE INDEX IF NOT EXISTS idx_espacios_alojamiento ON public.espacios_rentables("alojamientoId");
CREATE INDEX IF NOT EXISTS idx_pagos_reserva ON public.pagos("reservaId");

-- 5. Un solo pago completado por reserva
CREATE UNIQUE INDEX IF NOT EXISTS uq_pago_completado_por_reserva
  ON public.pagos("reservaId") WHERE estado = 'Completado';

-- 6. Método de pago Efectivo faltante
INSERT INTO public.metodos_pago (id, nombre, estado) 
VALUES ('MET-005', 'Efectivo', 'Activo') 
ON CONFLICT (id) DO UPDATE SET estado = 'Activo';

-- 7. Secuencia para numeración secuencial de facturas electrónicas SRI
CREATE SEQUENCE IF NOT EXISTS seq_numero_factura START 1;

-- 8. Tabla de Idempotencia estricta con nombres camelCase entre comillas
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  llave uuid NOT NULL,
  "usuarioId" varchar NOT NULL,
  endpoint varchar NOT NULL,
  "hashCuerpo" varchar NOT NULL,
  respuesta jsonb,
  status int,
  "creadoEn" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (llave, "usuarioId", endpoint)
);

-- 9. Vista del dashboard corregida (excluye canceladas y cuenta activas reales)
CREATE OR REPLACE VIEW public.vista_dashboard_admin AS
SELECT
  (SELECT COUNT(*) FROM public.alojamientos WHERE estado = 'Activo') AS total_alojamientos,
  (SELECT COUNT(*) FROM public.reservas WHERE "estadoId" IN ('EST-001','EST-002') AND "fechaSalida" >= CURRENT_DATE) AS reservas_activas,
  (SELECT COALESCE(SUM(monto), 0) FROM public.pagos WHERE estado = 'Completado') AS ingresos_totales;

-- 10. Seguridad: Habilitar Row Level Security (RLS) en todas las tablas públicas
DO $$ 
DECLARE 
  t text; 
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
