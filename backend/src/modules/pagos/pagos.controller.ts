import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PagosService } from './pagos.service';

@ApiTags('Facturación y Pagos')
@Controller()
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Get('pagos/metodos')
  @ApiOperation({ summary: 'Obtener métodos de pago activos' })
  getMetodosPago() {
    return this.pagosService.getMetodosPago();
  }

  @Post('pagos')
  @ApiOperation({ summary: 'Procesar un nuevo pago y generar factura opcional' })
  procesarPago(@Body() dto: any) {
    return this.pagosService.procesarPago(dto);
  }

  @Get('admin/facturas')
  @ApiOperation({ summary: 'Obtener todas las facturas generadas (Admin)' })
  getFacturas() {
    return this.pagosService.getFacturas();
  }
}
