import { Injectable, HttpStatus, OnModuleInit } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import * as crypto from 'crypto';
import { ProblemDetailsException } from '../exceptions/problem-details.exception';

export interface IdempotencyClaimResult {
  claimed: boolean;
  isCached: boolean;
  statusCode?: number;
  response?: any;
  hash: string;
}

@Injectable()
export class IdempotencyService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS idempotency_keys (
          llave UUID NOT NULL,
          "usuarioId" VARCHAR(100) NOT NULL DEFAULT 'ANONYMOUS',
          endpoint VARCHAR(255) NOT NULL DEFAULT 'DEFAULT',
          "hashCuerpo" VARCHAR(64) NOT NULL,
          estado VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
          status INT,
          respuesta JSONB,
          "creadoEn" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          PRIMARY KEY (llave, "usuarioId", endpoint)
        );
        ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'IN_PROGRESS';
        ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS "usuarioId" VARCHAR(100) DEFAULT 'ANONYMOUS';
        ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255) DEFAULT 'DEFAULT';
        ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS "hashCuerpo" VARCHAR(64);
        ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS status INT;
        ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS respuesta JSONB;
        ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS "creadoEn" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      `);
    } catch (err: any) {
      console.warn('[IDEMPOTENCY-INIT] Warning setting up idempotency_keys table:', err?.message);
    }
  }

  computeHash(body: any): string {
    const canonical = typeof body === 'object' && body !== null ? JSON.stringify(body) : String(body || '');
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Reclamo atómico de la llave de idempotencia.
   * Utiliza: INSERT ... ON CONFLICT (llave, "usuarioId", endpoint) DO NOTHING RETURNING llave;
   */
  async claimKey(
    key: string,
    body: any,
    userId: string = 'ANONYMOUS',
    endpoint: string = 'DEFAULT',
  ): Promise<IdempotencyClaimResult> {
    const currentHash = this.computeHash(body);

    // 1. Intento de reclamo atómico
    const insertResult = await this.dataSource.query(
      `INSERT INTO idempotency_keys (llave, "usuarioId", endpoint, "hashCuerpo", estado, status, respuesta, "creadoEn")
       VALUES ($1::uuid, $2, $3, $4, 'IN_PROGRESS', NULL, NULL, NOW())
       ON CONFLICT (llave, "usuarioId", endpoint) DO NOTHING
       RETURNING llave;`,
      [key, userId, endpoint, currentHash],
    );

    // Si se insertó una fila, ganamos el reclamo de la llave
    if (insertResult && insertResult.length > 0) {
      return {
        claimed: true,
        isCached: false,
        hash: currentHash,
      };
    }

    // 2. Si no se insertó fila, la llave ya existe para este usuario y endpoint
    const rows = await this.dataSource.query(
      `SELECT llave, "usuarioId", endpoint, "hashCuerpo", estado, status, respuesta, "creadoEn"
       FROM idempotency_keys 
       WHERE llave = $1::uuid AND "usuarioId" = $2 AND endpoint = $3;`,
      [key, userId, endpoint],
    );

    if (rows && rows.length > 0) {
      const record = rows[0];

      // A) Si el cuerpo difiere: 422 IDEMPOTENCY_KEY_REUSED
      if (record.hashCuerpo !== currentHash) {
        throw new ProblemDetailsException(
          {
            type: 'https://api.booking-hub.com/errors/idempotency-key-reused',
            title: 'Idempotency Key Reused',
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            code: 'IDEMPOTENCY_KEY_REUSED',
            detail: `La Idempotency-Key "${key}" ya fue procesada anteriormente con un cuerpo de solicitud diferente.`,
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      // B) Si ya existe y está en curso: 409 IDEMPOTENCY_IN_PROGRESS con Retry-After
      if (record.estado === 'IN_PROGRESS') {
        throw new ProblemDetailsException(
          {
            type: 'https://api.booking-hub.com/errors/idempotency-in-progress',
            title: 'Idempotency Operation In Progress',
            status: HttpStatus.CONFLICT,
            code: 'IDEMPOTENCY_IN_PROGRESS',
            detail: `Una operación con la Idempotency-Key "${key}" ya se encuentra en curso. Por favor reintente en breve.`,
          },
          HttpStatus.CONFLICT,
        );
      }

      // C) Si existe y terminó: responder con la respuesta guardada
      if (record.estado === 'COMPLETED') {
        return {
          claimed: false,
          isCached: true,
          statusCode: record.status || 201,
          response: record.respuesta,
          hash: currentHash,
        };
      }
    }

    // Fallback por si la fila se liberó concurrentemente
    return {
      claimed: true,
      isCached: false,
      hash: currentHash,
    };
  }

  /**
   * Guarda la respuesta final dentro de la misma transacción de creación de orden
   */
  async completeKeyInTransaction(
    manager: EntityManager,
    key: string,
    userId: string,
    endpoint: string,
    statusCode: number,
    responseBody: any,
  ): Promise<void> {
    await manager.query(
      `UPDATE idempotency_keys 
       SET estado = 'COMPLETED', status = $4, respuesta = $5
       WHERE llave = $1::uuid AND "usuarioId" = $2 AND endpoint = $3;`,
      [key, userId, endpoint, statusCode, JSON.stringify(responseBody)],
    );
  }

  /**
   * Completa la llave fuera de transacción si no es transaccional
   */
  async completeKey(
    key: string,
    userId: string,
    endpoint: string,
    statusCode: number,
    responseBody: any,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE idempotency_keys 
       SET estado = 'COMPLETED', status = $4, respuesta = $5
       WHERE llave = $1::uuid AND "usuarioId" = $2 AND endpoint = $3;`,
      [key, userId, endpoint, statusCode, JSON.stringify(responseBody)],
    );
  }

  /**
   * Libera el reclamo en caso de fallo no recuperable
   */
  async releaseClaim(key: string, userId: string, endpoint: string): Promise<void> {
    try {
      await this.dataSource.query(
        `DELETE FROM idempotency_keys 
         WHERE llave = $1::uuid AND "usuarioId" = $2 AND endpoint = $3 AND estado = 'IN_PROGRESS';`,
        [key, userId, endpoint],
      );
    } catch (err: any) {
      console.warn('[IDEMPOTENCY-RELEASE] Warning releasing claim:', err?.message);
    }
  }

  /**
   * Búsqueda por llave para recuperación de orden (GET /orders?idempotency_key=...)
   */
  async findByKey(key: string, userId?: string, endpoint?: string): Promise<any | null> {
    let query = `
      SELECT llave, "usuarioId", endpoint, "hashCuerpo", estado, status, respuesta, "creadoEn"
      FROM idempotency_keys 
      WHERE llave = $1::uuid
    `;
    const params: any[] = [key];

    if (userId) {
      params.push(userId);
      query += ` AND "usuarioId" = $${params.length}`;
    }
    if (endpoint) {
      params.push(endpoint);
      query += ` AND endpoint = $${params.length}`;
    }

    query += ` ORDER BY "creadoEn" DESC LIMIT 1;`;

    const rows = await this.dataSource.query(query, params);
    if (rows && rows.length > 0) {
      return rows[0].respuesta;
    }
    return null;
  }
}
