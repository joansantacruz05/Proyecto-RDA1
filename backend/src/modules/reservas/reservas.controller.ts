import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ReservasService } from './reservas.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IdempotencyKeyGuard } from '../../common/guards/idempotency-key.guard';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../usuarios/entities/usuario.entity';
import { ProblemDetailsException } from '../../common/exceptions/problem-details.exception';

@ApiTags('Reservas')
@Controller(['reservas', 'alojamientos/reservas'])
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, IdempotencyKeyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Crear una nueva reserva u orden de compra síncrona' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'UUID v4' })
  @ApiResponse({ status: 201, description: 'Reserva confirmada exitosamente' })
  @ApiResponse({ status: 409, description: 'Sin habitaciones disponibles (OUT_OF_STOCK) o Idempotencia en curso' })
  @ApiResponse({ status: 422, description: 'Idempotency-Key reusada con cuerpo diferente' })
  create(
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Headers('X-Client-Id') clientIdHeader: string,
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const userId = clientIdHeader || req.user?.sub || req.user?.id || 'NODE_SYSTEM_HUB';
    return this.reservasService.createOrder(createOrderDto, userId, clientIdHeader, req, res);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener reservas o recuperar orden por idempotency_key' })
  async findAll(
    @Query('idempotency_key') idempotencyKey?: string,
    @Req() req?: any,
  ) {
    if (idempotencyKey) {
      return this.reservasService.recoverOrderByIdempotencyKey(idempotencyKey);
    }
    const userRole = (req?.user?.rol || req?.user?.role || '').toLowerCase();
    const isAdmin = userRole.includes('admin') || req?.user?.id === 'NODE_SYSTEM_HUB';
    if (!isAdmin) {
      return this.reservasService.findPublicActiveReservations();
    }
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

  @Post([':id/check-in', ':id/checkin'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar check-in de una reserva' })
  checkIn(@Param('id') id: string, @Body() body?: any) {
    return this.reservasService.checkInOrder(id, body);
  }

  @Post([':id/check-out', ':id/checkout'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar check-out de una reserva' })
  checkOut(@Param('id') id: string, @Body() body?: any) {
    return this.reservasService.checkOutOrder(id, body);
  }

  @Post(':id/modify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, IdempotencyKeyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Modificar una reserva' })
  modify(@Param('id') id: string, @Body() body: any) {
    return this.reservasService.modifyOrder(id, body);
  }

  @Post([':id/cancel', ':id/cancelar'])
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, IdempotencyKeyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Cancelar una reserva' })
  cancelarReserva(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body?: { motivo?: string; reason?: string },
  ) {
    const userId = req.user?.sub || req.user?.id;
    const userRol = req.user?.rol || req.user?.role;
    const reason = body?.motivo || body?.reason;
    return this.reservasService.cancelarReserva(id, userId, userRol, reason);
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

  @Post(':id/aprobar')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Aprobar una reserva (Cambiar estado a Confirmada)' })
  aprobarReserva(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user?.sub || req.user?.id;
    return this.reservasService.aprobarReserva(id, adminId);
  }
}
