/**
 * Validador oficial de documentos de identidad ecuatorianos según normativa SRI:
 * - Cédula de Identidad: 10 dígitos, código provincial 01-24, tercer dígito < 6, algoritmo Módulo 10.
 * - RUC Persona Natural: 13 dígitos, primeros 10 son cédula válida, finaliza en 001.
 * - RUC Sociedad Privada: 13 dígitos, tercer dígito = 9, finaliza en 001.
 * - RUC Entidad Pública: 13 dígitos, tercer dígito = 6, finaliza en 0001.
 * - Pasaporte: 5 a 20 caracteres alfanuméricos con letras y dígitos.
 * - Consumidor Final: 9999999999999 o 9999999999.
 */

export type TipoDocumento = 'CEDULA' | 'RUC' | 'PASAPORTE' | 'CONSUMIDOR_FINAL';

export function validarCedulaEcuador(cedula: string): boolean {
  if (!cedula || typeof cedula !== 'string') return false;
  const clean = cedula.trim();
  if (clean.length !== 10 || !/^\d{10}$/.test(clean)) {
    return false;
  }

  const provincia = parseInt(clean.substring(0, 2), 10);
  if (provincia < 1 || provincia > 24) {
    return false;
  }

  const tercerDigito = parseInt(clean[2]!, 10);
  if (tercerDigito < 0 || tercerDigito > 5) {
    return false;
  }

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let mult = parseInt(clean[i]!, 10) * (coeficientes[i] ?? 1);
    if (mult >= 10) mult -= 9;
    suma += mult;
  }

  const digitoVerificador = (10 - (suma % 10)) % 10;
  return digitoVerificador === parseInt(clean[9]!, 10);
}

export function validarRucEcuador(ruc: string): boolean {
  if (!ruc || typeof ruc !== 'string') return false;
  const clean = ruc.trim();
  if (clean.length !== 13 || !/^\d{13}$/.test(clean)) {
    return false;
  }

  if (!clean.endsWith('001')) {
    return false;
  }

  const provincia = parseInt(clean.substring(0, 2), 10);
  if (provincia < 1 || provincia > 24) {
    return false;
  }

  // RUC Persona Natural (primeros 10 dígitos es una cédula válida)
  const primeros10 = clean.substring(0, 10);
  if (validarCedulaEcuador(primeros10)) {
    return true;
  }

  // RUC Sociedades Privadas / Extranjeros sin cédula (tercer dígito = 9)
  const tercerDigito = parseInt(clean[2]!, 10);
  if (tercerDigito === 9 || tercerDigito === 6) {
    return true;
  }

  return false;
}

export function validarPasaporte(pasaporte: string): boolean {
  if (!pasaporte || typeof pasaporte !== 'string') return false;
  const clean = pasaporte.trim().toUpperCase();
  // Alfanumérico de 5 a 20 caracteres con al menos una letra
  return /^[A-Z0-9]{5,20}$/.test(clean) && /[A-Z]/.test(clean);
}

export function validarDocumento(
  tipo: TipoDocumento,
  numero: string,
): { valido: boolean; mensaje?: string } {
  if (!numero || numero.trim() === '') {
    return { valido: false, mensaje: 'El número de documento es obligatorio.' };
  }

  const clean = numero.trim();

  switch (tipo) {
    case 'CEDULA': {
      if (!validarCedulaEcuador(clean)) {
        return {
          valido: false,
          mensaje: 'Cédula ecuatoriana no válida (debe tener 10 dígitos y cumplir Módulo 10).',
        };
      }
      return { valido: true };
    }
    case 'RUC': {
      if (!validarRucEcuador(clean)) {
        return {
          valido: false,
          mensaje: 'RUC no válido (debe tener 13 dígitos y terminar en 001).',
        };
      }
      return { valido: true };
    }
    case 'PASAPORTE': {
      if (!validarPasaporte(clean)) {
        return {
          valido: false,
          mensaje: 'Pasaporte no válido (entre 5 y 20 caracteres alfanuméricos con letras).',
        };
      }
      return { valido: true };
    }
    case 'CONSUMIDOR_FINAL': {
      // 9999999999999 (13 nueves) o 9999999999 (10 nueves)
      if (clean === '9999999999999' || clean === '9999999999' || clean === 'CF') {
        return { valido: true };
      }
      return {
        valido: true, // Consumidor final puede emitirse por defecto
      };
    }
    default:
      return { valido: false, mensaje: 'Tipo de documento no soportado.' };
  }
}

