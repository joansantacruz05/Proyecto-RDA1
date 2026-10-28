/**
 * Validador de Cédula de Identidad y RUC para la República del Ecuador (Frontend)
 */

export function validarCedula(cedula: string): { valido: boolean; mensaje?: string } {
  const clean = (cedula || '').trim();
  if (!/^\d{10}$/.test(clean)) {
    return { valido: false, mensaje: 'La cédula debe contener exactamente 10 dígitos numéricos.' };
  }

  const provincia = parseInt(clean.substring(0, 2), 10);
  if (provincia < 1 || (provincia > 24 && provincia !== 30)) {
    return { valido: false, mensaje: 'El código de provincia de la cédula no es válido.' };
  }

  const tercerDigito = parseInt(clean.charAt(2), 10);
  if (tercerDigito >= 6) {
    return { valido: false, mensaje: 'El tercer dígito de la cédula de persona natural debe ser menor a 6.' };
  }

  // Algoritmo de Módulo 10
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let valor = parseInt(clean.charAt(i), 10) * coeficientes[i];
    if (valor >= 10) valor -= 9;
    suma += valor;
  }

  const digitoVerificador = parseInt(clean.charAt(9), 10);
  const decenaSuperior = Math.ceil(suma / 10) * 10;
  let verificadorCalculado = decenaSuperior - suma;
  if (verificadorCalculado === 10) verificadorCalculado = 0;

  if (digitoVerificador !== verificadorCalculado) {
    return { valido: false, mensaje: 'El dígito verificador de la cédula no es correcto.' };
  }

  return { valido: true };
}

export function validarRUC(ruc: string): { valido: boolean; mensaje?: string } {
  const clean = (ruc || '').trim();
  if (!/^\d{13}$/.test(clean)) {
    return { valido: false, mensaje: 'El RUC debe tener exactamente 13 dígitos numéricos.' };
  }

  if (!clean.endsWith('001')) {
    return { valido: false, mensaje: 'El RUC de persona natural o jurídica debe terminar en 001.' };
  }

  // Validar los primeros 10 dígitos como cédula si es de persona natural
  const tercerDigito = parseInt(clean.charAt(2), 10);
  if (tercerDigito < 6) {
    const valCedula = validarCedula(clean.substring(0, 10));
    if (!valCedula.valido) {
      return { valido: false, mensaje: `RUC inválido: ${valCedula.mensaje}` };
    }
  }

  return { valido: true };
}

export function validarIdentificacion(id: string): { valido: boolean; tipo?: 'CEDULA' | 'RUC' | 'PASAPORTE'; mensaje?: string } {
  const clean = (id || '').trim();
  if (!clean) {
    return { valido: false, mensaje: 'La identificación es obligatoria.' };
  }

  if (/^\d{10}$/.test(clean)) {
    const res = validarCedula(clean);
    return { valido: res.valido, tipo: 'CEDULA', mensaje: res.mensaje };
  }

  if (/^\d{13}$/.test(clean)) {
    const res = validarRUC(clean);
    return { valido: res.valido, tipo: 'RUC', mensaje: res.mensaje };
  }

  // Pasaporte (alfanumérico de 6 a 15 caracteres)
  if (/^[A-Za-z0-9]{6,15}$/.test(clean)) {
    return { valido: true, tipo: 'PASAPORTE' };
  }

  return { valido: false, mensaje: 'Formato de identificación no reconocido (Cédula 10 dígitos, RUC 13 dígitos o Pasaporte).' };
}
