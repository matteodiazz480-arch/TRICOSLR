import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RESTAURANT_INFO } from '../data/products';

const INK = '#1E1B18';

// Estilo Satelital Híbrido: Fotografía aérea de alta resolución
// con nombres de calles, avenidas y barrios nítidos y legibles (estilo Uber / Google Maps Satelital)
const SATELLITE_HYBRID_STYLE = {
  version: 8,
  sources: {
    'satellite-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; Esri World Imagery',
    },
    'hybrid-labels': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    // 1. Fotografía aérea satelital limpia
    {
      id: 'satellite-layer',
      type: 'raster',
      source: 'satellite-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
    // 2. Nombres de calles, avenidas y barrios de La Rioja Capital superpuestos
    {
      id: 'hybrid-labels-layer',
      type: 'raster',
      source: 'hybrid-labels',
      minzoom: 0,
      maxzoom: 19,
      paint: {
        'raster-opacity': 1,
      },
    },
  ],
};

// Marcador del local Trico's
const makeStoreMarker = () => {
  const el = document.createElement('div');
  el.className = 'map-store-marker cursor-pointer flex flex-col items-center select-none pointer-events-auto';
  el.innerHTML = `
    <div style="background:#FFC93C; border:2px solid #1E1B18; border-radius:10px; padding:2px 7px; font-family:'Lilita One',cursive; font-size:11px; box-shadow:2px 2px 0 #1E1B18; margin-bottom:2px; white-space:nowrap; color:#1E1B18; display:flex; align-items:center; gap:3px;">
      🍗 <span>TRICO'S</span>
    </div>
    <img src="/assets/sticker_bucket.png" alt="Trico's" style="width:42px; height:42px; object-fit:contain; filter:drop-shadow(0 4px 6px rgba(0,0,0,0.5));" draggable="false" />
  `;
  return el;
};

// Marcador del domicilio del cliente (arrastrable)
const makeHomeMarker = () => {
  const el = document.createElement('div');
  el.className = 'map-home-marker cursor-grab flex flex-col items-center select-none pointer-events-auto';
  el.innerHTML = `
    <div style="background:#FF4757; color:#fff; border:2px solid #1E1B18; border-radius:10px; padding:2px 7px; font-family:'Fredoka',sans-serif; font-weight:700; font-size:11px; box-shadow:2px 2px 0 #1E1B18; margin-bottom:2px; white-space:nowrap;">
      🏠 Tu Casa
    </div>
    <svg viewBox="0 0 48 60" width="36" height="46" aria-hidden="true" style="filter:drop-shadow(0 4px 6px rgba(0,0,0,0.45));">
      <path d="M24 57C24 57 44 36 44 22A20 20 0 1 0 4 22C4 36 24 57 24 57Z" fill="#FF4757" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M15 24.5 24 16l9 8.5V33H15Z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="21" y="26" width="6" height="7" fill="${INK}"/>
    </svg>`;
  return el;
};

export default function DeliveryMap({ value, route, onPick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const homeRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!containerRef.current) return;
    const store = RESTAURANT_INFO.location;

    // Mapa Satelital visto desde arriba (pitch: 0, bearing: 0) como Uber / PedidosYa
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: SATELLITE_HYBRID_STYLE,
      center: [store.lng, store.lat],
      zoom: 15.2,
      pitch: 0, // Vista directa desde arriba (ortogonal) para máxima legibilidad de calles
      bearing: 0, // Orientado al Norte fijo
      maxPitch: 0, // Bloqueado desde arriba para no rotar ni inclinarse
      dragRotate: false, // Sin rotación accidental
      touchPitch: false, // Sin inclinación táctil accidental
      attributionControl: false,
    });
    mapRef.current = map;

    // Marcador fijo del local
    new maplibregl.Marker({ element: makeStoreMarker(), anchor: 'bottom' })
      .setLngLat([store.lng, store.lat])
      .addTo(map);

    map.on('load', () => {
      // Capa de ruta de delivery trazada en amarillo brillante con borde negro sobre el satélite
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': INK, 'line-width': 7 },
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#FFC93C', 'line-width': 4 },
      });

      map.resize();
    });

    // Tocar o hacer clic en cualquier lugar del mapa satelital para seleccionar la casa
    map.on('click', (e) => {
      onPickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    // ResizeObserver para asegurar ajuste responsive automático
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
    };
  }, []);

  // Marcador de la casa del cliente
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!value) {
      homeRef.current?.remove();
      homeRef.current = null;
      return;
    }
    if (!homeRef.current) {
      const marker = new maplibregl.Marker({ element: makeHomeMarker(), anchor: 'bottom', draggable: true })
        .setLngLat([value.lng, value.lat])
        .addTo(map);

      marker.on('dragend', () => {
        const p = marker.getLngLat();
        onPickRef.current({ lat: p.lat, lng: p.lng });
      });
      homeRef.current = marker;
    } else {
      homeRef.current.setLngLat([value.lng, value.lat]);
    }
  }, [value]);

  // Actualizar trazado de la ruta y encuadrar desde arriba
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const src = map.getSource('route');
      if (!src) return;
      src.setData(
        route
          ? { type: 'Feature', geometry: route, properties: {} }
          : { type: 'FeatureCollection', features: [] }
      );

      if (route?.coordinates?.length) {
        const bounds = route.coordinates.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(route.coordinates[0], route.coordinates[0])
        );
        map.fitBounds(bounds, {
          padding: { top: 50, bottom: 40, left: 40, right: 40 },
          pitch: 0, // Siempre vista desde arriba
          bearing: 0, // Siempre Norte arriba
          duration: 600,
          maxZoom: 16,
        });
      }
    };

    if (map.isStyleLoaded() && map.getSource('route')) apply();
    else map.once('idle', apply);
  }, [route]);

  // Contenedor 100% limpio sin botones superpuestos que estorben
  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
