import { RESTAURANT_INFO } from '../data/products';

// API Key oficial de Google Maps
export const GOOGLE_MAPS_API_KEY = 'AIzaSyBrnc0DymMPO5Qbki2Ijqo6pXxOcmXT9AU';

export const googleSatelliteUrl = (lat, lng) =>
  `https://www.google.com/maps/@${lat},${lng},17z/data=!3m1!1e3`;

// Tarifas de envío por kilómetro (recorrido real en calle desde el local)
export const DELIVERY_RATES = [
  { upTo: 2.5, price: 2000 },
  { upTo: 4, price: 3000 },
  { upTo: 5, price: 3500 },
  { upTo: 6, price: 4000 },
  { upTo: 7, price: 4500 },
  { upTo: 9, price: 5000 },
  { upTo: Infinity, price: 6000 },
];

export const priceForKm = (km) => DELIVERY_RATES.find((r) => km <= r.upTo).price;

export const isFreeDelivery = (subtotal) => subtotal >= RESTAURANT_INFO.freeDeliveryThreshold;

/**
 * Costo de envío final.
 * - Retiro en local: 0
 * - Pedido >= umbral: 0 (delivery gratis)
 * - Delivery sin ubicación elegida: null (todavía no se puede calcular)
 */
export const shippingFor = ({ deliveryType, subtotal, deliveryInfo }) => {
  if (deliveryType === 'takeaway') return 0;
  if (isFreeDelivery(subtotal)) return 0;
  return deliveryInfo ? deliveryInfo.fee : null;
};

const toRad = (d) => (d * Math.PI) / 180;
export const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/**
 * Distancia por calle (OSRM). Si el servicio no responde, se estima con la
 * distancia en línea recta x1.3 (factor típico de cuadrícula urbana).
 */
export const routeFromStore = async (to, signal) => {
  const from = RESTAURANT_INFO.location;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal });
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) throw new Error('sin ruta');
    return { km: route.distance / 1000, geometry: route.geometry, approx: false };
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    return {
      km: haversineKm(from, to) * 1.3,
      geometry: { type: 'LineString', coordinates: [[from.lng, from.lat], [to.lng, to.lat]] },
      approx: true,
    };
  }
};

// Límites de La Rioja Capital para el buscador de direcciones
const VIEWBOX = '-67.02,-29.30,-66.74,-29.52';

export const searchAddress = async (query, signal) => {
  const params = new URLSearchParams({
    q: `${query}, La Rioja`,
    format: 'json',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'ar',
    viewbox: VIEWBOX,
    bounded: '1',
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    signal,
    headers: { 'Accept-Language': 'es' },
  });
  const data = await res.json();
  return data.map((r) => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    label: formatAddress(r.address) || r.display_name.split(',').slice(0, 2).join(','),
  }));
};

export const reverseAddress = async ({ lat, lng }, signal) => {
  try {
    const params = new URLSearchParams({ lat, lon: lng, format: 'json', zoom: '18', addressdetails: '1' });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      signal,
      headers: { 'Accept-Language': 'es' },
    });
    const data = await res.json();
    return formatAddress(data.address) || '';
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    return '';
  }
};

const formatAddress = (a = {}) => {
  const street = [a.road, a.house_number].filter(Boolean).join(' ');
  const area = a.suburb || a.neighbourhood || a.quarter || '';
  return [street, area].filter(Boolean).join(', ');
};
