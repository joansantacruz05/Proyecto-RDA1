import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CrearAlojamientoDto {
  @ApiProperty({ example: 'Hotel Mar y Sol', description: 'Nombre del alojamiento' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Manta', description: 'Destino o ciudad del alojamiento' })
  @IsString()
  @IsNotEmpty()
  destino: string;

  @ApiProperty({ example: 45.50, description: 'Precio por noche en USD' })
  @IsNumber()
  @IsPositive()
  precioPorNoche: number;

  @ApiProperty({ example: 2, description: 'Capacidad máxima de adultos' })
  @IsInt()
  @IsPositive()
  capacidadAdultos: number;

  @ApiProperty({ example: 1, description: 'Capacidad máxima de niños' })
  @IsInt()
  @IsOptional()
  capacidadNinos?: number;

  @ApiProperty({ example: 1, description: 'Cantidad de habitaciones' })
  @IsInt()
  @IsPositive()
  habitaciones: number;

  @ApiProperty({ example: true, description: 'Indica si tiene piscina' })
  @IsBoolean()
  @IsOptional()
  tienePiscina?: boolean;

  @ApiProperty({ example: true, description: 'Habilitar para Paquete Exclusivo LuxeStays' })
  @IsBoolean()
  @IsOptional()
  permitePaquete?: boolean;

  @ApiProperty({ example: 'Activo', description: 'Estado del alojamiento' })
  @IsString()
  @IsOptional()
  estado?: string;

  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  codigo?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  imagenUrl?: string;

  @IsString()
  @IsOptional()
  imagenesUrls?: string;

  @IsString()
  @IsOptional()
  ubicacionId?: string;

  @IsString()
  @IsOptional()
  ciudad?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  categoria?: string;

  @IsString()
  @IsOptional()
  tipo?: string;

  @IsNumber()
  @IsOptional()
  estrellas?: number;

  @IsString()
  @IsOptional()
  propietario?: string;

  @IsNumber()
  @IsOptional()
  habitaciones_disponibles?: number;

  @IsBoolean()
  @IsOptional()
  liberarReservas?: boolean;

  @ApiProperty({ example: -0.1807, description: 'Latitud GPS en grados decimales', required: false })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitud?: number;

  @ApiProperty({ example: -78.4678, description: 'Longitud GPS en grados decimales', required: false })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitud?: number;

  @ApiProperty({ example: '14:00', description: 'Hora de check-in en formato HH:MM', required: false })
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: 'horaCheckIn debe tener formato HH:MM (ej: 14:00)' })
  @IsOptional()
  horaCheckIn?: string;

  @ApiProperty({ example: '11:00', description: 'Hora de check-out en formato HH:MM', required: false })
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: 'horaCheckOut debe tener formato HH:MM (ej: 11:00)' })
  @IsOptional()
  horaCheckOut?: string;

  @ApiProperty({ example: 2, description: 'Número físico de habitaciones/ambientes del alojamiento', required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  numHabitaciones?: number;

  @ApiProperty({ example: 3, description: 'Número total de camas disponibles', required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  numCamas?: number;

  @ApiProperty({ example: '1 Cama King + 1 Sofa Cama', description: 'Detalle o tipo de camas', required: false })
  @IsString()
  @IsOptional()
  tipoCamas?: string;
}
