import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

export const ProductDetailModal = ({ isOpen, product, onClose, onAddToCart }) => {
  if (!isOpen || !product) return null;

  const [selectedVariant, setSelectedVariant] = useState(() => {
    return product.variants && product.variants.length > 0 ? product.variants[0] : null;
  });

  const [selectedProtein, setSelectedProtein] = useState('Carne');
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  // Reiniciar estado cuando cambia el producto
  useEffect(() => {
    if (product) {
      setSelectedVariant(product.variants && product.variants.length > 0 ? product.variants[0] : null);
      setSelectedProtein('Carne');
      setQuantity(1);
      setIsAdded(false);
    }
  }, [product]);

  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const currentUnitPrice = selectedVariant ? selectedVariant.price : product.price;
  const totalPrice = currentUnitPrice * quantity;

  const isOutOfStock = product.stock !== undefined && (product.stock === 0 || product.active === false);
  const isLowStock = product.stock !== undefined && product.stock > 0 && product.stock <= 4;

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
      emoji: product.emoji || '🍔',
      badge: product.badge,
      description: product.description,
      variant: selectedVariant?.label,
      protein: product.hasProteinChoice ? selectedProtein : null,
      stock: product.stock,
      image: product.image,
    };

    // Agregar tantas unidades como se eligieron
    for (let i = 0; i < quantity; i++) {
      onAddToCart(configuredItem);
    }

    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 650);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4 md:p-6 flex items-center justify-center animate-fadeIn">
      {/* Backdrop con desenfoque suave */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-cartoon-ink/75 backdrop-blur-sm transition-opacity"
      />

      {/* Contenedor del Modal / Apartado */}
      <div className="relative bg-cartoon-cream w-full max-w-lg rounded-3xl sm:rounded-[32px] border-3 sm:border-4 border-cartoon-ink shadow-cartoon-xl overflow-hidden z-10 animate-pop-in flex flex-col max-h-[92vh]">
        
        {/* Encabezado: Foto de la Hamburguesa en Tamaño Grande y Destacado */}
        <div className="relative w-full h-40 sm:h-48 md:h-52 bg-white border-b-3 sm:border-b-4 border-cartoon-ink flex-shrink-0 overflow-hidden flex items-center justify-center">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl sm:text-8xl bg-cartoon-cream">
              <span>{product.emoji || '🍔'}</span>
            </div>
          )}

          {/* Botón de Cerrar (✕) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center text-cartoon-ink hover:bg-cartoon-red hover:text-white cursor-pointer transition-all active:scale-90 z-20"
          >
            <Icon name="close" size={20} />
          </button>

          {/* Badges Flotantes sobre la Imagen */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 z-10">
            {product.badge && (
              <span className="bg-cartoon-yellow text-cartoon-ink font-sub font-black text-xs px-2.5 py-1 rounded-xl border-2 border-cartoon-ink shadow-cartoon-xs uppercase tracking-wider">
                {product.badge}
              </span>
            )}
            {isOutOfStock && (
              <span className="bg-cartoon-red text-white font-sub font-black text-xs px-2.5 py-1 rounded-xl border-2 border-cartoon-ink shadow-cartoon-xs uppercase tracking-wider">
                AGOTADO
              </span>
            )}
            {isLowStock && (
              <span className="bg-cartoon-yellow-dark text-cartoon-ink font-sub font-bold text-xs px-2.5 py-1 rounded-xl border-2 border-cartoon-ink shadow-cartoon-xs">
                ¡Últimas {product.stock} unidades!
              </span>
            )}
          </div>
        </div>

        {/* Cuerpo del Apartado con Opciones y Descripción */}
        <div className="p-3.5 sm:p-5 space-y-3 overflow-y-auto no-scrollbar flex-1">
          
          {/* Nombre y Precio */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl sm:text-3xl text-cartoon-ink leading-tight">
                {product.name}
              </h3>
              {product.category && (
                <span className="font-sub text-xs text-cartoon-ink/60 font-bold uppercase tracking-wider">
                  {product.category === 'burgers' ? 'Hamburguesa Smash' : product.category === 'kush' ? 'Línea Kush Especial' : product.category}
                </span>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <span className="font-display text-2xl sm:text-3xl text-cartoon-red">
                ${currentUnitPrice.toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          {/* Descripción Completa de Ingredientes */}
          <div className="bg-white/80 p-3 sm:p-3.5 rounded-2xl border-2 border-cartoon-ink/20 shadow-xs">
            <p className="font-sans text-xs sm:text-sm text-cartoon-ink/80 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Selector de Medallón (Carne vs Pollo) */}
          {product.hasProteinChoice && (
            <div>
              <label className="block font-display text-xs sm:text-sm text-cartoon-ink mb-1.5">
                Elegí tu medallón:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProtein('Carne')}
                  className={`py-2.5 px-3 rounded-2xl border-2 sm:border-3 border-cartoon-ink font-sub font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    selectedProtein === 'Carne'
                      ? 'bg-cartoon-yellow text-cartoon-ink shadow-cartoon-xs font-black -translate-y-0.5'
                      : 'bg-white text-cartoon-ink/70 hover:bg-cartoon-cream'
                  }`}
                >
                  <span className="text-base">🥩</span>
                  <span>Carne Premium</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProtein('Pollo Frito')}
                  className={`py-2.5 px-3 rounded-2xl border-2 sm:border-3 border-cartoon-ink font-sub font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    selectedProtein === 'Pollo Frito'
                      ? 'bg-cartoon-red text-white shadow-cartoon-xs font-black -translate-y-0.5'
                      : 'bg-white text-cartoon-ink/70 hover:bg-cartoon-cream'
                  }`}
                >
                  <span className="text-base">🍗</span>
                  <span>Pollo Frito Crunch</span>
                </button>
              </div>
            </div>
          )}

          {/* Selector de Tamaño / Variante (Simple vs Doble) */}
          {product.variants && product.variants.length > 0 && (
            <div>
              <label className="block font-display text-xs sm:text-sm text-cartoon-ink mb-1.5">
                Elegí el tamaño:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`py-2.5 px-3 rounded-2xl border-2 sm:border-3 border-cartoon-ink font-sub font-bold text-xs sm:text-sm flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cartoon-yellow text-cartoon-ink shadow-cartoon-xs font-black -translate-y-0.5'
                          : 'bg-white text-cartoon-ink/70 hover:bg-cartoon-cream'
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

          {/* Selector de Cantidad */}
          <div className="flex items-center justify-between bg-white/70 p-2.5 sm:p-3 rounded-2xl border-2 border-cartoon-ink/20">
            <span className="font-display text-xs sm:text-sm text-cartoon-ink">
              Cantidad:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-9 h-9 rounded-xl bg-cartoon-cream border-2 border-cartoon-ink font-display text-base text-cartoon-ink flex items-center justify-center cursor-pointer hover:bg-cartoon-yellow transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                -
              </button>
              <span className="w-8 text-center font-display text-base sm:text-lg text-cartoon-ink">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-9 rounded-xl bg-cartoon-cream border-2 border-cartoon-ink font-display text-base text-cartoon-ink flex items-center justify-center cursor-pointer hover:bg-cartoon-yellow transition-colors"
              >
                +
              </button>
            </div>
          </div>

        </div>

        {/* Pie del Apartado: Botón Grande y Destacado "Pedir" */}
        <div className="p-4 sm:p-5 border-t-3 sm:border-t-4 border-cartoon-ink bg-white flex-shrink-0">
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className={`w-full py-3.5 sm:py-4 px-5 rounded-2xl border-3 border-cartoon-ink font-display text-base sm:text-lg transition-all flex items-center justify-between shadow-cartoon active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer ${
              isOutOfStock
                ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed shadow-none'
                : isAdded
                ? 'bg-cartoon-green text-cartoon-ink'
                : 'btn-cartoon-primary hover:bg-cartoon-yellow-dark text-cartoon-ink'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon name={isAdded ? 'check' : 'add_shopping_cart'} size={22} />
              <span>{isAdded ? '¡Agregado al Pedido!' : 'Pedir'}</span>
            </div>
            <span className="font-display text-lg sm:text-xl">
              ${totalPrice.toLocaleString('es-AR')}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
