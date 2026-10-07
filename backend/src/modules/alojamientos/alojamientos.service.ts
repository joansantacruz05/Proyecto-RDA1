import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Alojamiento } from './entities/alojamiento.entity';
import { CrearAlojamientoDto } from './dto/crear-alojamiento.dto';
import { ActualizarAlojamientoDto } from './dto/actualizar-alojamiento.dto';

@Injectable()
export class AlojamientosService {
  constructor(
    @InjectRepository(Alojamiento)
    private readonly alojamientoRepository: Repository<Alojamiento>,
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
    return result[0];
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
  //  Búsqueda y Catálogo
  // ═══════════════════════════════════════════════════════════════════════

  search(searchRequest: any): any {
    // TODO: Implementar búsqueda de alojamientos (conectar con proveedor/GDS)
    return { request_id: '', data: [], next_page: null };
  }

  checkAvailability(availabilityRequest: any): any {
    // TODO: Implementar consulta de disponibilidad y precios
    return { request_id: '', data: {} };
  }

  checkBulkAvailability(bulkRequest: any): any {
    // TODO: Implementar consulta de disponibilidad múltiple
    return { request_id: '', data: [] };
  }

  getDetails(detailsRequest: any): any {
    // TODO: Implementar obtención de detalles extendidos (fotos, descripción, etc.)
    return { request_id: '', data: [], next_page: null };
  }

  getDetailsChanges(changesRequest: any): any {
    // TODO: Implementar consulta de cambios de alojamientos desde una fecha
    return { request_id: '', data: {} };
  }

  getChains(): any {
    // TODO: Implementar listado de cadenas hoteleras y marcas
    return { request_id: '', data: [] };
  }

  getConstants(constantsRequest: any): any {
    // TODO: Implementar consulta de constantes del sistema (facilidades, tipos de cuartos)
    return { request_id: '', data: {} };
  }

  getReviews(reviewsRequest: any): any {
    // TODO: Implementar obtención de reseñas de alojamientos
    return { request_id: '', data: [], next_page: null };
  }

  getReviewsScores(scoresRequest: any): any {
    // TODO: Implementar obtención de puntuaciones de reseñas
    return { request_id: '', data: [] };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Gestión de Órdenes (Reservas)
  // ═══════════════════════════════════════════════════════════════════════

  previewOrder(previewRequest: any): any {
    // TODO: Implementar previsualización de orden (precio final antes de pagar)
    return { request_id: '', data: {} };
  }

  createOrder(createRequest: any): any {
    // TODO: Implementar creación formal de reserva/orden
    return {};
  }

  getOrder(orderId: string): any {
    // TODO: Implementar obtención de detalle de orden por ID
    return {};
  }

  modifyOrder(orderId: string, modifyRequest: any): any {
    // TODO: Implementar modificación de orden existente
    return {};
  }

  cancelOrder(orderId: string): any {
    // TODO: Implementar cancelación de orden
    return {};
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Webhooks
  // ═══════════════════════════════════════════════════════════════════════

  listWebhooks(): any[] {
    // TODO: Implementar listado de suscripciones a webhooks
    return [];
  }

  createWebhook(webhookSubscription: any): any {
    // TODO: Implementar registro de webhook
    return {};
  }

  deleteWebhook(id: string): void {
    // TODO: Implementar eliminación de suscripción de webhook
  }
}
