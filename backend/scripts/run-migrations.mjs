import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL no encontrada en backend/.env');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log('--- Ejecutando Migraciones SQL Idempotentes ---');
  await client.connect();

  const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`\n• Aplicando migración: ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await client.query(sql);
      console.log(`  ✓ ${file} ejecutada exitosamente.`);
    } catch (err) {
      console.error(`  ✗ Error en ${file}:`, err.message);
      process.exit(1);
    }
  }

  console.log('\n--- Todas las migraciones fueron aplicadas con éxito ---\n');
  await client.end();
}

run().catch((err) => {
  console.error('Fallo en la ejecución de migraciones:', err);
  process.exit(1);
});
