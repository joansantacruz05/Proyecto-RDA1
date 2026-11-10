import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await c.connect();
  console.log('Connected to Supabase PostgreSQL.');

  const sqlPath = path.join(__dirname, '..', 'db', 'migrations', '004_unify_hotel_inventory.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('Applying migration 004...');
  await c.query(sql);
  console.log('Migration 004 applied successfully.');

  // Verificación
  const espCount = await c.query(`SELECT count(*)::int as total FROM espacios_rentables WHERE id LIKE 'ESP-%'`);
  const habCount = await c.query(`SELECT count(*)::int as total FROM espacios_rentables WHERE id NOT LIKE 'ESP-%'`);
  console.log(`Total ESP- spaces: ${espCount.rows[0].total}`);
  console.log(`Total non-ESP spaces: ${habCount.rows[0].total}`);

  const resHab = await c.query(`SELECT count(*)::int as total FROM reservas WHERE "espacioId" LIKE 'HAB-00%'`);
  console.log(`Reservas still referencing HAB-00%: ${resHab.rows[0].total}`);

  await c.end();
}

main().catch(console.error);

