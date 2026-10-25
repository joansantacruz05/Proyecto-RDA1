import { CanActivate, ExecutionContext, Injectable, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { ProblemDetailsException } from '../exceptions/problem-details.exception';

/**
 * Guard que exige la cabecera `Idempotency-Key` en formato UUID v4.
 * Conforme al contrato del Hub (GDS Alojamientos Core API).
 */
@Injectable()
export class IdempotencyKeyGuard implements CanActivate {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const idempotencyKey = request.headers['idempotency-key'] as string | undefined;

    if (!idempotencyKey || idempotencyKey.trim() === '') {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/missing-idempotency-key',
          title: 'Idempotency-Key header is required',
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_FAILED',
          detail:
            'All transactional endpoints (/orders/create, /orders/{id}/modify, /orders/{id}/cancel) require an Idempotency-Key header (UUID v4) to prevent duplicate operations.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!IdempotencyKeyGuard.UUID_REGEX.test(idempotencyKey.trim())) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/invalid-idempotency-key',
          title: 'Invalid Idempotency-Key format',
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_FAILED',
          detail: `The Idempotency-Key header must be a valid UUID v4. Received: "${idempotencyKey}".`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return true;
  }
}
