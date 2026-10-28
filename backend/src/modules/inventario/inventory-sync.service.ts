import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InventoryGrpcClient } from './inventory-grpc.client';
import { generateEntityId } from '../../common/utils/password-rules';

@Injectable()
export class InventorySyncService {
  private readonly logger = new Logger(InventorySyncService.name);
  private isProcessing = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly grpcClient: InventoryGrpcClient,
  ) {}

  /**
   * Calcula las unidades disponibles para un espacio rentable en una fecha específica
   * Disponibles = cantidadDisponible - COUNT(reservas activas EST-001 o EST-002 que cubren la noche)
   */
  async calculateAvailableUnits(espacioId: string, dateStr: string, manager?: EntityManager): Promise<number> {
    const mgr = manager || this.dataSource.manager;
    const res = await mgr.query(
      `SELECT (
         e."cantidadDisponible" - (
           SELECT COUNT(*) 
           FROM reservas r 
           WHERE r."espacioId" = e.id 
             AND r."estadoId" IN ('EST-001', 'EST-002') 
             AND r."fechaEntrada" <= $2 AND r."fechaSalida" > $2
         )
       ) as disponibles
       FROM espacios_rentables e
       WHERE e.id = $1`,
      [espacioId, dateStr],
    );

    const disponibles = Number(res[0]?.disponibles || 0);
    return Math.max(0, disponibles);
  }

  /**
   * Encola eventos en stock_outbox para cada noche comprendida entre fechaInicio y fechaFin
   */
  async enqueueStockUpdate(
    manager: EntityManager,
    espacioId: string,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<void> {
    try {
      const roomRows = await manager.query(
        `SELECT e.id, e.codigo as "espacioCodigo", a.codigo as "alojamientoCodigo"
         FROM espacios_rentables e
         JOIN alojamientos a ON a.id = e."alojamientoId"
         WHERE e.id = $1`,
        [espacioId],
      );

      if (!roomRows || roomRows.length === 0) {
        this.logger.warn(`No se encontró espacio ${espacioId} para encolar outbox`);
        return;
      }

      const room = roomRows[0];
      const itemId = `${room.alojamientoCodigo || 'ALO'}:${room.espacioCodigo || room.id}`;

      // Iterar sobre cada noche del rango
      const cur = new Date(fechaInicio);
      const end = new Date(fechaFin);

      while (cur < end) {
        const dateStr = cur.toISOString().split('T')[0];
        const availableUnits = await this.calculateAvailableUnits(espacioId, dateStr, manager);
        const outboxId = generateEntityId('OUT');

        await manager.query(
          `INSERT INTO stock_outbox (id, "itemId", fecha, unidades, ts, estado, intentos)
           VALUES ($1, $2, $3, $4, $5, 'Pendiente', 0)`,
          [outboxId, itemId, dateStr, availableUnits, Date.now()],
        );

        cur.setDate(cur.getDate() + 1);
      }

      this.logger.log(`Outbox encolado para ${itemId} entre ${fechaInicio} y ${fechaFin}`);

      // Despachar de forma asíncrona post-commit
      setImmediate(() => this.processOutbox().catch((e) => this.logger.error(`Error procesando outbox: ${e.message}`)));
    } catch (err) {
      this.logger.error(`Error al encolar en stock_outbox: ${err.message}`);
    }
  }

  /**
   * Lee la tabla stock_outbox y despacha los eventos pendientes vía gRPC hacia Booking
   */
  async processOutbox(): Promise<{ processed: number; sent: number; failed: number }> {
    if (this.isProcessing) return { processed: 0, sent: 0, failed: 0 };
    this.isProcessing = true;

    let processed = 0;
    let sent = 0;
    let failed = 0;

    try {
      const grpcEnabled = this.configService.get<string>('GRPC_ENABLED') === 'true';
      const serviceId = this.configService.get<string>('GRPC_SERVICE_ID') || 'alojamientos';

      const pendingRows = await this.dataSource.query(
        `SELECT id, "itemId", fecha, unidades, ts, intentos 
         FROM stock_outbox 
         WHERE estado = 'Pendiente' AND intentos < 5 
         ORDER BY "creadoEn" ASC 
         LIMIT 50`,
      );

      for (const row of pendingRows) {
        processed++;
        const dateStr = row.fecha instanceof Date ? row.fecha.toISOString().split('T')[0] : String(row.fecha).split('T')[0];
        const dateCompact = dateStr.replace(/-/g, '');
        const slotId = `slot-${dateCompact}-1400`;

        if (!grpcEnabled) {
          // Modo desconectado / desarrollo: marcar como Simulado
          await this.dataSource.query(
            `UPDATE stock_outbox SET estado = 'Simulado', "ultimoError" = 'gRPC no habilitado en entorno local' WHERE id = $1`,
            [row.id],
          );
          sent++;
          continue;
        }

        try {
          const ack = await this.grpcClient.pushStockUpdate({
            service_id: serviceId,
            item_id: row.itemId,
            date: dateStr,
            time_slot: '14:00',
            available_units: Number(row.unidades),
            timestamp: Number(row.ts) || Date.now(),
            slot_id: slotId,
          });

          if (ack.success) {
            await this.dataSource.query(
              `UPDATE stock_outbox SET estado = 'Enviado', "ultimoError" = NULL WHERE id = $1`,
              [row.id],
            );
            sent++;
          } else {
            await this.dataSource.query(
              `UPDATE stock_outbox SET intentos = intentos + 1, "ultimoError" = $2 WHERE id = $1`,
              [row.id, ack.message || ack.error_code || 'Error desconocido del Booking Hub'],
            );
            failed++;
          }
        } catch (callErr) {
          await this.dataSource.query(
            `UPDATE stock_outbox SET intentos = intentos + 1, "ultimoError" = $2 WHERE id = $1`,
            [row.id, callErr.message],
          );
          failed++;
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed, sent, failed };
  }

  /**
   * Sincronización masiva de inventario para los próximos 90 días hacia Booking
   */
  async syncNext90Days(): Promise<{ totalRooms: number; totalSlotsGenerated: number; serviceId: string; timestamp: number }> {
    const serviceId = this.configService.get<string>('GRPC_SERVICE_ID') || 'alojamientos';
    const grpcEnabled = this.configService.get<string>('GRPC_ENABLED') === 'true';

    const rooms = await this.dataSource.query(
      `SELECT e.id, e.codigo as "espacioCodigo", a.codigo as "alojamientoCodigo"
       FROM espacios_rentables e
       JOIN alojamientos a ON a.id = e."alojamientoId"
       WHERE e.estado = 'Activo' AND a.estado = 'Activo'`,
    );

    let totalSlotsGenerated = 0;
    const nowEpoch = Date.now();

    for (const r of rooms) {
      const itemId = `${r.alojamientoCodigo}:${r.espacioCodigo}`;

      for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + dayOffset);
        const dateStr = targetDate.toISOString().split('T')[0];
        const dateCompact = dateStr.replace(/-/g, '');
        const slotId = `slot-${dateCompact}-1400`;

        const availableUnits = await this.calculateAvailableUnits(r.id, dateStr);

        if (grpcEnabled) {
          try {
            await this.grpcClient.pushStockUpdate({
              service_id: serviceId,
              item_id: itemId,
              date: dateStr,
              time_slot: '14:00',
              available_units: availableUnits,
              timestamp: nowEpoch + dayOffset,
              slot_id: slotId,
            });
          } catch (e) {
            // Si falla la conexión directa, encolar en outbox
            await this.dataSource.query(
              `INSERT INTO stock_outbox (id, "itemId", fecha, unidades, ts, estado, intentos, "ultimoError")
               VALUES ($1, $2, $3, $4, $5, 'Pendiente', 1, $6)`,
              [generateEntityId('OUT'), itemId, dateStr, availableUnits, nowEpoch + dayOffset, e.message],
            );
          }
        } else {
          // Encolar en outbox como Simulado
          await this.dataSource.query(
            `INSERT INTO stock_outbox (id, "itemId", fecha, unidades, ts, estado, intentos, "ultimoError")
             VALUES ($1, $2, $3, $4, $5, 'Simulado', 0, 'Sincronización manual 90 días (Modo gRPC offline)')`,
            [generateEntityId('OUT'), itemId, dateStr, availableUnits, nowEpoch + dayOffset],
          );
        }

        totalSlotsGenerated++;
      }
    }

    this.logger.log(`Sincronización de 90 días completada: ${rooms.length} habitaciones, ${totalSlotsGenerated} slots.`);
    return {
      totalRooms: rooms.length,
      totalSlotsGenerated,
      serviceId,
      timestamp: nowEpoch,
    };
  }

  /**
   * Consulta y verifica el inventario en Booking Hub vs Base de Datos local
   */
  async verifyBookingSlot(itemId: string, dateStr: string): Promise<any> {
    const serviceId = this.configService.get<string>('GRPC_SERVICE_ID') || 'alojamientos';
    const dateCompact = dateStr.replace(/-/g, '');
    const slotId = `slot-${dateCompact}-1400`;

    // 1. Obtener cupos locales
    const parts = itemId.split(':');
    let localUnits = null;
    if (parts.length === 2) {
      const roomRows = await this.dataSource.query(
        `SELECT e.id FROM espacios_rentables e
         JOIN alojamientos a ON a.id = e."alojamientoId"
         WHERE a.codigo = $1 AND e.codigo = $2`,
        [parts[0], parts[1]],
      );
      if (roomRows.length > 0) {
        localUnits = await this.calculateAvailableUnits(roomRows[0].id, dateStr);
      }
    }

    // 2. Consultar gRPC Booking Hub
    let bookingResponse = null;
    let error = null;
    try {
      bookingResponse = await this.grpcClient.getSlotAvailability({
        service_id: serviceId,
        item_id: itemId,
        date: dateStr,
        time_slot: '14:00',
        slot_id: slotId,
      });
    } catch (e) {
      error = e.message;
    }

    return {
      item_id: itemId,
      date: dateStr,
      slot_id: slotId,
      local_available_units: localUnits,
      booking_response: bookingResponse,
      synchronized: bookingResponse ? bookingResponse.available_units === localUnits : false,
      error,
    };
  }

  /**
   * Reporte del estado de la cola outbox
   */
  async getOutboxStatus(): Promise<any> {
    const counts = await this.dataSource.query(
      `SELECT estado, COUNT(*) as cantidad FROM stock_outbox GROUP BY estado`,
    );

    const latest = await this.dataSource.query(
      `SELECT id, "itemId", fecha, unidades, estado, intentos, "ultimoError", "creadoEn" 
       FROM stock_outbox 
       ORDER BY "creadoEn" DESC 
       LIMIT 20`,
    );

    return {
      summary: counts,
      recent: latest,
      grpc_enabled: this.configService.get<string>('GRPC_ENABLED') === 'true',
      grpc_url: this.configService.get<string>('BOOKING_GRPC_URL') || '127.0.0.1:50051',
    };
  }
}
