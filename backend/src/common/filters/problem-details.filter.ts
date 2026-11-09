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
          ...raw,
        };
        if (raw.detail) payload.detail = raw.detail;
        if (raw.invalidParams) payload.invalidParams = raw.invalidParams;
        if (raw.habilitadoDesde) payload.habilitadoDesde = raw.habilitadoDesde;
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
              invalidParams = msg.map((m: string) => {
                const match = m.match(/property\s+([^\s]+)/i);
                return { name: match ? match[1] : 'field', reason: m };
              });
            } else {
              detail = String(msg);
            }
          } else if (typeof exceptionResponse === 'string') {
            detail = exceptionResponse;
          }
        } else if (status === HttpStatus.NOT_FOUND) {
          title = 'Resource Not Found';
          type = 'https://api.booking-hub.com/errors/not-found';
          code = 'NOT_FOUND';
          detail = typeof exceptionResponse === 'string' 
            ? exceptionResponse 
            : (exceptionResponse as any)?.message || 'El recurso solicitado no fue encontrado.';
          if (detail && (detail.toLowerCase().includes('hotel') || detail.toLowerCase().includes('alojamiento'))) {
            code = 'HOTEL_NOT_FOUND';
          }
        } else if (status === HttpStatus.UNAUTHORIZED) {
          title = 'Unauthorized';
          type = 'https://api.booking-hub.com/errors/unauthorized';
          code = 'UNAUTHORIZED';
          detail = typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any)?.message || 'Authentication is required to access this resource';
        } else if (status === HttpStatus.FORBIDDEN) {
          title = 'Forbidden';
          type = 'https://api.booking-hub.com/errors/forbidden';
          code = 'FORBIDDEN';
          detail = typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any)?.message || 'Insufficient permissions or scope';
        } else if (status === HttpStatus.CONFLICT) {
          title = 'Conflict';
          type = 'https://api.booking-hub.com/errors/conflict';
          code = 'OUT_OF_STOCK';
          detail = typeof exceptionResponse === 'string' 
            ? exceptionResponse 
            : (exceptionResponse as any)?.message || 'Conflicto al procesar la reserva.';
          if (detail && (detail.toLowerCase().includes('precio') || detail.toLowerCase().includes('tarifa'))) {
            code = 'PRICE_MISMATCH';
          } else if (detail && detail.toLowerCase().includes('cotizacion')) {
            code = 'QUOTE_EXPIRED';
          } else if (detail && detail.toLowerCase().includes('in_progress')) {
            code = 'IDEMPOTENCY_IN_PROGRESS';
          }
        } else if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
          title = 'Unprocessable Entity';
          type = 'https://api.booking-hub.com/errors/unprocessable';
          code = 'VALIDATION_FAILED';
          detail = typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any)?.message || 'No se puede procesar la solicitud.';
          if (detail && (detail.toLowerCase().includes('cedula') || detail.toLowerCase().includes('documento'))) {
            code = 'INVALID_DOCUMENT';
          } else if (detail && detail.toLowerCase().includes('capacidad')) {
            code = 'CAPACITY_EXCEEDED';
          } else if (detail && detail.toLowerCase().includes('idempotenc')) {
            code = 'IDEMPOTENCY_KEY_REUSED';
          }
        } else if (status === HttpStatus.TOO_MANY_REQUESTS) {
          title = 'Too Many Requests';
          type = 'https://api.booking-hub.com/errors/rate-limit-exceeded';
          code = 'RATE_LIMITED';
          detail = 'Rate limit exceeded. Please try again later.';
        } else {
          title = 'Internal Server Error';
          type = 'https://api.booking-hub.com/errors/internal-server-error';
          code = 'INTERNAL_ERROR';
          detail = typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any)?.message || 'Error interno inesperado en el servidor.';
        }

        // Si la excepción original traía un 'code' personalizado
        if (typeof exceptionResponse === 'object' && (exceptionResponse as any)?.code) {
          code = (exceptionResponse as any).code as ProblemErrorCode;
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
      // Check for Postgres database errors (TypeORM QueryFailedError)
      const dbError = exception as any;
      if (dbError && dbError.code === '23505') {
        status = HttpStatus.CONFLICT;
        payload = {
          type: 'https://api.booking-hub.com/errors/conflict',
          title: 'Conflicto de registro duplicado',
          status: HttpStatus.CONFLICT,
          code: 'IDEMPOTENCY_KEY_REUSED',
          detail: 'El registro ya existe o se produjo un conflicto de duplicidad de clave única en la base de datos.',
        };
      } else if (dbError && dbError.code === '23503') {
        status = HttpStatus.CONFLICT;
        payload = {
          type: 'https://api.booking-hub.com/errors/conflict',
          title: 'Violación de integridad referencial',
          status: HttpStatus.CONFLICT,
          code: 'VALIDATION_FAILED',
          detail: 'No se puede procesar la acción debido a que existen registros dependientes o la entidad referenciada no existe.',
        };
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        payload = {
          type: 'https://api.booking-hub.com/errors/internal-server-error',
          title: 'Error Interno del Servidor',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'INTERNAL_ERROR',
          detail: exception instanceof Error ? exception.message : 'Error interno inesperado en el servidor.',
        };
      }
    }

    // Set application/problem+json content-type
    response.setHeader('Content-Type', 'application/problem+json');

    // Headers especiales para 409 y 429
    if (status === HttpStatus.CONFLICT || status === HttpStatus.TOO_MANY_REQUESTS) {
      if (!response.getHeader('Retry-After')) {
        if (payload.code === 'IDEMPOTENCY_IN_PROGRESS') {
          response.setHeader('Retry-After', '1');
        } else {
          response.setHeader('Retry-After', '1');
        }
      }
    }

    // Deliver strictly the ProblemDetails fields
    response.status(status).json(payload);
  }
}
