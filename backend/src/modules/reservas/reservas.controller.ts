import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ReservasService } from './reservas.service';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Reservas')
@Controller('reservas')
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva reserva' })
  create(@Body() crearReservaDto: CrearReservaDto) {
    return this.reservasService.create(crearReservaDto);
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

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una reserva por ID' })
  findOne(@Param('id') id: string) {
    return this.reservasService.findOne(id);
  }

  @Get('usuario/:email')
  @ApiOperation({ summary: 'Obtener reservas por email' })
  findByEmail(@Param('email') email: string) {
    return this.reservasService.findByEmail(email);
  }

  @Post(':id/calificar')
  @ApiOperation({ summary: 'Calificar una reserva' })
  rateReserva(@Param('id') id: string, @Body() body: { calificacion: number, comentario: string }) {
    return this.reservasService.rateReserva(id, body.calificacion, body.comentario);
  }

  @Post(':id/firmar-contrato')
  @ApiOperation({ summary: 'Firmar contrato de arrendamiento de la reserva' })
  firmarContrato(@Param('id') id: string) {
    return this.reservasService.firmarContrato(id);
  }

  @Post(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar una reserva' })
  cancelarReserva(@Param('id') id: string) {
    return this.reservasService.cancelarReserva(id);
  }

  @Post(':id/aprobar')
  @ApiOperation({ summary: 'Aprobar una reserva (Cambiar estado a Confirmada)' })
  aprobarReserva(@Param('id') id: string) {
    return this.reservasService.aprobarReserva(id);
  }

  @Get('admin/cancelaciones')
  @ApiOperation({ summary: 'Obtener reporte de reservas canceladas para el dashboard' })
  getCancelaciones() {
    return this.reservasService.getCancelaciones();
  }
}
