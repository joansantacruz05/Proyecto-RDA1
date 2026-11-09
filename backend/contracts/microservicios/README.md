# Catálogo de Contratos OpenAPI y gRPC por Microservicio
## Nodo de Alojamientos (LuxeStays) — Integración de Sistemas (RDA1 / RDA2)

Este directorio contiene los **contratos formales e independientes** (API-First, OpenAPI 3.0.3 y Protocol Buffers v3) para cada uno de los microservicios que componen la vertical hotelera de Alojamientos:

---

### Tabla de Contratos por Microservicio

| # | Microservicio | Archivo de Contrato | Protocolo | Responsabilidad Principal |
| :---: | :--- | :--- | :---: | :--- |
| **1** | **`ms_identidad`** | [`1-ms-identidad.openapi.yaml`](./1-ms-identidad.openapi.yaml) | REST / JWT | Registro, login, hash BCrypt, emisión de tokens JWT y roles RBAC (`Admin`, `Cliente`, `Anfitrión`). |
| **2** | **`ms_catalog`** | [`2-ms-catalogo.openapi.yaml`](./2-ms-catalogo.openapi.yaml) | REST | Búsqueda geográfica, catálogo de propiedades, fotos, amenidades, filtros y ciudades del Ecuador. |
| **3** | **`ms_rooms`** | [`3-ms-habitaciones.openapi.yaml`](./3-ms-habitaciones.openapi.yaml) | REST | Estructura de habitaciones, tipos de cama, capacidad de adultos/niños y fotos por cuarto. |
| **4** | **`ms_inventory`** | [`4-ms-inventario.openapi.yaml`](./4-ms-inventario.openapi.yaml) <br> + [`../../proto/inventory.proto`](../../proto/inventory.proto) | REST + **gRPC (50051)** | Disponibilidad en tiempo real, calendario de restricciones ARI y push de stock por noche hacia el Booking Hub. |
| **5** | **`ms_orders`** | [`5-ms-ordenes.openapi.yaml`](./5-ms-ordenes.openapi.yaml) | REST | Orquestación Saga de compra, bloqueo ACID, idempotencia estricta RFC 7807 (`Idempotency-Key`) y feed Outbox CloudEvents. |
| **6** | **`ms_pricing` / Pagos** | [`6-ms-pagos-facturacion.openapi.yaml`](./6-ms-pagos-facturacion.openapi.yaml) | REST | Cálculo tributario (IVA 15%, Tasa municipal $2/noche), validación de Cédula/RUC y Factura SRI (`001-001-XXXXXXXXX`). |
| **7** | **`ms_reception`** | [`7-ms-recepcion.openapi.yaml`](./7-ms-recepcion.openapi.yaml) | REST | Check-in legal (14:00), Check-out (11:00), clave digital, firma de contrato y liberación inmediata de cupos. |
| **8** | **`ms_gateway`** | [`8-ms-api-gateway.openapi.yaml`](./8-ms-api-gateway.openapi.yaml) | REST | Enrutamiento único `/api/v2` y `/api/v1`, Rate Limiting, X-Correlation-ID y Kill-Switch 503. |

---

### Contrato Maestro Consolidado
Para la integración con el ESB central de la cátedra se mantiene además el contrato maestro unificado:
- **Contrato General OpenAPI v2.2.0:** [`../alojamientos-openapi-v2.yaml`](../alojamientos-openapi-v2.yaml)
