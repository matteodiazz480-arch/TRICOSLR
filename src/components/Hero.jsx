import React from 'react';
import { Icon } from './Icon';
import { Reveal } from './Reveal';

export const Hero = ({ onOpenCart }) => {
  return (
    <section
      className="relative overflow-hidden pt-8 pb-12 sm:pt-14 sm:pb-18 md:pt-16 md:pb-22"
      style={{ backgroundColor: '#FFC93C' }}
    >
      {/* Trama sutil cómic de fondo */}
      <div className="absolute inset-0 bg-comic-dots pointer-events-none"></div>

      <div className="max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 relative z-10">
        <Reveal yOffset={20}>
          {/* Contenedor Lado a Lado (Título + Personaje) tanto en Móvil como en PC */}
          <div className="flex flex-row items-center justify-between gap-3 sm:gap-8 md:gap-12 lg:gap-16">
            
            {/* Columna Izquierda: Título Desplazado para Respirar + Botones */}
            <div className="flex-1 flex flex-col items-start text-left min-w-0">
              <h1 className="font-display text-[26px] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-cartoon-ink tracking-tight flex flex-col items-start gap-2.5 sm:gap-4 md:gap-5 mb-6 sm:mb-10">
                <span className="block leading-none">
                  ¡COMIDA RICA,
                </span>
                <span className="inline-block bg-cartoon-red text-white px-3.5 sm:px-7 xl:px-9 py-1.5 sm:py-3 xl:py-4 my-0.5 rounded-xl sm:rounded-3xl border-2 sm:border-4 border-cartoon-ink shadow-cartoon sm:shadow-cartoon-lg leading-none">
                  CON ONDA
                </span>
                <span className="block leading-none">
                  Y SIN VUELTAS!
                </span>
              </h1>

              {/* Botones Principales */}
              <div className="flex flex-row flex-wrap items-center gap-2.5 sm:gap-4 xl:gap-5 w-full sm:w-auto">
                <a
                  href="#menu"
                  className="btn-cartoon-red text-xs sm:text-lg xl:text-xl py-2.5 px-4 sm:py-3.5 sm:px-8 xl:py-4 xl:px-10 flex items-center justify-center gap-1.5 sm:gap-2 shadow-cartoon"
                >
                  <span>Ver la Carta</span>
                  <Icon name="arrow_downward" size={18} />
                </a>

                <button
                  onClick={onOpenCart}
                  className="btn-cartoon-white text-xs sm:text-lg xl:text-xl py-2.5 px-4 sm:py-3.5 sm:px-7 xl:py-4 xl:px-9 flex items-center justify-center gap-1.5 sm:gap-2 shadow-cartoon"
                >
                  <Icon name="shopping_bag" size={18} />
                  <span>Mi Pedido</span>
                </button>
              </div>
            </div>

            {/* Columna Derecha: Personaje al lado del título con tamaño equilibrado */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <img
                src="/assets/sticker_personaje.png"
                alt="Personaje Trico's"
                className="w-28 sm:w-44 md:w-56 lg:w-72 xl:w-84 2xl:w-96 h-auto object-contain select-none animate-bob filter drop-shadow-[0_10px_20px_rgba(30,27,24,0.18)]"
              />
            </div>

          </div>
        </Reveal>
      </div>
    </section>
  );
};
