import { PartialType } from '@nestjs/swagger';
import { CrearAlojamientoDto } from './crear-alojamiento.dto';

export class ActualizarAlojamientoDto extends PartialType(CrearAlojamientoDto) {}
