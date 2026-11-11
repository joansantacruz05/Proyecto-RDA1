/**
 * Normaliza una hora ('14:00:00', '14:00', '9:30') al formato estandar 'HH:MM'.
 */
export function normalizeHoraHHMM(raw: unknown, fallback = '14:00'): string {
  const str = String(raw || '').trim();
  const match = /^([01]?\d|2[0-3]):([0-5]\d)/.exec(str);
  if (!match) return fallback;
  const hh = match[1].padStart(2, '0');
  const mm = match[2].padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Construye un timestamp ISO en zona America/Guayaquil (-05:00) combinando fecha y hora HH:MM.
 */
export function buildEcuadorHourTimestamp(dateStr: string, horaHHMM: unknown, fallback = '14:00'): string {
  const cleanDate = String(dateStr || '').split('T')[0];
  const hhmm = normalizeHoraHHMM(horaHHMM, fallback);
  return `${cleanDate}T${hhmm}:00-05:00`;
}

/**
 * Parsea hora HH:MM en hora, minuto y total de minutos desde medianoche.
 */
export function parseHoraMinutes(raw: unknown, fallback = '14:00'): { hour: number; minute: number; totalMinutes: number } {
  const hhmm = normalizeHoraHHMM(raw, fallback);
  const [hStr, mStr] = hhmm.split(':');
  const hour = Number(hStr);
  const minute = Number(mStr);
  return { hour, minute, totalMinutes: hour * 60 + minute };
}

/**
 * Convierte latitud/longitud de BD a numero finito o null si no es valido.
 */
export function toCoordNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}
