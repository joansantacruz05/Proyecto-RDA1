const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hieymocmcfftjtjsspjl:Sebastianv631498@aws-0-ca-central-1.pooler.supabase.com:6543/postgres'
});

async function main() {
  await client.connect();
  console.log("Connected");

  try {
    await client.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS edad integer;`);
    console.log("Added edad to usuarios");
  } catch(e) { console.error(e.message); }

  try {
    await client.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS direccion text;`);
    console.log("Added direccion to usuarios");
  } catch(e) { console.error(e.message); }

  try {
    await client.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pais varchar(100);`);
    console.log("Added pais to usuarios");
  } catch(e) { console.error(e.message); }

  try {
    await client.query(`ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "numeroPersonas" integer DEFAULT 1;`);
    console.log("Added numeroPersonas to reservas");
  } catch(e) { console.error(e.message); }

  try {
    await client.query(`ALTER TABLE reservas ADD COLUMN IF NOT EXISTS calificacion integer;`);
    console.log("Added calificacion to reservas");
  } catch(e) { console.error(e.message); }

  try {
    await client.query(`ALTER TABLE reservas ADD COLUMN IF NOT EXISTS comentario text;`);
    console.log("Added comentario to reservas");
  } catch(e) { console.error(e.message); }

  await client.end();
}

main();
