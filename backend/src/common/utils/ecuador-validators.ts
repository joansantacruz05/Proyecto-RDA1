/**
 * Validador oficial de documentos de identidad ecuatorianos (Cédula SRI Módulo 10, RUC y Pasaporte)
 */

export function validarCedulaEcuador(cedula: string): boolean {
  if (!cedula || cedula.length !== 10 || !/^\d{10}$/.test(cedula)) {
    return false;
  }

  const provincia = parseInt(cedula.substring(0, 2), 10);
  if (provincia < 1 || provincia > 24) {
    return false;
  }

  const tercerDigito = parseInt(cedula[2], 10);
  if (tercerDigito < 0 || tercerDigito > 5) {
    return false;
  }

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let mult = parseInt(cedula[i], 10) * coeficientes[i];
    if (mult >= 10) mult -= 9;
    suma += mult;
  }

  const digitoVerificador = (10 - (suma % 10)) % 10;
  return digitoVerificador === parseInt(cedula[9], 10);
}

export function validarIdentificacion(identificacion: string): {
  valido: boolean;
  tipo: 'CEDULA' | 'RUC' | 'PASAPORTE' | 'INVALIDO';
  mensaje?: string;
} {
  if (!identificacion) {
    return { valido: false, tipo: 'INVALIDO', mensaje: 'Identificación requerida.' };
  }

  const id = identificacion.trim().toUpperCase();

  // Si contiene letras, se valida como Pasaporte
  if (/^[A-Z0-9]{5,20}$/.test(id) && /[A-Z]/.test(id)) {
    return { valido: true, tipo: 'PASAPORTE' };
  }

  // Cédula de 10 dígitos
  if (id.length === 10 && /^\d{10}$/.test(id)) {
    if (validarCedulaEcuador(id)) {
      return { valido: true, tipo: 'CEDULA' };
    }
    return { valido: false, tipo: 'INVALIDO', mensaje: 'Número de cédula ecuatoriana inválido (algoritmo módulo 10).' };
  }

  // RUC de 13 dígitos terminado en 001
  if (id.length === 13 && /^\d{13}$/.test(id)) {
    if (!id.endsWith('001')) {
      return { valido: false, tipo: 'INVALIDO', mensaje: 'El RUC debe finalizar en 001.' };
    }
    const primeros10 = id.substring(0, 10);
    const provincia = parseInt(id.substring(0, 2), 10);
    if (provincia < 1 || provincia > 24) {
      return { valido: false, tipo: 'INVALIDO', mensaje: 'Código de provincia de RUC inválido.' };
    }
    if (validarCedulaEcuador(primeros10)) {
      return { valido: true, tipo: 'RUC' };
    }
    // RUC jurídico / sociedad pública
    const tercerDigito = parseInt(id[2], 10);
    if (tercerDigito === 9 || tercerDigito === 6) {
      return { valido: true, tipo: 'RUC' };
    }
    return { valido: false, tipo: 'INVALIDO', mensaje: 'RUC de persona natural o jurídica no válido.' };
  }

  return {
    valido: false,
    tipo: 'INVALIDO',
    mensaje: 'Debe ingresar una cédula ecuatoriana de 10 dígitos, RUC de 13 dígitos terminado en 001, o un pasaporte alfanumérico.',
  };
}
