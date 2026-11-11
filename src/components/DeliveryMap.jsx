import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RESTAURANT_INFO } from '../data/products';

const ESRI_TILES_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

// Marcador del local Trico's con auto de delivery Uber (como en la captura)
const makeStoreMarker = () => {
  const el = document.createElement('div');
  el.className = 'map-store-marker cursor-pointer flex flex-col items-center select-none pointer-events-auto';
  el.innerHTML = `
    <div style="background:#FFC93C; border:2px solid #1E1B18; border-radius:10px; padding:2px 8px; font-family:'Lilita One',cursive; font-size:11px; box-shadow:0 3px 6px rgba(0,0,0,0.5); margin-bottom:2px; white-space:nowrap; color:#1E1B18; display:flex; align-items:center; gap:3px;">
      🍗 <span>TRICO'S</span>
    </div>
    <!-- Auto de delivery estilo Uber como en la captura -->
    <div style="filter:drop-shadow(0 4px 6px rgba(0,0,0,0.6));">
      <svg width="36" height="24" viewBox="0 0 60 38" fill="none">
        <rect x="6" y="4" width="48" height="30" rx="10" fill="#FFFFFF" stroke="#1E1B18" stroke-width="3"/>
        <path d="M18 9 H42 C45 9 47 11 46 14 L44 24 C43 27 41 29 38 29 H22 C19 29 17 27 16 24 L14 14 C13 11 15 9 18 9 Z" fill="#2C3437"/>
        <rect x="22" y="11" width="16" height="16" rx="3" fill="#FFFFFF" opacity="0.9"/>
        <rect x="52" y="7" width="3" height="5" rx="1" fill="#FFC93C"/>
        <rect x="52" y="26" width="3" height="5" rx="1" fill="#FFC93C"/>
        <rect x="12" y="1" width="10" height="3" rx="1.5" fill="#1E1B18"/>
        <rect x="38" y="1" width="10" height="3" rx="1.5" fill="#1E1B18"/>
        <rect x="12" y="34" width="10" height="3" rx="1.5" fill="#1E1B18"/>
        <rect x="38" y="34" width="10" height="3" rx="1.5" fill="#1E1B18"/>
      </svg>
    </div>
  `;
  return el;
};

// Marcador del domicilio del cliente (Cuadrado negro dropoff idéntico a la captura de Uber)
const makeHomeMarker = () => {
  const el = document.createElement('div');
  el.className = 'map-home-marker cursor-grab flex flex-col items-center select-none pointer-events-auto';
  el.innerHTML = `
    <div style="background:#000000; color:#FFFFFF; border:2px solid #FFFFFF; border-radius:10px; padding:3px 9px; font-family:'Fredoka',sans-serif; font-weight:800; font-size:11px; box-shadow:0 4px 8px rgba(0,0,0,0.6); margin-bottom:3px; white-space:nowrap; display:flex; align-items:center; gap:4px;">
      <span>■</span> <span>Tu Casa (Destino)</span>
    </div>
    <!-- Cuadrado negro de parada Uber idéntico a la captura -->
    <div style="width:22px; height:22px; background:#000000; border:3.5px solid #FFFFFF; box-shadow:0 4px 8px rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center;">
      <div style="width:6px; height:6px; background:#FFFFFF;"></div>
    </div>
  `;
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

    // Mapa permanentemente en Modo Oscuro estilo Uber
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'streets-tiles': {
            type: 'raster',
            tiles: [ESRI_TILES_URL],
            tileSize: 256,
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: 'streets-layer',
            type: 'raster',
            source: 'streets-tiles',
            minzoom: 0,
            maxzoom: 19,
            paint: {
              'raster-saturation': -0.95,
              'raster-contrast': 0.55,
              'raster-brightness-max': 0.28,
              'raster-brightness-min': 0.02,
            },
          },
        ],
      },
      center: [store.lng, store.lat],
      zoom: 15.6,
      pitch: 0,
      bearing: 0,
      maxPitch: 0,
      dragRotate: false,
      touchPitch: false,
      attributionControl: false,
    });
    mapRef.current = map;

    // Marcador fijo del local con auto de delivery Uber
    new maplibregl.Marker({ element: makeStoreMarker(), anchor: 'center' })
      .setLngLat([store.lng, store.lat])
      .addTo(map);

    const setupLayers = () => {
      if (!map.getSource('route')) {
        map.addSource('route', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        // Reborde blanco de contraste alto
        map.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#FFFFFF',
            'line-width': 9,
          },
        });

        // Línea principal NEGRA continua estilo Uber (idéntica a la captura)
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#000000',
            'line-width': 6,
          },
        });
      }
      map.resize();
    };

    map.on('load', setupLayers);

    // Clic en el mapa para marcar domicilio
    map.on('click', (e) => {
      onPickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Marcador de la casa del cliente (Cuadrado negro dropoff Uber)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!value) {
      homeRef.current?.remove();
      homeRef.current = null;
      return;
    }
    if (!homeRef.current) {
      const marker = new maplibregl.Marker({ element: makeHomeMarker(), anchor: 'center', draggable: true })
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

  // Actualizar trazado de la ruta negra
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
          padding: { top: 60, bottom: 50, left: 45, right: 45 },
          pitch: 0,
          bearing: 0,
          duration: 500,
          maxZoom: 16.5,
        });
      }
    };

    if (map.isStyleLoaded() && map.getSource('route')) apply();
    else map.once('idle', apply);
  }, [route]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
