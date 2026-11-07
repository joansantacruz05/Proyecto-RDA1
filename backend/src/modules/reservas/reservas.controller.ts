import { Controller, Get, Post, Body, Param, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { ReservasService } from './reservas.service';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../usuarios/entities/usuario.entity';
import { ProblemDetailsException } from '../../common/exceptions/problem-details.exception';

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
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtener todas las reservas (Admin)' })
  findAll() {
    return this.reservasService.findAll();
  }

  @Get('admin/todas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtener todas las reservas con detalles para Admin' })
  findAllAdmin() {
    return this.reservasService.findAllAdmin();
  }

  @Get('admin/cancelaciones')
  @Roles(Role.ADMIN)
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
  async findByEmail(@Param('email') email: string, @Req() req: any) {
    const userRole = (req.user?.rol || req.user?.role || '').toLowerCase();
    const userEmail = (req.user?.correo || req.user?.email || '').toLowerCase();
    const isAdmin = userRole.includes('admin') || req.user?.id === 'NODE_SYSTEM_HUB';

    if (!isAdmin && userEmail !== email.trim().toLowerCase()) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/forbidden',
          title: 'Acceso Denegado',
          status: HttpStatus.FORBIDDEN,
          code: 'FORBIDDEN',
          detail: 'No tienes permiso para consultar reservas de otro usuario.',
        },
        HttpStatus.FORBIDDEN,
      );
    }
    return this.reservasService.findByEmail(email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una reserva por ID u ordenId' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const order = await this.reservasService.findOne(id);
    const userId = req.user?.sub || req.user?.id;
    const userRole = (req.user?.rol || req.user?.role || '').toLowerCase();
    const isAdmin = userRole.includes('admin') || userId === 'NODE_SYSTEM_HUB' || req.user?.id === 'NODE_SYSTEM_HUB';

    if (!isAdmin && order && (order as any).usuarioId && (order as any).usuarioId !== userId) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/forbidden',
          title: 'Acceso Denegado',
          status: HttpStatus.FORBIDDEN,
          code: 'FORBIDDEN',
          detail: 'No tienes permiso para ver esta reserva ajena.',
        },
        HttpStatus.FORBIDDEN,
      );
    }
    return order;
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
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Aprobar una reserva (Cambiar estado a Confirmada)' })
  aprobarReserva(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user?.sub || req.user?.id;
    return this.reservasService.aprobarReserva(id, adminId);
  }
}
