import React from 'react';
import { Icon } from './Icon';

export const Navbar = ({ cartCount, cartTotal, onOpenCart }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[70px] flex items-center justify-between">
        <a href="#" className="flex items-center gap-3 select-none group">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-103">
            <img
              src="/assets/logo.svg?v=3"
              alt="Logo TRICO'S"
              className="w-full h-full object-contain block"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg sm:text-xl text-slate-900 leading-none tracking-tight">
              TRICO'S
            </span>
            <span className="font-sub font-semibold text-[10px] sm:text-xs text-slate-500 tracking-wider uppercase mt-0.5">
              Chicken Fried & Burgers
            </span>
          </div>
        </a>

        <nav className="hidden lg:flex items-center gap-7">
          <a
            href="#menu"
            className="font-sub font-semibold text-slate-600 hover:text-slate-900 transition-colors text-sm"
          >
            La Carta
          </a>
          <a
            href="#promos"
            className="font-sub font-semibold text-slate-600 hover:text-slate-900 transition-colors text-sm"
          >
            Sorteo y Beneficios
          </a>
          <a
            href="#personaje"
            className="font-sub font-semibold text-slate-600 hover:text-slate-900 transition-colors text-sm"
          >
            Nosotros
          </a>
          <a
            href="#contacto"
            className="font-sub font-semibold text-slate-600 hover:text-slate-900 transition-colors text-sm"
          >
            Contacto
          </a>
        </nav>

        <div className="flex items-center">
          <button
            onClick={onOpenCart}
            aria-label="Abrir carrito de compras"
            className="btn-cartoon-primary px-4 py-2 text-xs sm:text-sm"
          >
            <div className="relative flex items-center justify-center">
              <Icon name="shopping_bag" size={18} className="text-white" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2.5 w-4 h-4 rounded-full bg-rose-600 text-white font-display text-[10px] flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>

            <span className="hidden sm:inline">Mi Pedido</span>

            {cartTotal > 0 && (
              <span className="hidden md:inline-block bg-white/15 text-white px-2 py-0.5 rounded-md text-xs font-sub font-semibold">
                ${cartTotal.toLocaleString('es-AR')}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
