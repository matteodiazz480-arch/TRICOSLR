import React from 'react';
import { RESTAURANT_INFO } from '../data/products';

const amount = `$${(RESTAURANT_INFO.freeDeliveryThreshold || 55000).toLocaleString('es-AR')}`;

const Chunk = () => (
  <div className="flex items-center gap-6 sm:gap-10 pr-6 sm:pr-10 flex-shrink-0">
    <span className="flex items-center gap-2 whitespace-nowrap">
      ENVÍO BONIFICADO DESDE <span className="text-amber-400 font-bold">{amount}</span>
    </span>
    <span aria-hidden="true" className="text-slate-600">•</span>
    <span className="flex items-center gap-2 whitespace-nowrap">
      SMASH BURGERS PREMIUM
    </span>
    <span aria-hidden="true" className="text-slate-600">•</span>
    <span className="flex items-center gap-2 whitespace-nowrap">
      POLLO FRITO EXTRA CRUNCH
    </span>
    <span aria-hidden="true" className="text-slate-600">•</span>
    <span className="flex items-center gap-2 whitespace-nowrap">
      PEDIDOS DIRECTOS A WHATSAPP
    </span>
    <span aria-hidden="true" className="text-slate-600">•</span>
  </div>
);

export const BrandRibbon = () => (
  <div className="relative overflow-hidden bg-slate-900 border-y border-slate-800">
    <div
      role="note"
      aria-label={`Envío bonificado desde ${amount}`}
    >
      <div className="ribbon-marquee flex flex-nowrap w-max py-2.5 sm:py-3 font-display text-xs sm:text-sm text-white tracking-wider pointer-events-none select-none uppercase">
        {Array.from({ length: 8 }).map((_, i) => (
          <Chunk key={i} />
        ))}
      </div>
    </div>
  </div>
);
