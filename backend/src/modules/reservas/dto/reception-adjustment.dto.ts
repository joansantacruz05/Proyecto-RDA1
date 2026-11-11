import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExtraCargoDto {
  @ApiPropertyOptional({ example: 'EXT-cama-1' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ example: 'Cama adicional' })
  @IsString()
  concepto: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiPropertyOptional({ example: 25.0, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioUnitario: number;
}

export class ReceptionAdjustmentDto {
  @ApiPropertyOptional({ example: 3, description: 'Número real de huéspedes que llegan a recepción' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  huespedesReales?: number;

  @ApiPropertyOptional({ example: 'ESP-002', description: 'ID de la nueva habitación dentro del mismo alojamiento' })
  @IsOptional()
  @IsString()
  espacioId?: string;

  @ApiPropertyOptional({ type: [ExtraCargoDto], description: 'Lista completa de cargos adicionales / extras de estancia' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraCargoDto)
  extras?: ExtraCargoDto[];

  @ApiPropertyOptional({ example: 'Cliente solicitó habitación en piso alto y late check-out.' })
  @IsOptional()
  @IsString()
  notasRecepcion?: string;
}

