import React from 'react';
import { RESTAURANT_INFO } from '../data/products';

const amount = `$${RESTAURANT_INFO.freeDeliveryThreshold.toLocaleString('es-AR')}`;

const Chunk = () => (
  <div className="flex items-center gap-6 sm:gap-10 pr-6 sm:pr-10 flex-shrink-0">
    <span className="flex items-center gap-2.5 whitespace-nowrap">
      <span aria-hidden="true">🛵</span>
      DELIVERY GRATIS DESDE <span className="text-cartoon-yellow">{amount}</span>
    </span>
    <span aria-hidden="true" className="text-cartoon-yellow">★</span>
  </div>
);

/**
 * Cinta inclinada tipo "cartel" con el beneficio de envío gratis.
 * Llamativa pero fuera del camino: no es sticky ni popup.
 */
export const FreeDeliveryRibbon = () => (
  <div className="relative overflow-hidden py-6 sm:py-8 -mb-2" style={{ backgroundColor: '#FFFDF6' }}>
    <div
      role="note"
      aria-label={`Delivery gratis desde ${amount}`}
      className="relative -rotate-2 -mx-4 bg-cartoon-red border-y-3 border-cartoon-ink shadow-cartoon"
    >
      <div className="ribbon-marquee flex w-max py-2.5 sm:py-3 font-display text-lg sm:text-2xl text-white tracking-wide">
        {Array.from({ length: 8 }).map((_, i) => (
          <Chunk key={i} />
        ))}
      </div>
    </div>
  </div>
);
