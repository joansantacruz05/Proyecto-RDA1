/**
 * Configuración centralizada de URLs y entorno del Frontend LuxeStays
 */

const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) || '';
// Remueve cualquier barra diagonal final
const cleanApiUrl = rawApiUrl.trim().replace(/\/+$/, '');

// Detecta si la configuración en producción está ausente o mantiene el placeholder de Render
export const isPlaceholderOrMissing =
  !cleanApiUrl ||
  cleanApiUrl.includes('TU-URL-DE-RENDER-AQUI') ||
  cleanApiUrl.includes('tu-url-de-render');

export const isProd = import.meta.env.PROD;

// En producción alerta si falta la variable; en desarrollo cae limpiamente a localhost
export const API_BASE_URL = cleanApiUrl || (isProd ? '' : 'http://localhost:3000/api/v1');

export const config = {
  apiBaseUrl: API_BASE_URL,
  isConfigured: !isPlaceholderOrMissing,
  isProd,
};

export default config;
