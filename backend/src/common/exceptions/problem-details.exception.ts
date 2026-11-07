import { HttpException, HttpStatus } from '@nestjs/common';

export type ProblemErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INSUFFICIENT_SCOPE'
  | 'NOT_FOUND'
  | 'HOTEL_NOT_FOUND'
  | 'ROOM_NO_LONGER_AVAILABLE'
  | 'OUT_OF_STOCK'
  | 'PRICE_MISMATCH'
  | 'PRICE_CHANGED'
  | 'QUOTE_EXPIRED'
  | 'CAPACITY_EXCEEDED'
  | 'INVALID_DOCUMENT'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'IDEMPOTENCY_KEY_REUSE_WITH_DIFFERENT_PAYLOAD'
  | 'CHECKIN_TIME_NOT_REACHED'
  | 'RESTRICTION_VIOLATED'
  | 'UNSUPPORTED_CURRENCY'
  | 'DISCOUNT_EXCEEDS_CONTRACT'
  | 'PROMOTIONS_NOT_ALLOWED'
  | 'RATE_LIMITED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'BOOKING_NOT_CONFIRMED'
  | 'CANCELLATION_NOT_ALLOWED'
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
