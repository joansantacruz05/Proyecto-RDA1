const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hieymocmcfftjtjsspjl:Sebastianv631498@aws-0-ca-central-1.pooler.supabase.com:6543/postgres'
});

async function main() {
  await client.connect();
  console.log("Connected");

  try {
    await client.query(`ALTER TABLE alojamientos ADD COLUMN IF NOT EXISTS "politicaCancelacion" text DEFAULT 'Cancelación gratuita hasta 24 horas antes del check-in. Caso contrario se cobrará el 100% de la primera noche.';`);
    console.log("Added politicaCancelacion to alojamientos");
  } catch(e) { console.error(e.message); }

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS contratos (
          id VARCHAR(50) PRIMARY KEY,
          "reservaId" VARCHAR(50) REFERENCES reservas(id) ON DELETE CASCADE,
          terminos TEXT NOT NULL,
          firmado BOOLEAN DEFAULT false,
          "fechaFirma" TIMESTAMP
      );
    `);
    console.log("Created CONTRATOS table");
  } catch(e) { console.error(e.message); }

  await client.end();
}

main();
