# Mapeo API - Frontend LuxeStays (Contrato OpenAPI v2.2.0)

Este documento detalla la correspondencia 1:1 entre las vistas de la nueva interfaz de **LuxeStays** (React + Vite + TypeScript) y los endpoints del backend NestJS basados en el contrato `contracts/alojamientos-openapi-v2.yaml` (versión 2.2.0).

---

## 1. Reglas de Comunicación Cliente-Servidor

1. **Autenticación en el Navegador**:
   - El frontend **únicamente** maneja tokens JWT de usuario (`Authorization: Bearer <token>`).
   - La cabecera `X-API-Key` (clave de integración B2B con Booking) está estrictamente restringida a llamadas máquina-a-máquina y **nunca** se expone ni almacena en el cliente web.
2. **Formato Monetario y Localización**:
   - Moneda: `USD` (dólares estadounidenses).
   - Localización: `es-EC` (formato ecuatoriano).
   - Zona horaria: `America/Guayaquil`.
3. **Manejo de Errores Estándar (RFC 7807)**:
   - Todo error del backend devuelve `application/problem+json` con los campos `{ type, title, status, code, detail }`.
   - Códigos estándar: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `HOTEL_NOT_FOUND`, `OUT_OF_STOCK`, `PRICE_MISMATCH`, `QUOTE_EXPIRED`, `CAPACITY_EXCEEDED`, `INVALID_DOCUMENT`, `IDEMPOTENCY_KEY_REUSED`, `VALIDATION_FAILED`.
4. **Idempotencia en Órdenes**:
   - `POST /orders/create` y `POST /orders/:id/cancel` exigen la cabecera `Idempotency-Key: <UUID-v4>`.

---

## 2. Matriz de Vistas, Endpoints y DTOs

| Vista / Pantalla | Ruta Frontend | Endpoint Backend | Método | DTO de Envío (Headers / Query / Body) | DTO de Recepción (Respuesta) | Componente UI | Estado Backend |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **Inicio / Catálogo** | `/` | `/api/v1/alojamientos` | `GET` | **Query**: `page`, `limit`, `ciudad`, `estrellas`, `minPrecio`, `maxPrecio` | `{ data: AlojamientoItem[], metadata: PaginationMetadata }` | `CatalogPage`<br/>`AlojamientoGrid`<br/>`FilterSidebar` | ✅ Implementado |
| **Inicio / Destinos** | `/` | `/api/v1/ciudades` | `GET` | Ninguno | `string[]` (Lista oficial de ciudades de Ecuador) | `HeroSearch`<br/>`DestinationSelector` | ✅ Implementado |
| **Taxonomía / Tipos** | `/`, `/buscar` | `/api/v1/alojamientos/categorias` | `GET` | Ninguno | `{ categorias: string[], tipos: string[] }` | `PropertyTypeChips` | ✅ Implementado |
| **Búsqueda Avanzada** | `/buscar` | `/api/v1/alojamientos/search` | `POST` | **Body**: `{ destination, checkIn, checkOut, occupancy: { adults, rooms }, filters }` | `{ data: AlojamientoItem[], metadata: PaginationMetadata }` | `SearchResultsPage`<br/>`SearchResultsList` | ✅ Implementado |
| **Detalle Alojamiento** | `/alojamiento/:id` | `/api/v1/alojamientos/:id` | `GET` | **Param**: `id` (UUID o código) | `AlojamientoDetalle` (datos, fotos, amenities, ubicación) | `HotelDetailPage`<br/>`HotelGallery`<br/>`HotelSummary` | ✅ Implementado |
| **Habitaciones de Hotel** | `/alojamiento/:id` | `/api/v1/alojamientos/:id/habitaciones` | `GET` | **Param**: `id` | `HabitacionDetalle[]` (id, código, nombre, capacidad, precioNoche, fotos, amenities) | `RoomList`<br/>`RoomCard` | ✅ Implementado |
| **Disponibilidad Fechas** | `/alojamiento/:id` | `/api/v1/alojamientos/:id/availability` | `GET` | **Query**: `checkin`, `checkout`, `adults`, `rooms`, `tipoHabitacion` | `{ accommodation_id, opciones: [{ tipoHabitacionCodigo, estaDisponible, habitacionesRemanentes, precioNoche, precioTotalEstancia, planTarifaCodigo }] }` | `AvailabilityPicker`<br/>`StickyBookingCard` | ✅ Implementado |
| **Reseñas Verificadas** | `/alojamiento/:id` | `/api/v1/alojamientos/:id/resenas` | `GET` | **Param**: `id` | `{ resenas: Resena[], promedio: number, total: number }` | `ReviewsSection`<br/>`RatingBreakdown` | ✅ Implementado |
| **Búsqueda de Cliente** | `/reservar` | `/api/v1/clientes` | `GET` | **Query**: `email`, `identificacion` | `{ client_id, nombre, email, identificacion, telefono }` | `BillingStep` | ✅ Implementado |
| **Creación de Cliente** | `/reservar` | `/api/v1/clientes` | `POST` | **Body**: `{ nombre, email, identificacion, telefono }` | `{ client_id }` | `BillingStep` | ✅ Implementado |
| **Métodos de Pago** | `/reservar` | `/api/v1/pagos/metodos` | `GET` | Ninguno | `MetodoPago[]` (`id`, `nombre`, `estado`) | `PaymentMethodSelector` | ✅ Implementado |
| **Crear Reserva (Saga)** | `/reservar` | `/api/v1/alojamientos/orders/create` | `POST` | **Headers**: `Idempotency-Key: UUID`, `X-Client-Id: UUID`<br/>**Body**: `{ accommodation_id, check_in_date, check_out_date, contact_email, guests: { adults, rooms }, selected_product: { product_id, rate_plan_code, currency, total_price } }` | `{ external_order_id, reservation_code, status, total_amount, currency, holder_info, dates }` | `CheckoutWizard` | ✅ Implementado |
| **Procesar Pago SRI** | `/reservar` | `/api/v1/pagos` | `POST` | **Header**: `Authorization: Bearer <token>`<br/>**Body**: `{ reservaId, metodoPagoId, monto, identificacion, nombre, direccion }` | `{ pagoId, estado, factura: { id, numeroFactura, claveAcceso, subtotal, iva, total, fecha } }` | `PaymentStep` | ✅ Implementado |
| **Voucher / Éxito** | `/reservar/confirmacion/:id` | `/api/v1/orders/:orderId` | `GET` | **Param**: `orderId` | `OrdenCompleta` (detalles de reserva, estado, desglose tributario, datos SRI) | `ConfirmationStep`<br/>`ReservationVoucher` | ✅ Implementado |
| **Mis Reservas** | `/mis-reservas` | `/api/v1/reservas/mias` | `GET` | **Header**: `Authorization: Bearer <token>` | `ReservaUsuario[]` (id, ordenId, hotel, habitación, fechas, precioTotal, estado, facturaId) | `MyBookingsPage`<br/>`BookingList` | ✅ Implementado |
| **Detalle de Reserva** | `/mis-reservas/:id` | `/api/v1/reservas/:id` | `GET` | **Header**: `Authorization: Bearer <token>`<br/>**Param**: `id` | `ReservaUsuarioDetalle` | `BookingDetailPage` | ✅ Implementado |
| **Firmar Contrato** | `/mis-reservas/:id` | `/api/v1/reservas/:id/firmar-contrato` | `POST` | **Header**: `Authorization: Bearer <token>`<br/>**Param**: `id` | `{ mensaje, contratoFirmado: true, fechaFirma }` | `ContractSignatureModal` | ✅ Implementado |
| **Calificar Estancia** | `/mis-reservas/:id` | `/api/v1/reservas/:id/calificar` | `POST` | **Header**: `Authorization: Bearer <token>`<br/>**Body**: `{ calificacion: 1-5, comentario: string }` | `{ mensaje, calificacionGuardada: true }` | `ReviewModal` | ✅ Implementado |
| **Cancelar Reserva** | `/mis-reservas` | `/api/v1/reservas/:id/cancelar` | `POST` | **Header**: `Authorization: Bearer <token>`<br/>**Body**: `{ motivo: string }` | `{ mensaje, estado: 'Cancelada', reembolso: number, penalidad: number }` | `CancelBookingDialog` | ✅ Implementado |
| **Iniciar Sesión** | `/login` | `/api/v1/auth/login` | `POST` | **Body**: `{ correo, contrasena }` | `{ access_token, usuario: { id, nombre, correo, rol, scopes } }` | `LoginForm` | ✅ Implementado |
| **Registrar Usuario** | `/registro` | `/api/v1/auth/register` | `POST` | **Body**: `{ nombre, correo, contrasena, telefono?, edad? }` | `{ id, nombre, correo, rol }` | `RegisterForm` | ✅ Implementado |
| **Perfil de Usuario** | `/perfil` | `/api/v1/auth/me` | `GET` | **Header**: `Authorization: Bearer <token>` | `UsuarioPerfil` (id, nombre, correo, telefono, edad, direccion, rol) | `UserProfilePage` | ✅ Implementado |
| **Editar Perfil** | `/perfil` | `/api/v1/auth/me` | `PATCH` | **Header**: `Authorization: Bearer <token>`<br/>**Body**: `{ nombre?, telefono?, edad?, direccion?, pais? }` | `UsuarioPerfil` | `ProfileEditForm` | ✅ Implementado |
| **Mis Facturas SRI** | `/perfil/facturas` | `/api/v1/pagos/mis-facturas` | `GET` | **Header**: `Authorization: Bearer <token>` | `FacturaItem[]` (id, numeroFactura, subtotal, iva, total, fecha, estado) | `InvoicesTable` | ✅ Implementado |
| **Admin: Métricas** | `/admin` | `/api/v1/admin/dashboard-stats` | `GET` | **Header**: `Authorization: Bearer <admin_token>` | `{ totalAlojamientos, totalReservas, reservasConfirmadas, canceladas, ingresosTotales }` | `AdminDashboardPage` | ✅ Implementado |
| **Admin: Alojamientos** | `/admin/alojamientos` | `/api/v1/admin/alojamientos` | `GET`, `POST` | **Header**: `Authorization: Bearer <admin_token>` | `AlojamientoAdmin[]` | `AdminAlojamientosPage` | ✅ Implementado |
| **Admin: Editar Alojamiento**| `/admin/alojamientos/:id` | `/api/v1/admin/alojamientos/:id` | `PUT`, `PATCH`, `DELETE` | **Header**: `Authorization: Bearer <admin_token>` | `Alojamiento` / `204 No Content` | `AdminAlojamientoForm` | ✅ Implementado |
| **Admin: Habitaciones**| `/admin/alojamientos/:id/habitaciones` | `/api/v1/admin/alojamientos/:id/habitaciones` | `GET`, `POST` | **Header**: `Authorization: Bearer <admin_token>` | `Habitacion[]` | `AdminRoomsManager` | ✅ Implementado |
| **Admin: Reservas Día**| `/admin/recepcion` | `/api/v1/reservas/admin/todas` | `GET` | **Header**: `Authorization: Bearer <admin_token>` | `ReservaAdminItem[]` | `AdminReceptionPage` | ✅ Implementado |
| **Admin: Check-in / Aviso Booking** | `/admin/recepcion` | `/api/v1/orders/:orderId/check-in` | `POST` | **Header**: `Authorization: Bearer <admin_token>`<br/>**Body**: `{ huespedes_reales?: number, observaciones?: string }` | `{ orden_id, estado: 'CHECKED_IN', key_code, booking_notificado: boolean }` | `CheckinActionModal` | ✅ Implementado |

---

## 3. Estado de la API y Elementos Faltantes

Tras la auditoría del contrato OpenAPI v2.2.0 y las correcciones del Anexo A:

1. **Paridad de endpoints**: **100 % cubierta**. Todos los endpoints que las pantallas del frontend requieren existen en el backend NestJS y cuentan con sus correspondientes validadores y guards.
2. **Cero faltantes bloqueantes en el Backend**: Todas las funciones requeridas (Catálogo paginado, búsqueda con filtros, disponibilidad indicativa por fechas, cotización Saga, clientes huésped, pagos con factura SRI, firma de contrato, calificaciones, cancelación con política diferenciada y aviso outbox de check-in hacia Booking) están listas y probadas.
3. **Seguridad Deny-by-Default verificada**:
   - Rutas públicas anotadas con `@Public()`.
   - Rutas protegidas exigen JWT o `X-API-Key` según el caso.
   - Rutas administrativas protegidas con `@Roles(Role.ADMIN)`.
   - Validaciones de propiedad aplicadas en consultas de reservas por usuario.

