# Migraciones de Base de Datos - LuxeStays

Este directorio contiene las migraciones SQL idempotentes del esquema de PostgreSQL en Supabase.

---

## 1. Migraciones Disponibles

1. **`001_mejoras.sql`**:
   * Restricciones de integridad de fechas (`chk_reservas_fechas`) y calificación 1 a 5 (`chk_reservas_calificacion`).
   * Columna `ordenId` (UUID v4) con índice único para mapeo con el Hub.
   * Índices de rendimiento para consultas concurrentes.
   * Índice único de pago completado por reserva (`uq_pago_completado_por_reserva`).
   * Inserción del método de pago `MET-005` ('Efectivo').
   * Secuencia `seq_numero_factura` para formato SRI (`001-001-000000123`).
   * Tabla `idempotency_keys` para compras y cancelaciones seguras.
   * Vista `vista_dashboard_admin` corregida.
   * Activación de Row Level Security (RLS) en todas las tablas públicas.

2. **`002_vertical_alojamientos.sql`**:
   * Códigos unívocos para propiedades (`codigo`, ej: `HTL-UIO-001`) y habitaciones (`SUITE_DELUXE`).
   * Horarios de Check-In (`14:00`) y Check-Out (`11:00`) en huso `America/Guayaquil` (UTC-5).
   * Desglose fiscal exacto en reservas (`subtotal`, `iva`, `tasaMunicipal`, `moneda`, `correlationId`).
   * Columna `tasaMunicipal` en la tabla `facturas`.
   * Tabla `stock_outbox` para la sincronización asíncrona gRPC hacia Booking Prototipo.
   * Tabla `webhook_eventos` para auditar notificaciones entrantes.

---

## 2. Cómo ejecutarlas en Supabase

1. Acceder al proyecto en la consola de [Supabase](https://supabase.com/dashboard).
2. Abrir la pestaña **SQL Editor** en el menú lateral izquierdo.
3. Crear una nueva consulta (**New query**).
4. Copiar y pegar el contenido de `001_mejoras.sql` y presionar **Run**.
5. Repetir el proceso con `002_vertical_alojamientos.sql` y presionar **Run**.
6. Ambas migraciones son **idempotentes**, lo que significa que pueden ejecutarse múltiples veces consecutivas sin generar errores ni duplicación de datos.

---

## 3. Ejecución directa mediante Node.js
También es posible correrlas directamente contra la base de datos configurada en `backend/.env` usando:
```bash
node scripts/run-migrations.mjs
```
