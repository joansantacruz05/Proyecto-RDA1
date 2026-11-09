import { IsOptional, IsString } from 'class-validator';

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  solicitadoPor?: string;

  @IsOptional()
  @IsString()
  requestedBy?: string;
}

