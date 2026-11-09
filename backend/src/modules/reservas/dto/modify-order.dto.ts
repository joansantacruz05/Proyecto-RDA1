import {
  IsString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IsNonPastDateGuayaquil,
  IsAfterDate,
  OcupantesDto,
  HuespedTitularDto,
} from './create-order.dto';

export class ModifyOrderDto {
  @IsOptional()
  @IsNonPastDateGuayaquil()
  fechaInicio?: string;

  @IsOptional()
  @IsNonPastDateGuayaquil()
  checkin?: string;

  @IsOptional()
  @IsAfterDate('fechaInicio')
  fechaFin?: string;

  @IsOptional()
  @IsAfterDate('checkin')
  checkout?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OcupantesDto)
  ocupantes?: OcupantesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => HuespedTitularDto)
  huespedTitular?: HuespedTitularDto;

  @IsOptional()
  totalPagar?: number | string;

  @IsOptional()
  @IsString()
  peticionesEspeciales?: string;

  @IsOptional()
  @IsString()
  regimenSeleccionado?: string;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

