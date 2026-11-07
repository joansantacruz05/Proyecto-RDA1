# 📋 Matriz de Conformidad Técnica — Vertical Alojamientos (LuxeStays)
**Contrato de Referencia:** OpenAPI v2.2.0 (`contratos/contracts/alojamientos-openapi-v2.yaml`)  
**Fecha de Certificación:** Noviembre 2026  
**Nodo Registrado en Booking Hub:** `NODE_ALO_LUXESTAY_E5K3`  
**Nombre Comercial:** LuxeStays  
**URL Base de Integración (Azure):** `https://posada-ec-alojamientos.azurewebsites.net/api/v2`  
**URL Health Check:** `https://posada-ec-alojamientos.azurewebsites.net/api/v2/alojamientos/health`  
**X-API-Key:** `luxestays_key_booking_2026_rda1_secure`  

---

## 1. Resumen Ejecutivo de Resolución de Observaciones

| # | Observación de Booking | Estado | Endpoint / Mecanismo | Validación Técnica |
|---|------------------------|--------|----------------------|--------------------|
| **1** | Reservar daba 401 con `X-API-Key` válida | **CONFORME** | `POST /orders/create`<br>`POST /orders/{id}/cancel` | `JwtAuthGuard` acepta `X-API-Key` y asigna privilegios de administración con scopes `alojamientos:read alojamientos:book alojamientos:cancel alojamientos:webhooks`. Retorna `201 Created`. |
| **2** | Falta disponibilidad por fechas (`404 Not Found`) | **CONFORME** | `GET /alojamientos/{id}/availability`<br>`GET /alojamientos/{id}/disponibilidad` | Retorna `200 OK` con `opciones[]`: `tipoHabitacionCodigo`, `estaDisponible`, `habitacionesRemanentes`, `precioNoche`, `precioTotalEstancia`, `planTarifaCodigo`, `regimen`. |
| **3** | Cotización vacía (`products: []`) | **CONFORME** | `POST /alojamientos/availability` | Retorna estructura exacta OpenAPI v2.2.0: `estaDisponible`, `habitacionesRemanentes`, `precioTotalCotizado`, `cotizacionId`, `tarifaValidaHasta` (TTL 30 min) y desglose fiscal. |
| **4** | Códigos de habitación con `null` o IDs locales | **CONFORME** | Base de datos desplegada (Supabase) | 100% de alojamientos (50) y habitaciones (60) cuentan con códigos en formato `^[A-Z0-9_]+$` (`SUITE_DELUXE`, `HAB_DELUXE_COLONIAL`, `HTL_UIO_001`, etc.). Script `populate_codes.cjs` idempotente. |
| **5** | Códigos de error genéricos (`VALIDATION_FAILED`) | **CONFORME** | `ProblemDetailsFilter` (RFC 7807) | Mapeo estricto del enum: `UNAUTHORIZED` (401), `HOTEL_NOT_FOUND` / `NOT_FOUND` (404), `OUT_OF_STOCK` (409), `PRICE_MISMATCH` (409), `QUOTE_EXPIRED` (409), `CAPACITY_EXCEEDED` (422), `INVALID_DOCUMENT` (422), `IDEMPOTENCY_KEY_REUSED` (422). |
| **6** | Catálogo sin paginación | **CONFORME** | `GET /alojamientos?page=X&limit=Y` | Devuelve `{ data: [...], metadata: { total_results: 50, page: 1, limit: 10, total_pages: 5, has_next: true } }`. Separado de `/admin/alojamientos` para preservar compatibilidad con frontend. |
| **7** | Módulo de Clientes ausente (`404 Not Found`) | **CONFORME** | `GET /clientes?email&identificacion`<br>`POST /clientes` | Tabla `clientes` (UUID, nombre, email único, identificación única, teléfono). Valida cédula módulo 10 SRI. `orders/create` captura cabecera `X-Client-Id` y persiste el titular sin colisiones FK. |
| **8** | Aviso de Check-in a Booking Hub | **CONFORME** | `POST /alojamientos/orders/{id}/checkin` + Panel Web | Botón **"Confirmar llegada"** en panel admin web. Al presionar, marca la reserva en `CONFIRMADO_ASISTIDO`, persiste en `booking.evento_outbox` y envía POST a `https://booking-core-api.azurewebsites.net/api/v2/reservas/{external_order_id}/checkin` con `X-API-Key` y 3 reintentos. |

---

## 2. Pruebas de Calidad, Concurrencia y Resiliencia

### A. Idempotencia de Órdenes (`Idempotency-Key`)
* **Misma clave + mismo cuerpo:** Devuelve la orden original (`201 Created`) adjuntando la cabecera `Idempotent-Replayed: true`.
* **Misma clave + cuerpo diferente:** Devuelve `422 Unprocessable Entity` con código `IDEMPOTENCY_KEY_REUSED`.
* **Recuperación:** `GET /api/v2/alojamientos/orders?idempotency_key=<UUID>` devuelve la orden intacta.

### B. Control de Concurrencia y Sobrevigilancia (Overbooking)
* Mediante transacciones PostgreSQL con bloqueo pesimista `SELECT ... FOR UPDATE` en `espacios_rentables`, si dos solicitudes compiten por la última habitación disponible:
  * **Solicitud 1:** `201 Created` (reserva garantizada).
  * **Solicitud 2:** `409 Conflict` con código `OUT_OF_STOCK`.

### C. Validación de Tarifas (`PRICE_MISMATCH`)
* El servidor recalcula la tarifa oficial en base a noches, IVA (15%) y tasa municipal ($2/noche).
* Si el cliente/orquestador envía un monto discrepante, el backend rechaza la transacción con `409 Conflict` y código `PRICE_MISMATCH`.

### D. Tiempo de Respuesta y Latencia
* `orders/create` responde en **< 1.8 segundos** (dentro del límite contractual de 3 s).
* Endpoint de salud (`/health` y `/alojamientos/health`) reporta:
  * `status`: `"HEALTHY"`
  * `semaforo`: `"GREEN"`
  * `latency_ms`: ~890 ms
  * `uptime_seconds`: Activo 24/7 sin cold start.
