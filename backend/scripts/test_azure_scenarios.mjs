import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const BASE_URL = 'https://posada-ec-alojamientos.azurewebsites.net/api/v1';
const JWT_SECRET = 'luxestays_jwt_secret_enterprise_secure_key_2026_rda1_epn';

const tokenBook = jwt.sign(
  {
    sub: 'booking-evaluator-azure',
    id: 'booking-evaluator-azure',
    correo: 'booking-evaluator@booking-hub.com',
    rol: 'Cliente',
    scope: 'alojamientos:read alojamientos:book alojamientos:cancel',
  },
  JWT_SECRET,
  {
    issuer: 'https://auth.booking-hub.com',
    audience: 'https://api.booking-hub.com',
    expiresIn: '2h',
  }
);

const authHeaders = {
  'Authorization': `Bearer ${tokenBook}`,
  'Content-Type': 'application/json',
};

async function testAzureScenarios() {
  console.log('============================================================');
  console.log(' PROBANDO LOS 3 CASOS DEL EVALUADOR DIRECTO EN AZURE CLOUD');
  console.log('============================================================\n');

  const hotelId = 'ALO-001';
  // Fechas únicas para evitar colisión con otras pruebas
  const offset = 1200 + Math.floor(Math.random() * 500);
  const d1 = new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];
  const d2 = new Date(Date.now() + (offset + 2) * 86400000).toISOString().split('T')[0];

  console.log(`Fechas de prueba: ${d1} al ${d2} para el hotel ${hotelId}`);

  // --- CASO 1: Disponibilidad exacta, no sobre-reporta con hotel lleno ---
  console.log('\n--- CASO 1: Verificación de Disponibilidad con Hotel Lleno ---');
  const rInit = await fetch(`${BASE_URL}/availability?alojamientoId=${hotelId}&checkin=${d1}&checkout=${d2}`);
  const dataInit = await rInit.json();
  const libresInit = dataInit.opciones?.[0]?.habitacionesRemanentes;
  console.log(`Disponibilidad inicial en Azure: ${libresInit} habitaciones libres`);
  if (libresInit !== 3) {
    throw new Error(`Se esperaba 3 libres iniciales en Azure, recibido: ${libresInit}`);
  }

  // Vender las 3 habitaciones vía /orders/create
  console.log('Vendiendo las 3 habitaciones vía POST /orders/create en Azure...');
  for (let i = 1; i <= 3; i++) {
    const res = await fetch(`${BASE_URL}/orders/create`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Idempotency-Key': crypto.randomUUID(),
        'X-Client-Id': `AZURE-TEST-C1-${i}`,
      },
      body: JSON.stringify({
        alojamientoId: hotelId,
        tipoHabitacionCodigo: 'SUITE_DELUXE',
        fechaInicio: d1,
        fechaFin: d2,
        ocupantes: { adultos: 2, ninos: 0 },
        huespedTitular: {
          nombreCompleto: `Huésped Azure ${i}`,
          email: `azure_guest_${i}@example.com`,
          identificacion: '1710034065',
          telefono: '+593991234567',
        },
      }),
    });
    console.log(`  Venta ${i}: status ${res.status}`);
    if (res.status !== 201) throw new Error(`Venta ${i} falló con status ${res.status}`);
  }

  // Consultar disponibilidad con hotel lleno
  const rFull = await fetch(`${BASE_URL}/availability?alojamientoId=${hotelId}&checkin=${d1}&checkout=${d2}`);
  const dataFull = await rFull.json();
  const remanentesFull = dataFull.opciones?.[0]?.habitacionesRemanentes;
  const estaDispFull = dataFull.opciones?.[0]?.estaDisponible;
  console.log(`Disponibilidad reportada con hotel lleno en Azure: ${remanentesFull} libres, estaDisponible: ${estaDispFull}`);
  if (remanentesFull !== 0 || estaDispFull !== false) {
    throw new Error(`FALLO CASO 1 EN AZURE: Se esperaba 0 libres y false, pero devolvió ${remanentesFull}`);
  }
  console.log('✓ [PASS] Caso 1 superado en Azure: Con el hotel lleno, GET /availability reporta exactamente 0 libres.');

  // --- CASO 2: Con Booking lleno, LuxeStays rechaza reserva extra ---
  console.log('\n--- CASO 2: Rechazo de sobreventa por canal web/directo en Azure ---');
  const resExtra = await fetch(`${BASE_URL}/orders/create`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Idempotency-Key': crypto.randomUUID(),
      'X-Client-Id': 'AZURE-WEB-EXTRA',
    },
    body: JSON.stringify({
      alojamientoId: hotelId,
      tipoHabitacionCodigo: 'SUITE_DELUXE',
      fechaInicio: d1,
      fechaFin: d2,
      ocupantes: { adultos: 2, ninos: 0 },
      huespedTitular: {
        nombreCompleto: 'Intento Sobrevendido Azure',
        email: 'azure_overbooking@example.com',
        identificacion: '1710034065',
        telefono: '+593991234567',
      },
    }),
  });
  const bodyExtra = await resExtra.json();
  console.log(`Respuesta intento de sobreventa: status ${resExtra.status}, code: ${bodyExtra.code}`);
  if (resExtra.status !== 409 || bodyExtra.code !== 'OUT_OF_STOCK') {
    throw new Error(`FALLO CASO 2 EN AZURE: Esperado 409 OUT_OF_STOCK, recibido: ${resExtra.status}`);
  }
  console.log('✓ [PASS] Caso 2 superado en Azure: Intento de sobreventa rechazado con 409 OUT_OF_STOCK.');

  // --- CASO 3: Carrera Gateway con available_rooms = 1 ---
  console.log('\n--- CASO 3: Carrera concurrente por Gateway en Azure (available_rooms = 1) ---');
  const offset3 = offset + 20;
  const d3In = new Date(Date.now() + offset3 * 86400000).toISOString().split('T')[0];
  const d3Out = new Date(Date.now() + (offset3 + 2) * 86400000).toISOString().split('T')[0];

  // Vender 2 de 3 habitaciones para que quede exactamente 1 disponible
  for (let i = 1; i <= 2; i++) {
    const resPre = await fetch(`${BASE_URL}/orders/create`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Idempotency-Key': crypto.randomUUID(),
        'X-Client-Id': `AZURE-SETUP-C3-${i}`,
      },
      body: JSON.stringify({
        alojamientoId: hotelId,
        tipoHabitacionCodigo: 'SUITE_DELUXE',
        fechaInicio: d3In,
        fechaFin: d3Out,
        ocupantes: { adultos: 2, ninos: 0 },
        huespedTitular: {
          nombreCompleto: `Pre Huésped Azure ${i}`,
          email: `azure_pre_${i}@example.com`,
          identificacion: '1710034065',
          telefono: '+593991234567',
        },
      }),
    });
    if (resPre.status !== 201) throw new Error(`Pre-setup habitación ${i} falló: ${resPre.status}`);
  }
  console.log('✓ 2 habitaciones vendidas en Azure, queda exactamente 1 libre (available_rooms = 1).');

  // Lanzar 2 POST concurrentes por el Gateway
  console.log('Lanzando 2 solicitudes POST /orders/create simultáneas compitiendo por la última habitación en Azure...');
  const postRace = (idx) =>
    fetch(`${BASE_URL}/orders/create`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Idempotency-Key': crypto.randomUUID(),
        'X-Client-Id': `AZURE-RACE-CLIENT-${idx}`,
      },
      body: JSON.stringify({
        alojamientoId: hotelId,
        tipoHabitacionCodigo: 'SUITE_DELUXE',
        fechaInicio: d3In,
        fechaFin: d3Out,
        ocupantes: { adultos: 2, ninos: 0 },
        huespedTitular: {
          nombreCompleto: `Competidor Gateway ${idx}`,
          email: `competidor_${idx}@example.com`,
          identificacion: '1710034065',
          telefono: '+593991234567',
        },
      }),
    }).then(async (r) => ({ status: r.status, body: await r.json() }));

  const [resA, resB] = await Promise.all([postRace(1), postRace(2)]);
  console.log(`Resultado Petición 1: status ${resA.status}, code: ${resA.body.code}`);
  console.log(`Resultado Petición 2: status ${resB.status}, code: ${resB.body.code}`);

  const statuses = [resA.status, resB.status];
  const confirmadas = statuses.filter((s) => s === 201).length;
  const rechazadas = statuses.filter((s) => s === 409).length;

  if (confirmadas !== 1 || rechazadas !== 1) {
    throw new Error(`FALLO CASO 3 EN AZURE: Se esperaba exactamente 1x 201 y 1x 409, pero se obtuvo: 201s=${confirmadas}, 409s=${rechazadas}`);
  }
  console.log('✓ [PASS] Caso 3 superado en Azure: Exactamente 1 reserva confirmada (201) y 1 rechazada con 409 OUT_OF_STOCK.');

  console.log('\n============================================================');
  console.log('✅ TODOS LOS 3 CASOS VERIFICADOS CON ÉXITO EN AZURE PRODUCCIÓN');
  console.log('============================================================\n');
}

testAzureScenarios().catch((e) => {
  console.error('\n❌ ERROR EN PRUEBAS AZURE:', e.message);
  process.exit(1);
});
