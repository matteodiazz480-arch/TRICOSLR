import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { RESTAURANT_INFO } from '../data/products';
import { isFreeDelivery, priceForKm, reverseAddress, routeFromStore, searchAddress } from '../lib/delivery';

const DeliveryMap = lazy(() => import('./DeliveryMap'));

const money = (n) => `$${n.toLocaleString('es-AR')}`;

/**
 * Selector de domicilio: buscador + "mi ubicación" + mapa 3D.
 * Devuelve por onChange: { lat, lng, km, fee, approx, address } o null.
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
  const missing = Math.max(0, RESTAURANT_INFO.freeDeliveryThreshold - subtotal);

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

  // Buscador con debounce (Nominatim pide máx. 1 consulta por segundo)
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
    <div className="space-y-2.5">
      {/* Buscador + Mi ubicación */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cartoon-ink/50 flex items-center pointer-events-none">
            <Icon name="search" size={18} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá tu calle y número"
            className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-white border-3 border-cartoon-ink font-sub text-sm text-cartoon-ink focus:outline-none shadow-cartoon-sm"
          />
          {(results.length > 0 || searching) && (
            <ul className="absolute z-30 left-0 right-0 mt-1.5 bg-white border-3 border-cartoon-ink rounded-2xl shadow-cartoon overflow-hidden animate-modalIn">
              {searching && results.length === 0 && (
                <li className="px-3.5 py-2.5 font-sub text-xs text-cartoon-ink/60">Buscando…</li>
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
                    className="w-full text-left px-3.5 py-2.5 font-sub text-sm text-cartoon-ink hover:bg-cartoon-yellow-light flex items-center gap-2 border-b border-cartoon-ink/10 last:border-0 cursor-pointer"
                  >
                    <Icon name="location_on" size={16} className="text-cartoon-red flex-shrink-0" />
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
          title="Usar mi ubicación"
          aria-label="Usar mi ubicación"
          className="w-11 flex-shrink-0 rounded-2xl bg-cartoon-yellow border-3 border-cartoon-ink shadow-cartoon-sm flex items-center justify-center text-cartoon-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer transition-transform duration-150"
        >
          <Icon name="my_location" size={20} />
        </button>
      </div>

      {geoError && <p className="text-xs font-sub font-bold text-cartoon-red">{geoError}</p>}

      {/* Mapa 3D */}
      <div
        className={`relative h-64 sm:h-72 rounded-3xl border-3 overflow-hidden shadow-cartoon bg-cartoon-cream-dark ${
          error ? 'border-cartoon-red' : 'border-cartoon-ink'
        }`}
      >
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center font-sub font-bold text-sm text-cartoon-ink/60">
              Cargando mapa…
            </div>
          }
        >
          <DeliveryMap value={point} route={route} onPick={setPoint} />
        </Suspense>

        {!point && (
          <div className="absolute left-1/2 bottom-3 -translate-x-1/2 pointer-events-none bg-cartoon-ink text-white font-sub font-bold text-xs px-3.5 py-2 rounded-full whitespace-nowrap shadow-cartoon-sm">
            Tocá el mapa donde está tu casa
          </div>
        )}
      </div>

      {/* Resultado: distancia y costo */}
      {point && (
        <div className="bg-white rounded-2xl border-3 border-cartoon-ink shadow-cartoon-sm p-3 flex items-center gap-3 animate-modalIn">
          <div className="w-11 h-11 rounded-xl bg-cartoon-yellow border-2 border-cartoon-ink flex items-center justify-center flex-shrink-0">
            <Icon name="two_wheeler" size={22} className="text-cartoon-ink" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm text-cartoon-ink truncate">
              {loading ? 'Calculando recorrido…' : value?.address || 'Ubicación marcada'}
            </p>
            {!loading && value && (
              <p className="font-sub font-bold text-xs text-cartoon-ink/60">
                {value.approx ? '≈ ' : ''}
                {value.km.toFixed(1).replace('.', ',')} km desde el local
              </p>
            )}
          </div>
          {!loading && value && (
            <div className="text-right flex-shrink-0">
              {free ? (
                <>
                  <span className="block font-sub text-xs text-cartoon-ink/40 line-through">{money(value.fee)}</span>
                  <span className="block font-display text-lg text-cartoon-green-dark leading-none">GRATIS</span>
                </>
              ) : (
                <span className="block font-display text-lg text-cartoon-ink">{money(value.fee)}</span>
              )}
            </div>
          )}
        </div>
      )}

      {point && !free && missing > 0 && (
        <p className="font-sub font-bold text-xs text-cartoon-ink/70 text-center">
          Sumá <span className="text-cartoon-red">{money(missing)}</span> más y el envío es gratis
        </p>
      )}

      {error && <p className="text-xs font-sub font-bold text-cartoon-red">{error}</p>}
    </div>
  );
};
