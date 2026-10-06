import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CrearUsuarioDto } from '../usuarios/dto/crear-usuario.dto';
import { UsuariosService } from '../usuarios/usuarios.service';
import { IsString, IsNumber, IsOptional, IsEmail, Min, Max } from 'class-validator';

export class UpdateProfileDto {
  @IsEmail()
  correo: string;

  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsNumber()
  @IsOptional()
  @Min(18, { message: 'Debe ser mayor de edad (18+)' })
  @Max(120)
  edad?: number;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  pais?: string;
}

export class GetProfileDto {
  @IsEmail()
  correo: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usuariosService: UsuariosService
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión y obtener Token' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario (Admin o User)' })
  register(@Body() crearUsuarioDto: CrearUsuarioDto) {
    return this.usuariosService.create(crearUsuarioDto);
  }

  @Post('update-profile')
  @ApiOperation({ summary: 'Actualizar perfil del usuario' })
  updateProfile(@Body() body: UpdateProfileDto) {
    return this.usuariosService.updateProfile(body.correo, body);
  }

  @Post('me')
  @ApiOperation({ summary: 'Obtener datos completos del usuario por correo' })
  getProfile(@Body() body: GetProfileDto) {
    return this.usuariosService.findOneByEmail(body.correo);
  }
}
