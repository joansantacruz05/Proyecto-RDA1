import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, IsNumber, IsPositive, Matches, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../entities/usuario.entity';

export class CrearUsuarioDto {
  @ApiProperty({ example: 'Admin User' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'admin@admin.com' })
  @IsEmail()
  correo: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,16}$/, {
    message: 'La contraseña debe tener entre 8 y 16 caracteres, e incluir al menos una letra mayúscula, un número y un carácter especial.'
  })
  contrasena: string;

  @ApiProperty({ example: 'ADMIN', enum: Role, required: false })
  @IsOptional()
  @IsEnum(Role)
  rol?: string;

  @ApiProperty({ example: '+593999999999', required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ example: 25, required: false })
  @IsOptional()
  @IsNumber()
  @Min(18, { message: 'Debe ser mayor de edad (18+)' })
  @Max(120)
  edad?: number;
}
