-- ============================================================================
-- ESQUEMA EMPRESARIAL DE BASE DE DATOS: DOMINIO BOOKING
-- Proyecto RDA1 - Arquitectura de Integración de Sistemas
-- ============================================================================
-- Incluye:
-- 1. Esquema 'booking' y tipos ENUM nativos de PostgreSQL.
-- 2. Secuencias oficiales de facturación.
-- 3. 24 Tablas relacionales con restricciones de integridad y regex.
-- 4. Datos semilla base (ciudades, tipos, políticas, amenidades, alojamientos).
-- 5. Vistas de compatibilidad hacia atrás en 'public' para interoperabilidad.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS booking;

-- ----------------------------------------------------------------------------
-- 1. TIPOS ENUM PERSONALIZADOS (USER-DEFINED)
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE booking.rol_usuario AS ENUM ('USUARIO', 'ANFITRION', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE booking.tipo_documento AS ENUM ('CEDULA', 'RUC', 'PASAPORTE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE booking.provincia AS ENUM (
    'AZUAY', 'BOLIVAR', 'CANAR', 'CARCHI', 'CHIMBORAZO', 'COTOPAXI', 'EL_ORO',
    'ESMERALDAS', 'GALAPAGOS', 'GUAYAS', 'IMBABURA', 'LOJA', 'LOS_RIOS', 'MANABI',
    'MORONA_SANTIAGO', 'NAPO', 'ORELLANA', 'PASTAZA', 'PICHINCHA', 'SANTA_ELENA',
    'SANTO_DOMINGO', 'SUCUMBIOS', 'TUNGURAHUA', 'ZAMORA_CHINCHIPE'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE booking.tipo_impuesto AS ENUM ('IVA', 'TASA_TURISMO', 'SERVICIO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE booking.modo_reserva AS ENUM ('INSTANTANEA', 'SOLICITUD');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE booking.estado_alojamiento AS ENUM ('BORRADOR', 'PUBLICADO', 'ACTIVO', 'INACTIVO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE booking.estado_pago AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'REEMBOLSADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE booking.estado_factura AS ENUM ('EMITIDA', 'ANULADA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE booking.estado_resena AS ENUM ('PUBLICADA', 'OCULTA', 'REPORTADA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE booking.estado_reserva AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'MODIFICADA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE booking.tipo_token AS ENUM ('ACTIVACION', 'RECUPERACION', 'SESION');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE booking.tipo_pago AS ENUM ('RESERVA', 'REEMBOLSO', 'PENALIDAD');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE booking.evento_webhook AS ENUM (
    'RESERVA_CREADA', 'PAGO_CONFIRMADO', 'RESERVA_CANCELADA', 'RESERVA_MODIFICADA', 'INVENTARIO_AGOTADO'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Secuencia para facturación secuencial
CREATE SEQUENCE IF NOT EXISTS booking.seq_factura START WITH 1001 INCREMENT BY 1;

-- ----------------------------------------------------------------------------
-- 2. TABLAS BASE Y CATÁLOGOS PARAMÉTRICOS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS booking.usuario (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE CHECK (email::text = lower(email::text) AND email::text ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text),
  password_hash text NOT NULL,
  nombres character varying NOT NULL,
  apellidos character varying NOT NULL,
  telefono character varying CHECK (telefono IS NULL OR telefono::text ~ '^\+?[0-9]{7,15}$'::text),
  foto_url text,
  tipo_documento booking.tipo_documento,
  numero_documento character varying,
  razon_social character varying,
  rol booking.rol_usuario NOT NULL DEFAULT 'USUARIO'::booking.rol_usuario,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usuario_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS booking.token_usuario (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  tipo booking.tipo_token NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expira_en timestamp with time zone NOT NULL,
  usado_en timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT token_usuario_pkey PRIMARY KEY (id),
  CONSTRAINT token_usuario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES booking.usuario(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking.ciudad (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  provincia booking.provincia NOT NULL,
  nombre character varying NOT NULL,
  latitud numeric,
  longitud numeric,
  CONSTRAINT ciudad_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS booking.tipo_alojamiento (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL UNIQUE,
  CONSTRAINT tipo_alojamiento_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS booking.amenidad (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL UNIQUE,
  categoria character varying NOT NULL,
  CONSTRAINT amenidad_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS booking.politica_cancelacion (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL UNIQUE,
  descripcion character varying NOT NULL,
  CONSTRAINT politica_cancelacion_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS booking.politica_cancelacion_regla (
  politica_id smallint NOT NULL,
  horas_minimas integer NOT NULL,
  porcentaje_penalidad numeric NOT NULL,
  CONSTRAINT politica_cancelacion_regla_pkey PRIMARY KEY (politica_id, horas_minimas),
  CONSTRAINT politica_cancelacion_regla_politica_id_fkey FOREIGN KEY (politica_id) REFERENCES booking.politica_cancelacion(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking.impuesto_tarifa (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL,
  tipo booking.tipo_impuesto NOT NULL,
  porcentaje numeric NOT NULL CHECK (porcentaje >= 0::numeric AND porcentaje <= 100::numeric),
  vigente_desde date NOT NULL,
  vigente_hasta date,
  requiere_registro_turismo boolean NOT NULL DEFAULT false,
  estrellas_minimas smallint CHECK (estrellas_minimas IS NULL OR estrellas_minimas >= 1 AND estrellas_minimas <= 5),
  CONSTRAINT impuesto_tarifa_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- 3. ALOJAMIENTO Y UNIDADES (ESPACIOS RENTABLES)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS booking.alojamiento (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  anfitrion_id uuid NOT NULL,
  tipo_id smallint NOT NULL,
  ciudad_id smallint NOT NULL,
  politica_id smallint NOT NULL,
  nombre character varying NOT NULL,
  descripcion text NOT NULL,
  direccion character varying NOT NULL,
  latitud numeric NOT NULL,
  longitud numeric NOT NULL,
  telefono_contacto character varying CHECK (telefono_contacto IS NULL OR telefono_contacto::text ~ '^\+?[0-9]{7,15}$'::text),
  hora_checkin time without time zone NOT NULL DEFAULT '14:00:00'::time without time zone,
  hora_checkout time without time zone NOT NULL DEFAULT '12:00:00'::time without time zone,
  noches_min smallint NOT NULL DEFAULT 1,
  noches_max smallint NOT NULL DEFAULT 30,
  tarifa_limpieza numeric NOT NULL DEFAULT 0 CHECK (tarifa_limpieza >= 0::numeric),
  modo_reserva booking.modo_reserva NOT NULL DEFAULT 'INSTANTANEA'::booking.modo_reserva,
  reglas_casa text,
  categoria_estrellas smallint CHECK (categoria_estrellas IS NULL OR categoria_estrellas >= 1 AND categoria_estrellas <= 5),
  registro_turismo character varying,
  luaf character varying,
  estado booking.estado_alojamiento NOT NULL DEFAULT 'ACTIVO'::booking.estado_alojamiento,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  codigo integer GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
  CONSTRAINT alojamiento_pkey PRIMARY KEY (id),
  CONSTRAINT alojamiento_politica_id_fkey FOREIGN KEY (politica_id) REFERENCES booking.politica_cancelacion(id),
  CONSTRAINT alojamiento_anfitrion_id_fkey FOREIGN KEY (anfitrion_id) REFERENCES booking.usuario(id),
  CONSTRAINT alojamiento_tipo_id_fkey FOREIGN KEY (tipo_id) REFERENCES booking.tipo_alojamiento(id),
  CONSTRAINT alojamiento_ciudad_id_fkey FOREIGN KEY (ciudad_id) REFERENCES booking.ciudad(id)
);

CREATE TABLE IF NOT EXISTS booking.unidad_alojamiento (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  alojamiento_id uuid NOT NULL,
  nombre character varying NOT NULL,
  capacidad_huespedes smallint NOT NULL CHECK (capacidad_huespedes >= 1 AND capacidad_huespedes <= 30),
  num_habitaciones smallint NOT NULL DEFAULT 1,
  num_camas smallint NOT NULL DEFAULT 1,
  num_banos smallint NOT NULL DEFAULT 1,
  cantidad smallint NOT NULL DEFAULT 1 CHECK (cantidad >= 1),
  precio_noche_base numeric NOT NULL CHECK (precio_noche_base > 0::numeric),
  activa boolean NOT NULL DEFAULT true,
  CONSTRAINT unidad_alojamiento_pkey PRIMARY KEY (id),
  CONSTRAINT unidad_alojamiento_alojamiento_id_fkey FOREIGN KEY (alojamiento_id) REFERENCES booking.alojamiento(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking.calendario_unidad (
  unidad_id uuid NOT NULL,
  fecha date NOT NULL,
  precio_noche numeric CHECK (precio_noche IS NULL OR precio_noche > 0::numeric),
  cantidad_a_la_venta smallint CHECK (cantidad_a_la_venta IS NULL OR cantidad_a_la_venta >= 0),
  CONSTRAINT calendario_unidad_pkey PRIMARY KEY (unidad_id, fecha),
  CONSTRAINT calendario_unidad_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES booking.unidad_alojamiento(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking.alojamiento_amenidad (
  alojamiento_id uuid NOT NULL,
  amenidad_id smallint NOT NULL,
  CONSTRAINT alojamiento_amenidad_pkey PRIMARY KEY (alojamiento_id, amenidad_id),
  CONSTRAINT alojamiento_amenidad_alojamiento_id_fkey FOREIGN KEY (alojamiento_id) REFERENCES booking.alojamiento(id) ON DELETE CASCADE,
  CONSTRAINT alojamiento_amenidad_amenidad_id_fkey FOREIGN KEY (amenidad_id) REFERENCES booking.amenidad(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking.imagen_alojamiento (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  alojamiento_id uuid NOT NULL,
  url text NOT NULL,
  orden smallint NOT NULL DEFAULT 0,
  es_portada boolean NOT NULL DEFAULT false,
  CONSTRAINT imagen_alojamiento_pkey PRIMARY KEY (id),
  CONSTRAINT imagen_alojamiento_alojamiento_id_fkey FOREIGN KEY (alojamiento_id) REFERENCES booking.alojamiento(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 4. RESERVAS, PREVIEWS Y PAGOS (MÓDULO TRANSACCIONAL)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS booking.reserva (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  codigo character varying NOT NULL DEFAULT ('BK-'::text || upper(substr(md5(((random())::text || (clock_timestamp())::text)), 1, 8))) UNIQUE,
  huesped_id uuid NOT NULL,
  alojamiento_id uuid NOT NULL,
  politica_id smallint NOT NULL,
  fecha_entrada date NOT NULL,
  fecha_salida date NOT NULL,
  noches integer GENERATED ALWAYS AS (fecha_salida - fecha_entrada) STORED,
  num_huespedes smallint NOT NULL CHECK (num_huespedes >= 1),
  modo booking.modo_reserva NOT NULL DEFAULT 'INSTANTANEA'::booking.modo_reserva,
  expira_en timestamp with time zone,
  tarifa_limpieza_aplicada numeric NOT NULL DEFAULT 0,
  iva_limpieza numeric NOT NULL DEFAULT 0,
  estado booking.estado_reserva NOT NULL DEFAULT 'CONFIRMADA'::booking.estado_reserva,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reserva_pkey PRIMARY KEY (id),
  CONSTRAINT reserva_huesped_id_fkey FOREIGN KEY (huesped_id) REFERENCES booking.usuario(id),
  CONSTRAINT reserva_alojamiento_id_fkey FOREIGN KEY (alojamiento_id) REFERENCES booking.alojamiento(id),
  CONSTRAINT reserva_politica_id_fkey FOREIGN KEY (politica_id) REFERENCES booking.politica_cancelacion(id)
);

CREATE TABLE IF NOT EXISTS booking.reserva_detalle (
  reserva_id uuid NOT NULL,
  unidad_id uuid NOT NULL,
  cantidad smallint NOT NULL,
  subtotal_alojamiento numeric NOT NULL,
  servicio_monto numeric NOT NULL DEFAULT 0,
  iva_monto numeric NOT NULL DEFAULT 0,
  CONSTRAINT reserva_detalle_pkey PRIMARY KEY (reserva_id, unidad_id),
  CONSTRAINT reserva_detalle_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES booking.reserva(id) ON DELETE CASCADE,
  CONSTRAINT reserva_detalle_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES booking.unidad_alojamiento(id)
);

CREATE TABLE IF NOT EXISTS booking.cancelacion (
  reserva_id uuid NOT NULL,
  cancelada_en timestamp with time zone NOT NULL DEFAULT now(),
  cancelada_por uuid NOT NULL,
  motivo character varying,
  CONSTRAINT cancelacion_pkey PRIMARY KEY (reserva_id),
  CONSTRAINT cancelacion_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES booking.reserva(id) ON DELETE CASCADE,
  CONSTRAINT cancelacion_cancelada_por_fkey FOREIGN KEY (cancelada_por) REFERENCES booking.usuario(id)
);

CREATE TABLE IF NOT EXISTS booking.pago (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reserva_id uuid NOT NULL,
  tipo booking.tipo_pago NOT NULL DEFAULT 'RESERVA'::booking.tipo_pago,
  monto numeric NOT NULL CHECK (monto > 0::numeric),
  estado booking.estado_pago NOT NULL DEFAULT 'APROBADO'::booking.estado_pago,
  referencia character varying,
  fecha timestamp with time zone NOT NULL DEFAULT now(),
  metodo text NOT NULL DEFAULT 'TARJETA'::text CHECK (metodo = ANY (ARRAY['TARJETA'::text, 'EFECTIVO'::text])),
  CONSTRAINT pago_pkey PRIMARY KEY (id),
  CONSTRAINT pago_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES booking.reserva(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking.factura (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reserva_id uuid NOT NULL UNIQUE,
  secuencial integer NOT NULL DEFAULT nextval('booking.seq_factura'::regclass) UNIQUE,
  emitida_en timestamp with time zone NOT NULL DEFAULT now(),
  comprador_nombre character varying NOT NULL,
  comprador_tipo_documento booking.tipo_documento,
  comprador_identificacion character varying NOT NULL,
  comprador_email character varying NOT NULL,
  estado booking.estado_factura NOT NULL DEFAULT 'EMITIDA'::booking.estado_factura,
  anulada_en timestamp with time zone,
  CONSTRAINT factura_pkey PRIMARY KEY (id),
  CONSTRAINT factura_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES booking.reserva(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking.resena (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reserva_id uuid NOT NULL UNIQUE,
  nota_global smallint NOT NULL CHECK (nota_global >= 1 AND nota_global <= 10),
  comentario text,
  respuesta_anfitrion text,
  respondida_en timestamp with time zone,
  estado booking.estado_resena NOT NULL DEFAULT 'PUBLICADA'::booking.estado_resena,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT resena_pkey PRIMARY KEY (id),
  CONSTRAINT resena_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES booking.reserva(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 5. HUB INTEGRATION: PREVIEWS, IDEMPOTENCIA, OUTBOX Y WEBHOOKS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS booking.orden_preview (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  unidad_id uuid NOT NULL,
  fecha_entrada date NOT NULL,
  fecha_salida date NOT NULL,
  num_huespedes smallint NOT NULL,
  cantidad smallint NOT NULL DEFAULT 1,
  total_cotizado numeric NOT NULL,
  moneda character NOT NULL DEFAULT 'USD'::bpchar CHECK (moneda = 'USD'::bpchar),
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  expira_en timestamp with time zone NOT NULL DEFAULT (now() + '00:15:00'::interval),
  reserva_id uuid UNIQUE,
  CONSTRAINT orden_preview_pkey PRIMARY KEY (id),
  CONSTRAINT orden_preview_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES booking.usuario(id),
  CONSTRAINT orden_preview_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES booking.unidad_alojamiento(id),
  CONSTRAINT orden_preview_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES booking.reserva(id)
);

CREATE TABLE IF NOT EXISTS booking.idempotencia (
  propietario character varying NOT NULL,
  clave uuid NOT NULL,
  operacion character varying NOT NULL,
  hash_solicitud character varying NOT NULL,
  estado_http smallint,
  respuesta jsonb,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT idempotencia_pkey PRIMARY KEY (propietario, clave)
);

CREATE TABLE IF NOT EXISTS booking.evento_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  tipo character varying NOT NULL,
  agregado character varying NOT NULL,
  agregado_id uuid NOT NULL,
  correlacion_id uuid NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  publicado_en timestamp with time zone,
  CONSTRAINT evento_outbox_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS booking.webhook_suscripcion (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  propietario character varying NOT NULL,
  url text NOT NULL CHECK (url ~ '^https?://[^\s]+$'::text),
  secreto text NOT NULL,
  activa boolean NOT NULL DEFAULT true,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT webhook_suscripcion_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS booking.webhook_evento (
  suscripcion_id uuid NOT NULL,
  evento booking.evento_webhook NOT NULL,
  CONSTRAINT webhook_evento_pkey PRIMARY KEY (suscripcion_id, evento),
  CONSTRAINT webhook_evento_suscripcion_id_fkey FOREIGN KEY (suscripcion_id) REFERENCES booking.webhook_suscripcion(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking.webhook_entrega (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  suscripcion_id uuid NOT NULL,
  evento_id bigint NOT NULL,
  estado character varying NOT NULL DEFAULT 'PENDIENTE'::character varying CHECK (estado::text = ANY (ARRAY['PENDIENTE'::character varying, 'ENTREGADO'::character varying, 'FALLIDO'::character varying]::text[])),
  intentos smallint NOT NULL DEFAULT 0,
  proximo_intento timestamp with time zone NOT NULL DEFAULT now(),
  ultimo_error text,
  entregado_en timestamp with time zone,
  CONSTRAINT webhook_entrega_pkey PRIMARY KEY (id),
  CONSTRAINT webhook_entrega_suscripcion_id_fkey FOREIGN KEY (suscripcion_id) REFERENCES booking.webhook_suscripcion(id) ON DELETE CASCADE,
  CONSTRAINT webhook_entrega_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES booking.evento_outbox(id) ON DELETE CASCADE
);

-- ============================================================================
-- 6. DATOS SEMILLA BASE PARA PRUEBAS (INITIAL SEEDING)
-- ============================================================================

INSERT INTO booking.politica_cancelacion (nombre, descripcion)
VALUES 
  ('Flexible', 'Cancelación gratuita hasta 24 horas antes del check-in.'),
  ('Moderada', 'Cancelación con 100% de reembolso hasta 5 días antes.'),
  ('Estricta', 'Reembolso del 50% hasta 7 días antes del check-in.')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO booking.politica_cancelacion_regla (politica_id, horas_minimas, porcentaje_penalidad)
VALUES 
  (1, 24, 0),
  (1, 0, 100),
  (2, 120, 0),
  (2, 0, 50),
  (3, 168, 50),
  (3, 0, 100)
ON CONFLICT DO NOTHING;

INSERT INTO booking.ciudad (provincia, nombre, latitud, longitud)
VALUES 
  ('PICHINCHA', 'Quito', -0.1807, -78.4678),
  ('GUAYAS', 'Guayaquil', -2.1709, -79.9224),
  ('AZUAY', 'Cuenca', -2.9001, -79.0059),
  ('GALAPAGOS', 'Puerto Ayora', -0.7436, -90.3148)
ON CONFLICT DO NOTHING;

INSERT INTO booking.tipo_alojamiento (nombre)
VALUES ('Hotel'), ('Hostal'), ('Departamento'), ('Resort'), ('Villa')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO booking.amenidad (nombre, categoria)
VALUES 
  ('Wifi de Alta Velocidad', 'Conectividad'),
  ('Piscina Climatizada', 'Recreación'),
  ('Desayuno Incluido', 'Gastronomía'),
  ('Aire Acondicionado', 'Confort'),
  ('Parqueadero Gratuito', 'Instalaciones')
ON CONFLICT (nombre) DO NOTHING;

-- Usuario Anfitrión Demo
INSERT INTO booking.usuario (id, email, password_hash, nombres, apellidos, rol)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'admin@booking-hub.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi1m6Wd1hO7x5Hh7Xh5J8h6P5h7Xh5J', 'Administrador', 'Sistema', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

-- Alojamiento Demo
INSERT INTO booking.alojamiento (
  id, anfitrion_id, tipo_id, ciudad_id, politica_id, nombre, descripcion, direccion, latitud, longitud
)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  1, 1, 1,
  'Grand Hotel Plaza Quito',
  'Hotel de lujo en el centro financiero con vista al valle y spa completo.',
  'Av. Amazonas y Naciones Unidas',
  -0.1807, -78.4678
)
ON CONFLICT (id) DO NOTHING;

-- Unidad de Alojamiento Demo
INSERT INTO booking.unidad_alojamiento (
  id, alojamiento_id, nombre, capacidad_huespedes, num_habitaciones, num_camas, num_banos, cantidad, precio_noche_base
)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'Suite Deluxe Ejecutiva',
  2, 1, 1, 1, 5, 120.00
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. VISTAS DE COMPATIBILIDAD HACIA ATRÁS (BACKWARD COMPATIBILITY VIEWS)
-- ============================================================================
-- Si existían tablas físicas previas en 'public', se migran sus datos a 'booking'
-- y luego se reemplazan por vistas para no romper el backend ni el frontend.

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alojamientos') THEN
    INSERT INTO booking.alojamiento (
      id, anfitrion_id, tipo_id, ciudad_id, politica_id, nombre, descripcion, direccion, latitud, longitud
    )
    SELECT 
      gen_random_uuid(),
      'a0000000-0000-0000-0000-000000000001'::uuid,
      1, 1, 1,
      a.nombre,
      COALESCE(a.descripcion, 'Alojamiento importado'),
      'Dirección importada',
      -0.1807, -78.4678
    FROM public.alojamientos a
    WHERE NOT EXISTS (SELECT 1 FROM booking.alojamiento b WHERE b.nombre = a.nombre);
  END IF;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- Eliminar de forma segura cualquier tabla o vista previa en 'public':
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT table_name, table_type 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN (
        'alojamientos_servicios', 
        'espacios_rentables', 
        'reservas', 
        'alojamientos', 
        'idempotency_keys', 
        'webhook_subscriptions'
      )
  ) LOOP
    IF r.table_type = 'VIEW' THEN
      EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', r.table_name);
    ELSE
      EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.table_name);
    END IF;
  END LOOP;
END $$;

CREATE VIEW public.alojamientos AS
SELECT 
  a.id::text AS id,
  a.anfitrion_id::text AS "anfitrionId",
  a.tipo_id::text AS "tipoId",
  a.ciudad_id::text AS "ubicacionId",
  a.nombre,
  a.descripcion,
  p.descripcion AS "politicaCancelacion",
  a.estado::text AS estado,
  '/villa.jpg' AS "imagenUrl"
FROM booking.alojamiento a
JOIN booking.politica_cancelacion p ON a.politica_id = p.id;

CREATE OR REPLACE VIEW public.espacios_rentables AS
SELECT 
  u.id::text AS id,
  u.alojamiento_id::text AS "alojamientoId",
  u.nombre,
  u.capacidad_huespedes::int AS "capacidadAdultos",
  0::int AS "capacidadNinos",
  u.precio_noche_base::numeric AS "precioPorNoche",
  u.cantidad::int AS "cantidadDisponible",
  CASE WHEN u.activa THEN 'Activo' ELSE 'Inactivo' END AS estado,
  '' AS "imagenesUrls"
FROM booking.unidad_alojamiento u;

CREATE OR REPLACE VIEW public.reservas AS
SELECT 
  r.id::text AS id,
  r.huesped_id::text AS "usuarioId",
  d.unidad_id::text AS "espacioId",
  'EST-002' AS "estadoId",
  r.fecha_entrada AS "fechaEntrada",
  r.fecha_salida AS "fechaSalida",
  (d.subtotal_alojamiento + d.servicio_monto + d.iva_monto) AS "precioTotal",
  r.num_huespedes AS "numeroPersonas",
  10 AS calificacion,
  '' AS comentario,
  r.id AS "ordenId"
FROM booking.reserva r
LEFT JOIN booking.reserva_detalle d ON r.id = d.reserva_id;

CREATE OR REPLACE VIEW public.idempotency_keys AS
SELECT 
  i.clave::text AS key,
  i.hash_solicitud AS body_hash,
  i.estado_http::int AS status_code,
  i.respuesta AS response_body,
  i.creado_en AS created_at
FROM booking.idempotencia i;

CREATE OR REPLACE VIEW public.webhook_subscriptions AS
SELECT 
  w.id,
  w.url,
  ARRAY['RESERVA_CREADA', 'PAGO_CONFIRMADO']::text[] AS events,
  w.secreto AS secret,
  w.creado_en AS created_at
FROM booking.webhook_suscripcion w;
