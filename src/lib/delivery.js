import { RESTAURANT_INFO } from '../data/products';

// Límites de coordenadas de La Rioja Capital para afinar búsquedas locales
const LA_RIOJA_VIEWBOX = '-67.02,-29.30,-66.74,-29.52';

export const buildGoogleMapsUrl = (lat, lng) => {
  if (lat == null || lng == null) return '';
  const cleanLat = Number(lat).toFixed(6);
  const cleanLng = Number(lng).toFixed(6);
  return `https://www.google.com/maps?q=${cleanLat},${cleanLng}`;
};

export const formatAddress = (a = {}) => {
  const street = [a.road, a.house_number].filter(Boolean).join(' ');
  const area = a.suburb || a.neighbourhood || a.quarter || '';
  return [street, area].filter(Boolean).join(', ') || a.display_name || '';
};

/**
 * Busca direcciones en La Rioja Capital usando Nominatim OpenStreetMap
 */
export const searchAddress = async (query, signal) => {
  if (!query || query.trim().length < 3) return [];
  const cleanQuery = query.trim();

  try {
    const params = new URLSearchParams({
      q: `${cleanQuery}, La Rioja, Argentina`,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'ar',
      viewbox: LA_RIOJA_VIEWBOX,
      bounded: '0',
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      signal,
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'TricosFoodApp/1.0',
      },
    });

    if (!res.ok) return [];
    const data = await res.json();

    return data.map((r) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      label: formatAddress(r.address) || r.display_name.split(',').slice(0, 3).join(','),
      raw: r,
    }));
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn('Error en búsqueda de direcciones:', err);
    return [];
  }
};

/**
 * Geocodificación inversa para obtener nombre de calle y barrio al tocar el mapa
 */
export const reverseAddress = async ({ lat, lng }, signal) => {
  if (lat == null || lng == null) return '';

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      zoom: '18',
      addressdetails: '1',
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      signal,
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'TricosFoodApp/1.0',
      },
    });

    if (!res.ok) return '';
    const data = await res.json();
    return formatAddress(data.address) || data.display_name?.split(',').slice(0, 3).join(',') || '';
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn('Error en reverse geocoding:', err);
    return '';
  }
};
