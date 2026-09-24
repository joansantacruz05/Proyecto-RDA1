import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
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
  capacidadNinos: number;

  @ApiProperty({ example: 1, description: 'Cantidad de habitaciones' })
  @IsInt()
  @IsPositive()
  habitaciones: number;

  @ApiProperty({ example: true, description: 'Indica si tiene piscina' })
  @IsBoolean()
  tienePiscina: boolean;
}
