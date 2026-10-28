# LuxeStays · Nodo de Alojamientos (Proyecto RDA1)
### Plataforma de Integración Turística del Ecuador · EPN 2026

[![Backend NestJS](https://img.shields.io/badge/Backend-NestJS%2010-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Database PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Supabase-336791?logo=postgresql&logoColor=white)](https://supabase.com/)
[![gRPC Sync](https://img.shields.io/badge/Protocol-gRPC%20v3-244c5a?logo=google&logoColor=white)](https://grpc.io/)
[![Frontend React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Smoke Suite](https://img.shields.io/badge/Smoke%20Suite-24%2F24%20PASS-10B981)](#)
[![gRPC Suite](https://img.shields.io/badge/gRPC%20Suite-11%2F11%20PASS-10B981)](#)

---

## 1. Descripción del Sistema

**LuxeStays** es el nodo de alojamientos de alta gama desarrollado para la arquitectura de integración de sistemas de viaje y turismo en el Ecuador. Permite la reserva de hoteles boutique, resorts y villas privadas con cálculo automatizado de tributos ecuatorianos (**IVA 15%** y **Tasa Municipal de Turismo**), emisión secuencial de facturas electrónicas SRI (`001-001-XXXXXXXXX`), contratos legales de hospedaje firmados digitalmente y sincronización bidireccional de inventario con el **Booking Hub** mediante **gRPC**.

---

## 2. Arquitectura de Alto Nivel

```
[ Frontend SPA (Vercel) ] <--- REST / HTTPS ---> [ Backend NestJS (Render) ]
                                                         |
                           +-----------------------------+-----------------------------+
                           |                             |                             |
                 [ PostgreSQL (Supabase) ]     [ Transaccional Outbox ]    [ Booking Hub (gRPC 50051) ]
                 - Alojamientos & Cuartos      - stock_outbox queue         - inventory.proto
                 - Reservas & Facturas SRI     - 90-Day Bulk Sync           - PushStockUpdate
                 - Idempotency Keys            - Auto-retry worker          - GetSlotAvailability
```

---

## 3. Estructura del Repositorio

```text
Proyecto RDA1/
├── backend/                     # Servidor NestJS 10 + TypeORM
│   ├── proto/                   # Protocol Buffers (inventory.proto)
│   ├── db/migrations/           # Migraciones SQL idempotentes (001 y 002)
│   ├── scripts/
│   │   ├── smoke.mjs            # Suite de pruebas automatizadas (24 checks)
│   │   ├── test-grpc-sync.mjs   # Suite de pruebas gRPC (11 checks)
│   │   └── mock-booking-grpc.ts # Servidor mock gRPC en puerto 50051
│   └── src/modules/             # Alojamientos, Reservas, Pagos, Inventario, Facturación
├── frontend/                    # SPA React 19 + TypeScript + Vite
│   ├── src/components/
│   │   ├── accommodation/       # Tarjetas, Destinos Ecuador, Filtros, Selector
│   │   ├── booking/             # Checkout, Pagos, Contrato Digital, Factura SRI
│   │   ├── admin/               # Métricas, Alojamientos, Habitaciones, gRPC Monitor
│   │   └── common/              # Navbar, Footer, Modal, RatingStars, ColdStartBanner
│   └── src/pages/               # HomePage, MyReservationsPage, AdminDashboardPage
├── docs/                        # Documentación técnica y arquitectura
│   ├── ARQUITECTURA.md          # Especificación detallada y transición a microservicios
│   ├── PARIDAD.md               # Certificación de paridad funcional 1:1
│   ├── DESPLIEGUE.md            # Guía de producción en Render & Vercel
│   └── SEGURIDAD.md             # Políticas de credenciales y auditoría LOPDP
└── postman/                     # Colección Postman para pruebas de integración
```

---

## 4. Guía de Inicio Rápido (Local)

### Requisitos Previos
- Node.js $\ge 20.x$
- npm $\ge 10.x$

### Paso 1: Configurar Variables de Entorno del Backend
Crea el archivo `backend/.env` (o utiliza las variables de Render):
```ini
PORT=3000
DATABASE_URL=postgresql://postgres:[PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:6543/postgres?sslmode=require
JWT_SECRET=tu_clave_secreta_super_segura_minimo_32_caracteres_2026
FRONTEND_URL=http://localhost:5173
BOOKING_GRPC_URL=localhost:50051
```

### Paso 2: Instalar y Compilar
```bash
# Backend
cd backend
npm install
npm run build

# Frontend
cd ../frontend
npm install
npm run build
```

---

## 5. Ejecución de Pruebas Automatizadas

El proyecto cuenta con suites de prueba automatizadas completas que no requieren herramientas externas:

### 1. Suite de Humo del Backend (24 Checks)
Ejecuta validaciones de salud, catálogo, autenticación, cotización con 2 decimales exactos, creación de orden idempotente, rechazo 409 por stock agotado, pago con factura SRI, firma digital de contrato, cancelación con regla 24h y calificación post check-out:
```bash
cd backend
npm run smoke
```
> **Resultado:** `24/24 PASS (0 fails)`

### 2. Suite de Sincronización gRPC (11 Checks)
Verifica la transmisión de disponibilidad, consultas de slots remotos y streaming bidireccional contra el mock de Booking Hub en el puerto 50051:
```bash
# En una terminal: iniciar el mock gRPC
cd backend
npm run mock:booking

# En otra terminal: ejecutar la suite gRPC
cd backend
npm run test:grpc
```
> **Resultado:** `11/11 PASS (0 fails)`

---

## 6. Credenciales de Prueba (Semilla)

Tras aplicar `seed-usuarios.ts`, las credenciales predeterminadas son:

| Rol | Correo Electrónico | Contraseña | Alcance |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@luxestays.com` | `Admin2026*` | Acceso total al panel de control, gRPC y facturas. |
| **Anfitrión** | `host@luxestays.com` | `Host2026*` | Publicación de propiedades y gestión de cuartos. |
| **Cliente / Huésped** | `cliente@luxestays.com` | `Cliente2026*` | Búsqueda, reserva, pagos y contratos. |

---

## 7. Despliegue en la Nube

- **Backend:** Configurado mediante `render.yaml` como Web Service Node.js en Render.
- **Frontend:** Configurado en Vercel con variable de entorno `VITE_API_URL=https://[TU-BACKEND-RENDER].onrender.com/api/v1`.
- **Base de Datos:** PostgreSQL en Supabase con Pooling en puerto 6543 y SSL forzado.
