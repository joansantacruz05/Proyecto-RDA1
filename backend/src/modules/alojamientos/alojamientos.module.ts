import { Module } from '@nestjs/common';
import { AlojamientosService } from './alojamientos.service';
import { AlojamientosController } from './alojamientos.controller';
import { AlojamientosGrpcController } from './alojamientos.grpc.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alojamiento } from './entities/alojamiento.entity';
import { CommonModule } from '../../common/common.module';

import { ReservasModule } from '../reservas/reservas.module';

@Module({
  imports: [TypeOrmModule.forFeature([Alojamiento]), CommonModule, ReservasModule],
  controllers: [AlojamientosController, AlojamientosGrpcController],
  providers: [AlojamientosService],
})
export class AlojamientosModule {}
