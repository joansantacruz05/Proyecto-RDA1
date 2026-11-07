const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: La variable de entorno DATABASE_URL es obligatoria para ejecutar populate_codes.cjs.');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Conectado a PostgreSQL...');

  // 1. Normalizar códigos de alojamientos a MAYUSCULAS_NUMEROS_GUION_BAJO
  const alojamientosRes = await client.query('SELECT id, nombre, codigo FROM alojamientos ORDER BY id ASC');
  for (const alo of alojamientosRes.rows) {
    let newCode = alo.codigo;
    if (!newCode || newCode.trim() === '') {
      // Generar código basado en el ID
      newCode = `HOTEL_${alo.id.replace(/-/g, '_').toUpperCase()}`;
    } else {
      // Reemplazar guiones o espacios por guion bajo y pasar a mayúsculas
      newCode = newCode.replace(/[-\s]/g, '_').replace(/[^A-Z0-9_]/gi, '').toUpperCase();
    }

    if (newCode !== alo.codigo) {
      await client.query('UPDATE alojamientos SET codigo = $1 WHERE id = $2', [newCode, alo.id]);
      console.log(`[Alojamiento] ${alo.id} (${alo.nombre}) -> ${newCode}`);
    }
  }

  // 2. Normalizar códigos de espacios_rentables a MAYUSCULAS_NUMEROS_GUION_BAJO
  const espaciosRes = await client.query('SELECT id, "alojamientoId", nombre, codigo FROM espacios_rentables ORDER BY "alojamientoId", id ASC');
  
  const roomCodePool = [
    'SUITE_DELUXE',
    'HABITACION_ESTANDAR',
    'SUITE_PRESIDENCIAL',
    'HABITACION_DOBLE',
    'VILLA_PREMIUM',
    'PENTHOUSE_OCEAN_FRONT',
    'SUITE_FAMILIAR'
  ];

  const assignedPerHotel = {};

  for (const esp of espaciosRes.rows) {
    const hotelId = esp.alojamientoId;
    if (!assignedPerHotel[hotelId]) assignedPerHotel[hotelId] = new Set();

    let newCode = esp.codigo;
    if (newCode) {
      newCode = newCode.replace(/[-\s]/g, '_').replace(/[^A-Z0-9_]/gi, '').toUpperCase();
    }

    // Si es nulo, no cumple formato o colisiona dentro del mismo hotel
    if (!newCode || !/^[A-Z0-9_]+$/.test(newCode) || assignedPerHotel[hotelId].has(newCode)) {
      for (const candidate of roomCodePool) {
        if (!assignedPerHotel[hotelId].has(candidate)) {
          newCode = candidate;
          break;
        }
      }
      if (!newCode || assignedPerHotel[hotelId].has(newCode)) {
        newCode = `HAB_${esp.id.replace(/-/g, '_').toUpperCase()}`;
      }
    }

    assignedPerHotel[hotelId].add(newCode);

    if (newCode !== esp.codigo) {
      await client.query('UPDATE espacios_rentables SET codigo = $1 WHERE id = $2', [newCode, esp.id]);
      console.log(`[Habitación] ${esp.id} (${esp.nombre}) [${hotelId}] -> ${newCode}`);
    }
  }

  // Verificar resultados
  const checkAlo = await client.query('SELECT count(*) as total, count(codigo) as con_codigo FROM alojamientos');
  const checkEsp = await client.query('SELECT count(*) as total, count(codigo) as con_codigo FROM espacios_rentables');
  console.log('\n--- RESULTADOS ---');
  console.log('Alojamientos:', checkAlo.rows[0]);
  console.log('Espacios rentables:', checkEsp.rows[0]);

  await client.end();
  console.log('[OK] Script completado exitosamente.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

