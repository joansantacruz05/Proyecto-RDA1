import { describe, expect, it } from 'vitest';
import {
  computeReceptionFolioPreview,
  computeRoomBaseSubtotal,
  computeStayNights,
  normalizeExtraItems,
} from './receptionFolio';

describe('receptionFolio utilities', () => {
  it('computes stay nights accurately and clamps minimum to 1', () => {
    expect(computeStayNights('2026-11-12', '2026-11-14')).toBe(2);
    expect(computeStayNights('2026-11-12', '2026-11-12')).toBe(1);
    expect(computeStayNights(undefined, undefined)).toBe(1);
  });

  it('matches backend Ecuador holiday and high-season multipliers', () => {
    // 25 Dec holiday (+50%): $100 * 1.5 = $150 + $2 tasa
    const holiday = computeRoomBaseSubtotal(100, '2026-12-25', '2026-12-26', 1);
    expect(holiday.nights).toBe(1);
    expect(holiday.baseSubtotal).toBe(150);
    expect(holiday.tasaMunicipal).toBe(2);

    // July high season (+30%): 2 nights * $100 * 1.3 = $260 + $4 tasa
    const highSeason = computeRoomBaseSubtotal(100, '2026-07-10', '2026-07-12', 1);
    expect(highSeason.nights).toBe(2);
    expect(highSeason.baseSubtotal).toBe(260);
    expect(highSeason.tasaMunicipal).toBe(4);
  });

  it('recalculates folio totals with extra guests/services keeping base room untouched', () => {
    const preview = computeReceptionFolioPreview({
      currentSubtotal: 200,
      currentTasaMunicipal: 4,
      currentCargosAdicionalesTotal: 0,
      montoPagadoInicial: 234,
      precioTotal: 234,
      currentEspacioId: 'ESP-001',
      targetRoom: { id: 'ESP-001', precioPorNoche: 100 },
      fechaEntrada: '2026-05-10',
      fechaSalida: '2026-05-12',
      cantidadHabitaciones: 1,
      extras: [
        { id: '1', concepto: 'Huésped adicional', cantidad: 2, precioUnitario: 15, subtotal: 30 },
        { id: '2', concepto: 'Desayuno buffet', cantidad: 2, precioUnitario: 12, subtotal: 24 },
      ],
      estadoPago: 'COMPLETADO',
    });

    expect(preview.roomChanged).toBe(false);
    expect(preview.baseRoomSubtotal).toBe(200);
    expect(preview.extrasSubtotal).toBe(54);
    expect(preview.newSubtotal).toBe(254);
    expect(preview.newIva).toBe(38.1);
    expect(preview.newTotal).toBe(296.1); // 254 + 38.10 + 4
    expect(preview.diferenciaTotal).toBe(62.1);
    expect(preview.saldoACobrarEnHotel).toBe(62.1);
  });

  it('recalculates upgrade and downgrade deltas when switching rooms', () => {
    const upgrade = computeReceptionFolioPreview({
      currentSubtotal: 160,
      currentTasaMunicipal: 4,
      currentCargosAdicionalesTotal: 0,
      montoPagadoInicial: 188,
      precioTotal: 188,
      currentEspacioId: 'ESP-001',
      targetRoom: { id: 'ESP-002', precioPorNoche: 120 },
      fechaEntrada: '2026-05-10',
      fechaSalida: '2026-05-12',
      cantidadHabitaciones: 1,
      extras: [],
      estadoPago: 'COMPLETADO',
    });

    expect(upgrade.roomChanged).toBe(true);
    expect(upgrade.baseRoomSubtotal).toBe(240);
    expect(upgrade.roomDifference).toBe(80);
    expect(upgrade.newIva).toBe(36);
    expect(upgrade.newTotal).toBe(280);
    expect(upgrade.diferenciaTotal).toBe(92);

    const downgrade = computeReceptionFolioPreview({
      currentSubtotal: 240,
      currentTasaMunicipal: 4,
      currentCargosAdicionalesTotal: 0,
      montoPagadoInicial: 280,
      precioTotal: 280,
      currentEspacioId: 'ESP-002',
      targetRoom: { id: 'ESP-001', precioPorNoche: 80 },
      fechaEntrada: '2026-05-10',
      fechaSalida: '2026-05-12',
      cantidadHabitaciones: 1,
      extras: [],
      estadoPago: 'COMPLETADO',
    });

    expect(downgrade.roomChanged).toBe(true);
    expect(downgrade.roomDifference).toBe(-80);
    expect(downgrade.newTotal).toBe(188);
    expect(downgrade.diferenciaTotal).toBe(-92);
    expect(downgrade.saldoACobrarEnHotel).toBe(0);
  });

  it('requires full new total at reception when initial payment is pending', () => {
    const pendingCash = computeReceptionFolioPreview({
      currentSubtotal: 100,
      currentTasaMunicipal: 2,
      currentCargosAdicionalesTotal: 0,
      montoPagadoInicial: 117,
      precioTotal: 117,
      currentEspacioId: 'ESP-001',
      targetRoom: { id: 'ESP-001', precioPorNoche: 100 },
      fechaEntrada: '2026-05-10',
      fechaSalida: '2026-05-11',
      extras: [{ id: '1', concepto: 'Late Check-out', cantidad: 1, precioUnitario: 30, subtotal: 30 }],
      estadoPago: 'PENDIENTE',
    });

    expect(pendingCash.newTotal).toBe(151.5); // (100+30)*1.15 + 2 = 149.5 + 2
    expect(pendingCash.saldoACobrarEnHotel).toBe(151.5);
  });

  it('normalizes extra items cleanly', () => {
    const items = normalizeExtraItems([
      { concepto: '  ', cantidad: 1, precioUnitario: 10 },
      { concepto: 'Cama adicional', cantidad: 2, precioUnitario: 25 },
      { concepto: 'Parqueadero', cantidad: 0, precioUnitario: -5 },
    ]);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ concepto: 'Cama adicional', cantidad: 2, precioUnitario: 25, subtotal: 50 });
    expect(items[1]).toMatchObject({ concepto: 'Parqueadero', cantidad: 1, precioUnitario: 0, subtotal: 0 });
  });
});
