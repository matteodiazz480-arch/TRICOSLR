import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { isProductOutOfStock } from '../lib/firebase';

export const ProductDetailSection = ({
  product,
  onBack,
  onAddToCart,
  onOpenCart,
}) => {
  if (!product) return null;

  const [selectedVariant, setSelectedVariant] = useState(() => {
    return product.variants && product.variants.length > 0 ? product.variants[0] : null;
  });

  const [selectedProtein, setSelectedProtein] = useState('Carne');
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const isOutOfStock = isProductOutOfStock(product);

  useEffect(() => {
    setSelectedVariant(product.variants && product.variants.length > 0 ? product.variants[0] : null);
    setSelectedProtein('Carne');
    setQuantity(isOutOfStock ? 0 : 1);
    setIsAdded(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [product, isOutOfStock]);

  const currentUnitPrice = selectedVariant ? selectedVariant.price : product.price;
  const totalPrice = currentUnitPrice * quantity;

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    const variantSuffix = selectedVariant ? ` (${selectedVariant.label})` : '';
    const proteinSuffix = product.hasProteinChoice ? ` [${selectedProtein}]` : '';

    const configuredItem = {
      id: `${product.id}${selectedVariant ? `-${selectedVariant.id}` : ''}${
        product.hasProteinChoice ? `-${selectedProtein.toLowerCase().replace(/\s+/g, '')}` : ''
      }`,
      originalId: product.id,
      name: `${product.name}${variantSuffix}${proteinSuffix}`,
      baseName: product.name,
      price: currentUnitPrice,
      badge: product.badge,
      description: product.description,
      variant: selectedVariant?.label || 'Simple',
      variantId: selectedVariant?.id || 'simple',
      protein: product.hasProteinChoice ? selectedProtein : null,
      stock: product.stock,
      image: product.image,
    };

    for (let i = 0; i < quantity; i++) {
      onAddToCart(configuredItem);
    }

    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 2500);
  };

  return (
    <section className="py-6 sm:py-10 bg-slate-50 min-h-[85vh] select-none">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
          <button
            type="button"
            onClick={onBack}
            className="btn-cartoon-white py-2 px-4 text-xs sm:text-sm"
          >
            <Icon name="arrow_back" size={18} />
            <span>Volver a la Carta</span>
          </button>

          <div className="flex items-center gap-1.5 font-sub font-medium text-xs text-slate-500">
            <span>Carta</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold truncate max-w-[160px] sm:max-w-none">
              {product.name}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Imagen */}
          <div className="lg:col-span-6">
            <div className="w-full h-72 sm:h-96 lg:h-[420px] rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden relative flex items-center justify-center">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover object-center block"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100">
                  <Icon name="restaurant" size={64} />
                </div>
              )}

              <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-2">
                {product.badge && !isOutOfStock && (
                  <span className="bg-slate-900/90 text-white font-sub font-semibold text-xs px-3 py-1 rounded-md uppercase tracking-wider">
                    {product.badge}
                  </span>
                )}
                {isOutOfStock && (
                  <span className="bg-rose-600 text-white font-sub font-bold text-xs px-3 py-1 rounded-md uppercase tracking-wider">
                    Agotado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Configuración y Compra */}
          <div className="lg:col-span-6">
            <div className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                  <h1 className="font-display text-2xl sm:text-3xl text-slate-900 tracking-tight">
                    {product.name}
                  </h1>
                  <span className="font-display text-2xl text-slate-900">
                    ${currentUnitPrice.toLocaleString('es-AR')}
                  </span>
                </div>
                <p className="font-sub text-xs sm:text-sm text-slate-500 leading-relaxed mt-2">
                  {product.description}
                </p>
              </div>

              {/* Medallón */}
              {product.hasProteinChoice && (
                <div>
                  <label className="block font-sub font-semibold text-xs text-slate-700 mb-2">
                    Proteína
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {['Carne', 'Pollo Frito'].map((prot) => (
                      <button
                        key={prot}
                        type="button"
                        onClick={() => setSelectedProtein(prot)}
                        className={`p-3 rounded-xl border font-sub font-semibold text-xs sm:text-sm flex items-center justify-center cursor-pointer transition-all ${
                          selectedProtein === prot
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {prot === 'Carne' ? 'Carne Vacuna' : 'Pollo Frito'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tamaño / Variante */}
              {product.variants && product.variants.length > 0 && (
                <div>
                  <label className="block font-sub font-semibold text-xs text-slate-700 mb-2">
                    Variante
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariant(v)}
                          className={`p-3 rounded-xl border font-sub font-semibold text-xs sm:text-sm flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span>{v.label}</span>
                          <span className="font-display">${v.price.toLocaleString('es-AR')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cantidad */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-sub font-semibold text-xs text-slate-700">Cantidad</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={isOutOfStock || quantity <= 1}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-display text-sm text-slate-900 flex items-center justify-center cursor-pointer disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-display text-sm text-slate-900">
                    {isOutOfStock ? 0 : quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                    disabled={isOutOfStock || quantity >= 20}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-display text-sm text-slate-900 flex items-center justify-center cursor-pointer disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Acción */}
              <div className="pt-1">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className={`w-full py-3.5 px-5 rounded-xl font-display text-sm sm:text-base transition-all flex items-center justify-between ${
                    isOutOfStock
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : isAdded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon name={isOutOfStock ? 'block' : isAdded ? 'check' : 'add_shopping_cart'} size={20} />
                    <span>{isOutOfStock ? 'Producto agotado' : isAdded ? 'Agregado al pedido' : 'Agregar al pedido'}</span>
                  </div>
                  <span>{isOutOfStock ? '' : `$${totalPrice.toLocaleString('es-AR')}`}</span>
                </button>
              </div>

              {isAdded && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 animate-fadeIn">
                  <span className="font-sub font-medium text-xs text-emerald-800">
                    Producto sumado al carrito
                  </span>
                  <button
                    type="button"
                    onClick={onOpenCart}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-sub font-semibold text-xs cursor-pointer"
                  >
                    Ver carrito
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
