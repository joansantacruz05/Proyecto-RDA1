import { spawn } from 'child_process';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = process.env.PORT || '3000';
const BASE_URL = process.env.API_URL || `http://127.0.0.1:${PORT}`;
const API_PREFIX = process.env.API_PREFIX !== undefined ? process.env.API_PREFIX : 'api/v1';
const API_URL = `${BASE_URL}/${API_PREFIX}`.replace(/\/+$/, '');
const ROOT_URL = BASE_URL.replace(/\/+$/, '');

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin123!*';

let passedCount = 0;
let failedCount = 0;
const results = [];

function record(name, passed, detail = '', durationMs = 0) {
  if (passed) {
    passedCount++;
    console.log(`  \x1b[32m✓ PASS\x1b[0m [${durationMs}ms] ${name}${detail ? ` (${detail})` : ''}`);
    results.push({ name, status: 'PASS', detail, durationMs });
  } else {
    failedCount++;
    console.error(`  \x1b[31m✗ FAIL\x1b[0m [${durationMs}ms] ${name}${detail ? ` -> ${detail}` : ''}`);
    results.push({ name, status: 'FAIL', detail, durationMs });
  }
}

async function request(url, options = {}) {
  const start = Date.now();
  try {
    const res = await fetch(url, options);
    const durationMs = Date.now() - start;
    let body = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await res.json().catch(() => null);
    } else {
      body = await res.text().catch(() => null);
    }
    return { status: res.status, ok: res.ok, headers: res.headers, body, durationMs };
  } catch (err) {
    const durationMs = Date.now() - start;
    return { status: 0, ok: false, headers: new Headers(), body: err.message, durationMs, error: err };
  }
}

// Asegurar servidor en ejecución
async function ensureServerRunning() {
  const check = await request(`${ROOT_URL}/health`);
  if (check.ok) {
    console.log(`✓ Servidor detectado activo en ${ROOT_URL}`);
    return null;
  }

  console.log(`! Servidor no detectado en ${ROOT_URL}. Iniciando instancia en segundo plano...`);
  const child = spawn('node', ['dist/main.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
    env: { ...process.env, PORT },
  });

  let startupLogs = '';
  child.stdout.on('data', (d) => {
    startupLogs += d.toString();
  });
  child.stderr.on('data', (d) => {
    startupLogs += d.toString();
  });

  // Esperar a que responda el endpoint health
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 600));
    const h = await request(`${ROOT_URL}/health`);
    if (h.ok) {
      console.log(`✓ Servidor iniciado exitosamente en ${ROOT_URL}`);
      return child;
    }
  }

  throw new Error(`No se pudo iniciar el servidor en ${ROOT_URL} tras 30 segundos.\nLogs:\n${startupLogs}`);
}

async function runSmokeTests() {
  console.log('\n================================================================');
  console.log('   LUXESTAYS · SUITE DE PRUEBAS AUTOMATIZADAS (SMOKE TESTS)     ');
  console.log('================================================================');
  console.log(`• Base URL: ${ROOT_URL}`);
  console.log(`• API URL:  ${API_URL}`);
  console.log(`• Hora:     ${new Date().toISOString()}\n`);

  let serverProcess = null;
  try {
    serverProcess = await ensureServerRunning();
  } catch (e) {
    console.error('Error fatal al asegurar servidor:', e.message);
    process.exit(1);
  }

  try {
    // ══════════════════════════════════════════════════════════════════════
    // 1. Verificación de Health y Raíz
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n[Fase 1 · Verificación de Health & Metadatos]');
    {
      const res = await request(`${ROOT_URL}/health`);
      const isOk = res.status === 200 && (res.body?.database === 'connected' || res.body?.database === 'healthy');
      record('GET /health responde 200 OK y database healthy', isOk, isOk ? '' : `Status: ${res.status}, Body: ${JSON.stringify(res.body)}`, res.durationMs);
    }
    {
      const res = await request(`${API_URL}/health`);
      const isOk = res.status === 200 && (res.body?.database === 'connected' || res.body?.database === 'healthy');
      record('GET /api/v1/health responde 200 OK y database healthy', isOk, isOk ? '' : `Status: ${res.status}, Body: ${JSON.stringify(res.body)}`, res.durationMs);
    }
    {
      const res = await request(`${ROOT_URL}/`);
      record('GET / responde 200 OK con metadatos del servicio', res.status === 200 && res.body?.servicio === 'alojamientos', '', res.durationMs);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 2. Catálogo y Búsqueda Pública
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n[Fase 2 · Catálogo y Búsqueda Pública]');
    let selectedAccId = null;
    let selectedRoomId = null;
    {
      const res = await request(`${API_URL}/alojamientos`);
      const isOk = res.status === 200 && Array.isArray(res.body) && res.body.length > 0;
      record('GET /alojamientos lista alojamientos disponibles', isOk, isOk ? `${res.body.length} encontrados` : `Status: ${res.status}`, res.durationMs);
      if (isOk) {
        selectedAccId = res.body[0].id;
      }
    }
    {
      const res = await request(`${API_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Fingerprint': 'smoke-test-fingerprint',
        },
        body: JSON.stringify({ rows: 5 }),
      });
      const isOk = (res.status === 200 || res.status === 201) && Array.isArray(res.body?.data) && res.body.data.length > 0;
      record('POST /search responde 200 OK con formato Hub Core', isOk, isOk ? '' : `Status: ${res.status}, Body: ${JSON.stringify(res.body)}`, res.durationMs);
    }
    {
      const res = await request(`${API_URL}/alojamientos/${selectedAccId}`);
      const isOk = res.status === 200 && res.body?.id === selectedAccId && Array.isArray(res.body?.habitaciones) && res.body.habitaciones.length > 0;
      record('GET /alojamientos/:id devuelve detalle con habitaciones', isOk, isOk ? `${res.body.habitaciones.length} habitaciones` : `Status: ${res.status}`, res.durationMs);
      if (isOk) {
        selectedRoomId = res.body.habitaciones[0].id;
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // 3. Autenticación y Tokens JWT
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n[Fase 3 · Autenticación y Autorización]');
    let clienteToken = null;
    let adminToken = null;
    let clienteId = null;

    {
      const res = await request(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'cliente@rda.com', contrasena: SEED_PASSWORD }),
      });
      const isOk = (res.status === 200 || res.status === 201) && !!res.body?.access_token;
      clienteToken = res.body?.access_token;
      clienteId = res.body?.usuario?.id;
      record('POST /auth/login cliente obtiene JWT válido', isOk, isOk ? '' : `Status: ${res.status}, Body: ${JSON.stringify(res.body)}`, res.durationMs);
    }
    {
      const res = await request(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'admin@rda.com', contrasena: SEED_PASSWORD }),
      });
      const isOk = (res.status === 200 || res.status === 201) && !!res.body?.access_token;
      adminToken = res.body?.access_token;
      record('POST /auth/login admin obtiene JWT válido', isOk, isOk ? '' : `Status: ${res.status}, Body: ${JSON.stringify(res.body)}`, res.durationMs);
    }
    {
      const res = await request(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'cliente@rda.com', contrasena: 'WrongPassword99!' }),
      });
      record('POST /auth/login con credenciales erróneas rechaza con 401', res.status === 401, '', res.durationMs);
    }
    {
      const res = await request(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${clienteToken}` },
      });
      record('GET /auth/me perfil protegido responde 200 OK sin exponer contrasena', res.status === 200 && !res.body?.contrasena, '', res.durationMs);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 4. Cotización y Previsualización (/orders/preview)
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n[Fase 4 · Cotización con Desglose Decimal Exacto]');
    let orderPreviewId = null;
    {
      const res = await request(`${API_URL}/orders/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clienteToken}`,
        },
        body: JSON.stringify({
          accommodation_id: selectedAccId,
          product_id: selectedRoomId,
          checkin: '2026-11-10',
          checkout: '2026-11-14',
          guests: { number_of_adults: 2, number_of_rooms: 1 },
        }),
      });

      const b = res.body;
      const decimalRegex = /^\d+\.\d{2}$/;
      const hasDecimals =
        decimalRegex.test(b?.price_breakdown?.subtotal?.amount) &&
        decimalRegex.test(b?.price_breakdown?.taxes?.amount) &&
        decimalRegex.test(b?.price_breakdown?.service_fee?.amount) &&
        decimalRegex.test(b?.price_breakdown?.total?.amount);

      const isOk = res.status === 200 && !!b?.order_preview_id && hasDecimals;
      orderPreviewId = b?.order_preview_id;
      record('POST /orders/preview devuelve 200 con breakdown en string de 2 decimales', isOk, isOk ? `Total: $${b.price_breakdown.total.amount} USD` : JSON.stringify(b), res.durationMs);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 5. Creación de Orden e Idempotencia (/orders/create)
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n[Fase 5 · Creación de Orden Transaccional e Idempotencia]');
    const idempotencyKey = crypto.randomUUID();
    let createdOrderId = null;
    const createPayload = {
      order_preview_id: orderPreviewId,
      payment_reference: 'EXT-PAY-TEST',
      accommodation_id: selectedAccId,
      product_id: selectedRoomId,
      dates: { checkin: '2026-11-10', checkout: '2026-11-14' },
      guests: { number_of_adults: 2, number_of_rooms: 1 },
      customer: {
        first_name: 'Cliente',
        last_name: 'Demo',
        email: 'cliente@rda.com',
      },
    };

    {
      const res = await request(`${API_URL}/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clienteToken}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(createPayload),
      });

      const isOk = res.status === 201 && (!!res.body?.order_id || !!res.body?.externalOrderId);
      createdOrderId = res.body?.order_id || res.body?.externalOrderId;
      record('POST /orders/create con Idempotency-Key crea orden 201 Created', isOk, isOk ? `Orden: ${createdOrderId}` : JSON.stringify(res.body), res.durationMs);
    }

    // Idempotencia: Repetir misma llave y mismo payload -> debe devolver 201 idéntico
    {
      const res = await request(`${API_URL}/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clienteToken}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(createPayload),
      });

      const isOk = res.status === 201 && (res.body?.order_id === createdOrderId || res.body?.externalOrderId === createdOrderId);
      record('POST /orders/create misma llave y mismo body reproduce respuesta 201 (sin duplicar)', isOk, '', res.durationMs);
    }

    // Idempotencia: Misma llave con payload alterado -> debe devolver 409 Conflict
    {
      const alteredPayload = {
        ...createPayload,
        dates: { checkin: '2026-11-15', checkout: '2026-11-20' },
      };
      const res = await request(`${API_URL}/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clienteToken}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(alteredPayload),
      });

      const isConflict = res.status === 409;
      record('POST /orders/create misma llave con body alterado devuelve 409 Conflict', isConflict, '', res.durationMs);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 6. Agotamiento de Capacidad (OUT_OF_STOCK)
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n[Fase 6 · Agotamiento de Capacidad y Bloqueo Concurrente]');
    {
      // Reservar repetidamente las mismas fechas hasta agotar stock
      const randomDay = Math.floor(Math.random() * 20) + 1;
      const dayStr = String(randomDay).padStart(2, '0');
      const nextDayStr = String(randomDay + 2).padStart(2, '0');
      const exhaustDates = { checkin: `2027-02-${dayStr}`, checkout: `2027-02-${nextDayStr}` };
      let outOfStockCaught = false;

      for (let i = 0; i < 15; i++) {
        const key = crypto.randomUUID();
        const res = await request(`${API_URL}/orders/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${clienteToken}`,
            'Idempotency-Key': key,
          },
          body: JSON.stringify({
            payment_reference: `PAY-EXHAUST-${i}`,
            accommodation_id: selectedAccId,
            product_id: selectedRoomId,
            dates: exhaustDates,
            guests: { number_of_adults: 2, number_of_rooms: 1 },
            customer: { first_name: 'Test', last_name: 'Exhaust', email: 'cliente@rda.com' },
          }),
        });

        if (res.status === 409) {
          outOfStockCaught = true;
          break;
        } else if (!res.ok) {
          console.log(`    ! Intento de reserva ${i} falló con status ${res.status}: ${JSON.stringify(res.body)}`);
        }
      }

      record('Reservas concurrentes hasta agotar stock disparan 409 OUT_OF_STOCK', outOfStockCaught, outOfStockCaught ? '' : 'No se recibió 409 en 15 intentos', 0);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 7. Pagos y Facturación Secuencial SRI
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n[Fase 7 · Pagos y Facturación Electrónica SRI]');
    {
      const res = await request(`${API_URL}/pagos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clienteToken}`,
        },
        body: JSON.stringify({
          reservaId: createdOrderId,
          metodoPagoId: 'MET-001',
          requiereFactura: true,
          factura: {
            identificacion: '1710034065',
            nombre: 'Cliente Demo',
            direccion: 'Av. Amazonas y Colón',
          },
        }),
      });

      const sriRegex = /^001-001-\d{9}$/;
      const numFactura = res.body?.factura?.numeroFactura;
      const isOk = (res.status === 200 || res.status === 201) && res.body?.estado === 'Completado' && sriRegex.test(numFactura);
      record('POST /pagos procesa pago y genera factura con formato SRI (001-001-XXXXXXXXX)', isOk, isOk ? `Factura: ${numFactura}` : JSON.stringify(res.body), res.durationMs);
    }

    // Intento de pago duplicado debe ser rechazado con 409
    {
      const res = await request(`${API_URL}/pagos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clienteToken}`,
        },
        body: JSON.stringify({
          reservaId: createdOrderId,
          metodoPagoId: 'MET-001',
        }),
      });

      record('POST /pagos duplicado sobre reserva pagada devuelve 409 Conflict', res.status === 409, '', res.durationMs);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 8. Consulta de Mis Facturas y Contrato Legal
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n[Fase 8 · Consultas de Facturas y Firma de Contrato]');
    {
      const res = await request(`${API_URL}/pagos/mis-facturas`, {
        headers: { Authorization: `Bearer ${clienteToken}` },
      });
      const isOk = res.status === 200 && Array.isArray(res.body) && res.body.length > 0;
      record('GET /pagos/mis-facturas lista facturas emitidas del usuario', isOk, '', res.durationMs);
    }
    {
      const res = await request(`${API_URL}/reservas/${createdOrderId}/firmar-contrato`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${clienteToken}` },
      });
      const isOk = (res.status === 200 || res.status === 201) && res.body?.firmado === true;
      record('POST /reservas/:id/firmar-contrato firma contrato legalmente', isOk, '', res.durationMs);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 9. Operaciones de Administrador
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n[Fase 9 · Panel de Administración]');
    {
      const res = await request(`${API_URL}/reservas/admin/todas`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const isOk = res.status === 200 && Array.isArray(res.body);
      record('GET /reservas/admin/todas accesible solo por Admin devuelve 200', isOk, '', res.durationMs);
    }
    {
      const res = await request(`${API_URL}/admin/usuarios`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const isOk = res.status === 200 && Array.isArray(res.body);
      record('GET /admin/usuarios lista usuarios registrados', isOk, '', res.durationMs);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 10. Cancelación de Orden e Idempotencia
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n[Fase 10 · Cancelación e Idempotencia]');
    // Crear una orden separada para probar cancelación dentro de la ventana permitida
    let orderToCancel = null;
    {
      const key = crypto.randomUUID();
      const res = await request(`${API_URL}/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clienteToken}`,
          'Idempotency-Key': key,
        },
        body: JSON.stringify({
          payment_reference: 'PAY-CANCEL-TEST',
          accommodation_id: selectedAccId,
          product_id: selectedRoomId,
          dates: { checkin: '2026-11-20', checkout: '2026-11-24' },
          guests: { number_of_adults: 1, number_of_rooms: 1 },
          customer: { first_name: 'Cliente', last_name: 'Demo', email: 'cliente@rda.com' },
        }),
      });
      orderToCancel = res.body?.order_id || res.body?.externalOrderId;
    }

    {
      const cancelKey = crypto.randomUUID();
      const res = await request(`${API_URL}/orders/${orderToCancel}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clienteToken}`,
          'Idempotency-Key': cancelKey,
        },
      });
      const isOk = res.status === 200 && res.body?.status === 'CANCELLED';
      record('POST /orders/:id/cancel cancela orden exitosamente', isOk, '', res.durationMs);
    }

    // Cancelación repetida debe responder 200 OK de manera idempotente
    {
      const cancelKey = crypto.randomUUID();
      const res = await request(`${API_URL}/orders/${orderToCancel}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clienteToken}`,
          'Idempotency-Key': cancelKey,
        },
      });
      const isOk = res.status === 200 && res.body?.status === 'CANCELLED';
      record('POST /orders/:id/cancel repetida es idempotente y responde 200 CANCELLED', isOk, '', res.durationMs);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 11. Regla de Negocio de Reseñas / Calificaciones
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n[Fase 11 · Regla de Negocio de Reseñas Post-Estancia]');
    {
      // Intentar calificar una reserva cuya estancia aún no concluye debe ser rechazado
      const res = await request(`${API_URL}/reservas/${createdOrderId}/calificar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clienteToken}`,
        },
        body: JSON.stringify({
          calificacion: 5,
          comentario: '¡Excelente experiencia!',
        }),
      });
      record('POST /reservas/:id/calificar rechaza con 409 si la estancia no ha concluido', res.status === 409, '', res.durationMs);
    }

  } catch (err) {
    console.error('\nERROR INESPERADO DURANTE LA EJECUCIÓN:', err);
    failedCount++;
  } finally {
    if (serverProcess) {
      console.log('\nCerrando servidor de pruebas...');
      serverProcess.kill('SIGTERM');
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Resumen Final
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n================================================================');
  console.log('                 RESUMEN DE RESULTADOS                          ');
  console.log('================================================================');
  console.log(`• Total de pruebas: ${passedCount + failedCount}`);
  console.log(`• \x1b[32mExitosas:\x1b[0m         ${passedCount}`);
  console.log(`• \x1b[31mFallidas:\x1b[0m         ${failedCount}`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    console.error('✗ Fallaron una o más pruebas críticas.');
    process.exit(1);
  } else {
    console.log('✓ TODAS LAS PRUEBAS DE INTEGRACIÓN Y SMOKE PASARON SATISFACTORIAMENTE.');
    process.exit(0);
  }
}

runSmokeTests();
