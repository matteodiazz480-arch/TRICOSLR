import React from 'react';
import { Icon } from './Icon';
import { RESTAURANT_INFO } from '../data/products';

export const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      id="contacto"
      className="text-white pt-10 pb-8 select-none"
      style={{ backgroundColor: '#1E1B18' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b-2 border-white/15 items-start">
          
          {/* Logo con fondo blanco circular para máximo contraste */}
          <div className="md:col-span-5 flex flex-col items-start">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white p-1.5 border-2 border-cartoon-yellow flex items-center justify-center flex-shrink-0">
                <img
                  src="/assets/logo.svg"
                  alt="Logo TRICO'S"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="font-display text-3xl text-cartoon-yellow tracking-wide leading-none">
                  TRICO'S
                </h3>
                <span className="font-sub font-bold text-xs text-gray-300 uppercase tracking-wider mt-1 block">
                  Chicken Fried & Burgers
                </span>
              </div>
            </div>

            <p className="font-sub text-gray-300 text-sm max-w-sm mb-6 leading-relaxed">
              Pollo frito extra crujiente y smash burgers preparadas en el momento con ingredientes frescos.
            </p>

            {/* Redes */}
            <div className="flex items-center gap-3">
              <a
                href={`https://wa.me/${RESTAURANT_INFO.phone}`}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-xl bg-cartoon-green text-cartoon-ink border-2 border-white flex items-center justify-center hover:scale-105 transition-transform shadow-cartoon-sm"
                aria-label="WhatsApp"
              >
                <Icon name="call" size={20} />
              </a>

              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-xl bg-cartoon-red text-white border-2 border-white flex items-center justify-center hover:scale-105 transition-transform shadow-cartoon-sm"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
            </div>
          </div>

          {/* Horarios & Ubicación */}
          <div className="md:col-span-4 space-y-4 font-sub text-sm">
            <h4 className="font-display text-xl text-cartoon-yellow">
              UBICACIÓN & HORARIOS
            </h4>
            <div className="flex items-start gap-2.5 text-gray-300">
              <Icon name="location_on" size={20} className="text-cartoon-yellow flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">{RESTAURANT_INFO.address}</p>
                <p>{RESTAURANT_INFO.city}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-gray-300">
              <Icon name="schedule" size={20} className="text-cartoon-yellow flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Horarios:</p>
                <p>{RESTAURANT_INFO.schedule}</p>
              </div>
            </div>
          </div>

          {/* Botón Volver Arriba */}
          <div className="md:col-span-3 flex flex-col items-start md:items-end justify-between self-stretch">
            <button
              onClick={scrollToTop}
              className="btn-cartoon-white text-xs py-2.5 px-4 flex items-center gap-2 cursor-pointer self-start md:self-end mt-2 md:mt-0"
            >
              <span>Subir</span>
              <Icon name="arrow_upward" size={18} />
            </button>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sub text-gray-400">
          <p>© {new Date().getFullYear()} TRICO'S. Todos los derechos reservados.</p>
        </div>

      </div>
    </footer>
  );
};
