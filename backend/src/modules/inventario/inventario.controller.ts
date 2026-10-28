import { Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventorySyncService } from './inventory-sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../usuarios/entities/usuario.entity';

@ApiTags('Inventario & Sincronización gRPC (Booking)')
@Controller('admin/inventario')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class InventarioController {
  constructor(private readonly inventorySyncService: InventorySyncService) {}

  @Post('sincronizar')
  @ApiOperation({ summary: 'Sincronizar masivamente el inventario de los próximos 90 días hacia Booking' })
  @ApiResponse({ status: 200, description: 'Sincronización masiva ejecutada exitosamente' })
  syncNext90Days() {
    return this.inventorySyncService.syncNext90Days();
  }

  @Get('verificar')
  @ApiOperation({ summary: 'Verificar inventario de un turno entre Booking Hub y la Base de Datos Local' })
  @ApiQuery({ name: 'itemId', required: true, example: 'HTL-UIO-001:SUITE_PRESIDENCIAL' })
  @ApiQuery({ name: 'date', required: true, example: '2026-11-15' })
  @ApiResponse({ status: 200, description: 'Reporte comparativo de aforo y estado de sincronización' })
  verifyBookingSlot(
    @Query('itemId') itemId: string,
    @Query('date') date: string,
  ) {
    return this.inventorySyncService.verifyBookingSlot(itemId, date);
  }

  @Get('outbox')
  @ApiOperation({ summary: 'Consultar estado de la cola stock_outbox para sincronización gRPC' })
  @ApiResponse({ status: 200, description: 'Resumen y lista de eventos recientes en la cola de salida' })
  getOutboxStatus() {
    return this.inventorySyncService.getOutboxStatus();
  }

  @Post('procesar-outbox')
  @ApiOperation({ summary: 'Disparar manualmente el procesamiento de la cola stock_outbox' })
  @ApiResponse({ status: 200, description: 'Resultado del lote procesado' })
  processOutbox() {
    return this.inventorySyncService.processOutbox();
  }
}
