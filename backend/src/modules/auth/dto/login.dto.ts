import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ example: 'admin@rda.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  correo: string;

  @ApiProperty({ example: 'Admin123!*' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida.' })
  contrasena: string;
}
