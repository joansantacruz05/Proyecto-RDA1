import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkIsAlojamientoReserved,
  isAlojamientoInCleaning,
  liberarAlojamiento,
  markAlojamientoReserved,
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
});

