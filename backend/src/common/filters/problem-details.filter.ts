import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ProblemDetailsPayload, ProblemErrorCode } from '../exceptions/problem-details.exception';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: ProblemDetailsPayload;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'type' in exceptionResponse &&
        'title' in exceptionResponse &&
        'code' in exceptionResponse
      ) {
        // Already structured as ProblemDetails
        const raw = exceptionResponse as any;
        payload = {
          type: raw.type,
          title: raw.title,
          status: status,
          code: raw.code as ProblemErrorCode,
        };
        if (raw.detail) payload.detail = raw.detail;
        if (raw.invalidParams) payload.invalidParams = raw.invalidParams;
      } else {
        // Map standard NestJS exceptions to ProblemDetails
        let title = 'An error occurred';
        let type = 'https://api.booking-hub.com/errors/general-error';
        let code: ProblemErrorCode = 'VALIDATION_FAILED';
        let detail: string | undefined = undefined;
        let invalidParams: Array<{ name: string; reason: string }> | undefined = undefined;

        if (status === HttpStatus.BAD_REQUEST) {
          title = 'Validation Failed';
          type = 'https://api.booking-hub.com/errors/validation-failed';
          code = 'VALIDATION_FAILED';
          if (typeof exceptionResponse === 'object' && (exceptionResponse as any).message) {
            const msg = (exceptionResponse as any).message;
            if (Array.isArray(msg)) {
              detail = msg.join('; ');
              invalidParams = msg.map((m: string) => ({ name: 'field', reason: m }));
            } else {
              detail = String(msg);
            }
          }
        } else if (status === HttpStatus.NOT_FOUND) {
          title = 'Resource Not Found';
          type = 'https://api.booking-hub.com/errors/not-found';
          code = 'VALIDATION_FAILED';
          detail = typeof exceptionResponse === 'string' ? exceptionResponse : (exceptionResponse as any).message;
        } else if (status === HttpStatus.UNAUTHORIZED) {
          title = 'Unauthorized';
          type = 'https://api.booking-hub.com/errors/unauthorized';
          code = 'VALIDATION_FAILED';
          detail = 'Authentication is required to access this resource';
        } else if (status === HttpStatus.FORBIDDEN) {
          title = 'Forbidden';
          type = 'https://api.booking-hub.com/errors/forbidden';
          code = 'VALIDATION_FAILED';
          detail = 'Insufficient permissions or scope';
        } else if (status === HttpStatus.CONFLICT) {
          title = 'Conflict';
          type = 'https://api.booking-hub.com/errors/conflict';
          code = 'ROOM_NO_LONGER_AVAILABLE';
          detail = typeof exceptionResponse === 'string' ? exceptionResponse : (exceptionResponse as any).message;
        } else if (status === HttpStatus.TOO_MANY_REQUESTS) {
          title = 'Too Many Requests';
          type = 'https://api.booking-hub.com/errors/rate-limit-exceeded';
          code = 'RATE_LIMIT_EXCEEDED';
          detail = 'Rate limit exceeded. Please try again later.';
        } else {
          title = 'Internal Server Error';
          type = 'https://api.booking-hub.com/errors/internal-server-error';
          code = 'VALIDATION_FAILED';
        }

        payload = {
          type,
          title,
          status,
          code,
        };
        if (detail) payload.detail = detail;
        if (invalidParams) payload.invalidParams = invalidParams;
      }
    } else {
      // Unknown runtime error
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      payload = {
        type: 'https://api.booking-hub.com/errors/internal-server-error',
        title: 'Internal Server Error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'VALIDATION_FAILED',
        detail: exception instanceof Error ? exception.message : 'Unexpected internal error',
      };
    }

    // Set application/problem+json content-type
    response.setHeader('Content-Type', 'application/problem+json');

    // 409 and 429 require Retry-After header per hub contract
    if (status === HttpStatus.CONFLICT || status === HttpStatus.TOO_MANY_REQUESTS) {
      response.setHeader('Retry-After', '60');
    }

    // Deliver strictly the ProblemDetails fields without extra properties
    response.status(status).json(payload);
  }
}
