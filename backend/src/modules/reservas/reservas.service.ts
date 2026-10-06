import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reserva } from './entities/reserva.entity';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { Alojamiento } from '../alojamientos/entities/alojamiento.entity';

@Injectable()
export class ReservasService {
  constructor(
    @InjectRepository(Reserva)
    private readonly reservaRepository: Repository<Reserva>,
    @InjectRepository(Alojamiento)
    private readonly alojamientoRepository: Repository<Alojamiento>,
  ) {}

  async create(crearReservaDto: CrearReservaDto) {
    const { alojamientoId, nombreCliente, emailCliente, fechaInicio, fechaFin, totalPagar, numeroPersonas } = crearReservaDto;

    const user = await this.reservaRepository.query(`SELECT id FROM usuarios WHERE email = $1`, [emailCliente]);
    const usuarioId = user[0]?.id || null;

    const espacio = await this.reservaRepository.query(`SELECT id FROM espacios_rentables WHERE "alojamientoId" = $1 LIMIT 1`, [alojamientoId]);
    const espacioId = espacio[0]?.id || null;

    const newId = 'RES-' + Math.floor(10000 + Math.random() * 90000);

    await this.reservaRepository.query(`
      INSERT INTO reservas (id, "usuarioId", "espacioId", "estadoId", "fechaEntrada", "fechaSalida", "precioTotal", "numeroPersonas")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [newId, usuarioId, espacioId, 'EST-001', fechaInicio, fechaFin, totalPagar, numeroPersonas]);

    const contratoId = 'CON-' + Math.floor(10000 + Math.random() * 90000);
    const terminos = `Contrato de Arrendamiento Temporal.\n\nEl cliente ${nombreCliente} acuerda rentar el alojamiento desde ${fechaInicio} hasta ${fechaFin} por un total de $${totalPagar}.\nEl cliente acepta acatar las normas del alojamiento y cubrir cualquier daño a la propiedad.`;
    await this.reservaRepository.query(`
      INSERT INTO contratos (id, "reservaId", terminos, firmado)
      VALUES ($1, $2, $3, false)
    `, [contratoId, newId, terminos]);

    return { id: newId, status: 'success' };
  }

  async findAll() {
    return await this.reservaRepository.query(`SELECT * FROM reservas`);
  }

  async findAllAdmin() {
    return await this.reservaRepository.query(`
      SELECT 
        r.id, 
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
      ORDER BY r."fechaReserva" DESC
    `);
  }

  async findOne(id: string) {
    const result = await this.reservaRepository.query(`SELECT * FROM reservas WHERE id = $1`, [id]);
    if (!result[0]) throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    return result[0];
  }

  async findByEmail(email: string) {
    return await this.reservaRepository.query(`
      SELECT 
        r.id, 
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
    // 1. Marcar contrato como firmado con fecha actual
    await this.reservaRepository.query(`
      UPDATE contratos SET firmado = true, "fechaFirma" = CURRENT_TIMESTAMP WHERE "reservaId" = $1
    `, [reservaId]);
    
    // La reserva ya no se auto-aprueba (EST-002) aquí. El administrador lo hará manualmente.
    
    return { status: 'success', message: 'Contrato firmado y reserva confirmada' };
  }

  async cancelarReserva(id: string) {
    // Cambiar estado a 'EST-003' (Cancelada)
    await this.reservaRepository.query(`
      UPDATE reservas SET "estadoId" = 'EST-003' WHERE id = $1
    `, [id]);
    return { status: 'success', message: 'Reserva cancelada exitosamente' };
  }

  async aprobarReserva(id: string) {
    // Cambiar estado a 'EST-002' (Confirmada)
    await this.reservaRepository.query(`
      UPDATE reservas SET "estadoId" = 'EST-002' WHERE id = $1
    `, [id]);
    return { status: 'success', message: 'Reserva aprobada exitosamente' };
  }

  async getCancelaciones() {
    const canceladas = await this.reservaRepository.query(`
      SELECT 
        r.id as "reservaId",
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
