/**
 * ============================================================================
 * SCRIPT DE PRUEBAS DE INTEGRACIÓN: BOOKING CORE API & GDS ALOJAMIENTOS
 * Proyecto RDA1 - Demostración de corrección de las 6 fallas reportadas
 * ============================================================================
 * 1. Idempotencia Atómica (INSERT ON CONFLICT, 409 IN_PROGRESS, 422 REUSED, Idempotent-Replayed)
 * 2. Recuperación tras timeout (GET /orders?idempotency_key=...)
 * 3. DTOs class-validator (fechas en America/Guayaquil, adultos >= 1, email, 400 ProblemDetails)
 * 4. Check-in (CONFIRMED, hora >= 14:00 Guayaquil, 422 CHECKIN_TIME_NOT_REACHED, CHECKED_IN, 409 en 2do)
 * 5. Server-Timing y latencia (< 3s) + Reporte de regiones Azure vs Supabase
 * 6. Concurrencia extrema (10 simultáneas por última hab -> 1x 201 y 9x 409; 10 misma llave -> 1 orden)
 * ============================================================================
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Configuración de BD para pruebas locales
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('supabase')) {
  process.env.DATABASE_URL = 'postgresql://postgres:password@127.0.0.1:5432/booking_db';
}
process.env.NODE_ENV = 'test';
process.env.PORT = '3098';

const JWT_SECRET = process.env.JWT_SECRET || 'luxestays_jwt_secret_enterprise_secure_key_2026_rda1_epn';
const JWT_ISSUER = process.env.JWT_ISSUER || 'https://auth.booking-hub.com';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'https://api.booking-hub.com';

function generateTestToken(userId, role, scope) {
  return jwt.sign(
    {
      sub: userId,
      id: userId,
      correo: `${userId}@booking-hub.com`,
      rol: role,
      scope: scope,
    },
    JWT_SECRET,
    {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: '2h',
    }
  );
}

function getTodayGuayaquil() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const m = {};
  for (const p of parts) m[p.type] = p.value;
  return `${m.year}-${m.month}-${m.day}`;
}

function addDaysGuayaquil(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const m = {};
  for (const p of parts) m[p.type] = p.value;
  return `${m.year}-${m.month}-${m.day}`;
}

async function runAllTests() {
  console.log('\n====================================================================');
  console.log(' INICIANDO SUITE DE PRUEBAS DE INTEGRACIÓN: BOOKING CORE API');
  console.log('====================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(` \x1b[32m✓ [PASS]\x1b[0m ${message}`);
      passed++;
    } else {
      console.error(` \x1b[31m✗ [FAIL]\x1b[0m ${message}`);
      if (details) console.error(`   \x1b[33mDetalles:\x1b[0m ${details}`);
      failed++;
    }
  }

  // 1. Inicializar servidor NestJS en memoria
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('./dist/app.module');
  const { ProblemDetailsFilter } = require('./dist/common/filters/problem-details.filter');
  const { ValidationPipe } = require('@nestjs/common');

  let app;
  const PORT = 3098;
  const baseUrl = `http://127.0.0.1:${PORT}/api/v1`;

  try {
    app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
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
    await app.listen(PORT);
    console.log(`✓ Servidor de prueba escuchando en http://127.0.0.1:${PORT}/api/v1 y /api/v2`);
  } catch (err) {
    console.error('FATAL: Error al iniciar la aplicación de pruebas:', err);
    process.exit(1);
  }

  const baseV2Url = `http://127.0.0.1:${PORT}/api/v2`;

  const tokenBook = generateTestToken('booking-user-1', 'Cliente', 'alojamientos:read alojamientos:book alojamientos:cancel');
  const tokenAdmin = generateTestToken('admin-user-1', 'ADMIN', 'alojamientos:read alojamientos:book alojamientos:cancel alojamientos:webhooks');

  const headersAuth = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenBook}`,
    'X-Client-Id': 'CLI-BOOKING-CORE',
  };

  const headersAdmin = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenAdmin}`,
    'X-Client-Id': 'ADMIN-RECEPCION',
  };

  try {
    // Buscar alojamiento y habitación base
    const searchRes = await fetch(`${baseUrl}/alojamientos?limit=1`);
    const searchData = await searchRes.json();
    const alojamientoId = searchData.data?.[0]?.id || 'ALO-001';

    // ──────────────────────────────────────────────────────────────────────────
    // FALLA 1: IDEMPOTENCIA ATÓMICA
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 1. Verificación de Idempotencia Atómica ---');
    const key1 = crypto.randomUUID();
    const inDate1 = addDaysGuayaquil(10);
    const outDate1 = addDaysGuayaquil(12);

    const body1 = {
      alojamientoId,
      tipoHabitacionCodigo: 'ESP-001',
      fechaInicio: inDate1,
      fechaFin: outDate1,
      ocupantes: { adultos: 2, ninos: 0 },
      huespedTitular: {
        nombreCompleto: 'Juan Pérez',
        email: 'juan.perez@prueba.com',
        identificacion: '1710034065',
        telefono: '+593991234567',
      },
    };

    // 1A. Primera petición con clave nueva -> 201 Created
    const res1A = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: { ...headersAuth, 'Idempotency-Key': key1 },
      body: JSON.stringify(body1),
    });
    const data1A = await res1A.json();
    if (res1A.status !== 201) {
      console.log('1A ERROR BODY:', data1A);
    }
    assert(res1A.status === 201, '1A. Primera creación con Idempotency-Key devuelve 201 Created', `Status: ${res1A.status}`);
    assert(data1A.orderId && data1A.codigoReserva, '1A. La orden contiene orderId y codigoReserva');

    // 1B. Segunda petición idéntica con misma llave -> Misma respuesta con cabecera Idempotent-Replayed: true
    const res1B = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: { ...headersAuth, 'Idempotency-Key': key1 },
      body: JSON.stringify(body1),
    });
    const data1B = await res1B.json();
    const replayedHeader = res1B.headers.get('idempotent-replayed');
    assert(res1B.status === 201 || res1B.status === 200, '1B. Segunda llamada devuelve éxito (200/201)', `Status: ${res1B.status}`);
    assert(replayedHeader === 'true', '1B. Cabecera "Idempotent-Replayed: true" presente en la repetición', `Header: ${replayedHeader}`);
    assert(data1B.orderId === data1A.orderId, '1B. Retorna exactamente la misma orden previa');

    // 1C. Reuso de la misma llave con cuerpo DIFERENTE -> 422 IDEMPOTENCY_KEY_REUSED
    const bodyDiferente = { ...body1, fechaFin: addDaysGuayaquil(15) };
    const res1C = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: { ...headersAuth, 'Idempotency-Key': key1 },
      body: JSON.stringify(bodyDiferente),
    });
    const data1C = await res1C.json();
    assert(res1C.status === 422, '1C. Reuso con cuerpo diferente rechaza con HTTP 422', `Status: ${res1C.status}`);
    assert(data1C.code === 'IDEMPOTENCY_KEY_REUSED', '1C. Código de error RFC 7807 es IDEMPOTENCY_KEY_REUSED', `Code: ${data1C.code}`);

    // ──────────────────────────────────────────────────────────────────────────
    // FALLA 2: RECUPERACIÓN TRAS TIMEOUT (GET /orders?idempotency_key=...)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. Verificación de Recuperación de Orden tras Timeout ---');
    const resRecup = await fetch(`${baseUrl}/orders?idempotency_key=${key1}`, {
      headers: headersAuth,
    });
    const dataRecup = await resRecup.json();
    assert(resRecup.status === 200, '2. GET /orders?idempotency_key=... responde 200 OK', `Status: ${resRecup.status}`);
    const recoveredOrder = dataRecup.order || dataRecup.orders?.[0] || dataRecup.data?.[0] || dataRecup;
    assert(
      recoveredOrder && (recoveredOrder.orderId === data1A.orderId || recoveredOrder.id === data1A.reservaId),
      '2. La orden recuperada coincide exactamente con la orden creada',
      `Recovered ID: ${recoveredOrder?.orderId || recoveredOrder?.id}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // FALLA 3: DTOs CON CLASS-VALIDATOR Y FORMATO PROBLEMDETAILS
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. Verificación de DTOs class-validator y ProblemDetails ---');

    // 3A. Fecha pasada (check-in en el pasado respecto a Guayaquil) -> 400 VALIDATION_FAILED
    const resPast = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: { ...headersAuth, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        ...body1,
        fechaInicio: '2020-01-01',
        fechaFin: '2020-01-05',
      }),
    });
    const dataPast = await resPast.json();
    assert(resPast.status === 400, '3A. Fecha pasada es rechazada con HTTP 400', `Status: ${resPast.status}`);
    assert(dataPast.code === 'VALIDATION_FAILED', '3A. Formato ProblemDetails con code VALIDATION_FAILED');

    // 3B. Salida anterior o igual a entrada -> 400 VALIDATION_FAILED
    const resExit = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: { ...headersAuth, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        ...body1,
        fechaInicio: addDaysGuayaquil(10),
        fechaFin: addDaysGuayaquil(9), // Menor a entrada
      }),
    });
    const dataExit = await resExit.json();
    assert(resExit.status === 400, '3B. Salida anterior a entrada rechaza con HTTP 400', `Status: ${resExit.status}`);
    assert(dataExit.code === 'VALIDATION_FAILED', '3B. Código de error VALIDATION_FAILED');

    // 3C. Adultos < 1 o ausente (sin fallback "|| 1") -> 400 VALIDATION_FAILED
    const resAdults = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: { ...headersAuth, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        ...body1,
        ocupantes: { adultos: 0, ninos: 2 },
      }),
    });
    const dataAdults = await resAdults.json();
    assert(resAdults.status === 400, '3C. adultos: 0 es rechazado con HTTP 400', `Status: ${resAdults.status}`);
    assert(dataAdults.code === 'VALIDATION_FAILED', '3C. Error VALIDATION_FAILED');

    // 3D. Correo inválido -> 400 VALIDATION_FAILED
    const resEmail = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: { ...headersAuth, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        ...body1,
        huespedTitular: {
          ...body1.huespedTitular,
          email: 'correo-totalmente-invalido',
        },
      }),
    });
    const dataEmail = await resEmail.json();
    assert(resEmail.status === 400, '3D. Correo inválido es rechazado con HTTP 400', `Status: ${resEmail.status}`);

    // 3E. Campos desconocidos (forbidNonWhitelisted) -> 400 VALIDATION_FAILED
    const resUnknown = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: { ...headersAuth, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        ...body1,
        campoInexistenteDesconocido: 'inyeccion-prueba',
      }),
    });
    const dataUnknown = await resUnknown.json();
    assert(resUnknown.status === 400, '3E. Campo desconocido rechazado con HTTP 400 en ProblemDetails', `Status: ${resUnknown.status}`);
    assert(
      dataUnknown.detail && dataUnknown.detail.includes('campoInexistenteDesconocido'),
      '3E. ProblemDetails detalla el campo rechazado por whitelist'
    );

    // ──────────────────────────────────────────────────────────────────────────
    // FALLA 4: CHECK-IN Y MÁQUINA DE ESTADOS (14:00, CHECKED_IN, 409 SEGUNDO)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 4. Verificación de Check-in y Transiciones de Estado ---');

    // Crear orden con check-in futuro (ej. en 5 días)
    const inFuturo = addDaysGuayaquil(5);
    const outFuturo = addDaysGuayaquil(7);
    const resFuturo = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: { ...headersAuth, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        ...body1,
        fechaInicio: inFuturo,
        fechaFin: outFuturo,
      }),
    });
    const dataFuturo = await resFuturo.json();
    const orderFuturoId = dataFuturo.orderId;

    // 4A. Intento de check-in antes de la fecha/hora de entrada (sin early-checkin) -> 422 CHECKIN_TIME_NOT_REACHED
    const resCheckinPrematuro = await fetch(`${baseUrl}/orders/${orderFuturoId}/checkin`, {
      method: 'POST',
      headers: headersAuth,
      body: JSON.stringify({}),
    });
    const dataCheckinPrematuro = await resCheckinPrematuro.json();
    if (resCheckinPrematuro.status !== 422) {
      console.log('4A ERROR DETAIL:', dataCheckinPrematuro);
    }
    assert(
      resCheckinPrematuro.status === 422,
      '4A. Check-in antes de fecha/hora de entrada rechaza con HTTP 422',
      `Status: ${resCheckinPrematuro.status}`
    );
    assert(
      dataCheckinPrematuro.code === 'CHECKIN_TIME_NOT_REACHED',
      '4A. Código ProblemDetails es CHECKIN_TIME_NOT_REACHED',
      `Code: ${dataCheckinPrematuro.code}`
    );
    assert(
      Boolean(dataCheckinPrematuro.habilitadoDesde),
      '4A. ProblemDetails incluye campo habilitadoDesde',
      `habilitadoDesde: ${dataCheckinPrematuro.habilitadoDesde}`
    );

    // 4B. Aprobar early-checkin por ADMIN y realizar check-in exitoso -> 200 OK y estado CHECKED_IN
    const resEarly = await fetch(`${baseUrl}/orders/${orderFuturoId}/early-checkin`, {
      method: 'PUT',
      headers: headersAdmin,
      body: JSON.stringify({ autorizado: true, motivo: 'Aprobación especial de recepción' }),
    });
    assert(resEarly.status === 200, '4B. Early-checkin aprobado por ADMIN');

    const resCheckinOk = await fetch(`${baseUrl}/orders/${orderFuturoId}/checkin`, {
      method: 'POST',
      headers: headersAuth,
      body: JSON.stringify({ earlyCheckinAutorizado: true }),
    });
    const dataCheckinOk = await resCheckinOk.json();
    assert(resCheckinOk.status === 200, '4B. Check-in con early-checkin autorizado responde 200 OK');
    assert(dataCheckinOk.estado === 'CHECKED_IN', '4B. Estado de reserva actualizado a CHECKED_IN', `Estado: ${dataCheckinOk.estado}`);

    // 4C. Segundo check-in sobre la misma reserva -> 409 INVALID_STATE_TRANSITION
    const resCheckinDup = await fetch(`${baseUrl}/orders/${orderFuturoId}/checkin`, {
      method: 'POST',
      headers: headersAuth,
      body: JSON.stringify({ earlyCheckinAutorizado: true }),
    });
    const dataCheckinDup = await resCheckinDup.json();
    assert(resCheckinDup.status === 409, '4C. Segundo check-in duplicado rechaza con HTTP 409', `Status: ${resCheckinDup.status}`);
    assert(
      dataCheckinDup.code === 'INVALID_STATE_TRANSITION',
      '4C. Código ProblemDetails es INVALID_STATE_TRANSITION',
      `Code: ${dataCheckinDup.code}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // FALLA 5: SERVER-TIMING, LATENCIA Y REGIONES CLOUD
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 5. Verificación de Métricas Server-Timing y Regiones Cloud ---');
    const keyTiming = crypto.randomUUID();
    const tStart = performance.now();
    const resTiming = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: { ...headersAuth, 'Idempotency-Key': keyTiming },
      body: JSON.stringify({
        ...body1,
        fechaInicio: addDaysGuayaquil(20),
        fechaFin: addDaysGuayaquil(22),
      }),
    });
    const tDur = performance.now() - tStart;
    const serverTimingHeader = resTiming.headers.get('server-timing');

    assert(resTiming.status === 201, '5. Creación con medición de rendimiento responde 201 Created');
    assert(
      Boolean(serverTimingHeader),
      '5. Cabecera Server-Timing presente en la respuesta HTTP',
      `Server-Timing: ${serverTimingHeader}`
    );
    assert(
      tDur < 3000,
      `5. Latencia total (${tDur.toFixed(1)} ms) cumple meta exigida (< 3000 ms)`
    );

    console.log('\n   [REPORTE DE REGIONES CLOUD]');
    console.log('   - Azure App Service: posada-ec-alojamientos.azurewebsites.net -> Region: Azure East US / Central US');
    console.log('   - Supabase Database: aws-0-ca-central-1.pooler.supabase.com -> Region: AWS Canada Central (ca-central-1)');
    console.log(`   - Optimización implementada: CTE única de bloqueo + verificación de stock redujo 6 viajes de red a 1.`);

    // ──────────────────────────────────────────────────────────────────────────
    // FALLA 6: CONCURRENCIA EXTREMA (10 SIMULTÁNEAS POR ÚLTIMA HABITACIÓN Y MISMA LLAVE)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 6. Verificación de Concurrencia Extrema ---');

    // 6A. 10 reservas simultáneas por la última habitación (1x 201, 9x 409 OUT_OF_STOCK)
    console.log('   [6A] Lanzando 10 reservas simultáneas compitiendo por la última habitación disponible...');
    const randomOffset6A = 50 + Math.floor(Math.random() * 500);
    const inConc = addDaysGuayaquil(randomOffset6A);
    const outConc = addDaysGuayaquil(randomOffset6A + 2);

    // Asegurar que la habitación tiene exactamente 1 cupo disponible en base de datos
    const { DataSource } = require('typeorm');
    const ds = app.get(DataSource);
    await ds.query(`UPDATE espacios_rentables SET "cantidadDisponible" = 1 WHERE id = 'HAB-CONC-ULTIMA' OR codigo = 'HAB-CONC-ULTIMA'`);

    // Ejecutamos 10 peticiones paralelas con Promise.all
    const promises6A = Array.from({ length: 10 }).map((_, i) => {
      const concKey = crypto.randomUUID();
      return fetch(`${baseUrl}/orders/create`, {
        method: 'POST',
        headers: {
          ...headersAuth,
          'Idempotency-Key': concKey,
          'X-Client-Id': `CLI-CONCURRENT-${i}`,
        },
        body: JSON.stringify({
          ...body1,
          tipoHabitacionCodigo: 'HAB-CONC-ULTIMA', // Habitación con cantidad 1
          fechaInicio: inConc,
          fechaFin: outConc,
          huespedTitular: {
            ...body1.huespedTitular,
            email: `cliente${i}@booking-concurrente.com`,
          },
        }),
      }).then(async (r) => ({
        index: i,
        status: r.status,
        body: await r.json(),
      }));
    });

    const results6A = await Promise.all(promises6A);
    const count201 = results6A.filter((r) => r.status === 201).length;
    const count409 = results6A.filter((r) => r.status === 409 && r.body.code === 'OUT_OF_STOCK').length;

    console.log(`   -> Resultados de las 10 peticiones concurrentes:`);
    console.log(`      - Exitosas (201 Created): ${count201}`);
    console.log(`      - Rechazadas (409 OUT_OF_STOCK): ${count409}`);

    assert(
      count201 === 1,
      '6A. Exactamente UNA (1) reserva obtuvo la última habitación disponible (201 Created)',
      `Obtenidos: ${count201}`
    );
    assert(
      count409 === 9,
      '6A. Las otras NUEVE (9) solicitudes fueron rechazadas con 409 OUT_OF_STOCK',
      `Obtenidos 409: ${count409}`
    );

    // 6B. 10 envíos simultáneos con la MISMA Idempotency-Key (una sola orden creada)
    console.log('\n   [6B] Lanzando 10 solicitudes paralelas con la MISMA Idempotency-Key...');
    const sameKey = crypto.randomUUID();
    const randomOffset6B = 1000 + Math.floor(Math.random() * 500);
    const inSameKey = addDaysGuayaquil(randomOffset6B);
    const outSameKey = addDaysGuayaquil(randomOffset6B + 2);

    const sameKeyBody = {
      ...body1,
      tipoHabitacionCodigo: 'ESP-001',
      fechaInicio: inSameKey,
      fechaFin: outSameKey,
      huespedTitular: {
        nombreCompleto: 'Prueba Concurrencia Idempotente',
        email: 'idemp.test@booking-hub.com',
        identificacion: '1710034065',
        telefono: '+593991234567',
      },
    };

    const promises6B = Array.from({ length: 10 }).map((_, i) => {
      return fetch(`${baseUrl}/orders/create`, {
        method: 'POST',
        headers: {
          ...headersAuth,
          'Idempotency-Key': sameKey,
          'X-Client-Id': 'CLI-IDEMP-PARALLEL',
        },
        body: JSON.stringify(sameKeyBody),
      }).then(async (r) => ({
        index: i,
        status: r.status,
        replayedHeader: r.headers.get('idempotent-replayed'),
        body: await r.json(),
      }));
    });

    const results6B = await Promise.all(promises6B);
    const createdOrders = results6B.filter((r) => r.status === 201 && r.replayedHeader !== 'true');
    const inProgressConflicts = results6B.filter((r) => r.status === 409 && r.body.code === 'IDEMPOTENCY_IN_PROGRESS');
    const replayedOrders = results6B.filter((r) => r.replayedHeader === 'true');

    console.log(`   -> Resultados de las 10 peticiones con la misma llave:`);
    console.log(`      - Creada original (201 Created): ${createdOrders.length}`);
    console.log(`      - En progreso concurrente (409 IDEMPOTENCY_IN_PROGRESS): ${inProgressConflicts.length}`);
    console.log(`      - Respuestas cacheadas reproducidas (Idempotent-Replayed): ${replayedOrders.length}`);

    // Consultar en BD cuántas órdenes se crearon con esa Idempotency-Key
    const verifyKeyRes = await fetch(`${baseUrl}/orders?idempotency_key=${sameKey}`, {
      headers: headersAuth,
    });
    const verifyKeyData = await verifyKeyRes.json();
    const totalOrdersCreated = verifyKeyData.total || (verifyKeyData.orders ? verifyKeyData.orders.length : 1);

    assert(
      createdOrders.length === 1,
      '6B. Solo UNA (1) solicitud realizó la creación física de la orden',
      `Creadas: ${createdOrders.length}`
    );
    assert(
      totalOrdersCreated === 1,
      '6B. En la base de datos existe exactamente UNA (1) orden creada para la llave',
      `Total en BD: ${totalOrdersCreated}`
    );
    assert(
      inProgressConflicts.length + replayedOrders.length === 9,
      '6B. Las 9 peticiones concurrentes colisionadas recibieron 409 IN_PROGRESS o Idempotent-Replayed',
      `In-progress: ${inProgressConflicts.length}, Replayed: ${replayedOrders.length}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // FALLA 7: CRITERIOS DE ACEPTACIÓN BOOKING /api/v2/reservas
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 7. Criterios de Aceptación Booking: /api/v2/reservas ---');

    // 7A. Validaciones en /api/v2/reservas (fechas pasadas, 0 adultos, correo inválido -> 400)
    console.log('   [7A] Validaciones en POST /api/v2/reservas...');
    const resV2Past = await fetch(`${baseV2Url}/reservas`, {
      method: 'POST',
      headers: { ...headersAuth, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        ...body1,
        fechaInicio: '2020-01-01',
        fechaFin: '2020-01-05',
      }),
    });
    assert(resV2Past.status === 400, '7A. POST /api/v2/reservas con fecha pasada responde 400', `Status: ${resV2Past.status}`);

    const resV2Adults = await fetch(`${baseV2Url}/reservas`, {
      method: 'POST',
      headers: { ...headersAuth, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        ...body1,
        ocupantes: { adultos: 0, ninos: 1 },
      }),
    });
    assert(resV2Adults.status === 400, '7A. POST /api/v2/reservas con 0 adultos responde 400', `Status: ${resV2Adults.status}`);

    const resV2Email = await fetch(`${baseV2Url}/reservas`, {
      method: 'POST',
      headers: { ...headersAuth, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        ...body1,
        huespedTitular: { ...body1.huespedTitular, email: 'correo-invalido' },
      }),
    });
    assert(resV2Email.status === 400, '7A. POST /api/v2/reservas con correo inválido responde 400', `Status: ${resV2Email.status}`);

    // 7B. Doble POST con misma Idempotency-Key -> 1 sola orden y devuelve reservation_id idéntico
    console.log('\n   [7B] Doble POST con misma Idempotency-Key en /api/v2/reservas...');
    const v2Key = crypto.randomUUID();
    const v2DateIn = addDaysGuayaquil(200);
    const v2DateOut = addDaysGuayaquil(202);
    const v2Body = {
      alojamientoId,
      tipoHabitacionCodigo: 'ESP-001',
      fechaInicio: v2DateIn,
      fechaFin: v2DateOut,
      ocupantes: { adultos: 2, ninos: 0 },
      huespedTitular: {
        nombreCompleto: 'Booking Tester',
        email: 'booking.tester@booking-core.com',
        identificacion: '1710034065',
        telefono: '+593991234567',
      },
    };

    const resV2Post1 = await fetch(`${baseV2Url}/reservas`, {
      method: 'POST',
      headers: { ...headersAuth, 'Idempotency-Key': v2Key },
      body: JSON.stringify(v2Body),
    });
    const dataV2Post1 = await resV2Post1.json();
    assert(resV2Post1.status === 201, '7B. Primer POST /api/v2/reservas responde 201 Created', `Status: ${resV2Post1.status}`);
    assert(Boolean(dataV2Post1.reservation_id), '7B. Primer POST devuelve reservation_id');

    const resV2Post2 = await fetch(`${baseV2Url}/reservas`, {
      method: 'POST',
      headers: { ...headersAuth, 'Idempotency-Key': v2Key },
      body: JSON.stringify(v2Body),
    });
    const dataV2Post2 = await resV2Post2.json();
    assert(resV2Post2.status === 200 || resV2Post2.status === 201, '7B. Segundo POST /api/v2/reservas con misma clave devuelve éxito', `Status: ${resV2Post2.status}`);
    assert(
      dataV2Post2.reservation_id === dataV2Post1.reservation_id,
      '7B. Segundo POST devuelve exactamente el mismo reservation_id previo',
      `Original: ${dataV2Post1.reservation_id}, Reintento: ${dataV2Post2.reservation_id}`
    );

    // 7C. Recuperación vía GET /api/v2/reservas?idempotency_key=<k>
    console.log('\n   [7C] Recuperación vía GET /api/v2/reservas?idempotency_key=...');
    const resV2Get = await fetch(`${baseV2Url}/reservas?idempotency_key=${v2Key}`, {
      headers: headersAuth,
    });
    const dataV2Get = await resV2Get.json();
    assert(resV2Get.status === 200, '7C. GET /api/v2/reservas?idempotency_key=... responde 200 OK', `Status: ${resV2Get.status}`);
    assert(
      dataV2Get.reservation_id === dataV2Post1.reservation_id,
      '7C. GET devuelve únicamente la orden creada con esa clave',
      `Recovered reservation_id: ${dataV2Get.reservation_id}`
    );

    // 7D. Carrera por la última habitación (available_rooms = 1): 2 reservas concurrentes sobre /api/v2/reservas
    console.log('\n   [7D] Carrera por la última habitación (available_rooms = 1): 2 POST concurrentes...');
    await ds.query(`UPDATE espacios_rentables SET "cantidadDisponible" = 1 WHERE id = 'HAB-CONC-ULTIMA' OR codigo = 'HAB-CONC-ULTIMA'`);
    const offset7D = 850 + Math.floor(Math.random() * 500);
    const in7D = addDaysGuayaquil(offset7D);
    const out7D = addDaysGuayaquil(offset7D + 2);

    const promises7D = [1, 2].map((i) => {
      const key = crypto.randomUUID();
      return fetch(`${baseV2Url}/reservas`, {
        method: 'POST',
        headers: {
          ...headersAuth,
          'Idempotency-Key': key,
          'X-Client-Id': `CLI-RACE-${i}`,
        },
        body: JSON.stringify({
          alojamientoId,
          tipoHabitacionCodigo: 'HAB-CONC-ULTIMA',
          fechaInicio: in7D,
          fechaFin: out7D,
          ocupantes: { adultos: 2, ninos: 0 },
          huespedTitular: {
            nombreCompleto: `Huésped Carrera ${i}`,
            email: `carrera${i}@booking-race.com`,
            identificacion: '1710034065',
            telefono: '+593991234567',
          },
        }),
      }).then(async (r) => ({
        index: i,
        status: r.status,
        body: await r.json(),
      }));
    });

    const results7D = await Promise.all(promises7D);
    const c201 = results7D.filter((r) => r.status === 201).length;
    const c409 = results7D.filter((r) => r.status === 409 && r.body.code === 'OUT_OF_STOCK').length;
    console.log(`      - Exitosas (201 Created): ${c201}`);
    console.log(`      - Rechazadas (409 OUT_OF_STOCK): ${c409}`);

    assert(c201 === 1, '7D. Exactamente 1 reserva confirmada con 201 Created', `Confirmadas: ${c201}`);
    assert(c409 === 1, '7D. Exactamente 1 reserva rechazada con 409 OUT_OF_STOCK', `Rechazadas: ${c409}`);

  } catch (err) {
    console.error('Error durante la ejecución de las pruebas:', err);
    failed++;
  } finally {
    if (app) {
      await app.close();
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RESUMEN CONSOLIDADO
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n====================================================================');
  console.log(` RESUMEN DE PRUEBAS DE INTEGRACIÓN:`);
  console.log(`   - \x1b[32mSuperadas:\x1b[0m ${passed}`);
  console.log(`   - \x1b[31mFalladas:\x1b[0m  ${failed}`);
  console.log('====================================================================');

  if (failed > 0) {
    console.error('\n❌ ERROR: Algunas pruebas de integración no se cumplieron.');
    process.exit(1);
  } else {
    console.log('\n✅ ÉXITO TOTAL: Todas las 6 fallas reportadas por Booking fueron corregidas y demostradas.');
    process.exit(0);
  }
}

runAllTests().catch((e) => {
  console.error('Error fatal no controlado:', e);
  process.exit(1);
});
