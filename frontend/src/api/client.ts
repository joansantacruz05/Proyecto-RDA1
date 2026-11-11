import { ProblemDetails, ProblemDetailsException } from './types';

export const AZURE_API_URL = 'https://posada-ec-alojamientos.azurewebsites.net';

export const API_BASE_URL: string = (() => {
  const url = import.meta.env.VITE_API_URL;
  if (!url || typeof url !== 'string' || url.trim() === '') {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://localhost:3000';
    }
    return AZURE_API_URL;
  }
  // Si en Vercel o en alguna variable externa aún está guardada la URL antigua de Render, usar siempre Azure
  if (url.includes('proyecto-rda1.onrender.com') || url.includes('onrender.com')) {
    return AZURE_API_URL;
  }
  return url.replace(/\/+$/, '');
})();

const TOKEN_KEY = 'luxestays_auth_token';
const USER_KEY = 'luxestays_auth_user';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.error('No se pudo guardar el token en localStorage:', e);
  }
}

export function removeAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error('No se pudo remover el token de localStorage:', e);
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | null | undefined;
  params?: Record<string, string | number | boolean | undefined> | undefined;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, body, ...restOptions } = options;

  let urlPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Si el endpoint no trae prefijo /api/, agregarlo
  if (!urlPath.startsWith('/api/') && !urlPath.startsWith('/health')) {
    urlPath = `/api/v1${urlPath}`;
  }

  const fullUrl = new URL(`${API_BASE_URL}${urlPath}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        fullUrl.searchParams.set(key, String(value));
      }
    }
  }

  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has('Content-Type') && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  requestHeaders.set('Accept', 'application/json, application/problem+json');

  const token = getAuthToken();
  if (token && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const fetchOptions: RequestInit = {
    ...restOptions,
    headers: requestHeaders,
  };
  if (body !== undefined && body !== null) {
    fetchOptions.body = body;
  }

  const response = await fetch(fullUrl.toString(), fetchOptions);

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json') || contentType.includes('application/problem+json');

  if (!response.ok) {
    if (isJson) {
      try {
        const errorData = await response.json();
        const problem: ProblemDetails = {
          type: errorData.type || 'https://api.booking-hub.com/errors/internal-error',
          title: errorData.title || (response.status === 401 ? 'No Autorizado' : 'Error en la petición'),
          status: errorData.status || response.status,
          code: errorData.code || (response.status === 401 ? 'UNAUTHORIZED' : response.status === 403 ? 'FORBIDDEN' : 'VALIDATION_FAILED'),
          detail: errorData.detail || errorData.message || response.statusText,
          invalid_params: errorData.invalid_params,
        };
        throw new ProblemDetailsException(problem);
      } catch (parseError) {
        if (parseError instanceof ProblemDetailsException) {
          throw parseError;
        }
      }
    }

    const fallbackProblem: ProblemDetails = {
      type: 'https://api.booking-hub.com/errors/internal-error',
      title: 'Error de Red o Servidor',
      status: response.status,
      code: 'INTERNAL_ERROR',
      detail: `El servidor respondió con código HTTP ${response.status}`,
    };
    throw new ProblemDetailsException(fallbackProblem);
  }

  if (isJson) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...(options || {}), method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) => {
    const opts: RequestOptions = { ...(options || {}), method: 'POST' };
    if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }
    return apiClient<T>(endpoint, opts);
  },

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) => {
    const opts: RequestOptions = { ...(options || {}), method: 'PUT' };
    if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }
    return apiClient<T>(endpoint, opts);
  },

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) => {
    const opts: RequestOptions = { ...(options || {}), method: 'PATCH' };
    if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }
    return apiClient<T>(endpoint, opts);
  },

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...(options || {}), method: 'DELETE' }),
};
