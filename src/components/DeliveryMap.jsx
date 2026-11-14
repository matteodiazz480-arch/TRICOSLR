import React, { useEffect, useRef, useState } from 'react';
import { RESTAURANT_INFO } from '../data/products';
import { loadGoogleMaps } from '../lib/googleMaps';

export default function DeliveryMap({ value, onPick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const storeMarkerRef = useRef(null);
  const homeMarkerRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const store = RESTAURANT_INFO.location || { lat: -29.39997, lng: -66.86316 };

    loadGoogleMaps()
      .then((maps) => {
        if (!isMounted || !containerRef.current) return;

        // Configuración de Google Maps para interacción fluida en móviles y escritorios
        const initialCenter = value && value.lat && value.lng ? { lat: value.lat, lng: value.lng } : store;
        const map = new maps.Map(containerRef.current, {
          center: initialCenter,
          zoom: 16.5,
          mapTypeId: 'roadmap',
          disableDefaultUI: true,
          gestureHandling: 'greedy', // Habilita arrastre con un solo dedo en celular
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: 'poi.business',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#1E1B18' }],
            },
            {
              featureType: 'poi.business',
              elementType: 'labels.icon',
              stylers: [{ visibility: 'on' }],
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ visibility: 'on' }],
            },
            {
              featureType: 'road',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#1E1B18' }, { weight: 1.5 }],
            },
          ],
        });
        mapRef.current = map;

        // 1. Marcador del Local Trico's con personaje y badge cartoon
        const storeOverlay = new maps.OverlayView();
        storeOverlay.onAdd = function () {
          const div = document.createElement('div');
          div.style.position = 'absolute';
          div.style.transform = 'translate(-50%, -100%)';
          div.style.zIndex = '50';
          div.style.pointerEvents = 'auto';
          div.style.cursor = 'pointer';
          div.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4)); user-select:none;">
              <div style="background:#FFC93C; color:#1E1B18; font-family:'Lilita One',cursive; font-size:12px; padding:3px 10px; border-radius:12px; border:2px solid #1E1B18; box-shadow:0 3px 6px rgba(0,0,0,0.3); white-space:nowrap; margin-bottom:2px;">
                🍗 LOCAL TRICO'S
              </div>
              <div style="width:50px; height:56px;">
                <img src="/assets/sticker_personaje.png" alt="Trico's" style="width:100%; height:100%; object-fit:contain; display:block;" onerror="this.src='/assets/logo.svg'" />
              </div>
            </div>
          `;
          this.div = div;
          const panes = this.getPanes();
          panes.overlayMouseTarget.appendChild(div);
        };
        storeOverlay.draw = function () {
          const overlayProjection = this.getProjection();
          if (!overlayProjection || !this.div) return;
          const pos = overlayProjection.fromLatLngToDivPixel(new maps.LatLng(store.lat, store.lng));
          this.div.style.left = pos.x + 'px';
          this.div.style.top = pos.y + 'px';
        };
        storeOverlay.onRemove = function () {
          if (this.div && this.div.parentNode) {
            this.div.parentNode.removeChild(this.div);
            this.div = null;
          }
        };
        storeOverlay.setMap(map);
        storeMarkerRef.current = storeOverlay;

        // Clic en cualquier punto del mapa para colocar/mover el pin de la casa
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
          setLoadError('No se pudo cargar el mapa de Google. Podés tocar el botón de reintentar.');
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
      mapRef.current = null;
    };
  }, []);

  // Actualizar la posición del marcador "Tu Casa" al cambiar value
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google || !window.google.maps) return;
    const maps = window.google.maps;

    if (!value || value.lat == null || value.lng == null) {
      if (homeMarkerRef.current) {
        homeMarkerRef.current.setMap(null);
        homeMarkerRef.current = null;
      }
      return;
    }

    if (!homeMarkerRef.current) {
      const homeOverlay = new maps.OverlayView();
      homeOverlay.latLng = new maps.LatLng(value.lat, value.lng);

      homeOverlay.onAdd = function () {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.transform = 'translate(-50%, -100%)';
        div.style.zIndex = '60';
        div.style.cursor = 'grab';
        div.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 6px 10px rgba(0,0,0,0.5)); user-select:none;">
            <div style="background:#FF4757; color:#FFFFFF; font-family:'Fredoka',sans-serif; font-weight:800; font-size:12px; padding:3px 10px; border-radius:12px; border:2.5px solid #1E1B18; white-space:nowrap; margin-bottom:2px; box-shadow:0 3px 6px rgba(0,0,0,0.3);">
              📍 Tu Casa
            </div>
            <div style="width:34px; height:34px; background:#FF4757; border:3px solid #1E1B18; border-radius:50% 50% 50% 0; transform:rotate(-45deg); display:flex; align-items:center; justify-content:center;">
              <div style="width:12px; height:12px; background:#FFFFFF; border-radius:50%;"></div>
            </div>
          </div>
        `;
        this.div = div;
        const panes = this.getPanes();
        panes.overlayMouseTarget.appendChild(div);
      };

      homeOverlay.draw = function () {
        const overlayProjection = this.getProjection();
        if (!overlayProjection || !this.div) return;
        const pos = overlayProjection.fromLatLngToDivPixel(this.latLng);
        this.div.style.left = pos.x + 'px';
        this.div.style.top = pos.y + 'px';
      };

      homeOverlay.onRemove = function () {
        if (this.div && this.div.parentNode) {
          this.div.parentNode.removeChild(this.div);
          this.div = null;
        }
      };

      homeOverlay.setPosition = function (lat, lng) {
        this.latLng = new maps.LatLng(lat, lng);
        this.draw();
      };

      homeOverlay.setMap(map);
      homeMarkerRef.current = homeOverlay;

      map.panTo(new maps.LatLng(value.lat, value.lng));
    } else {
      homeMarkerRef.current.setPosition(value.lat, value.lng);
      map.panTo(new maps.LatLng(value.lat, value.lng));
    }
  }, [value]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-cartoon-cream-dark">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {!mapLoaded && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-cartoon-cream/90 backdrop-blur-xs z-10 p-4 text-center">
          <div className="w-10 h-10 border-3 border-cartoon-yellow border-t-cartoon-red rounded-full animate-spin mb-3" />
          <p className="font-display text-sm text-cartoon-ink">Cargando mapa interactivo...</p>
          <span className="font-sub text-xs text-cartoon-ink/60 mt-1">Podrás marcar tu casa en segundos</span>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 z-20 p-5 text-center">
          <span className="text-3xl mb-2">🗺️</span>
          <p className="font-display text-sm text-cartoon-red mb-1">Aviso con el mapa</p>
          <p className="font-sub text-xs text-cartoon-ink/70 max-w-xs mb-3">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-cartoon-primary text-xs py-1.5 px-4"
          >
            Recargar
          </button>
        </div>
      )}
    </div>
  );
}
