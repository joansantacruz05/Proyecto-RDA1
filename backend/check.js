const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hieymocmcfftjtjsspjl:Sebastianv631498@aws-0-ca-central-1.pooler.supabase.com:6543/postgres'
});

async function main() {
  await client.connect();
  const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'reservas'`);
  console.log(res.rows.map(r => r.column_name).join(', '));
  await client.end();
}

main();
