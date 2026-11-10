import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RESTAURANT_INFO } from '../data/products';
import { googleSatelliteUrl } from '../lib/delivery';

const INK = '#1E1B18';

// Estilo combinado con capas de Satélite Fotográfico de Alta Definición,
// Etiquetas Híbridas de Calles y Capa Urbana Alternativa
const MAP_STYLE = {
  version: 8,
  sources: {
    'satellite-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; Esri World Imagery &copy; Google Maps Satellite',
    },
    'hybrid-labels': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
    'streets-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; Esri &copy; OpenStreetMap',
    },
  },
  layers: [
    // 1. Capa Satelital Fotográfica (Activa por defecto)
    {
      id: 'satellite-layer',
      type: 'raster',
      source: 'satellite-tiles',
      minzoom: 0,
      maxzoom: 19,
      layout: { visibility: 'visible' },
    },
    // 2. Capa Híbrida: nombres de calles, barrios y avenidas sobre la foto satelital
    {
      id: 'hybrid-labels-layer',
      type: 'raster',
      source: 'hybrid-labels',
      minzoom: 0,
      maxzoom: 19,
      layout: { visibility: 'visible' },
      paint: { 'raster-opacity': 0.95 },
    },
    // 3. Capa de Calles Clásica (oculta inicialmente, conmutable)
    {
      id: 'streets-layer',
      type: 'raster',
      source: 'streets-tiles',
      minzoom: 0,
      maxzoom: 19,
      layout: { visibility: 'none' },
    },
  ],
};

// Marcador del local Trico's con sticker
const makeStoreMarker = () => {
  const el = document.createElement('div');
  el.className = 'map-store-marker cursor-pointer flex flex-col items-center select-none';
  el.innerHTML = `
    <div style="background:#FFC93C; border:2px solid #1E1B18; border-radius:10px; padding:2px 6px; font-family:'Lilita One',cursive; font-size:11px; box-shadow:2px 2px 0 #1E1B18; margin-bottom:2px; white-space:nowrap; color:#1E1B18; display:flex; align-items:center; gap:3px;">
      🍗 <span>TRICO'S</span>
    </div>
    <img src="/assets/sticker_bucket.png" alt="Trico's" style="width:44px; height:44px; object-fit:contain; filter:drop-shadow(0 4px 6px rgba(0,0,0,0.45));" draggable="false" />
  `;
  return el;
};

// Marcador del domicilio del cliente
const makeHomeMarker = () => {
  const el = document.createElement('div');
  el.className = 'map-home-marker cursor-grab flex flex-col items-center select-none';
  el.innerHTML = `
    <div style="background:#FF4757; color:#fff; border:2px solid #1E1B18; border-radius:10px; padding:2px 6px; font-family:'Fredoka',sans-serif; font-weight:700; font-size:10px; box-shadow:2px 2px 0 #1E1B18; margin-bottom:2px; white-space:nowrap;">
      🏠 Tu Casa
    </div>
    <svg viewBox="0 0 48 60" width="38" height="48" aria-hidden="true" style="filter:drop-shadow(0 4px 6px rgba(0,0,0,0.4));">
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

  // Estado de rotación 3D continua y modo satelital
  const [isRotating, setIsRotating] = useState(true);
  const [isSatellite, setIsSatellite] = useState(true);
  const isRotatingRef = useRef(true);
  isRotatingRef.current = isRotating;

  useEffect(() => {
    if (!containerRef.current) return;
    const store = RESTAURANT_INFO.location;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [store.lng, store.lat],
      zoom: 15.2,
      pitch: 56, // Perspectiva 3D inclinada
      bearing: 15,
      maxPitch: 68,
      attributionControl: false,
    });
    mapRef.current = map;

    // Controles de navegación y brújula 3D
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showZoom: true }), 'top-right');

    // Marcador fijo del local con sticker ampliado
    new maplibregl.Marker({ element: makeStoreMarker(), anchor: 'bottom' })
      .setLngLat([store.lng, store.lat])
      .addTo(map);

    map.on('load', () => {
      // Capa de ruta de delivery trazada en amarillo y negro
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': INK, 'line-width': 8 },
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#FFC93C', 'line-width': 4.5 },
      });

      map.resize();
    });

    // Clic en el mapa para marcar domicilio
    map.on('click', (e) => {
      // Pausa la rotación automática para que el usuario interactúe con precisión
      setIsRotating(false);
      onPickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    // Pausar auto-giro cuando el usuario interactúa manualmente (drag, touch o zoom)
    map.on('dragstart', () => setIsRotating(false));
    map.on('touchstart', () => setIsRotating(false));
    map.on('rotatestart', () => setIsRotating(false));
    map.on('pitchstart', () => setIsRotating(false));

    // Animación de rotación continua 3D (Cámara orbital suave alrededor del centro)
    let animId;
    const rotateCamera = () => {
      if (mapRef.current && isRotatingRef.current) {
        const b = mapRef.current.getBearing();
        // Giros suaves y cinematográficos de ~0.11 grados por fotograma
        mapRef.current.setBearing((b + 0.11) % 360);
      }
      animId = requestAnimationFrame(rotateCamera);
    };
    animId = requestAnimationFrame(rotateCamera);

    // ResizeObserver para garantizar que el canvas se adapte perfectamente
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      map.remove();
    };
  }, []);

  // Alternar entre Vista Satelital 3D y Vista de Calles
  const toggleMapStyle = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const nextSat = !isSatellite;
    setIsSatellite(nextSat);

    map.setLayoutProperty('satellite-layer', 'visibility', nextSat ? 'visible' : 'none');
    map.setLayoutProperty('hybrid-labels-layer', 'visibility', nextSat ? 'visible' : 'none');
    map.setLayoutProperty('streets-layer', 'visibility', nextSat ? 'none' : 'visible');
  };

  // Alternar rotación continua
  const toggleRotation = () => {
    setIsRotating((prev) => !prev);
  };

  // Actualizar marcador de casa
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

      marker.on('dragstart', () => setIsRotating(false));
      marker.on('dragend', () => {
        const p = marker.getLngLat();
        onPickRef.current({ lat: p.lat, lng: p.lng });
      });
      homeRef.current = marker;
    } else {
      homeRef.current.setLngLat([value.lng, value.lat]);
    }
  }, [value]);

  // Actualizar trazado de la ruta y encuadrar
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
          padding: { top: 60, bottom: 40, left: 40, right: 40 },
          pitch: 54,
          duration: 800,
          maxZoom: 16,
        });
      }
    };

    if (map.isStyleLoaded() && map.getSource('route')) apply();
    else map.once('idle', apply);
  }, [route]);

  // Coordenadas actuales para link a Google Maps Satelital
  const currentCoords = value || RESTAURANT_INFO.location;
  const gMapsUrl = googleSatelliteUrl(currentCoords.lat, currentCoords.lng);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Contenedor del Mapa MapLibre 3D */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Controles Flotantes Superiores: Conmutador Satelital y Rotación 3D */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-wrap items-center gap-1.5 pointer-events-auto">
        {/* Botón de Giro 3D */}
        <button
          type="button"
          onClick={toggleRotation}
          title={isRotating ? 'Pausar giro automático' : 'Reanudar rotación 3D'}
          className={`px-2.5 py-1 rounded-xl border-2 border-cartoon-ink font-sub font-bold text-[11px] sm:text-xs flex items-center gap-1.5 shadow-cartoon-sm transition-transform active:scale-95 cursor-pointer ${
            isRotating
              ? 'bg-cartoon-yellow text-cartoon-ink'
              : 'bg-white text-cartoon-ink hover:bg-cartoon-cream'
          }`}
        >
          <span className={`inline-block text-xs ${isRotating ? 'animate-spin' : ''}`}>🔄</span>
          <span>{isRotating ? 'Girando 3D' : 'Pausado'}</span>
        </button>

        {/* Conmutador Satelital / Calles */}
        <button
          type="button"
          onClick={toggleMapStyle}
          className="px-2.5 py-1 rounded-xl bg-white hover:bg-cartoon-cream-dark border-2 border-cartoon-ink font-sub font-bold text-[11px] sm:text-xs text-cartoon-ink flex items-center gap-1 shadow-cartoon-sm transition-transform active:scale-95 cursor-pointer"
        >
          <span>{isSatellite ? '🛰️ Satélite' : '🗺️ Calles'}</span>
        </button>
      </div>

      {/* Enlace directo a Google Maps Satelital Oficial en la esquina inferior */}
      <div className="absolute bottom-2 left-2.5 z-10 pointer-events-auto">
        <a
          href={gMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-0.5 rounded-lg bg-cartoon-ink/80 hover:bg-cartoon-ink text-white font-sub font-bold text-[10px] flex items-center gap-1 border border-white/30 shadow-sm backdrop-blur-xs transition-colors"
          title="Ver ubicación en Google Maps Satelital"
        >
          <span>Google Maps Satelital ↗</span>
        </a>
      </div>
    </div>
  );
}
