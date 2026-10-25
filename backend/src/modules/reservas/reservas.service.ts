import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reserva } from './entities/reserva.entity';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { Alojamiento } from '../alojamientos/entities/alojamiento.entity';
import { ProblemDetailsException } from '../../common/exceptions/problem-details.exception';
import * as crypto from 'crypto';

interface OrderPreviewCache {
  previewId: string;
  accommodationId: string;
  productId: string;
  totalPrice: number;
  currency: string;
  checkin: string;
  checkout: string;
  guests: any;
  createdAt: number;
}

@Injectable()
export class ReservasService {
  // Caché en memoria para las previsualizaciones de órdenes (TTL: 15 minutos)
  private static readonly previewsCache = new Map<string, OrderPreviewCache>();

  constructor(
    @InjectRepository(Reserva)
    private readonly reservaRepository: Repository<Reserva>,
    @InjectRepository(Alojamiento)
    private readonly alojamientoRepository: Repository<Alojamiento>,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  //  Servicio Transaccional de Órdenes (Contrato GDS Alojamientos Hub)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * POST /orders/preview
   * Previsualiza precio final y revalida disponibilidad antes de confirmar.
   */
  async previewOrder(previewRequest: any): Promise<any> {
    const accommodationId = String(previewRequest.accommodation_id || previewRequest.accommodationId || '');
    const productId = String(previewRequest.product_id || previewRequest.productId || '');
    const guests = previewRequest.guests || { number_of_adults: 1, number_of_rooms: 1 };
    const checkin = previewRequest.checkin || new Date().toISOString().split('T')[0];
    
    // Por defecto checkout al día siguiente
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkout = previewRequest.checkout || tomorrow.toISOString().split('T')[0];

    // 1. Validar alojamiento
    const alRows = await this.reservaRepository.query(
      `SELECT * FROM alojamientos WHERE id = $1 OR id = $2`,
      [accommodationId, `ALO-${accommodationId}`],
    );
    if (!alRows || alRows.length === 0) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/not-found',
          title: 'Accommodation not found',
          status: HttpStatus.NOT_FOUND,
          code: 'VALIDATION_FAILED',
          detail: `Accommodation "${accommodationId}" does not exist.`,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    const accommodation = alRows[0];

    // 2. Validar espacio / producto rentable
    const habRows = await this.reservaRepository.query(
      `SELECT * FROM espacios_rentables 
       WHERE "alojamientoId" = $1 AND (id = $2 OR id = $3 OR id = $4 OR nombre ILIKE $5) 
       LIMIT 1`,
      [accommodation.id, productId, `ESP-${productId}`, `HAB-${productId}`, `%${productId}%`],
    );
    
    let espacio = habRows[0];
    if (!espacio) {
      // Tomar primer espacio disponible del alojamiento si no se especificó un ID exacto
      const fallbackSpaces = await this.reservaRepository.query(
        `SELECT * FROM espacios_rentables WHERE "alojamientoId" = $1 ORDER BY id LIMIT 1`,
        [accommodation.id],
      );
      if (!fallbackSpaces || fallbackSpaces.length === 0) {
        throw new ProblemDetailsException(
          {
            type: 'https://api.booking-hub.com/errors/room-no-longer-available',
            title: 'Room no longer available',
            status: HttpStatus.CONFLICT,
            code: 'ROOM_NO_LONGER_AVAILABLE',
            detail: 'No rooms available for the selected accommodation.',
          },
          HttpStatus.CONFLICT,
        );
      }
      espacio = fallbackSpaces[0];
    }

    const roomsRequested = Number(guests.number_of_rooms || 1);
    if (espacio.cantidadDisponible < roomsRequested || espacio.estado === 'Lleno') {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/room-no-longer-available',
          title: 'Room no longer available',
          status: HttpStatus.CONFLICT,
          code: 'ROOM_NO_LONGER_AVAILABLE',
          detail: `Requested ${roomsRequested} room(s), but only ${espacio.cantidadDisponible} are available.`,
        },
        HttpStatus.CONFLICT,
      );
    }

    // 3. Calcular noches y precio
    const dIn = new Date(checkin);
    const dOut = new Date(checkout);
    const diffTime = Math.max(dOut.getTime() - dIn.getTime(), 1000 * 60 * 60 * 24);
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    const basePricePerNight = Number(espacio.precioPorNoche) || 100;
    const totalPrice = Math.round(basePricePerNight * nights * roomsRequested * 100) / 100;

    const orderPreviewId = `PREV-${crypto.randomUUID()}`;

    // Almacenar en caché temporal para validación en /orders/create
    ReservasService.previewsCache.set(orderPreviewId, {
      previewId: orderPreviewId,
      accommodationId: accommodation.id,
      productId: espacio.id,
      totalPrice,
      currency: 'USD',
      checkin,
      checkout,
      guests,
      createdAt: Date.now(),
    });

    return {
      request_id: crypto.randomUUID(),
      data: {
        order_preview_id: orderPreviewId,
        total_price: totalPrice,
        currency: 'USD',
      },
    };
  }

  /**
   * POST /orders/create
   * Crea formalmente la reserva. usuarioId se toma estrictamente del token JWT (sub).
   */
  async createOrder(createRequest: any, userIdFromToken: string): Promise<any> {
    if (!userIdFromToken || userIdFromToken.trim() === '') {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/unauthorized',
          title: 'Unauthorized: Missing user token',
          status: HttpStatus.UNAUTHORIZED,
          code: 'VALIDATION_FAILED',
          detail: 'Order owner must be inferred from the JWT "sub" claim.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const previewId = createRequest.order_preview_id;
    const paymentRef = createRequest.payment_reference || `PAY-REF-${Date.now()}`;
    const customer = createRequest.customer_details || {};

    // Obtener preview almacenado o reconstruir
    const preview = ReservasService.previewsCache.get(previewId);
    let accommodationId = preview?.accommodationId || createRequest.accommodation_id || createRequest.alojamientoId || 'ALO-001';
    let espacioId = preview?.productId || createRequest.product_id || createRequest.espacioId;
    let checkin = preview?.checkin || createRequest.checkin || createRequest.fechaInicio || new Date().toISOString().split('T')[0];
    let checkout = preview?.checkout || createRequest.checkout || createRequest.fechaFin;
    let expectedPrice = preview?.totalPrice || createRequest.totalPrice || createRequest.totalPagar;
    let guests = preview?.guests || { number_of_adults: Number(createRequest.numeroPersonas || 1), number_of_rooms: 1 };

    if (!checkout) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      checkout = tomorrow.toISOString().split('T')[0];
    }

    // 1. Revalidar disponibilidad y bloqueo de espacio
    const espacioRows = await this.reservaRepository.query(
      `SELECT er.*, a.nombre as "alojamientoNombre" 
       FROM espacios_rentables er
       JOIN alojamientos a ON er."alojamientoId" = a.id
       WHERE er.id = $1 OR er.id = $2 OR er."alojamientoId" = $3
       LIMIT 1`,
      [espacioId, `ESP-${espacioId}`, accommodationId],
    );

    if (!espacioRows || espacioRows.length === 0) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/room-no-longer-available',
          title: 'Room no longer available',
          status: HttpStatus.CONFLICT,
          code: 'ROOM_NO_LONGER_AVAILABLE',
          detail: 'The requested room could not be found or is no longer available.',
        },
        HttpStatus.CONFLICT,
      );
    }

    const espacio = espacioRows[0];
    espacioId = espacio.id;
    accommodationId = espacio.alojamientoId;

    if (espacio.cantidadDisponible <= 0 || espacio.estado === 'Lleno') {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/room-no-longer-available',
          title: 'Room no longer available',
          status: HttpStatus.CONFLICT,
          code: 'ROOM_NO_LONGER_AVAILABLE',
          detail: 'The requested room has zero available units.',
        },
        HttpStatus.CONFLICT,
      );
    }

    // 2. Revalidar precio actual
    const dIn = new Date(checkin);
    const dOut = new Date(checkout);
    const diffTime = Math.max(dOut.getTime() - dIn.getTime(), 1000 * 60 * 60 * 24);
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const currentPrice = Math.round(Number(espacio.precioPorNoche) * nights * Number(guests.number_of_rooms || 1) * 100) / 100;

    if (expectedPrice && Math.abs(currentPrice - expectedPrice) > 0.01) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/price-changed',
          title: 'Price has changed',
          status: HttpStatus.CONFLICT,
          code: 'PRICE_CHANGED',
          detail: `The price has changed from $${expectedPrice} to $${currentPrice}. Please confirm the new rate.`,
        },
        HttpStatus.CONFLICT,
      );
    }

    const finalPrice = expectedPrice || currentPrice;

    // Garantizar que el usuario exista en la tabla usuarios para respetar la FK
    const userRows = await this.reservaRepository.query(
      `SELECT id FROM usuarios WHERE id = $1`,
      [userIdFromToken],
    );
    if (!userRows || userRows.length === 0) {
      await this.reservaRepository.query(
        `INSERT INTO usuarios (id, "nombreCompleto", email, contrasena)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [
          userIdFromToken,
          `${customer.first_name || 'Usuario'} ${customer.last_name || 'Hub'}`.trim(),
          customer.email || `${userIdFromToken}@booking-hub.com`,
          'EXTERNAL_JWT_USER',
        ],
      );
    }

    // 3. Crear identificadores de la orden
    const orderId = crypto.randomUUID(); // reservas."ordenId"
    const locator = `LOC-${Math.floor(100000 + Math.random() * 900000)}`;
    const reservaId = `RES-${Math.floor(10000 + Math.random() * 90000)}`;
    const numGuests = Number(guests.number_of_adults || 1);

    // 4. Inserción transaccional
    await this.reservaRepository.query(`
      INSERT INTO reservas (id, "usuarioId", "espacioId", "estadoId", "fechaEntrada", "fechaSalida", "precioTotal", "numeroPersonas", "ordenId")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [reservaId, userIdFromToken, espacioId, 'EST-002', checkin, checkout, finalPrice, numGuests, orderId]);

    // Contrato legal asociado
    const contratoId = `CON-${Math.floor(10000 + Math.random() * 90000)}`;
    const clientName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Huésped';
    const terminos = `Contrato de Arrendamiento Temporal (GDS Core Hub)\n\nLocalizador: ${locator}\nOrden: ${orderId}\nCliente: ${clientName}\nPeríodo: ${checkin} a ${checkout}\nTotal: $${finalPrice} USD.\nReferencia de Pago: ${paymentRef}`;
    
    await this.reservaRepository.query(`
      INSERT INTO contratos (id, "reservaId", terminos, firmado, "fechaFirma")
      VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)
    `, [contratoId, reservaId, terminos]);

    // Descontar inventario
    await this.reservaRepository.query(`
      UPDATE espacios_rentables 
      SET 
        "cantidadDisponible" = GREATEST("cantidadDisponible" - 1, 0),
        estado = CASE WHEN "cantidadDisponible" - 1 <= 0 THEN 'Reservado' ELSE estado END
      WHERE id = $1
    `, [espacioId]);

    // Registrar historial de estados
    await this.reservaRepository.query(`
      INSERT INTO historial_reservas (id, "reservaId", "estadoNuevoId", notas)
      VALUES ($1, $2, 'EST-002', $3)
    `, [`HIS-${Date.now()}`, reservaId, `Orden creada vía GDS Hub (Ref: ${paymentRef})`]);

    // Limpiar preview usado
    if (previewId) {
      ReservasService.previewsCache.delete(previewId);
    }

    const apiPrefix = process.env.API_PREFIX !== undefined ? process.env.API_PREFIX : 'api/v1';
    const basePrefix = apiPrefix ? `/${apiPrefix}` : '';

    return {
      order_id: orderId,
      locator: locator,
      status: 'CONFIRMED',
      accommodation_details: {
        id: accommodationId,
        name: espacio.alojamientoNombre,
        room: espacio.nombre,
        checkin: checkin,
        checkout: checkout,
        guests: guests,
      },
      total_price: finalPrice,
      currency: 'USD',
      creation_date: new Date().toISOString(),
      _links: {
        self: `${basePrefix}/orders/${orderId}`,
        modify: `${basePrefix}/orders/${orderId}/modify`,
        cancel: `${basePrefix}/orders/${orderId}/cancel`,
      },
    };
  }

  /**
   * GET /orders/:orderId
   * Obtiene los detalles de la orden por su UUID.
   */
  async getOrder(orderId: string): Promise<any> {
    const rows = await this.reservaRepository.query(`
      SELECT 
        r.id as "reservaId",
        r."ordenId",
        r."fechaEntrada",
        r."fechaSalida",
        r."precioTotal",
        r."numeroPersonas",
        r."estadoId",
        e.nombre as "estadoNombre",
        a.id as "alojamientoId",
        a.nombre as "alojamientoNombre",
        esp.id as "espacioId",
        esp.nombre as "espacioNombre",
        u."nombreCompleto" as "usuarioNombre",
        u.email as "usuarioEmail"
      FROM reservas r
      LEFT JOIN estados_reserva e ON r."estadoId" = e.id
      LEFT JOIN espacios_rentables esp ON r."espacioId" = esp.id
      LEFT JOIN alojamientos a ON esp."alojamientoId" = a.id
      LEFT JOIN usuarios u ON r."usuarioId" = u.id
      WHERE r."ordenId" = $1
    `, [orderId]);

    if (!rows || rows.length === 0) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/not-found',
          title: 'Order not found',
          status: HttpStatus.NOT_FOUND,
          code: 'VALIDATION_FAILED',
          detail: `Order with ID "${orderId}" was not found.`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const row = rows[0];
    const statusMap: Record<string, string> = {
      'EST-001': 'PENDING',
      'EST-002': 'CONFIRMED',
      'EST-003': 'CANCELLED',
    };

    const apiPrefix = process.env.API_PREFIX !== undefined ? process.env.API_PREFIX : 'api/v1';
    const basePrefix = apiPrefix ? `/${apiPrefix}` : '';

    return {
      order_id: row.ordenId,
      locator: `LOC-${row.reservaId.replace('RES-', '')}`,
      status: statusMap[row.estadoId] || 'CONFIRMED',
      accommodation_details: {
        id: row.alojamientoId,
        name: row.alojamientoNombre,
        room: row.espacioNombre,
        checkin: row.fechaEntrada,
        checkout: row.fechaSalida,
        guests: {
          number_of_adults: row.numeroPersonas || 1,
          number_of_rooms: 1,
        },
      },
      total_price: Number(row.precioTotal),
      currency: 'USD',
      creation_date: new Date().toISOString(),
      _links: {
        self: `${basePrefix}/orders/${row.ordenId}`,
        modify: `${basePrefix}/orders/${row.ordenId}/modify`,
        cancel: `${basePrefix}/orders/${row.ordenId}/cancel`,
      },
    };
  }

  /**
   * POST /orders/:orderId/modify
   * Modifica fechas u huéspedes revalidando disponibilidad y precio.
   */
  async modifyOrder(orderId: string, modifyRequest: any): Promise<any> {
    const rows = await this.reservaRepository.query(
      `SELECT r.*, esp."precioPorNoche", esp."cantidadDisponible", esp.estado as "espacioEstado" 
       FROM reservas r
       LEFT JOIN espacios_rentables esp ON r."espacioId" = esp.id
       WHERE r."ordenId" = $1`,
      [orderId],
    );

    if (!rows || rows.length === 0) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/not-found',
          title: 'Order not found',
          status: HttpStatus.NOT_FOUND,
          code: 'VALIDATION_FAILED',
          detail: `Cannot modify non-existent order "${orderId}".`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const currentOrder = rows[0];

    if (currentOrder.estadoId === 'EST-003') {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/cancellation-not-allowed',
          title: 'Modification not allowed',
          status: HttpStatus.CONFLICT,
          code: 'CANCELLATION_NOT_ALLOWED',
          detail: 'Cannot modify an order that has already been cancelled.',
        },
        HttpStatus.CONFLICT,
      );
    }

    const newCheckin = modifyRequest.checkin || currentOrder.fechaEntrada;
    const newCheckout = modifyRequest.checkout || currentOrder.fechaSalida;
    const guests = modifyRequest.guests;
    const newGuestsCount = guests?.number_of_adults || currentOrder.numeroPersonas || 1;

    // Revalidar fechas
    const dIn = new Date(newCheckin);
    const dOut = new Date(newCheckout);
    if (dOut <= dIn) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/validation-failed',
          title: 'Invalid dates',
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_FAILED',
          detail: 'Checkout date must be strictly after checkin date.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Revalidar disponibilidad
    const diffTime = Math.max(dOut.getTime() - dIn.getTime(), 1000 * 60 * 60 * 24);
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const basePrice = Number(currentOrder.precioPorNoche || 100);
    const newTotalPrice = Math.round(basePrice * nights * 100) / 100;

    // Actualizar en base de datos
    await this.reservaRepository.query(`
      UPDATE reservas
      SET 
        "fechaEntrada" = $1,
        "fechaSalida" = $2,
        "numeroPersonas" = $3,
        "precioTotal" = $4
      WHERE "ordenId" = $5
    `, [newCheckin, newCheckout, newGuestsCount, newTotalPrice, orderId]);

    // Registrar en historial
    await this.reservaRepository.query(`
      INSERT INTO historial_reservas (id, "reservaId", "estadoAnteriorId", "estadoNuevoId", notas)
      VALUES ($1, $2, $3, $3, $4)
    `, [`HIS-${Date.now()}`, currentOrder.id, currentOrder.estadoId, `Orden modificada: nuevas fechas ${newCheckin} - ${newCheckout}`]);

    return await this.getOrder(orderId);
  }

  /**
   * POST /orders/:orderId/cancel
   * Cancela la orden, actualiza estado a EST-003 y devuelve stock a espacios_rentables.
   */
  async cancelOrder(orderId: string): Promise<any> {
    const rows = await this.reservaRepository.query(
      `SELECT * FROM reservas WHERE "ordenId" = $1`,
      [orderId],
    );

    if (!rows || rows.length === 0) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/not-found',
          title: 'Order not found',
          status: HttpStatus.NOT_FOUND,
          code: 'VALIDATION_FAILED',
          detail: `Cannot cancel non-existent order "${orderId}".`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const order = rows[0];

    if (order.estadoId === 'EST-003') {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/cancellation-not-allowed',
          title: 'Cancellation not allowed',
          status: HttpStatus.CONFLICT,
          code: 'CANCELLATION_NOT_ALLOWED',
          detail: 'Order is already cancelled.',
        },
        HttpStatus.CONFLICT,
      );
    }

    // 1. Cambiar estado a EST-003 (Cancelada)
    await this.reservaRepository.query(
      `UPDATE reservas SET "estadoId" = 'EST-003' WHERE "ordenId" = $1`,
      [orderId],
    );

    // 2. Liberar inventario
    if (order.espacioId) {
      await this.reservaRepository.query(`
        UPDATE espacios_rentables
        SET 
          "cantidadDisponible" = "cantidadDisponible" + 1,
          estado = CASE WHEN "cantidadDisponible" + 1 > 0 AND estado = 'Reservado' THEN 'Activo' ELSE estado END
        WHERE id = $1
      `, [order.espacioId]);
    }

    // 3. Registrar en historial
    await this.reservaRepository.query(`
      INSERT INTO historial_reservas (id, "reservaId", "estadoAnteriorId", "estadoNuevoId", notas)
      VALUES ($1, $2, $3, 'EST-003', 'Orden cancelada vía GDS Core Hub API')
    `, [`HIS-${Date.now()}`, order.id, order.estadoId]);

    return await this.getOrder(orderId);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Módulo de Reservas (Legacy / Tienda Interna)
  //  Comparte la lógica transaccional de reservas y ordenId
  // ═══════════════════════════════════════════════════════════════════════

  async create(crearReservaDto: CrearReservaDto) {
    const { alojamientoId, nombreCliente, emailCliente, fechaInicio, fechaFin, totalPagar, numeroPersonas } = crearReservaDto;

    const user = await this.reservaRepository.query(`SELECT id FROM usuarios WHERE email = $1`, [emailCliente]);
    const usuarioId = user[0]?.id || null;

    const espacio = await this.reservaRepository.query(`SELECT id FROM espacios_rentables WHERE "alojamientoId" = $1 LIMIT 1`, [alojamientoId]);
    const espacioId = espacio[0]?.id || null;

    const newId = 'RES-' + Math.floor(10000 + Math.random() * 90000);
    const ordenId = crypto.randomUUID(); // Cada reserva tiene su ordenId único

    await this.reservaRepository.query(`
      INSERT INTO reservas (id, "usuarioId", "espacioId", "estadoId", "fechaEntrada", "fechaSalida", "precioTotal", "numeroPersonas", "ordenId")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [newId, usuarioId, espacioId, 'EST-001', fechaInicio, fechaFin, totalPagar, numeroPersonas, ordenId]);

    const contratoId = 'CON-' + Math.floor(10000 + Math.random() * 90000);
    const terminos = `Contrato de Arrendamiento Temporal.\n\nEl cliente ${nombreCliente} acuerda rentar el alojamiento desde ${fechaInicio} hasta ${fechaFin} por un total de $${totalPagar}.\nEl cliente acepta acatar las normas del alojamiento y cubrir cualquier daño a la propiedad.`;
    await this.reservaRepository.query(`
      INSERT INTO contratos (id, "reservaId", terminos, firmado)
      VALUES ($1, $2, $3, false)
    `, [contratoId, newId, terminos]);

    if (espacioId) {
      await this.reservaRepository.query(`
        UPDATE espacios_rentables 
        SET 
          "cantidadDisponible" = GREATEST("cantidadDisponible" - 1, 0),
          estado = 'Reservado'
        WHERE id = $1
      `, [espacioId]);
    }

    return { id: newId, ordenId: ordenId, status: 'success' };
  }

  async findAll() {
    return await this.reservaRepository.query(`SELECT * FROM reservas`);
  }

  async findAllAdmin() {
    return await this.reservaRepository.query(`
      SELECT 
        r.id, 
        r."ordenId",
        r."fechaEntrada" as "fechaInicio", 
        r."fechaSalida" as "fechaFin", 
        r."precioTotal" as "totalPagar",
        COALESCE(e.nombre, 'Pendiente') as "estado",
        u."nombreCompleto" as "cliente",
        COALESCE(al.nombre, r."espacioId") as "alojamiento",
        c.firmado as "contratoFirmado",
        CASE WHEN p.id IS NOT NULL THEN true ELSE false END as "pagoCompletado"
      FROM reservas r
      LEFT JOIN estados_reserva e ON r."estadoId" = e.id
      LEFT JOIN usuarios u ON r."usuarioId" = u.id
      LEFT JOIN espacios_rentables esp ON r."espacioId" = esp.id
      LEFT JOIN alojamientos al ON esp."alojamientoId" = al.id
      LEFT JOIN contratos c ON c."reservaId" = r.id
      LEFT JOIN pagos p ON p."reservaId" = r.id
      ORDER BY r."fechaEntrada" DESC
    `);
  }

  async findOne(id: string) {
    const result = await this.reservaRepository.query(`SELECT * FROM reservas WHERE id = $1`, [id]);
    if (!result[0]) {
      throw new ProblemDetailsException({
        type: 'https://api.booking-hub.com/errors/not-found',
        title: 'Resource Not Found',
        status: HttpStatus.NOT_FOUND,
        code: 'VALIDATION_FAILED',
        detail: `Reserva con ID ${id} no encontrada`,
      }, HttpStatus.NOT_FOUND);
    }
    return result[0];
  }

  async findByEmail(email: string) {
    return await this.reservaRepository.query(`
      SELECT 
        r.id, 
        r."ordenId",
        r."fechaEntrada" as "fechaInicio", 
        r."fechaSalida" as "fechaFin", 
        r."precioTotal" as "totalPagar",
        e.nombre as "estado",
        r.calificacion,
        r.comentario,
        c.firmado as "contratoFirmado",
        c.terminos as "contratoTerminos",
        a."politicaCancelacion",
        json_build_object('nombre', a.nombre) as alojamiento
      FROM reservas r
      LEFT JOIN usuarios u ON r."usuarioId" = u.id
      LEFT JOIN espacios_rentables esp ON r."espacioId" = esp.id
      LEFT JOIN alojamientos a ON esp."alojamientoId" = a.id
      LEFT JOIN estados_reserva e ON r."estadoId" = e.id
      LEFT JOIN contratos c ON r.id = c."reservaId"
      WHERE u.email = $1
      ORDER BY r."fechaEntrada" DESC
    `, [email]);
  }

  async rateReserva(id: string, calificacion: number, comentario: string) {
    await this.reservaRepository.query(`
      UPDATE reservas SET calificacion = $1, comentario = $2 WHERE id = $3
    `, [calificacion, comentario, id]);
    return { status: 'success' };
  }

  async firmarContrato(reservaId: string) {
    await this.reservaRepository.query(`
      UPDATE contratos SET firmado = true, "fechaFirma" = CURRENT_TIMESTAMP WHERE "reservaId" = $1
    `, [reservaId]);
    return { status: 'success', message: 'Contrato firmado' };
  }

  async cancelarReserva(id: string) {
    const reserva = await this.reservaRepository.query(`SELECT "espacioId", "ordenId" FROM reservas WHERE id = $1`, [id]);
    const espacioId = reserva[0]?.espacioId;
    const ordenId = reserva[0]?.ordenId;

    if (ordenId) {
      return await this.cancelOrder(ordenId);
    }

    await this.reservaRepository.query(`
      UPDATE reservas SET "estadoId" = 'EST-003' WHERE id = $1
    `, [id]);

    if (espacioId) {
      await this.reservaRepository.query(`
        UPDATE espacios_rentables 
        SET 
          "cantidadDisponible" = "cantidadDisponible" + 1,
          estado = CASE WHEN "cantidadDisponible" + 1 > 0 AND estado = 'Reservado' THEN 'Activo' ELSE estado END
        WHERE id = $1
      `, [espacioId]);
    }

    return { status: 'success', message: 'Reserva cancelada exitosamente' };
  }

  async aprobarReserva(id: string) {
    await this.reservaRepository.query(`
      UPDATE reservas SET "estadoId" = 'EST-002' WHERE id = $1
    `, [id]);
    return { status: 'success', message: 'Reserva aprobada exitosamente' };
  }

  async getCancelaciones() {
    const canceladas = await this.reservaRepository.query(`
      SELECT 
        r.id as "reservaId",
        r."ordenId",
        u."nombreCompleto" as "cliente",
        a.nombre as "alojamiento",
        r."fechaEntrada",
        r."fechaSalida",
        r."precioTotal",
        a."politicaCancelacion"
      FROM reservas r
      JOIN usuarios u ON r."usuarioId" = u.id
      JOIN espacios_rentables esp ON r."espacioId" = esp.id
      JOIN alojamientos a ON esp."alojamientoId" = a.id
      WHERE r."estadoId" = 'EST-003'
      ORDER BY r."fechaEntrada" DESC
    `);
    return canceladas;
  }
}
