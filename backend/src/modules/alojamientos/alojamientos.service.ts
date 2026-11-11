import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Alojamiento } from './entities/alojamiento.entity';
import { CrearAlojamientoDto } from './dto/crear-alojamiento.dto';
import { ActualizarAlojamientoDto } from './dto/actualizar-alojamiento.dto';

import { ReservasService } from '../reservas/reservas.service';
import { PricingService } from '../../common/services/pricing.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { ProblemDetailsException } from '../../common/exceptions/problem-details.exception';
import { validarIdentificacion } from '../../common/utils/ecuador-validators';
import { HttpStatus, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { catalogCache } from '../../common/utils/ttl-cache';

@Injectable()
export class AlojamientosService {
  constructor(
    @InjectRepository(Alojamiento)
    private readonly alojamientoRepository: Repository<Alojamiento>,
    private readonly reservasService: ReservasService,
    private readonly pricingService: PricingService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  //  Módulo de Administración (CRUD)
  // ═══════════════════════════════════════════════════════════════════════

  async getDashboardStats() {
    const result = await this.alojamientoRepository.query(`SELECT * FROM vista_dashboard_admin`);
    return result[0];
  }

  async resolveUbicacion(cityOrUbi?: string, destino?: string): Promise<string> {
    const rawTarget = (destino || cityOrUbi || '').trim();
    if (!rawTarget) return 'UBI-001';

    if (rawTarget.startsWith('UBI-')) {
      const existing = await this.alojamientoRepository.query(
        'SELECT id FROM ubicaciones WHERE id = $1 LIMIT 1',
        [rawTarget]
      );
      if (existing.length > 0) return rawTarget;
    }

    const cleanName = rawTarget;
    const found = await this.alojamientoRepository.query(
      'SELECT c.id as ciudad_id, u.id as ubi_id FROM ciudades c LEFT JOIN ubicaciones u ON u."ciudadId" = c.id WHERE LOWER(c.nombre) = LOWER($1) LIMIT 1',
      [cleanName]
    );

    if (found.length > 0) {
      if (found[0].ubi_id) {
        return found[0].ubi_id;
      }
      const newUbi = 'UBI-' + found[0].ciudad_id.replace('CIU-', 'C');
      await this.alojamientoRepository.query(
        'INSERT INTO ubicaciones (id, "ciudadId", direccion_detallada, latitud, longitud) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
        [newUbi, found[0].ciudad_id, 'Centro de ' + cleanName, 0, 0]
      );
      return newUbi;
    }

    const newCiudadId = 'CIU-EC-' + Date.now().toString().slice(-6);
    await this.alojamientoRepository.query(
      'INSERT INTO ciudades (id, "paisId", nombre) VALUES ($1, $2, $3)',
      [newCiudadId, 'PAI-001', cleanName]
    );
    const newUbiId = 'UBI-' + newCiudadId.replace('CIU-', 'C');
    await this.alojamientoRepository.query(
      'INSERT INTO ubicaciones (id, "ciudadId", direccion_detallada, latitud, longitud) VALUES ($1, $2, $3, $4, $5)',
      [newUbiId, newCiudadId, 'Centro de ' + cleanName, 0, 0]
    );
    return newUbiId;
  }

  async getCiudades(): Promise<any[]> {
    return this.alojamientoRepository.query(
      'SELECT id, nombre FROM ciudades ORDER BY nombre ASC'
    );
  }

  async createAdmin(dto: any): Promise<any> {
    const id = `ALO-${Math.floor(Math.random() * 900) + 100}`;
    const ubicacionId = await this.resolveUbicacion(dto.ubicacionId, dto.destino);

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
    const result = await this.alojamientoRepository.query(`
      SELECT 
        a.*,
        EXISTS (
          SELECT 1 FROM reservas r
          JOIN espacios_rentables er ON r."espacioId" = er.id
          WHERE er."alojamientoId" = a.id 
            AND r."estadoId" IN ('EST-001', 'EST-002')
            AND r."fechaSalida" >= CURRENT_DATE
        ) as esta_reservado
      FROM alojamientos a 
      WHERE a.id = $1 OR a.codigo = $1 OR a.id = ('ALO-' || $1)
    `, [id]);
    if (!result.length) throw new NotFoundException(`Alojamiento ${id} no encontrado`);
    const item = result[0];
    item.estaReservado = Boolean(item.esta_reservado);
    item.habitaciones = await this.getRoomsAdmin(id);
    return item;
  }

  async updateAdmin(id: string, dto: any): Promise<any> {
    catalogCache.invalidate();
    let ubicacionId: string | undefined = undefined;
    if (dto.ubicacionId || dto.destino) {
      ubicacionId = await this.resolveUbicacion(dto.ubicacionId, dto.destino);
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
    } else if (dto.estado === 'Activo') {
      await this.alojamientoRepository.query(
        'UPDATE espacios_rentables SET estado = $1 WHERE "alojamientoId" = $2',
        ['Activo', id]
      );
    }

    if (dto.liberarReservas) {
      await this.alojamientoRepository.query(
        `UPDATE reservas r
         SET "fechaSalida" = LEAST("fechaSalida", CURRENT_DATE - INTERVAL '1 day')
         FROM espacios_rentables er
         WHERE r."espacioId" = er.id 
           AND er."alojamientoId" = $1
           AND r."estadoId" IN ('EST-001', 'EST-002')
           AND r."fechaSalida" >= CURRENT_DATE`,
        [id],
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
    catalogCache.invalidate();
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
    catalogCache.invalidate();
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

  // ═══════════════════════════════════════════════════════════════════════
  //  Disponibilidad por Fechas (OpenAPI v2.2.0)
  // ═══════════════════════════════════════════════════════════════════════

  async getPropertyAvailability(
    alojamientoId: string,
    checkin?: string,
    checkout?: string,
    adults: number = 1,
    rooms: number = 1,
    tipoHabitacion?: string,
  ): Promise<any> {
    if (!checkin || !checkout) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/validation-failed',
          title: 'Validation Failed',
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_FAILED',
          detail: 'Los parámetros de consulta checkin y checkout son obligatorios (formato AAAA-MM-DD).',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const dIn = new Date(checkin);
    const dOut = new Date(checkout);
    if (isNaN(dIn.getTime()) || isNaN(dOut.getTime()) || dOut <= dIn) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/validation-failed',
          title: 'Invalid Dates',
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: 'RESTRICTION_VIOLATED',
          detail: 'La fecha de checkout debe ser posterior a la fecha de checkin.',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const noches = Math.max(1, Math.round((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24)));

    // Normalizar fechas a ISO YYYY-MM-DD
    const checkinClean = String(checkin).split('T')[0];
    const checkoutClean = String(checkout).split('T')[0];

    // Verificar si el alojamiento existe
    const alRows = await this.alojamientoRepository.query(
      `SELECT * FROM alojamientos 
       WHERE id = $1 
          OR codigo = $1 
          OR REPLACE(codigo, '-', '_') = REPLACE($1, '-', '_') 
          OR REPLACE(codigo, '_', '-') = REPLACE($1, '_', '-') 
          OR id = ('ALO-' || $1)
       LIMIT 1`,
      [alojamientoId],
    );

    if (!alRows || alRows.length === 0) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/not-found',
          title: 'Hotel Not Found',
          status: HttpStatus.NOT_FOUND,
          code: 'HOTEL_NOT_FOUND',
          detail: `Alojamiento "${alojamientoId}" no encontrado en el catálogo.`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const accommodation = alRows[0];

    // Obtener habitaciones de la propiedad
    let query = `
      SELECT e.* 
      FROM espacios_rentables e
      WHERE e."alojamientoId" = $1 AND (e.estado = 'Activo' OR e.estado IS NULL)
    `;
    const params: any[] = [accommodation.id];

    if (tipoHabitacion) {
      params.push(tipoHabitacion);
      query += ` AND (e.codigo = $2 OR e.id = $2 OR REPLACE(e.codigo, '-', '_') = REPLACE($2, '-', '_'))`;
    }

    query += ` ORDER BY e.nombre`;
    const spaces = await this.alojamientoRepository.query(query, params);

    // Conteo global de habitaciones ocupadas y total del hotel
    const ocupacionHotelRes = await this.alojamientoRepository.query(
      `SELECT 
         COALESCE(SUM(COALESCE(r."cantidadHabitaciones", 1)), 0)::int as ocupadas_hotel,
         (SELECT COALESCE(SUM(er3."cantidadDisponible"), 0)::int FROM espacios_rentables er3 WHERE er3."alojamientoId" = $1 AND (er3.estado = 'Activo' OR er3.estado IS NULL)) as total_hotel
       FROM reservas r
       JOIN espacios_rentables er ON er.id = r."espacioId"
       WHERE er."alojamientoId" = $1
         AND r."estadoId" IN ('EST-001', 'EST-002')
         AND r."fechaEntrada" < $3::date AND r."fechaSalida" > $2::date`,
      [accommodation.id, checkinClean, checkoutClean],
    );
    const ocupadasHotel = Number(ocupacionHotelRes[0]?.ocupadas_hotel || 0);
    const totalHotel = Number(ocupacionHotelRes[0]?.total_hotel || 0);
    const dispHotel = Math.max(0, totalHotel - ocupadasHotel);

    // Consulta con la ocupación por habitación (contando cantidadHabitaciones por reserva)
    const ocupacionRows = spaces.length
      ? await this.alojamientoRepository.query(
          `SELECT r."espacioId" AS id, COALESCE(SUM(COALESCE(r."cantidadHabitaciones", 1)), 0)::int AS ocupadas
           FROM reservas r
           WHERE r."espacioId" = ANY($1)
             AND r."estadoId" IN ('EST-001', 'EST-002')
             AND r."fechaEntrada" < $3::date AND r."fechaSalida" > $2::date
           GROUP BY r."espacioId"`,
          [spaces.map((s: any) => s.id), checkinClean, checkoutClean],
        )
      : [];
    const ocupadasPorEspacio = new Map<string, number>(
      ocupacionRows.map((o: any) => [String(o.id), Number(o.ocupadas)] as [string, number]),
    );

    const opciones: any[] = [];
    for (const sp of spaces) {
      const ocEsp = ocupadasPorEspacio.get(String(sp.id)) || 0;
      const totalEsp = Number(sp.cantidadDisponible ?? 0);
      const dispEsp = Math.max(0, totalEsp - ocEsp);
      const disponibles = Math.min(dispEsp, dispHotel);
      const precioNocheNum = Number(sp.precioPorNoche || 0);
      const precioTotalNum = Math.round(precioNocheNum * noches * rooms * 100) / 100;

      opciones.push({
        tipoHabitacionCodigo: sp.codigo || 'SUITE_DELUXE',
        nombre: sp.nombre,
        estaDisponible: disponibles >= rooms,
        habitacionesRemanentes: disponibles,
        available_rooms: disponibles,
        precioNoche: precioNocheNum.toFixed(2),
        precioTotalEstancia: precioTotalNum.toFixed(2),
        regimen: 'SOLO_HABITACION',
        planTarifaCodigo: 'FLEX_BB',
      });
    }

    const totalDisponibles = opciones.reduce((sum, o) => sum + (o.habitacionesRemanentes || 0), 0);
    const estaDisponible = opciones.some((o) => o.estaDisponible);

    return {
      alojamientoId: accommodation.id,
      checkin: checkinClean,
      checkout: checkoutClean,
      noches,
      estaDisponible,
      habitacionesRemanentes: totalDisponibles,
      available_rooms: totalDisponibles,
      totalHabitaciones: totalHotel,
      habitacionesOcupadas: ocupadasHotel,
      opciones,
    };
  }

  async checkAvailability(availabilityRequest: any): Promise<any> {
    const accommodationId = String(
      availabilityRequest.alojamientoId ||
      availabilityRequest.accommodation ||
      availabilityRequest.accommodation_id ||
      availabilityRequest.hotel_id ||
      availabilityRequest.hotelId ||
      availabilityRequest.id ||
      ''
    ).trim();
    const checkin = availabilityRequest.fechaInicio || availabilityRequest.checkin || availabilityRequest.dates?.checkin;
    const checkout = availabilityRequest.fechaFin || availabilityRequest.checkout || availabilityRequest.dates?.checkout;
    const tipoHabitacionCodigo = String(
      availabilityRequest.tipoHabitacionCodigo ||
      availabilityRequest.product_id ||
      availabilityRequest.productId ||
      availabilityRequest.room_type ||
      availabilityRequest.room_type_code ||
      availabilityRequest.tipoHabitacion ||
      ''
    ).trim();
    const cantidadHabitaciones = Math.max(1, Number(
      availabilityRequest.cantidadHabitaciones ||
      availabilityRequest.rooms ||
      availabilityRequest.guests?.number_of_rooms ||
      1
    ));
    const planTarifaCodigo = availabilityRequest.planTarifaCodigo || 'FLEX_BB';

    const alRows = await this.alojamientoRepository.query(
      `SELECT * FROM alojamientos 
       WHERE id = $1 
          OR codigo = $1 
          OR REPLACE(codigo, '-', '_') = REPLACE($1, '-', '_') 
          OR REPLACE(codigo, '_', '-') = REPLACE($1, '_', '-') 
          OR id = ('ALO-' || $1)
       LIMIT 1`,
      [accommodationId],
    );

    if (!alRows || alRows.length === 0) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/not-found',
          title: 'Hotel Not Found',
          status: HttpStatus.NOT_FOUND,
          code: 'HOTEL_NOT_FOUND',
          detail: `Alojamiento "${accommodationId}" no encontrado.`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const accommodation = alRows[0];

    // Buscar habitación
    let query = `
      SELECT e.* 
      FROM espacios_rentables e
      WHERE e."alojamientoId" = $1 AND (e.estado = 'Activo' OR e.estado IS NULL)
    `;
    const params: any[] = [accommodation.id];

    if (tipoHabitacionCodigo) {
      params.push(tipoHabitacionCodigo);
      query += ` AND (e.codigo = $2 OR e.id = $2 OR REPLACE(e.codigo, '-', '_') = REPLACE($2, '-', '_'))`;
    }

    query += ` ORDER BY (CASE WHEN e.codigo = $2 THEN 0 ELSE 1 END), e.id LIMIT 1`;
    const spaces = await this.alojamientoRepository.query(query, params);

    if (!spaces || spaces.length === 0) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/not-found',
          title: 'Room Not Found',
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          detail: `Tipo de habitación "${tipoHabitacionCodigo || 'cualquiera'}" no disponible en ${accommodation.nombre}.`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const room = spaces[0];

    const checkinClean = String(checkin || new Date().toISOString().split('T')[0]).split('T')[0];
    const checkoutClean = String(checkout || new Date(Date.now() + 86400000).toISOString().split('T')[0]).split('T')[0];

    // Calcular noches
    let nights = 1;
    if (checkinClean && checkoutClean) {
      const dIn = new Date(`${checkinClean}T00:00:00Z`);
      const dOut = new Date(`${checkoutClean}T00:00:00Z`);
      const diffTime = Math.max(dOut.getTime() - dIn.getTime(), 1000 * 60 * 60 * 24);
      nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }

    // Validar disponibilidad contando TODAS las reservas activas que solapan
    const availCheck = await this.alojamientoRepository.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN r."espacioId" = $1 THEN COALESCE(r."cantidadHabitaciones", 1) ELSE 0 END), 0)::int as ocupadas_espacio,
         COALESCE(SUM(COALESCE(r."cantidadHabitaciones", 1)), 0)::int as ocupadas_hotel,
         (SELECT e."cantidadDisponible"::int FROM espacios_rentables e WHERE e.id = $1) as total_espacio,
         (SELECT COALESCE(SUM(er3."cantidadDisponible"), 0)::int FROM espacios_rentables er3 WHERE er3."alojamientoId" = $2 AND (er3.estado = 'Activo' OR er3.estado IS NULL)) as total_hotel
       FROM reservas r
       JOIN espacios_rentables er ON er.id = r."espacioId"
       WHERE er."alojamientoId" = $2
         AND r."estadoId" IN ('EST-001', 'EST-002')
         AND r."fechaEntrada" < $4::date AND r."fechaSalida" > $3::date`,
      [room.id, accommodation.id, checkinClean, checkoutClean],
    );

    const row = availCheck[0] || {};
    const totalEspacio = Number(row.total_espacio ?? room.cantidadDisponible ?? 1);
    const totalHotel = Number(row.total_hotel ?? totalEspacio);
    const ocupadasEspacio = Number(row.ocupadas_espacio || 0);
    const ocupadasHotel = Number(row.ocupadas_hotel || 0);

    const dispEsp = Math.max(0, totalEspacio - ocupadasEspacio);
    const dispHotel = Math.max(0, totalHotel - ocupadasHotel);
    const disponibles = Math.min(dispEsp, dispHotel);

    if (disponibles < cantidadHabitaciones) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/out-of-stock',
          title: 'Sin habitaciones disponibles',
          status: HttpStatus.CONFLICT,
          code: 'OUT_OF_STOCK',
          detail: `No hay cupos disponibles para ${cantidadHabitaciones} habitación(es) en las fechas solicitadas (remanentes: ${disponibles}).`,
        },
        HttpStatus.CONFLICT,
      );
    }

    const pricing = this.pricingService.calculatePrice(
      Number(room.precioPorNoche),
      checkinClean,
      checkoutClean,
      cantidadHabitaciones,
    );

    const cotizacionId = crypto.randomUUID();
    const tarifaValidaHasta = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    ReservasService.quotesCache.set(cotizacionId, {
      alojamientoId: accommodation.id,
      espacioId: room.id,
      tipoHabitacionCodigo: room.codigo || 'SUITE_DELUXE',
      fechaInicio: checkinClean,
      fechaFin: checkoutClean,
      cantidadHabitaciones,
      total: pricing.total,
      tarifaValidaHasta: new Date(Date.now() + 30 * 60 * 1000),
    });

    return {
      alojamientoId: accommodation.id,
      tipoHabitacionCodigo: room.codigo || 'SUITE_DELUXE',
      estaDisponible: true,
      habitacionesRemanentes: disponibles,
      available_rooms: disponibles,
      nochesEstancia: nights,
      precioTotalCotizado: pricing.totalStr,
      cotizacionId: cotizacionId,
      tarifaValidaHasta: tarifaValidaHasta,
      currency: 'USD',
      planTarifaCodigo: planTarifaCodigo,
      desglosePrecio: {
        subtotal: pricing.subtotalStr,
        iva: pricing.ivaStr,
        tasaMunicipal: pricing.tasaMunicipalStr,
        total: pricing.totalStr,
        moneda: 'USD',
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

    const itemIds = items.map((i: any) => i.id);
    const [allRooms, allFacilities] = itemIds.length
      ? await Promise.all([
          this.alojamientoRepository.query(
            `SELECT * FROM espacios_rentables WHERE "alojamientoId" = ANY($1)`,
            [itemIds],
          ),
          this.alojamientoRepository.query(
            `SELECT aser."alojamientoId" AS "alojamientoId", s.id, s.nombre, s.icono
             FROM alojamientos_servicios aser
             JOIN servicios s ON s.id = aser."servicioId"
             WHERE aser."alojamientoId" = ANY($1)`,
            [itemIds],
          ),
        ])
      : [[], []];

    const detailed = await Promise.all(
      items.map(async (item: any) => {
        const rooms = allRooms.filter((r: any) => r.alojamientoId === item.id);
        const facilities = allFacilities.filter((f: any) => f.alojamientoId === item.id);
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

  createOrder(createRequest: any, userId: string, clientIdHeader?: string, req?: any, res?: any): Promise<any> {
    return this.reservasService.createOrder(createRequest, userId, clientIdHeader, req, res);
  }

  getOrder(orderId: string): Promise<any> {
    return this.reservasService.getOrder(orderId);
  }

  modifyOrder(orderId: string, modifyRequest: any): Promise<any> {
    return this.reservasService.modifyOrder(orderId, modifyRequest);
  }

  cancelOrder(orderId: string, userId?: string, userRol?: string, reason?: string, solicitadoPor?: string): Promise<any> {
    return this.reservasService.cancelOrder(orderId, userId, userRol, reason, solicitadoPor);
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

  async getEventosOutbox(after: number = 0): Promise<any> {
    const rows = await this.alojamientoRepository.query(`
      SELECT COALESCE(ts, 1) as sequence, id::text as id, 'alojamientos.stock.updated' as type,
             '//alojamientos.luxestays.com' as source,
             '1.0' as specversion,
             json_build_object(
               'itemId', "itemId",
               'fecha', fecha,
               'unidades', unidades,
               'estado', estado
             ) as data,
             COALESCE("creadoEn", CURRENT_TIMESTAMP) as time
      FROM stock_outbox
      ORDER BY id ASC
      LIMIT 100
    `);
    return {
      eventos: rows,
      total: rows.length,
      last_sequence: rows.length > 0 ? rows[rows.length - 1].sequence : after,
    };
  }

  async getInventorySnapshot(alojamientoId: string, desde?: string, hasta?: string): Promise<any> {
    const fechaDesde = desde || new Date().toISOString().split('T')[0];
    const fechaHasta = hasta || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const rooms = await this.alojamientoRepository.query(
      `SELECT e.id, e.nombre, e.codigo, e."cantidadDisponible", e."precioPorNoche", a.nombre as "alojamientoNombre"
       FROM espacios_rentables e
       JOIN alojamientos a ON a.id = e."alojamientoId"
       WHERE (a.id = $1 OR a.codigo = $1 OR e."alojamientoId" = $1) AND (e.estado = 'Activo' OR e.estado IS NULL)`,
      [alojamientoId],
    );

    const activeReservations = await this.alojamientoRepository.query(
      `SELECT r."espacioId", r."fechaEntrada"::text as "fechaEntrada", r."fechaSalida"::text as "fechaSalida",
              COALESCE(r."cantidadHabitaciones", 1)::int as "cantidadHabitaciones"
       FROM reservas r
       JOIN espacios_rentables er ON er.id = r."espacioId"
       WHERE (er."alojamientoId" = $1 OR er."alojamientoId" = ('ALO-' || $1))
         AND r."estadoId" IN ('EST-001', 'EST-002')
         AND r."fechaEntrada" < $3::date AND r."fechaSalida" > $2::date`,
      [alojamientoId, fechaDesde, fechaHasta],
    );

    const noches: any[] = [];
    const curr = new Date(fechaDesde);
    const end = new Date(fechaHasta);

    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      for (const r of rooms) {
        const occupied = activeReservations
          .filter((res: any) => {
            const rIn = String(res.fechaEntrada).split('T')[0];
            const rOut = String(res.fechaSalida).split('T')[0];
            return (res.espacioId === r.id || rooms.length === 1) && rIn <= dateStr && rOut > dateStr;
          })
          .reduce((sum: number, res: any) => sum + Number(res.cantidadHabitaciones || 1), 0);
        const total = Number(r.cantidadDisponible || 1);
        const disponibles = Math.max(0, total - occupied);

        noches.push({
          fecha: dateStr,
          tipoHabitacion: r.codigo || r.nombre,
          tipoHabitacionCodigo: r.codigo || 'SUITE_DELUXE',
          habitacionId: r.id,
          habitacionesTotales: total,
          reservadas: occupied,
          bloqueadas: 0,
          disponibles,
          available_rooms: disponibles,
          total,
          precioPorNoche: String(Number(r.precioPorNoche || 50).toFixed(2)),
          moneda: 'USD',
          ventaCerrada: disponibles <= 0,
          cerradoALlegada: false,
          cerradoASalida: false,
        });
      }
      curr.setDate(curr.getDate() + 1);
    }

    const hash = crypto.createHash('sha256').update(JSON.stringify(noches)).digest('hex').substring(0, 32);

    return {
      alojamientoId,
      desde: fechaDesde,
      hasta: fechaHasta,
      generadoEn: new Date().toISOString(),
      hash,
      noches,
    };
  }


  // ═══════════════════════════════════════════════════════════════════════
  //  Catálogo Paginado OpenAPI v2.2.0
  // ═══════════════════════════════════════════════════════════════════════

  async listAlojamientos(
    page: number = 1,
    limit: number = 10,
    ciudad?: string,
    estrellas?: number,
    minPrecio?: number,
    maxPrecio?: number,
  ): Promise<any> {
    const p = Math.max(1, page);
    const l = Math.min(50, Math.max(1, limit));
    const cacheKey = JSON.stringify([p, l, ciudad || '', estrellas ?? '', minPrecio ?? '', maxPrecio ?? '']);

    // Caché de 15 s + single-flight + "stale-on-error": el catálogo responde en milisegundos y,
    // si la BD (otra región) se demora o falla, se sirve la última copia en vez de dar timeout.
    return catalogCache.getOrLoad(cacheKey, () => this.queryAlojamientosCatalog(p, l, ciudad));
  }

  private async queryAlojamientosCatalog(p: number, l: number, ciudad?: string): Promise<any> {
    const offset = (p - 1) * l;

    let whereClause = `WHERE (a.estado = 'Activo' OR a.estado IS NULL)`;
    const params: any[] = [];

    if (ciudad) {
      params.push(`%${ciudad}%`);
      whereClause += ` AND c.nombre ILIKE $${params.length}`;
    }

    // Un único viaje a la BD: página + total (COUNT OVER) + agregados por habitación pre-calculados
    // para los ≤50 alojamientos de la página (sin subconsultas correlacionadas por fila).
    const query = `
      WITH page AS (
        SELECT a.id, a.nombre, a.descripcion, a."imagenUrl", a.estado, c.nombre AS destino,
               COUNT(*) OVER()::int AS total_results
        FROM alojamientos a
        LEFT JOIN ubicaciones u ON a."ubicacionId" = u.id
        LEFT JOIN ciudades c ON u."ciudadId" = c.id
        ${whereClause}
        ORDER BY a.id ASC
        LIMIT ${l} OFFSET ${offset}
      ),
      rooms AS (
        SELECT er.id, er."alojamientoId", er."precioPorNoche", er."capacidadAdultos", er."capacidadNinos",
               er.estado, er."cantidadDisponible",
               (
                 SELECT COALESCE(SUM(COALESCE(r."cantidadHabitaciones", 1)), 0) FROM reservas r
                 WHERE r."espacioId" = er.id
                   AND r."estadoId" IN ('EST-001', 'EST-002')
                   AND r."fechaSalida" >= CURRENT_DATE
               )::int AS ocupadas
        FROM espacios_rentables er
        WHERE er."alojamientoId" IN (SELECT id FROM page)
      ),
      rooms_agg AS (
        SELECT "alojamientoId" AS aid,
               (array_agg("precioPorNoche" ORDER BY id))[1] AS "precioPorNoche",
               COUNT(*)::int AS habitaciones,
               COALESCE(SUM(CASE WHEN estado = 'Activo' OR estado IS NULL
                                 THEN GREATEST(0, "cantidadDisponible" - ocupadas) ELSE 0 END), 0)::int AS habitaciones_disponibles,
               BOOL_OR(ocupadas > 0) AS esta_reservado
        FROM rooms
        GROUP BY "alojamientoId"
      )
      SELECT pg.id, pg.nombre, pg.descripcion, pg."imagenUrl", pg.estado, pg.destino, pg.total_results,
             ra."precioPorNoche", COALESCE(ra.habitaciones, 0) AS habitaciones,
             COALESCE(ra.habitaciones_disponibles, 0) AS habitaciones_disponibles,
             COALESCE(ra.esta_reservado, false) AS esta_reservado,
             EXISTS (
               SELECT 1 FROM alojamientos_servicios aser
               JOIN servicios s ON s.id = aser."servicioId"
               WHERE aser."alojamientoId" = pg.id AND s.nombre = 'Piscina'
             ) AS "tienePiscina"
      FROM page pg
      LEFT JOIN rooms_agg ra ON ra.aid = pg.id
      ORDER BY pg.id ASC
    `;

    const rows = await this.alojamientoRepository.query(query, params);

    let totalResults = rows.length > 0 ? Number(rows[0].total_results) : 0;
    if (rows.length === 0 && p > 1) {
      // Página fuera de rango: recuperar el total real para metadata correcta
      const countRes = await this.alojamientoRepository.query(
        `SELECT COUNT(*)::int AS total
         FROM alojamientos a
         LEFT JOIN ubicaciones u ON a."ubicacionId" = u.id
         LEFT JOIN ciudades c ON u."ciudadId" = c.id
         ${whereClause}`,
        params,
      );
      totalResults = Number(countRes[0]?.total || 0);
    }

    const data = rows.map((item: any) => ({
      id: item.id,
      nombre: item.nombre,
      descripcion: item.descripcion,
      imagenUrl: item.imagenUrl,
      destino: item.destino || 'Ecuador',
      estrellas: 5,
      precioPorNoche: Number(item.precioPorNoche || 85).toFixed(2),
      moneda: 'USD',
      permitePaquete: true,
      habitacionesDisponibles: Number(item.habitaciones_disponibles ?? 0),
      estaReservado: Boolean(item.esta_reservado),
      tienePiscina: item.tienePiscina,
    }));

    return {
      data,
      metadata: {
        total_results: totalResults,
        page: p,
        limit: l,
        total_pages: Math.ceil(totalResults / l),
        has_next: p * l < totalResults,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Módulo de Clientes (Requisito de Cátedra)
  // ═══════════════════════════════════════════════════════════════════════

  async getClient(email?: string, identificacion?: string): Promise<any> {
    if (!email && !identificacion) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/validation-failed',
          title: 'Validation Failed',
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_FAILED',
          detail: 'Debe proporcionar email o identificacion para buscar al cliente.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const rows = await this.alojamientoRepository.query(
      `SELECT client_id, nombre, email, identificacion, telefono
       FROM clientes
       WHERE ($1::text IS NOT NULL AND email = $1)
          OR ($2::text IS NOT NULL AND identificacion = $2)
       LIMIT 1`,
      [email || null, identificacion || null],
    );

    if (rows && rows.length > 0) {
      return rows[0];
    }

    // Fallback en tabla usuarios
    const userRows = await this.alojamientoRepository.query(
      `SELECT id as client_id, "nombreCompleto" as nombre, email, COALESCE(identificacion, '') as identificacion, telefono
       FROM usuarios
       WHERE ($1::text IS NOT NULL AND email = $1)
          OR ($2::text IS NOT NULL AND identificacion = $2)
       LIMIT 1`,
      [email || null, identificacion || null],
    );

    if (userRows && userRows.length > 0) {
      return userRows[0];
    }

    throw new ProblemDetailsException(
      {
        type: 'https://api.booking-hub.com/errors/not-found',
        title: 'Client Not Found',
        status: HttpStatus.NOT_FOUND,
        code: 'NOT_FOUND',
        detail: 'Cliente no encontrado con los criterios proporcionados.',
      },
      HttpStatus.NOT_FOUND,
    );
  }

  async createClient(dto: any): Promise<any> {
    const nombre = dto.nombre || dto.nombreCompleto;
    const email = dto.email;
    const identificacion = dto.identificacion;
    const telefono = dto.telefono || '+593991234567';

    if (!nombre || !email || !identificacion) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/validation-failed',
          title: 'Validation Failed',
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_FAILED',
          detail: 'Los campos nombre, email e identificacion son requeridos.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validar cédula ecuatoriana
    const valResult = validarIdentificacion(String(identificacion).trim());
    if (!valResult.valido) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/invalid-document',
          title: 'Invalid Document',
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: 'INVALID_DOCUMENT',
          detail: valResult.mensaje || 'Documento de identidad no válido (algoritmo módulo 10 SRI).',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Verificar si ya existe
    const existing = await this.alojamientoRepository.query(
      `SELECT client_id, nombre, email, identificacion, telefono
       FROM clientes
       WHERE email = $1 OR identificacion = $2
       LIMIT 1`,
      [email, identificacion],
    );

    if (existing && existing.length > 0) {
      return existing[0];
    }

    const clientId = crypto.randomUUID();

    await this.alojamientoRepository.query(
      `INSERT INTO clientes (client_id, nombre, email, identificacion, telefono)
       VALUES ($1, $2, $3, $4, $5)`,
      [clientId, nombre, email, identificacion, telefono],
    );

    await this.alojamientoRepository.query(
      `INSERT INTO usuarios (id, "nombreCompleto", email, telefono, identificacion, contrasena)
       VALUES ($1, $2, $3, $4, $5, 'CLIENTE_GDS_GUEST')
       ON CONFLICT (id) DO UPDATE
       SET "nombreCompleto" = EXCLUDED."nombreCompleto", email = EXCLUDED.email, 
           telefono = EXCLUDED.telefono, identificacion = EXCLUDED.identificacion`,
      [clientId, nombre, email, telefono, identificacion],
    );

    return {
      client_id: clientId,
      nombre,
      email,
      identificacion,
      telefono,
    };
  }


  /** Única implementación del check-in: ReservasService (validaciones + registro local + push a Booking). */
  async checkInOrder(orderId: string, body?: any): Promise<any> {
    return this.reservasService.checkInOrder(orderId, body);
  }

  async checkOutOrder(orderId: string, body?: any): Promise<any> {
    const order = await this.reservasService.getOrder(orderId);

    await this.alojamientoRepository.query(
      `UPDATE reservas 
       SET "fechaSalida" = LEAST("fechaSalida", CURRENT_DATE - INTERVAL '1 day')
       WHERE id = $1 OR "ordenId"::text = $1`,
      [order.id],
    );

    try {
      const hisId = `HIS-${Math.floor(1000 + Math.random() * 9000)}`;
      await this.alojamientoRepository.query(
        `INSERT INTO historial_reservas (id, "reservaId", "estadoAnteriorId", "estadoNuevoId", notas)
         VALUES ($1, $2, $3, $3, $4)`,
        [hisId, order.id, order.estadoId || 'EST-002', 'Check-out completado. Habitación y alojamiento liberados para nuevas reservas.'],
      );
    } catch (e: any) {
      console.warn(`[CHECKOUT-HISTORIAL] Advertencia: ${e?.message}`);
    }

    return {
      orderId: order.ordenId || order.id,
      reservaId: order.ordenId || order.id,
      estado: 'CHECKED_OUT',
      habitacionLiberada: order.habitacionNombre || 'Habitación Estándar',
      checkOutHora: new Date().toISOString(),
      consumosAdicionales: '0.00',
      claveDigitalRevocada: true,
      mensaje: 'Check-out completado con éxito. ¡El alojamiento ha sido liberado y vuelve a estar en línea!',
    };
  }

  async setEarlyCheckin(orderId: string, body?: any): Promise<any> {
    const order = await this.reservasService.getOrder(orderId);
    const autorizado = body?.autorizado !== undefined ? Boolean(body.autorizado) : true;

    await this.alojamientoRepository.query(
      `UPDATE reservas 
       SET "earlyCheckinAutorizado" = $1, "habilitadoDesde" = $2
       WHERE id = $3 OR "ordenId"::text = $3`,
      [autorizado, new Date().toISOString(), order.id],
    );

    return {
      orderId: order.ordenId || order.id,
      estado: order.estado || 'CONFIRMED',
      earlyCheckinAutorizado: autorizado,
      habilitadoDesde: new Date().toISOString(),
      motivo: body?.motivo || 'Autorizado por la administración',
    };
  }

  async listOrders(sagaId?: string, idempotencyKey?: string, page: string = '1', limit: string = '50'): Promise<any> {
    // Si se envía idempotency_key para recuperación de Saga tras timeout (Requisito 2)
    if (idempotencyKey) {
      const cached = await this.idempotencyService.findByKey(idempotencyKey);
      if (cached) {
        return {
          ...cached,
          order: cached,
          orders: [cached],
          data: [cached],
          total: 1,
          metadata: { total_results: 1, page: 1, limit: 1, total_pages: 1, has_next: false },
        };
      }

      // Si no estaba en la tabla de idempotencia, buscar en reservas
      const resRows = await this.alojamientoRepository.query(
        `SELECT r.id, r."ordenId", r."ordenId" as "orderId", r."ordenId" as "externalOrderId",
                r."fechaEntrada" as "checkinFecha", r."fechaSalida" as "checkoutFecha",
                r."precioTotal" as "totalPagar", r."estadoId",
                CASE 
                  WHEN r."checkinRealizado" = true THEN 'CHECKED_IN'
                  WHEN r."estadoId" = 'EST-003' THEN 'CANCELLED'
                  WHEN r."estadoId" = 'EST-002' THEN 'CONFIRMED'
                  ELSE 'PENDING'
                END as "estado",
                e.nombre as "habitacionNombre", e.codigo as "tipoHabitacionCodigo",
                a.nombre as "alojamientoNombre", a.id as "alojamientoId"
         FROM reservas r
         JOIN espacios_rentables e ON r."espacioId" = e.id
         JOIN alojamientos a ON e."alojamientoId" = a.id
         LEFT JOIN contratos c ON c."reservaId" = r.id
         WHERE r."ordenId"::text = $1 OR c.terminos ILIKE '%' || $1 || '%'
         LIMIT 1`,
        [idempotencyKey],
      );

      if (resRows && resRows.length > 0) {
        const orderObj = {
          ...resRows[0],
          orderId: resRows[0].ordenId || resRows[0].id,
          reservaId: resRows[0].id,
          total: resRows[0].totalPagar,
        };
        return {
          ...orderObj,
          order: orderObj,
          orders: [orderObj],
          data: [orderObj],
          total: 1,
          metadata: { total_results: 1, page: 1, limit: 1, total_pages: 1, has_next: false },
        };
      }
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (p - 1) * l;

    let query = `
      SELECT r.id, r."ordenId", r."ordenId" as "orderId", r."ordenId" as "externalOrderId",
             r."fechaEntrada" as "checkinFecha", r."fechaSalida" as "checkoutFecha",
             r."precioTotal" as "totalPagar", r."estadoId", er.nombre as "estadoNombre",
             CASE 
               WHEN r."checkinRealizado" = true THEN 'CHECKED_IN'
               WHEN r."estadoId" = 'EST-003' THEN 'CANCELLED'
               WHEN r."estadoId" = 'EST-002' THEN 'CONFIRMED'
               ELSE 'PENDING'
             END as "estado",
             e.nombre as "habitacionNombre", e.codigo as "tipoHabitacionCodigo",
             a.nombre as "alojamientoNombre", a.id as "alojamientoId",
             u."nombreCompleto" as "titularNombre", u.email as "titularEmail"
      FROM reservas r
      JOIN estados_reserva er ON r."estadoId" = er.id
      JOIN espacios_rentables e ON r."espacioId" = e.id
      JOIN alojamientos a ON e."alojamientoId" = a.id
      JOIN usuarios u ON r."usuarioId" = u.id
      LEFT JOIN contratos c ON c."reservaId" = r.id
    `;
    const params: any[] = [];
    if (sagaId) {
      params.push(`%${sagaId}%`);
      query += ` WHERE c.terminos ILIKE $${params.length} OR r."ordenId"::text ILIKE $${params.length}`;
    }
    query += ` ORDER BY r."fechaCreacion" DESC LIMIT ${l} OFFSET ${offset}`;
    const rows = await this.alojamientoRepository.query(query, params);

    return {
      orders: rows,
      total: rows.length,
      page: p,
      limit: l,
    };
  }
}