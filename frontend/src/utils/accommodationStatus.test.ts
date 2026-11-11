import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkIsAlojamientoReserved,
  liberarAlojamiento,
  markAlojamientoReserved,
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
});

