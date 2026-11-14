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
  espacioId?: string | null | undefined;
  habitacionNombre?: string | null | undefined;
  fechaEntrada?: string | null | undefined;
  fechaSalida?: string | null | undefined;
  estadoId?: string | null | undefined;
  estadoNombre?: string | null | undefined;
  cantidadHabitaciones?: number | null | undefined;
  checkoutRealizado?: boolean | null | undefined;
}

export interface CheckIsAlojamientoReservedParams {
  alojamientoId?: string | null | undefined;
  alojamientoNombre?: string | null | undefined;
  alojamientoCodigo?: string | null | undefined;
  estaReservadoApi?: boolean | null | undefined;
  habitacionesDisponibles?: number | null | undefined;
  totalHabitaciones?: number | null | undefined;
  estado?: string | null | undefined;
  activeReservas?: ReservaItemLike[] | null | undefined;
  checkDates?: { checkin?: string | null | undefined; checkout?: string | null | undefined } | null | undefined;
}

export interface CheckIsRoomReservedParams {
  roomId?: string | null | undefined;
  roomNombre?: string | null | undefined;
  roomCodigo?: string | null | undefined;
  roomEstado?: string | null | undefined;
  cantidadDisponible?: number | null | undefined;
  alojamientoId?: string | null | undefined;
  alojamientoNombre?: string | null | undefined;
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

export function setAlojamientoEnLimpieza(
  alojamientoId: string | null | undefined,
  alojamientoNombre?: string | null | undefined,
): void {
  try {
    const cleanId = String(alojamientoId ?? '').trim();
    const lowerId = cleanId.toLowerCase();
    const cleanName = String(alojamientoNombre ?? '').toLowerCase().trim();

    const liberados = getLiberadosIds().filter((raw) => {
      const val = String(raw ?? '').toLowerCase().trim();
      if (!val) return false;
      if (lowerId && (val === lowerId || val.includes(lowerId) || lowerId.includes(val))) return false;
      if (cleanName && (val === cleanName || val.includes(cleanName) || cleanName.includes(val))) return false;
      return true;
    });
    localStorage.setItem(KEY_LIBERADOS, JSON.stringify(liberados));

    if (cleanId) {
      setAdminAlojamientoEstado(cleanId, 'En Limpieza');
    }
    if (cleanName) {
      setAdminAlojamientoEstado(cleanName, 'En Limpieza');
    }
  } catch (e) {
    console.error('Error marcando alojamiento en limpieza:', e);
  }
}

/** Limpia posibles marcas residuales de 'En Limpieza' a nivel hotel cuando la limpieza aplica solo por habitación. */
export function clearHotelLimpiezaOverride(
  alojamientoId?: string | null | undefined,
  alojamientoNombre?: string | null | undefined,
): void {
  try {
    const overrides = getEstadosOverride();
    let changed = false;
    const keys = [
      String(alojamientoId ?? '').trim(),
      String(alojamientoId ?? '').trim().toLowerCase(),
      String(alojamientoNombre ?? '').trim(),
      String(alojamientoNombre ?? '').trim().toLowerCase(),
    ].filter(Boolean);

    for (const k of keys) {
      const val = String(overrides[k] || '').toLowerCase().trim();
      if (val && (val === 'en limpieza' || val.includes('limpieza'))) {
        delete overrides[k];
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(KEY_ESTADOS_OVERRIDE, JSON.stringify(overrides));
    }
  } catch {
    // ignorar errores de storage
  }
}

export function isAlojamientoInCleaning(params: {
  alojamientoId?: string | null | undefined;
  alojamientoNombre?: string | null | undefined;
  estado?: string | null | undefined;
}): boolean {
  const safeId = String(params?.alojamientoId ?? '').trim();
  const idNorm = safeId.toLowerCase();
  const nameNorm = String(params?.alojamientoNombre ?? '').toLowerCase().trim();
  const estadoNorm = String(params?.estado ?? '').toLowerCase().trim();
  if (estadoNorm === 'en limpieza' || estadoNorm.includes('limpieza')) {
    return true;
  }
  const overrides = getEstadosOverride();
  const overrideEstado = String(overrides[safeId] || overrides[idNorm] || overrides[nameNorm] || '').toLowerCase().trim();
  return overrideEstado === 'en limpieza' || overrideEstado.includes('limpieza');
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

    // 3. Forzar estado 'Activo' (limpiar también posibles claves previas en limpieza)
    if (cleanId) {
      setAdminAlojamientoEstado(cleanId, 'Activo');
    }
    if (cleanName) {
      setAdminAlojamientoEstado(cleanName, 'Activo');
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

export function markReservaCanceladaLocal(
  reservaId?: string | null | undefined,
  hotelNombre?: string | null | undefined,
): void {
  try {
    const targetId = String(reservaId ?? '').toLowerCase().trim();
    const targetHotel = String(hotelNombre ?? '').toLowerCase().trim();
    const filtered = getReservadosLocales().filter((r) => {
      const rId = String(r.id ?? r.reservaId ?? '').toLowerCase().trim();
      const ordId = String(r.ordenId ?? '').toLowerCase().trim();
      const rHotel = String(r.alojamientoNombre ?? '').toLowerCase().trim();
      if (targetId && (rId === targetId || ordId === targetId)) return false;
      if (!targetId && targetHotel && rHotel && rHotel === targetHotel) return false;
      return true;
    });
    localStorage.setItem(KEY_RESERVADOS_LOCAL, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error removiendo reserva cancelada local:', e);
  }
}

export function isReservaClosed(r: ReservaItemLike): boolean {
  const eNombre = String(r.estadoNombre ?? '').toLowerCase();
  return (
    Boolean(r.checkoutRealizado) ||
    r.estadoId === 'EST-003' ||
    r.estadoId === 'EST-004' ||
    r.estadoId === 'EST-005' ||
    eNombre.includes('cancel') ||
    eNombre.includes('limpieza') ||
    eNombre.includes('finaliz') ||
    eNombre.includes('check-out')
  );
}

export function isReservaDateConflict(
  res: ReservaItemLike,
  checkDates?: { checkin?: string | null | undefined; checkout?: string | null | undefined } | null,
): boolean {
  if (checkDates?.checkin && checkDates?.checkout && res.fechaEntrada && res.fechaSalida) {
    const qIn = new Date(checkDates.checkin).getTime();
    const qOut = new Date(checkDates.checkout).getTime();
    const rIn = new Date(res.fechaEntrada).getTime();
    const rOut = new Date(res.fechaSalida).getTime();
    if (!isNaN(qIn) && !isNaN(qOut) && !isNaN(rIn) && !isNaN(rOut)) {
      return qIn < rOut && qOut > rIn;
    }
  }
  if (res.fechaSalida) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const outDate = new Date(res.fechaSalida);
    if (!isNaN(outDate.getTime())) {
      return outDate.getTime() >= today.getTime();
    }
  }
  return true;
}

export function doesReservaMatchRoom(
  res: ReservaItemLike,
  roomId?: string | null,
  roomNombre?: string | null,
  roomCodigo?: string | null,
  alojamientoId?: string | null,
): boolean {
  if (!res) return false;
  const targetAloj = String(alojamientoId ?? '').trim().toLowerCase();
  const resAlo = String(res.alojamientoId ?? '').trim().toLowerCase();
  if (targetAloj && resAlo && targetAloj !== resAlo && !targetAloj.includes(resAlo) && !resAlo.includes(targetAloj)) {
    return false;
  }

  const targetId = String(roomId ?? '').trim().toLowerCase();
  const targetName = String(roomNombre ?? '').trim().toLowerCase();
  const targetCode = String(roomCodigo ?? '').trim().toLowerCase();

  const resEspId = String(res.espacioId ?? '').trim().toLowerCase();
  const resHabName = String(res.habitacionNombre ?? '').trim().toLowerCase();

  if (targetId && resEspId && (targetId === resEspId || targetId.includes(resEspId) || resEspId.includes(targetId))) {
    return true;
  }
  if (targetName && resHabName && (targetName === resHabName || targetName.includes(resHabName) || resHabName.includes(targetName))) {
    return true;
  }
  if (targetCode && resHabName && resHabName.includes(targetCode)) {
    return true;
  }
  return false;
}

export function doesReservaMatchProperty(
  res: ReservaItemLike,
  idNorm: string,
  nameNorm: string,
  codeNorm: string,
): boolean {
  if (!res) return false;
  const resAloId = String(res.alojamientoId ?? '').toLowerCase().trim();
  const resName = String(res.alojamientoNombre ?? '').toLowerCase().trim();
  const resCode = String(res.alojamientoCodigo ?? '').toLowerCase().trim();
  const resHab = String(res.habitacionNombre ?? '').toLowerCase().trim();

  return Boolean(
    (idNorm && resAloId && (idNorm === resAloId || idNorm.includes(resAloId) || resAloId.includes(idNorm))) ||
    (nameNorm && resName && (nameNorm.includes(resName) || resName.includes(nameNorm))) ||
    (codeNorm && resCode && (codeNorm === resCode || codeNorm.includes(resCode))) ||
    (idNorm && (resName.includes(idNorm) || resCode.includes(idNorm))) ||
    (nameNorm && resHab && nameNorm.includes('villa colonial') && resHab.includes('villa colonial')),
  );
}

/**
 * Determina si una habitación física específica está reservada o no disponible:
 * 1. Estado en limpieza o inactivo
 * 2. Cruce con reservas activas (API y locales) para ese espacioId o nombre
 * 3. Capacidad de stock remanente
 */
export function checkIsRoomReserved(params: CheckIsRoomReservedParams): boolean {
  const {
    roomId,
    roomNombre,
    roomCodigo,
    roomEstado = 'Activo',
    cantidadDisponible = 1,
    alojamientoId,
    activeReservas = [],
    checkDates,
  } = params || {};

  const estadoNorm = String(roomEstado ?? '').toLowerCase().trim();
  if (
    estadoNorm === 'inactivo' ||
    estadoNorm === 'mantenimiento' ||
    estadoNorm === 'en limpieza' ||
    estadoNorm.includes('limpieza')
  ) {
    return true;
  }

  const safeReservas = Array.isArray(activeReservas) ? activeReservas : [];
  const locales = getReservadosLocales();

  let occupiedCount = 0;

  for (const loc of locales) {
    if (!loc || isReservaClosed(loc)) continue;
    if (!isReservaDateConflict(loc, checkDates)) continue;
    if (doesReservaMatchRoom(loc, roomId, roomNombre, roomCodigo, alojamientoId)) {
      occupiedCount++;
    }
  }

  for (const res of safeReservas) {
    if (!res || isReservaClosed(res)) continue;
    if (!isReservaDateConflict(res, checkDates)) continue;
    if (doesReservaMatchRoom(res, roomId, roomNombre, roomCodigo, alojamientoId)) {
      occupiedCount++;
    }
  }

  const stock = Math.max(1, Number(cantidadDisponible ?? 1));
  return occupiedCount >= stock;
}

/**
 * Determina si un alojamiento está totalmente reservado cruzando:
 * 1. La respuesta de la API (/reservas de Azure)
 * 2. Las reservas locales de la sesión
 * 3. Los liberados/pausados por el administrador
 * 4. Conteo de habitaciones disponibles (un hotel no se bloquea si aún tiene habitaciones libres)
 */
export function checkIsAlojamientoReserved(params: CheckIsAlojamientoReservedParams): boolean {
  const {
    alojamientoId = '',
    alojamientoNombre = '',
    alojamientoCodigo = '',
    estaReservadoApi = false,
    habitacionesDisponibles,
    totalHabitaciones,
    estado = 'Activo',
    activeReservas = [],
    checkDates,
  } = params || {};

  const safeId = String(alojamientoId ?? '');
  const idNorm = safeId.toLowerCase().trim();
  const nameNorm = String(alojamientoNombre ?? '').toLowerCase().trim();
  const codeNorm = String(alojamientoCodigo ?? '').toLowerCase().trim();
  const safeReservas = Array.isArray(activeReservas) ? activeReservas : [];

  // 1. Si el administrador o recepción lo tiene como 'Inactivo', 'Pausado' o 'En Limpieza'
  const overrides = getEstadosOverride();
  const overrideEstado = overrides[safeId] || overrides[idNorm] || overrides[nameNorm];
  const estadoNorm = String(estado ?? '').toLowerCase().trim();
  const overrideNorm = String(overrideEstado ?? '').toLowerCase().trim();
  if (
    estadoNorm === 'inactivo' ||
    estadoNorm === 'en limpieza' ||
    estadoNorm.includes('limpieza') ||
    overrideNorm === 'inactivo' ||
    overrideNorm === 'en limpieza' ||
    overrideNorm.includes('limpieza')
  ) {
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
  const matchingLocales = locales.filter((loc) => {
    if (!loc || isReservaClosed(loc)) return false;
    if (!doesReservaMatchProperty(loc, idNorm, nameNorm, codeNorm)) return false;
    return isReservaDateConflict(loc, checkDates);
  });

  // Si estaba liberado por el admin y no hay reserva local reciente, respetar la liberación
  if (isLiberado && matchingLocales.length === 0) return false;

  const totalHabs = totalHabitaciones !== undefined && totalHabitaciones !== null ? Number(totalHabitaciones) : undefined;

  // Si hay reservas locales recientes para esta propiedad:
  // Si el hotel tiene múltiples habitaciones (totalHabs > 1), descontar de las disponibles
  if (matchingLocales.length > 0) {
    if (totalHabs !== undefined && totalHabs > 1) {
      const avail = habitacionesDisponibles !== undefined && habitacionesDisponibles !== null ? Number(habitacionesDisponibles) : totalHabs;
      if (avail - matchingLocales.length <= 0) {
        return true;
      }
    } else {
      return true;
    }
  }

  // Si el catálogo reporta que aún quedan habitaciones disponibles (> 0), está disponible para reservar
  if (
    habitacionesDisponibles !== undefined &&
    habitacionesDisponibles !== null &&
    habitacionesDisponibles > 0 &&
    !estaReservadoApi
  ) {
    const remainingAfterLocal = Number(habitacionesDisponibles) - matchingLocales.length;
    if (remainingAfterLocal > 0) {
      return false;
    }
    return true;
  }

  // 4. Si el backend explícitamente reportó estaReservadoApi (0 habitaciones disponibles)
  if (estaReservadoApi) return true;

  // 5. Cruzar contra las reservas oficiales de Azure (activeReservas)
  const matchingApi = safeReservas.filter((res) => {
    if (!res || isReservaClosed(res)) return false;
    if (!doesReservaMatchProperty(res, idNorm, nameNorm, codeNorm)) return false;
    return isReservaDateConflict(res, checkDates);
  });

  // Si totalHabitaciones está definido y es > 1 (propiedad con múltiples cuartos):
  // Solo se bloquea si las reservas activas (API + locales) copan todas las habitaciones
  if (totalHabs !== undefined && totalHabs > 1) {
    const apiRooms = matchingApi.reduce((sum, r) => sum + Math.max(1, Number(r.cantidadHabitaciones || 1)), 0);
    const totalOccupied = apiRooms + matchingLocales.length;
    return totalOccupied >= totalHabs;
  }

  return matchingApi.length > 0;
}
