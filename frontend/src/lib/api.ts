import { API_BASE_URL } from './config';

export interface ProblemDetailsError {
  type?: string;
  title?: string;
  status?: number;
  code?: string;
  detail?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
}

export class ApiError extends Error {
  status: number;
  problem?: ProblemDetailsError;

  constructor(message: string, status: number, problem?: ProblemDetailsError) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

export interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  deviceFingerprint?: string;
}

// Emisor de eventos simple para estados de cold-start o latencia
type ColdStartListener = (isSlow: boolean) => void;
const listeners: Set<ColdStartListener> = new Set();

export function onColdStartChange(fn: ColdStartListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyColdStart(isSlow: boolean) {
  listeners.forEach((fn) => fn(isSlow));
}

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }

  if (options.deviceFingerprint) {
    headers.set('X-Device-Fingerprint', options.deviceFingerprint);
  } else if (!headers.has('X-Device-Fingerprint')) {
    headers.set('X-Device-Fingerprint', 'luxestays-web-client');
  }

  // Timer para avisar si el backend de Render está en cold start (>3000ms)
  let isSlow = false;
  const slowTimer = setTimeout(() => {
    isSlow = true;
    notifyColdStart(true);
  }, 3000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    clearTimeout(slowTimer);
    if (isSlow) {
      notifyColdStart(false);
    }

    const contentType = response.headers.get('content-type') || '';
    let data: any = null;

    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      data = await response.text().catch(() => null);
    }

    if (!response.ok) {
      const errorMsg =
        data?.detail ||
        data?.message ||
        data?.title ||
        `Error del servidor (${response.status})`;

      throw new ApiError(errorMsg, response.status, data);
    }

    return data as T;
  } catch (err: any) {
    clearTimeout(slowTimer);
    if (isSlow) {
      notifyColdStart(false);
    }

    if (err instanceof ApiError) {
      throw err;
    }

    throw new ApiError(
      err?.message || 'Error de conexión con el servidor. Revisa tu red o el estado del backend.',
      0,
    );
  }
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
