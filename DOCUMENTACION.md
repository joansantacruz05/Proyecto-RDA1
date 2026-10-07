# Booking Prototipo - Documentación Técnica y de Arquitectura

## 1. Visión General del Proyecto
Booking Prototipo es una plataforma web (Marketplace) para la gestión y reserva de espacios rentables (hoteles, hostales, departamentos). El sistema está compuesto por un Backend desarrollado en NestJS (API RESTful) y un Frontend desarrollado en React (Vite). La base de datos es relacional (PostgreSQL) y se encuentra hospedada en Supabase. Ambos entornos están desplegados en la nube (Render para Backend, Vercel para Frontend).

## 2. Arquitectura del Sistema
El sistema sigue una arquitectura cliente-servidor orientada a servicios (SOA preliminar):
- **Capa de Presentación (Frontend):** Aplicación SPA en React. Maneja el enrutamiento (reservas, administración, facturación) y la interacción con el usuario final.
- **Capa de Lógica de Negocio (Backend):** Desarrollada con NestJS, encapsula reglas de inventario (descuento de stock en tiempo real), autenticación y orquestación de pagos.
- **Capa de Datos:** PostgreSQL en Supabase. Utiliza TypeORM para el mapeo objeto-relacional (ORM).

## 3. Modelo de Datos (Esquema Principal)
Las entidades principales son:
- **`usuarios`**: Gestiona clientes y administradores.
- **`alojamientos`**: Contiene la información general de la propiedad (nombre, destino, políticas).
- **`espacios_rentables`**: Representa las habitaciones o departamentos individuales. Maneja el atributo clave `cantidadDisponible` para control de concurrencia.
- **`reservas`**: Relaciona a un usuario con un espacio rentable en un lapso de tiempo.
- **`estados_reserva`**: Catálogo paramétrico (Ej: EST-001 Pendiente, EST-002 Confirmada, EST-003 Cancelada).
- **`pagos`** y **`contratos`**: Manejan la facturación electrónica y la confirmación legal del servicio.

## 4. APIs e Interoperabilidad (Diseño API-First)
Todo el sistema backend expone endpoints REST documentados automáticamente con **OpenAPI / Swagger** (accesible en la ruta `/api/docs` del servidor). 
El diseño API-first asegura que el core del negocio esté completamente desacoplado del frontend actual, permitiendo futuras integraciones (Ej. App móvil, Tótems de autoservicio).

### Contratos de Endpoints Principales (Ejemplos)
- **POST `/api/v1/reservas`**: 
  - *Descripción:* Crea una reserva temporal e inicia el contrato. Disminuye el stock del inventario.
  - *Payload (Contrato de entrada):* `{ "alojamientoId": "uuid", "nombreCliente": "string", "fechaInicio": "YYYY-MM-DD", "fechaFin": "YYYY-MM-DD", "totalPagar": number }`
  - *Respuesta:* `{ "id": "RES-12345", "status": "success" }`
- **POST `/api/v1/pagos`**: 
  - *Descripción:* Procesa el pago y cambia el estado de la reserva.
  - *Payload:* `{ "reservaId": "uuid", "monto": number, "requiereFactura": boolean, "factura": object }`

## 5. Diseño Preliminar de Eventos (SOA / EDA)
Para garantizar la escalabilidad y la futura integración con otros sistemas externos (Ej: Aerolíneas, Renta de autos, CRMs de hoteles), el sistema se ha diseñado pensando en una Arquitectura Orientada a Eventos (EDA). 

**Eventos Clave Identificados para el Futuro Bus de Eventos (Ej. RabbitMQ / Kafka):**
1. `ReservaCreadaEvent`: 
   - *Trigger:* Almacenamiento exitoso en la tabla `reservas`.
   - *Consumidores futuros:* Servicio de Notificaciones (Email/SMS), Módulo de Análisis de Demanda, Módulo de Renta de Autos (cross-selling).
2. `PagoConfirmadoEvent`:
   - *Trigger:* Registro exitoso del pago y facturación.
   - *Consumidores futuros:* ERP Financiero externo, Servicio de Facturación Electrónica del SRI.
3. `InventarioAgotadoEvent`:
   - *Trigger:* Cuando `cantidadDisponible` de un espacio llega a 0.
   - *Consumidores futuros:* Motor de Precios Dinámicos (para subir precios de habitaciones similares por alta demanda).

## 6. Enlaces de Despliegue en la Nube
- **Frontend (Vercel):** (Revisar link actual del proyecto)
- **Backend (Render):** (Revisar link actual del proyecto)
- **Base de Datos:** Operativa remotamente vía Supabase (PostgreSQL).

---
*Este documento constituye la evidencia técnica mínima requerida para demostrar la aplicabilidad de SOA, EDA y el diseño API-first dentro del ecosistema de Booking Prototipo.*
