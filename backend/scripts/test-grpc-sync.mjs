import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, '..', 'proto', 'inventory.proto');
const GRPC_PORT = 50051;
const GRPC_URL = `127.0.0.1:${GRPC_PORT}`;

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    passedCount++;
    console.log(`  \x1b[32m✓ PASS\x1b[0m ${testName}${detail ? ` (${detail})` : ''}`);
  } else {
    failedCount++;
    console.error(`  \x1b[31m✗ FAIL\x1b[0m ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function runGrpcSyncTests() {
  console.log('================================================================');
  console.log('    LUXESTAYS · SUITE DE VERIFICACIÓN gRPC INVENTORY SYNC       ');
  console.log('================================================================');

  // 1. Iniciar Mock Booking Server
  console.log('\n[1. Iniciando Mock Booking Server en puerto 50051...]');
  const mockServerProcess = spawn('npx', ['tsx', 'scripts/mock-booking-grpc.ts'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
    shell: true,
  });

  mockServerProcess.stdout.on('data', (d) => {
    // console.log(`[mock stdout] ${d}`);
  });
  mockServerProcess.stderr.on('data', (d) => {
    // console.error(`[mock stderr] ${d}`);
  });

  // Esperar a que el puerto 50051 esté escuchando
  await new Promise((resolve) => setTimeout(resolve, 2500));

  let client = null;
  try {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const InventoryStockService = protoDescriptor.inventory.InventoryStockService;

    client = new InventoryStockService(GRPC_URL, grpc.credentials.createInsecure());
    assert(!!client, 'Cliente gRPC inicializado hacia Mock Booking');

    // 2. Probar PushStockUpdate Unary
    console.log('\n[2. Probando RPC PushStockUpdate]');
    const testSlot = {
      service_id: 'alojamientos',
      item_id: 'HTL-UIO-001:SUITE_PRESIDENCIAL',
      date: '2026-11-20',
      time_slot: '14:00',
      available_units: 3,
      timestamp: Date.now(),
      slot_id: 'slot-20261120-1400',
    };

    const pushAck = await new Promise((resolve, reject) => {
      client.PushStockUpdate(testSlot, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });

    assert(pushAck.success === true, 'PushStockUpdate devuelve success: true');
    assert(pushAck.error_code === 'OK', 'PushStockUpdate devuelve error_code: OK');
    assert(pushAck.current_available === 3, 'PushStockUpdate confirma current_available: 3');

    // 3. Probar GetSlotAvailability Unary
    console.log('\n[3. Probando RPC GetSlotAvailability]');
    const queryReq = {
      service_id: 'alojamientos',
      item_id: 'HTL-UIO-001:SUITE_PRESIDENCIAL',
      date: '2026-11-20',
      time_slot: '14:00',
      slot_id: 'slot-20261120-1400',
    };

    const queryRes = await new Promise((resolve, reject) => {
      client.GetSlotAvailability(queryReq, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });

    assert(queryRes.item_id === 'HTL-UIO-001:SUITE_PRESIDENCIAL', 'GetSlotAvailability devuelve item_id correcto');
    assert(queryRes.available_units === 3, 'GetSlotAvailability refleja cupos sincronizados (3 unidades)');
    assert(queryRes.status === 'DISPONIBLE', 'GetSlotAvailability devuelve estado DISPONIBLE');

    // 4. Probar StreamInventoryChanges
    console.log('\n[4. Probando RPC StreamInventoryChanges]');
    const streamSummary = await new Promise((resolve, reject) => {
      const call = client.StreamInventoryChanges((err, res) => {
        if (err) return reject(err);
        resolve(res);
      });

      // Enviar 3 eventos delta
      call.write({
        event_id: 'evt-delta-001',
        service_id: 'alojamientos',
        item_id: 'HTL-UIO-001:SUITE_PRESIDENCIAL',
        date: '2026-11-20',
        time_slot: '14:00',
        delta: -1,
        timestamp: Date.now(),
        slot_id: 'slot-20261120-1400',
      });

      call.write({
        event_id: 'evt-delta-002',
        service_id: 'alojamientos',
        item_id: 'HTL-UIO-001:SUITE_PRESIDENCIAL',
        date: '2026-11-20',
        time_slot: '14:00',
        delta: -1,
        timestamp: Date.now() + 10,
        slot_id: 'slot-20261120-1400',
      });

      call.end();
    });

    assert(streamSummary.total_events_processed === 2, 'StreamInventoryChanges procesó 2 eventos');
    assert(streamSummary.is_synchronized === true, 'StreamInventoryChanges confirma sincronización');

    // 5. Verificar que GetSlotAvailability refleja los deltas aplicados (3 - 2 = 1 unidad)
    console.log('\n[5. Verificando aforo tras aplicar stream de deltas]');
    const postStreamQuery = await new Promise((resolve, reject) => {
      client.GetSlotAvailability(queryReq, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });

    assert(postStreamQuery.available_units === 1, 'Aforo actualizado tras streaming es 1 unidad (3 - 2)');
    assert(postStreamQuery.status === 'ULTIMOS_CUPOS', 'Aforo <= 2 activa estado ULTIMOS_CUPOS');

  } catch (err) {
    console.error('Error durante ejecución de prueba gRPC:', err);
    failedCount++;
  } finally {
    if (client) {
      client.close();
    }
    mockServerProcess.kill();
  }

  console.log('\n================================================================');
  console.log(`  Total: ${passedCount + failedCount} | \x1b[32mExitosas: ${passedCount}\x1b[0m | \x1b[31mFallidas: ${failedCount}\x1b[0m`);
  console.log('================================================================\n');

  process.exit(failedCount > 0 ? 1 : 0);
}

runGrpcSyncTests();
