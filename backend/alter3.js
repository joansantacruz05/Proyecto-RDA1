const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hieymocmcfftjtjsspjl:Sebastianv631498@aws-0-ca-central-1.pooler.supabase.com:6543/postgres'
});

async function main() {
  await client.connect();
  console.log("Connected");

  try {
    await client.query(`
      CREATE OR REPLACE VIEW vista_dashboard_admin AS
      SELECT 
          (SELECT COUNT(*) FROM alojamientos) AS total_alojamientos,
          (SELECT COUNT(*) FROM reservas WHERE "fechaEntrada" >= CURRENT_DATE) AS reservas_activas,
          (SELECT COALESCE(SUM("precioTotal"), 0) FROM reservas WHERE "estadoId" = 'EST-002') AS ingresos_totales;
    `);
    console.log("View vista_dashboard_admin created");
  } catch(e) { console.error(e.message); }

  await client.end();
}

main();
