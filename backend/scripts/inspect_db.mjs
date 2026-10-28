import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  const counts = await client.query(`
    SELECT 'public.alojamientos' as tbl, count(*) from public.alojamientos
    UNION ALL SELECT 'public.espacios_rentables', count(*) from public.espacios_rentables
    UNION ALL SELECT 'public.alojamientos_servicios', count(*) from public.alojamientos_servicios
    UNION ALL SELECT 'public.reservas', count(*) from public.reservas
    UNION ALL SELECT 'public.usuarios', count(*) from public.usuarios;
  `);
  console.table(counts.rows);
  await client.end();
}

main().catch(console.error);
