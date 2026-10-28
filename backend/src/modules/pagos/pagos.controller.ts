import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PagosService, ProcesarPagoDto } from './pagos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../usuarios/entities/usuario.entity';

@ApiTags('Facturación y Pagos')
@Controller()
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Get('pagos/metodos')
  @ApiOperation({ summary: 'Obtener métodos de pago activos' })
  @ApiResponse({ status: 200, description: 'Lista de métodos de pago activos' })
  getMetodosPago() {
    return this.pagosService.getMetodosPago();
  }

  @Post('pagos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Procesar un nuevo pago y emitir factura SRI secuencial' })
  @ApiResponse({ status: 200, description: 'Pago procesado exitosamente' })
  @ApiResponse({ status: 409, description: 'Pago duplicado o reserva ya pagada' })
  procesarPago(@Body() dto: ProcesarPagoDto, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const userRol = req.user?.rol;
    return this.pagosService.procesarPago(dto, userId, userRol);
  }

  @Get('pagos/mis-facturas')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener facturas del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de facturas emitidas para el usuario' })
  getMisFacturas(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.pagosService.getMisFacturas(userId);
  }

  @Get('admin/facturas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener todas las facturas generadas (Admin)' })
  @ApiResponse({ status: 200, description: 'Historial completo de facturación' })
  getFacturasAdmin() {
    return this.pagosService.getFacturasAdmin();
  }

  @Post('admin/pagos/:id/confirmar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirmar manualmente un pago pendiente (Transferencia/Efectivo) por Admin' })
  @ApiResponse({ status: 200, description: 'Pago confirmado y reserva activada' })
  confirmarPagoAdmin(@Param('id') pagoId: string, @Req() req: any) {
    const adminId = req.user?.sub || req.user?.id;
    return this.pagosService.confirmarPagoAdmin(pagoId, adminId);
  }
}
