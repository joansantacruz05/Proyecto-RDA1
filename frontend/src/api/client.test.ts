import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, generateUuidV4 } from './client';

describe('apiClient Idempotency-Key & UUID v4', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('genera un UUID v4 válido conforme a RFC 4122', () => {
    const uuid = generateUuidV4();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('agrega automáticamente Idempotency-Key en endpoints transaccionales de cancelación', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await api.post('/reservas/18f3c72e/cancelar', { motivo: 'Cambio de planes' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    const key = headers.get('Idempotency-Key');
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});
