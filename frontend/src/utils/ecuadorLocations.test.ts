import { describe, it, expect } from 'vitest';
import {
  buildGoogleMapsUrl,
  formatHoraHHMM,
  getCityCenterCoords,
  hasValidCoordinates,
  resolveMapCoords,
} from './ecuadorLocations';

describe('Utilidades de ubicación GPS y horarios Ecuador', () => {
  it('rechaza coordenadas vacías o (0,0) pero acepta Mitad del Mundo', () => {
    expect(hasValidCoordinates(0, 0)).toBe(false);
    expect(hasValidCoordinates(null, -78.5)).toBe(false);
    expect(hasValidCoordinates(-0.0022, -78.4558)).toBe(true);
  });

  it('resuelve centro aproximado por ciudad cuando no hay pin guardado', () => {
    const cuenca = getCityCenterCoords('Cuenca');
    expect(cuenca.lat).toBeCloseTo(-2.9001, 3);
    expect(cuenca.lng).toBeCloseTo(-79.0059, 3);

    const approx = resolveMapCoords(0, 0, 'Guayaquil');
    expect(approx.isApproximate).toBe(true);
    expect(approx.lat).toBeCloseTo(-2.1894, 3);

    const exact = resolveMapCoords(-0.2201, -78.5123, 'Quito');
    expect(exact.isApproximate).toBe(false);
    expect(exact.lat).toBeCloseTo(-0.2201, 4);
  });

  it('genera enlace exacto de Google Maps con coordenadas válidas', () => {
    const url = buildGoogleMapsUrl({
      lat: -2.1894,
      lng: -79.8891,
      nombre: 'Hotel Río',
      destino: 'Guayaquil',
    });
    expect(url).toContain('query=-2.189400,-79.889100');
  });

  it('normaliza horas HH:MM:SS y usa fallback seguro', () => {
    expect(formatHoraHHMM('15:30:00', '14:00')).toBe('15:30');
    expect(formatHoraHHMM('9:05', '14:00')).toBe('09:05');
    expect(formatHoraHHMM('', '11:00')).toBe('11:00');
  });
});

