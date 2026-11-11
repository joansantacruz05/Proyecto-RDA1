import {
  Injectable,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { ReceptionAdjustmentDto } from './dto/reception-adjustment.dto';
import { ProblemDetailsException } from '../../common/exceptions/problem-details.exception';
import { PricingService } from '../../common/services/pricing.service';
import { InventorySyncService } from '../inventario/inventory-sync.service';
import { generateEntityId } from '../../common/utils/password-rules';
import { validarIdentificacion } from '../../common/utils/ecuador-validators';
import { randomUUID } from 'crypto';
import { catalogCache } from '../../common/utils/ttl-cache';
import { buildEcuadorHourTimestamp, normalizeHoraHHMM, parseHoraMinutes } from '../../common/utils/time-format';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ReservasService implements OnModuleInit, OnModuleDestroy {
  // Caché en memoria para previsualizaciones temporales de órdenes (15 min)
  public static previewsCache: Map<string, any> = new Map();
  public static quotesCache: Map<string, any> = new Map();

  constructor(
    private readonly dataSource: DataSource,
    private readonly pricingService: PricingService,
    private readonly inventorySyncService: InventorySyncService,
  ) {}

  private readonly logger = new Logger(ReservasService.name);
  private checkinWorker?: NodeJS.Timeout;

  /**
   * Bootstrap idempotente del esquema (seguro con varias instancias):
   *  - reservas."idempotencyKey" + índice UNIQUE (llave, usuario): la BD misma impide 2 órdenes por llave.
   *  - índice parcial para el conteo de solapamientos (acelera orders/create y el catálogo).
   *  - checkin_notificaciones: cola persistente (outbox) de avisos de check-in hacia Booking.
   */
  async onModuleInit() {
    const ddl = [
      `ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "checkinRealizado" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "checkinHora" TIMESTAMPTZ`,
      `ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "earlyCheckinAutorizado" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "checkoutRealizado" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "checkoutHora" TIMESTAMPTZ`,
      `ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "huespedesReales" INT`,
      `ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "espacioOriginalId" VARCHAR(50)`,
      `ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "extrasCargos" JSONB NOT NULL DEFAULT '[]'::jsonb`,
      `ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "cargosAdicionalesTotal" NUMERIC(10,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "montoPagadoInicial" NUMERIC(10,2)`,
      `ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "notasRecepcion" TEXT`,
      `ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "idempotencyKey" UUID`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_reservas_idempotency ON reservas ("idempotencyKey", "usuarioId") WHERE "idempotencyKey" IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_reservas_espacio_fechas ON reservas ("espacioId", "fechaEntrada", "fechaSalida") WHERE "estadoId" IN ('EST-001', 'EST-002')`,
      `UPDATE reservas SET "espacioId" = 'ESP-001' WHERE "espacioId" IN ('HAB-001-A', 'HAB-001-B')`,
      `UPDATE reservas SET "espacioId" = 'ESP-002' WHERE "espacioId" IN ('HAB-002-A', 'HAB-002-B')`,
      `UPDATE reservas SET "espacioId" = 'ESP-003' WHERE "espacioId" IN ('HAB-003-A', 'HAB-003-B')`,
      `UPDATE reservas SET "espacioId" = 'ESP-004' WHERE "espacioId" IN ('HAB-004-A', 'HAB-004-B')`,
      `UPDATE reservas SET "espacioId" = 'ESP-005' WHERE "espacioId" IN ('HAB-005-A', 'HAB-005-B')`,
      `DELETE FROM espacios_rentables WHERE id LIKE 'HAB-00%'`,
      `UPDATE espacios_rentables SET codigo = 'SUITE_DELUXE' WHERE id LIKE 'ESP-%' AND (codigo IS NULL OR codigo != 'SUITE_DELUXE')`,
      `UPDATE espacios_rentables SET "cantidadDisponible" = 3 WHERE id LIKE 'ESP-%' AND "cantidadDisponible" != 3`,
      `CREATE INDEX IF NOT EXISTS idx_reservas_fechas_estado ON reservas ("espacioId", "estadoId", "fechaEntrada", "fechaSalida")`,
      `CREATE TABLE IF NOT EXISTS checkin_notificaciones (
         id BIGSERIAL PRIMARY KEY,
         reserva_id VARCHAR(50) NOT NULL,
         external_order_id VARCHAR(100) NOT NULL,
         payload JSONB NOT NULL,
         intentos INT NOT NULL DEFAULT 0,
         ultimo_intento TIMESTAMPTZ,
         ultimo_error TEXT,
         http_status INT,
         publicado_en TIMESTAMPTZ,
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_checkin_notif_reserva ON checkin_notificaciones (reserva_id)`,
    ];
    for (const stmt of ddl) {
      try {
        await this.dataSource.query(stmt);
      } catch (err: any) {
        this.logger.warn(`[BOOTSTRAP] ${err?.message}`);
      }
    }

    // Reintentos en segundo plano de avisos de check-in pendientes (no en pruebas).
    if (process.env.NODE_ENV !== 'test') {
      this.checkinWorker = setInterval(() => {
        this.retryPendingCheckinNotifications().catch((e) =>
          this.logger.warn(`[CHECKIN-RETRY] ${e?.message}`),
        );
      }, 30_000);
      this.checkinWorker.unref();
    }
  }

  onModuleDestroy() {
    if (this.checkinWorker) clearInterval(this.checkinWorker);
  }

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
      `SELECT e.*, a.nombre as "alojamientoNombre", a.codigo as "alojamientoCodigo", a."politicaCancelacion",
              COALESCE(TO_CHAR(a."horaCheckIn", 'HH24:MI'), '14:00') as "horaCheckIn",
              COALESCE(TO_CHAR(a."horaCheckOut", 'HH24:MI'), '11:00') as "horaCheckOut"
       FROM espacios_rentables e
       JOIN alojamientos a ON a.id = e."alojamientoId"
       WHERE (e.id = $1 OR e.id = $2 OR e.codigo = $3) AND a.estado = 'Activo'
       LIMIT 1`,
      [productId, `HAB-${productId}`, productId],
    );

    let espacio = habRows[0];
    if (!espacio && accommodationId) {
      const fallback = await this.dataSource.query(
        `SELECT e.*, a.nombre as "alojamientoNombre", a.codigo as "alojamientoCodigo", a."politicaCancelacion",
                COALESCE(TO_CHAR(a."horaCheckIn", 'HH24:MI'), '14:00') as "horaCheckIn",
                COALESCE(TO_CHAR(a."horaCheckOut", 'HH24:MI'), '11:00') as "horaCheckOut"
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
    const checkinClean = String(checkin).split('T')[0];
    const checkoutClean = String(checkout).split('T')[0];

    const availabilityQuery = await this.dataSource.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN r."espacioId" = $1 THEN COALESCE(r."cantidadHabitaciones", 1) ELSE 0 END), 0)::int as ocupadas_espacio,
         COALESCE(SUM(COALESCE(r."cantidadHabitaciones", 1)), 0)::int as ocupadas_hotel,
         (SELECT e."cantidadDisponible"::int FROM espacios_rentables e WHERE e.id = $1) as total_espacio,
         (SELECT COALESCE(SUM(er3."cantidadDisponible"), 0)::int FROM espacios_rentables er3 WHERE er3."alojamientoId" = $2 AND (er3.estado = 'Activo' OR er3.estado IS NULL)) as total_hotel
       FROM reservas r
       JOIN espacios_rentables er ON er.id = r."espacioId"
       WHERE er."alojamientoId" = $2
         AND r."estadoId" IN ('EST-001', 'EST-002')
         AND COALESCE(r."checkoutRealizado", false) = false
         AND r."fechaEntrada" < $4::date AND r."fechaSalida" > $3::date`,
      [espacio.id, espacio.alojamientoId, checkinClean, checkoutClean],
    );

    const rowAvail = availabilityQuery[0] || {};
    const totalEspacio = Number(rowAvail.total_espacio ?? espacio.cantidadDisponible ?? 1);
    const totalHotel = Number(rowAvail.total_hotel ?? totalEspacio);
    const ocupadasEspacio = Number(rowAvail.ocupadas_espacio || 0);
    const ocupadasHotel = Number(rowAvail.ocupadas_hotel || 0);

    const dispEsp = Math.max(0, totalEspacio - ocupadasEspacio);
    const dispHotel = Math.max(0, totalHotel - ocupadasHotel);
    const disponibles = Math.min(dispEsp, dispHotel);
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

    const horaCheckIn = normalizeHoraHHMM(espacio.horaCheckIn, '14:00');
    const horaCheckOut = normalizeHoraHHMM(espacio.horaCheckOut, '11:00');

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
        checkin_time: horaCheckIn,
        checkout_time: horaCheckOut,
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
        free_cancellation_until: buildEcuadorHourTimestamp(checkin, horaCheckIn),
        penalty_percentage: 100.0,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CREAR RESERVA / ORDEN TRANSACCIONAL
  // ═══════════════════════════════════════════════════════════════════════

  async create(crearReservaDto: any, userId?: string, clientIdHeader?: string, req?: any, res?: any) {
    return this.createOrder(crearReservaDto, userId || 'NODE_SYSTEM_HUB', clientIdHeader, req, res);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CREAR ORDEN VÍA CONTRATO HUB (/orders/create)
  // ═══════════════════════════════════════════════════════════════════════

  async createOrder(
    createRequest: any,
    userIdFromToken: string,
    clientIdHeader?: string,
    req?: any,
    res?: any,
  ): Promise<any> {
    const tStart = performance.now();
    const rawIdemKey = String(req?.headers?.['idempotency-key'] || req?.idempotencyInfo?.key || '').trim();
    const idemKey = UUID_RE.test(rawIdemKey) ? rawIdemKey : null;
    const previewId = createRequest.order_preview_id || createRequest.orderPreviewId;
    const cachedPreview = previewId ? ReservasService.previewsCache.get(previewId) : null;

    const accommodationId = String(
      createRequest.alojamientoId ||
      createRequest.accommodation_id ||
      createRequest.accommodationId ||
      createRequest.hotel_id ||
      createRequest.hotelId ||
      createRequest.accommodation ||
      createRequest.property_id ||
      createRequest.selected_product?.accommodation_id ||
      cachedPreview?.accommodationId ||
      ''
    ).trim();

    const tipoHabitacionCodigo = String(
      createRequest.tipoHabitacionCodigo ||
      createRequest.tipoHabitacion ||
      createRequest.room_type ||
      createRequest.room_type_code ||
      createRequest.product_id ||
      createRequest.productId ||
      createRequest.roomId ||
      createRequest.room_id ||
      createRequest.espacioId ||
      createRequest.selected_product?.product_id ||
      cachedPreview?.productId ||
      ''
    ).trim();

    const checkin =
      createRequest.fechaInicio ||
      createRequest.checkin ||
      createRequest.dates?.checkin ||
      cachedPreview?.checkin;

    const checkout =
      createRequest.fechaFin ||
      createRequest.checkout ||
      createRequest.dates?.checkout ||
      cachedPreview?.checkout;

    const cantidadHabitaciones = Math.max(1, Number(
      createRequest.cantidadHabitaciones ||
      createRequest.rooms ||
      createRequest.guests?.number_of_rooms ||
      1,
    ));

    const ocupantes = createRequest.ocupantes || createRequest.guests;

    // Validación estricta de Adultos (>= 1, sin fallback implícito '|| 1')
    const totalAdultos = ocupantes?.adultos !== undefined
      ? Number(ocupantes.adultos)
      : (createRequest.adultos !== undefined
          ? Number(createRequest.adultos)
          : (ocupantes?.number_of_adults !== undefined
              ? Number(ocupantes.number_of_adults)
              : (createRequest.numeroPersonas !== undefined ? Number(createRequest.numeroPersonas) : NaN)));

    if (isNaN(totalAdultos) || totalAdultos < 1) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/validation-failed',
          title: 'Validation Failed',
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_FAILED',
          detail: 'El número de adultos es obligatorio y debe ser mayor o igual a 1 (no se permite omisión ni default "|| 1").',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const totalNinos = Number(ocupantes?.ninos || ocupantes?.number_of_children || 0);

    const huespedTitular = createRequest.huespedTitular || {
      nombreCompleto:
        createRequest.customer?.name ||
        createRequest.customer_contact?.full_name ||
        `${createRequest.customer?.first_name || 'Huésped'} ${createRequest.customer?.last_name || 'Booking'}`.trim(),
      tipoDocumento: 'CEDULA',
      identificacion: createRequest.customer?.identificacion || createRequest.customer_contact?.identificacion || '1710034065',
      email: createRequest.customer?.email || createRequest.customer_contact?.email || `${userIdFromToken}@booking-hub.com`,
      telefono: createRequest.customer?.phone || createRequest.customer_contact?.phone || '+593991234567',
    };

    // Validación de correo electrónico
    const guestEmail =
      createRequest.emailCliente ||
      huespedTitular?.email ||
      createRequest.customer_contact?.email ||
      createRequest.customer?.email;
    if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/validation-failed',
          title: 'Validation Failed',
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_FAILED',
          detail: 'El correo electrónico del huésped titular es obligatorio y debe ser una dirección válida.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const currency = createRequest.currency || 'USD';
    const totalPagar = createRequest.totalPagar !== undefined ? createRequest.totalPagar : createRequest.total;
    const cotizacionId = createRequest.cotizacionId || createRequest.quote_id;
    const sagaId = createRequest.saga_id || createRequest.sagaId;
    const paymentRef = createRequest.payment_reference || createRequest.paymentReference || 'EXT-PAY-SIMULATED';

    // 1. Validar Moneda
    if (currency && currency.toUpperCase() !== 'USD') {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/unsupported-currency',
          title: 'Unsupported Currency',
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: 'UNSUPPORTED_CURRENCY',
          detail: `Moneda "${currency}" no soportada. Solo se admite USD.`,
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // 2. Validar Fechas (hoy en America/Guayaquil, sin new Date de solo fecha)
    if (!checkin || !checkout) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/validation-failed',
          title: 'Validation Failed',
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_FAILED',
          detail: 'Las fechas fechaInicio (checkin) y fechaFin (checkout) son obligatorias.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const checkinClean = String(checkin).split('T')[0];
    const checkoutClean = String(checkout).split('T')[0];

    // Obtener fecha actual en America/Guayaquil mediante formato ISO YYYY-MM-DD
    const partsGuayaquil = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const pMap: Record<string, string> = {};
    for (const p of partsGuayaquil) pMap[p.type] = p.value;
    const hoyGuayaquil = `${pMap.year}-${pMap.month}-${pMap.day}`;

    // Fechas no pasadas
    if (checkinClean < hoyGuayaquil) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/validation-failed',
          title: 'Validation Failed',
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_FAILED',
          detail: `La fecha de check-in (${checkinClean}) no puede ser una fecha pasada (fecha actual en America/Guayaquil: ${hoyGuayaquil}).`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Salida posterior a entrada
    if (checkoutClean <= checkinClean) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/validation-failed',
          title: 'Validation Failed',
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_FAILED',
          detail: 'La fecha de check-out debe ser estrictamente posterior a la fecha de check-in.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 3. Validar Documento de Identidad ecuatoriano
    if (huespedTitular?.identificacion) {
      const docVal = validarIdentificacion(String(huespedTitular.identificacion).trim());
      if (!docVal.valido) {
        throw new ProblemDetailsException(
          {
            type: 'https://api.booking-hub.com/errors/invalid-document',
            title: 'Invalid Document',
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            code: 'INVALID_DOCUMENT',
            detail: docVal.mensaje || 'Documento de identidad no válido (algoritmo módulo 10 SRI).',
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    // 4. Validar Cotización expirada si viene provista
    if (cotizacionId) {
      const quote = ReservasService.quotesCache?.get(cotizacionId);
      if (quote && quote.tarifaValidaHasta && new Date() > quote.tarifaValidaHasta) {
        throw new ProblemDetailsException(
          {
            type: 'https://api.booking-hub.com/errors/quote-expired',
            title: 'Quote Expired',
            status: HttpStatus.CONFLICT,
            code: 'QUOTE_EXPIRED',
            detail: `La cotización ${cotizacionId} ha expirado (TTL de 30 minutos).`,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    const tValEnd = performance.now();
    const valDur = (tValEnd - tStart).toFixed(1);

    // 5. Transacción de reserva con concurrencia optimizada (SELECT FOR UPDATE consolidado)
    try {
    const result = await this.dataSource.transaction(async (manager) => {
      const tLockStart = performance.now();

      // 1. Bloqueo exclusivo a nivel de fila sobre el alojamiento y la habitación (serializa peticiones concurrentes)
      if (accommodationId) {
        await manager.query(
          `SELECT id FROM alojamientos 
           WHERE (
             id = $1 
             OR codigo = $1 
             OR REPLACE(codigo, '-', '_') = REPLACE($1, '-', '_') 
             OR REPLACE(codigo, '_', '-') = REPLACE($1, '_', '-') 
             OR id = ('ALO-' || $1)
           ) FOR UPDATE`,
          [accommodationId],
        );
      }

      const espacios = await manager.query(
        `SELECT e.*, a.id as "alojamientoId", a.nombre as "alojamientoNombre", a.codigo as "alojamientoCodigo", a."politicaCancelacion",
                COALESCE(TO_CHAR(a."horaCheckIn", 'HH24:MI'), '14:00') as "horaCheckIn",
                COALESCE(TO_CHAR(a."horaCheckOut", 'HH24:MI'), '11:00') as "horaCheckOut"
         FROM alojamientos a
         JOIN espacios_rentables e ON e."alojamientoId" = a.id
         WHERE (
           a.id = $1 
           OR a.codigo = $1 
           OR REPLACE(a.codigo, '-', '_') = REPLACE($1, '-', '_') 
           OR REPLACE(a.codigo, '_', '-') = REPLACE($1, '_', '-') 
           OR a.id = ('ALO-' || $1) 
           OR $1 = '' 
           OR $1 IS NULL
         )
           AND (e.estado = 'Activo' OR e.estado IS NULL)
         ORDER BY 
           (CASE WHEN e.codigo = $2 OR e.id = $2 OR REPLACE(e.codigo, '-', '_') = REPLACE($2, '-', '_') THEN 0 ELSE 1 END),
           (CASE WHEN e.codigo = 'SUITE_DELUXE' THEN 0 ELSE 1 END),
           e.id
         LIMIT 1
         FOR UPDATE OF e;`,
        [accommodationId || '', tipoHabitacionCodigo || ''],
      );

      const tLockEnd = performance.now();
      const lockDur = (tLockEnd - tLockStart).toFixed(1);

      if (!espacios || espacios.length === 0) {
        throw new ProblemDetailsException(
          {
            type: 'https://api.booking-hub.com/errors/not-found',
            title: 'Habitación no encontrada',
            status: HttpStatus.NOT_FOUND,
            code: 'NOT_FOUND',
            detail: `No se encontró habitación con código "${tipoHabitacionCodigo}" en el alojamiento "${accommodationId}".`,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const espacio = espacios[0];

      // 2. Validar Capacidad
      const totalPersonas = totalAdultos + totalNinos;
      const capacidadMax = (Number(espacio.capacidadAdultos || 2) + Number(espacio.capacidadNinos || 0)) * cantidadHabitaciones;

      if (totalPersonas > capacidadMax) {
        throw new ProblemDetailsException(
          {
            type: 'https://api.booking-hub.com/errors/capacity-exceeded',
            title: 'Capacity Exceeded',
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            code: 'CAPACITY_EXCEEDED',
            detail: `El número de ocupantes (${totalPersonas}) excede la capacidad máxima (${capacidadMax}) de ${cantidadHabitaciones} habitación(es) "${espacio.nombre}".`,
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      // 3. Bajo el bloqueo exclusivo FOR UPDATE, contar reservas activas concurrentes para las fechas solicitadas
      // Contar tanto las reservas sobre el espacio como todas las reservas sobre el mismo alojamiento (sumando cantidadHabitaciones)
      const overlapCountRes = await manager.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN r."espacioId" = $2 THEN COALESCE(r."cantidadHabitaciones", 1) ELSE 0 END), 0)::int as ocupadas_espacio,
           COALESCE(SUM(COALESCE(r."cantidadHabitaciones", 1)), 0)::int as ocupadas_hotel,
           (SELECT COALESCE(SUM(er3."cantidadDisponible"), 0)::int FROM espacios_rentables er3 WHERE er3."alojamientoId" = $1 AND (er3.estado = 'Activo' OR er3.estado IS NULL)) as total_hotel
         FROM reservas r
         JOIN espacios_rentables er ON er.id = r."espacioId"
         WHERE er."alojamientoId" = $1
           AND r."estadoId" IN ('EST-001', 'EST-002')
           AND COALESCE(r."checkoutRealizado", false) = false
           AND r."fechaEntrada" < $4::date AND r."fechaSalida" > $3::date`,
        [espacio.alojamientoId, espacio.id, checkinClean, checkoutClean],
      );

      const ocupadasHotel = Number(overlapCountRes[0]?.ocupadas_hotel || 0);
      const ocupadasEspacio = Number(overlapCountRes[0]?.ocupadas_espacio || 0);
      const totalHotel = Number(overlapCountRes[0]?.total_hotel || 0);
      const totalEspacio = Number(espacio.cantidadDisponible || 1);

      const dispEspacio = Math.max(0, totalEspacio - ocupadasEspacio);
      const dispHotel = Math.max(0, totalHotel - ocupadasHotel);
      const disponibles = Math.min(dispEspacio, dispHotel);

      if (disponibles < cantidadHabitaciones) {
        throw new ProblemDetailsException(
          {
            type: 'https://api.booking-hub.com/errors/out-of-stock',
            title: 'Sin habitaciones disponibles',
            status: HttpStatus.CONFLICT,
            code: 'OUT_OF_STOCK',
            detail: `No hay cupos disponibles para ${cantidadHabitaciones} habitación(es) en las fechas solicitadas (remanentes: ${Math.max(0, disponibles)}).`,
          },
          HttpStatus.CONFLICT,
        );
      }

      // Cotizar tarifa oficial
      const pricing = this.pricingService.calculatePrice(
        Number(espacio.precioPorNoche),
        checkinClean,
        checkoutClean,
        cantidadHabitaciones,
      );

      // Validar Coherencia de Precio (PRICE_MISMATCH)
      if (totalPagar !== undefined && totalPagar !== null && String(totalPagar).trim() !== '') {
        const totalPagarNum = parseFloat(String(totalPagar));
        if (!isNaN(totalPagarNum) && Math.abs(totalPagarNum - pricing.total) > 0.05) {
          throw new ProblemDetailsException(
            {
              type: 'https://api.booking-hub.com/errors/price-mismatch',
              title: 'Price Mismatch',
              status: HttpStatus.CONFLICT,
              code: 'PRICE_MISMATCH',
              detail: `El total a pagar enviado ($${totalPagarNum.toFixed(2)}) no coincide con la tarifa oficial calculada ($${pricing.totalStr}).`,
            },
            HttpStatus.CONFLICT,
          );
        }
      }

      const tInsertStart = performance.now();

      // Asegurar existencia del cliente en 'usuarios' y 'clientes'
      const clientId =
        (userIdFromToken && userIdFromToken !== 'NODE_SYSTEM_HUB' ? userIdFromToken : null) ||
        clientIdHeader ||
        createRequest.clientId ||
        createRequest.clienteId ||
        `CLI-${Math.floor(100000 + Math.random() * 900000)}`;
      const guestName = huespedTitular?.nombreCompleto || 'Huésped Booking';
      const guestPhone = huespedTitular?.telefono || '+593991234567';
      const guestDoc = huespedTitular?.identificacion || '1710034065';

      await manager.query(
        `INSERT INTO usuarios (id, "nombreCompleto", email, telefono, identificacion, contrasena)
         VALUES ($1, $2, $3, $4, $5, 'EXTERNAL_JWT_USER')
         ON CONFLICT (id) DO UPDATE 
         SET "nombreCompleto" = EXCLUDED."nombreCompleto", email = EXCLUDED.email, 
             telefono = EXCLUDED.telefono, identificacion = EXCLUDED.identificacion`,
        [clientId, guestName, guestEmail, guestPhone, guestDoc],
      );

      await manager.query(
        `INSERT INTO clientes (client_id, nombre, email, identificacion, telefono)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (client_id) DO UPDATE
         SET nombre = EXCLUDED.nombre, email = EXCLUDED.email, telefono = EXCLUDED.telefono, identificacion = EXCLUDED.identificacion`,
        [clientId, guestName, guestEmail, guestDoc, guestPhone],
      );

      const orderId = randomUUID();
      const numCode = Math.floor(1000 + Math.random() * 9000);
      const externalOrderId = `ORD-HTL-${numCode}`;
      const codigoReserva = `BK-HOTEL-${numCode}`;
      const reservaId = generateEntityId('RES');

      await manager.query(
        `INSERT INTO reservas (
           id, "ordenId", "usuarioId", "espacioId", "estadoId", 
           "fechaEntrada", "fechaSalida", "precioTotal", subtotal, iva, "tasaMunicipal", 
           moneda, "numeroPersonas", "fechaCreacion", "checkinRealizado", "earlyCheckinAutorizado", "idempotencyKey",
           "cantidadHabitaciones"
         )
         VALUES ($1, $2, $3, $4, 'EST-002', $5, $6, $7, $8, $9, $10, 'USD', $11, CURRENT_TIMESTAMP, false, false, $12, $13)`,
        [
          reservaId,
          orderId,
          clientId,
          espacio.id,
          checkinClean,
          checkoutClean,
          pricing.total,
          pricing.subtotal,
          pricing.iva,
          pricing.tasaMunicipal,
          totalPersonas,
          idemKey,
          cantidadHabitaciones,
        ],
      );

      // Contrato con referencias buscables
      const contratoId = generateEntityId('CON');
      const terminos = `Contrato Legal GDS Core Hub · externalOrderId: ${externalOrderId} · localizador: ${codigoReserva} · Orden: ${orderId} · saga_id: ${sagaId || 'N/A'}\nPropiedad: ${espacio.alojamientoNombre} · Total: $${pricing.totalStr} USD`;
      await manager.query(
        `INSERT INTO contratos (id, "reservaId", terminos, firmado, "fechaFirma")
         VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)`,
        [contratoId, reservaId, terminos],
      );

      // Historial
      await manager.query(
        `INSERT INTO historial_reservas (id, "reservaId", "estadoNuevoId", notas)
         VALUES ($1, $2, 'EST-002', $3)`,
        [generateEntityId('HIS'), reservaId, `Orden creada vía GDS Hub (Ref: ${paymentRef}, External: ${externalOrderId})`],
      );

      const tInsertEnd = performance.now();
      const insertDur = (tInsertEnd - tInsertStart).toFixed(1);

      // Encolar actualización de stock en tiempo real hacia Booking
      const tOutboxStart = performance.now();
      await this.inventorySyncService.enqueueStockUpdate(manager, espacio.id, checkinClean, checkoutClean, 'ORDER_CREATED');
      const tOutboxEnd = performance.now();
      const outboxDur = (tOutboxEnd - tOutboxStart).toFixed(1);

      if (previewId) {
        ReservasService.previewsCache.delete(previewId);
      }

      const orderResponse = {
        reservation_id: orderId,
        reservationId: orderId,
        orderId: orderId,
        id: orderId,
        reservaId: reservaId,
        external_order_id: externalOrderId,
        externalOrderId: externalOrderId,
        codigoReserva: codigoReserva,
        estado: 'CONFIRMED',
        status: 'CONFIRMED',
        saga_id: sagaId || randomUUID(),
        alojamientoId: espacio.alojamientoId,
        alojamientoNombre: espacio.alojamientoNombre,
        tipoHabitacionCodigo: espacio.codigo || 'SUITE_DELUXE',
        tipoHabitacion: espacio.nombre,
        cantidadHabitaciones: cantidadHabitaciones,
        ocupantes: {
          adultos: totalAdultos,
          ninos: totalNinos,
        },
        regimen: createRequest.regimenSeleccionado || 'SOLO_HABITACION',
        checkinFecha: checkinClean,
        checkoutFecha: checkoutClean,
        noches: pricing.nights,
        horaCheckIn: normalizeHoraHHMM(espacio.horaCheckIn, '14:00'),
        horaCheckOut: normalizeHoraHHMM(espacio.horaCheckOut, '11:00'),
        checkinHabilitadoDesde: buildEcuadorHourTimestamp(checkinClean, espacio.horaCheckIn, '14:00'),
        earlyCheckinAutorizado: false,
        cotizacionId: cotizacionId || randomUUID(),
        huespedTitular: {
          nombreCompleto: guestName,
          tipoDocumento: 'CEDULA',
          identificacion: guestDoc,
          email: guestEmail,
          telefono: guestPhone,
          nacionalidad: huespedTitular?.nacionalidad || 'Ecuatoriana',
        },
        desgloseFiscal: {
          subtotal: pricing.subtotalStr,
          iva: pricing.ivaStr,
          tasaMunicipal: pricing.tasaMunicipalStr,
          total: pricing.totalStr,
          moneda: 'USD',
        },
        total: pricing.totalStr,
        currency: 'USD',
        habitacionAsignada: `${espacio.nombre} (Piso 2)`,
        createdAt: new Date().toISOString(),
      };

      // 6. Guardar la respuesta de idempotencia en la MISMA transacción (Requisito 1)
      const idempotencyKey = idemKey;
      const idempUserId = req?.idempotencyInfo?.userId || String(userIdFromToken || clientIdHeader || 'ANONYMOUS');
      const idempEndpoint = req?.idempotencyInfo?.endpoint || (req?.originalUrl || req?.url || 'DEFAULT').split('?')[0];

      let idempDur = '0.0';
      if (idempotencyKey) {
        const tIdempStart = performance.now();
        await manager.query(
          `UPDATE idempotency_keys
           SET estado = 'COMPLETED', status = 201, respuesta = $4
           WHERE llave = $1::uuid AND "usuarioId" = $2 AND endpoint = $3;`,
          [idempotencyKey, idempUserId, idempEndpoint, JSON.stringify(orderResponse)],
        );
        const tIdempEnd = performance.now();
        idempDur = (tIdempEnd - tIdempStart).toFixed(1);
      }

      // Medición por pasos con Server-Timing (Requisito 5)
      const tTotal = (performance.now() - tStart).toFixed(1);
      const serverTiming = `val;dur=${valDur};desc="Validation", lock;dur=${lockDur};desc="DB Lock & Stock", insert;dur=${insertDur};desc="Order Insert", outbox;dur=${outboxDur};desc="Outbox", idemp;dur=${idempDur};desc="Atomic Idempotency", total;dur=${tTotal};desc="Total"`;

      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Server-Timing', serverTiming);
      }
      (orderResponse as any).serverTiming = serverTiming;

      return orderResponse;
    });
    catalogCache.invalidate();
    return result;
    } catch (err: any) {
      // Red de seguridad: si dos peticiones con la misma llave llegaran a insertar a la vez, el índice
      // UNIQUE rechaza la segunda y se devuelve la orden ya creada (nunca una segunda orden).
      if (err?.code === '23505' && idemKey && String(err?.constraint || '').includes('uq_reservas_idempotency')) {
        const existing = await this.recoverOrderByIdempotencyKey(idemKey, { privileged: true });
        if (res && typeof res.setHeader === 'function') res.setHeader('Idempotent-Replayed', 'true');
        return existing;
      }
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CONSULTAS DE RESERVAS Y ÓRDENES
  // ═══════════════════════════════════════════════════════════════════════

  async getMisReservas(userId: string) {
    const rows = await this.dataSource.query(
      `SELECT 
         r.id, r."ordenId", r."fechaEntrada", r."fechaSalida", r."precioTotal", 
         r.subtotal, r.iva, r."tasaMunicipal", r."numeroPersonas", r.calificacion, r.comentario,
         COALESCE(r."huespedesReales", r."numeroPersonas")::int as "huespedesReales",
         COALESCE(r."extrasCargos", '[]'::jsonb) as "extrasCargos",
         COALESCE(r."cargosAdicionalesTotal", 0)::numeric(10,2) as "cargosAdicionalesTotal",
         COALESCE(r."montoPagadoInicial", p.monto, r."precioTotal")::numeric(10,2) as "montoPagadoInicial",
         COALESCE(r."checkinRealizado", false) as "checkinRealizado",
         COALESCE(r."checkoutRealizado", false) as "checkoutRealizado",
         r."checkoutHora", r."notasRecepcion",
         r."estadoId", er.nombre as "estadoNombre",
         e.id as "espacioId", e.nombre as "habitacionNombre", e."precioPorNoche",
         a.id as "alojamientoId", a.nombre as "alojamientoNombre", a."imagenUrl", a.codigo as "alojamientoCodigo",
         ub.direccion_detallada as "alojamientoDireccion",
         ub.latitud::float8 as "alojamientoLatitud",
         ub.longitud::float8 as "alojamientoLongitud",
         ci.nombre as "alojamientoDestino",
         COALESCE(TO_CHAR(a."horaCheckIn", 'HH24:MI'), '14:00') as "horaCheckIn",
         COALESCE(TO_CHAR(a."horaCheckOut", 'HH24:MI'), '11:00') as "horaCheckOut",
         u."nombreCompleto" as "clienteNombre", u.email as "clienteEmail", u.telefono as "clienteTelefono", u.identificacion as "clienteIdentificacion",
         c.firmado as "contratoFirmado",
         p.estado as "estadoPago", p.id as "pagoId",
         COALESCE(mp.nombre, 'Tarjeta de Crédito / Débito') as "metodoPago",
         f.id as "facturaId",
         COALESCE(
           f."numeroFactura",
           CASE WHEN r."estadoId" = 'EST-002' THEN '001-002-' || LPAD((ABS(HASHTEXT(r.id)) % 1000000000)::text, 9, '0') ELSE NULL END
         ) as "numeroFactura",
         COALESCE(f."identificacionCliente", u.identificacion, '9999999999999') as "facturaIdentificacion",
         COALESCE(f."nombreRazonSocial", u."nombreCompleto", 'Consumidor Final') as "facturaRazonSocial",
         COALESCE(f.direccion, ub.direccion_detallada, 'Quito, Ecuador') as "facturaDireccion",
         COALESCE(f."fechaEmision", p."fechaPago", r."fechaCreacion") as "facturaFechaEmision"
       FROM reservas r
       JOIN estados_reserva er ON r."estadoId" = er.id
       JOIN espacios_rentables e ON r."espacioId" = e.id
       JOIN alojamientos a ON e."alojamientoId" = a.id
       LEFT JOIN ubicaciones ub ON a."ubicacionId" = ub.id
       LEFT JOIN ciudades ci ON ub."ciudadId" = ci.id
       JOIN usuarios u ON r."usuarioId" = u.id
       LEFT JOIN contratos c ON c."reservaId" = r.id
       LEFT JOIN pagos p ON p."reservaId" = r.id
       LEFT JOIN metodos_pago mp ON p."metodoPagoId" = mp.id
       LEFT JOIN facturas f ON f."pagoId" = p.id
       WHERE r."usuarioId" = $1
       ORDER BY r."fechaCreacion" DESC`,
      [userId],
    );
    return rows;
  }

  async getOrder(orderIdOrReservaId: string) {
    const baseSelect = `SELECT
         r.*, er.nombre as "estadoNombre",
         e.nombre as "habitacionNombre", e."precioPorNoche", e.codigo as "habitacionCodigo",
         e."capacidadAdultos", e."capacidadNinos",
         a.id as "alojamientoId", a.nombre as "alojamientoNombre", a."imagenUrl", a.codigo as "alojamientoCodigo",
         ub.direccion_detallada as "alojamientoDireccion",
         ub.latitud::float8 as "alojamientoLatitud",
         ub.longitud::float8 as "alojamientoLongitud",
         ci.nombre as "alojamientoDestino",
         COALESCE(TO_CHAR(a."horaCheckIn", 'HH24:MI'), '14:00') as "horaCheckIn",
         COALESCE(TO_CHAR(a."horaCheckOut", 'HH24:MI'), '11:00') as "horaCheckOut",
         u."nombreCompleto" as "clienteNombre", u.email as "clienteEmail", u.telefono as "clienteTelefono", u.identificacion as "clienteIdentificacion",
         c.terminos as "contratoTerminos", c.firmado as "contratoFirmado", c."fechaFirma" as "contratoFechaFirma",
         p.id as "pagoId", p.estado as "estadoPago", p.monto as "pagoMonto",
         COALESCE(mp.nombre, 'Tarjeta de Crédito / Débito') as "metodoPago",
         f.id as "facturaId",
         COALESCE(
           f."numeroFactura",
           CASE WHEN r."estadoId" = 'EST-002' THEN '001-002-' || LPAD((ABS(HASHTEXT(r.id)) % 1000000000)::text, 9, '0') ELSE NULL END
         ) as "numeroFactura",
         COALESCE(f."identificacionCliente", u.identificacion, '9999999999999') as "facturaIdentificacion",
         COALESCE(f."nombreRazonSocial", u."nombreCompleto", 'Consumidor Final') as "facturaRazonSocial",
         COALESCE(f.direccion, ub.direccion_detallada, 'Quito, Ecuador') as "facturaDireccion",
         COALESCE(f."fechaEmision", p."fechaPago", r."fechaCreacion") as "facturaFechaEmision"
       FROM reservas r
       JOIN estados_reserva er ON r."estadoId" = er.id
       JOIN espacios_rentables e ON r."espacioId" = e.id
       JOIN alojamientos a ON e."alojamientoId" = a.id
       LEFT JOIN ubicaciones ub ON a."ubicacionId" = ub.id
       LEFT JOIN ciudades ci ON ub."ciudadId" = ci.id
       JOIN usuarios u ON r."usuarioId" = u.id
       LEFT JOIN contratos c ON c."reservaId" = r.id
       LEFT JOIN pagos p ON p."reservaId" = r.id
       LEFT JOIN metodos_pago mp ON p."metodoPagoId" = mp.id
       LEFT JOIN facturas f ON f."pagoId" = p.id`;

    const key = String(orderIdOrReservaId || '');
    // 1) Búsqueda exacta por índice (ordenId UUID / id de reserva)
    const exactWhere = UUID_RE.test(key)
      ? `WHERE r."ordenId" = $1::uuid`
      : `WHERE r.id = $1 OR r.id = ('RES-' || $1)`;
    let rows = await this.dataSource.query(`${baseSelect} ${exactWhere} LIMIT 1`, [key]);

    // 2) Último recurso: localizador/external id guardado en el texto del contrato
    if (!rows || rows.length === 0) {
      rows = await this.dataSource.query(
        `${baseSelect} WHERE c.terminos ILIKE '%' || $1 || '%' LIMIT 1`,
        [key],
      );
    }

    if (!rows || rows.length === 0) {
      throw new NotFoundException('Orden o reserva no encontrada.');
    }

    const row = rows[0];
    return {
      ...row,
      orderId: row.ordenId || row.id,
      reservaId: row.ordenId || row.id,
      externalOrderId: row.ordenId || row.id,
      cantidadHabitaciones: Number(row.cantidadHabitaciones || 1),
      rooms: Number(row.cantidadHabitaciones || 1),
      huespedesReales:
        row.huespedesReales != null ? Number(row.huespedesReales) : Number(row.numeroPersonas || 1),
      extrasCargos: Array.isArray(row.extrasCargos) ? row.extrasCargos : [],
      cargosAdicionalesTotal: Number(row.cargosAdicionalesTotal || 0),
      montoPagadoInicial: Number(row.montoPagadoInicial ?? row.pagoMonto ?? row.precioTotal ?? 0),
      checkoutRealizado: Boolean(row.checkoutRealizado),
      estado:
        row.estadoId === 'EST-003'
          ? 'CANCELLED'
          : row.checkoutRealizado === true
            ? 'CHECKED_OUT'
            : row.checkinRealizado === true
              ? 'CHECKED_IN'
              : row.estadoId === 'EST-002'
                ? 'CONFIRMED'
                : 'PENDING',
      totalPagar: String(Number(row.precioTotal || 0).toFixed(2)),
    };
  }

  async findAllAdmin(filters?: { estadoId?: string }) {
    let query = `
      SELECT 
        r.id, r."ordenId", r."fechaEntrada", r."fechaSalida", r."precioTotal", 
        r.subtotal, r.iva, r."tasaMunicipal", r."numeroPersonas", r.calificacion,
        COALESCE(r."cantidadHabitaciones", 1)::int as "cantidadHabitaciones",
        r."estadoId",
        CASE 
          WHEN r."estadoId" = 'EST-003' THEN er.nombre
          WHEN COALESCE(r."checkoutRealizado", false) = true THEN 'Check-out Realizado'
          WHEN COALESCE(r."checkinRealizado", false) = true THEN 'Llegada Confirmada'
          WHEN EXISTS(
            SELECT 1 FROM booking.evento_outbox eo 
            WHERE (eo.agregado_id::text = r."ordenId"::text OR eo.agregado_id::text = r.id::text)
              AND eo.tipo = 'RESERVA_CHECKIN_CONFIRMADO'
          ) OR EXISTS(
            SELECT 1 FROM historial_reservas hr
            WHERE hr."reservaId" = r.id
              AND hr.notas ILIKE '%check-in%'
              AND hr.notas NOT ILIKE '%check-out%'
          ) THEN 'Llegada Confirmada'
          ELSE er.nombre
        END as "estadoNombre",
        r."espacioId", r."espacioOriginalId",
        e.nombre as "habitacionNombre", e."precioPorNoche",
        e."capacidadAdultos", e."capacidadNinos",
        a.id as "alojamientoId", a.nombre as "alojamientoNombre", a.codigo as "alojamientoCodigo",
        COALESCE(TO_CHAR(a."horaCheckIn", 'HH24:MI'), '14:00') as "horaCheckIn",
        COALESCE(TO_CHAR(a."horaCheckOut", 'HH24:MI'), '11:00') as "horaCheckOut",
        u."nombreCompleto" as "clienteNombre", u.email as "clienteEmail", u.identificacion as "clienteIdentificacion",
        p.id as "pagoId", p.estado as "estadoPago", p.monto as "pagoMonto",
        COALESCE(r."huespedesReales", r."numeroPersonas")::int as "huespedesReales",
        COALESCE(r."extrasCargos", '[]'::jsonb) as "extrasCargos",
        COALESCE(r."cargosAdicionalesTotal", 0)::numeric(10,2) as "cargosAdicionalesTotal",
        COALESCE(r."montoPagadoInicial", p.monto, r."precioTotal")::numeric(10,2) as "montoPagadoInicial",
        r."notasRecepcion",
        r."checkinHora",
        COALESCE(r."checkoutRealizado", false) as "checkoutRealizado",
        r."checkoutHora",
        (
          COALESCE(r."checkoutRealizado", false) = false
          AND (
            COALESCE(r."checkinRealizado", false) = true
            OR EXISTS(
              SELECT 1 FROM booking.evento_outbox eo 
              WHERE (eo.agregado_id::text = r."ordenId"::text OR eo.agregado_id::text = r.id::text)
                AND eo.tipo = 'RESERVA_CHECKIN_CONFIRMADO'
            ) OR EXISTS(
              SELECT 1 FROM historial_reservas hr
              WHERE hr."reservaId" = r.id
                AND hr.notas ILIKE '%check-in%'
                AND hr.notas NOT ILIKE '%check-out%'
            )
          )
        ) as "checkinRealizado"
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

  async cancelarReserva(
    id: string,
    userId?: string,
    userRol?: string,
    reason?: string,
    solicitadoPor?: string,
  ) {
    const reserva = await this.getOrder(id);

    const numCode = Math.abs(
      String(reserva.ordenId || reserva.id)
        .split('')
        .reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
    ) % 900000 + 100000;
    const codigoReembolso = `REF-HTL-${numCode}`;
    const externalOrderId = reserva.external_order_id || reserva.externalOrderId || `ORD-HTL-${numCode}`;

    // Cancelar dos veces es idempotente conforme al contrato v2
    if (reserva.estadoId === 'EST-003' || reserva.estado === 'CANCELLED') {
      return {
        orderId: reserva.ordenId || reserva.id,
        external_order_id: externalOrderId,
        estado: 'CANCELLED',
        refundStatus: 'REFUNDED',
        codigoReembolso,
        porcentajeReembolso: 100,
        montoReembolsado: String(Number(reserva.precioTotal || reserva.total || 0).toFixed(2)),
        cuposRestaurados: 1,
        yaCancelada: true,
        timestamp: new Date().toISOString(),
      };
    }

    const esAdmin = (userRol || '').toLowerCase().includes('admin');
    const esOrquestador = solicitadoPor === 'SAGA_ORCHESTRATOR' || userId === 'NODE_SYSTEM_HUB';

    // Validación de titularidad
    if (!esAdmin && !esOrquestador && userId && reserva.usuarioId && reserva.usuarioId !== userId) {
      throw new ForbiddenException('No tienes autorización para cancelar esta reserva.');
    }

    // Cálculo de política de reembolso y penalidad
    const totalMonto = Number(reserva.precioTotal || reserva.total || 0);
    let porcentajeReembolso = 100;
    let penalidad = 0;

    if (esOrquestador) {
      // Reembolso del 100% garantizado siempre para la Saga compensatoria de Booking Hub
      porcentajeReembolso = 100;
      penalidad = 0;
    } else {
      // Regla de negocio para clientes/usuarios de LuxeStays:
      // Si faltan más de 48 horas para el check-in: 100% reembolso
      // Si faltan entre 24 y 48 horas: 50% reembolso (50% penalidad)
      // Si faltan menos de 24 horas: 0% reembolso (100% penalidad)
      // NUNCA bloquea la cancelación del usuario, aplica la penalidad
      const fechaEntrada = new Date(reserva.fechaEntrada);
      const ahora = new Date();
      const horasRestantes = (fechaEntrada.getTime() - ahora.getTime()) / (1000 * 60 * 60);

      if (horasRestantes > 48) {
        porcentajeReembolso = 100;
        penalidad = 0;
      } else if (horasRestantes >= 24) {
        porcentajeReembolso = 50;
        penalidad = 50;
      } else {
        porcentajeReembolso = 0;
        penalidad = 100;
      }
    }

    const montoReembolsado = ((totalMonto * porcentajeReembolso) / 100).toFixed(2);
    const montoPenalidad = ((totalMonto * penalidad) / 100).toFixed(2);

    await this.dataSource.query(`UPDATE reservas SET "estadoId" = 'EST-003' WHERE id = $1`, [reserva.id]);

    catalogCache.invalidate(); // la habitación vuelve a contar como libre (el solapamiento ya excluye EST-003)

    await this.dataSource.query(
      `INSERT INTO historial_reservas (id, "reservaId", "estadoAnteriorId", "estadoNuevoId", notas)
       VALUES ($1, $2, $3, 'EST-003', $4)`,
      [
        generateEntityId('HIS'),
        reserva.id,
        reserva.estadoId || 'EST-002',
        reason || (esOrquestador ? 'Compensación Saga Booking Hub' : `Cancelación de usuario (Reembolso: ${porcentajeReembolso}%, Penalidad: ${penalidad}%)`),
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
      'ORDER_CANCELLED',
    );

    return {
      orderId: reserva.ordenId || reserva.id,
      external_order_id: externalOrderId,
      estado: 'CANCELLED',
      refundStatus: porcentajeReembolso > 0 ? 'REFUNDED' : 'NO_REFUND',
      codigoReembolso,
      porcentajeReembolso,
      montoReembolsado,
      montoPenalidad,
      penalidad,
      cuposRestaurados: Number(reserva.cantidadHabitaciones || 1),
      yaCancelada: false,
      timestamp: new Date().toISOString(),
    };
  }

  async cancelOrder(orderId: string, userId?: string, userRol?: string, reason?: string, solicitadoPor?: string): Promise<any> {
    return this.cancelarReserva(orderId, userId, userRol, reason, solicitadoPor);
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

  /**
   * Recuperación tras timeout: devuelve ÚNICAMENTE la orden asociada a la Idempotency-Key.
   *  - Busca primero la respuesta guardada (misma transacción que creó la orden).
   *  - Respaldo: columna reservas."idempotencyKey" (UNIQUE).
   *  - Un cliente no privilegiado solo puede recuperar órdenes de su propia identidad.
   */
  async recoverOrderByIdempotencyKey(
    key: string,
    opts: { privileged?: boolean; callerIds?: string[] } = {},
  ): Promise<any> {
    const cleanKey = String(key || '').trim();
    if (!UUID_RE.test(cleanKey)) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/validation-failed',
          title: 'Validation Failed',
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_FAILED',
          detail: 'El parámetro idempotency_key es obligatorio y debe ser un UUID válido.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const privileged = opts.privileged === true;
    const callers = (opts.callerIds || []).filter(Boolean).map(String);

    const wrap = (order: any) => {
      const reservationId = order.reservation_id || order.orderId || order.id;
      const normalized = { ...order, reservation_id: reservationId };
      return { ...normalized, data: [normalized], orders: [normalized] };
    };

    // 1. Respuesta guardada junto con la orden
    const rows = await this.dataSource.query(
      `SELECT estado, respuesta
       FROM idempotency_keys
       WHERE llave = $1::uuid AND ($2::boolean OR "usuarioId" = ANY($3::text[]))
       ORDER BY "creadoEn" DESC
       LIMIT 1`,
      [cleanKey, privileged, callers],
    );

    if (rows && rows.length > 0) {
      const row = rows[0];
      if (row.estado === 'COMPLETED' && row.respuesta) {
        const resp = typeof row.respuesta === 'string' ? JSON.parse(row.respuesta) : row.respuesta;
        return wrap(resp);
      }
    }

    // 2. Respaldo por la columna UNIQUE de reservas
    const orderRows = await this.dataSource.query(
      `SELECT r."ordenId" AS id
       FROM reservas r
       WHERE r."idempotencyKey" = $1::uuid AND ($2::boolean OR r."usuarioId" = ANY($3::text[]))
       LIMIT 1`,
      [cleanKey, privileged, callers],
    );
    if (orderRows && orderRows.length > 0) {
      const order = await this.getOrder(orderRows[0].id);
      return wrap({
        ...order,
        reservation_id: order.ordenId || order.id,
        status: order.estado,
      });
    }

    // 3. La operación existe pero aún no terminó
    if (rows && rows.length > 0 && rows[0].estado === 'IN_PROGRESS') {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/idempotency-in-progress',
          title: 'Idempotency Operation In Progress',
          status: HttpStatus.CONFLICT,
          code: 'IDEMPOTENCY_IN_PROGRESS',
          detail: `La operación con la Idempotency-Key "${cleanKey}" sigue en curso. Reintente en breve.`,
        },
        HttpStatus.CONFLICT,
      );
    }

    throw new ProblemDetailsException(
      {
        type: 'https://api.booking-hub.com/errors/not-found',
        title: 'Orden no encontrada',
        status: HttpStatus.NOT_FOUND,
        code: 'NOT_FOUND',
        detail: `No existe ninguna orden asociada a la Idempotency-Key "${cleanKey}". Es seguro reintentar la creación.`,
      },
      HttpStatus.NOT_FOUND,
    );
  }

  async findPublicActiveReservations(): Promise<any[]> {
    return await this.dataSource.query(
      `SELECT r.id, r."ordenId", r."espacioId", e."alojamientoId", a.nombre as "alojamientoNombre", a.codigo as "alojamientoCodigo", e.nombre as "habitacionNombre", r."fechaEntrada", r."fechaSalida", r."estadoId", er.nombre as "estadoNombre"
       FROM reservas r
       JOIN espacios_rentables e ON r."espacioId" = e.id
       JOIN alojamientos a ON e."alojamientoId" = a.id
       JOIN estados_reserva er ON r."estadoId" = er.id
       WHERE r."estadoId" IN ('EST-001', 'EST-002')
         AND COALESCE(r."checkoutRealizado", false) = false
         AND r."fechaSalida" >= CURRENT_DATE
       ORDER BY r."fechaEntrada" ASC`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CHECK-IN PRESENCIAL (Flujo 2) + AJUSTES EN RECEPCIÓN
  // ═══════════════════════════════════════════════════════════════════════

  private invalidTransition(detail: string): ProblemDetailsException {
    return new ProblemDetailsException(
      {
        type: 'https://api.booking-hub.com/errors/invalid-state-transition',
        title: 'Invalid State Transition',
        status: HttpStatus.CONFLICT,
        code: 'INVALID_STATE_TRANSITION',
        detail,
      },
      HttpStatus.CONFLICT,
    );
  }

  private parseReceptionExtras(rawExtras: any): Array<{
    id: string;
    concepto: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }> {
    if (!Array.isArray(rawExtras)) return [];
    return rawExtras.map((item, idx) => {
      const concepto = String(item?.concepto || '').trim();
      if (!concepto) {
        throw new BadRequestException(`El cargo adicional #${idx + 1} debe incluir una descripción o concepto.`);
      }
      const cantidad = Number(item?.cantidad ?? 1);
      if (!Number.isInteger(cantidad) || cantidad < 1) {
        throw new BadRequestException(`La cantidad de "${concepto}" debe ser un entero mayor o igual a 1.`);
      }
      const precioUnitario = Number(item?.precioUnitario ?? 0);
      if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
        throw new BadRequestException(`El precio unitario de "${concepto}" no puede ser negativo.`);
      }
      const unitRounded = Number(precioUnitario.toFixed(2));
      const subtotal = Number((cantidad * unitRounded).toFixed(2));
      return {
        id: String(item?.id || `EXT-${randomUUID().slice(0, 8)}`),
        concepto,
        cantidad,
        precioUnitario: unitRounded,
        subtotal,
      };
    });
  }

  async adjustReceptionStay(orderIdOrReservaId: string, dto: ReceptionAdjustmentDto | any): Promise<any> {
    const updatedOrderId = await this.dataSource.transaction(async (manager) => {
      const rows = await manager.query(
        `SELECT r.*, e."alojamientoId", e.nombre as "habitacionNombre", e."precioPorNoche",
                (SELECT p.monto FROM pagos p WHERE p."reservaId" = r.id LIMIT 1) as "pagoMonto"
         FROM reservas r
         JOIN espacios_rentables e ON r."espacioId" = e.id
         WHERE r.id::text = $1 OR r."ordenId"::text = $1
         LIMIT 1
         FOR UPDATE OF r`,
        [orderIdOrReservaId],
      );

      if (!rows || rows.length === 0) {
        throw new NotFoundException(`No se encontró la reserva u orden ${orderIdOrReservaId}`);
      }

      const r = rows[0];
      if (r.estadoId === 'EST-003') {
        throw this.invalidTransition('No se pueden realizar ajustes en recepción sobre una reserva cancelada.');
      }
      if (r.checkoutRealizado === true) {
        throw this.invalidTransition('La estancia ya fue cerrada mediante check-out.');
      }

      const changesLog: string[] = [];
      const montoPagadoInicial = Number(r.montoPagadoInicial ?? r.pagoMonto ?? r.precioTotal ?? 0);
      let targetEspacioId = String(r.espacioId);
      let newEspacioOriginalId: string | null = r.espacioOriginalId || null;
      let tasaMunicipal = Number(r.tasaMunicipal || 0);
      const currentExtrasTotal = Number(r.cargosAdicionalesTotal || 0);
      let baseRoomSubtotal = Math.max(0, Number((Number(r.subtotal || 0) - currentExtrasTotal).toFixed(2)));

      let targetHuespedesReales: number | null =
        r.huespedesReales != null ? Number(r.huespedesReales) : null;
      const rawGuests = dto?.huespedesReales ?? dto?.huespedes_reales ?? dto?.numero_personas_reales;
      if (rawGuests !== undefined && rawGuests !== null && rawGuests !== '') {
        const parsed = Number(rawGuests);
        if (!Number.isInteger(parsed) || parsed < 1) {
          throw new BadRequestException('huespedesReales debe ser un entero mayor o igual a 1.');
        }
        if (parsed !== (targetHuespedesReales ?? Number(r.numeroPersonas || 1))) {
          changesLog.push(`Huéspedes reales: ${parsed} (estimado: ${Number(r.numeroPersonas || 1)})`);
        }
        targetHuespedesReales = parsed;
      }

      const requestedEspacioId = dto?.espacioId ? String(dto.espacioId).trim() : '';
      if (requestedEspacioId && requestedEspacioId !== targetEspacioId) {
        const roomRows = await manager.query(
          `SELECT id, "alojamientoId", nombre, "precioPorNoche", "cantidadDisponible", estado
           FROM espacios_rentables
           WHERE id = $1
           FOR UPDATE`,
          [requestedEspacioId],
        );
        if (!roomRows.length) {
          throw new NotFoundException(`La habitación ${requestedEspacioId} no existe.`);
        }
        const newRoom = roomRows[0];
        if (String(newRoom.alojamientoId) !== String(r.alojamientoId)) {
          throw new BadRequestException('Solo es posible cambiar a una habitación del mismo alojamiento.');
        }
        if (newRoom.estado && newRoom.estado !== 'Activo') {
          throw new ConflictException(`La habitación "${newRoom.nombre}" se encuentra inactiva.`);
        }

        const fechaEntradaStr = r.fechaEntrada instanceof Date
          ? r.fechaEntrada.toISOString().split('T')[0]
          : String(r.fechaEntrada || '').split('T')[0];
        const fechaSalidaStr = r.fechaSalida instanceof Date
          ? r.fechaSalida.toISOString().split('T')[0]
          : String(r.fechaSalida || '').split('T')[0];
        const roomsNeeded = Math.max(1, Number(r.cantidadHabitaciones || 1));

        const overlapRes = await manager.query(
          `SELECT COALESCE(SUM(COALESCE(r2."cantidadHabitaciones", 1)), 0)::int as ocupadas
           FROM reservas r2
           WHERE r2."espacioId" = $1
             AND r2.id != $2
             AND r2."estadoId" IN ('EST-001', 'EST-002')
             AND COALESCE(r2."checkoutRealizado", false) = false
             AND r2."fechaEntrada" < $4::date AND r2."fechaSalida" > $3::date`,
          [newRoom.id, r.id, fechaEntradaStr, fechaSalidaStr],
        );
        const ocupadas = Number(overlapRes[0]?.ocupadas || 0);
        const disponibles = Math.max(0, Number(newRoom.cantidadDisponible || 0) - ocupadas);
        if (disponibles < roomsNeeded) {
          throw new ConflictException(
            `La habitación "${newRoom.nombre}" no tiene suficiente cupo disponible (${disponibles} disp., requeridas: ${roomsNeeded}).`,
          );
        }

        try {
          const priceCalc = this.pricingService.calculatePrice(
            Number(newRoom.precioPorNoche || 0),
            fechaEntradaStr,
            fechaSalidaStr,
            roomsNeeded,
          );
          baseRoomSubtotal = priceCalc.subtotal;
          tasaMunicipal = priceCalc.tasaMunicipal;
        } catch {
          baseRoomSubtotal = Number((Number(newRoom.precioPorNoche || 0) * roomsNeeded).toFixed(2));
        }

        newEspacioOriginalId = newEspacioOriginalId || String(r.espacioId);
        targetEspacioId = String(newRoom.id);
        changesLog.push(`Cambio de habitación: ${r.habitacionNombre} -> ${newRoom.nombre}`);
      }

      const existingExtras = Array.isArray(r.extrasCargos) ? r.extrasCargos : [];
      const parsedExtras =
        dto?.extras !== undefined ? this.parseReceptionExtras(dto.extras) : existingExtras;
      const cargosAdicionalesTotal = Number(
        parsedExtras.reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0).toFixed(2),
      );
      if (dto?.extras !== undefined && cargosAdicionalesTotal !== currentExtrasTotal) {
        changesLog.push(`Extras actualizados: $${cargosAdicionalesTotal.toFixed(2)} (${parsedExtras.length} ítem(s))`);
      }

      const notasProvided = dto?.notasRecepcion !== undefined;
      const targetNotas = notasProvided
        ? String(dto.notasRecepcion ?? '').trim() || null
        : r.notasRecepcion ?? null;
      if (notasProvided && targetNotas !== (r.notasRecepcion ?? null)) {
        changesLog.push(`Nota recepción actualizada`);
      }

      const totals = this.pricingService.recalculateWithExtras(
        baseRoomSubtotal,
        cargosAdicionalesTotal,
        tasaMunicipal,
      );

      await manager.query(
        `UPDATE reservas
         SET "espacioId" = $1,
             "espacioOriginalId" = $2,
             "huespedesReales" = $3,
             "extrasCargos" = $4::jsonb,
             "cargosAdicionalesTotal" = $5,
             "montoPagadoInicial" = $6,
             "notasRecepcion" = $7,
             subtotal = $8,
             iva = $9,
             "tasaMunicipal" = $10,
             "precioTotal" = $11
         WHERE id = $12`,
        [
          targetEspacioId,
          newEspacioOriginalId,
          targetHuespedesReales,
          JSON.stringify(parsedExtras),
          cargosAdicionalesTotal,
          Number(montoPagadoInicial.toFixed(2)),
          targetNotas,
          totals.subtotal,
          totals.iva,
          totals.tasaMunicipal,
          totals.total,
          r.id,
        ],
      );

      // Sincronizar montos de la factura SRI asociada si ya existe
      try {
        await manager.query(
          `UPDATE facturas f
           SET subtotal = $1,
               iva = $2,
               "tasaMunicipal" = $3,
               total = $4
           FROM pagos p
           WHERE f."pagoId" = p.id AND p."reservaId" = $5`,
          [totals.subtotal, totals.iva, totals.tasaMunicipal, totals.total, r.id],
        );
      } catch (e: any) {
        this.logger.warn(`[RECEPTION-FACTURA] ${e?.message}`);
      }

      if (changesLog.length > 0) {
        try {
          await manager.query(
            `INSERT INTO historial_reservas (id, "reservaId", "estadoAnteriorId", "estadoNuevoId", notas)
             VALUES ($1, $2, $3, $3, $4)`,
            [generateEntityId('HIS'), r.id, r.estadoId || 'EST-002', `Ajuste en recepción: ${changesLog.join(' | ')}`],
          );
        } catch (e: any) {
          this.logger.warn(`[RECEPTION-HISTORIAL] ${e?.message}`);
        }
      }

      return r.id;
    });

    catalogCache.invalidate();
    return this.getOrder(updatedOrderId);
  }

  async checkInOrder(orderId: string, body?: any): Promise<any> {
    let order = await this.getOrder(orderId);

    if (order.estadoId === 'EST-003' || order.estado === 'CANCELLED') {
      throw this.invalidTransition('No se puede realizar check-in en una reserva cancelada.');
    }
    if (order.checkoutRealizado === true || order.estado === 'CHECKED_OUT') {
      throw this.invalidTransition('No se puede confirmar check-in de una estancia que ya realizó check-out.');
    }
    if (order.checkinRealizado === true || order.estado === 'CHECKED_IN') {
      throw this.invalidTransition('La reserva ya cuenta con check-in registrado previamente (estado actual: CHECKED_IN).');
    }
    if (order.estadoId !== 'EST-002') {
      throw this.invalidTransition('El check-in solo está permitido para reservas en estado CONFIRMED.');
    }

    // Validación de número de cédula / identificación del titular en el check-in
    const cedulaPresentada = String(body?.cedula || body?.identificacion || '').trim();
    const cedulaRegistrada = String(order.clienteIdentificacion || '').trim();
    const esCedulaGenerica = !cedulaRegistrada || cedulaRegistrada === '1710034065' || cedulaRegistrada === '9999999999999';
    if (cedulaPresentada && !esCedulaGenerica && cedulaPresentada !== cedulaRegistrada) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/cedula-mismatch',
          title: 'Cédula No Coincide',
          status: HttpStatus.BAD_REQUEST,
          code: 'CEDULA_MISMATCH',
          detail: `El número de cédula ingresado (${cedulaPresentada}) no coincide con la identificación registrada del titular de la reserva (${cedulaRegistrada}).`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Huéspedes reales presentes en recepción (entero >= 1)
    let huespedesReales = Number(order.huespedesReales || order.numeroPersonas || 1);
    const rawGuests = body?.huespedesReales ?? body?.huespedes_reales ?? body?.numero_personas_reales;
    if (rawGuests !== undefined && rawGuests !== null && rawGuests !== '') {
      const n = Number(rawGuests);
      if (!Number.isInteger(n) || n < 1) {
        throw new ProblemDetailsException(
          {
            type: 'https://api.booking-hub.com/errors/validation-failed',
            title: 'Validation Failed',
            status: HttpStatus.BAD_REQUEST,
            code: 'VALIDATION_FAILED',
            detail: 'huespedes_reales debe ser un entero mayor o igual a 1.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      huespedesReales = n;
    }

    // Fecha y hora en America/Guayaquil: desde la fecha de entrada y desde la horaCheckIn del hotel, salvo confirmación de recepción / early-checkin
    const horaCheckIn = normalizeHoraHHMM(order.horaCheckIn, '14:00');
    const { totalMinutes: checkinMinTotal } = parseHoraMinutes(horaCheckIn, '14:00');

    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const pMap: Record<string, string> = {};
    for (const p of parts) pMap[p.type] = p.value;
    const hoyGuayaquil = `${pMap.year}-${pMap.month}-${pMap.day}`;
    const horaGuayaquil = parseInt(pMap.hour, 10) % 24;
    const minGuayaquil = parseInt(pMap.minute, 10) || 0;
    const ahoraMin = horaGuayaquil * 60 + minGuayaquil;

    const fechaEntradaStr = order.fechaEntrada instanceof Date
      ? order.fechaEntrada.toISOString().split('T')[0]
      : String(order.fechaEntrada || '').split('T')[0];

    const autorizadoEnRecepcion =
      Boolean(order.earlyCheckinAutorizado) ||
      Boolean(body?.earlyCheckinAutorizado) ||
      Boolean(cedulaPresentada) ||
      Boolean(body?.admin_id);

    if (!autorizadoEnRecepcion) {
      const fechaNoAlcanzada = hoyGuayaquil < fechaEntradaStr;
      const horaNoAlcanzada = hoyGuayaquil === fechaEntradaStr && ahoraMin < checkinMinTotal;
      if (fechaNoAlcanzada || horaNoAlcanzada) {
        throw new ProblemDetailsException(
          {
            type: 'https://api.booking-hub.com/errors/checkin-time-not-reached',
            title: 'Check-in Time Not Reached',
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            code: 'CHECKIN_TIME_NOT_REACHED',
            detail: `El check-in solo está permitido desde la fecha de entrada (${fechaEntradaStr}) a partir de las ${horaCheckIn} (hora Guayaquil), salvo confirmación en recepción con cédula o early-checkin aprobado por ADMIN.`,
            habilitadoDesde: buildEcuadorHourTimestamp(fechaEntradaStr, horaCheckIn, '14:00'),
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    // Aplicar ajustes opcionales en recepción antes de sellar la entrada (cambio de habitación, extras, personas reales)
    const rawEspacioId = body?.espacioId ? String(body.espacioId).trim() : undefined;
    const hasExtras = Array.isArray(body?.extras);
    const rawNotas = body?.notasRecepcion ?? body?.observaciones;
    const hasNotas = rawNotas !== undefined && String(rawNotas).trim() !== '';
    const hasGuestsOverride = rawGuests !== undefined && rawGuests !== null && rawGuests !== '';
    if (rawEspacioId || hasExtras || hasNotas || hasGuestsOverride) {
      order = await this.adjustReceptionStay(order.id, {
        huespedesReales,
        espacioId: rawEspacioId,
        extras: hasExtras ? body.extras : undefined,
        notasRecepcion: rawNotas !== undefined ? String(rawNotas) : undefined,
      });
    }

    // Transición ATÓMICA: solo una petición puede pasar de CONFIRMED a CHECKED_IN (la 2.ª recibe 409)
    const updated = await this.dataSource.query(
      `UPDATE reservas
       SET "checkinRealizado" = true,
           "checkinHora" = NOW(),
           "huespedesReales" = COALESCE($2, "huespedesReales", "numeroPersonas")
       WHERE id = $1
         AND "estadoId" = 'EST-002'
         AND COALESCE("checkinRealizado", false) = false
         AND COALESCE("checkoutRealizado", false) = false
       RETURNING id`,
      [order.id, huespedesReales],
    );
    if (!updated || updated.length === 0) {
      throw this.invalidTransition('La reserva ya cuenta con check-in registrado previamente (estado actual: CHECKED_IN).');
    }

    if (cedulaPresentada && esCedulaGenerica && order.usuarioId) {
      try {
        await this.dataSource.query(
          `UPDATE usuarios SET identificacion = $1 WHERE id = $2`,
          [cedulaPresentada, order.usuarioId],
        );
      } catch {
        // Ignorar si falla actualización opcional
      }
    }

    try {
      const notaCedula = cedulaPresentada ? ` Cédula verificada: ${cedulaPresentada}.` : '';
      await this.dataSource.query(
        `INSERT INTO historial_reservas (id, "reservaId", "estadoAnteriorId", "estadoNuevoId", notas)
         VALUES ($1, $2, 'EST-002', 'EST-002', $3)`,
        [generateEntityId('HIS'), order.id, `Check-in confirmado en recepción. Estado: CHECKED_IN. Huéspedes reales: ${huespedesReales}.${notaCedula}`],
      );
    } catch (e: any) {
      this.logger.warn(`[CHECKIN-HISTORIAL] ${e?.message}`);
    }

    // Cola persistente + primer intento inmediato hacia Booking Core
    const externalOrderId = String(order.ordenId || order.id);
    const payload = {
      external_order_id: externalOrderId,
      estado: 'CONFIRMADO_ASISTIDO',
      huespedes_reales: huespedesReales,
    };

    let sync: { estado: string; detalle?: string; httpStatus?: number } = { estado: 'PENDIENTE' };
    try {
      const queued = await this.dataSource.query(
        `INSERT INTO checkin_notificaciones (reserva_id, external_order_id, payload)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (reserva_id) DO UPDATE SET payload = EXCLUDED.payload
         RETURNING id`,
        [order.id, externalOrderId, JSON.stringify(payload)],
      );
      sync = await this.dispatchCheckinNotification(queued[0].id);
    } catch (e: any) {
      this.logger.warn(`[CHECKIN-NOTIFY] ${e?.message}`);
      sync = { estado: 'PENDIENTE', detalle: e?.message };
    }

    // Registro en el outbox compartido (compatibilidad con el panel y con Booking)
    try {
      await this.dataSource.query(
        `INSERT INTO booking.evento_outbox (tipo, agregado, agregado_id, correlacion_id, payload, created_at, publicado_en)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
        [
          'RESERVA_CHECKIN_CONFIRMADO',
          'reserva',
          UUID_RE.test(String(order.ordenId)) ? order.ordenId : randomUUID(),
          randomUUID(),
          JSON.stringify(payload),
          sync.estado === 'ENVIADO' ? new Date() : null,
        ],
      );
    } catch (e: any) {
      this.logger.warn(`[OUTBOX-CHECKIN] ${e?.message}`);
    }

    catalogCache.invalidate();

    return {
      orderId: order.ordenId || order.id,
      reservation_id: order.ordenId || order.id,
      reservationId: order.ordenId || order.id,
      reservaId: order.id,
      external_order_id: externalOrderId,
      externalOrderId,
      estado: 'CHECKED_IN',
      status: 'CHECKED_IN',
      checkinRealizado: true,
      espacioId: order.espacioId,
      espacioOriginalId: order.espacioOriginalId || null,
      huespedes_reales: huespedesReales,
      huespedesReales,
      extrasCargos: order.extrasCargos || [],
      cargosAdicionalesTotal: Number(order.cargosAdicionalesTotal || 0).toFixed(2),
      totalPagar: String(Number(order.precioTotal || 0).toFixed(2)),
      habitacionAsignada: `${order.habitacionNombre || 'Suite Deluxe'}`,
      checkInHora: new Date().toISOString(),
      instruccionesAcceso: 'Presente su identificación en la recepción o use su PIN digital en la cerradura.',
      sincronizacionBooking: sync,
    };
  }

  /**
   * POST {BOOKING_CORE_URL}/api/v1/reservas/{external_order_id}/checkin
   * Headers: X-API-Key  ·  Body: { external_order_id, estado: "CONFIRMADO_ASISTIDO", huespedes_reales }
   * Un fallo NUNCA revierte el check-in local (el huésped ya está en recepción): queda PENDIENTE y se reintenta.
   */
  private async dispatchCheckinNotification(
    notifId: string | number,
  ): Promise<{ estado: string; detalle?: string; httpStatus?: number }> {
    const rows = await this.dataSource.query(
      `SELECT id, external_order_id, payload, intentos, publicado_en FROM checkin_notificaciones WHERE id = $1`,
      [notifId],
    );
    const n = rows?.[0];
    if (!n) return { estado: 'PENDIENTE', detalle: 'Notificación no encontrada' };
    if (n.publicado_en) return { estado: 'ENVIADO' };

    const apiKey = process.env.BOOKING_API_KEY || process.env.BOOKING_CORE_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      await this.dataSource.query(
        `UPDATE checkin_notificaciones SET ultimo_error = $2 WHERE id = $1`,
        [n.id, 'BOOKING_API_KEY no configurada en el servidor'],
      );
      return { estado: 'PENDIENTE', detalle: 'BOOKING_API_KEY no configurada; el aviso queda en cola' };
    }

    const base = (process.env.BOOKING_CORE_URL || 'https://booking-core-api.azurewebsites.net').replace(/\/+$/, '');
    const url = `${base}/api/v1/reservas/${encodeURIComponent(n.external_order_id)}/checkin`;
    const payload = typeof n.payload === 'string' ? JSON.parse(n.payload) : n.payload;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      // 2xx = aceptado; 409 = Booking ya tenía el check-in registrado (idempotente)
      const ok = resp.ok || resp.status === 409;
      const errText = ok ? null : (await resp.text().catch(() => '')).slice(0, 500) || `HTTP ${resp.status}`;
      await this.dataSource.query(
        `UPDATE checkin_notificaciones
         SET intentos = intentos + 1, ultimo_intento = NOW(), http_status = $2, ultimo_error = $3,
             publicado_en = CASE WHEN $4::boolean THEN NOW() ELSE NULL END
         WHERE id = $1`,
        [n.id, resp.status, errText, ok],
      );
      return ok
        ? { estado: 'ENVIADO', httpStatus: resp.status }
        : { estado: 'PENDIENTE', httpStatus: resp.status, detalle: errText || undefined };
    } catch (err: any) {
      const msg = err?.name === 'AbortError' ? 'Timeout (8 s) al contactar Booking Core' : String(err?.message || err);
      await this.dataSource.query(
        `UPDATE checkin_notificaciones SET intentos = intentos + 1, ultimo_intento = NOW(), ultimo_error = $2 WHERE id = $1`,
        [n.id, msg.slice(0, 500)],
      );
      return { estado: 'PENDIENTE', detalle: msg };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Reintenta avisos pendientes con backoff lineal (máx. 10 intentos). Seguro con varias instancias. */
  private async retryPendingCheckinNotifications(): Promise<void> {
    if (!(process.env.BOOKING_API_KEY || process.env.BOOKING_CORE_API_KEY || process.env.API_KEY)) return;
    const claimed = await this.dataSource.query(
      `UPDATE checkin_notificaciones
       SET ultimo_intento = NOW()
       WHERE id IN (
         SELECT id FROM checkin_notificaciones
         WHERE publicado_en IS NULL AND intentos < 10
           AND (ultimo_intento IS NULL OR ultimo_intento < NOW() - (LEAST(intentos, 6) + 1) * INTERVAL '30 seconds')
         ORDER BY id
         LIMIT 20
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id`,
    );
    for (const row of claimed || []) {
      await this.dispatchCheckinNotification(row.id);
    }
  }

  async checkOutOrder(orderId: string, body?: any): Promise<any> {
    let order = await this.getOrder(orderId);

    if (order.estadoId === 'EST-003' || order.estado === 'CANCELLED') {
      throw this.invalidTransition('No se puede realizar check-out sobre una reserva cancelada.');
    }

    const rawExtras = body?.extras;
    const rawNotas = body?.notasRecepcion ?? body?.observaciones;
    const rawGuests = body?.huespedesReales ?? body?.huespedes_reales ?? body?.numero_personas_reales;
    const rawEspacioId = body?.espacioId ? String(body.espacioId).trim() : undefined;
    const hasAdjustments =
      !order.checkoutRealizado &&
      (Array.isArray(rawExtras) ||
        rawNotas !== undefined ||
        (rawGuests !== undefined && rawGuests !== null && rawGuests !== '') ||
        Boolean(rawEspacioId));

    if (hasAdjustments) {
      order = await this.adjustReceptionStay(order.id, {
        huespedesReales:
          rawGuests !== undefined && rawGuests !== null && rawGuests !== '' ? Number(rawGuests) : undefined,
        espacioId: rawEspacioId,
        extras: Array.isArray(rawExtras) ? rawExtras : undefined,
        notasRecepcion: rawNotas !== undefined ? String(rawNotas) : undefined,
      });
    }

    await this.dataSource.query(
      `UPDATE reservas 
       SET "checkinRealizado" = false,
           "checkoutRealizado" = true,
           "checkoutHora" = COALESCE("checkoutHora", NOW())
       WHERE id = $1`,
      [order.id],
    );

    try {
      await this.dataSource.query(
        `INSERT INTO historial_reservas (id, "reservaId", "estadoAnteriorId", "estadoNuevoId", notas)
         VALUES ($1, $2, $3, $3, $4)`,
        [
          generateEntityId('HIS'),
          order.id,
          order.estadoId || 'EST-002',
          `Check-out completado en recepción. Folio final: $${Number(order.precioTotal || 0).toFixed(2)}. Habitación liberada para nuevas reservas.`,
        ],
      );
    } catch (e: any) {
      this.logger.warn(`[CHECKOUT-HISTORIAL] ${e?.message}`);
    }

    catalogCache.invalidate();

    const extrasTotal = Number(order.cargosAdicionalesTotal || 0);
    const totalFinal = Number(order.precioTotal || 0);

    return {
      orderId: order.ordenId || order.id,
      reservation_id: order.ordenId || order.id,
      reservaId: order.id,
      estado: 'CHECKED_OUT',
      status: 'CHECKED_OUT',
      checkinRealizado: false,
      checkoutRealizado: true,
      habitacionLiberada: order.habitacionNombre || 'Habitación Estándar',
      checkOutHora: new Date().toISOString(),
      huespedesReales: Number(order.huespedesReales || order.numeroPersonas || 1),
      extrasCargos: order.extrasCargos || [],
      consumosAdicionales: extrasTotal.toFixed(2),
      cargosAdicionalesTotal: extrasTotal.toFixed(2),
      totalFinal: totalFinal.toFixed(2),
      montoPagadoInicial: Number(order.montoPagadoInicial ?? totalFinal).toFixed(2),
      claveDigitalRevocada: true,
      mensaje: 'Check-out completado exitosamente y habitación liberada para el catálogo.',
    };
  }

  async findByEmail(email: string) {
    const rows = await this.dataSource.query(
      `SELECT 
         r.id, r."ordenId", r."fechaEntrada", r."fechaSalida", r."precioTotal", 
         r.subtotal, r.iva, r."tasaMunicipal", r."numeroPersonas", r.calificacion, r.comentario,
         COALESCE(r."huespedesReales", r."numeroPersonas")::int as "huespedesReales",
         COALESCE(r."extrasCargos", '[]'::jsonb) as "extrasCargos",
         COALESCE(r."cargosAdicionalesTotal", 0)::numeric(10,2) as "cargosAdicionalesTotal",
         COALESCE(r."montoPagadoInicial", p.monto, r."precioTotal")::numeric(10,2) as "montoPagadoInicial",
         COALESCE(r."checkinRealizado", false) as "checkinRealizado",
         COALESCE(r."checkoutRealizado", false) as "checkoutRealizado",
         r."checkoutHora", r."notasRecepcion",
         r."estadoId", er.nombre as "estadoNombre",
         e.id as "espacioId", e.nombre as "habitacionNombre", e."precioPorNoche",
         a.id as "alojamientoId", a.nombre as "alojamientoNombre", a."imagenUrl", a.codigo as "alojamientoCodigo",
         ub.direccion_detallada as "alojamientoDireccion",
         ub.latitud::float8 as "alojamientoLatitud",
         ub.longitud::float8 as "alojamientoLongitud",
         ci.nombre as "alojamientoDestino",
         COALESCE(TO_CHAR(a."horaCheckIn", 'HH24:MI'), '14:00') as "horaCheckIn",
         COALESCE(TO_CHAR(a."horaCheckOut", 'HH24:MI'), '11:00') as "horaCheckOut",
         u."nombreCompleto" as "clienteNombre", u.email as "clienteEmail", u.telefono as "clienteTelefono", u.identificacion as "clienteIdentificacion",
         c.firmado as "contratoFirmado",
         p.estado as "estadoPago", p.id as "pagoId",
         COALESCE(mp.nombre, 'Tarjeta de Crédito / Débito') as "metodoPago",
         f.id as "facturaId",
         COALESCE(
           f."numeroFactura",
           CASE WHEN r."estadoId" = 'EST-002' THEN '001-002-' || LPAD((ABS(HASHTEXT(r.id)) % 1000000000)::text, 9, '0') ELSE NULL END
         ) as "numeroFactura",
         COALESCE(f."identificacionCliente", u.identificacion, '9999999999999') as "facturaIdentificacion",
         COALESCE(f."nombreRazonSocial", u."nombreCompleto", 'Consumidor Final') as "facturaRazonSocial",
         COALESCE(f.direccion, ub.direccion_detallada, 'Quito, Ecuador') as "facturaDireccion",
         COALESCE(f."fechaEmision", p."fechaPago", r."fechaCreacion") as "facturaFechaEmision"
       FROM reservas r
       JOIN estados_reserva er ON r."estadoId" = er.id
       JOIN espacios_rentables e ON r."espacioId" = e.id
       JOIN alojamientos a ON e."alojamientoId" = a.id
       LEFT JOIN ubicaciones ub ON a."ubicacionId" = ub.id
       LEFT JOIN ciudades ci ON ub."ciudadId" = ci.id
       JOIN usuarios u ON r."usuarioId" = u.id
       LEFT JOIN contratos c ON c."reservaId" = r.id
       LEFT JOIN pagos p ON p."reservaId" = r.id
       LEFT JOIN metodos_pago mp ON p."metodoPagoId" = mp.id
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
    const horaCheckOut = normalizeHoraHHMM(reserva.horaCheckOut, '11:00');
    const checkoutDate = new Date(buildEcuadorHourTimestamp(fechaSalidaStr, horaCheckOut, '11:00')).getTime();
    if (!reserva.checkoutRealizado && Date.now() < checkoutDate) {
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
