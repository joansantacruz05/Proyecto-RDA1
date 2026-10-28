import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

const PORT = process.env.GRPC_PORT || 50051;
const PROTO_PATH = path.join(__dirname, '..', 'proto', 'inventory.proto');

interface StoredSlot {
  service_id: string;
  item_id: string;
  date: string;
  time_slot: string;
  available_units: number;
  timestamp: number;
  slot_id: string;
  updated_at: number;
}

// Almacén en memoria de cupos indexados por `${item_id}:${date}:${slot_id}`
const inventoryStore = new Map<string, StoredSlot>();

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const inventoryProto = protoDescriptor.inventory;

const server = new grpc.Server();

// Implementación del servicio InventoryStockService
server.addService(inventoryProto.InventoryStockService.service, {
  // RPC 1: Actualización puntual de cupos por turno (Unary)
  PushStockUpdate: (call: any, callback: any) => {
    const msg = call.request;
    const key = `${msg.item_id}:${msg.date}:${msg.slot_id}`;

    console.log(`\x1b[36m[gRPC MOCK · PushStockUpdate]\x1b[0m Recibido evento:`);
    console.log(`  • Service ID:  ${msg.service_id}`);
    console.log(`  • Item ID:     ${msg.item_id}`);
    console.log(`  • Fecha/Turno: ${msg.date} ${msg.time_slot} (${msg.slot_id})`);
    console.log(`  • Unidades:    \x1b[33m${msg.available_units}\x1b[0m`);
    console.log(`  • Timestamp:   ${msg.timestamp}\n`);

    inventoryStore.set(key, {
      ...msg,
      updated_at: Date.now(),
    });

    callback(null, {
      success: true,
      message: 'Stock sincronizado e indexado correctamente en Booking Mock',
      processed_at: Date.now(),
      error_code: 'OK',
      current_available: msg.available_units,
    });
  },

  // RPC 2: Streaming continuo de deltas
  StreamInventoryChanges: (call: any, callback: any) => {
    let count = 0;
    console.log(`\x1b[36m[gRPC MOCK · StreamInventoryChanges]\x1b[0m Iniciando canal de streaming...`);

    call.on('data', (event: any) => {
      count++;
      const key = `${event.item_id}:${event.date}:${event.slot_id}`;
      const current = inventoryStore.get(key);
      const newUnits = Math.max(0, (current?.available_units || 0) + (event.delta || 0));

      inventoryStore.set(key, {
        service_id: event.service_id,
        item_id: event.item_id,
        date: event.date,
        time_slot: event.time_slot,
        available_units: newUnits,
        timestamp: event.timestamp,
        slot_id: event.slot_id,
        updated_at: Date.now(),
      });

      console.log(`  • Delta [${event.event_id}]: ${event.item_id} -> Delta: ${event.delta} (Total: ${newUnits})`);
    });

    call.on('end', () => {
      console.log(`\x1b[32m[gRPC MOCK]\x1b[0m Streaming finalizado. Total eventos procesados: ${count}\n`);
      callback(null, {
        total_events_processed: count,
        is_synchronized: true,
        last_sync_hash: `hash-mock-${Date.now()}`,
      });
    });
  },

  // RPC 3: Consulta puntual de disponibilidad confirmada (Unary)
  GetSlotAvailability: (call: any, callback: any) => {
    const req = call.request;
    const key = `${req.item_id}:${req.date}:${req.slot_id}`;
    const stored = inventoryStore.get(key);

    console.log(`\x1b[36m[gRPC MOCK · GetSlotAvailability]\x1b[0m Consulta de disponibilidad para ${req.item_id} (${req.date}):`);

    const units = stored ? stored.available_units : 5; // Default 5 si no se había emitido
    const status = units === 0 ? 'AGOTADO' : units <= 2 ? 'ULTIMOS_CUPOS' : 'DISPONIBLE';

    console.log(`  • Unidades en memoria: ${units} (${status})\n`);

    callback(null, {
      item_id: req.item_id,
      slot_id: req.slot_id,
      date: req.date,
      time_slot: req.time_slot || '14:00',
      available_units: units,
      status,
      last_updated_epoch: stored ? stored.updated_at : Date.now(),
    });
  },
});

server.bindAsync(
  `0.0.0.0:${PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (err, boundPort) => {
    if (err) {
      console.error(`Error al enlazar servidor gRPC en puerto ${PORT}:`, err);
      process.exit(1);
    }
    console.log('================================================================');
    console.log(`  BOOKING HUB · SERVIDOR MOCK gRPC ACTIVO EN PUERTO ${boundPort} `);
    console.log('================================================================');
    console.log(`• Contrato:  ${PROTO_PATH}`);
    console.log(`• Servicio:  inventory.InventoryStockService`);
    console.log(`• Esperando conexiones de LuxeStays...\n`);
  },
);
