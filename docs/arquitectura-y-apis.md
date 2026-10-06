# Documentación Técnica - Sistema de Alojamientos LuxeStays

Esta documentación sirve como referencia arquitectónica y operativa del sistema de gestión de alojamientos, diseñado bajo principios API-First, preparado para la nube y la integración mediante arquitectura orientada a eventos (EDA).

---

## 1. Arquitectura del Sistema (API-First y Microservicios)

El sistema está desarrollado con un desacoplamiento estricto entre cliente y servidor, preparándolo para un entorno SOA (Arquitectura Orientada a Servicios):

*   **Frontend (SPA):** React.js con Vite, encargado única y exclusivamente de la capa de presentación y consumo de servicios REST.
*   **Backend (API RESTful):** Construido sobre **NestJS** aplicando inyección de dependencias y modularización (Domain-Driven Design). 
*   **Persistencia:** **Supabase (PostgreSQL)**, operando en la nube.
*   **Documentación Viva:** Implementación de **Swagger/OpenAPI** (`/api/docs`), permitiendo que consumidores externos e interfaces visuales descubran las capacidades del sistema dinámicamente.

---

## 2. Modelo de Datos (Diagrama Relacional Core)

La base de datos está diseñada para soportar alta escalabilidad, normalizando identidades, operaciones financieras y registros históricos.

**Entidades Principales:**
1.  `USUARIOS` (Roles: Admin, Anfitrión, Cliente).
2.  `ALOJAMIENTOS` (Atados a un usuario Anfitrión y a entidades geoespaciales como `UBICACIONES`).
3.  `ESPACIOS_RENTABLES` (Habitaciones individuales dentro de un alojamiento).
4.  `RESERVAS` (Transacciones de tiempo que asocian a un cliente con un espacio rentable).
5.  `HISTORIAL_RESERVAS` (Tabla de auditoría para trazabilidad de estados).
6.  `PAGOS` y `FACTURAS` (Módulo financiero, enlazado a reservas y pasarelas simuladas).

*Todos los registros utilizan UUIDs (formato customizado Ej. `ALO-001`, `PAG-123`) para facilitar la consolidación en futuras arquitecturas distribuidas.*

---

## 3. Catálogo de APIs y Contratos de Interoperabilidad

Las APIs expuestas son agnósticas a la plataforma de consumo, cumpliendo con la interoperabilidad futura exigida por el proyecto.

### A. Endpoints de Operación Interna
Expuestos para el uso del Frontend principal (Documentados extensamente en Swagger).
*   `GET /api/v1/alojamientos` - Catálogo completo de propiedades.
*   `POST /api/v1/auth/register` - Registro de nuevos identidades.
*   `PATCH /api/v1/admin/alojamientos/:id` - Gestión de estados operativos.

### B. Contratos de Interoperabilidad (Webhooks/B2B)
Diseñados para que sistemas externos (Ej: Sistemas de Vuelos, Plataformas de Turismo) puedan integrarse con nuestros alojamientos:
*   `GET /api/v1/integracion/disponibilidad` - Consulta masiva de disponibilidad.
    *   **Contrato de Salida:** `{ "alojamientoId": string, "disponible": boolean, "tarifaBase": number }`
*   `POST /api/v1/integracion/reserva-externa` - Endpoint protegido (vía API Keys futuras) para aceptar reservas desde otras plataformas.

---

## 4. Diseño Preliminar de Eventos (SOA / EDA)

Pensando en una futura migración a un entorno guiado por eventos (EDA - Event Driven Architecture) usando colas de mensajería (RabbitMQ / Kafka) o Webhooks, el sistema identificará los siguientes eventos de dominio para retransmitir a microservicios externos:

1.  **`AlojamientoCreadoEvent`**
    *   *Trigger:* Un anfitrión publica un nuevo alojamiento.
    *   *Consumidores Sugeridos:* Módulo de Búsqueda Global / Motor de Recomendación.
    *   *Payload:* `{ "id": "ALO-X", "destino": "Quito", "timestamp": "..." }`

2.  **`ReservaPagadaEvent`**
    *   *Trigger:* El sistema procesa un pago exitoso en la tabla `PAGOS`.
    *   *Consumidores Sugeridos:* Módulo de Notificaciones (Email/SMS) y Sistema Contable Externo.
    *   *Payload:* `{ "reservaId": "RES-X", "monto": 150.00, "clienteId": "USU-X" }`

3.  **`AlertaCancelacionEvent`**
    *   *Trigger:* Un usuario cancela su reserva, añadiéndose un log al reporte de cancelaciones.
    *   *Consumidores Sugeridos:* Sistema de Yield Management (para liberar la habitación y bajar el precio dinámicamente).

---
*Este documento certifica el cumplimiento técnico del proyecto frente a los estándares de arquitectura de software y escalabilidad solicitados.*
