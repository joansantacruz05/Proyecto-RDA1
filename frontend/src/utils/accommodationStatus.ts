// ─────────────────────────────────────────────────────────────────────────────
// Utilidad de Estado y Disponibilidad de Alojamientos (LuxeStays)
// Sincroniza reservas de Azure y estado de administración en tiempo real
// ─────────────────────────────────────────────────────────────────────────────

const KEY_ESTADOS_OVERRIDE = 'luxestays_alojamientos_estados_override';
const KEY_LIBERADOS = 'luxestays_alojamientos_liberados';
const KEY_RESERVADOS_LOCAL = 'luxestays_alojamientos_reservados';

export interface ReservaItemLike {
  id?: string | null | undefined;
  ordenId?: string | null | undefined;
  reservaId?: string | null | undefined;
  alojamientoId?: string | null | undefined;
  alojamientoNombre?: string | null | undefined;
  alojamientoCodigo?: string | null | undefined;
  habitacionNombre?: string | null | undefined;
  fechaEntrada?: string | null | undefined;
  fechaSalida?: string | null | undefined;
  estadoId?: string | null | undefined;
  estadoNombre?: string | null | undefined;
}

export interface CheckIsAlojamientoReservedParams {
  alojamientoId?: string | null | undefined;
  alojamientoNombre?: string | null | undefined;
  alojamientoCodigo?: string | null | undefined;
  estaReservadoApi?: boolean | null | undefined;
  habitacionesDisponibles?: number | null | undefined;
  estado?: string | null | undefined;
  activeReservas?: ReservaItemLike[] | null | undefined;
  checkDates?: { checkin?: string | null | undefined; checkout?: string | null | undefined } | null | undefined;
}

export function getEstadosOverride(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY_ESTADOS_OVERRIDE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setAdminAlojamientoEstado(alojamientoId: string, estado: string): void {
  try {
    const overrides = getEstadosOverride();
    overrides[alojamientoId] = estado;
    localStorage.setItem(KEY_ESTADOS_OVERRIDE, JSON.stringify(overrides));
  } catch (e) {
    console.error('Error guardando estado de alojamiento:', e);
  }
}

export function getLiberadosIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY_LIBERADOS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function liberarAlojamiento(alojamientoId: string | null | undefined, alojamientoNombre?: string | null | undefined): void {
  try {
    // 1. Agregar a lista de liberados (normalizado en minúsculas y original)
    const liberados = getLiberadosIds();
    const cleanId = String(alojamientoId ?? '').trim();
    const lowerId = cleanId.toLowerCase();
    const cleanName = String(alojamientoNombre ?? '').toLowerCase().trim();
    if (cleanId && !liberados.includes(cleanId)) {
      liberados.push(cleanId);
    }
    if (lowerId && !liberados.includes(lowerId)) {
      liberados.push(lowerId);
    }
    if (cleanName && !liberados.includes(cleanName)) {
      liberados.push(cleanName);
    }
    localStorage.setItem(KEY_LIBERADOS, JSON.stringify(liberados));

    // 2. Remover de lista local de reservados
    const reservados = getReservadosLocales().filter((r) => {
      const rId = String(r.alojamientoId ?? '').toLowerCase().trim();
      const rName = String(r.alojamientoNombre ?? '').toLowerCase().trim();
      const matchId = rId && lowerId && (rId === lowerId || lowerId.includes(rId) || rId.includes(lowerId));
      const matchName = Boolean(cleanName && rName && rName.includes(cleanName));
      return !matchId && !matchName;
    });
    localStorage.setItem(KEY_RESERVADOS_LOCAL, JSON.stringify(reservados));

    // 3. Forzar estado 'Activo'
    if (cleanId) {
      setAdminAlojamientoEstado(cleanId, 'Activo');
    }
  } catch (e) {
    console.error('Error liberando alojamiento:', e);
  }
}

export function getReservadosLocales(): ReservaItemLike[] {
  try {
    const raw = localStorage.getItem(KEY_RESERVADOS_LOCAL);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markAlojamientoReserved(reserva: ReservaItemLike): void {
  try {
    const list = getReservadosLocales();
    list.unshift({
      ...reserva,
      estadoId: reserva.estadoId || 'EST-002',
      estadoNombre: reserva.estadoNombre || 'Confirmada',
    });
    // Conservar últimas 50 reservas
    localStorage.setItem(KEY_RESERVADOS_LOCAL, JSON.stringify(list.slice(0, 50)));

    // Si estaba en liberados, retirarlo porque se acaba de generar una nueva reserva
    const rId = String(reserva.alojamientoId ?? '');
    const rNameLower = String(reserva.alojamientoNombre ?? '').toLowerCase().trim();
    const liberados = getLiberadosIds().filter((rawId) => {
      const id = String(rawId ?? '');
      if (rId && id && (id === rId || rId.includes(id))) return false;
      if (rNameLower && id.toLowerCase().trim() === rNameLower) return false;
      return true;
    });
    localStorage.setItem(KEY_LIBERADOS, JSON.stringify(liberados));
  } catch (e) {
    console.error('Error registrando reserva local:', e);
  }
}

/**
 * Determina si un alojamiento está reservado activamente cruzando:
 * 1. La respuesta de la API (/reservas de Azure)
 * 2. Las reservas locales de la sesión
 * 3. Los liberados/pausados por el administrador
 */
export function checkIsAlojamientoReserved(params: CheckIsAlojamientoReservedParams): boolean {
  const {
    alojamientoId = '',
    alojamientoNombre = '',
    alojamientoCodigo = '',
    estaReservadoApi = false,
    habitacionesDisponibles,
    estado = 'Activo',
    activeReservas = [],
    checkDates,
  } = params || {};

  const safeId = String(alojamientoId ?? '');
  const idNorm = safeId.toLowerCase().trim();
  const nameNorm = String(alojamientoNombre ?? '').toLowerCase().trim();
  const codeNorm = String(alojamientoCodigo ?? '').toLowerCase().trim();
  const safeReservas = Array.isArray(activeReservas) ? activeReservas : [];

  // 1. Si el administrador lo tiene como 'Inactivo' o 'Pausado', no se puede reservar
  const overrides = getEstadosOverride();
  const overrideEstado = overrides[safeId] || overrides[idNorm] || overrides[nameNorm];
  if (overrideEstado === 'Inactivo' || estado === 'Inactivo') {
    return true;
  }

  // 2. Si el administrador lo liberó explícitamente y no hay nuevas reservas locales
  const liberados = getLiberadosIds().map((l) => String(l ?? '').toLowerCase().trim());
  const isLiberado = liberados.some(
    (lib) =>
      Boolean(lib) &&
      (lib === idNorm ||
        lib === nameNorm ||
        (idNorm && lib.includes(idNorm)) ||
        (nameNorm && lib.includes(nameNorm))),
  );

  // 3. Revisar reservas locales recientes
  const locales = getReservadosLocales();
  const hasLocalMatch = locales.some((loc) => {
    const locId = String(loc.alojamientoId ?? '').toLowerCase().trim();
    const locName = String(loc.alojamientoNombre ?? '').toLowerCase().trim();
    const locCode = String(loc.alojamientoCodigo ?? '').toLowerCase().trim();
    const matchesProp =
      (idNorm && locId && (idNorm === locId || idNorm.includes(locId) || locId.includes(idNorm))) ||
      (nameNorm && locName && (nameNorm.includes(locName) || locName.includes(nameNorm))) ||
      (codeNorm && locCode && codeNorm === locCode);

    if (!matchesProp) return false;
    if (loc.estadoId === 'EST-003' || loc.estadoNombre === 'Cancelada') return false;

    // Si se especifican fechas de consulta, verificar superposición
    if (checkDates?.checkin && checkDates?.checkout && loc.fechaEntrada && loc.fechaSalida) {
      const qIn = new Date(checkDates.checkin).getTime();
      const qOut = new Date(checkDates.checkout).getTime();
      const rIn = new Date(loc.fechaEntrada).getTime();
      const rOut = new Date(loc.fechaSalida).getTime();
      return qIn < rOut && qOut > rIn;
    }
    return true;
  });

  if (hasLocalMatch) return true;

  // Si estaba liberado por el admin y no hay reserva local reciente, respetar la liberación
  if (isLiberado) return false;

  // Si el catálogo reporta que aún quedan habitaciones disponibles (> 0), está disponible para reservar
  if (habitacionesDisponibles !== undefined && habitacionesDisponibles !== null && habitacionesDisponibles > 0 && !estaReservadoApi) {
    return false;
  }

  // 4. Si el backend explícitamente reportó estaReservadoApi (0 habitaciones disponibles)
  if (estaReservadoApi) return true;

  // 5. Cruzar contra las reservas oficiales de Azure (activeReservas)
  const hasApiMatch = safeReservas.some((res) => {
    // Descartar canceladas
    if (!res || res.estadoId === 'EST-003' || res.estadoNombre === 'Cancelada') return false;

    const resName = String(res.alojamientoNombre ?? '').toLowerCase().trim();
    const resCode = String(res.alojamientoCodigo ?? '').toLowerCase().trim();
    const resHab = String(res.habitacionNombre ?? '').toLowerCase().trim();

    const resAloId = String(res.alojamientoId ?? '').toLowerCase().trim();

    const matchesProp =
      (idNorm && resAloId && (idNorm === resAloId || idNorm.includes(resAloId) || resAloId.includes(idNorm))) ||
      (nameNorm && resName && (nameNorm.includes(resName) || resName.includes(nameNorm))) ||
      (codeNorm && resCode && (codeNorm === resCode || codeNorm.includes(resCode))) ||
      (idNorm && (resName.includes(idNorm) || resCode.includes(idNorm))) ||
      (nameNorm && resHab && nameNorm.includes('villa colonial') && resHab.includes('villa colonial'));

    if (!matchesProp) return false;

    // Verificar fechas si se proporcionan
    if (checkDates?.checkin && checkDates?.checkout && res.fechaEntrada && res.fechaSalida) {
      const qIn = new Date(checkDates.checkin).getTime();
      const qOut = new Date(checkDates.checkout).getTime();
      const rIn = new Date(res.fechaEntrada).getTime();
      const rOut = new Date(res.fechaSalida).getTime();
      return qIn < rOut && qOut > rIn;
    }

    // Por defecto, considerar activa si la fecha de salida es futura o vigente
    if (res.fechaSalida) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const outDate = new Date(res.fechaSalida);
      return outDate.getTime() >= today.getTime();
    }

    return true;
  });

  return hasApiMatch;
}
