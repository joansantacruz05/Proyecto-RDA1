# Guía de Despliegue en Producción (Render + Vercel + Supabase)

Este documento detalla el procedimiento de despliegue, configuración de variables de entorno y diagnóstico de errores en producción para **LuxeStays (Proyecto RDA1)**.

---

## 1. Arquitectura de Despliegue

- **Base de Datos**: PostgreSQL gestionado en **Supabase** (usando Connection Pooling en modo Transaction, puerto `6543`).
- **Backend**: API NestJS 10 desplegada como Web Service en **Render** (especificada en `render.yaml`).
- **Frontend**: SPA React 19 + Vite desplegada en **Vercel** (con reescritura de rutas para SPA en `vercel.json`).

---

## 2. Variables de Entorno por Plataforma

### A. Render (Web Service: Backend)

Configurar en el panel de Render bajo **Environment Variables**:

| Variable | Valor / Formato | Descripción |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Modo de ejecución de Node.js |
| `HOST` | `0.0.0.0` | Permite enlazar a todas las interfaces |
| `PORT` | `10000` | Puerto asignado por Render (o por defecto) |
| `API_PREFIX` | `api/v1` | Prefijo global para las rutas de la API |
| `DATABASE_URL` | `postgresql://postgres.[ref]:[PASS]@[pooler-host]:6543/postgres` | Cadena de conexión al pooler de Supabase |
| `JWT_SECRET` | *Generado aleatoriamente (mínimo 32 caracteres)* | Clave simétrica para firma y verificación de tokens |
| `JWT_EXPIRES_IN`| `7d` | Tiempo de vida de los tokens emitidos |
| `FRONTEND_URL` | `https://tu-proyecto.vercel.app` | URL pública del frontend en Vercel para CORS |
| `IVA_RATE` | `0.15` | Tasa del Impuesto al Valor Agregado (15% en Ecuador) |
| `TASA_MUNICIPAL` | `2.00` | Tasa municipal por noche (USD 2.00) |
| `GRPC_ENABLED` | `false` | Activar solo si se despliega el microservicio gRPC |

### B. Vercel (Project: Frontend)

Configurar en el panel de Vercel bajo **Settings** > **Environment Variables**:

| Variable | Valor / Formato | Descripción |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://luxestays-backend.onrender.com/api/v1` | URL base completa hacia el backend en Render |

> [!IMPORTANT]
> En Vite, las variables que inician con `VITE_` se compilan en tiempo de build en el bundle estático de producción. Por ende, **cada vez que se cambie `VITE_API_URL` en Vercel, es obligatorio realizar un nuevo despliegue (Redeploy)** para que surta efecto.

---

## 3. Mitigación del Cold Start (Render Free Tier)

El plan gratuito de Render suspende los Web Services tras 15 minutos de inactividad:
1. **Comportamiento**: La primera petición tras un periodo de inactividad puede tardar de 30 a 60 segundos en responder.
2. **Mitigación en Frontend**: El cliente HTTP (`src/lib/api.ts`) cuenta con reintentos automáticos para peticiones GET y presenta al usuario el aviso *"Despertando el servidor, esto puede tardar hasta un minuto..."*.
3. **Mitigación Externa (Recomendada)**: Configurar un monitor externo gratuito (ej. [UptimeRobot](https://uptimerobot.com) o [Cron-Job](https://cron-job.org)) para que haga ping a `https://<tu-backend>.onrender.com/health` cada 10 minutos, manteniendo la instancia activa.

---

## 4. Diagnóstico y Resolución de Errores Comunes

### Error: `Failed to fetch` o `Network Error` en el Frontend
- **Causa 1**: La variable `VITE_API_URL` en Vercel sigue teniendo el placeholder `https://TU-URL-DE-RENDER-AQUI...` o apunta a `localhost`.
  - *Solución*: Corregir `VITE_API_URL` en Vercel y hacer Redeploy.
- **Causa 2**: CORS rechazó la solicitud porque el dominio de Vercel no está en `FRONTEND_URL`.
  - *Solución*: En el panel de Render, agregar el dominio exacto de Vercel en la variable `FRONTEND_URL`.

### Error: `401 Unauthorized`
- **Causa**: El token en `localStorage` expiró, fue firmado con otro `JWT_SECRET` (por ejemplo tras reiniciar Render con clave regenerada) o el usuario no ha iniciado sesión.
  - *Solución*: Cerrar sesión e ingresar nuevamente en `/login`.

### Error: `500 Internal Server Error`
- **Causa**: Fallo en la base de datos o excepción no capturada en el servidor.
  - *Solución*: Revisar los logs en tiempo real en la pestaña **Logs** del Web Service en Render. Verificar que la base de datos de Supabase tenga ejecutadas las migraciones `001_mejoras.sql` y `002_vertical_alojamientos.sql`.
