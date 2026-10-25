import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
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

    // If no key is provided, let it proceed (IdempotencyKeyGuard will reject if mandatory)
    if (!idempotencyKey) {
      return next.handle();
    }

    // Check if key is already stored and validate body hash
    const check = await this.idempotencyService.validateAndGetCached(idempotencyKey, req.body);

    if (check.isCached) {
      // Replay stored response
      if (check.statusCode) {
        res.status(check.statusCode);
      }
      return of(check.response);
    }

    // Otherwise execute handler and save result
    return next.handle().pipe(
      tap(async (responseBody) => {
        const statusCode = res.statusCode || 200;
        await this.idempotencyService.saveKey(
          idempotencyKey,
          check.hash || this.idempotencyService.computeHash(req.body),
          statusCode,
          responseBody,
        );
      }),
    );
  }
}
