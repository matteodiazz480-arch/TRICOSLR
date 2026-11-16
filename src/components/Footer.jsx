import React from 'react';
import { Icon } from './Icon';
import { RESTAURANT_INFO } from '../data/products';
import { buildWhatsAppUrl } from '../lib/whatsapp';

export const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer id="contacto" className="bg-slate-950 text-white pt-12 pb-8 border-t border-slate-800 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-800 items-start">
          <div className="md:col-span-5 flex flex-col items-start">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-14 h-14 rounded-xl bg-white p-1.5 flex items-center justify-center flex-shrink-0">
                <img
                  src="/assets/logo.svg"
                  alt="Logo TRICO'S"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="font-display text-2xl text-white tracking-tight leading-none">
                  TRICO'S
                </h3>
                <span className="font-sub font-semibold text-xs text-slate-400 uppercase tracking-wider mt-1 block">
                  Chicken Fried & Burgers
                </span>
              </div>
            </div>

            <p className="font-sub text-slate-400 text-xs sm:text-sm max-w-sm mb-5 leading-relaxed">
              Pollo frito extra crujiente y smash burgers preparadas en el momento con ingredientes seleccionados.
            </p>

            <div className="flex items-center gap-2.5">
              <a
                href={buildWhatsAppUrl(RESTAURANT_INFO.phone, "Hola TRICO'S, quiero hacer una consulta.")}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors"
                aria-label="WhatsApp"
              >
                <Icon name="call" size={18} />
              </a>

              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-rose-600 text-white flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
            </div>
          </div>

          <div className="md:col-span-4 space-y-3 font-sub text-xs sm:text-sm">
            <h4 className="font-display text-sm text-white uppercase tracking-wider">
              Ubicación y Horarios
            </h4>
            <div className="flex items-start gap-2.5 text-slate-400">
              <Icon name="location_on" size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">{RESTAURANT_INFO.address}</p>
                <p>{RESTAURANT_INFO.city}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-slate-400">
              <Icon name="schedule" size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Atención</p>
                <p>{RESTAURANT_INFO.schedule}</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 flex flex-col items-start md:items-end justify-between self-stretch">
            <button
              onClick={scrollToTop}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-sub font-semibold text-xs flex items-center gap-1.5 cursor-pointer self-start md:self-end"
            >
              <span>Subir</span>
              <Icon name="arrow_upward" size={16} />
            </button>
          </div>
        </div>

        <div className="pt-6 flex items-center justify-center text-xs font-sub text-slate-500">
          <p>
            Desarrollado por <strong className="text-slate-300 font-semibold">Nexo Creative</strong>
          </p>
        </div>
      </div>
    </footer>
  );
};
