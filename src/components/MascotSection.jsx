import React from 'react';
import { Reveal } from './Reveal';

const MARQUEE_IMAGES = [
  '/assets/_MG_9374.jpg',
  '/assets/_MG_9375.jpg',
  '/assets/_MG_9396.jpg',
  '/assets/_MG_9453.jpg',
  '/assets/_MG_9465.jpg',
];

export const MascotSection = () => {
  return (
    <section
      id="personaje"
      className="relative w-full overflow-hidden select-none bg-slate-900 border-t border-slate-800"
    >
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-900">
        <div className="animate-photo-marquee h-full">
          {[...MARQUEE_IMAGES, ...MARQUEE_IMAGES, ...MARQUEE_IMAGES, ...MARQUEE_IMAGES].map((src, index) => (
            <div
              key={index}
              className="h-full w-[260px] sm:w-[360px] md:w-[440px] flex-shrink-0 overflow-hidden border-r border-slate-900/50"
            >
              <img
                src={src}
                alt={`Galería Trico's ${(index % MARQUEE_IMAGES.length) + 1}`}
                className="w-full h-full object-cover object-center pointer-events-none select-none opacity-45"
                loading="eager"
                decoding="async"
              />
            </div>
          ))}
        </div>
      </div>

      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.80) 50%, rgba(15,23,42,0.92) 100%)',
        }}
      />

      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <Reveal>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
            <div className="flex-shrink-0 flex justify-center items-center">
              <div className="w-32 h-32 sm:w-44 sm:h-44 relative flex items-center justify-center">
                <img
                  src="/assets/sticker_personaje.png"
                  alt="Trico's"
                  className="w-full h-full object-contain select-none"
                />
              </div>
            </div>

            <div className="text-center md:text-left max-w-xl">
              <span className="font-sub font-semibold text-xs text-amber-400 uppercase tracking-widest block mb-2">
                Nuestra Cocina
              </span>
              <h2 className="font-display text-2xl sm:text-4xl text-white mb-3 tracking-tight leading-tight">
                El Sello del Verdadero Crunch
              </h2>
              <p className="font-sub text-sm sm:text-base text-slate-300 leading-relaxed">
                Combinamos pollo frito con un rebozado dorado crujiente y smash burgers de carne seleccionada con pan brioche artesanal. Todo preparado en el momento.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
