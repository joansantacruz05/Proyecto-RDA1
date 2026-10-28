# Guía de Prueba Local e Integración por Red / Tailscale

Esta guía prepara el entorno para la reunión de integración entre el servicio de **Alojamientos (LuxeStays)** y la plataforma **Booking Prototipo**.

---

## 1. Configuración de Red y Firewall de Windows

Para permitir que otras máquinas en la misma red o mediante Tailscale puedan realizar peticiones HTTP REST a este servicio, se debe habilitar el puerto 3000 en el Firewall de Windows.

### Comando en PowerShell (Ejecutar como Administrador):
```powershell
New-NetFirewallRule -DisplayName "Prueba integracion LuxeStays" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Any
```

> **Nota:** La sincronización gRPC de inventario es saliente desde LuxeStays hacia Booking (puerto 50051). Por lo tanto, **no** es necesario abrir el puerto 50051 de entrada en esta máquina para la sincronización de stock.

---

## 2. Tabla de Datos para el Equipo Booking

| Parámetro | Valor Local / Tailscale | Valor en Producción (Render) |
| :--- | :--- | :--- |
| **IP del Nodo** | Consultar con `node scripts/preflight.mjs` (o `tailscale ip -4`) | Asignada por Render (`*.onrender.com`) |
| **Puerto REST** | `3000` | `443` (HTTPS) |
| **URL Base del Ping** | `http://<IP-TAILSCALE>:3000` | `https://<DOMINIO>.onrender.com` |
| **URL Base de la API** | `http://<IP-TAILSCALE>:3000/api/v1` | `https://<DOMINIO>.onrender.com/api/v1` |
| **Health Check** | `http://<IP-TAILSCALE>:3000/health` o `/api/v1/health` | `https://<DOMINIO>.onrender.com/api/v1/health` |
| **Swagger UI** | `http://<IP-TAILSCALE>:3000/api/docs` | `https://<DOMINIO>.onrender.com/api/docs` |
| **Usuario Admin** | `admin@rda.com` | Configurado en base de datos Supabase |
| **Usuario Cliente** | `cliente@rda.com` | Configurado en base de datos Supabase |

---

## 3. Comandos de Arranque y Diagnóstico

### Paso 1: Diagnóstico previo (Preflight)
En la carpeta `backend/`:
```bash
node scripts/preflight.mjs
```
El script reportará:
- IP de Tailscale y red local.
- Conexión a la base de datos PostgreSQL en Supabase.
- Estado del servidor local HTTP.
- Estado de conectividad al gRPC de Booking.

### Paso 2: Servidor Mock de Booking (si se prueba de forma aislada)
```bash
npm run mock:booking
```
Levanta un servidor gRPC en el puerto 50051 que emula el servicio de inventario de Booking con acuses monotónicos.

### Paso 3: Arrancar el backend de LuxeStays
```bash
npm run start:dev
```
Escuchará en `0.0.0.0:3000` aceptando conexiones de cualquier interfaz de red.

### Paso 4: Arrancar el frontend en red local
En la carpeta `frontend/`:
```bash
npm run dev:red
```

---

## 4. Tabla de Diagnóstico de Fallos Comunes

| Síntoma | Causa Probable | Solución |
| :--- | :--- | :--- |
| **Conexión rechazada (ECONNREFUSED)** | El backend no está encendido o el puerto 3000 no está escuchando en `0.0.0.0`. | Verificar que `backend` esté corriendo con `npm run start:dev`. Comprobar `HOST=0.0.0.0` en `.env`. |
| **La petición se queda cargando (Timeout)** | El Firewall de Windows está bloqueando el tráfico entrante en el puerto 3000. | Ejecutar la regla de PowerShell indicada en la Sección 1. |
| **Error 401 Unauthorized** | Token JWT no enviado en cabecera `Authorization: Bearer <TOKEN>` o token expirado. | Iniciar sesión en `/auth/login` para obtener un token nuevo válido. |
| **Error 403 Forbidden** | El token no cuenta con el rol o los scopes necesarios (`alojamientos:read`, `alojamientos:book`, etc.). | Usar credenciales de Administrador para rutas `/admin/*` u órdenes privilegiadas. |
| **Error 409 Conflict** | Habitación no disponible para las fechas (OUT_OF_STOCK) o colisión de Idempotency-Key. | Seleccionar otras fechas o generar una nueva Idempotency-Key UUID v4. |
| **Failed to fetch en frontend** | CORS bloqueó la petición o la variable `VITE_API_URL` apunta a una dirección inalcanzable. | Agregar la IP del cliente en `CORS_EXTRA_ORIGINS` dentro de `backend/.env`. |
