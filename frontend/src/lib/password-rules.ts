/**
 * Reglas de seguridad de contraseña unificadas con el backend LuxeStays
 * - 8 a 16 caracteres
 * - Al menos una mayúscula
 * - Al menos una minúscula
 * - Al menos un número
 * - Al menos un carácter especial (!@#$%^&*()_+-.,?)
 */

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-.,?])[A-Za-z\d!@#$%^&*()_+\-.,?]{8,16}$/;

export const PASSWORD_RULES_MESSAGE =
  'La contraseña debe tener entre 8 y 16 caracteres, incluir al menos una mayúscula, una minúscula, un número y un carácter especial (!@#$%^&*()_+-.,?).';

export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  message?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  const p = password || '';
  const hasMinLength = p.length >= 8 && p.length <= 16;
  const hasUppercase = /[A-Z]/.test(p);
  const hasLowercase = /[a-z]/.test(p);
  const hasNumber = /\d/.test(p);
  const hasSpecialChar = /[!@#$%^&*()_+\-.,?]/.test(p);

  const isValid =
    hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  let message: string | undefined;
  if (!isValid) {
    if (!hasMinLength) message = 'La contraseña debe tener entre 8 y 16 caracteres.';
    else if (!hasUppercase) message = 'Debe incluir al menos una letra mayúscula.';
    else if (!hasLowercase) message = 'Debe incluir al menos una letra minúscula.';
    else if (!hasNumber) message = 'Debe incluir al menos un número.';
    else if (!hasSpecialChar) message = 'Debe incluir al menos un carácter especial (!@#$%^&*()_+-.,?).';
  }

  return {
    isValid,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    message,
  };
}

export default validatePassword;
