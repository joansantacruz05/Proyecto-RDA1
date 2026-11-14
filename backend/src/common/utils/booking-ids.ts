/**
 * Normalizes a composite Booking Central accommodation ID (e.g. `NODE_ALO_...~ALO-757` -> `ALO-757`).
 */
export function extractAccommodationCode(raw?: unknown): string {
  const val = String(raw || '').trim();
  if (!val) return '';
  return val.includes('~') ? val.split('~').pop()!.trim() : val;
}

/**
 * Splits a composite room/rate identifier (e.g. `SUITE_DELUXE@FLEX_BB`) into room code and optional rate plan.
 */
export function extractRoomTypeAndPlan(raw?: unknown): { roomCode: string; ratePlan: string | null } {
  const val = String(raw || '').trim();
  if (!val) return { roomCode: '', ratePlan: null };
  const atIdx = val.indexOf('@');
  if (atIdx === -1) return { roomCode: val, ratePlan: null };
  return {
    roomCode: val.slice(0, atIdx).trim(),
    ratePlan: val.slice(atIdx + 1).trim() || null,
  };
}

/**
 * Formats a Date or ISO date string to `YYYY-MM-DD` without breaking on Date.prototype.toString().
 */
export function toIsoDateOnly(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? '' : value.toISOString().split('T')[0];
  }
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? str.split('T')[0] : parsed.toISOString().split('T')[0];
}
