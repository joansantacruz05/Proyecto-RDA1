import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

const APP_START_TIME = Date.now();

@ApiTags('Health & Status')
@Controller()
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  @Get(['health', 'api/v1/health', 'api/v2/health', 'alojamientos/health', 'api/v1/alojamientos/health', 'api/v2/alojamientos/health'])
  @ApiOperation({ summary: 'Verificación de salud del servicio y base de datos (Semáforo v2)' })
  @ApiResponse({ status: 200, description: 'Servicio y BD operativos' })
  @ApiResponse({ status: 503, description: 'Error de conexión a la BD' })
  async checkHealth(@Res() res: Response) {
    const start = Date.now();
    const nodeId = this.configService.get<string>('NODE_ID') || 'NODE_ALO_LUXE';
    try {
      await this.dataSource.query('SELECT 1');
      const latencyMs = Date.now() - start;
      const uptimeSeconds = Math.floor((Date.now() - APP_START_TIME) / 1000);
      const semaforo = latencyMs < 1000 ? 'GREEN' : latencyMs < 2000 ? 'YELLOW' : 'RED';
      const status = latencyMs < 2000 ? 'HEALTHY' : 'DEGRADED';

      return res.status(HttpStatus.OK).json({
        status,
        semaforo,
        service: 'MS_ALOJAMIENTOS',
        version: '2.2.0',
        latency_ms: latencyMs,
        uptime_seconds: uptimeSeconds,
        nodo_id: nodeId,
        vertical: 'ALOJAMIENTOS',
        timestamp: new Date().toISOString(),
        database: 'connected',
      });
    } catch (error: any) {
      const latencyMs = Date.now() - start;
      const uptimeSeconds = Math.floor((Date.now() - APP_START_TIME) / 1000);
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'DOWN',
        semaforo: 'RED',
        service: 'MS_ALOJAMIENTOS',
        version: '2.2.0',
        latency_ms: latencyMs,
        uptime_seconds: uptimeSeconds,
        nodo_id: nodeId,
        vertical: 'ALOJAMIENTOS',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error?.message || 'Error de conexión con la base de datos',
      });
    }
  }

  @Get(['', 'api/v1', 'api/v2'])
  @ApiOperation({ summary: 'Ping raíz e información del nodo para Booking Hub' })
  @ApiResponse({ status: 200, description: 'Información básica del servicio' })
  getRoot() {
    const nodeId = this.configService.get<string>('NODE_ID') || 'NODE_ALO_LUXE';
    return {
      servicio: 'MS_ALOJAMIENTOS',
      service: 'MS_ALOJAMIENTOS',
      version: '2.2.0',
      nodo_id: nodeId,
      vertical: 'ALOJAMIENTOS',
      estado: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
