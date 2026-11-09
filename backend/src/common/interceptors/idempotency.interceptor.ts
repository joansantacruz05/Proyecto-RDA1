import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Response, Request } from 'express';
import { IdempotencyService } from '../services/idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();

    const idempotencyKey = (req.headers['idempotency-key'] as string | undefined)?.trim();

    // Si no se provee llave, permitir ejecución normal
    if (!idempotencyKey) {
      return next.handle();
    }

    const userId = (req as any).user?.sub || (req as any).user?.id || req.headers['x-client-id'] || 'ANONYMOUS';
    // Endpoint canónico sin parámetros query
    const endpoint = (req.originalUrl || req.url || 'DEFAULT').split('?')[0];

    // Reclamo atómico de la llave
    const check = await this.idempotencyService.claimKey(
      idempotencyKey,
      req.body,
      String(userId),
      endpoint,
    );

    if (check.isCached) {
      // Replay stored response con cabecera Idempotent-Replayed: true
      res.setHeader('Idempotent-Replayed', 'true');
      if (check.statusCode) {
        res.status(check.statusCode);
      }
      return of(check.response);
    }

    // Adjuntar metadatos de idempotencia a la request para uso en la transacción
    (req as any).idempotencyInfo = {
      key: idempotencyKey,
      userId: String(userId),
      endpoint,
      hash: check.hash,
    };

    return next.handle().pipe(
      tap(async (responseBody) => {
        const statusCode = res.statusCode || 201;
        // Completar la llave si no fue completada en la transacción interna
        await this.idempotencyService.completeKey(
          idempotencyKey,
          String(userId),
          endpoint,
          statusCode,
          responseBody,
        );
      }),
      catchError((err) => {
        // En caso de excepción, liberar el reclamo IN_PROGRESS para permitir reintentos válidos
        this.idempotencyService.releaseClaim(idempotencyKey, String(userId), endpoint);
        return throwError(() => err);
      }),
    );
  }
}
