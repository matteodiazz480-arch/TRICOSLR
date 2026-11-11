import React, { useEffect, useRef } from 'react';
import { RESTAURANT_INFO } from '../data/products';
import { loadGoogleMaps } from '../lib/googleMaps';

export default function DeliveryMap({ value, route, onPick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const storeMarkerRef = useRef(null);
  const homeMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    let isMounted = true;
    const store = RESTAURANT_INFO.location;

    loadGoogleMaps()
      .then((maps) => {
        if (!isMounted || !containerRef.current) return;

        // Mapa Google Roadmap Cenital: muestra calles, casas, edificios y nombres de negocios
        const map = new maps.Map(containerRef.current, {
          center: { lat: store.lat, lng: store.lng },
          zoom: 16.5,
          mapTypeId: 'roadmap',
          disableDefaultUI: true,
          gestureHandling: 'greedy', // Scroll y arrastre fluido en celulares y PC
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            // Estilo nítido y moderno con calles, casas y negocios destacados
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

        // 1. Marcador del Local Trico's con EL PERSONAJE (no con un auto)
        const storeOverlay = new maps.OverlayView();
        storeOverlay.onAdd = function () {
          const div = document.createElement('div');
          div.style.position = 'absolute';
          div.style.transform = 'translate(-50%, -100%)';
          div.style.zIndex = '50';
          div.style.pointerEvents = 'auto';
          div.style.cursor = 'pointer';
          div.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4)); select:none;">
              <div style="background:#FFC93C; color:#1E1B18; font-family:'Lilita One',cursive; font-size:12px; padding:3px 10px; border-radius:12px; border:2px solid #1E1B18; box-shadow:0 3px 6px rgba(0,0,0,0.3); white-space:nowrap; margin-bottom:2px;">
                🍗 LOCAL TRICO'S
              </div>
              <div style="width:52px; height:58px;">
                <img src="/assets/sticker_personaje.png" alt="Trico's" style="width:100%; height:100%; object-fit:contain; display:block;" />
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
          const pos = overlayProjection.fromLatLngToDivPixel(
            new maps.LatLng(store.lat, store.lng)
          );
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

        // Clic en cualquier punto del mapa para seleccionar casa
        map.addListener('click', (e) => {
          if (!e.latLng) return;
          onPickRef.current({
            lat: e.latLng.lat(),
            lng: e.latLng.lng(),
          });
        });
      })
      .catch((err) => {
        console.warn('Error iniciando mapa de Google:', err);
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

  // Actualizar marcador de la casa del cliente (Sin marcar ningún recorrido/línea)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google || !window.google.maps) return;
    const maps = window.google.maps;

    if (!value) {
      if (homeMarkerRef.current) {
        homeMarkerRef.current.setMap(null);
        homeMarkerRef.current = null;
      }
      return;
    }

    if (!homeMarkerRef.current) {
      // Crear overlay personalizado para el domicilio del cliente
      const homeOverlay = new maps.OverlayView();
      homeOverlay.latLng = new maps.LatLng(value.lat, value.lng);

      homeOverlay.onAdd = function () {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.transform = 'translate(-50%, -100%)';
        div.style.zIndex = '60';
        div.style.cursor = 'grab';
        div.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 6px 10px rgba(0,0,0,0.5));">
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

      // Centrar suavemente en la casa seleccionada
      map.panTo(new maps.LatLng(value.lat, value.lng));
    } else {
      homeMarkerRef.current.setPosition(value.lat, value.lng);
      map.panTo(new maps.LatLng(value.lat, value.lng));
    }
  }, [value]);

  // Recorrido desde el local hasta la casa del cliente
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google || !window.google.maps) return;
    const maps = window.google.maps;
    if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
      routeLineRef.current = null;
    }
    if (!value || !route || !route.coordinates || route.coordinates.length < 2) return;
    const path = route.coordinates.map(([lng, lat]) => ({ lat, lng }));
    routeLineRef.current = new maps.Polyline({
      path,
      strokeColor: '#111111',
      strokeOpacity: 1,
      strokeWeight: 5,
      geodesic: false,
      map,
    });
    const bounds = new maps.LatLngBounds();
    path.forEach((pt) => bounds.extend(pt));
    map.fitBounds(bounds, { top: 140, bottom: 70, left: 50, right: 50 });
  }, [route, value]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
