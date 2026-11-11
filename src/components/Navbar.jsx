import React from 'react';
import { Icon } from './Icon';

export const Navbar = ({ cartCount, cartTotal, onOpenCart }) => {
  return (
    <header
      className="sticky top-0 z-40 border-b-3 border-cartoon-ink"
      style={{ backgroundColor: '#FFC93C' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between">
        
        {/* Logo Proporcionado, Completo y sin Recortes en un Navbar Compacto */}
        <a href="#" className="flex items-center gap-2.5 sm:gap-3 select-none group">
          <div className="w-11 h-11 sm:w-[52px] sm:h-[52px] rounded-full bg-white border-2 border-cartoon-ink shadow-cartoon-sm p-1 flex items-center justify-center flex-shrink-0 transition-transform duration-200 ease-[var(--ease-out)] group-hover:scale-105">
            <img
              src="/assets/logo.svg?v=3"
              alt="Logo TRICO'S Chicken Fried & Burgers"
              className="w-full h-full object-contain block"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl sm:text-2xl text-cartoon-ink leading-none tracking-wide">
              TRICO'S
            </span>
            <span className="font-sub font-bold text-[10px] sm:text-xs text-cartoon-ink/80 tracking-wider uppercase mt-0.5">
              Chicken Fried & Burgers
            </span>
          </div>
        </a>

        {/* Navegación Principal */}
        <nav className="hidden lg:flex items-center gap-6">
          <a
            href="#menu"
            className="font-sub font-bold text-cartoon-ink hover:text-cartoon-red transition-colors text-sm xl:text-base"
          >
            La Carta
          </a>
          <a
            href="#promos"
            className="font-sub font-bold text-cartoon-ink hover:text-cartoon-red transition-colors text-sm xl:text-base"
          >
            Combos & Cupones
          </a>
          <a
            href="#personaje"
            className="font-sub font-bold text-cartoon-ink hover:text-cartoon-red transition-colors text-sm xl:text-base"
          >
            Nuestro Sello
          </a>
          <a
            href="#contacto"
            className="font-sub font-bold text-cartoon-ink hover:text-cartoon-red transition-colors text-sm xl:text-base"
          >
            Contacto
          </a>
        </nav>

        {/* Botón Carrito */}
        <div className="flex items-center">
          <button
            onClick={onOpenCart}
            aria-label="Abrir carrito de compras"
            className="btn-cartoon-red px-3.5 py-2 sm:px-4 sm:py-2 text-sm sm:text-base group"
          >
            <div className="relative flex items-center justify-center">
              <Icon name="shopping_bag" size={20} className="text-white" />
              {cartCount > 0 && (
                <span className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-cartoon-yellow text-cartoon-ink font-display text-[11px] border-2 border-cartoon-ink flex items-center justify-center animate-bounce-subtle shadow-cartoon-sm">
                  {cartCount}
                </span>
              )}
            </div>

            <span className="hidden sm:inline">Mi Pedido</span>

            {cartTotal > 0 && (
              <span className="hidden md:inline-block bg-cartoon-ink/20 text-white px-2 py-0.5 rounded-lg text-xs font-sub font-bold">
                ${cartTotal.toLocaleString('es-AR')}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
