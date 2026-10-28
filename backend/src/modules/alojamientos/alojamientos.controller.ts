import {
  Controller, Get, Post, Delete, Body, Param, Headers, Put, Patch, Query,
  UseGuards, UseInterceptors, HttpCode, HttpStatus, Header, Req
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiParam,
  ApiHeader, ApiSecurity,
} from '@nestjs/swagger';
import { AlojamientosService } from './alojamientos.service';
import { IdempotencyKeyGuard } from '../../common/guards/idempotency-key.guard';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';
import { CrearAlojamientoDto } from './dto/crear-alojamiento.dto';
import { ActualizarAlojamientoDto } from './dto/actualizar-alojamiento.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Controlador BFF de Alojamientos — Alineado 1:1 con alojamientos-openapi.yaml
// ─────────────────────────────────────────────────────────────────────────────

@Controller()
export class AlojamientosController {
  constructor(private readonly alojamientosService: AlojamientosService) {}

  // ══════════════════════════════════════════════════════════════════════════
  //  Módulo de Administración (CRUD)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('admin/dashboard-stats')
  @ApiTags('Administración')
  @ApiOperation({ summary: 'Obtener estadísticas del dashboard admin desde la Vista SQL' })
  getDashboardStats() {
    return this.alojamientosService.getDashboardStats();
  }

  @Post('admin/alojamientos')
  @ApiTags('Administración')
  @ApiOperation({ summary: 'Crear un nuevo alojamiento' })
  @ApiResponse({ status: 201, description: 'Alojamiento creado exitosamente.' })
  @HttpCode(HttpStatus.CREATED)
  createAdmin(@Body() dto: CrearAlojamientoDto) {
    return this.alojamientosService.createAdmin(dto);
  }

  @Get(['alojamientos', 'admin/alojamientos'])
  @ApiTags('Catálogo y Administración')
  @ApiOperation({ summary: 'Listar todos los alojamientos' })
  @ApiResponse({ status: 200, description: 'Lista de alojamientos.' })
  findAllAdmin() {
    return this.alojamientosService.findAllAdmin();
  }


  @Put('admin/alojamientos/:id')
  @ApiTags('Administración')
  @ApiOperation({ summary: 'Reemplazar un alojamiento' })
  @ApiResponse({ status: 200, description: 'Alojamiento reemplazado.' })
  @ApiResponse({ status: 404, description: 'Alojamiento no encontrado.' })
  updateAdmin(
    @Param('id') id: string,
    @Body() dto: ActualizarAlojamientoDto,
  ) {
    return this.alojamientosService.updateAdmin(id, dto);
  }

  @Patch('admin/alojamientos/:id')
  @ApiTags('Administración')
  @ApiOperation({ summary: 'Actualizar parcialmente un alojamiento' })
  @ApiResponse({ status: 200, description: 'Alojamiento actualizado.' })
  @ApiResponse({ status: 404, description: 'Alojamiento no encontrado.' })
  patchAdmin(
    @Param('id') id: string,
    @Body() dto: ActualizarAlojamientoDto,
  ) {
    return this.alojamientosService.updateAdmin(id, dto);
  }

  @Delete('admin/alojamientos/:id')
  @ApiTags('Administración')
  @ApiOperation({ summary: 'Eliminar un alojamiento' })
  @ApiResponse({ status: 204, description: 'Alojamiento eliminado.' })
  @ApiResponse({ status: 404, description: 'Alojamiento no encontrado.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAdmin(@Param('id') id: string) {
    return this.alojamientosService.removeAdmin(id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Habitaciones (Admin)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('admin/alojamientos/:id/habitaciones')
  @ApiTags('Administración')
  getRoomsAdmin(@Param('id') id: string) {
    return this.alojamientosService.getRoomsAdmin(id);
  }

  @Post('admin/alojamientos/:id/habitaciones')
  @ApiTags('Administración')
  createRoomAdmin(@Param('id') id: string, @Body() dto: any) {
    return this.alojamientosService.createRoomAdmin(id, dto);
  }

  @Patch('admin/habitaciones/:habId')
  @ApiTags('Administración')
  updateRoomAdmin(@Param('habId') habId: string, @Body() dto: any) {
    return this.alojamientosService.updateRoomAdmin(habId, dto);
  }

  @Delete('admin/habitaciones/:habId')
  @ApiTags('Administración')
  deleteRoomAdmin(@Param('habId') habId: string) {
    return this.alojamientosService.deleteRoomAdmin(habId);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Búsqueda y Catálogo
  // ══════════════════════════════════════════════════════════════════════════
  @Post(['search', 'alojamientos/search'])
  @Get(['search', 'alojamientos/search'])
  @ApiTags('Búsqueda y Catálogo')
  @ApiOperation({ summary: 'Búsqueda de alojamientos' })
  @ApiResponse({ status: 200, description: 'Alojamientos encontrados' })
  @ApiResponse({ status: 400, description: 'Petición inválida' })
  @ApiResponse({ status: 429, description: 'Demasiadas peticiones' })
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'public, max-age=300')
  search(
    @Headers('X-Device-Fingerprint') deviceFingerprint: string,
    @Body() searchRequest: any,
  ) {
    return this.alojamientosService.search(searchRequest || {});
  }

  @Post(['availability', 'alojamientos/availability'])
  @ApiTags('Disponibilidad y Precios')
  @ApiOperation({ summary: 'Consultar disponibilidad y precio de un alojamiento' })
  @ApiResponse({ status: 200, description: 'Disponibilidad y detalles del precio' })
  @ApiResponse({ status: 400, description: 'Petición inválida' })
  @HttpCode(HttpStatus.OK)
  availability(@Body() availabilityRequest: any) {
    return this.alojamientosService.checkAvailability(availabilityRequest);
  }

  @Post(['bulk-availability', 'alojamientos/bulk-availability'])
  @ApiTags('Disponibilidad y Precios')
  @ApiOperation({ summary: 'Consultar disponibilidad múltiple de alojamientos' })
  @ApiResponse({ status: 200, description: 'Disponibilidad para múltiples alojamientos' })
  bulkAvailability(@Body() bulkRequest: any) {
    return this.alojamientosService.checkBulkAvailability(bulkRequest);
  }

  @Post('details')
  @ApiTags('Búsqueda y Catálogo')
  @ApiOperation({ summary: 'Obtener detalles extendidos de los alojamientos' })
  @ApiResponse({ status: 200, description: 'Detalles de los alojamientos solicitados' })
  @Header('Cache-Control', 'public, max-age=300')
  getDetails(@Body() detailsRequest: any) {
    return this.alojamientosService.getDetails(detailsRequest);
  }

  @Post('details/changes')
  @ApiTags('Búsqueda y Catálogo')
  @ApiSecurity('OAuth2Security', ['alojamientos:read'])
  @ApiOperation({ summary: 'Obtener alojamientos que han cambiado desde una fecha' })
  @ApiResponse({ status: 200, description: 'Lista de alojamientos modificados' })
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @Scopes('alojamientos:read')
  getDetailsChanges(@Body() changesRequest: any) {
    return this.alojamientosService.getDetailsChanges(changesRequest);
  }

  @Post('chains')
  @ApiTags('Búsqueda y Catálogo')
  @ApiOperation({ summary: 'Listar cadenas hoteleras y sus marcas' })
  @ApiResponse({ status: 200, description: 'Lista de cadenas hoteleras' })
  @Header('Cache-Control', 'public, max-age=3600')
  getChains() {
    return this.alojamientosService.getChains();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Taxonomía, Promociones y Eventos Outbox (OpenAPI v2.2.0)
  // ══════════════════════════════════════════════════════════════════════════

  @Get(['alojamientos/categorias', 'alojamientos/tipos', 'categorias', 'tipos'])
  @ApiTags('Taxonomía y Catálogo v2')
  @ApiOperation({ summary: 'Obtener categorías y tipos de alojamientos' })
  getCategoriasYTipos() {
    return this.alojamientosService.getConstants({});
  }

  @Get(['alojamientos/promociones/contrato', 'promociones/contrato'])
  @ApiTags('Promociones B2B y Combos v2')
  @ApiOperation({ summary: 'Consultar acuerdo de promociones y combos B2B' })
  getPromocionesContrato() {
    return {
      partner_id: 'MS_ALO_LUXESTAYS',
      permite_promociones: true,
      porcentaje_descuento_maximo: 20,
      destinos_habilitados: ['Quito', 'Guayaquil', 'Cuenca', 'Manta', 'Galápagos'],
      vigente_desde: '2026-01-01',
      vigente_hasta: '2026-12-31',
      politica: 'Descuento B2B aplicable a paquetes combinados de viaje.',
    };
  }

  @Put(['alojamientos/promociones/contrato', 'promociones/contrato'])
  @ApiTags('Promociones B2B y Combos v2')
  @ApiOperation({ summary: 'Actualizar acuerdo de promociones y combos B2B' })
  updatePromocionesContrato(@Body() body: any) {
    return {
      partner_id: 'MS_ALO_LUXESTAYS',
      permite_promociones: body?.permite_promociones ?? true,
      porcentaje_descuento_maximo: body?.permite_promociones ? (body?.porcentaje_descuento_maximo ?? 20) : 0,
      destinos_habilitados: body?.destinos_habilitados || ['Quito', 'Guayaquil', 'Cuenca', 'Manta', 'Galápagos'],
      vigente_desde: body?.vigente_desde || '2026-01-01',
      vigente_hasta: body?.vigente_hasta || '2026-12-31',
      actualizado_en: new Date().toISOString(),
    };
  }

  @Get(['alojamientos/eventos', 'eventos'])
  @ApiTags('Telemetría y Salud de Nodo v2')
  @ApiOperation({ summary: 'Feed de eventos outbox CloudEvents 1.0 para conciliación' })
  getEventosOutbox(@Query('after') after?: string) {
    const afterSeq = after ? parseInt(after, 10) : 0;
    return this.alojamientosService.getEventosOutbox(isNaN(afterSeq) ? 0 : afterSeq);
  }

  @Get(['alojamientos/:id/habitaciones', 'admin/alojamientos/:id/habitaciones', ':id/habitaciones'])
  @ApiTags('Propiedades y Habitaciones v2')
  @ApiOperation({ summary: 'Listar habitaciones y planes de tarifa de un alojamiento' })
  getRoomsByProperty(@Param('id') id: string) {
    return this.alojamientosService.getRoomsAdmin(id);
  }

  @Get(['alojamientos/:id/inventario', ':id/inventario'])
  @ApiTags('Disponibilidad y Cotización v2')
  @ApiOperation({ summary: 'Snapshot de inventario y stock por noche' })
  getInventorySnapshot(
    @Param('id') id: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.alojamientosService.getInventorySnapshot(id, desde, hasta);
  }

  @Post(['alojamientos/:id/availability', 'alojamientos/:id/disponibilidad'])
  @ApiTags('Disponibilidad y Cotización v2')
  @ApiOperation({ summary: 'Consultar disponibilidad para un alojamiento específico' })
  checkPropertyAvailability(@Param('id') id: string, @Body() body: any) {
    return this.alojamientosService.checkAvailability({ ...body, accommodation: id });
  }

  @Get(['alojamientos/:id/resenas', 'alojamientos/:id/reviews'])
  @ApiTags('Reseñas y Calificaciones v2')
  @ApiOperation({ summary: 'Obtener reseñas verificadas de un alojamiento' })
  getPropertyReviews(@Param('id') id: string) {
    return this.alojamientosService.getReviews({ id });
  }


  @Post('constants')
  @ApiTags('Componentes Comunes')
  @ApiOperation({ summary: 'Consultar constantes del sistema' })
  @Header('Cache-Control', 'public, max-age=86400')
  getConstants(@Body() constantsRequest: any) {
    return this.alojamientosService.getConstants(constantsRequest);
  }

  @Post('reviews')
  @ApiTags('Búsqueda y Catálogo')
  @ApiOperation({ summary: 'Obtener reseñas de alojamientos' })
  @Header('Cache-Control', 'public, max-age=600')
  getReviews(@Body() reviewsRequest: any) {
    return this.alojamientosService.getReviews(reviewsRequest);
  }

  @Post('reviews/scores')
  @ApiTags('Búsqueda y Catálogo')
  @ApiOperation({ summary: 'Obtener puntuaciones de reseñas' })
  @Header('Cache-Control', 'public, max-age=600')
  getReviewsScores(@Body() scoresRequest: any) {
    return this.alojamientosService.getReviewsScores(scoresRequest);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Gestión de Órdenes (Reservas) — Contrato GDS Alojamientos Hub v2
  // ══════════════════════════════════════════════════════════════════════════

  @Post(['orders/preview', 'alojamientos/orders/preview'])
  @ApiTags('Reservas y Órdenes Saga v2')
  @ApiSecurity('OAuth2Security', ['alojamientos:read'])
  @ApiOperation({ summary: 'Previsualizar cotización y desglose de orden' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @Scopes('alojamientos:read')
  previewOrder(@Body() previewRequest: any) {
    return this.alojamientosService.previewOrder(previewRequest);
  }

  @Post(['orders/create', 'alojamientos/orders/create', 'alojamientos/reservas', 'alojamientos/reservations'])
  @ApiTags('Reservas y Órdenes Saga v2')
  @ApiSecurity('OAuth2Security', ['alojamientos:book'])
  @ApiOperation({ summary: 'Crear reserva u orden de compra síncrona Saga' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'UUID v4 para garantizar idempotencia' })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, ScopesGuard, IdempotencyKeyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Scopes('alojamientos:book')
  createOrder(
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() createRequest: any,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;
    return this.alojamientosService.createOrder(createRequest, userId);
  }

  @Get(['orders', 'alojamientos/orders', 'alojamientos/reservas', 'alojamientos/reservations'])
  @ApiTags('Reservas y Órdenes Saga v2')
  @ApiOperation({ summary: 'Listar órdenes por saga_id o identificador' })
  listOrders(
    @Query('saga_id') sagaId?: string,
    @Query('idempotency_key') idempotencyKey?: string,
  ) {
    return this.alojamientosService.listOrders(sagaId, idempotencyKey);
  }

  @Get(['orders/:orderId', 'alojamientos/orders/:orderId', 'alojamientos/reservas/:orderId', 'alojamientos/reservations/:orderId'])
  @ApiTags('Reservas y Órdenes Saga v2')
  @ApiOperation({ summary: 'Consultar orden por UUID, external_order_id o localizador' })
  @ApiParam({ name: 'orderId', type: 'string', description: 'UUID v4, ORD-HTL-XXX o BK-HOTEL-XXX' })
  getOrder(@Param('orderId') orderId: string) {
    return this.alojamientosService.getOrder(orderId);
  }

  @Post(['orders/:orderId/modify', 'alojamientos/orders/:orderId/modify'])
  @ApiTags('Reservas y Órdenes Saga v2')
  @ApiOperation({ summary: 'Modificar una orden existente' })
  @ApiParam({ name: 'orderId', type: 'string' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, ScopesGuard, IdempotencyKeyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Scopes('alojamientos:book')
  modifyOrder(
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Param('orderId') orderId: string,
    @Body() modifyRequest: any,
  ) {
    return this.alojamientosService.modifyOrder(orderId, modifyRequest);
  }

  @Post(['orders/:orderId/cancel', 'alojamientos/orders/:orderId/cancel', 'alojamientos/reservas/:orderId/cancel', 'alojamientos/reservations/:orderId/cancel'])
  @ApiTags('Reservas y Órdenes Saga v2')
  @ApiOperation({ summary: 'Cancelar orden compensatoria (idempotente)' })
  @ApiParam({ name: 'orderId', type: 'string' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, ScopesGuard, IdempotencyKeyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Scopes('alojamientos:cancel')
  cancelOrder(
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Param('orderId') orderId: string,
  ) {
    return this.alojamientosService.cancelOrder(orderId);
  }

  @Post([
    'orders/:orderId/check-in',
    'orders/:orderId/checkin',
    'alojamientos/orders/:orderId/check-in',
    'alojamientos/orders/:orderId/checkin',
    'alojamientos/reservas/:orderId/checkin',
    'alojamientos/reservations/:orderId/checkin',
  ])
  @ApiTags('Check-in y Check-out Digital v2')
  @ApiOperation({ summary: 'Check-in digital con entrega de llave digital' })
  @ApiParam({ name: 'orderId', type: 'string' })
  @HttpCode(HttpStatus.OK)
  checkInOrder(@Param('orderId') orderId: string, @Body() body?: any) {
    return this.alojamientosService.checkInOrder(orderId, body);
  }

  @Post([
    'orders/:orderId/checkout',
    'alojamientos/orders/:orderId/checkout',
    'alojamientos/reservas/:orderId/checkout',
    'alojamientos/reservations/:orderId/checkout',
  ])
  @ApiTags('Check-in y Check-out Digital v2')
  @ApiOperation({ summary: 'Check-out digital y liberación de habitación' })
  @ApiParam({ name: 'orderId', type: 'string' })
  @HttpCode(HttpStatus.OK)
  checkOutOrder(@Param('orderId') orderId: string, @Body() body?: any) {
    return this.alojamientosService.checkOutOrder(orderId, body);
  }

  @Put(['orders/:orderId/early-checkin', 'alojamientos/orders/:orderId/early-checkin'])
  @ApiTags('Check-in y Check-out Digital v2')
  @ApiOperation({ summary: 'Autorizar early check-in para una orden' })
  @ApiParam({ name: 'orderId', type: 'string' })
  earlyCheckInOrder(@Param('orderId') orderId: string, @Body() body?: any) {
    return this.alojamientosService.setEarlyCheckin(orderId, body);
  }

  @Get(['alojamientos/:id', 'admin/alojamientos/:id'])
  @ApiTags('Catálogo y Administración')
  @ApiOperation({ summary: 'Obtener un alojamiento por ID' })
  @ApiResponse({ status: 200, description: 'Alojamiento encontrado.' })
  @ApiResponse({ status: 404, description: 'Alojamiento no encontrado.' })
  findOneAdmin(@Param('id') id: string) {
    return this.alojamientosService.findOneAdmin(id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Webhooks
  // ══════════════════════════════════════════════════════════════════════════

  @Get('webhooks')
  @ApiTags('Webhooks')
  @ApiSecurity('OAuth2Security', ['alojamientos:webhooks'])
  @ApiOperation({ summary: 'Listar suscripciones' })
  @ApiResponse({ status: 200, description: 'Suscripciones activas' })
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @Scopes('alojamientos:webhooks')
  listWebhooks() {
    return this.alojamientosService.listWebhooks();
  }

  @Post('webhooks')
  @ApiTags('Webhooks')
  @ApiSecurity('OAuth2Security', ['alojamientos:webhooks'])
  @ApiOperation({ summary: 'Registrar webhook' })
  @ApiResponse({ status: 201, description: 'Webhook registrado' })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @Scopes('alojamientos:webhooks')
  createWebhook(@Body() webhookSubscription: any) {
    return this.alojamientosService.createWebhook(webhookSubscription);
  }

  @Delete('webhooks/:id')
  @ApiTags('Webhooks')
  @ApiSecurity('OAuth2Security', ['alojamientos:webhooks'])
  @ApiOperation({ summary: 'Eliminar suscripción' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204, description: 'Eliminado' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @Scopes('alojamientos:webhooks')
  deleteWebhook(@Param('id') id: string) {
    return this.alojamientosService.deleteWebhook(id);
  }
}
