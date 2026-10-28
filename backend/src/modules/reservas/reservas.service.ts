import {
  Injectable,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { ProblemDetailsException } from '../../common/exceptions/problem-details.exception';
import { PricingService } from '../../common/services/pricing.service';
import { InventorySyncService } from '../inventario/inventory-sync.service';
import { generateEntityId } from '../../common/utils/password-rules';
import { randomUUID } from 'crypto';

@Injectable()
export class ReservasService {
  // Caché en memoria para previsualizaciones temporales de órdenes (15 min)
  private static previewsCache: Map<string, any> = new Map();

  constructor(
    private readonly dataSource: DataSource,
    private readonly pricingService: PricingService,
    private readonly inventorySyncService: InventorySyncService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  //  PREVISUALIZACIÓN DE ÓRDENES (Hub GDS / Web UI)
  // ═══════════════════════════════════════════════════════════════════════

  async previewOrder(previewRequest: any): Promise<any> {
    const accommodationId = String(previewRequest.accommodation_id || previewRequest.accommodationId || '');
    const productId = String(previewRequest.product_id || previewRequest.productId || previewRequest.espacioId || '');
    const guests = previewRequest.guests || {
      number_of_adults: previewRequest.numeroPersonas || 1,
      number_of_rooms: 1,
    };
    const checkin = previewRequest.checkin || previewRequest.fechaInicio;
    const checkout = previewRequest.checkout || previewRequest.fechaFin;

    if (!checkin || !checkout) {
      throw new BadRequestException('Las fechas de check-in y check-out son obligatorias.');
    }

    // 1. Obtener espacio rentable
    const habRows = await this.dataSource.query(
      `SELECT e.*, a.nombre as "alojamientoNombre", a.codigo as "alojamientoCodigo", a."politicaCancelacion"
       FROM espacios_rentables e
       JOIN alojamientos a ON a.id = e."alojamientoId"
       WHERE (e.id = $1 OR e.id = $2 OR e.codigo = $3) AND a.estado = 'Activo'
       LIMIT 1`,
      [productId, `HAB-${productId}`, productId],
    );

    let espacio = habRows[0];
    if (!espacio && accommodationId) {
      const fallback = await this.dataSource.query(
        `SELECT e.*, a.nombre as "alojamientoNombre", a.codigo as "alojamientoCodigo", a."politicaCancelacion"
         FROM espacios_rentables e
         JOIN alojamientos a ON a.id = e."alojamientoId"
         WHERE (a.id = $1 OR a.codigo = $1) AND e.estado = 'Activo'
         ORDER BY e."precioPorNoche" ASC LIMIT 1`,
        [accommodationId],
      );
      espacio = fallback[0];
    }

    if (!espacio) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/not-found',
          title: 'Habitación o alojamiento no encontrado',
          status: HttpStatus.NOT_FOUND,
          code: 'VALIDATION_FAILED',
          detail: `No se encontró la habitación o alojamiento especificado.`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // 2. Validar capacidad
    const numAdults = Number(guests.number_of_adults || 1);
    const maxCapacity = Number(espacio.capacidadAdultos || 1) + Number(espacio.capacidadNinos || 0);
    if (numAdults > maxCapacity) {
      throw new BadRequestException(
        `El número de huéspedes (${numAdults}) excede la capacidad máxima de la habitación (${maxCapacity}).`,
      );
    }

    // 3. Verificar disponibilidad por solapamiento de fechas
    const availabilityQuery = await this.dataSource.query(
      `SELECT (
         e."cantidadDisponible" - (
           SELECT COUNT(*) 
           FROM reservas r 
           WHERE r."espacioId" = e.id 
             AND r."estadoId" IN ('EST-001', 'EST-002') 
             AND r."fechaEntrada" < $3 AND r."fechaSalida" > $2
         )
       ) as disponibles
       FROM espacios_rentables e
       WHERE e.id = $1 AND e.estado = 'Activo'`,
      [espacio.id, checkin, checkout],
    );

    const disponibles = Number(availabilityQuery[0]?.disponibles || 0);
    const roomsRequested = Number(guests.number_of_rooms || 1);

    if (disponibles < roomsRequested) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/room-no-longer-available',
          title: 'Sin habitaciones disponibles',
          status: HttpStatus.CONFLICT,
          code: 'OUT_OF_STOCK',
          detail: 'Sin habitaciones disponibles para las fechas solicitadas.',
        },
        HttpStatus.CONFLICT,
      );
    }

    // 4. Cotización exacta con PricingService (recargos + IVA 15% + Tasa USD 2/noche)
    const pricing = this.pricingService.calculatePrice(
      Number(espacio.precioPorNoche),
      checkin,
      checkout,
      roomsRequested,
    );

    const orderPreviewId = `PREV-${randomUUID()}`;

    ReservasService.previewsCache.set(orderPreviewId, {
      previewId: orderPreviewId,
      accommodationId: espacio.alojamientoId,
      productId: espacio.id,
      pricing,
      checkin,
      checkout,
      guests,
      createdAt: Date.now(),
    });

    return {
      order_preview_id: orderPreviewId,
      accommodation_id: espacio.alojamientoId,
      product_id: espacio.id,
      hold_status: 'HOLD_ACTIVE',
      hold_duration_seconds: 900,
      expires_at: new Date(Date.now() + 900000).toISOString(),
      dates: {
        checkin,
        checkout,
        total_nights: pricing.nights,
      },
      guests: {
        number_of_adults: numAdults,
        number_of_children: Number(guests.number_of_children || 0),
        number_of_rooms: roomsRequested,
      },
      price_breakdown: {
        subtotal: { amount: pricing.subtotalStr, currency: 'USD' },
        taxes: { amount: pricing.ivaStr, currency: 'USD' },
        service_fee: { amount: pricing.tasaMunicipalStr, currency: 'USD' },
        total: { amount: pricing.totalStr, currency: 'USD' },
      },
      cancellation_policy: {
        type: 'FLEXIBLE',
        description: espacio.politicaCancelacion || 'Cancelación gratuita hasta 24 horas antes del check-in.',
        free_cancellation_until: `${checkin}T14:00:00-05:00`,
        penalty_percentage: 100.0,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CREAR RESERVA / ORDEN TRANSACCIONAL
  // ═══════════════════════════════════════════════════════════════════════

  async create(crearReservaDto: any, userId?: string) {
    let espacioId = crearReservaDto.espacioId || crearReservaDto.productId;
    const fechaInicio = crearReservaDto.fechaInicio || crearReservaDto.checkin;
    const fechaFin = crearReservaDto.fechaFin || crearReservaDto.checkout;
    const numeroPersonas = Number(crearReservaDto.numeroPersonas || 1);

    return await this.dataSource.transaction(async (manager) => {
      // 0. Si no hay espacioId pero sí alojamientoId, buscar primera habitación activa
      if (!espacioId && crearReservaDto.alojamientoId) {
        const habRows = await manager.query(
          `SELECT id FROM espacios_rentables WHERE "alojamientoId" = $1 AND estado = 'Activo' ORDER BY "precioPorNoche" ASC LIMIT 1`,
          [crearReservaDto.alojamientoId],
        );
        if (habRows && habRows.length > 0) {
          espacioId = habRows[0].id;
        }
      }

      // 1. Bloquear y verificar espacio
      const espacios = await manager.query(
        `SELECT e.*, a.nombre as "alojamientoNombre", a.codigo as "alojamientoCodigo"
         FROM espacios_rentables e
         JOIN alojamientos a ON a.id = e."alojamientoId"
         WHERE (e.id = $1 OR e.id = $2 OR e.codigo = $3) AND e.estado = 'Activo'
         FOR UPDATE OF e`,
        [espacioId, `HAB-${espacioId}`, espacioId],
      );

      if (!espacios || espacios.length === 0) {
        throw new NotFoundException('La habitación solicitada no existe o no se encuentra activa.');
      }

      const espacio = espacios[0];

      // 2. Validar capacidad
      const maxCap = Number(espacio.capacidadAdultos || 1) + Number(espacio.capacidadNinos || 0);
      if (numeroPersonas > maxCap) {
        throw new BadRequestException(
          `El número de personas (${numeroPersonas}) excede la capacidad de la habitación (${maxCap}).`,
        );
      }

      // 3. Validar disponibilidad por solapamiento con la consulta de bloqueo
      const availabilityCheck = await manager.query(
        `SELECT (
           e."cantidadDisponible" - (
             SELECT COUNT(*) 
             FROM reservas r 
             WHERE r."espacioId" = e.id 
               AND r."estadoId" IN ('EST-001', 'EST-002') 
               AND r."fechaEntrada" < $3 AND r."fechaSalida" > $2
           )
         ) as disponibles
         FROM espacios_rentables e
         WHERE e.id = $1`,
        [espacio.id, fechaInicio, fechaFin],
      );

      const disponibles = Number(availabilityCheck[0]?.disponibles || 0);
      if (disponibles <= 0) {
        throw new ProblemDetailsException(
          {
            type: 'https://api.booking-hub.com/errors/room-no-longer-available',
            title: 'Sin habitaciones disponibles',
            status: HttpStatus.CONFLICT,
            code: 'OUT_OF_STOCK',
            detail: 'Sin habitaciones disponibles para las fechas solicitadas.',
          },
          HttpStatus.CONFLICT,
        );
      }

      // 4. Resolver titular de la reserva
      let finalUserId = userId;
      if (!finalUserId) {
        if (crearReservaDto.emailCliente) {
          const userRows = await manager.query(
            `SELECT id FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`,
            [crearReservaDto.emailCliente],
          );
          if (userRows && userRows.length > 0) {
            finalUserId = userRows[0].id;
          } else {
            finalUserId = generateEntityId('USR');
            await manager.query(
              `INSERT INTO usuarios (id, "nombreCompleto", email, contrasena, "rolId")
               VALUES ($1, $2, $3, 'EXTERNAL_GUEST_USER', 'ROL-002')
               ON CONFLICT (id) DO NOTHING`,
              [finalUserId, crearReservaDto.nombreCliente || 'Cliente', crearReservaDto.emailCliente],
            );
          }
        } else {
          finalUserId = 'USR-001';
        }
      }

      // 5. Calcular precio exacto en el servidor
      const pricing = this.pricingService.calculatePrice(
        Number(espacio.precioPorNoche),
        fechaInicio,
        fechaFin,
        1,
      );

      const reservaId = generateEntityId('RES');
      const ordenId = randomUUID();

      // 6. Insertar reserva en estado EST-001 (Pendiente)
      await manager.query(
        `INSERT INTO reservas (
           id, "ordenId", "usuarioId", "espacioId", "estadoId", 
           "fechaEntrada", "fechaSalida", "precioTotal", subtotal, iva, "tasaMunicipal", 
           moneda, "numeroPersonas", "fechaCreacion"
         )
         VALUES ($1, $2, $3, $4, 'EST-001', $5, $6, $7, $8, $9, $10, 'USD', $11, CURRENT_TIMESTAMP)`,
        [
          reservaId,
          ordenId,
          finalUserId,
          espacio.id,
          fechaInicio,
          fechaFin,
          pricing.total,
          pricing.subtotal,
          pricing.iva,
          pricing.tasaMunicipal,
          numeroPersonas,
        ],
      );

      // 6. Generar contrato legal
      const contratoId = generateEntityId('CON');
      const terminos = `Contrato de Arrendamiento Temporal · LuxeStays.\n\nCódigo de Reserva: ${reservaId}\nIdentificador de Orden: ${ordenId}\nPropiedad: ${espacio.alojamientoNombre}\nHabitación: ${espacio.nombre}\nPeríodo: ${fechaInicio} a ${fechaFin} (${pricing.nights} noches)\nSubtotal: $${pricing.subtotalStr} USD\nIVA (15%): $${pricing.ivaStr} USD\nTasa Municipal: $${pricing.tasaMunicipalStr} USD\nTotal a Pagar: $${pricing.totalStr} USD.\n\nEl cliente se compromete a respetar las normas de convivencia del establecimiento y la política de check-in (14:00) y check-out (11:00).`;

      await manager.query(
        `INSERT INTO contratos (id, "reservaId", terminos, firmado)
         VALUES ($1, $2, $3, false)`,
        [contratoId, reservaId, terminos],
      );

      // 7. Registrar en historial de reservas
      await manager.query(
        `INSERT INTO historial_reservas (id, "reservaId", "estadoNuevoId", notas)
         VALUES ($1, $2, 'EST-001', 'Reserva creada exitosamente pendiente de pago')`,
        [generateEntityId('HIS'), reservaId],
      );

      // 8. Encolar actualización de stock en tiempo real hacia Booking
      await this.inventorySyncService.enqueueStockUpdate(manager, espacio.id, fechaInicio, fechaFin);

      return {
        id: reservaId,
        ordenId,
        externalOrderId: ordenId,
        status: 'success',
        estadoId: 'EST-001',
        alojamientoNombre: espacio.alojamientoNombre,
        habitacionNombre: espacio.nombre,
        fechaEntrada: fechaInicio,
        fechaSalida: fechaFin,
        noches: pricing.nights,
        subtotal: pricing.subtotalStr,
        iva: pricing.ivaStr,
        tasaMunicipal: pricing.tasaMunicipalStr,
        total: pricing.totalStr,
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CREAR ORDEN VÍA CONTRATO HUB (/orders/create)
  // ═══════════════════════════════════════════════════════════════════════

  async createOrder(createRequest: any, userIdFromToken: string): Promise<any> {
    const previewId = createRequest.order_preview_id || createRequest.orderPreviewId;
    const paymentRef = createRequest.payment_reference || createRequest.paymentReference || 'EXT-PAY-SIMULATED';
    const customer = createRequest.customer || createRequest.customer_details || {};

    const cachedPreview = previewId ? ReservasService.previewsCache.get(previewId) : null;
    const accommodationId = cachedPreview?.accommodationId || createRequest.accommodation_id || createRequest.accommodationId;
    const productId = cachedPreview?.productId || createRequest.product_id || createRequest.productId || createRequest.espacioId;
    const checkin = cachedPreview?.checkin || createRequest.dates?.checkin || createRequest.checkin || createRequest.fechaInicio;
    const checkout = cachedPreview?.checkout || createRequest.dates?.checkout || createRequest.checkout || createRequest.fechaFin;
    const guests = cachedPreview?.guests || createRequest.guests || { number_of_adults: createRequest.numeroPersonas || 1, number_of_rooms: 1 };

    if (!productId || !checkin || !checkout) {
      throw new BadRequestException('Faltan parámetros requeridos para crear la orden (productId, checkin, checkout).');
    }

    return await this.dataSource.transaction(async (manager) => {
      // Bloquear fila de espacio rentable
      const espacios = await manager.query(
        `SELECT e.*, a.nombre as "alojamientoNombre", a.codigo as "alojamientoCodigo", a."politicaCancelacion"
         FROM espacios_rentables e
         JOIN alojamientos a ON a.id = e."alojamientoId"
         WHERE e.id = $1 AND e.estado = 'Activo'
         FOR UPDATE OF e`,
        [productId],
      );

      if (!espacios || espacios.length === 0) {
        throw new NotFoundException('Habitación no disponible.');
      }

      const espacio = espacios[0];

      // Validar disponibilidad
      const availCheck = await manager.query(
        `SELECT (
           e."cantidadDisponible" - (
             SELECT COUNT(*) 
             FROM reservas r 
             WHERE r."espacioId" = e.id 
               AND r."estadoId" IN ('EST-001', 'EST-002') 
               AND r."fechaEntrada" < $3 AND r."fechaSalida" > $2
           )
         ) as disponibles
         FROM espacios_rentables e
         WHERE e.id = $1`,
        [espacio.id, checkin, checkout],
      );

      const disponibles = Number(availCheck[0]?.disponibles || 0);
      if (disponibles <= 0) {
        throw new ProblemDetailsException(
          {
            type: 'https://api.booking-hub.com/errors/room-no-longer-available',
            title: 'Sin habitaciones disponibles',
            status: HttpStatus.CONFLICT,
            code: 'OUT_OF_STOCK',
            detail: 'Sin habitaciones disponibles para las fechas solicitadas.',
          },
          HttpStatus.CONFLICT,
        );
      }

      // Asegurar que el usuario titular exista en BD
      const userRows = await manager.query(`SELECT id FROM usuarios WHERE id = $1`, [userIdFromToken]);
      if (!userRows || userRows.length === 0) {
        await manager.query(
          `INSERT INTO usuarios (id, "nombreCompleto", email, contrasena)
           VALUES ($1, $2, $3, 'EXTERNAL_JWT_USER')
           ON CONFLICT (id) DO NOTHING`,
          [
            userIdFromToken,
            `${customer.first_name || 'Huésped'} ${customer.last_name || 'Hub'}`.trim(),
            customer.email || `${userIdFromToken}@booking-hub.com`,
          ],
        );
      }

      // Cotizar con PricingService
      const pricing = this.pricingService.calculatePrice(
        Number(espacio.precioPorNoche),
        checkin,
        checkout,
        Number(guests.number_of_rooms || 1),
      );

      const orderId = randomUUID();
      const locator = `LOC-${Math.floor(100000 + Math.random() * 900000)}`;
      const reservaId = generateEntityId('RES');

      await manager.query(
        `INSERT INTO reservas (
           id, "ordenId", "usuarioId", "espacioId", "estadoId", 
           "fechaEntrada", "fechaSalida", "precioTotal", subtotal, iva, "tasaMunicipal", 
           moneda, "numeroPersonas", "fechaCreacion"
         )
         VALUES ($1, $2, $3, $4, 'EST-002', $5, $6, $7, $8, $9, $10, 'USD', $11, CURRENT_TIMESTAMP)`,
        [
          reservaId,
          orderId,
          userIdFromToken,
          espacio.id,
          checkin,
          checkout,
          pricing.total,
          pricing.subtotal,
          pricing.iva,
          pricing.tasaMunicipal,
          Number(guests.number_of_adults || 1),
        ],
      );

      // Contrato
      const contratoId = generateEntityId('CON');
      const terminos = `Contrato Legal GDS Core Hub · Localizador: ${locator} · Orden: ${orderId}\nPropiedad: ${espacio.alojamientoNombre} · Total: $${pricing.totalStr} USD`;
      await manager.query(
        `INSERT INTO contratos (id, "reservaId", terminos, firmado, "fechaFirma")
         VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)`,
        [contratoId, reservaId, terminos],
      );

      // Historial
      await manager.query(
        `INSERT INTO historial_reservas (id, "reservaId", "estadoNuevoId", notas)
         VALUES ($1, $2, 'EST-002', $3)`,
        [generateEntityId('HIS'), reservaId, `Orden creada vía GDS Hub (Ref: ${paymentRef})`],
      );

      // Encolar actualización de stock en tiempo real hacia Booking
      await this.inventorySyncService.enqueueStockUpdate(manager, espacio.id, checkin, checkout);

      if (previewId) {
        ReservasService.previewsCache.delete(previewId);
      }

      return {
        order_id: orderId,
        externalOrderId: orderId,
        locator,
        status: 'CONFIRMED',
        accommodation_details: {
          id: espacio.alojamientoId,
          name: espacio.alojamientoNombre,
          room: espacio.nombre,
        },
        dates: {
          checkin,
          checkout,
          total_nights: pricing.nights,
        },
        guests,
        customer,
        price_breakdown: {
          subtotal: { amount: pricing.subtotalStr, currency: 'USD' },
          taxes: { amount: pricing.ivaStr, currency: 'USD' },
          service_fee: { amount: pricing.tasaMunicipalStr, currency: 'USD' },
          total: { amount: pricing.totalStr, currency: 'USD' },
        },
        created_at: new Date().toISOString(),
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CONSULTAS DE RESERVAS Y ÓRDENES
  // ═══════════════════════════════════════════════════════════════════════

  async getMisReservas(userId: string) {
    const rows = await this.dataSource.query(
      `SELECT 
         r.id, r."ordenId", r."fechaEntrada", r."fechaSalida", r."precioTotal", 
         r.subtotal, r.iva, r."tasaMunicipal", r."numeroPersonas", r.calificacion, r.comentario,
         r."estadoId", er.nombre as "estadoNombre",
         e.id as "espacioId", e.nombre as "habitacionNombre", e."precioPorNoche",
         a.id as "alojamientoId", a.nombre as "alojamientoNombre", a."imagenUrl", a.codigo as "alojamientoCodigo",
         c.firmado as "contratoFirmado",
         p.estado as "estadoPago", p.id as "pagoId",
         f.id as "facturaId", f."numeroFactura"
       FROM reservas r
       JOIN estados_reserva er ON r."estadoId" = er.id
       JOIN espacios_rentables e ON r."espacioId" = e.id
       JOIN alojamientos a ON e."alojamientoId" = a.id
       LEFT JOIN contratos c ON c."reservaId" = r.id
       LEFT JOIN pagos p ON p."reservaId" = r.id
       LEFT JOIN facturas f ON f."pagoId" = p.id
       WHERE r."usuarioId" = $1
       ORDER BY r."fechaCreacion" DESC`,
      [userId],
    );
    return rows;
  }

  async getOrder(orderIdOrReservaId: string) {
    const rows = await this.dataSource.query(
      `SELECT 
         r.*, er.nombre as "estadoNombre",
         e.nombre as "habitacionNombre", e."precioPorNoche", e.codigo as "habitacionCodigo",
         a.id as "alojamientoId", a.nombre as "alojamientoNombre", a."imagenUrl", a.codigo as "alojamientoCodigo",
         u."nombreCompleto" as "clienteNombre", u.email as "clienteEmail", u.telefono as "clienteTelefono",
         c.terminos as "contratoTerminos", c.firmado as "contratoFirmado", c."fechaFirma" as "contratoFechaFirma",
         p.id as "pagoId", p.estado as "estadoPago", p.monto as "pagoMonto"
       FROM reservas r
       JOIN estados_reserva er ON r."estadoId" = er.id
       JOIN espacios_rentables e ON r."espacioId" = e.id
       JOIN alojamientos a ON e."alojamientoId" = a.id
       JOIN usuarios u ON r."usuarioId" = u.id
       LEFT JOIN contratos c ON c."reservaId" = r.id
       LEFT JOIN pagos p ON p."reservaId" = r.id
       WHERE r."ordenId"::text = $1 OR r.id = $1`,
      [orderIdOrReservaId],
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException('Orden o reserva no encontrada.');
    }

    return rows[0];
  }

  async findAllAdmin(filters?: { estadoId?: string }) {
    let query = `
      SELECT 
        r.id, r."ordenId", r."fechaEntrada", r."fechaSalida", r."precioTotal", 
        r.subtotal, r.iva, r."tasaMunicipal", r."numeroPersonas", r.calificacion,
        r."estadoId", er.nombre as "estadoNombre",
        e.nombre as "habitacionNombre",
        a.nombre as "alojamientoNombre", a.codigo as "alojamientoCodigo",
        u."nombreCompleto" as "clienteNombre", u.email as "clienteEmail",
        p.id as "pagoId", p.estado as "estadoPago", p.monto as "pagoMonto"
      FROM reservas r
      JOIN estados_reserva er ON r."estadoId" = er.id
      JOIN espacios_rentables e ON r."espacioId" = e.id
      JOIN alojamientos a ON e."alojamientoId" = a.id
      JOIN usuarios u ON r."usuarioId" = u.id
      LEFT JOIN pagos p ON p."reservaId" = r.id
    `;

    const params: any[] = [];
    if (filters?.estadoId) {
      params.push(filters.estadoId);
      query += ` WHERE r."estadoId" = $1`;
    }

    query += ` ORDER BY r."fechaCreacion" DESC`;
    return await this.dataSource.query(query, params);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  MÁQUINA DE ESTADOS Y POSTVENTA
  // ═══════════════════════════════════════════════════════════════════════

  async aprobarReserva(id: string, adminUserId?: string) {
    const reserva = await this.getOrder(id);
    if (reserva.estadoId === 'EST-002') {
      return { message: 'La reserva ya se encuentra confirmada.', id, estadoId: 'EST-002' };
    }
    if (reserva.estadoId === 'EST-003') {
      throw new ConflictException('No se puede aprobar una reserva cancelada.');
    }

    await this.dataSource.query(`UPDATE reservas SET "estadoId" = 'EST-002' WHERE id = $1`, [reserva.id]);

    await this.dataSource.query(
      `INSERT INTO historial_reservas (id, "reservaId", "estadoAnteriorId", "estadoNuevoId", notas)
       VALUES ($1, $2, $3, 'EST-002', $4)`,
      [
        generateEntityId('HIS'),
        reserva.id,
        reserva.estadoId,
        `Reserva aprobada manualmente por Admin (${adminUserId || 'Admin'})`,
      ],
    );

    return { message: 'Reserva confirmada exitosamente.', id: reserva.id, estadoId: 'EST-002' };
  }

  async cancelarReserva(id: string, userId?: string, userRol?: string, reason?: string) {
    const reserva = await this.getOrder(id);

    // Cancelar dos veces es idempotente
    if (reserva.estadoId === 'EST-003') {
      return {
        order_id: reserva.ordenId,
        status: 'CANCELLED',
        message: 'La reserva ya se encontraba cancelada.',
        id: reserva.id,
      };
    }

    const esAdmin = (userRol || '').toLowerCase().includes('admin');

    // Validación de titularidad
    if (!esAdmin && userId && reserva.usuarioId !== userId) {
      throw new ForbiddenException('No tienes autorización para cancelar esta reserva.');
    }

    // Validación de política de 24 horas para clientes no administradores
    if (!esAdmin) {
      const fechaEntradaStr = reserva.fechaEntrada instanceof Date
        ? reserva.fechaEntrada.toISOString().split('T')[0]
        : String(reserva.fechaEntrada).split('T')[0];
      const checkinDateTime = new Date(`${fechaEntradaStr}T14:00:00-05:00`).getTime();
      const now = Date.now();
      const diffHours = (checkinDateTime - now) / (1000 * 60 * 60);

      if (diffHours < 24) {
        throw new ConflictException(
          'La cancelación gratuita solo está permitida hasta 24 horas antes de la hora de check-in (14:00).',
        );
      }
    }

    await this.dataSource.query(`UPDATE reservas SET "estadoId" = 'EST-003' WHERE id = $1`, [reserva.id]);

    await this.dataSource.query(
      `INSERT INTO historial_reservas (id, "reservaId", "estadoAnteriorId", "estadoNuevoId", notas)
       VALUES ($1, $2, $3, 'EST-003', $4)`,
      [
        generateEntityId('HIS'),
        reserva.id,
        reserva.estadoId,
        reason || 'Cancelación procesada conforme a la política',
      ],
    );

    // Encolar liberación de stock hacia Booking
    const fechaEntradaStr = reserva.fechaEntrada instanceof Date
      ? reserva.fechaEntrada.toISOString().split('T')[0]
      : String(reserva.fechaEntrada).split('T')[0];
    const fechaSalidaStr = reserva.fechaSalida instanceof Date
      ? reserva.fechaSalida.toISOString().split('T')[0]
      : String(reserva.fechaSalida).split('T')[0];

    await this.inventorySyncService.enqueueStockUpdate(
      this.dataSource.manager,
      reserva.espacioId,
      fechaEntradaStr,
      fechaSalidaStr,
    );

    return {
      order_id: reserva.ordenId,
      status: 'CANCELLED',
      message: 'Reserva cancelada exitosamente.',
      id: reserva.id,
    };
  }

  async cancelOrder(orderId: string): Promise<any> {
    return this.cancelarReserva(orderId);
  }

  async modifyOrder(orderId: string, modifyRequest: any): Promise<any> {
    const order = await this.getOrder(orderId);
    if (order.estadoId === 'EST-003') {
      throw new ConflictException('No se puede modificar una orden cancelada.');
    }
    return this.getOrder(orderId);
  }

  async findAll() {
    return this.findAllAdmin();
  }

  async findOne(id: string) {
    return this.getOrder(id);
  }

  async findByEmail(email: string) {
    const rows = await this.dataSource.query(
      `SELECT 
         r.id, r."ordenId", r."fechaEntrada", r."fechaSalida", r."precioTotal", 
         r.subtotal, r.iva, r."tasaMunicipal", r."numeroPersonas", r.calificacion, r.comentario,
         r."estadoId", er.nombre as "estadoNombre",
         e.id as "espacioId", e.nombre as "habitacionNombre", e."precioPorNoche",
         a.id as "alojamientoId", a.nombre as "alojamientoNombre", a."imagenUrl", a.codigo as "alojamientoCodigo",
         c.firmado as "contratoFirmado",
         p.estado as "estadoPago", p.id as "pagoId",
         f.id as "facturaId", f."numeroFactura"
       FROM reservas r
       JOIN estados_reserva er ON r."estadoId" = er.id
       JOIN espacios_rentables e ON r."espacioId" = e.id
       JOIN alojamientos a ON e."alojamientoId" = a.id
       JOIN usuarios u ON r."usuarioId" = u.id
       LEFT JOIN contratos c ON c."reservaId" = r.id
       LEFT JOIN pagos p ON p."reservaId" = r.id
       LEFT JOIN facturas f ON f."pagoId" = p.id
       WHERE LOWER(TRIM(u.email)) = LOWER(TRIM($1))
       ORDER BY r."fechaCreacion" DESC`,
      [email],
    );
    return rows;
  }

  async firmarContrato(id: string, userId?: string) {
    const reserva = await this.getOrder(id);
    if (userId && reserva.usuarioId !== userId) {
      throw new ForbiddenException('Solo el titular de la reserva puede firmar el contrato.');
    }
    if (reserva.estadoId === 'EST-003') {
      throw new ConflictException('No se puede firmar un contrato de una reserva cancelada.');
    }

    await this.dataSource.query(
      `UPDATE contratos SET firmado = true, "fechaFirma" = CURRENT_TIMESTAMP WHERE "reservaId" = $1`,
      [reserva.id],
    );

    return { message: 'Contrato firmado legalmente con éxito.', id: reserva.id, firmado: true };
  }

  async rateReserva(id: string, userId?: string, calificacion?: number, comentario?: string) {
    if (!calificacion || calificacion < 1 || calificacion > 5) {
      throw new BadRequestException('La calificación debe estar entre 1 y 5 estrellas.');
    }

    const reserva = await this.getOrder(id);
    if (userId && reserva.usuarioId !== userId) {
      throw new ForbiddenException('Solo el titular de la reserva puede calificar la estancia.');
    }

    if (reserva.estadoId !== 'EST-002') {
      throw new ConflictException('Solo se pueden calificar reservas confirmadas.');
    }

    const fechaSalidaStr = reserva.fechaSalida instanceof Date
      ? reserva.fechaSalida.toISOString().split('T')[0]
      : String(reserva.fechaSalida).split('T')[0];
    const checkoutDate = new Date(`${fechaSalidaStr}T11:00:00-05:00`).getTime();
    if (Date.now() < checkoutDate) {
      throw new ConflictException('Solo se puede emitir una reseña una vez concluida la estancia (fecha de check-out).');
    }

    await this.dataSource.query(
      `UPDATE reservas SET calificacion = $1, comentario = $2 WHERE id = $3`,
      [calificacion, (comentario || '').trim(), reserva.id],
    );

    return { message: 'Calificación registrada exitosamente.', id: reserva.id, calificacion };
  }

  async getCancelaciones() {
    return await this.dataSource.query(`
      SELECT 
        r.id, r."ordenId", r."fechaEntrada", r."fechaSalida", r."precioTotal",
        h."fechaCambio" as "fechaCancelacion", h.notas as motivo,
        u."nombreCompleto" as cliente, a.nombre as alojamiento
      FROM reservas r
      JOIN historial_reservas h ON r.id = h."reservaId" AND h."estadoNuevoId" = 'EST-003'
      JOIN usuarios u ON r."usuarioId" = u.id
      JOIN espacios_rentables e ON r."espacioId" = e.id
      JOIN alojamientos a ON e."alojamientoId" = a.id
      ORDER BY h."fechaCambio" DESC
    `);
  }
}
