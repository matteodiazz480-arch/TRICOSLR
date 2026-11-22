import React, { useState, useEffect } from 'react';
import { subscribeToPromotions, DEFAULT_PROMOTIONS_DATA } from '../lib/promotionsStore';

const Chunk = ({ freeDelivery }) => {
  const isDeliveryActive = freeDelivery?.active !== false;
  const minAmount = Number(freeDelivery?.minAmount ?? 55000);

  return (
    <div className="flex items-center gap-6 sm:gap-10 pr-6 sm:pr-10 flex-shrink-0">
      {isDeliveryActive ? (
        minAmount === 0 ? (
          <span className="flex items-center gap-2.5 whitespace-nowrap">
            DELIVERY <span className="text-cartoon-yellow font-black">100% GRATIS</span> EN TUS PEDIDOS
          </span>
        ) : (
          <span className="flex items-center gap-2.5 whitespace-nowrap">
            DELIVERY GRATIS DESDE{' '}
            <span className="text-cartoon-yellow font-black">${minAmount.toLocaleString('es-AR')}</span>
          </span>
        )
      ) : (
        <span className="flex items-center gap-2.5 whitespace-nowrap">
          ENVÍOS A TODO <span className="text-cartoon-yellow font-black">LA RIOJA CAPITAL</span>
        </span>
      )}
      <span aria-hidden="true" className="text-cartoon-yellow">★</span>
      <span className="flex items-center gap-2.5 whitespace-nowrap">
        SMASH BURGERS PREMIUM
      </span>
      <span aria-hidden="true" className="text-cartoon-yellow">★</span>
      <span className="flex items-center gap-2.5 whitespace-nowrap">
        POLLO FRITO EXTRA CRUNCH
      </span>
      <span aria-hidden="true" className="text-cartoon-yellow">★</span>
      <span className="flex items-center gap-2.5 whitespace-nowrap">
        PEDIDOS DIRECTOS A WHATSAPP
      </span>
      <span aria-hidden="true" className="text-cartoon-yellow">★</span>
    </div>
  );
};

/**
 * Cinta continua animada (scroll infinito) estilo neo-brutalismo.
 * Promociona dinámicamente el beneficio de delivery gratis y puntos fuertes de TRICO'S.
 */
export const BrandRibbon = () => {
  const [promoData, setPromoData] = useState(DEFAULT_PROMOTIONS_DATA);

  useEffect(() => {
    const unsub = subscribeToPromotions((data) => {
      if (data) setPromoData(data);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const freeDelivery = promoData?.freeDelivery || DEFAULT_PROMOTIONS_DATA.freeDelivery;
  const isDeliveryActive = freeDelivery?.active !== false;
  const minAmount = Number(freeDelivery?.minAmount ?? 55000);
  const ariaText = isDeliveryActive
    ? minAmount === 0
      ? 'Delivery 100% gratis en tus pedidos'
      : `Delivery gratis desde $${minAmount.toLocaleString('es-AR')}`
    : 'Envíos a todo La Rioja Capital';

  return (
    <div className="relative overflow-hidden py-8 sm:py-10 md:py-12 my-1 sm:my-2" style={{ backgroundColor: '#FFFDF6' }}>
      <div
        role="note"
        aria-label={ariaText}
        className="relative -rotate-1 sm:-rotate-1.5 md:-rotate-2 -mx-4 bg-cartoon-red border-y-3 sm:border-y-4 border-cartoon-ink shadow-cartoon"
      >
        <div className="ribbon-marquee flex flex-nowrap w-max py-2.5 sm:py-3.5 font-display text-lg sm:text-2xl text-white tracking-wide pointer-events-none select-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <Chunk key={i} freeDelivery={freeDelivery} />
          ))}
        </div>
      </div>
    </div>
  );
};
