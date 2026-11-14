import type { ExtraCargoItem } from '../api/types';

export interface ReceptionExtraPreset {
  concepto: string;
  precioUnitario: number;
}

export const RECEPTION_EXTRA_PRESETS: ReceptionExtraPreset[] = [
  { concepto: 'Huésped adicional', precioUnitario: 15 },
  { concepto: 'Cama adicional', precioUnitario: 25 },
  { concepto: 'Desayuno buffet', precioUnitario: 12 },
  { concepto: 'Late Check-out', precioUnitario: 30 },
  { concepto: 'Parqueadero privado', precioUnitario: 10 },
  { concepto: 'Servicio de lavandería', precioUnitario: 15 },
  { concepto: 'Consumo minibar', precioUnitario: 8 },
];

export const RECEPTION_IVA_RATE = 0.15;
export const RECEPTION_TASA_MUNICIPAL_POR_NOCHE = 2.0;

export function toIsoDateOnly(value?: string | Date | null): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0] ?? '';
  return String(value).split('T')[0] ?? '';
}

export function computeStayNights(fechaEntrada?: string, fechaSalida?: string): number {
  const inStr = toIsoDateOnly(fechaEntrada);
  const outStr = toIsoDateOnly(fechaSalida);
  if (!inStr || !outStr) return 1;
  const start = new Date(`${inStr}T14:00:00-05:00`).getTime();
  const end = new Date(`${outStr}T11:00:00-05:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 1;
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

/**
 * Replica exactamente las reglas estacionales y feriados de PricingService en el backend.
 */
export function computeRoomBaseSubtotal(
  precioPorNoche: number,
  fechaEntrada?: string,
  fechaSalida?: string,
  cantidadHabitaciones: number = 1,
): { baseSubtotal: number; tasaMunicipal: number; nights: number } {
  const rooms = Math.max(1, Number(cantidadHabitaciones || 1));
  const nights = computeStayNights(fechaEntrada, fechaSalida);
  const inStr = toIsoDateOnly(fechaEntrada);
  const cleanRate = Math.max(0, Number(precioPorNoche || 0));

  let subtotalCents = 0;
  if (inStr) {
    const curr = new Date(`${inStr}T14:00:00-05:00`);
    for (let i = 0; i < nights; i++) {
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      const month = curr.getMonth();

      let multiplier = 1.0;
      if ((mm === '01' && dd === '01') || (mm === '05' && dd === '01') || (mm === '12' && dd === '25')) {
        multiplier = 1.5;
      } else if (month === 6 || month === 7 || month === 11) {
        multiplier = 1.3;
      }

      subtotalCents += Math.round(cleanRate * multiplier * rooms * 100);
      curr.setDate(curr.getDate() + 1);
    }
  } else {
    subtotalCents = Math.round(cleanRate * nights * rooms * 100);
  }

  return {
    baseSubtotal: Number((subtotalCents / 100).toFixed(2)),
    tasaMunicipal: Number((nights * RECEPTION_TASA_MUNICIPAL_POR_NOCHE * rooms).toFixed(2)),
    nights,
  };
}

export function normalizeExtraItems(raw: unknown): ExtraCargoItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, idx) => {
      const obj = (item || {}) as Record<string, unknown>;
      const concepto = String(obj.concepto || '').trim();
      if (!concepto) return null;
      const cantidad = Math.max(1, Math.round(Number(obj.cantidad ?? 1) || 1));
      const precioUnitario = Math.max(0, Number(Number(obj.precioUnitario ?? 0).toFixed(2)) || 0);
      return {
        id: String(obj.id || `EXT-${idx + 1}`),
        concepto,
        cantidad,
        precioUnitario,
        subtotal: Number((cantidad * precioUnitario).toFixed(2)),
      };
    })
    .filter((item): item is ExtraCargoItem => item !== null);
}

export interface ReceptionFolioInput {
  currentSubtotal?: number | string | undefined;
  currentTasaMunicipal?: number | string | undefined;
  currentCargosAdicionalesTotal?: number | string | undefined;
  montoPagadoInicial?: number | string | undefined;
  precioTotal?: number | string | undefined;
  currentEspacioId?: string | undefined;
  targetRoom?: { id: string; precioPorNoche: number | string } | null | undefined;
  fechaEntrada?: string | undefined;
  fechaSalida?: string | undefined;
  cantidadHabitaciones?: number | undefined;
  extras: ExtraCargoItem[];
  estadoPago?: string | undefined;
  esReservaBooking?: boolean | undefined;
}

export interface ReceptionFolioPreview {
  nights: number;
  roomChanged: boolean;
  previousRoomSubtotal: number;
  baseRoomSubtotal: number;
  roomDifference: number;
  extrasSubtotal: number;
  newSubtotal: number;
  newIva: number;
  tasaMunicipal: number;
  newTotal: number;
  montoInicial: number;
  diferenciaTotal: number;
  saldoACobrarEnHotel: number;
}

export function isBookingOriginReserva(
  reserva?: { canalOrigen?: string | null; esReservaBooking?: boolean | null } | null,
): boolean {
  if (!reserva) return false;
  if (typeof reserva.esReservaBooking === 'boolean') return reserva.esReservaBooking;
  const canal = String(reserva.canalOrigen || '').trim().toUpperCase();
  if (!canal) return false;
  return canal !== 'WEB_DIRECT' && canal !== 'LUXESTAYS_WEB';
}

export function computeReceptionFolioPreview(input: ReceptionFolioInput): ReceptionFolioPreview {
  const nights = computeStayNights(input.fechaEntrada, input.fechaSalida);
  const currentTotal = Number(input.precioTotal || 0);
  const currentExtras = Number(input.currentCargosAdicionalesTotal || 0);
  const rawSubtotal =
    input.currentSubtotal != null && Number(input.currentSubtotal) > 0
      ? Number(input.currentSubtotal)
      : Number((currentTotal / (1 + RECEPTION_IVA_RATE)).toFixed(2));
  const previousRoomSubtotal = Math.max(0, Number((rawSubtotal - currentExtras).toFixed(2)));

  let baseRoomSubtotal = previousRoomSubtotal;
  let tasaMunicipal =
    input.currentTasaMunicipal != null
      ? Number(input.currentTasaMunicipal)
      : Number((nights * RECEPTION_TASA_MUNICIPAL_POR_NOCHE * Math.max(1, input.cantidadHabitaciones || 1)).toFixed(2));

  if (input.esReservaBooking) {
    const totalPaidBooking = Number(input.montoPagadoInicial ?? currentTotal);
    return {
      nights,
      roomChanged: false,
      previousRoomSubtotal: Number(currentTotal.toFixed(2)),
      baseRoomSubtotal: Number(currentTotal.toFixed(2)),
      roomDifference: 0,
      extrasSubtotal: 0,
      newSubtotal: Number(currentTotal.toFixed(2)),
      newIva: 0,
      tasaMunicipal: 0,
      newTotal: Number(currentTotal.toFixed(2)),
      montoInicial: Number(totalPaidBooking.toFixed(2)),
      diferenciaTotal: 0,
      saldoACobrarEnHotel: 0,
    };
  }

  const roomChanged = Boolean(
    input.targetRoom && input.currentEspacioId && input.targetRoom.id !== input.currentEspacioId,
  );

  if (roomChanged && input.targetRoom) {
    const calc = computeRoomBaseSubtotal(
      Number(input.targetRoom.precioPorNoche || 0),
      input.fechaEntrada,
      input.fechaSalida,
      input.cantidadHabitaciones || 1,
    );
    baseRoomSubtotal = calc.baseSubtotal;
    tasaMunicipal = calc.tasaMunicipal;
  }

  const extrasSubtotal = Number(
    input.extras.reduce((sum, item) => sum + Number(item.cantidad || 1) * Number(item.precioUnitario || 0), 0).toFixed(2),
  );
  const newSubtotal = Number((baseRoomSubtotal + extrasSubtotal).toFixed(2));
  const newIva = Number((newSubtotal * RECEPTION_IVA_RATE).toFixed(2));
  const newTotal = Number((newSubtotal + newIva + tasaMunicipal).toFixed(2));
  const montoInicial = Number(input.montoPagadoInicial ?? currentTotal);
  const diferenciaTotal = Number((newTotal - montoInicial).toFixed(2));
  const isPaidOnline = String(input.estadoPago || '').toUpperCase() === 'COMPLETADO';
  const saldoACobrarEnHotel = isPaidOnline ? Math.max(0, diferenciaTotal) : newTotal;

  return {
    nights,
    roomChanged,
    previousRoomSubtotal,
    baseRoomSubtotal,
    roomDifference: Number((baseRoomSubtotal - previousRoomSubtotal).toFixed(2)),
    extrasSubtotal,
    newSubtotal,
    newIva,
    tasaMunicipal,
    newTotal,
    montoInicial: Number(montoInicial.toFixed(2)),
    diferenciaTotal,
    saldoACobrarEnHotel: Number(saldoACobrarEnHotel.toFixed(2)),
  };
}
