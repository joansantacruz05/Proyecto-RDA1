import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { ProblemDetailsException } from '../exceptions/problem-details.exception';

export interface IdempotencyCheckResult {
  isCached: boolean;
  statusCode?: number;
  response?: any;
  hash?: string;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly dataSource: DataSource) {}

  computeHash(body: any): string {
    const canonical = typeof body === 'object' && body !== null ? JSON.stringify(body) : String(body || '');
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  async validateAndGetCached(key: string, body: any): Promise<IdempotencyCheckResult> {
    const currentHash = this.computeHash(body);

    const rows = await this.dataSource.query(
      `SELECT key, body_hash, status_code, response_body FROM idempotency_keys WHERE key = $1`,
      [key],
    );

    if (rows && rows.length > 0) {
      const record = rows[0];
      if (record.body_hash === currentHash) {
        return {
          isCached: true,
          statusCode: record.status_code,
          response: record.response_body,
        };
      } else {
        // Same key, different body -> 409 Conflict
        throw new ProblemDetailsException(
          {
            type: 'https://api.booking-hub.com/errors/idempotency-conflict',
            title: 'Idempotency conflict: key already used with a different request payload',
            status: HttpStatus.CONFLICT,
            code: 'VALIDATION_FAILED',
            detail: `The Idempotency-Key "${key}" was already processed with different parameters.`,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    return {
      isCached: false,
      hash: currentHash,
    };
  }

  async saveKey(key: string, bodyHash: string, statusCode: number, responseBody: any): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO idempotency_keys (key, body_hash, status_code, response_body)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO UPDATE 
         SET response_body = EXCLUDED.response_body, status_code = EXCLUDED.status_code`,
        [key, bodyHash, statusCode, JSON.stringify(responseBody)],
      );
    } catch (err) {
      console.error('Failed to save idempotency key:', err);
    }
  }
}
