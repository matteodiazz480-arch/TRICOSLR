import React from 'react';
import { Reveal } from './Reveal';

const MARQUEE_IMAGES = [
  '/assets/_MG_9374.jpg',
  '/assets/_MG_9375.jpg',
  '/assets/_MG_9396.jpg',
  '/assets/_MG_9453.jpg',
  '/assets/_MG_9465.jpg',
];

export const MascotSection = ({
  topNeighborColor = '#FFF5D6',
  bottomNeighborColor = '#FFFDF6',
  strokeColor = '#1E1B18',
}) => {
  const wavePath =
    'M 0,60 C 120,16 240,16 360,60 C 480,104 600,104 720,60 C 840,16 960,16 1080,60 C 1200,104 1320,104 1440,60';

  return (
    <section
      id="personaje"
      className="relative w-full overflow-hidden select-none"
      style={{
        marginTop: '-1px',
        marginBottom: '-1px',
      }}
    >
      {/* 1. Fondo: Carrusel Infinito (Infinite CSS Marquee) con las fotos de /assets */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-cartoon-ink">
        <div className="animate-photo-marquee h-full">
          {[...MARQUEE_IMAGES, ...MARQUEE_IMAGES].map((src, index) => (
            <div
              key={index}
              className="h-full w-[260px] sm:w-[360px] md:w-[440px] flex-shrink-0 overflow-hidden border-r-2 border-cartoon-ink/40"
            >
              <img
                src={src}
                alt={`Galería Trico's ${(index % MARQUEE_IMAGES.length) + 1}`}
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Overlay oscuro para asegurar legibilidad total del texto y personaje */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(20,18,15,0.82) 0%, rgba(20,18,15,0.72) 50%, rgba(20,18,15,0.82) 100%)',
        }}
      />

      {/* 3. Máscara SVG Ondulada Superior: recorta las fotos en la línea negra superior */}
      <div className="absolute top-0 left-0 right-0 h-12 sm:h-16 md:h-20 z-20 pointer-events-none leading-[0]">
        <svg
          className="block w-full h-full"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Enmascara el exterior superior con el color exacto de la sección anterior */}
          <path
            d={`M 0,-2 L 1440,-2 L 1440,60 C 1320,104 1200,104 1080,60 C 960,16 840,16 720,60 C 600,104 480,104 360,60 C 240,16 120,16 0,60 Z`}
            fill={topNeighborColor}
          />
          {/* Línea negra ondulada superior */}
          <path
            d={wavePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="3.5"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* 4. Contenido Superpuesto: Personaje + Texto "El Sello del Verdadero Crunch" */}
      <div className="relative z-30 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 md:py-32">
        <Reveal>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-10 md:gap-12">
            
            {/* Personaje Sólido Aislado sobre el carrusel en movimiento */}
            <div className="flex-shrink-0 flex justify-center items-center">
              <div className="w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 relative flex items-center justify-center">
                <img
                  src="/assets/sticker_personaje.png"
                  alt="Personaje Trico's"
                  className="w-full h-full object-contain select-none animate-bob filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
                />
              </div>
            </div>

            {/* Texto Protagónico con Alto Contraste sobre el Overlay */}
            <div className="text-center md:text-left max-w-xl">
              <h2 className="font-display text-3xl sm:text-5xl text-cartoon-yellow mb-3 sm:mb-4 tracking-tight leading-tight drop-shadow-[3px_3px_0px_#1E1B18]">
                EL SELLO DEL VERDADERO CRUNCH
              </h2>
              
              <p className="font-sub text-sm sm:text-lg text-white/95 font-medium leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                En nuestra cocina combinamos lo mejor de dos mundos: pollo frito con un rebozado dorado ultra crujiente y smash burgers de carne 100% seleccionada con pan de papa suave. Preparado en el momento para que cada bocado tenga personalidad propia.
              </p>
            </div>

          </div>
        </Reveal>
      </div>

      {/* 5. Máscara SVG Ondulada Inferior: recorta las fotos en la línea negra inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-12 sm:h-16 md:h-20 z-20 pointer-events-none leading-[0]">
        <svg
          className="block w-full h-full"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Enmascara el exterior inferior con el color exacto de la sección siguiente */}
          <path
            d={`${wavePath} L 1440,122 L 0,122 Z`}
            fill={bottomNeighborColor}
          />
          {/* Línea negra ondulada inferior */}
          <path
            d={wavePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="3.5"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </section>
  );
};
