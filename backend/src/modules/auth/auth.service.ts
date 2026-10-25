import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from '../usuarios/usuarios.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import * as bcryptjs from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private getScopesForRole(rol: string): string {
    const roleLower = (rol || '').toLowerCase();
    if (roleLower.includes('admin')) {
      return 'alojamientos:read alojamientos:book alojamientos:cancel alojamientos:webhooks';
    }
    // Roles de Cliente, Huésped o Anfitrión
    return 'alojamientos:read alojamientos:book alojamientos:cancel';
  }

  async login(loginDto: LoginDto) {
    const usuario = await this.usuariosService.findOneByEmail(loginDto.correo);
    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcryptjs.compare(loginDto.contrasena, usuario.contrasena);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const issuer = this.configService.get<string>('JWT_ISSUER') || 'https://auth.booking-hub.com';
    const audience = this.configService.get<string>('JWT_AUDIENCE') || 'https://api.booking-hub.com';
    const scopes = this.getScopesForRole(usuario.rol);

    const payload = {
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      scope: scopes,
      iss: issuer,
      aud: audience,
    };

    return {
      access_token: this.jwtService.sign(payload, {
        issuer,
        audience,
      }),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        scopes: scopes.split(' '),
      },
    };
  }
}
