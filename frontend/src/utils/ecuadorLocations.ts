export interface CityCoords {
  lat: number;
  lng: number;
  zoom: number;
}

const DEFAULT_CITY_COORDS: CityCoords = { lat: -0.1807, lng: -78.4678, zoom: 13 };

const CITY_CENTERS: Record<string, CityCoords> = {
  quito: DEFAULT_CITY_COORDS,
  guayaquil: { lat: -2.1894, lng: -79.8891, zoom: 13 },
  cuenca: { lat: -2.9001, lng: -79.0059, zoom: 13 },
  manta: { lat: -0.9677, lng: -80.7089, zoom: 13 },
  banos: { lat: -1.3928, lng: -78.4269, zoom: 14 },
  'banos de agua santa': { lat: -1.3928, lng: -78.4269, zoom: 14 },
  galapagos: { lat: -0.7436, lng: -90.3156, zoom: 12 },
  'puerto ayora': { lat: -0.7436, lng: -90.3156, zoom: 13 },
  'santa cruz': { lat: -0.7436, lng: -90.3156, zoom: 12 },
  'san cristobal': { lat: -0.9022, lng: -89.6091, zoom: 13 },
  salinas: { lat: -2.2145, lng: -80.9515, zoom: 13 },
  montanita: { lat: -1.8256, lng: -80.7530, zoom: 14 },
  atacames: { lat: 0.8696, lng: -79.8453, zoom: 14 },
  esmeraldas: { lat: 0.9682, lng: -79.6517, zoom: 13 },
  otavalo: { lat: 0.2346, lng: -78.2625, zoom: 14 },
  ibarra: { lat: 0.3517, lng: -78.1223, zoom: 13 },
  loja: { lat: -3.9931, lng: -79.2042, zoom: 13 },
  ambato: { lat: -1.2543, lng: -78.6229, zoom: 13 },
  riobamba: { lat: -1.6635, lng: -78.6546, zoom: 13 },
  tena: { lat: -0.9938, lng: -77.8129, zoom: 13 },
  playas: { lat: -2.6319, lng: -80.3886, zoom: 13 },
  papallacta: { lat: -0.3765, lng: -78.1419, zoom: 13 },
  mindo: { lat: -0.0528, lng: -78.7747, zoom: 14 },
  cotopaxi: { lat: -0.9346, lng: -78.6155, zoom: 12 },
  latacunga: { lat: -0.9346, lng: -78.6155, zoom: 13 },
  vilcabamba: { lat: -4.2611, lng: -79.2225, zoom: 14 },
  'puerto lopez': { lat: -1.5583, lng: -80.8125, zoom: 14 },
};

function normalizeCityKey(name?: string | null | undefined): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function hasValidCoordinates(
  lat?: number | string | null | undefined,
  lng?: number | string | null | undefined,
): boolean {
  if (lat === null || lat === undefined || lat === '' || lng === null || lng === undefined || lng === '') {
    return false;
  }
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return false;
  if (nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) return false;
  // (0, 0) se usa como marcador vacio heredado en ubicaciones nuevas sin pin definido
  if (Math.abs(nLat) < 0.0001 && Math.abs(nLng) < 0.0001) return false;
  return true;
}

export function getCityCenterCoords(destino?: string | null | undefined): CityCoords {
  const key = normalizeCityKey(destino);
  const direct = key ? CITY_CENTERS[key] : undefined;
  if (direct) {
    return direct;
  }
  if (key) {
    for (const [cityKey, coords] of Object.entries(CITY_CENTERS)) {
      if (key.includes(cityKey) || cityKey.includes(key)) {
        return coords;
      }
    }
  }
  return DEFAULT_CITY_COORDS;
}

export function resolveMapCoords(
  lat?: number | string | null | undefined,
  lng?: number | string | null | undefined,
  destino?: string | null | undefined,
): CityCoords & { isApproximate: boolean } {
  if (hasValidCoordinates(lat, lng)) {
    return {
      lat: Number(lat),
      lng: Number(lng),
      zoom: 15,
      isApproximate: false,
    };
  }
  const fallback = getCityCenterCoords(destino);
  return {
    ...fallback,
    isApproximate: true,
  };
}

export function buildGoogleMapsUrl(opts: {
  lat?: number | string | null | undefined;
  lng?: number | string | null | undefined;
  nombre?: string | null | undefined;
  direccion?: string | null | undefined;
  destino?: string | null | undefined;
}): string {
  if (hasValidCoordinates(opts.lat, opts.lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${Number(opts.lat).toFixed(6)},${Number(opts.lng).toFixed(6)}`;
  }
  const query = [opts.nombre, opts.direccion, opts.destino, 'Ecuador']
    .filter((v) => v && String(v).trim() !== '')
    .join(' ');
  return `https://maps.google.com/?q=${encodeURIComponent(query || 'Quito Ecuador')}`;
}

export function formatHoraHHMM(raw?: string | null | undefined, fallback = '14:00'): string {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)/.exec(String(raw || '').trim());
  if (!match || !match[1] || !match[2]) return fallback;
  return `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}`;
}
