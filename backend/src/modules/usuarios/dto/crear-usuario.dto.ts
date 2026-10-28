import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../entities/usuario.entity';
import { PASSWORD_REGEX, PASSWORD_RULES_MESSAGE } from '../../../common/utils/password-rules';

export class CrearUsuarioDto {
  @ApiProperty({ example: 'Sebastián Vallejo' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es obligatorio.' })
  nombre: string;

  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  correo: string;

  @ApiProperty({ example: 'PassSecure123!*' })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_RULES_MESSAGE })
  contrasena: string;

  @ApiProperty({ example: 'Cliente', enum: Role, required: false })
  @IsOptional()
  @IsEnum(Role)
  rol?: Role;

  @ApiProperty({ example: '+593999999999', required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ example: 25, required: false })
  @IsOptional()
  @Min(18, { message: 'Debe ser mayor de edad (18 años en adelante).' })
  @Max(120, { message: 'La edad ingresada no es válida.' })
  edad?: number;
}
