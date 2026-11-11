import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InventoryGrpcClient } from './inventory-grpc.client';
import { generateEntityId } from '../../common/utils/password-rules';
import * as amqp from 'amqplib';

@Injectable()
export class InventorySyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventorySyncService.name);
  private isProcessing = false;
  private amqpConn: any = null;
  private amqpChannel: any = null;
  private isConnectingAmqp = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly grpcClient: InventoryGrpcClient,
  ) {}

  async onModuleInit() {
    await this.initAmqp();
  }

  async onModuleDestroy() {
    try {
      if (this.amqpChannel) await this.amqpChannel.close();
      if (this.amqpConn) await this.amqpConn.close();
    } catch {
      // Ignore cleanup error
    }
  }

  // ─── AMQP / CloudAMQP (RabbitMQ) ─────────────────────────────────────────
  private async initAmqp(): Promise<void> {
    const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL');
    if (!rabbitmqUrl) {
      this.logger.log('[AMQP] RABBITMQ_URL no configurada; omite conexión RabbitMQ.');
      return;
    }
    if (this.isConnectingAmqp || this.amqpChannel) return;
    this.isConnectingAmqp = true;

    try {
      this.logger.log(`[AMQP] Conectando a CloudAMQP: ${rabbitmqUrl.replace(/:[^:@]+@/, ':***@')}`);
      const conn = await amqp.connect(rabbitmqUrl);
      this.amqpConn = conn;

      conn.on('error', (err) => {
        this.logger.error(`[AMQP] Error de conexión: ${err.message}`);
        this.amqpChannel = null;
        this.amqpConn = null;
      });

      conn.on('close', () => {
        this.logger.warn('[AMQP] Conexión cerrada. Se reconectará en la próxima petición.');
        this.amqpChannel = null;
        this.amqpConn = null;
      });

      const ch = await conn.createChannel();
      await ch.assertExchange('booking.events', 'topic', { durable: true });
      this.amqpChannel = ch;
      this.logger.log('[AMQP] Conexión establecida con éxito y exchange "booking.events" asegurado.');
    } catch (err: any) {
      this.logger.warn(`[AMQP] No se pudo conectar a CloudAMQP: ${err.message}`);
      this.amqpChannel = null;
      this.amqpConn = null;
    } finally {
      this.isConnectingAmqp = false;
    }
  }

  private async publishAmqp(payload: {
    service_id: string;
    item_id: string;
    available_units: number;
    date: string;
  }): Promise<boolean> {
    if (!this.amqpChannel) {
      await this.initAmqp();
    }
    if (!this.amqpChannel) return false;

    try {
      const routingKey = 'stock.updated';
      const msgBuffer = Buffer.from(JSON.stringify(payload));
      const ok = this.amqpChannel.publish('booking.events', routingKey, msgBuffer, {
        persistent: true,
        contentType: 'application/json',
      });
      this.logger.log(`[AMQP] Evento stock.updated publicado -> ${payload.item_id} (${payload.date}): ${payload.available_units} unid.`);
      return ok;
    } catch (err: any) {
      this.logger.error(`[AMQP] Error al publicar stock.updated: ${err.message}`);
      return false;
    }
  }

  // ─── REST Push hacia Booking Core API ─────────────────────────────────────
  private async pushStockRest(payload: {
    item_id: string;
    available_units: number;
    date: string;
    reason: string;
  }): Promise<boolean> {
    const stockUrl =
      this.configService.get<string>('BOOKING_REST_STOCK_URL') ||
      'https://booking-core-api.azurewebsites.net/api/v3/inventory/stock';
    const apiKey = this.configService.get<string>('API_KEY') || '';

    try {
      const response = await fetch(stockUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        this.logger.log(`[REST] Stock actualizado en Booking: ${payload.item_id} (${payload.date}) [${response.status}]`);
        return true;
      } else {
        const bodyText = await response.text().catch(() => '');
        this.logger.warn(`[REST] Error al notificar stock a Booking (${response.status}): ${bodyText}`);
        return false;
      }
    } catch (err: any) {
      this.logger.warn(`[REST] Fallo de conexión hacia Booking stock API: ${err.message}`);
      return false;
    }
  }

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
             AND COALESCE(r."checkoutRealizado", false) = false
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
   * Encola y despacha eventos de actualización de stock para cada noche comprendida entre fechaInicio y fechaFin
   * Emite una notificación por cada noche de la estancia (check-in ... check-out - 1)
   */
  async enqueueStockUpdate(
    manager: EntityManager,
    espacioId: string,
    fechaInicio: string,
    fechaFin: string,
    reason: string = 'ORDER_CREATED',
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
      const nodeId = this.configService.get<string>('NODE_ID') || 'NODE_ALO_LUXESTAY_E5K3';
      const eventBusMode = (this.configService.get<string>('EVENT_BUS_MODE') || 'rabbitmq').toLowerCase();

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

        // Notificación en tiempo real (asíncrona post-commit/inmediata)
        setImmediate(async () => {
          let notified = false;

          // 1. Canal REST (Recomendado)
          const restOk = await this.pushStockRest({
            item_id: itemId,
            available_units: availableUnits,
            date: dateStr,
            reason,
          });
          if (restOk) notified = true;

          // 2. Canal CloudAMQP (si está en modo rabbitmq o dual)
          if (eventBusMode === 'rabbitmq' || eventBusMode === 'both') {
            const amqpOk = await this.publishAmqp({
              service_id: nodeId,
              item_id: itemId,
              available_units: availableUnits,
              date: dateStr,
            });
            if (amqpOk) notified = true;
          }

          if (notified) {
            try {
              await this.dataSource.query(
                `UPDATE stock_outbox SET estado = 'Enviado', "ultimoError" = NULL WHERE id = $1`,
                [outboxId],
              );
            } catch {
              // Ignore db update failure
            }
          }
        });

        cur.setDate(cur.getDate() + 1);
      }

      this.logger.log(`Stock outbox generado para ${itemId} entre ${fechaInicio} y ${fechaFin} [reason: ${reason}]`);
    } catch (err: any) {
      this.logger.error(`Error al encolar en stock_outbox: ${err.message}`);
    }
  }

  /**
   * Lee la tabla stock_outbox y despacha los eventos pendientes
   */
  async processOutbox(): Promise<{ processed: number; sent: number; failed: number }> {
    if (this.isProcessing) return { processed: 0, sent: 0, failed: 0 };
    this.isProcessing = true;

    let processed = 0;
    let sent = 0;
    let failed = 0;

    try {
      const nodeId = this.configService.get<string>('NODE_ID') || 'NODE_ALO_LUXESTAY_E5K3';
      const eventBusMode = (this.configService.get<string>('EVENT_BUS_MODE') || 'rabbitmq').toLowerCase();
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

        // 1. Probar REST
        const restOk = await this.pushStockRest({
          item_id: row.itemId,
          available_units: Number(row.unidades),
          date: dateStr,
          reason: 'OUTBOX_RETRY',
        });

        // 2. Probar AMQP
        let amqpOk = false;
        if (eventBusMode === 'rabbitmq' || eventBusMode === 'both') {
          amqpOk = await this.publishAmqp({
            service_id: nodeId,
            item_id: row.itemId,
            available_units: Number(row.unidades),
            date: dateStr,
          });
        }

        if (restOk || amqpOk) {
          await this.dataSource.query(
            `UPDATE stock_outbox SET estado = 'Enviado', "ultimoError" = NULL WHERE id = $1`,
            [row.id],
          );
          sent++;
          continue;
        }

        // Si gRPC está habilitado, intentar gRPC como fallback adicional
        if (grpcEnabled) {
          const dateCompact = dateStr.replace(/-/g, '');
          const slotId = `slot-${dateCompact}-1400`;
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
              continue;
            }
          } catch (callErr: any) {
            // grpc failed
          }
        }

        // Si no se pudo enviar por ningún canal
        await this.dataSource.query(
          `UPDATE stock_outbox SET intentos = intentos + 1, "ultimoError" = 'Error al enviar por REST/AMQP' WHERE id = $1`,
          [row.id],
        );
        failed++;
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
    const serviceId = this.configService.get<string>('NODE_ID') || 'NODE_ALO_LUXESTAY_E5K3';
    const eventBusMode = (this.configService.get<string>('EVENT_BUS_MODE') || 'rabbitmq').toLowerCase();

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

        const availableUnits = await this.calculateAvailableUnits(r.id, dateStr);

        // Despachar REST
        await this.pushStockRest({
          item_id: itemId,
          available_units: availableUnits,
          date: dateStr,
          reason: 'BULK_SYNC',
        });

        // Despachar AMQP si aplica
        if (eventBusMode === 'rabbitmq' || eventBusMode === 'both') {
          await this.publishAmqp({
            service_id: serviceId,
            item_id: itemId,
            available_units: availableUnits,
            date: dateStr,
          });
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
    const serviceId = this.configService.get<string>('NODE_ID') || 'NODE_ALO_LUXESTAY_E5K3';
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

    // 2. Consultar gRPC Booking Hub si estuviera habilitado
    let bookingResponse = null;
    let error = null;
    if (this.configService.get<string>('GRPC_ENABLED') === 'true') {
      try {
        bookingResponse = await this.grpcClient.getSlotAvailability({
          service_id: serviceId,
          item_id: itemId,
          date: dateStr,
          time_slot: '14:00',
          slot_id: slotId,
        });
      } catch (e: any) {
        error = e.message;
      }
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
      rabbitmq_connected: this.amqpChannel !== null,
      rest_stock_url: this.configService.get<string>('BOOKING_REST_STOCK_URL') || 'https://booking-core-api.azurewebsites.net/api/v3/inventory/stock',
      event_bus_mode: this.configService.get<string>('EVENT_BUS_MODE') || 'rabbitmq',
    };
  }
}
