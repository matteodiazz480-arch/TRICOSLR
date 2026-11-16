import React from 'react';
import { Icon } from './Icon';
import { isProductOutOfStock } from '../lib/firebase';

export const ProductCard = ({ product, onSelectProduct, onAddToCart }) => {
  const isOutOfStock = isProductOutOfStock(product);

  const basePrice =
    product.variants && product.variants.length > 0
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
        badge: product.badge,
        description: product.description,
        variant: product.variants?.[0]?.label || 'Simple',
        variantId: product.variants?.[0]?.id || 'simple',
        stock: product.stock,
        image: product.image,
      });
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`card-cartoon flex flex-col justify-between select-none relative bg-white p-3 sm:p-4 rounded-2xl transition-all duration-200 group cursor-pointer ${
        isOutOfStock ? 'opacity-60 grayscale-[40%]' : 'hover:-translate-y-0.5'
      }`}
    >
      {/* Imagen del Producto */}
      <div className="w-full h-36 sm:h-44 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden relative mb-3">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover object-center block group-hover:scale-103 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
            <Icon name="restaurant" size={36} />
          </div>
        )}

        {product.badge && !isOutOfStock && (
          <span className="absolute top-2.5 left-2.5 bg-slate-900/90 backdrop-blur-xs text-white font-sub font-semibold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider">
            {product.badge}
          </span>
        )}

        {isOutOfStock && (
          <span className="absolute top-2.5 right-2.5 bg-rose-600 text-white font-sub font-bold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
            Agotado
          </span>
        )}
      </div>

      {/* Información del Plato */}
      <div className="flex-1 flex flex-col justify-between mb-3">
        <div>
          <h4 className="font-display text-sm sm:text-base text-slate-900 leading-snug line-clamp-1 group-hover:text-rose-600 transition-colors mb-1">
            {product.name}
          </h4>
          <p className="font-sub text-xs text-slate-500 leading-relaxed line-clamp-2">
            {product.description}
          </p>
        </div>

        {(product.hasProteinChoice || hasVariants) && (
          <div className="flex items-center gap-1.5 text-[11px] font-sub font-medium text-slate-400 mt-2">
            <Icon name="tune" size={13} />
            <span>
              {product.hasProteinChoice && hasVariants
                ? 'Carne o Pollo • Simple / Doble'
                : product.hasProteinChoice
                ? 'Opción Carne o Pollo'
                : 'Simple / Doble'}
            </span>
          </div>
        )}
      </div>

      {/* Pie: Precio y Acción */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
        <div className="flex flex-col min-w-0">
          {hasVariants && (
            <span className="font-sub text-[10px] text-slate-400 leading-none mb-0.5">
              Desde
            </span>
          )}
          <span className="font-display text-sm sm:text-base text-slate-900 tracking-tight truncate">
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
          className={`flex items-center justify-center gap-1 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl font-sub font-semibold text-xs transition-all flex-shrink-0 ${
            isOutOfStock
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-95'
          }`}
        >
          {isOutOfStock ? (
            <span>Agotado</span>
          ) : (
            <>
              <Icon name="add" size={15} />
              <span>Agregar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
