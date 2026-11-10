import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import jwt from 'jsonwebtoken';

async function run() {
  console.log('Testing the 3 Evaluator Scenarios against local Nest instance...');

  const tokenBook = jwt.sign(
    {
      sub: 'booking-user-1',
      id: 'booking-user-1',
      correo: 'booking-user-1@booking-hub.com',
      rol: 'Cliente',
      scope: 'alojamientos:read alojamientos:book alojamientos:cancel',
    },
    process.env.JWT_SECRET || 'a-very-secret-jwt-key-with-at-least-32-characters-12345',
    {
      issuer: process.env.JWT_ISSUER || 'https://auth.booking-hub.com',
      audience: process.env.JWT_AUDIENCE || 'https://api.booking-hub.com',
      expiresIn: '2h',
    }
  );
  const authHeaders = {
    'Authorization': `Bearer ${tokenBook}`,
    'Content-Type': 'application/json',
  };

  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('../dist/app.module.js');
  const { ProblemDetailsFilter } = await import('../dist/common/filters/problem-details.filter.js');
  const { ValidationPipe } = await import('@nestjs/common');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/v2/')) {
      req.url = req.url.replace(/^\/api\/v2\//, '/api/v1/');
    }
    next();
  });
  app.setGlobalPrefix('api/v1', {
    exclude: ['/', 'health', 'api/v1/health'],
  });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = 3099;
  await app.listen(port);
  const base = `http://127.0.0.1:${port}/api/v1`;

  try {
    const hotelId = 'ALO-001';
    const offset = 900 + Math.floor(Math.random() * 500);
    const d1 = new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];
    const d2 = new Date(Date.now() + (offset + 2) * 86400000).toISOString().split('T')[0];

    console.log(`Test dates: ${d1} to ${d2} for ${hotelId}`);

    // --- ESCENARIO 1: Disponibilidad exacta, no sobre-reporta con hotel lleno ---
    console.log('\n--- ESCENARIO 1: Verificación de Disponibilidad ---');
    // 1A. Disponibilidad inicial (3 libres)
    const rAvailInit = await fetch(`${base}/availability?alojamientoId=${hotelId}&checkin=${d1}&checkout=${d2}`);
    const availInit = await rAvailInit.json();
    console.log('availInit status:', rAvailInit.status, 'body:', JSON.stringify(availInit));
    if (availInit.opciones?.[0]?.habitacionesRemanentes !== 3) {
      throw new Error(`Esperado 3 libres, obtenido: ${availInit.opciones?.[0]?.habitacionesRemanentes}`);
    }

    // 1B. Vender las 3 habitaciones vía Booking (/orders/create)
    console.log('Vendiendo las 3 habitaciones vía Booking (/orders/create)...');
    for (let i = 1; i <= 3; i++) {
      const resp = await fetch(`${base}/orders/create`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Idempotency-Key': crypto.randomUUID(),
          'X-Client-Id': `CLI-TEST-SC1-${i}`,
        },
        body: JSON.stringify({
          alojamientoId: hotelId,
          tipoHabitacionCodigo: 'SUITE_DELUXE',
          fechaInicio: d1,
          fechaFin: d2,
          ocupantes: { adultos: 2, ninos: 0 },
          huespedTitular: {
            nombreCompleto: `Huésped ${i}`,
            email: `guest${i}@example.com`,
            identificacion: '1710034065',
            telefono: '+593991234567',
          },
        }),
      });
      if (resp.status !== 201) {
        throw new Error(`Fallo venta habitación ${i}: status ${resp.status}`);
      }
    }
    console.log('✓ 3 habitaciones vendidas con 201 Created');

    // 1C. Con el hotel lleno, GET /availability DEBE devolver 0 libres (no 2 libres)
    const rAvailFull = await fetch(`${base}/availability?alojamientoId=${hotelId}&checkin=${d1}&checkout=${d2}`);
    const availFull = await rAvailFull.json();
    const remanentes = availFull.opciones?.[0]?.habitacionesRemanentes;
    console.log('Disponibilidad con hotel lleno:', remanentes, 'estaDisponible:', availFull.opciones?.[0]?.estaDisponible);
    if (remanentes !== 0 || availFull.opciones?.[0]?.estaDisponible !== false) {
      throw new Error(`FALLO ESCENARIO 1: Se esperaba 0 libres y estaDisponible: false, pero devolvió ${remanentes} libres!`);
    }
    console.log('✓ [PASS] Escenario 1: Con el hotel lleno, GET /availability reporta exactamente 0 libres.');

    // --- ESCENARIO 2: Con Booking lleno, LuxeStays Web NO acepta reserva extra ---
    console.log('\n--- ESCENARIO 2: Rechazo de sobreventa en canal directo / web ---');
    const respExtra = await fetch(`${base}/orders/create`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Idempotency-Key': crypto.randomUUID(),
        'X-Client-Id': 'CLI-WEB-EXTRA',
      },
      body: JSON.stringify({
        alojamientoId: hotelId,
        tipoHabitacionCodigo: 'SUITE_DELUXE',
        fechaInicio: d1,
        fechaFin: d2,
        ocupantes: { adultos: 2, ninos: 0 },
        huespedTitular: {
          nombreCompleto: 'Intento Sobrevendido',
          email: 'sobreventa@example.com',
          identificacion: '1710034065',
          telefono: '+593991234567',
        },
      }),
    });
    const extraBody = await respExtra.json();
    console.log('Respuesta a reserva extra:', respExtra.status, extraBody.code);
    if (respExtra.status !== 409 || extraBody.code !== 'OUT_OF_STOCK') {
      throw new Error(`FALLO ESCENARIO 2: Esperado 409 OUT_OF_STOCK, recibido: ${respExtra.status}`);
    }
    console.log('✓ [PASS] Escenario 2: Con Booking habiendo vendido todas, reserva extra es rechazada con 409 OUT_OF_STOCK.');

    // --- ESCENARIO 3: Concurrencia por el Gateway (available_rooms = 1) ---
    console.log('\n--- ESCENARIO 3: Concurrencia vía Gateway (/orders/create) con available_rooms = 1 ---');
    const offset3 = offset + 20;
    const d3In = new Date(Date.now() + offset3 * 86400000).toISOString().split('T')[0];
    const d3Out = new Date(Date.now() + (offset3 + 2) * 86400000).toISOString().split('T')[0];

    // Vender 2 de las 3 habitaciones para que available_rooms = 1
    for (let i = 1; i <= 2; i++) {
      const resp = await fetch(`${base}/orders/create`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Idempotency-Key': crypto.randomUUID(),
          'X-Client-Id': `CLI-SETUP-SC3-${i}`,
        },
        body: JSON.stringify({
          alojamientoId: hotelId,
          tipoHabitacionCodigo: 'SUITE_DELUXE',
          fechaInicio: d3In,
          fechaFin: d3Out,
          ocupantes: { adultos: 2, ninos: 0 },
          huespedTitular: {
            nombreCompleto: `Huésped Pre ${i}`,
            email: `pre${i}@example.com`,
            identificacion: '1710034065',
            telefono: '+593991234567',
          },
        }),
      });
      if (resp.status !== 201) throw new Error('Fallo setup escenario 3');
    }
    console.log('✓ 2 habitaciones vendidas, queda exactamente 1 libre (available_rooms = 1).');

    // Lanzar 2 peticiones concurrentes por el Gateway (/orders/create)
    console.log('Lanzando 2 POST concurrentes por el Gateway...');
    const promises = [1, 2].map((i) =>
      fetch(`${base}/orders/create`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Idempotency-Key': crypto.randomUUID(),
          'X-Client-Id': `CLI-GATEWAY-RACE-${i}`,
        },
        body: JSON.stringify({
          alojamientoId: hotelId,
          tipoHabitacionCodigo: 'SUITE_DELUXE',
          fechaInicio: d3In,
          fechaFin: d3Out,
          ocupantes: { adultos: 2, ninos: 0 },
          huespedTitular: {
            nombreCompleto: `Huésped Gateway ${i}`,
            email: `gateway${i}@example.com`,
            identificacion: '1710034065',
            telefono: '+593991234567',
          },
        }),
      }).then(async (r) => ({
        index: i,
        status: r.status,
        body: await r.json(),
      }))
    );

    const raceResults = await Promise.all(promises);
    const count201 = raceResults.filter((r) => r.status === 201).length;
    const count409 = raceResults.filter((r) => r.status === 409 && r.body.code === 'OUT_OF_STOCK').length;
    console.log(`Resultados de carrera Gateway: Exitosas: ${count201}, Rechazadas: ${count409}`);

    if (count201 !== 1 || count409 !== 1) {
      throw new Error(`FALLO ESCENARIO 3: Se esperaba exactamente 1 confirmada (201) y 1 rechazada (409), pero se obtuvo: 201=${count201}, 409=${count409}`);
    }
    console.log('✓ [PASS] Escenario 3: Exactamente 1 reserva confirmada y 1 rechazada con 409 OUT_OF_STOCK por el Gateway.');

    console.log('\n============================================================');
    console.log('✅ TODOS LOS 3 CASOS DEL EVALUADOR VERIFICADOS Y CORREGIDOS.');
    console.log('============================================================');
  } finally {
    await app.close();
  }
}

run().catch((e) => {
  console.error('ERROR EN PRUEBA DE ESCENARIOS:', e);
  process.exit(1);
});
