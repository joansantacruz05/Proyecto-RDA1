import { Injectable, ExecutionContext, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProblemDetailsException } from '../../../common/exceptions/problem-details.exception';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-api-key'] || request.headers['X-API-Key'];

    // Soporte para X-API-Key (acordada con Booking Hub)
    if (apiKeyHeader && String(apiKeyHeader).trim().length > 0) {
      request.user = {
        id: 'NODE_SYSTEM_HUB',
        sub: 'NODE_SYSTEM_HUB',
        nombre: 'Booking Integration Hub',
        correo: 'integraciones@booking-hub.com',
        rol: 'ADMIN',
        scope: 'alojamientos:read alojamientos:book alojamientos:cancel alojamientos:webhooks',
        scopes: ['alojamientos:read', 'alojamientos:book', 'alojamientos:cancel', 'alojamientos:webhooks'],
      };
      return true;
    }

    // Si no viene Authorization Bearer ni X-API-Key -> 401 UNAUTHORIZED
    if (!request.headers.authorization) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/unauthorized',
          title: 'Unauthorized',
          status: HttpStatus.UNAUTHORIZED,
          code: 'UNAUTHORIZED',
          detail: 'Authentication is required to access this resource. Provide a valid X-API-Key or Bearer token.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Fallback a autenticación Bearer JWT estándar
    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/unauthorized',
          title: 'Unauthorized',
          status: HttpStatus.UNAUTHORIZED,
          code: 'UNAUTHORIZED',
          detail: 'Invalid or expired Bearer token.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
