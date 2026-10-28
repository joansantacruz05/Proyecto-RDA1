import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health & Status')
@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get(['health', 'api/v1/health'])
  @ApiOperation({ summary: 'Verificación de salud del servicio y base de datos' })
  @ApiResponse({ status: 200, description: 'Servicio y BD operativos' })
  @ApiResponse({ status: 503, description: 'Error de conexión a la BD' })
  async checkHealth(@Res() res: Response) {
    try {
      await this.dataSource.query('SELECT 1');
      return res.status(HttpStatus.OK).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
      });
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error?.message || 'Error de conexión con la base de datos',
      });
    }
  }

  @Get(['', 'api/v1'])
  @ApiOperation({ summary: 'Ping raíz e información del nodo para Booking Hub' })
  @ApiResponse({ status: 200, description: 'Información básica del servicio' })
  getRoot() {
    return {
      servicio: 'alojamientos',
      version: '1.0.0',
      estado: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
