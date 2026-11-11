import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, IsOptional } from 'class-validator';
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
}
