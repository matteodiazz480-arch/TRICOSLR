import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { RESTAURANT_INFO } from '../data/products';
import { isFreeDelivery, priceForKm, reverseAddress, routeFromStore, searchAddress } from '../lib/delivery';

const DeliveryMap = lazy(() => import('./DeliveryMap'));

const money = (n) => `$${n.toLocaleString('es-AR')}`;

/**
 * Selector de domicilio estilo Uber:
 * Buscador de calles + mapa cenital despejado + resumen limpio y espacioso.
 */
export const DeliveryLocationPicker = ({ subtotal, value, onChange, error }) => {
  const [point, setPoint] = useState(value ? { lat: value.lat, lng: value.lng } : null);
  const [route, setRoute] = useState(value?.route || null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [geoError, setGeoError] = useState('');
  const abortRef = useRef(null);
  const free = isFreeDelivery(subtotal);

  // Calcular recorrido y precio cada vez que cambia el punto
  useEffect(() => {
    if (!point) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    Promise.all([routeFromStore(point, ctrl.signal), reverseAddress(point, ctrl.signal)])
      .then(([r, address]) => {
        setRoute(r.geometry);
        onChange({
          lat: point.lat,
          lng: point.lng,
          km: r.km,
          fee: priceForKm(r.km),
          approx: r.approx,
          address,
          route: r.geometry,
        });
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point]);

  // Buscador con debounce
  useEffect(() => {
    const q = query.trim();
    if (q.length < 4) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setSearching(true);
      searchAddress(q, ctrl.signal)
        .then(setResults)
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 650);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const useMyLocation = () => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no permite compartir ubicación.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError('No pudimos acceder a tu ubicación. Marcala en el mapa.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
      {/* Buscador + Mi ubicación */}
      <div className="flex gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cartoon-ink/50 flex items-center pointer-events-none">
            <Icon name="search" size={17} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá tu calle y número…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border-2 sm:border-3 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-sm"
          />
          {(results.length > 0 || searching) && (
            <ul className="absolute z-30 left-0 right-0 mt-1.5 bg-white border-2 sm:border-3 border-cartoon-ink rounded-2xl shadow-cartoon overflow-hidden animate-modalIn max-h-48 overflow-y-auto">
              {searching && results.length === 0 && (
                <li className="px-3.5 py-2 font-sub text-xs text-cartoon-ink/60">Buscando calles…</li>
              )}
              {results.map((r, i) => (
                <li key={`${r.lat}-${r.lng}-${i}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setPoint({ lat: r.lat, lng: r.lng });
                      setQuery('');
                      setResults([]);
                    }}
                    className="w-full text-left px-3.5 py-2 font-sub text-xs sm:text-sm text-cartoon-ink hover:bg-cartoon-yellow-light flex items-center gap-2 border-b border-cartoon-ink/10 last:border-0 cursor-pointer"
                  >
                    <Icon name="location_on" size={15} className="text-cartoon-red flex-shrink-0" />
                    <span className="truncate">{r.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          title="Usar mi ubicación actual"
          aria-label="Usar mi ubicación"
          className="w-10 sm:w-11 flex-shrink-0 rounded-xl bg-cartoon-yellow border-2 sm:border-3 border-cartoon-ink shadow-cartoon-sm flex items-center justify-center text-cartoon-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer transition-transform duration-150"
        >
          <Icon name="my_location" size={18} />
        </button>
      </div>

      {geoError && <p className="text-[11px] font-sub font-bold text-cartoon-red flex-shrink-0">{geoError}</p>}

      {/* Mapa estilo Uber: ventana grande y cómoda para seleccionar tu casa */}
      <div
        className={`relative flex-1 min-h-[380px] sm:min-h-[460px] rounded-2xl border-2 sm:border-3 overflow-hidden shadow-cartoon-sm bg-cartoon-cream-dark ${
          error ? 'border-cartoon-red' : 'border-cartoon-ink'
        }`}
      >
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center font-sub font-bold text-xs text-cartoon-ink/60">
              Cargando mapa…
            </div>
          }
        >
          <DeliveryMap value={point} route={route} onPick={setPoint} />
        </Suspense>

        {loading && (
          <div className="absolute inset-x-0 top-3 flex justify-center pointer-events-none z-20">
            <div className="bg-white/95 border-2 border-cartoon-ink text-cartoon-ink font-sub font-bold text-xs px-3.5 py-1.5 rounded-full shadow-cartoon-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cartoon-yellow animate-ping" />
              <span>Calculando recorrido…</span>
            </div>
          </div>
        )}

        {!point && (
          <div className="absolute inset-x-0 bottom-3.5 flex justify-center pointer-events-none z-20">
            <div className="bg-cartoon-ink text-white font-sub font-bold text-xs sm:text-sm px-4 py-2 rounded-full whitespace-nowrap shadow-cartoon border-2 border-white/20 flex items-center gap-1.5 animate-bounce">
              <span>📍</span>
              <span>Tocá el mapa donde está tu casa</span>
            </div>
          </div>
        )}
      </div>

      {/* Tarjeta de Ubicación elegida: compacta y sin amontonar */}
      {point && (
        <div className="flex-shrink-0 bg-white rounded-xl border-2 border-cartoon-ink/40 p-2.5 flex items-center justify-between gap-2.5 animate-modalIn">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-cartoon-yellow border border-cartoon-ink flex items-center justify-center flex-shrink-0">
              <Icon name="location_on" size={15} className="text-cartoon-ink" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-xs text-cartoon-ink truncate leading-tight">
                {loading ? 'Calculando recorrido…' : value?.address || 'Ubicación seleccionada'}
              </p>
              <p className="font-sub font-bold text-[10px] text-cartoon-ink/70 flex items-center gap-1.5 mt-0.5">
                {value?.km != null && (
                  <span className="bg-cartoon-yellow border border-cartoon-ink/40 text-cartoon-ink px-1.5 py-0.2 rounded-md font-black">
                    {value.km.toFixed(1)} km
                  </span>
                )}
                <span>{free ? 'Envío gratis bonificado' : 'Envío a domicilio'}</span>
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            {free ? (
              <span className="font-display text-xs text-cartoon-green-dark">GRATIS</span>
            ) : (
              <span className="font-display text-sm text-cartoon-ink">{money(value?.fee || 0)}</span>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs font-sub font-bold text-cartoon-red text-center">{error}</p>}
    </div>
  );
};
