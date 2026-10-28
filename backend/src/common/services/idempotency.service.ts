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

  async validateAndGetCached(
    key: string,
    body: any,
    userId: string = 'ANONYMOUS',
    endpoint: string = 'DEFAULT',
  ): Promise<IdempotencyCheckResult> {
    const currentHash = this.computeHash(body);

    const rows = await this.dataSource.query(
      `SELECT llave, "usuarioId", endpoint, "hashCuerpo", status, respuesta 
       FROM idempotency_keys 
       WHERE llave = $1::uuid`,
      [key],
    );

    if (rows && rows.length > 0) {
      const record = rows[0];
      if (record.hashCuerpo === currentHash) {
        return {
          isCached: true,
          statusCode: record.status || 200,
          response: record.respuesta,
        };
      } else {
        // Same key, different body -> 409 Conflict
        throw new ProblemDetailsException(
          {
            type: 'https://api.booking-hub.com/errors/idempotency-conflict',
            title: 'Conflicto de Idempotencia: llave ya utilizada con un cuerpo diferente',
            status: HttpStatus.CONFLICT,
            code: 'IDEMPOTENCY_KEY_REUSE_WITH_DIFFERENT_PAYLOAD',
            detail: `La Idempotency-Key "${key}" ya fue procesada anteriormente con parámetros distintos.`,
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

  async saveKey(
    key: string,
    bodyHash: string,
    statusCode: number,
    responseBody: any,
    userId: string = 'ANONYMOUS',
    endpoint: string = 'DEFAULT',
  ): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO idempotency_keys (llave, "usuarioId", endpoint, "hashCuerpo", status, respuesta)
         VALUES ($1::uuid, $2, $3, $4, $5, $6)
         ON CONFLICT (llave, "usuarioId", endpoint) DO UPDATE 
         SET respuesta = EXCLUDED.respuesta, status = EXCLUDED.status`,
        [key, userId, endpoint, bodyHash, statusCode, JSON.stringify(responseBody)],
      );
    } catch (err) {
      console.error('Failed to save idempotency key:', err);
    }
  }
}
