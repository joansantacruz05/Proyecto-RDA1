import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Alojamiento } from './entities/alojamiento.entity';
import { CrearAlojamientoDto } from './dto/crear-alojamiento.dto';
import { ActualizarAlojamientoDto } from './dto/actualizar-alojamiento.dto';

import { ReservasService } from '../reservas/reservas.service';
import * as crypto from 'crypto';

@Injectable()
export class AlojamientosService {
  constructor(
    @InjectRepository(Alojamiento)
    private readonly alojamientoRepository: Repository<Alojamiento>,
    private readonly reservasService: ReservasService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  //  Módulo de Administración (CRUD)
  // ═══════════════════════════════════════════════════════════════════════

  async getDashboardStats() {
    const result = await this.alojamientoRepository.query(`SELECT * FROM vista_dashboard_admin`);
    return result[0];
  }

  async createAdmin(dto: any): Promise<any> {
    const id = `ALO-${Math.floor(Math.random() * 900) + 100}`;
    let ubicacionId = dto.ubicacionId || 'UBI-001';

    if (!ubicacionId.startsWith('UBI-')) {
      const ciudadId = `CIU-${Math.floor(Math.random() * 900) + 100}`;
      await this.alojamientoRepository.query(
        'INSERT INTO ciudades (id, "paisId", nombre) VALUES ($1, $2, $3)',
        [ciudadId, 'PAI-001', dto.destino || ubicacionId]
      );
      const newUbiId = `UBI-${Math.floor(Math.random() * 900) + 100}`;
      await this.alojamientoRepository.query(
        'INSERT INTO ubicaciones (id, "ciudadId", direccion_detallada, latitud, longitud) VALUES ($1, $2, $3, $4, $5)',
        [newUbiId, ciudadId, dto.destino || ubicacionId, 0, 0]
      );
      ubicacionId = newUbiId;
    }

    await this.alojamientoRepository.query(
      'INSERT INTO alojamientos (id, nombre, descripcion, "imagenUrl", "ubicacionId") VALUES ($1, $2, $3, $4, $5)',
      [id, dto.nombre || 'Nuevo Alojamiento', dto.descripcion || '', dto.imagenUrl || '/villa.jpg', ubicacionId]
    );

    const habId = `HAB-${Math.floor(Math.random() * 900) + 100}`;
    await this.alojamientoRepository.query(
        'INSERT INTO espacios_rentables (id, "alojamientoId", nombre, "capacidadAdultos", "capacidadNinos", "precioPorNoche", "cantidadDisponible") VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [habId, id, 'Habitación Estándar', dto.capacidadAdultos || 2, dto.capacidadNinos || 0, dto.precioPorNoche || 100, dto.habitaciones || 1]
    );

    return { id, nombre: dto.nombre, descripcion: dto.descripcion, imagenUrl: dto.imagenUrl };
  }

  async findAllAdmin(): Promise<any[]> {
    const result = await this.alojamientoRepository.query(`
      SELECT 
        a.id, 
        a.nombre, 
        a.descripcion,
        a."imagenUrl",
        a."ubicacionId",
        a.estado,
        c.nombre as destino,
        (SELECT "precioPorNoche" FROM espacios_rentables er WHERE er."alojamientoId" = a.id LIMIT 1) as "precioPorNoche",
        (SELECT "capacidadAdultos" FROM espacios_rentables er WHERE er."alojamientoId" = a.id LIMIT 1) as "capacidadAdultos",
        (SELECT "capacidadNinos" FROM espacios_rentables er WHERE er."alojamientoId" = a.id LIMIT 1) as "capacidadNinos",
        (SELECT COUNT(*) FROM espacios_rentables er WHERE er."alojamientoId" = a.id)::int as habitaciones,
        (SELECT COUNT(*) FROM espacios_rentables er WHERE er."alojamientoId" = a.id AND er.estado = 'Activo')::int as habitaciones_disponibles,
        EXISTS (
          SELECT 1 FROM alojamientos_servicios aser 
          JOIN servicios s ON s.id = aser."servicioId"
          WHERE aser."alojamientoId" = a.id AND s.nombre = 'Piscina'
        ) as "tienePiscina"
      FROM alojamientos a
      LEFT JOIN ubicaciones u ON a."ubicacionId" = u.id
      LEFT JOIN ciudades c ON u."ciudadId" = c.id
    `);
    return result;
  }

  async findOneAdmin(id: string): Promise<any> {
    const result = await this.alojamientoRepository.query('SELECT * FROM alojamientos WHERE id = $1', [id]);
    if (!result.length) throw new NotFoundException(`Alojamiento ${id} no encontrado`);
    const item = result[0];
    item.habitaciones = await this.getRoomsAdmin(id);
    return item;
  }

  async updateAdmin(id: string, dto: any): Promise<any> {
    let ubicacionId = dto.ubicacionId;

    if (ubicacionId && !ubicacionId.startsWith('UBI-')) {
      const ciudadId = `CIU-${Math.floor(Math.random() * 900) + 100}`;
      await this.alojamientoRepository.query(
        'INSERT INTO ciudades (id, "paisId", nombre) VALUES ($1, $2, $3)',
        [ciudadId, 'PAI-001', dto.destino || ubicacionId]
      );
      const newUbiId = `UBI-${Math.floor(Math.random() * 900) + 100}`;
      await this.alojamientoRepository.query(
        'INSERT INTO ubicaciones (id, "ciudadId", direccion_detallada, latitud, longitud) VALUES ($1, $2, $3, $4, $5)',
        [newUbiId, ciudadId, dto.destino || ubicacionId, 0, 0]
      );
      ubicacionId = newUbiId;
    }

    await this.alojamientoRepository.query(
      'UPDATE alojamientos SET nombre = COALESCE($1, nombre), descripcion = COALESCE($2, descripcion), "imagenUrl" = COALESCE($3, "imagenUrl"), "ubicacionId" = COALESCE($4, "ubicacionId"), estado = COALESCE($5, estado) WHERE id = $6',
      [dto.nombre, dto.descripcion, dto.imagenUrl, ubicacionId, dto.estado, id]
    );

    if (dto.estado === 'Inactivo') {
      await this.alojamientoRepository.query(
        'UPDATE espacios_rentables SET estado = $1 WHERE "alojamientoId" = $2',
        ['Inactivo', id]
      );
    }
    
    if (dto.precioPorNoche !== undefined || dto.capacidadAdultos !== undefined || dto.capacidadNinos !== undefined || dto.habitaciones !== undefined) {
      const er = await this.alojamientoRepository.query('SELECT id FROM espacios_rentables WHERE "alojamientoId" = $1 LIMIT 1', [id]);
      if (er.length > 0) {
          await this.alojamientoRepository.query(
              'UPDATE espacios_rentables SET "precioPorNoche" = COALESCE($1, "precioPorNoche"), "capacidadAdultos" = COALESCE($2, "capacidadAdultos"), "capacidadNinos" = COALESCE($3, "capacidadNinos"), "cantidadDisponible" = COALESCE($4, "cantidadDisponible") WHERE id = $5',
              [dto.precioPorNoche, dto.capacidadAdultos, dto.capacidadNinos, dto.habitaciones, er[0].id]
          );
      } else {
          const habId = `HAB-${Math.floor(Math.random() * 900) + 100}`;
          await this.alojamientoRepository.query(
              'INSERT INTO espacios_rentables (id, "alojamientoId", nombre, "capacidadAdultos", "capacidadNinos", "precioPorNoche", "cantidadDisponible") VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [habId, id, 'Habitación Principal', dto.capacidadAdultos || 2, dto.capacidadNinos || 0, dto.precioPorNoche || 100, dto.habitaciones || 1]
          );
      }
    }
    
    return { id, nombre: dto.nombre, descripcion: dto.descripcion, imagenUrl: dto.imagenUrl };
  }

  async removeAdmin(id: string): Promise<void> {
    await this.alojamientoRepository.query('DELETE FROM alojamientos WHERE id = $1', [id]);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Gestor de Habitaciones (Espacios Rentables)
  // ═══════════════════════════════════════════════════════════════════════
  
  async getRoomsAdmin(alojamientoId: string): Promise<any[]> {
    return await this.alojamientoRepository.query('SELECT * FROM espacios_rentables WHERE "alojamientoId" = $1 ORDER BY nombre', [alojamientoId]);
  }

  async createRoomAdmin(alojamientoId: string, dto: any): Promise<any> {
    const habId = `HAB-${Math.floor(Math.random() * 900) + 100}`;
    await this.alojamientoRepository.query(
        'INSERT INTO espacios_rentables (id, "alojamientoId", nombre, "capacidadAdultos", "capacidadNinos", "precioPorNoche", "cantidadDisponible", "imagenesUrls", estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [habId, alojamientoId, dto.nombre || 'Nueva Habitación', dto.capacidadAdultos || 2, dto.capacidadNinos || 0, dto.precioPorNoche || 100, dto.cantidadDisponible || 1, dto.imagenesUrls || '', dto.estado || 'Activo']
    );
    return { id: habId, nombre: dto.nombre };
  }

  async updateRoomAdmin(habId: string, dto: any): Promise<any> {
    await this.alojamientoRepository.query(
        'UPDATE espacios_rentables SET nombre = COALESCE($1, nombre), "precioPorNoche" = COALESCE($2, "precioPorNoche"), "capacidadAdultos" = COALESCE($3, "capacidadAdultos"), "capacidadNinos" = COALESCE($4, "capacidadNinos"), "cantidadDisponible" = COALESCE($5, "cantidadDisponible"), "imagenesUrls" = COALESCE($6, "imagenesUrls"), estado = COALESCE($7, estado) WHERE id = $8',
        [dto.nombre, dto.precioPorNoche, dto.capacidadAdultos, dto.capacidadNinos, dto.cantidadDisponible, dto.imagenesUrls, dto.estado, habId]
    );
    return { id: habId };
  }

  async deleteRoomAdmin(habId: string): Promise<void> {
    await this.alojamientoRepository.query('DELETE FROM espacios_rentables WHERE id = $1', [habId]);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Búsqueda y Catálogo (Públicos)
  // ═══════════════════════════════════════════════════════════════════════

  async search(searchRequest: any): Promise<any> {
    const rows = searchRequest?.rows || 100;
    const country = searchRequest?.country;
    const city = searchRequest?.city;
    const adults = searchRequest?.guests?.number_of_adults || 1;

    let query = `
      SELECT DISTINCT a.id, a.nombre, c.nombre as destino, p.nombre as pais
      FROM alojamientos a
      LEFT JOIN ubicaciones u ON a."ubicacionId" = u.id
      LEFT JOIN ciudades c ON u."ciudadId" = c.id
      LEFT JOIN paises p ON c."paisId" = p.id
      LEFT JOIN espacios_rentables er ON er."alojamientoId" = a.id
      WHERE (a.estado = 'Activo' OR a.estado IS NULL)
    `;
    const params: any[] = [];

    if (country) {
      params.push(`%${country}%`);
      query += ` AND (p.nombre ILIKE $${params.length} OR p.id ILIKE $${params.length})`;
    }
    if (city) {
      params.push(`%${city}%`);
      query += ` AND (c.nombre ILIKE $${params.length} OR c.id ILIKE $${params.length})`;
    }
    if (adults) {
      params.push(adults);
      query += ` AND (er."capacidadAdultos" >= $${params.length} OR er."capacidadAdultos" IS NULL)`;
    }

    params.push(rows);
    query += ` LIMIT $${params.length}`;

    const results = await this.alojamientoRepository.query(query, params);

    return {
      request_id: crypto.randomUUID(),
      data: results.map((item: any) => ({
        id: item.id,
        url: `/details`,
      })),
      next_page: null,
    };
  }

  async checkAvailability(availabilityRequest: any): Promise<any> {
    const accommodationId = String(availabilityRequest.accommodation || availabilityRequest.accommodation_id || '');
    const guests = availabilityRequest.guests || { number_of_adults: 1, number_of_rooms: 1 };
    const checkin = availabilityRequest.checkin || new Date().toISOString().split('T')[0];
    const checkout = availabilityRequest.checkout;

    const alRows = await this.alojamientoRepository.query(
      `SELECT * FROM alojamientos WHERE id = $1 OR id = $2`,
      [accommodationId, `ALO-${accommodationId}`],
    );

    if (!alRows || alRows.length === 0) {
      return {
        request_id: crypto.randomUUID(),
        data: {
          id: accommodationId,
          currency: 'USD',
          products: [],
          url: `/availability`,
        },
      };
    }

    const accommodation = alRows[0];

    // Obtener habitaciones disponibles
    const spaces = await this.alojamientoRepository.query(
      `SELECT * FROM espacios_rentables 
       WHERE "alojamientoId" = $1 AND "cantidadDisponible" > 0 AND (estado = 'Activo' OR estado IS NULL)`,
      [accommodation.id],
    );

    // Calcular noches
    let nights = 1;
    if (checkin && checkout) {
      const dIn = new Date(checkin);
      const dOut = new Date(checkout);
      const diffTime = Math.max(dOut.getTime() - dIn.getTime(), 1000 * 60 * 60 * 24);
      nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }

    const products = spaces.map((sp: any) => ({
      product_id: sp.id,
      name: sp.nombre,
      price: Math.round(Number(sp.precioPorNoche) * nights * 100) / 100,
      price_per_night: Number(sp.precioPorNoche),
      currency: 'USD',
      capacity_adults: sp.capacidadAdultos,
      capacity_children: sp.capacidadNinos,
      available_rooms: sp.cantidadDisponible,
    }));

    return {
      request_id: crypto.randomUUID(),
      data: {
        id: accommodation.id,
        currency: 'USD',
        products,
        url: `/availability`,
      },
    };
  }

  async checkBulkAvailability(bulkRequest: any): Promise<any> {
    const accommodations = bulkRequest.accommodations || [];
    const results: any[] = [];

    for (const accId of accommodations) {
      const res = await this.checkAvailability({
        accommodation: accId,
        guests: bulkRequest.guests,
        checkin: bulkRequest.checkin,
        checkout: bulkRequest.checkout,
      });
      results.push(res.data);
    }

    return {
      request_id: crypto.randomUUID(),
      data: results,
    };
  }

  async getDetails(detailsRequest: any): Promise<any> {
    const ids = detailsRequest.accommodations || [];
    let query = `
      SELECT 
        a.id, 
        a.nombre, 
        a.descripcion, 
        a."imagenUrl",
        a."politicaCancelacion",
        u.direccion_detallada,
        c.nombre as ciudad,
        p.nombre as pais
      FROM alojamientos a
      LEFT JOIN ubicaciones u ON a."ubicacionId" = u.id
      LEFT JOIN ciudades c ON u."ciudadId" = c.id
      LEFT JOIN paises p ON c."paisId" = p.id
    `;
    const params: any[] = [];
    if (ids.length > 0) {
      params.push(ids);
      query += ` WHERE a.id = ANY($1)`;
    }

    const items = await this.alojamientoRepository.query(query, params);

    const detailed = await Promise.all(
      items.map(async (item: any) => {
        const rooms = await this.alojamientoRepository.query(
          `SELECT * FROM espacios_rentables WHERE "alojamientoId" = $1`,
          [item.id],
        );
        const facilities = await this.alojamientoRepository.query(
          `SELECT s.id, s.nombre, s.icono 
           FROM alojamientos_servicios aser
           JOIN servicios s ON s.id = aser."servicioId"
           WHERE aser."alojamientoId" = $1`,
          [item.id],
        );
        return {
          id: item.id,
          name: item.nombre,
          description: item.descripcion,
          photos: [item.imagenUrl || '/villa.jpg'],
          location: {
            address: item.direccion_detallada,
            city: item.ciudad,
            country: item.pais,
          },
          policies: {
            cancellation: item.politicaCancelacion,
          },
          facilities: facilities.map((f: any) => f.nombre),
          rooms: rooms.map((r: any) => ({
            id: r.id,
            name: r.nombre,
            capacity_adults: r.capacidadAdultos,
            capacity_children: r.capacidadNinos,
            price_per_night: Number(r.precioPorNoche),
            available: r.cantidadDisponible,
          })),
        };
      }),
    );

    return {
      request_id: crypto.randomUUID(),
      data: detailed,
      next_page: null,
    };
  }

  async getDetailsChanges(changesRequest: any): Promise<any> {
    return {
      request_id: crypto.randomUUID(),
      data: {
        from: changesRequest.last_change || new Date().toISOString(),
        next: new Date().toISOString(),
        total_changes: 0,
        changes: {},
      },
    };
  }

  async getChains(): Promise<any> {
    return {
      request_id: crypto.randomUUID(),
      data: [
        { id: 1, name: 'Marriott International', brands: [{ id: 101, name: 'Sheraton' }] },
        { id: 2, name: 'Hilton Worldwide', brands: [{ id: 201, name: 'DoubleTree' }] },
      ],
    };
  }

  async getConstants(constantsRequest: any): Promise<any> {
    const servicios = await this.alojamientoRepository.query(`SELECT * FROM servicios`);
    const tipos = await this.alojamientoRepository.query(`SELECT * FROM tipos_alojamiento`);
    return {
      request_id: crypto.randomUUID(),
      data: {
        facilities: servicios,
        property_types: tipos,
      },
    };
  }

  async getReviews(reviewsRequest: any): Promise<any> {
    const reviews = await this.alojamientoRepository.query(`
      SELECT 
        r.id, 
        r.calificacion as score, 
        r.comentario as comment, 
        u."nombreCompleto" as author,
        r."fechaSalida" as date
      FROM reservas r
      JOIN usuarios u ON r."usuarioId" = u.id
      WHERE r.calificacion IS NOT NULL
      LIMIT 50
    `);
    return {
      request_id: crypto.randomUUID(),
      data: reviews,
      next_page: null,
    };
  }

  async getReviewsScores(scoresRequest: any): Promise<any> {
    return {
      request_id: crypto.randomUUID(),
      data: [
        { category: 'cleanliness', score: 9.2 },
        { category: 'location', score: 9.5 },
        { category: 'service', score: 9.0 },
      ],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Gestión de Órdenes (Reservas) — Comparten el servicio transaccional
  // ═══════════════════════════════════════════════════════════════════════

  previewOrder(previewRequest: any): Promise<any> {
    return this.reservasService.previewOrder(previewRequest);
  }

  createOrder(createRequest: any, userId: string): Promise<any> {
    return this.reservasService.createOrder(createRequest, userId);
  }

  getOrder(orderId: string): Promise<any> {
    return this.reservasService.getOrder(orderId);
  }

  modifyOrder(orderId: string, modifyRequest: any): Promise<any> {
    return this.reservasService.modifyOrder(orderId, modifyRequest);
  }

  cancelOrder(orderId: string): Promise<any> {
    return this.reservasService.cancelOrder(orderId);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Webhooks (Persistidos en BD)
  // ═══════════════════════════════════════════════════════════════════════

  async listWebhooks(): Promise<any[]> {
    return await this.alojamientoRepository.query(`SELECT * FROM webhook_subscriptions ORDER BY created_at DESC`);
  }

  async createWebhook(webhookSubscription: any): Promise<any> {
    const id = webhookSubscription.id || crypto.randomUUID();
    const url = webhookSubscription.url;
    const events = webhookSubscription.events || ['ORDER_CONFIRMED', 'ORDER_CANCELLED'];
    const secret = webhookSubscription.secret || crypto.randomBytes(16).toString('hex');

    await this.alojamientoRepository.query(`
      INSERT INTO webhook_subscriptions (id, url, events, secret)
      VALUES ($1, $2, $3, $4)
    `, [id, url, events, secret]);

    return { id, url, events, secret };
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.alojamientoRepository.query(`DELETE FROM webhook_subscriptions WHERE id = $1`, [id]);
  }
}
