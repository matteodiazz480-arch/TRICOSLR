import React from 'react';
import { RESTAURANT_INFO } from '../data/products';

const amount = `$${(RESTAURANT_INFO.freeDeliveryThreshold || 55000).toLocaleString('es-AR')}`;

const Chunk = () => (
  <div className="flex items-center gap-6 sm:gap-10 pr-6 sm:pr-10 flex-shrink-0">
    <span className="flex items-center gap-2.5 whitespace-nowrap">
      DELIVERY GRATIS DESDE <span className="text-cartoon-yellow font-black">{amount}</span>
    </span>
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

/**
 * Cinta continua animada (scroll infinito) estilo neo-brutalismo.
 * Promociona el beneficio de delivery gratis desde $55.000 y puntos fuertes de TRICO'S.
 */
export const BrandRibbon = () => (
  <div className="relative overflow-hidden py-8 sm:py-10 md:py-12 my-1 sm:my-2" style={{ backgroundColor: '#FFFDF6' }}>
    <div
      role="note"
      aria-label={`Delivery gratis desde ${amount}`}
      className="relative -rotate-1 sm:-rotate-1.5 md:-rotate-2 -mx-4 bg-cartoon-red border-y-3 sm:border-y-4 border-cartoon-ink shadow-cartoon"
    >
      <div className="ribbon-marquee flex flex-nowrap w-max py-2.5 sm:py-3.5 font-display text-lg sm:text-2xl text-white tracking-wide pointer-events-none select-none">
        {Array.from({ length: 8 }).map((_, i) => (
          <Chunk key={i} />
        ))}
      </div>
    </div>
  </div>
);
