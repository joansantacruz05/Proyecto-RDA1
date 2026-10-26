require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('--- Iniciando Migración al Esquema Enterprise "booking" ---');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL no está definido en el archivo .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✓ Conexión establecida con la base de datos PostgreSQL');

    const sqlPath = path.join(__dirname, 'schema_booking.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('✓ Leyendo schema_booking.sql...');
    await client.query(sql);

    console.log('✓ Esquema "booking", Enums, Tablas, Datos Semilla y Vistas de Compatibilidad creados exitosamente.');
  } catch (err) {
    console.error('ERROR durante la migración:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
