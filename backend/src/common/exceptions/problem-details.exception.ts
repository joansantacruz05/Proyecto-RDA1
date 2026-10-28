import { HttpException, HttpStatus } from '@nestjs/common';

export type ProblemErrorCode =
  | 'VALIDATION_FAILED'
  | 'ROOM_NO_LONGER_AVAILABLE'
  | 'OUT_OF_STOCK'
  | 'PRICE_CHANGED'
  | 'BOOKING_NOT_CONFIRMED'
  | 'CANCELLATION_NOT_ALLOWED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PAYMENT_REFERENCE_INVALID'
  | 'PAYMENT_NOT_AUTHORIZED'
  | 'IDEMPOTENCY_KEY_REUSE_WITH_DIFFERENT_PAYLOAD'
  | (string & {});

export interface ProblemDetailsPayload {
  type: string;
  title: string;
  status: number;
  code: ProblemErrorCode;
  detail?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
}

export class ProblemDetailsException extends HttpException {
  constructor(payload: ProblemDetailsPayload, statusCode?: HttpStatus) {
    super(payload, statusCode || payload.status || HttpStatus.BAD_REQUEST);
  }
}
