import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ReservasService } from './reservas.service';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Reservas')
@Controller('reservas')
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva reserva' })
  create(@Body() crearReservaDto: CrearReservaDto, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.reservasService.create(crearReservaDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las reservas' })
  findAll() {
    return this.reservasService.findAll();
  }

  @Get('admin/todas')
  @ApiOperation({ summary: 'Obtener todas las reservas con detalles para Admin' })
  findAllAdmin() {
    return this.reservasService.findAllAdmin();
  }

  @Get('admin/cancelaciones')
  @ApiOperation({ summary: 'Obtener reporte de reservas canceladas para el dashboard' })
  getCancelaciones() {
    return this.reservasService.getCancelaciones();
  }

  @Get('mias')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener reservas del usuario autenticado' })
  getMisReservas(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.reservasService.getMisReservas(userId);
  }

  @Get('usuario/:email')
  @ApiOperation({ summary: 'Obtener reservas por email de usuario' })
  findByEmail(@Param('email') email: string) {
    return this.reservasService.findByEmail(email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una reserva por ID u ordenId' })
  findOne(@Param('id') id: string) {
    return this.reservasService.findOne(id);
  }

  @Post(':id/calificar')
  @ApiOperation({ summary: 'Calificar una reserva' })
  rateReserva(
    @Param('id') id: string,
    @Body() body: { calificacion: number; comentario: string },
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;
    return this.reservasService.rateReserva(id, userId, body.calificacion, body.comentario);
  }

  @Post(':id/firmar-contrato')
  @ApiOperation({ summary: 'Firmar contrato de arrendamiento de la reserva' })
  firmarContrato(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.reservasService.firmarContrato(id, userId);
  }

  @Post(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar una reserva' })
  cancelarReserva(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body?: { motivo?: string },
  ) {
    const userId = req.user?.sub || req.user?.id;
    const userRol = req.user?.rol || req.user?.role;
    return this.reservasService.cancelarReserva(id, userId, userRol, body?.motivo);
  }

  @Post(':id/aprobar')
  @ApiOperation({ summary: 'Aprobar una reserva (Cambiar estado a Confirmada)' })
  aprobarReserva(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user?.sub || req.user?.id;
    return this.reservasService.aprobarReserva(id, adminId);
  }
}
