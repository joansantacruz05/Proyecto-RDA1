const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { ProblemDetailsFilter } = require('./dist/common/filters/problem-details.filter');
const { ValidationPipe } = require('@nestjs/common');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro_123';
const JWT_ISSUER = process.env.JWT_ISSUER || 'https://auth.booking-hub.com';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'https://api.booking-hub.com';

function generateToken(userId, role, scope) {
  return jwt.sign(
    {
      sub: userId,
      id: userId,
      correo: 'test@booking-hub.com',
      rol: role,
      scope: scope,
    },
    JWT_SECRET,
    {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: '1h',
    }
  );
}

async function runTests() {
  console.log('--- Iniciando Verificación de Requisitos No Negociables del Hub ---');

  let app;
  let server;
  let baseUrl;
  let passed = 0;
  let failed = 0;

  try {
    app = await NestFactory.create(AppModule, { logger: console });
    const apiPrefix = process.env.API_PREFIX !== undefined ? process.env.API_PREFIX : 'api/v1';
    if (apiPrefix) {
      app.setGlobalPrefix(apiPrefix);
    }
    app.useGlobalFilters(new ProblemDetailsFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.listen(3099);
    server = app.getHttpServer();
    baseUrl = `http://localhost:3099/${apiPrefix}`;
  } catch (err) {
    console.error('CRITICAL INIT ERROR:', err);
    process.exit(1);
  }

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Test Rutas Públicas: /search y /availability
    console.log('\n[1. Rutas Públicas]');
    const searchRes = await fetch(`${baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Fingerprint': 'fingerprint-123',
      },
      body: JSON.stringify({ rows: 10 }),
    });
    const searchBody = await searchRes.json();
    assert(searchRes.status === 200 || searchRes.status === 201, 'POST /search es público y responde 200 OK');
    assert(Array.isArray(searchBody.data), '/search responde con estructura data array');

    const availRes = await fetch(`${baseUrl}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accommodation: 'ALO-001' }),
    });
    const availBody = await availRes.json();
    assert(availRes.status === 200, 'POST /availability es público y responde 200 OK');

    // 2. Test Seguridad y Scopes
    console.log('\n[2. Seguridad y Scopes]');
    const tokenRead = generateToken('user-1', 'Cliente', 'alojamientos:read');
    const tokenBook = generateToken('user-1', 'Cliente', 'alojamientos:read alojamientos:book');
    const tokenAll = generateToken('user-1', 'Admin', 'alojamientos:read alojamientos:book alojamientos:cancel alojamientos:webhooks');

    // /orders/preview sin token -> 401
    const prevNoAuth = await fetch(`${baseUrl}/orders/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const prevNoAuthBody = await prevNoAuth.json();
    assert(prevNoAuth.status === 401, 'POST /orders/preview sin token devuelve 401 Unauthorized');
    assert(prevNoAuth.headers.get('content-type').includes('application/problem+json'), 'Error devuelve application/problem+json');
    assert(prevNoAuthBody.code === 'VALIDATION_FAILED', 'Código de error en enum: VALIDATION_FAILED');

    // /orders/create con token sin scope -> 403
    const createForbidden = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenRead}`, // Solo tiene read, requiere book
        'Idempotency-Key': 'a0000000-0000-0000-0000-000000000001',
      },
      body: JSON.stringify({}),
    });
    const createForbiddenBody = await createForbidden.json();
    assert(createForbidden.status === 403, 'POST /orders/create con scope insuficiente devuelve 403 Forbidden');
    assert(createForbiddenBody.title.includes('Insufficient Scope') || createForbidden.status === 403, 'Mensaje de insuficiencia de scope');

    // 3. Test Idempotency-Key
    console.log('\n[3. Idempotency-Key]');
    // Sin header Idempotency-Key -> 400
    const createNoKey = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenBook}`,
      },
      body: JSON.stringify({}),
    });
    const createNoKeyBody = await createNoKey.json();
    assert(createNoKey.status === 400, 'POST /orders/create sin Idempotency-Key devuelve 400 Bad Request');
    assert(createNoKeyBody.code === 'VALIDATION_FAILED', 'ProblemDetails reporta VALIDATION_FAILED');

    // Con Idempotency-Key inválida -> 400
    const createBadKey = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenBook}`,
        'Idempotency-Key': 'no-es-uuid',
      },
      body: JSON.stringify({}),
    });
    const createBadKeyBody = await createBadKey.json();
    assert(createBadKey.status === 400, 'POST /orders/create con Idempotency-Key que no es UUID devuelve 400');

    // 4. Test Preview y Creación de Orden (Dueño de la orden inferido de sub)
    console.log('\n[4. Creación y Dueño de Orden]');
    const previewRes = await fetch(`${baseUrl}/orders/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenRead}`,
      },
      body: JSON.stringify({
        accommodation_id: 'ALO-001',
        product_id: 'HAB-001',
        guests: { number_of_adults: 2, number_of_rooms: 1 },
      }),
    });
    const previewBody = await previewRes.json();
    assert(previewRes.status === 200, 'POST /orders/preview con token válido devuelve 200 OK');
    const previewId = previewBody.data?.order_preview_id;
    assert(typeof previewId === 'string' && previewId.startsWith('PREV-'), 'order_preview_id generado');

    const testIdempotencyKey = 'b1111111-2222-3333-4444-555555555555';
    const orderPayload = {
      order_preview_id: previewId,
      payment_reference: 'PAY-TEST-12345',
      customer_details: {
        first_name: 'Juan',
        last_name: 'Perez',
        email: 'juan@example.com',
      },
    };

    const createRes1 = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenBook}`,
        'Idempotency-Key': testIdempotencyKey,
      },
      body: JSON.stringify(orderPayload),
    });
    const createBody1 = await createRes1.json();

    assert(createRes1.status === 201, 'POST /orders/create con token y llave devuelve 201 Created');
    assert(typeof createBody1.order_id === 'string', 'order_id generado en formato UUID');
    assert(createBody1.status === 'CONFIRMED', 'Estado de la orden es CONFIRMED');
    assert(typeof createBody1.locator === 'string', 'Localizador generado');
    const createdOrderId = createBody1.order_id;

    // 5. Test Idempotency Replay (Misma llave + Mismo cuerpo)
    console.log('\n[5. Idempotencia: Misma Llave y Mismo Cuerpo]');
    const createRes2 = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenBook}`,
        'Idempotency-Key': testIdempotencyKey,
      },
      body: JSON.stringify(orderPayload),
    });
    const createBody2 = await createRes2.json();

    assert(createRes2.status === 201, 'Misma llave y cuerpo devuelve status 201');
    assert(createBody2.order_id === createdOrderId, 'Misma llave y cuerpo devuelve exactamente la misma respuesta cacheada');

    // 6. Test Idempotency Conflict (Misma llave + Distinto cuerpo -> 409)
    console.log('\n[6. Idempotencia: Misma Llave y Distinto Cuerpo]');
    const createResConflict = await fetch(`${baseUrl}/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenBook}`,
        'Idempotency-Key': testIdempotencyKey,
      },
      body: JSON.stringify({ ...orderPayload, payment_reference: 'PAY-ALTERED-REF' }),
    });

    assert(createResConflict.status === 409, 'Misma llave con distinto cuerpo devuelve 409 Conflict');
    assert(createResConflict.headers.get('content-type').includes('application/problem+json'), 'Conflicto devuelve application/problem+json');
    assert(createResConflict.headers.get('retry-after') !== null, 'Respuesta 409 incluye cabecera Retry-After');

    // 7. Test Obtener Orden: GET /orders/:orderId
    console.log('\n[7. Consultar Orden]');
    const getRes = await fetch(`${baseUrl}/orders/${createdOrderId}`, {
      headers: { 'Authorization': `Bearer ${tokenRead}` },
    });
    const getBody = await getRes.json();

    assert(getRes.status === 200, 'GET /orders/:orderId devuelve 200 OK');
    assert(getBody.order_id === createdOrderId, 'ID de orden coincide');
    assert(getBody._links !== undefined, 'Incluye links HATEOAS self, modify, cancel');

    // 8. Test Modificar Orden: POST /orders/:orderId/modify
    console.log('\n[8. Modificar Orden]');
    const modifyKey = 'c2222222-3333-4444-5555-666666666666';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 4);

    const modifyRes = await fetch(`${baseUrl}/orders/${createdOrderId}/modify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenBook}`,
        'Idempotency-Key': modifyKey,
      },
      body: JSON.stringify({
        checkin: tomorrow.toISOString().split('T')[0],
        checkout: dayAfter.toISOString().split('T')[0],
        guests: { number_of_adults: 3 },
      }),
    });

    assert(modifyRes.status === 200, 'POST /orders/:orderId/modify devuelve 200 OK con fechas actualizadas');

    // 9. Test Cancelar Orden: POST /orders/:orderId/cancel
    console.log('\n[9. Cancelar Orden]');
    const cancelKey = 'd3333333-4444-5555-6666-777777777777';
    const cancelRes = await fetch(`${baseUrl}/orders/${createdOrderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAll}`,
        'Idempotency-Key': cancelKey,
      },
    });
    const cancelBody = await cancelRes.json();

    assert(cancelRes.status === 200, 'POST /orders/:orderId/cancel devuelve 200 OK');
    assert(cancelBody.status === 'CANCELLED', 'Estado de la orden cambia a CANCELLED');

    // Re-cancelar orden ya cancelada -> 409 CANCELLATION_NOT_ALLOWED
    const cancelAgainKey = 'e4444444-5555-6666-7777-888888888888';
    const cancelAgain = await fetch(`${baseUrl}/orders/${createdOrderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAll}`,
        'Idempotency-Key': cancelAgainKey,
      },
    });
    const cancelAgainBody = await cancelAgain.json();

    assert(cancelAgain.status === 409, 'Re-cancelar orden cancelada devuelve 409 Conflict');
    assert(cancelAgainBody.code === 'CANCELLATION_NOT_ALLOWED', 'Código ProblemDetails es CANCELLATION_NOT_ALLOWED');
    assert(cancelAgain.headers.get('retry-after') !== null, 'Cabecera Retry-After presente en 409');

    // 10. Webhooks
    console.log('\n[10. Webhooks]');
    const webhookRes = await fetch(`${baseUrl}/webhooks`, {
      headers: { 'Authorization': `Bearer ${tokenAll}` },
    });
    assert(webhookRes.status === 200, 'GET /webhooks responde 200 OK con scope alojamientos:webhooks');

  } catch (err) {
    console.error('Error durante la ejecución de pruebas:', err);
    failed++;
  } finally {
    await app.close();
    console.log(`\n========================================`);
    console.log(`Pruebas completadas: ${passed} PASADAS, ${failed} FALLADAS`);
    console.log(`========================================`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
