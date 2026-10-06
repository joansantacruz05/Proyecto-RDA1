import { IsDateString, IsEmail, IsNotEmpty, IsNumber, IsPositive, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CrearReservaDto {
  @ApiProperty({ example: 'Juan Perez', description: 'Nombre del cliente' })
  @IsString()
  @IsNotEmpty()
  nombreCliente: string;

  @ApiProperty({ example: 'juan@example.com', description: 'Email del cliente' })
  @IsEmail()
  emailCliente: string;

  @ApiProperty({ example: '2026-10-01', description: 'Fecha de inicio de la reserva' })
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({ example: '2026-10-05', description: 'Fecha de fin de la reserva' })
  @IsDateString()
  fechaFin: string;

  @ApiProperty({ example: 2, description: 'Número de personas' })
  @IsNumber()
  @IsPositive()
  numeroPersonas: number;

  @ApiProperty({ example: 180.50, description: 'Total a pagar' })
  @IsNumber()
  @IsPositive()
  totalPagar: number;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del alojamiento a reservar' })
  @IsString()
  alojamientoId: string;
}
