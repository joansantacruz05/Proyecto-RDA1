import { Controller } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { AlojamientosService } from './alojamientos.service';
import { Observable, from, Subject } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';

@Controller()
export class AlojamientosGrpcController {
  // Bus de eventos reactivo para suscripciones gRPC EDA
  private static readonly eventStream$ = new Subject<any>();

  constructor(private readonly alojamientosService: AlojamientosService) {}

  public static emitEvent(event: any) {
    AlojamientosGrpcController.eventStream$.next(event);
  }

  // ── 1. Catálogo y Búsqueda ────────────────────────────────────────────────

  @GrpcMethod('AlojamientosService', 'GetAlojamiento')
  async getAlojamiento(data: { id: string }): Promise<any> {
    const item = await this.alojamientosService.findOneAdmin(data.id);
    const rooms = await this.alojamientosService.getRoomsAdmin(item.id);

    return {
      id: item.id,
      nombre: item.nombre,
      descripcion: item.descripcion,
      destino: item.destino || 'Destino Principal',
      pais: 'Ecuador',
      direccion: 'Av. Principal',
      estado: item.estado === 'Inactivo' ? 2 : 1, // ALOJAMIENTO_ESTADO_ACTIVO = 1
      imagen_url: item.imagenUrl || '/villa.jpg',
      tiene_piscina: !!item.tienePiscina,
      cancellation_policy: {
        type: 1, // FLEXIBLE
        description: item.politicaCancelacion || 'Cancelación gratuita hasta 24h antes del check-in.',
        free_cancellation_until: new Date(Date.now() + 86400000).toISOString(),
        penalty_percentage: 0.0,
      },
      products: (rooms || []).map((r: any) => ({
        product_id: r.id,
        name: r.nombre,
        price_per_night: { amount: Number(r.precioPorNoche || 100), currency: 'USD' },
        available_quantity: r.cantidadDisponible || 1,
        max_adults: r.capacidadAdultos || 2,
        max_children: r.capacidadNinos || 0,
        amenities: ['Wifi', 'Aire Acondicionado'],
      })),
    };
  }

  @GrpcStreamMethod('AlojamientosService', 'SearchAlojamientosStream')
  searchAlojamientosStream(data: any): Observable<any> {
    const subject = new Subject<any>();

    (async () => {
      try {
        const searchResult = await this.alojamientosService.search({
          country: data.country,
          city: data.city,
          guests: { number_of_adults: data.guests?.number_of_adults || 1 },
          rows: data.rows || 50,
        });

        const items = searchResult?.data || [];
        for (const it of items) {
          subject.next({
            id: it.id,
            nombre: it.nombre || `Alojamiento ${it.id}`,
            destino: it.destino || 'Destino',
            pais: it.pais || 'Ecuador',
            base_price_per_night: { amount: 120.0, currency: 'USD' },
            imagen_url: '/villa.jpg',
            is_available: true,
          });
        }
        subject.complete();
      } catch (err) {
        subject.error(err);
      }
    })();

    return subject.asObservable();
  }

  // ── 2. Disponibilidad y Cotización ────────────────────────────────────────

  @GrpcMethod('AlojamientosService', 'CheckAvailability')
  async checkAvailability(data: any): Promise<any> {
    const raw = await this.alojamientosService.checkAvailability({
      accommodation: data.accommodation_id,
      checkin: data.dates?.checkin,
      checkout: data.dates?.checkout,
      guests: data.guests,
    });

    const isAvailable = !!(raw.data?.products && raw.data.products.length > 0);
    const subtotal = raw.data?.total_price || 120.0;
    const taxes = Math.round(subtotal * 0.15 * 100) / 100;
    const serviceFee = Math.round(subtotal * 0.05 * 100) / 100;
    const total = Math.round((subtotal + taxes + serviceFee) * 100) / 100;

    return {
      accommodation_id: data.accommodation_id,
      is_available: isAvailable,
      total_available_rooms: raw.data?.products?.length || 0,
      price_breakdown: {
        subtotal: { amount: subtotal, currency: 'USD' },
        taxes: { amount: taxes, currency: 'USD' },
        service_fee: { amount: serviceFee, currency: 'USD' },
        total: { amount: total, currency: 'USD' },
      },
      available_products: (raw.data?.products || []).map((p: any) => ({
        product_id: p.id,
        name: p.name,
        price_per_night: { amount: p.price_per_night, currency: 'USD' },
        available_quantity: 1,
        max_adults: 2,
        max_children: 0,
        amenities: ['Wifi'],
      })),
    };
  }

  // ── 3. Flujo Transaccional de Órdenes ─────────────────────────────────────

  @GrpcMethod('AlojamientosService', 'PreviewOrder')
  async previewOrder(data: any): Promise<any> {
    const preview = await this.alojamientosService.previewOrder({
      accommodation_id: data.accommodation_id,
      product_id: data.product_id,
      checkin: data.dates?.checkin,
      checkout: data.dates?.checkout,
      guests: data.guests,
    });

    const subtotal = preview.data?.price_breakdown?.base || 100.0;
    const taxes = preview.data?.price_breakdown?.taxes || Math.round(subtotal * 0.15 * 100) / 100;
    const fee = Math.round(subtotal * 0.05 * 100) / 100;
    const total = preview.data?.price_breakdown?.total || (subtotal + taxes + fee);

    return {
      order_preview_id: preview.data?.order_preview_id,
      accommodation_id: data.accommodation_id,
      product_id: data.product_id,
      hold_status: 1, // HOLD_ACTIVE
      hold_duration_seconds: 900,
      expires_at: new Date(Date.now() + 900000).toISOString(),
      price_breakdown: {
        subtotal: { amount: subtotal, currency: 'USD' },
        taxes: { amount: taxes, currency: 'USD' },
        service_fee: { amount: fee, currency: 'USD' },
        total: { amount: total, currency: 'USD' },
      },
      cancellation_policy: {
        type: 1, // FLEXIBLE
        description: 'Cancelación gratuita hasta 24 horas antes del check-in.',
        free_cancellation_until: new Date(Date.now() + 86400000).toISOString(),
        penalty_percentage: 0.0,
      },
    };
  }

  @GrpcMethod('AlojamientosService', 'CreateOrder')
  async createOrder(data: any, metadata: Metadata): Promise<any> {
    // Inferencia de usuario desde el token JWT en metadatos gRPC
    let userId = 'usr-grpc-default';
    const authHeader = metadata.get('authorization')?.[0] as string;
    if (authHeader) {
      try {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
          userId = decoded.sub || decoded.id || userId;
        }
      } catch (_) {}
    }

    const order = await this.alojamientosService.createOrder(
      {
        order_preview_id: data.order_preview_id,
        payment_reference: data.payment_reference,
        customer_details: data.customer,
      },
      userId,
    );

    // Emitir evento reactivo al bus EDA
    AlojamientosGrpcController.emitEvent({
      event_id: crypto.randomUUID(),
      event_type: 'RESERVA_CREADA',
      order_id: order.order_id,
      locator: order.locator,
      accommodation_id: order.accommodation_id || 'ALO-001',
      timestamp: new Date().toISOString(),
      reserva_creada: {
        order_id: order.order_id,
        accommodation_id: order.accommodation_id || 'ALO-001',
        checkin: order.dates?.checkin,
        checkout: order.dates?.checkout,
        total_amount: order.price_breakdown?.total || 120.0,
        customer_email: data.customer?.email,
      },
    });

    return {
      order_id: order.order_id,
      locator: order.locator,
      accommodation_id: order.accommodation_id || 'ALO-001',
      product_id: order.product_id || 'HAB-001',
      owner_id: userId,
      status: 2, // CONFIRMED
      dates: {
        checkin: order.dates?.checkin || new Date().toISOString().split('T')[0],
        checkout: order.dates?.checkout,
        total_nights: 1,
      },
      guests: { number_of_adults: 2, number_of_children: 0, number_of_rooms: 1 },
      customer: data.customer,
      price_breakdown: {
        subtotal: { amount: order.price_breakdown?.base || 100, currency: 'USD' },
        taxes: { amount: order.price_breakdown?.taxes || 15, currency: 'USD' },
        service_fee: { amount: 5, currency: 'USD' },
        total: { amount: order.price_breakdown?.total || 120, currency: 'USD' },
      },
      cancellation_policy: {
        type: 1,
        description: 'Cancelación gratuita hasta 24 horas antes del check-in.',
        free_cancellation_until: new Date(Date.now() + 86400000).toISOString(),
        penalty_percentage: 0.0,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  @GrpcMethod('AlojamientosService', 'GetOrder')
  async getOrder(data: { order_id: string }): Promise<any> {
    const raw = await this.alojamientosService.getOrder(data.order_id);
    return {
      order_id: raw.order_id,
      locator: raw.locator,
      accommodation_id: raw.accommodation_id,
      product_id: raw.product_id,
      owner_id: raw.owner_id || 'usr-default',
      status: raw.status === 'CANCELLED' ? 4 : 2,
      dates: {
        checkin: raw.dates?.checkin,
        checkout: raw.dates?.checkout,
        total_nights: 1,
      },
      guests: raw.guests,
      customer: raw.customer,
      price_breakdown: {
        subtotal: { amount: raw.price_breakdown?.base || 100, currency: 'USD' },
        taxes: { amount: raw.price_breakdown?.taxes || 15, currency: 'USD' },
        service_fee: { amount: 5, currency: 'USD' },
        total: { amount: raw.price_breakdown?.total || 120, currency: 'USD' },
      },
      created_at: raw.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  @GrpcMethod('AlojamientosService', 'ModifyOrder')
  async modifyOrder(data: any): Promise<any> {
    const modified = await this.alojamientosService.modifyOrder(data.order_id, {
      checkin: data.new_dates?.checkin,
      checkout: data.new_dates?.checkout,
      guests: data.new_guests,
    });

    return {
      order_id: modified.order_id,
      locator: modified.locator,
      accommodation_id: modified.accommodation_id,
      product_id: modified.product_id,
      owner_id: modified.owner_id,
      status: 3, // MODIFIED
      dates: data.new_dates,
      guests: data.new_guests,
      customer: modified.customer,
      price_breakdown: {
        subtotal: { amount: 100, currency: 'USD' },
        taxes: { amount: 15, currency: 'USD' },
        service_fee: { amount: 5, currency: 'USD' },
        total: { amount: 120, currency: 'USD' },
      },
      created_at: modified.created_at,
      updated_at: new Date().toISOString(),
    };
  }

  @GrpcMethod('AlojamientosService', 'CancelOrder')
  async cancelOrder(data: any): Promise<any> {
    const result = await this.alojamientosService.cancelOrder(data.order_id);

    return {
      order_id: data.order_id,
      locator: result.locator || 'RES-CANCEL',
      status: 4, // CANCELLED
      refund_amount: { amount: result.refund_amount || 120.0, currency: 'USD' },
      penalty_fee: { amount: 0.0, currency: 'USD' },
      cancelled_at: new Date().toISOString(),
    };
  }

  // ── 4. Arquitectura Orientada a Eventos (EDA) ─────────────────────────────

  @GrpcStreamMethod('AlojamientosService', 'SubscribeOrderEvents')
  subscribeOrderEvents(data: any): Observable<any> {
    return AlojamientosGrpcController.eventStream$.asObservable();
  }
}
