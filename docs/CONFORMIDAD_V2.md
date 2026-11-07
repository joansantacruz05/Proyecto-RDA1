# 📋 Matriz de Conformidad Técnica — Vertical Alojamientos (LuxeStays)
**Contrato de Referencia:** OpenAPI v2.2.0 (`contratos/contracts/alojamientos-openapi-v2.yaml`)  
**Fecha de Certificación:** Noviembre 2026  
**Nodo Registrado en Booking Hub:** `NODE_ALO_LUXESTAY_E5K3`  
**Nombre Comercial:** LuxeStays  
**URL Base de Integración (Azure):** `https://posada-ec-alojamientos.azurewebsites.net/api/v2`  
**URL Health Check:** `https://posada-ec-alojamientos.azurewebsites.net/api/v2/alojamientos/health`  
**X-API-Key:** *(Gestionada de forma segura mediante variable de entorno BOOKING_API_KEY / INTEGRATION_API_KEY)*  

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

---

## 3. Conformidad del Nuevo Frontend LuxeStays (React 19 + TypeScript + Vite)

El frontend de **LuxeStays** fue reconstruido integralmente desde cero cumpliendo rigurosamente las directrices del contrato OpenAPI v2.2.0 y la normativa tributaria y turística ecuatoriana:

| Requisito de Cátedra / Contrato | Estado | Implementación Técnica |
| :--- | :---: | :--- |
| **Cero Datos de Negocio Hardcodeados** | **CONFORME** | 100 % dinámico. Ciudades (`/ciudades`), catálogo (`/alojamientos`), habitaciones (`/alojamientos/:id/habitaciones`), disponibilidad (`/availability`), métodos de pago (`/pagos/metodos`), reservas y facturas provienen exclusivamente de la API. |
| **Aislamiento de Claves B2B** | **CONFORME** | La cabecera `X-API-Key` permanece estrictamente confinada al backend para integración con Booking. El cliente web utiliza única y exclusivamente tokens JWT de usuario (`Authorization: Bearer <token>`). |
| **Localización y Formato Oficial** | **CONFORME** | Formato de moneda `USD` en locale `es-EC`, fechas con zona horaria `America/Guayaquil`, check-in a partir de las 14:00 y check-out hasta las 11:00 am. |
| **Desglose Tributario de Ecuador** | **CONFORME** | Cada cotización y factura discrimina: Subtotal Hospedaje, IVA 15% (Ley de Emergencia vigente) y Tasa municipal de turismo de USD 2.00 por noche por habitación. |
| **Validación Documental SRI (Módulo 10)** | **CONFORME** | Validador oficial para Cédulas de 10 dígitos (provincias 01 a 24 y tercer dígito < 6), RUCs de 13 dígitos y Pasaportes, con autofoco y sin errores prematuros en blanco. |
| **Idempotencia y Transacción Saga** | **CONFORME** | Generación de `Idempotency-Key` (UUID v4) persistente por intento en checkout para evitar duplicidad de cobros. |
| **Ciclo de Vida de Reservas** | **CONFORME** | Soporte de estados `PENDING`, `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT` y `CANCELLED`. |
| **Firma Digital de Contratos** | **CONFORME** | Modal accesible para firma de contrato de hospedaje sincronizado con `POST /reservas/:id/firmar-contrato`. |
| **Política de Cancelación en 3 Tramos** | **CONFORME** | Modal dinámico que calcula horas previas al check-in (>48h: 100% reembolso; 24-48h: 50%; <24h: 0% sin reembolso) y ejecuta `POST /reservas/:id/cancelar`. |
| **Botón de Check-in en Panel Admin** | **CONFORME** | En `/admin/recepcion`, botón **"Confirmar llegada"** pasa la orden a `CHECKED_IN`, almacena en tabla outbox y notifica a Booking Core API con `X-API-Key`. |
| **TypeScript Estricto** | **CONFORME** | Tipado sin `any`, interfaces exhaustivas para todas las entidades y DTOs, `exactOptionalPropertyTypes: true` y `noImplicitAny: true`. |
| **Pruebas Automatizadas** | **CONFORME** | 31 pruebas unitarias pasando al 100% en Vitest (validadores SRI, componentes, flujo de checkout, autenticación y portal de reservas). |


