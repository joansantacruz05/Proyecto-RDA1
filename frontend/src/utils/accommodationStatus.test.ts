import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkIsAlojamientoReserved,
  checkIsRoomReserved,
  clearHotelLimpiezaOverride,
  getEstadosOverride,
  isAlojamientoInCleaning,
  liberarAlojamiento,
  markAlojamientoReserved,
  markReservaCanceladaLocal,
  setAdminAlojamientoEstado,
  setAlojamientoEnLimpieza,
} from './accommodationStatus';

describe('accommodationStatus', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('no falla cuando alojamientoCodigo, alojamientoNombre o campos de activeReservas vienen en null desde PostgreSQL', () => {
    expect(() =>
      checkIsAlojamientoReserved({
        alojamientoId: 'ALO-001',
        alojamientoNombre: 'Gran Hotel Plaza Grande',
        alojamientoCodigo: null,
        estaReservadoApi: false,
        habitacionesDisponibles: 2,
        estado: 'Activo',
        activeReservas: [
          {
            id: 'RES-001',
            alojamientoId: null,
            alojamientoNombre: null,
            alojamientoCodigo: null,
            habitacionNombre: null,
            estadoId: 'EST-002',
            estadoNombre: 'Confirmada',
          },
        ],
      }),
    ).not.toThrow();

    const reserved = checkIsAlojamientoReserved({
      alojamientoId: 'ALO-001',
      alojamientoNombre: 'Gran Hotel Plaza Grande',
      alojamientoCodigo: null,
      estaReservadoApi: false,
      habitacionesDisponibles: 2,
      estado: 'Activo',
      activeReservas: [],
    });
    expect(reserved).toBe(false);
  });

  it('liberarAlojamiento y markAlojamientoReserved toleran valores nulos sin lanzar excepciones', () => {
    expect(() => {
      markAlojamientoReserved({
        id: 'RES-100',
        alojamientoId: 'ALO-002',
        alojamientoNombre: null,
        alojamientoCodigo: null,
      });
      liberarAlojamiento('ALO-002', null);
    }).not.toThrow();
  });

  it('bloquea reservas en estado En Limpieza y vuelve a habilitar tras liberarAlojamiento', () => {
    setAlojamientoEnLimpieza('ALO-003', 'Hotel Patio Andaluz');
    expect(isAlojamientoInCleaning({ alojamientoId: 'ALO-003', alojamientoNombre: 'Hotel Patio Andaluz', estado: 'En Limpieza' })).toBe(true);
    expect(
      checkIsAlojamientoReserved({
        alojamientoId: 'ALO-003',
        alojamientoNombre: 'Hotel Patio Andaluz',
        estado: 'En Limpieza',
        habitacionesDisponibles: 3,
      }),
    ).toBe(true);

    liberarAlojamiento('ALO-003', 'Hotel Patio Andaluz');
    expect(isAlojamientoInCleaning({ alojamientoId: 'ALO-003', alojamientoNombre: 'Hotel Patio Andaluz', estado: 'Activo' })).toBe(false);
    expect(
      checkIsAlojamientoReserved({
        alojamientoId: 'ALO-003',
        alojamientoNombre: 'Hotel Patio Andaluz',
        estado: 'Activo',
        habitacionesDisponibles: 3,
      }),
    ).toBe(false);
  });

  it('ignora reservas ya finalizadas en EST-004 o EST-005 cuando el alojamiento ya está Activo', () => {
    const reservedAfterClean = checkIsAlojamientoReserved({
      alojamientoId: 'ALO-004',
      alojamientoNombre: 'Casa Gangotena',
      estado: 'Activo',
      habitacionesDisponibles: 2,
      activeReservas: [
        {
          id: 'RES-FIN-1',
          alojamientoId: 'ALO-004',
          alojamientoNombre: 'Casa Gangotena',
          estadoId: 'EST-005',
          estadoNombre: 'Finalizada',
          checkoutRealizado: true,
        },
      ],
    });
    expect(reservedAfterClean).toBe(false);
  });

  it('libera la marca local cuando el usuario cancela su reserva reciente', () => {
    markAlojamientoReserved({
      id: 'RES-CANCEL-1',
      ordenId: 'ORD-CANCEL-1',
      alojamientoId: 'ALO-002',
      alojamientoNombre: 'Villa Colonial Río Tomebamba',
      habitacionNombre: 'Suite',
    });

    expect(
      checkIsAlojamientoReserved({
        alojamientoId: 'ALO-002',
        alojamientoNombre: 'Villa Colonial Río Tomebamba',
        estado: 'Activo',
        habitacionesDisponibles: 2,
      }),
    ).toBe(true);

    markReservaCanceladaLocal('RES-CANCEL-1', 'Villa Colonial Río Tomebamba');

    expect(
      checkIsAlojamientoReserved({
        alojamientoId: 'ALO-002',
        alojamientoNombre: 'Villa Colonial Río Tomebamba',
        estado: 'Activo',
        habitacionesDisponibles: 2,
      }),
    ).toBe(false);
  });

  it('clearHotelLimpiezaOverride limpia overrides heredados En Limpieza sin borrar Activo/Inactivo', () => {
    setAlojamientoEnLimpieza('ALO-001', 'Gran Hotel Plaza Grande');
    expect(
      isAlojamientoInCleaning({
        alojamientoId: 'ALO-001',
        alojamientoNombre: 'Gran Hotel Plaza Grande',
      }),
    ).toBe(true);

    clearHotelLimpiezaOverride('ALO-001', 'Gran Hotel Plaza Grande');
    expect(
      isAlojamientoInCleaning({
        alojamientoId: 'ALO-001',
        alojamientoNombre: 'Gran Hotel Plaza Grande',
      }),
    ).toBe(false);

    setAdminAlojamientoEstado('ALO-002', 'Inactivo');
    clearHotelLimpiezaOverride('ALO-002', 'Villa Colonial');
    expect(getEstadosOverride()['ALO-002']).toBe('Inactivo');
  });

  it('permite reservar habitaciones de forma independiente en un alojamiento con múltiples cuartos (ej. Carla)', () => {
    const carlaReservas = [
      {
        id: 'RES-CARLA-1',
        alojamientoId: 'ALO-CARLA',
        alojamientoNombre: 'Carla',
        espacioId: 'HAB-102',
        habitacionNombre: 'Habitación 102',
        estadoId: 'EST-002',
        estadoNombre: 'Confirmada',
        fechaEntrada: '2026-11-20',
        fechaSalida: '2026-11-25',
      },
    ];

    // Habitación 102 está reservada para esas fechas
    const isRoom102Reserved = checkIsRoomReserved({
      roomId: 'HAB-102',
      roomNombre: 'Habitación 102',
      roomEstado: 'Activo',
      cantidadDisponible: 1,
      alojamientoId: 'ALO-CARLA',
      activeReservas: carlaReservas,
      checkDates: { checkin: '2026-11-21', checkout: '2026-11-24' },
    });
    expect(isRoom102Reserved).toBe(true);

    // Habitación Estándar NO está reservada para esas fechas y tiene stock disponible
    const isRoomEstándarReserved = checkIsRoomReserved({
      roomId: 'HAB-STD',
      roomNombre: 'Habitación Estándar',
      roomEstado: 'Activo',
      cantidadDisponible: 2,
      alojamientoId: 'ALO-CARLA',
      activeReservas: carlaReservas,
      checkDates: { checkin: '2026-11-21', checkout: '2026-11-24' },
    });
    expect(isRoomEstándarReserved).toBe(false);

    // El alojamiento Carla como un todo NO está reservado porque le queda 1 habitación libre
    const isCarlaReserved = checkIsAlojamientoReserved({
      alojamientoId: 'ALO-CARLA',
      alojamientoNombre: 'Carla',
      totalHabitaciones: 2,
      habitacionesDisponibles: 1,
      activeReservas: carlaReservas,
      checkDates: { checkin: '2026-11-21', checkout: '2026-11-24' },
    });
    expect(isCarlaReserved).toBe(false);

    // Si una habitación se pone individualmente en estado En Limpieza, solo ella queda no disponible
    const isRoomCleaning = checkIsRoomReserved({
      roomId: 'HAB-102',
      roomNombre: 'Habitación 102',
      roomEstado: 'En Limpieza',
      cantidadDisponible: 1,
      alojamientoId: 'ALO-CARLA',
    });
    expect(isRoomCleaning).toBe(true);
  });
});

