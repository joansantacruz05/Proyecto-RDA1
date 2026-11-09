const { Client } = require('pg');

async function migrate() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@127.0.0.1:5432/booking_db';
  console.log('Connecting to:', connectionString.replace(/:[^:@]+@/, ':****@'));

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  await client.connect();

  await client.query(`
    ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "ordenId" UUID UNIQUE;
    UPDATE reservas SET "ordenId" = gen_random_uuid() WHERE "ordenId" IS NULL;
    ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "checkinRealizado" BOOLEAN DEFAULT FALSE;
    ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "earlyCheckinAutorizado" BOOLEAN DEFAULT FALSE;
    ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "checkinHora" TIMESTAMP WITH TIME ZONE;
    ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "habilitadoDesde" VARCHAR(50);
    ALTER TABLE reservas ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);
    ALTER TABLE reservas ADD COLUMN IF NOT EXISTS iva DECIMAL(10,2);
    ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "tasaMunicipal" DECIMAL(10,2);
    ALTER TABLE reservas ADD COLUMN IF NOT EXISTS moneda VARCHAR(10) DEFAULT 'USD';
    ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "fechaCreacion" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      llave UUID NOT NULL,
      "usuarioId" VARCHAR(100) NOT NULL DEFAULT 'ANONYMOUS',
      endpoint VARCHAR(255) NOT NULL DEFAULT 'DEFAULT',
      "hashCuerpo" VARCHAR(64) NOT NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
      status INT,
      respuesta JSONB,
      "creadoEn" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (llave, "usuarioId", endpoint)
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      client_id VARCHAR(100) PRIMARY KEY,
      nombre VARCHAR(255),
      email VARCHAR(255),
      identificacion VARCHAR(50),
      telefono VARCHAR(50)
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS stock_outbox (
      id VARCHAR(50) PRIMARY KEY,
      ts BIGINT,
      "itemId" VARCHAR(100),
      fecha VARCHAR(50),
      unidades INT,
      estado VARCHAR(50),
      intentos INT DEFAULT 0,
      "ultimoError" TEXT,
      "creadoEn" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ALTER TABLE stock_outbox ADD COLUMN IF NOT EXISTS intentos INT DEFAULT 0;
    ALTER TABLE stock_outbox ADD COLUMN IF NOT EXISTS "ultimoError" TEXT;
    ALTER TABLE stock_outbox ALTER COLUMN id TYPE VARCHAR(50) USING id::text;
  `);

  await client.query(`CREATE SCHEMA IF NOT EXISTS booking;`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS booking.evento_outbox (
      id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
      tipo character varying NOT NULL,
      agregado character varying NOT NULL,
      agregado_id character varying NOT NULL,
      correlacion_id character varying NOT NULL,
      payload jsonb NOT NULL,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      publicado_en timestamp with time zone,
      CONSTRAINT evento_outbox_pkey PRIMARY KEY (id)
    );
  `);

  await client.query(`
    ALTER TABLE alojamientos ADD COLUMN IF NOT EXISTS "imagenUrl" TEXT DEFAULT '/villa.jpg';
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS identificacion VARCHAR(50);
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS "rolId" VARCHAR(50) DEFAULT 'ROL-002';
    ALTER TABLE espacios_rentables ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
    ALTER TABLE alojamientos ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
    UPDATE espacios_rentables SET codigo = id WHERE codigo IS NULL;
    UPDATE alojamientos SET codigo = id WHERE codigo IS NULL;

    INSERT INTO espacios_rentables (id, "alojamientoId", nombre, "precioPorNoche", "capacidadAdultos", "capacidadNinos", "cantidadDisponible", estado, codigo)
    VALUES (
      'HAB-CONC-ULTIMA',
      'ALO-001',
      'Habitación de Concurrencia Última',
      120.00,
      2,
      0,
      1,
      'Activo',
      'HAB-CONC-ULTIMA'
    )
    ON CONFLICT (id) DO UPDATE SET "cantidadDisponible" = 1, estado = 'Activo', codigo = 'HAB-CONC-ULTIMA';
  `);

  console.log('✓ Migración completada con éxito.');
  await client.end();
}

migrate().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});

