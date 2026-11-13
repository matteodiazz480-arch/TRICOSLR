import React from 'react';
import { Icon } from './Icon';
import { isProductOutOfStock } from '../lib/firebase';

export const ProductCard = ({ product, onSelectProduct, onAddToCart }) => {
  const isOutOfStock = isProductOutOfStock(product);
  const isLowStock = !isOutOfStock && Number(product.stock) > 0 && Number(product.stock) <= 4;

  const basePrice = product.variants && product.variants.length > 0
    ? product.variants[0].price
    : product.price;

  const hasVariants = product.variants && product.variants.length > 1;

  const handleCardClick = () => {
    if (onSelectProduct) {
      onSelectProduct(product);
    } else if (onAddToCart && !isOutOfStock) {
      onAddToCart({
        id: product.id,
        originalId: product.id,
        name: product.name,
        baseName: product.name,
        price: basePrice,
        emoji: product.emoji || '🍔',
        badge: product.badge,
        description: product.description,
        stock: product.stock,
        image: product.image,
      });
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`card-cartoon flex flex-col justify-between select-none relative bg-white p-2.5 sm:p-3.5 border-2 sm:border-3 border-cartoon-ink rounded-2xl sm:rounded-3xl shadow-cartoon-sm hover:shadow-cartoon transition-all duration-200 group cursor-pointer ${
        isOutOfStock
          ? 'opacity-65 grayscale-[30%] hover:translate-y-0'
          : 'hover:-translate-y-1'
      }`}
    >
      
      {/* 1. Imagen Grande y Destacada de la Hamburguesa / Plato */}
      <div className="w-full h-32 sm:h-44 md:h-48 rounded-xl sm:rounded-2xl bg-cartoon-cream border-2 sm:border-3 border-cartoon-ink overflow-hidden relative mb-2 sm:mb-2.5 shadow-cartoon-xs group-hover:scale-[1.02] transition-transform">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover object-center block"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl bg-cartoon-cream">
            <span>{product.emoji || '🍔'}</span>
          </div>
        )}

        {/* Badges Flotantes sobre la Foto */}
        {product.badge && (
          <span className="absolute top-2 left-2 bg-cartoon-yellow text-cartoon-ink font-sub font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-lg border border-cartoon-ink shadow-xs uppercase tracking-wider">
            {product.badge}
          </span>
        )}
        {isOutOfStock && (
          <span className="absolute top-2 right-2 bg-cartoon-red text-white font-sub font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-lg border border-cartoon-ink shadow-xs uppercase tracking-wider">
            AGOTADO
          </span>
        )}
        {isLowStock && (
          <span className="absolute top-2 right-2 bg-cartoon-yellow-dark text-cartoon-ink font-sub font-bold text-[9px] sm:text-[10px] px-2 py-0.5 rounded-lg border border-cartoon-ink shadow-xs">
            ¡Últimas {product.stock}!
          </span>
        )}
      </div>

      {/* 2. Información del Plato: Nombre y Descripción */}
      <div className="flex-1 flex flex-col justify-between mb-2">
        <div>
          <h4 className="font-display text-sm sm:text-base md:text-lg text-cartoon-ink leading-tight line-clamp-1 group-hover:text-cartoon-red transition-colors mb-1">
            {product.name}
          </h4>
          <p className="font-sans text-[11px] sm:text-xs text-cartoon-ink/75 leading-snug line-clamp-2 mb-1.5">
            {product.description}
          </p>
        </div>

        {/* Etiqueta de Opciones si tiene proteínas o variantes */}
        {(product.hasProteinChoice || hasVariants) && (
          <div className="flex items-center gap-1 text-[10px] font-sub font-bold text-cartoon-ink/60">
            <span>⚙️</span>
            <span>
              {product.hasProteinChoice && hasVariants
                ? 'Carne o Pollo • Simple/Doble'
                : product.hasProteinChoice
                ? 'Elegí Carne o Pollo'
                : 'Simple o Doble'}
            </span>
          </div>
        )}
      </div>

      {/* 3. Pie de Tarjeta: Precio y Botón "Pedir" */}
      <div className="pt-2 border-t-2 border-dashed border-cartoon-ink/15 flex items-center justify-between gap-1.5 mt-auto">
        <div className="flex flex-col min-w-0">
          {hasVariants && (
            <span className="font-sub text-[9px] sm:text-[10px] text-cartoon-ink/60 leading-none -mb-0.5">
              Desde
            </span>
          )}
          <span className="font-display text-sm sm:text-base md:text-lg text-cartoon-ink tracking-tight truncate">
            ${basePrice.toLocaleString('es-AR')}
          </span>
        </div>

        <button
          type="button"
          disabled={isOutOfStock}
          onClick={(e) => {
            e.stopPropagation();
            if (!isOutOfStock) handleCardClick();
          }}
          aria-label={isOutOfStock ? `${product.name} agotado` : `Pedir ${product.name}`}
          className={`flex items-center justify-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border-2 font-display text-xs sm:text-sm transition-all flex-shrink-0 ${
            isOutOfStock
              ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed shadow-none opacity-80'
              : 'bg-cartoon-yellow hover:bg-cartoon-yellow-dark text-cartoon-ink border-cartoon-ink shadow-cartoon-xs sm:shadow-cartoon-sm cursor-pointer active:translate-x-[1px] active:translate-y-[1px]'
          }`}
        >
          {isOutOfStock ? (
            <span>Agotado</span>
          ) : (
            <>
              <Icon name="add" size={15} className="font-bold" />
              <span>Pedir</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
