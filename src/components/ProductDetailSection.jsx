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
  const availableStock = Math.max(0, Number(product?.stock) || 0);
  const isLowStock = !isOutOfStock && availableStock > 0 && availableStock <= 4;

  // Reiniciar estado cuando cambia el producto
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
    }, 2500);
  };

  return (
    <section className="py-6 sm:py-10 md:py-12 bg-[#FFFDF6] min-h-[85vh] select-none">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Barra Superior de Navegación del Apartado */}
        <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8 pb-4 border-b-2 border-cartoon-ink/15">
          <button
            type="button"
            onClick={onBack}
            className="btn-cartoon-white py-2 px-4 sm:py-2.5 sm:px-5 rounded-2xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs hover:shadow-cartoon active:scale-95 text-xs sm:text-sm font-display flex items-center gap-2 cursor-pointer transition-all"
          >
            <Icon name="arrow_back" size={18} />
            <span>Volver a la Carta</span>
          </button>

          <div className="flex items-center gap-1.5 font-sub font-bold text-xs sm:text-sm text-cartoon-ink/60">
            <span>Carta</span>
            <span>/</span>
            <span className="text-cartoon-ink truncate max-w-[140px] sm:max-w-none">
              {product.name}
            </span>
          </div>
        </div>

        {/* Apartado Principal: 2 Columnas en Escritorio y 1 Columna en Celular */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-start">
          
          {/* COLUMNA 1: Fotografía de la Hamburguesa en Gran Formato */}
          <div className="lg:col-span-6 space-y-4">
            <div className="w-full h-72 sm:h-96 lg:h-[460px] rounded-3xl border-3 sm:border-4 border-cartoon-ink bg-white shadow-cartoon-lg overflow-hidden relative flex items-center justify-center">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover object-center block"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl sm:text-9xl bg-cartoon-cream">
                  <span>{product.emoji || '🍔'}</span>
                </div>
              )}

              {/* Badges Flotantes sobre la Imagen */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {product.badge && (
                  <span className="bg-cartoon-yellow text-cartoon-ink font-sub font-black text-xs sm:text-sm px-3 py-1 rounded-xl border-2 border-cartoon-ink shadow-cartoon-xs uppercase tracking-wider">
                    {product.badge}
                  </span>
                )}
                {isOutOfStock && (
                  <span className="bg-cartoon-red text-white font-sub font-black text-xs sm:text-sm px-3 py-1 rounded-xl border-2 border-cartoon-ink shadow-cartoon-xs uppercase tracking-wider">
                    AGOTADO
                  </span>
                )}
                {isLowStock && (
                  <span className="bg-cartoon-yellow-dark text-cartoon-ink font-sub font-bold text-xs sm:text-sm px-3 py-1 rounded-xl border-2 border-cartoon-ink shadow-cartoon-xs">
                    ¡Últimas {product.stock} unidades!
                  </span>
                )}
              </div>
            </div>

            {/* Sello de Garantía y Frescura */}
            <div className="p-4 rounded-2xl bg-white border-2 border-cartoon-ink/20 shadow-xs flex items-center gap-3">
              <span className="text-3xl flex-shrink-0">🔥</span>
              <p className="font-sub font-bold text-xs text-cartoon-ink/80 leading-snug">
                Elaborada en el momento con pan brioche artesanal tostado con manteca y papas fritas crocantes.
              </p>
            </div>
          </div>

          {/* COLUMNA 2: Detalles, Personalización y Botón "Pedir" */}
          <div className="lg:col-span-6">
            <div className="bg-white p-5 sm:p-7 md:p-8 rounded-3xl border-3 sm:border-4 border-cartoon-ink shadow-cartoon-lg space-y-5 sm:space-y-6">
              
              {/* Encabezado: Nombre y Precio */}
              <div className="border-b-2 border-dashed border-cartoon-ink/20 pb-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                  <h1 className="font-display text-2xl sm:text-4xl text-cartoon-ink tracking-tight">
                    {product.name}
                  </h1>
                  <span className="font-display text-2xl sm:text-3xl text-cartoon-red">
                    ${currentUnitPrice.toLocaleString('es-AR')}
                  </span>
                </div>
                <span className="font-sub font-bold text-xs text-cartoon-ink/60 uppercase tracking-wider">
                  {product.category === 'burgers'
                    ? 'Hamburguesa Smash • Salen con Papas Fritas'
                    : product.category === 'kush'
                    ? 'Línea Kush Especial • Con Papas Fritas'
                    : product.category === 'combos'
                    ? 'Combo Especial para Compartir'
                    : 'Especialidad TRICO\'S'}
                </span>
              </div>

              {/* Descripción de Ingredientes */}
              <div>
                <h3 className="font-display text-xs sm:text-sm text-cartoon-ink/70 mb-1.5 uppercase tracking-wider">
                  Ingredientes & Preparación:
                </h3>
                <div className="bg-cartoon-cream/60 p-4 rounded-2xl border-2 border-cartoon-ink/15">
                  <p className="font-sans text-xs sm:text-sm text-cartoon-ink/85 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              </div>

              {/* Selector de Medallón (Carne vs Pollo) */}
              {product.hasProteinChoice && (
                <div>
                  <label className="block font-display text-xs sm:text-sm text-cartoon-ink mb-2">
                    Elegí tu medallón:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedProtein('Carne')}
                      className={`p-3 rounded-2xl border-2 sm:border-3 border-cartoon-ink font-sub font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        selectedProtein === 'Carne'
                          ? 'bg-cartoon-yellow text-cartoon-ink shadow-cartoon-xs font-black -translate-y-0.5'
                          : 'bg-white text-cartoon-ink/70 hover:bg-cartoon-cream'
                      }`}
                    >
                      <span className="text-lg">🥩</span>
                      <span>Carne Premium</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProtein('Pollo Frito')}
                      className={`p-3 rounded-2xl border-2 sm:border-3 border-cartoon-ink font-sub font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        selectedProtein === 'Pollo Frito'
                          ? 'bg-cartoon-red text-white shadow-cartoon-xs font-black -translate-y-0.5'
                          : 'bg-white text-cartoon-ink/70 hover:bg-cartoon-cream'
                      }`}
                    >
                      <span className="text-lg">🍗</span>
                      <span>Pollo Frito Crunch</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Selector de Tamaño / Variantes (Simple vs Doble) */}
              {product.variants && product.variants.length > 0 && (
                <div>
                  <label className="block font-display text-xs sm:text-sm text-cartoon-ink mb-2">
                    Elegí el tamaño:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariant(v)}
                          className={`p-3 rounded-2xl border-2 sm:border-3 border-cartoon-ink font-sub font-bold text-xs sm:text-sm flex items-center justify-between cursor-pointer transition-all ${
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
              <div className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border-2 transition-all ${
                isOutOfStock ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-cartoon-cream/50 border-cartoon-ink/20'
              }`}>
                <span className="font-display text-xs sm:text-sm text-cartoon-ink">
                  {isOutOfStock ? 'Disponibilidad:' : 'Cantidad a pedir:'}
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={isOutOfStock || quantity <= 1}
                    className="w-10 h-10 rounded-xl bg-white border-2 border-cartoon-ink font-display text-base text-cartoon-ink flex items-center justify-center cursor-pointer hover:bg-cartoon-yellow transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-display text-lg text-cartoon-ink">
                    {isOutOfStock ? 0 : quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(availableStock || 1, q + 1))}
                    disabled={isOutOfStock || quantity >= availableStock}
                    className="w-10 h-10 rounded-xl bg-white border-2 border-cartoon-ink font-display text-base text-cartoon-ink flex items-center justify-center cursor-pointer hover:bg-cartoon-yellow transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Botón Principal: "Pedir" o "Plato Agotado" */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className={`w-full py-4 sm:py-4.5 px-6 rounded-2xl border-3 sm:border-4 font-display text-lg sm:text-xl transition-all flex items-center justify-between shadow-cartoon ${
                    isOutOfStock
                      ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed shadow-none opacity-80'
                      : isAdded
                      ? 'bg-cartoon-green text-cartoon-ink border-cartoon-ink'
                      : 'btn-cartoon-primary hover:bg-cartoon-yellow-dark text-cartoon-ink border-cartoon-ink hover:shadow-cartoon-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon name={isOutOfStock ? 'block' : isAdded ? 'check' : 'add_shopping_cart'} size={24} />
                    <span>{isOutOfStock ? 'Plato Agotado' : isAdded ? '¡Agregado al Pedido!' : 'Pedir'}</span>
                  </div>
                  <span className="font-display text-xl sm:text-2xl">
                    {isOutOfStock ? 'Sin Stock' : `$${totalPrice.toLocaleString('es-AR')}`}
                  </span>
                </button>
              </div>

              {/* Alerta Destacada cuando el plato está Agotado */}
              {isOutOfStock && (
                <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center gap-2.5 text-rose-800 text-xs font-sub font-bold animate-fadeIn">
                  <Icon name="error_outline" size={20} className="text-rose-600 flex-shrink-0" />
                  <span>Este plato se encuentra momentáneamente sin stock. Podés elegir cualquier otra de nuestras opciones disponibles en la carta.</span>
                </div>
              )}

              {/* Notificación y Accesos Rápidos tras Agregar */}
              {isAdded && (
                <div className="p-3.5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
                  <span className="font-sub font-bold text-xs text-emerald-800 flex items-center gap-1.5">
                    <span>✅</span> ¡Listo! Agregado a tu pedido.
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={onBack}
                      className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-white border border-gray-300 font-sub font-bold text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      Seguir Pidiendo
                    </button>
                    <button
                      type="button"
                      onClick={onOpenCart}
                      className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-cartoon-ink text-white font-sub font-bold text-xs cursor-pointer shadow-xs"
                    >
                      Ver Carrito
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
