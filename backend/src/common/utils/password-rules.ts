import { randomUUID } from 'crypto';

// Regla compartida estricta: 8-16 caracteres, al menos 1 mayúscula, 1 número y 1 carácter especial
export const PASSWORD_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-.,?])[A-Za-z\d!@#$%^&*()_+\-.,?]{8,16}$/;

export const PASSWORD_RULES_MESSAGE =
  'La contraseña debe tener entre 8 y 16 caracteres, al menos una mayúscula, un número y un carácter especial del conjunto: !@#$%^&*()_+-.,?';

export function isValidPassword(pass: string): boolean {
  if (!pass) return false;
  return PASSWORD_REGEX.test(pass);
}

/**
 * Genera IDs de formato <PREFIJO>-<8 HEX EN MAYÚSCULAS> para evitar colisiones
 * Ejemplos: RES-4F8A9B12, USU-91C0E4B2, HAB-83AF01BC
 */
export function generateEntityId(prefix: string): string {
  return `${prefix}-${randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`;
}
