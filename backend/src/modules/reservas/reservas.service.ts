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
    const { alojamientoId, ...reservaData } = crearReservaDto;

    const alojamiento = await this.alojamientoRepository.findOneBy({ id: alojamientoId });
    if (!alojamiento) {
      throw new NotFoundException(`Alojamiento con ID ${alojamientoId} no encontrado`);
    }

    const reserva = this.reservaRepository.create({
      ...reservaData,
      alojamiento,
    });

    return await this.reservaRepository.save(reserva);
  }

  async findAll() {
    return await this.reservaRepository.find({
      relations: ['alojamiento'],
    });
  }

  async findOne(id: string) {
    const reserva = await this.reservaRepository.findOne({
      where: { id },
      relations: ['alojamiento'],
    });
    if (!reserva) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }
    return reserva;
  }
}
