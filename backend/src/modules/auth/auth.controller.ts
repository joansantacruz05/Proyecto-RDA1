import { Controller, Post, Get, Patch, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CrearUsuarioDto } from '../usuarios/dto/crear-usuario.dto';
import { UsuariosService } from '../usuarios/usuarios.service';
import { IsString, IsOptional, Min, Max } from 'class-validator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsOptional()
  @Min(18, { message: 'Debe ser mayor de edad (18+)' })
  @Max(120, { message: 'La edad ingresada no es válida' })
  edad?: number;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  pais?: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usuariosService: UsuariosService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión y obtener Token JWT' })
  @ApiResponse({ status: 200, description: 'Token emitido exitosamente' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de validación inválidos o correo duplicado' })
  register(@Body() crearUsuarioDto: CrearUsuarioDto) {
    return this.usuariosService.create(crearUsuarioDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado (sin contraseñas)' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  getProfile(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.usuariosService.getProfile(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  updateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    const userId = req.user?.sub || req.user?.id;
    return this.usuariosService.updateProfile(userId, body);
  }

  // Alias compatibles para peticiones heredadas
  @Post('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alias POST /auth/me para compatibilidad' })
  postProfile(@Req() req: any, @Body() body: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.usuariosService.getProfile(userId);
  }

  @Post('update-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alias POST /auth/update-profile para compatibilidad' })
  postUpdateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    const userId = req.user?.sub || req.user?.id;
    return this.usuariosService.updateProfile(userId, body);
  }
}
