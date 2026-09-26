import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@admin.com' })
  @IsEmail()
  correo: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  contrasena: string;
}
