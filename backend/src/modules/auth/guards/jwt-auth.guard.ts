import { Injectable, ExecutionContext, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';
import { ProblemDetailsException } from '../../../common/exceptions/problem-details.exception';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

function timingSafeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) {
    // Mitigación de timing attack por longitud
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-api-key'] || request.headers['X-API-Key'];

    // Si viene la cabecera X-API-Key, validar obligatoriamente en tiempo constante contra INTEGRATION_API_KEY
    if (apiKeyHeader !== undefined && apiKeyHeader !== null) {
      const providedKey = String(apiKeyHeader).trim();
      const expectedKey = process.env.INTEGRATION_API_KEY || process.env.API_KEY || '';

      if (!expectedKey || !timingSafeCompare(providedKey, expectedKey)) {
        throw new ProblemDetailsException(
          {
            type: 'https://api.booking-hub.com/errors/unauthorized',
            title: 'Unauthorized',
            status: HttpStatus.UNAUTHORIZED,
            code: 'UNAUTHORIZED',
            detail: 'X-API-Key inválida o no autorizada.',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Clave válida de integración Booking Core
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

    // Rutas @Public(): acceso libre, pero si el cliente manda un Bearer válido se identifica
    // (autenticación opcional). Un Bearer inválido NO bloquea la ruta pública; simplemente
    // se trata como anónimo. Nunca se concede identidad por cabeceras no verificadas.
    if (isPublic) {
      if (request.headers.authorization) {
        try {
          await super.canActivate(context);
        } catch {
          request.user = undefined;
        }
      }
      return true;
    }

    // Si no viene Authorization Bearer -> 401 UNAUTHORIZED
    if (!request.headers.authorization) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/unauthorized',
          title: 'Unauthorized',
          status: HttpStatus.UNAUTHORIZED,
          code: 'UNAUTHORIZED',
          detail: 'Authentication is required to access this resource. Provide a valid Bearer token or X-API-Key.',
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
