import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health & Status')
@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get(['health', 'api/v1/health', 'api/v2/health', 'alojamientos/health', 'api/v1/alojamientos/health', 'api/v2/alojamientos/health'])
  @ApiOperation({ summary: 'Verificación de salud del servicio y base de datos (Semáforo v2)' })
  @ApiResponse({ status: 200, description: 'Servicio y BD operativos' })
  @ApiResponse({ status: 503, description: 'Error de conexión a la BD' })
  async checkHealth(@Res() res: Response) {
    try {
      await this.dataSource.query('SELECT 1');
      return res.status(HttpStatus.OK).json({
        status: 'HEALTHY',
        estado: 'ok',
        semaforo: 'GREEN',
        timestamp: new Date().toISOString(),
        database: 'connected',
        version: '2.2.0',
      });
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'DOWN',
        estado: 'error',
        semaforo: 'RED',
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
    return {
      servicio: 'alojamientos',
      version: '2.2.0',
      estado: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
