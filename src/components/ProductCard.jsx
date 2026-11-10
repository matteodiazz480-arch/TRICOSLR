import React, { useState } from 'react';
import { Icon } from './Icon';

export const ProductCard = ({ product, onAddToCart, accentColor = '#FFC93C' }) => {
  const [selectedVariant, setSelectedVariant] = useState(() => {
    return product.variants && product.variants.length > 0 ? product.variants[0] : null;
  });

  const [selectedProtein, setSelectedProtein] = useState('Carne');
  const [isAdded, setIsAdded] = useState(false);

  const currentPrice = selectedVariant ? selectedVariant.price : product.price;

  const handleAdd = () => {
    const variantSuffix = selectedVariant ? ` (${selectedVariant.label})` : '';
    const proteinSuffix = product.hasProteinChoice ? ` [${selectedProtein}]` : '';

    const configuredItem = {
      id: `${product.id}${selectedVariant ? `-${selectedVariant.id}` : ''}${
        product.hasProteinChoice ? `-${selectedProtein.toLowerCase().replace(/\s+/g, '')}` : ''
      }`,
      originalId: product.id,
      name: `${product.name}${variantSuffix}${proteinSuffix}`,
      baseName: product.name,
      price: currentPrice,
      emoji: product.emoji || '🍔',
      badge: product.badge,
      description: product.description,
      variant: selectedVariant?.label,
      protein: product.hasProteinChoice ? selectedProtein : null,
    };

    onAddToCart(configuredItem);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 900);
  };

  return (
    <div className="card-cartoon flex flex-col justify-between select-none relative bg-white p-3 sm:p-4 border-2 sm:border-3 border-cartoon-ink rounded-2xl sm:rounded-3xl shadow-cartoon-sm hover:shadow-cartoon hover:-translate-y-0.5 transition-all duration-200 group">
      
      {/* 1. Header de Tarjeta: Emoji Flotante + Título */}
      <div>
        <div className="flex items-start gap-2.5 mb-1.5">
          {/* Medallón de Emoji Estilizado */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-cartoon-cream border-2 border-cartoon-ink flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 shadow-cartoon-xs group-hover:scale-105 group-hover:rotate-3 transition-transform">
            <span>{product.emoji || '🍔'}</span>
          </div>

          <div className="flex-1 min-w-0">
            {product.badge && (
              <span className="inline-block bg-cartoon-yellow text-cartoon-ink font-sub font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md border border-cartoon-ink uppercase tracking-wider mb-0.5">
                {product.badge}
              </span>
            )}
            <h4 className="font-display text-sm sm:text-base text-cartoon-ink leading-tight line-clamp-1 group-hover:text-cartoon-red transition-colors">
              {product.name}
            </h4>
          </div>
        </div>

        {/* 2. Descripción de Ingredientes */}
        <p className="font-sans text-[11px] sm:text-xs text-cartoon-ink/75 leading-snug line-clamp-2 mb-2 sm:mb-2.5">
          {product.description}
        </p>

        {/* 3. Selector de Proteína (Carne vs Pollo) - Tactile Segmented Switch */}
        {product.hasProteinChoice && (
          <div className="bg-cartoon-cream/80 p-0.5 rounded-xl border border-cartoon-ink flex gap-1 mb-2">
            <button
              type="button"
              onClick={() => setSelectedProtein('Carne')}
              className={`flex-1 py-1 rounded-lg font-sub font-bold text-[10px] sm:text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                selectedProtein === 'Carne'
                  ? 'bg-cartoon-ink text-white shadow-xs'
                  : 'text-cartoon-ink/65 hover:text-cartoon-ink'
              }`}
            >
              <span>🥩</span>
              <span>Carne</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedProtein('Pollo Frito')}
              className={`flex-1 py-1 rounded-lg font-sub font-bold text-[10px] sm:text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                selectedProtein === 'Pollo Frito'
                  ? 'bg-cartoon-red text-white shadow-xs'
                  : 'text-cartoon-ink/65 hover:text-cartoon-ink'
              }`}
            >
              <span>🍗</span>
              <span>Pollo</span>
            </button>
          </div>
        )}

        {/* 4. Selector de Variantes (Simple vs Doble / 50cc vs 125cc) */}
        {product.variants && product.variants.length > 0 && (
          <div className="grid grid-cols-2 gap-1 sm:gap-1.5 mb-2 sm:mb-2.5">
            {product.variants.map((v) => {
              const isSelected = selectedVariant?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariant(v)}
                  className={`py-1 px-1.5 rounded-xl border-2 border-cartoon-ink text-[10px] sm:text-xs font-sub font-bold transition-all cursor-pointer flex items-center justify-between leading-tight ${
                    isSelected
                      ? 'bg-cartoon-yellow text-cartoon-ink shadow-cartoon-xs -translate-y-0.5'
                      : 'bg-white text-cartoon-ink/70 hover:bg-cartoon-cream'
                  }`}
                >
                  <span className="truncate">{v.label}</span>
                  <span className="text-[9px] opacity-75 ml-1">${v.price.toLocaleString('es-AR')}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Pie de Tarjeta: Precio y Botón de Acción */}
      <div className="pt-2 border-t-2 border-dashed border-cartoon-ink/15 flex items-center justify-between gap-1.5 mt-auto">
        <div className="flex flex-col min-w-0">
          <span className="font-display text-sm sm:text-lg text-cartoon-ink tracking-tight truncate">
            ${currentPrice.toLocaleString('es-AR')}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          aria-label={`Agregar ${product.name}`}
          className={`flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border-2 border-cartoon-ink font-display text-xs sm:text-sm active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-all flex-shrink-0 ${
            isAdded
              ? 'bg-cartoon-green text-cartoon-ink shadow-none scale-95'
              : 'bg-cartoon-yellow hover:bg-cartoon-yellow-dark text-cartoon-ink shadow-cartoon-xs sm:shadow-cartoon-sm'
          }`}
        >
          {isAdded ? (
            <>
              <Icon name="check" size={14} className="font-bold" />
              <span>Listo</span>
            </>
          ) : (
            <>
              <Icon name="add" size={14} className="font-bold" />
              <span>Pedir</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
