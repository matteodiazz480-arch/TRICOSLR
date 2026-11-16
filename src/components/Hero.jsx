import React from 'react';
import { Icon } from './Icon';
import { Reveal } from './Reveal';

export const Hero = ({ onOpenCart }) => {
  return (
    <section className="relative overflow-hidden bg-slate-900 text-white py-12 sm:py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Reveal yOffset={16}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
            <div className="flex-1 flex flex-col items-start text-left min-w-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-sub font-semibold text-xs uppercase tracking-wider mb-4">
                Calidad Artesanal • La Rioja
              </span>

              <h1 className="font-display text-3xl sm:text-5xl md:text-6xl text-white tracking-tight leading-[1.08] mb-4">
                Smash Burgers &{' '}
                <span className="text-amber-400">Pollo Frito Crunch</span>
              </h1>

              <p className="font-sub text-sm sm:text-base text-slate-300 max-w-lg mb-7 leading-relaxed">
                Preparadas en el momento con pan brioche artesanal, medallones de tapa de asado seleccionada y nuestro rebozado exclusivo.
              </p>

              <div className="flex flex-row flex-wrap items-center gap-3 w-full sm:w-auto">
                <a
                  href="#menu"
                  className="btn-cartoon-red text-xs sm:text-sm py-3 px-6"
                >
                  <span>Explorar la Carta</span>
                  <Icon name="arrow_downward" size={16} />
                </a>

                <button
                  onClick={onOpenCart}
                  className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 font-sub font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Icon name="shopping_bag" size={16} />
                  <span>Ver mi pedido</span>
                </button>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-center">
              <img
                src="/assets/sticker_personaje.png"
                alt="Trico's"
                className="w-36 sm:w-48 md:w-56 h-auto object-contain select-none"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
