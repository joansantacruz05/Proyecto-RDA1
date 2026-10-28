# MEJORAS Y COMPLEMENTO DE INTEGRACIÓN - PROYECTO RDA1 (LuxeStays)
Backend NestJS + TypeORM + Supabase | Frontend React + Vite

## 1. Orden de Prioridades y Autoridad
1. **Complemento de Integración** (Booking gRPC, prueba local Tailscale, rediseño con paridad).
2. **Contrato `alojamientos-openapi-v2.yaml`** (v2.2.0) una vez provisto.
3. **Prompt inicial de mejora integral** (Fases 0 a 6).
4. **Contrato v1** (`backend/contracts/alojamientos-openapi.yaml`).

### Estado de contratos inicial:
- `alojamientos-openapi-v2.yaml`: **No presente** en el repo. Se solicita al usuario; no se inventa contenido.
- `backend/proto/inventory.proto`: **Localizado y copiado** a `backend/proto/inventory.proto`.

---

## 2. Plan de Ejecución por Prioridades

### P1 · Entorno Local y Conectividad Externa (Sección 6)
- [ ] Escucha en `0.0.0.0` y puerto configurable en backend (`PORT=3000`).
- [ ] Vite configurado con `server.host: true` y script `npm run dev:red`.
- [ ] Endpoint GET `/health` y GET `/api/v1/health` retornando `{ status: 'ok' }` y verificando base de datos.
- [ ] Endpoint raíz GET `/` y GET `/api/v1` retornando `{ servicio: 'alojamientos', version: '1.0.0', estado: 'ok' }`.
- [ ] Soporte de `CORS_EXTRA_ORIGINS` para IPs externas de Tailscale.
- [ ] Logging estructurado con `X-Correlation-ID`.
- [ ] Script de diagnóstico `backend/scripts/preflight.mjs`.
- [ ] Documentación `docs/PRUEBA_LOCAL.md`.

### P2 · Bugs Bloqueantes y Seguridad Inmediata (Fase 0 y Fase 3)
- [ ] Fase 0: Eliminar scripts con credenciales en texto plano (`alter*.js`, `check*.js`, `test_hash.js`, `booking.sqlite`).
- [ ] Fase 0: Validación estricta de variables de entorno requeridas (`DATABASE_URL`, `JWT_SECRET` min 32 chars).
- [ ] Fase 0: `docs/SEGURIDAD.md` con instrucciones de rotación de credenciales en Supabase.
- [ ] Migración `001_mejoras.sql` y `002_vertical_alojamientos.sql`:
  - Índices y restricciones de integridad.
  - Sequencia `seq_numero_factura`.
  - Columnas `codigo`, `horaCheckIn`, `horaCheckOut` en alojamientos.
  - Columnas de desglose fiscal (`subtotal`, `iva`, `tasaMunicipal`, `moneda`, `ordenId`) en reservas.
  - Tablas `stock_outbox`, `webhook_eventos`, `idempotency_keys` con RLS habilitado.
  - Inserción de método `MET-005` ('Efectivo').
  - Vista `vista_dashboard_admin` corregida.
- [ ] Corrección de hashes bcrypt de usuarios semilla (`seed-usuarios.ts`, `seed.sql`, `datos_semilla.sql`).
- [ ] Corrección de login, decodificación UTF-8 de JWT y `/auth/me` sin hash de contraseña.
- [ ] Paridad en validación de contraseñas entre frontend y backend.
- [ ] Corrección de perfil con edad vacía.
- [ ] Lógica de reservas y disponibilidad por fechas (solapamiento `FOR UPDATE` sin descontar inventario permanente).
- [ ] Máquina de estados estricta en reservas con registro en `historial_reservas`.

### P3 · Órdenes de Contrato, Idempotencia y Desglose Fiscal
- [ ] `POST /orders/preview`: Cotización exacta (noches, tarifa, IVA 15%, Tasa Municipal USD 2/noche).
- [ ] `POST /orders/create`: Retorno 201 con `externalOrderId` e Idempotency-Key.
- [ ] Retorno 409 `OUT_OF_STOCK` en caso de agotamiento de habitación para fechas solicitadas.
- [ ] Idempotencia estricta en cancelaciones y modificaciones.
- [ ] Montos expresados como string decimal exacto (`"560.00"`).
- [ ] Script de prueba automatizada `backend/scripts/smoke.mjs`.

### P4 · gRPC de Stock hacia Booking Prototipo
- [ ] Cliente gRPC para `InventoryStockService` sobre `backend/proto/inventory.proto`.
- [ ] Generación de `PushStockUpdate` por noche de estancia con timestamp monotónico creciente.
- [ ] Manejo de acuses `StockUpdateAck` y errores (`STALE_TIMESTAMP_IGNORED`, `ITEM_NOT_FOUND`, `INVALID_SLOT`).
- [ ] Patrón Outbox en `stock_outbox` para tolerancia a fallos.
- [ ] Servidor simulado `backend/scripts/mock-booking-grpc.ts` (`npm run mock:booking`).
- [ ] Endpoints de administración: `POST /admin/inventario/sincronizar` y `GET /admin/inventario/verificar`.

### P5 · Rediseño Frontend y Paridad de Funciones
- [ ] Documento `docs/PARIDAD.md` con checklist de funcionalidades existentes y nuevas.
- [ ] Refactorización modular de `App.tsx` en `src/pages/`, `src/components/`, `src/features/`, `src/lib/`.
- [ ] Cliente API robusto `src/lib/api.ts` con manejo de estados de carga, timeout y reintentos (Cold Start de Render).
- [ ] Sustitución de `prompt`/`confirm` nativos por modales accesibles.
- [ ] Diseño estético LuxeStays (Outfit, acento `#D4AF37`, modo claro/oscuro, contraste AA, responsive 360px+).
- [ ] Vistas administrativas añadidas: Gestión de Inventario/gRPC y Visor de Eventos Webhooks.
