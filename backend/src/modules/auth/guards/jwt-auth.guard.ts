import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-api-key'] || request.headers['X-API-Key'];
    const configuredApiKey = process.env.API_KEY;

    // Soporte para X-API-Key (acordada con Booking Hub)
    if (apiKeyHeader) {
      if (configuredApiKey && apiKeyHeader === configuredApiKey) {
        request.user = {
          id: 'NODE_SYSTEM_HUB',
          sub: 'NODE_SYSTEM_HUB',
          nombre: 'Booking Integration Hub',
          correo: 'integraciones@booking-hub.com',
          rol: 'ADMIN',
          scope: 'alojamientos:read alojamientos:book alojamientos:cancel alojamientos:webhooks',
        };
        return true;
      } else {
        throw new UnauthorizedException('X-API-Key inválida o no coincide con la configurada.');
      }
    }

    // Fallback a autenticación Bearer JWT estándar
    return (super.canActivate(context) as Promise<boolean>);
  }
}
