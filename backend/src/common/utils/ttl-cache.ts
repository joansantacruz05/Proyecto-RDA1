/**
 * Caché en memoria con TTL, "single-flight" y servicio de datos obsoletos ante error.
 *
 * - single-flight: N peticiones simultáneas por la misma clave comparten UNA sola consulta a la BD.
 * - stale-on-error: si la BD tarda/falla y existe un valor previo (aunque haya expirado),
 *   se sirve ese valor en vez de devolver 5xx/timeout (los hoteles NO desaparecen del catálogo).
 * - invalidate(): marca todo como expirado (se re-consulta en la próxima petición) pero conserva
 *   el valor previo como respaldo para el caso de error.
 */
export class TtlCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();
  private readonly inflight = new Map<string, Promise<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 200,
  ) {}

  async getOrLoad(key: string, loader: () => Promise<T>): Promise<T> {
    const hit = this.store.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value;

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = loader()
      .then((value) => {
        if (this.store.size >= this.maxEntries) {
          const oldest = this.store.keys().next().value;
          if (oldest !== undefined) this.store.delete(oldest);
        }
        this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
        return value;
      })
      .catch((err) => {
        if (hit) return hit.value; // stale-on-error
        throw err;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }

  invalidate(): void {
    for (const entry of this.store.values()) entry.expiresAt = 0;
  }
}

/** Caché compartida del catálogo público (se invalida al crear/cancelar reservas o editar alojamientos). */
export const catalogCache = new TtlCache<any>(15_000);

