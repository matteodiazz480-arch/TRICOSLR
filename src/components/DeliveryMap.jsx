import React, { useEffect, useRef, useState } from 'react';
import { RESTAURANT_INFO } from '../data/products';
import { loadGoogleMaps } from '../lib/googleMaps';
import { Icon } from './Icon';

export default function DeliveryMap({ value, onPick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const storeMarkerRef = useRef(null);
  const homeMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const store = RESTAURANT_INFO.location || { lat: -29.39997, lng: -66.86316 };

    loadGoogleMaps()
      .then((maps) => {
        if (!isMounted || !containerRef.current) return;

        const initialCenter =
          value && value.lat != null && value.lng != null
            ? { lat: Number(value.lat), lng: Number(value.lng) }
            : store;

        const map = new maps.Map(containerRef.current, {
          center: initialCenter,
          zoom: 15.5,
          mapTypeId: 'roadmap',
          disableDefaultUI: true,
          clickableIcons: false, // Evita que los comercios del mapa intercepten el clic del cliente
          gestureHandling: 'greedy',
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;

        // Marcador del Local Trico's
        const storeMarker = new maps.Marker({
          position: store,
          map,
          title: "Local Trico's",
          clickable: false,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#0F172A',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
          },
          label: {
            text: "TRICO'S",
            color: '#0F172A',
            fontSize: '11px',
            fontWeight: '800',
            className: 'bg-white px-1.5 py-0.5 rounded border border-slate-300 shadow-xs -mt-8',
          },
        });
        storeMarkerRef.current = storeMarker;

        // Un solo clic en cualquier parte del mapa marca el destino
        map.addListener('click', (e) => {
          if (!e.latLng) return;
          if (typeof onPickRef.current === 'function') {
            onPickRef.current({
              lat: e.latLng.lat(),
              lng: e.latLng.lng(),
            });
          }
        });

        setMapLoaded(true);
      })
      .catch((err) => {
        console.warn('Error iniciando Google Maps:', err);
        if (isMounted) {
          setLoadError('No se pudo cargar el mapa interactivo.');
        }
      });

    return () => {
      isMounted = false;
      if (storeMarkerRef.current) {
        storeMarkerRef.current.setMap(null);
        storeMarkerRef.current = null;
      }
      if (homeMarkerRef.current) {
        homeMarkerRef.current.setMap(null);
        homeMarkerRef.current = null;
      }
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }
      mapRef.current = null;
    };
  }, []);

  // Actualizar marcador de destino y trazar el recorrido desde el local
  useEffect(() => {
    const map = mapRef.current;
    if (!mapLoaded || !map || !window.google || !window.google.maps) return;
    const maps = window.google.maps;
    const store = RESTAURANT_INFO.location || { lat: -29.39997, lng: -66.86316 };

    if (!value || value.lat == null || value.lng == null) {
      if (homeMarkerRef.current) {
        homeMarkerRef.current.setMap(null);
        homeMarkerRef.current = null;
      }
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }
      setRouteInfo(null);
      return;
    }

    const destPos = { lat: Number(value.lat), lng: Number(value.lng) };

    // Crear o mover el marcador de destino (arrastrable para ajuste fino en un paso)
    if (!homeMarkerRef.current) {
      const marker = new maps.Marker({
        position: destPos,
        map,
        draggable: true,
        title: 'Ubicación de entrega',
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#E11D48',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
      });

      marker.addListener('dragend', (e) => {
        if (!e.latLng) return;
        if (typeof onPickRef.current === 'function') {
          onPickRef.current({
            lat: e.latLng.lat(),
            lng: e.latLng.lng(),
          });
        }
      });

      homeMarkerRef.current = marker;
    } else {
      homeMarkerRef.current.setPosition(destPos);
    }

    // Dibujar línea inmediata de recorrido y luego refinar por calles reales (OSRM)
    if (!routePolylineRef.current) {
      routePolylineRef.current = new maps.Polyline({
        path: [store, destPos],
        geodesic: true,
        strokeColor: '#0F172A',
        strokeOpacity: 0.85,
        strokeWeight: 4,
        map,
      });
    } else {
      routePolylineRef.current.setPath([store, destPos]);
    }

    const ctrl = new AbortController();
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${store.lng},${store.lat};${destPos.lng},${destPos.lat}?overview=full&geometries=geojson`,
      { signal: ctrl.signal }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.routes && data.routes[0]) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
          if (routePolylineRef.current && coords.length > 1) {
            routePolylineRef.current.setPath(coords);
          }
          const distKm = (route.distance / 1000).toFixed(1);
          const durationMin = Math.max(3, Math.round(route.duration / 60));
          setRouteInfo({ distKm, durationMin });
        }
      })
      .catch(() => {});

    return () => ctrl.abort();
  }, [value, mapLoaded]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-100">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Indicador discreto del recorrido cuando hay ubicación seleccionada */}
      {routeInfo && value?.lat != null && (
        <div className="absolute top-3 left-3 z-20 bg-slate-900/90 backdrop-blur-xs text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 shadow-sm pointer-events-none">
          <Icon name="route" size={15} className="text-amber-400" />
          <span>Recorrido: {routeInfo.distKm} km</span>
        </div>
      )}

      {!mapLoaded && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 z-10 p-4 text-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mb-2" />
          <p className="font-sub text-xs font-medium text-slate-600">Cargando mapa...</p>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20 p-5 text-center">
          <p className="font-display text-sm text-slate-900 mb-1">No se pudo cargar el mapa</p>
          <p className="font-sub text-xs text-slate-500 max-w-xs mb-3">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-cartoon-primary text-xs py-1.5 px-4"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
