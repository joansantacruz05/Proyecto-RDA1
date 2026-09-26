import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
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

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  contrasena: string;

  @ApiProperty({ example: 'ADMIN', enum: Role, required: false })
  @IsOptional()
  @IsEnum(Role)
  rol?: string;
}
