import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservasService } from './reservas.service';
import { ReservasController } from './reservas.controller';
import { Reserva } from './entities/reserva.entity';
import { Alojamiento } from '../alojamientos/entities/alojamiento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reserva, Alojamiento])],
  controllers: [ReservasController],
  providers: [ReservasService],
})
export class ReservasModule {}
