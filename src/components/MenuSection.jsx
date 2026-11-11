import React, { useState, useMemo } from 'react';
import { CATEGORIES, MENU_SECTIONS } from '../data/products';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { Icon } from './Icon';
import { Reveal } from './Reveal';
import { useProducts } from '../context/ProductsContext';

const SECTION_THEMES = {
  burgers: {
    headerBg: '#FFEFA6',
    accentColor: '#FFC93C',
  },
  kush: {
    headerBg: '#D4F6E2',
    accentColor: '#2ED573',
  },
  pollo: {
    headerBg: '#FFD8DB',
    accentColor: '#FF4757',
  },
  combos: {
    headerBg: '#D6EEFF',
    accentColor: '#1E90FF',
  },
  toppings: {
    headerBg: '#FFE4C7',
    accentColor: '#FFA502',
  },
  papas_extras: {
    headerBg: '#EBE0FF',
    accentColor: '#9B59B6',
  },
};

export const MenuSection = ({ onAddToCart }) => {
  const { products } = useProducts();
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFullMenu, setShowFullMenu] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState(null);

  // Secciones dinámicas con productos actualizados en tiempo real desde Firebase / Admin
  const dynamicSections = useMemo(() => {
    return MENU_SECTIONS.map((sec) => {
      const items = products.filter((p) => p.category === sec.id && p.active !== false);
      return {
        ...sec,
        items,
      };
    }).filter((sec) => sec.items.length > 0);
  }, [products]);

  // Platos destacados para la vista inicial compacta (Primeros 6 platos más pedidos)
  const featuredPreviewProducts = useMemo(() => {
    const burgers = products.filter((p) => p.category === 'burgers' && p.active !== false).slice(0, 4);
    const combos = products.filter((p) => p.category === 'combos' && p.active !== false).slice(0, 2);
    return [...burgers, ...combos];
  }, [products]);

  // Filtrado para el buscador en tiempo real
  const searchedProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return products.filter((item) => {
      if (item.active === false) return false;
      const matchName = item.name.toLowerCase().includes(query);
      const matchDesc = item.description?.toLowerCase().includes(query);
      return matchName || matchDesc;
    });
  }, [searchQuery, products]);

  // Secciones a renderizar cuando se elige una categoría específica
  const sectionsToDisplay = useMemo(() => {
    if (selectedCategory === 'todos') {
      return dynamicSections;
    }
    return dynamicSections.filter((sec) => sec.id === selectedCategory);
  }, [selectedCategory, dynamicSections]);

  return (
    <section
      id="menu"
      className="py-8 sm:py-14 md:py-18 relative select-none"
      style={{ backgroundColor: '#FFFDF6' }}
    >
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        
        {/* Cabecera Principal */}
        <Reveal>
          <div className="text-center mb-5 sm:mb-8">
            <h2 className="font-display text-3xl sm:text-5xl md:text-6xl text-cartoon-ink tracking-tight">
              NUESTRA CARTA
            </h2>
          </div>

          {/* Buscador Centrado y Despejado (Sin choques de espacio) */}
          <div className="max-w-md mx-auto mb-4 sm:mb-6">
            <div className="relative w-full">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-cartoon-ink/50 flex items-center">
                <Icon name="search" size={18} />
              </div>
              <input
                type="text"
                placeholder="Buscar hamburguesas, pollo, toppings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white border-2 sm:border-3 border-cartoon-ink font-sub font-medium text-xs sm:text-sm text-cartoon-ink placeholder-cartoon-ink/50 focus:outline-none focus:bg-cartoon-yellow-light/30 shadow-cartoon-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs bg-cartoon-ink/10 hover:bg-cartoon-ink/20 rounded-full w-5 h-5 flex items-center justify-center text-cartoon-ink cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Selector de Categorías: Scroll Horizontal en Móvil y Centrado en PC (Sin solaparse) */}
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center sm:justify-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar py-1 px-1">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id && !searchQuery.trim();
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSearchQuery('');
                      if (cat.id !== 'todos') {
                        setShowFullMenu(true);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border-2 sm:border-3 border-cartoon-ink font-sub font-bold text-xs sm:text-sm whitespace-nowrap cursor-pointer transition-all flex-shrink-0 ${
                      isActive
                        ? 'bg-cartoon-red text-white shadow-cartoon-sm -translate-y-0.5'
                        : 'bg-white text-cartoon-ink hover:bg-cartoon-cream-dark shadow-cartoon-xs'
                    }`}
                  >
                    <Icon name={cat.icon} size={16} className={isActive ? 'text-white' : 'text-cartoon-ink'} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* CASO 1: Resultados de Búsqueda Activa */}
        {searchQuery.trim() ? (
          <div>
            <div className="mb-4">
              <span className="font-sub font-bold text-xs sm:text-sm text-cartoon-ink/70">
                Resultados para "{searchQuery}": {searchedProducts.length} plato(s)
              </span>
            </div>

            {searchedProducts.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-5">
                {searchedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelectProduct={setSelectedProductModal}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-3xl border-3 border-cartoon-ink p-6">
                <span className="text-4xl block mb-2">🔍</span>
                <h4 className="font-display text-lg text-cartoon-ink mb-1">
                  No encontramos resultados
                </h4>
                <p className="font-sub text-xs text-cartoon-ink/70">
                  Probá buscando otra palabra o tocá las categorías de arriba.
                </p>
              </div>
            )}
          </div>
        ) : selectedCategory === 'todos' && !showFullMenu ? (
          /* CASO 2: Vista Compacta Inicial (No satura de espacio y tiene el botón "Ver Carta Completa") */
          <div>
            <div className="relative pt-4 sm:pt-6 mb-4">
              {/* Sticker Burger Sobresaliendo sutilmente */}
              <div className="absolute -top-5 sm:-top-7 right-3 sm:right-6 pointer-events-none z-10 transition-transform duration-300">
                <img
                  src="/assets/sticker_burger.png"
                  alt="Sticker Burgers"
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain filter drop-shadow-[0_4px_8px_rgba(30,27,24,0.2)] animate-bob rotate-6"
                />
              </div>

              {/* Banner Destacados */}
              <div className="border-2 sm:border-3 border-cartoon-ink rounded-2xl px-4 py-3 mb-4 shadow-cartoon-sm bg-[#FFEFA6] flex items-center justify-between">
                <h3 className="font-display text-lg sm:text-2xl text-cartoon-ink tracking-tight">
                  LOS MÁS PEDIDOS 🔥
                </h3>
              </div>

              {/* Grilla Compacta: 2 columnas en celular */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-5">
                {featuredPreviewProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelectProduct={setSelectedProductModal}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            </div>

            {/* BOTÓN SOLICITADO: "Ver Carta Completa" para no ocupar tanto espacio */}
            <div className="text-center mt-6 sm:mt-10">
              <button
                onClick={() => setShowFullMenu(true)}
                className="btn-cartoon-red text-sm sm:text-lg py-3 px-6 sm:px-9 rounded-2xl sm:rounded-3xl border-3 border-cartoon-ink shadow-cartoon hover:shadow-cartoon-lg active:scale-95 inline-flex items-center gap-2 group cursor-pointer transition-all"
              >
                <Icon name="restaurant_menu" size={20} />
                <span>Ver Carta Completa (24 Platos)</span>
                <Icon name="arrow_downward" size={20} className="transition-transform group-hover:translate-y-1" />
              </button>
            </div>
          </div>
        ) : (
          /* CASO 3: Carta Completa Expandida (Organizada por Secciones de Colores con sus Stickers) */
          <div className="space-y-8 sm:space-y-12">
            {sectionsToDisplay.map((section) => {
              const theme = SECTION_THEMES[section.id] || SECTION_THEMES.burgers;

              return (
                <div key={section.id} className="relative pt-4 sm:pt-6">
                  
                  {/* Personaje Troquelado que Sobresale del Borde Superior sutilmente */}
                  {section.sticker && (
                    <div className="absolute -top-5 sm:-top-7 right-3 sm:right-6 pointer-events-none z-10 transition-transform duration-300">
                      <img
                        src={section.sticker}
                        alt={`Sticker ${section.title}`}
                        className="w-12 h-12 sm:w-16 sm:h-16 object-contain filter drop-shadow-[0_4px_8px_rgba(30,27,24,0.2)] animate-bob rotate-6"
                      />
                    </div>
                  )}

                  {/* Banner de Sección con Color Temático */}
                  <div
                    className="border-2 sm:border-3 border-cartoon-ink rounded-2xl px-4 py-3 mb-3 sm:mb-4 shadow-cartoon-sm flex items-center justify-between"
                    style={{ backgroundColor: theme.headerBg }}
                  >
                    <h3 className="font-display text-lg sm:text-2xl text-cartoon-ink tracking-tight">
                      {section.title}
                    </h3>
                  </div>

                  {/* Grilla 2 Columnas en Celular y 3 Columnas en PC */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-5">
                    {section.items.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onSelectProduct={setSelectedProductModal}
                        onAddToCart={onAddToCart}
                        accentColor={theme.accentColor}
                      />
                    ))}
                  </div>

                </div>
              );
            })}

            {/* Botón para volver a colapsar si se abrió desde "Ver Carta Completa" */}
            {selectedCategory === 'todos' && showFullMenu && (
              <div className="text-center pt-4">
                <button
                  onClick={() => {
                    setShowFullMenu(false);
                    const el = document.getElementById('menu');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="btn-cartoon-white text-xs sm:text-sm py-2 px-5 rounded-2xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-sm active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon name="arrow_upward" size={16} />
                  <span>Ver Menos Platos</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal / Apartado Detallado del Plato con foto grande y botón "Pedir" */}
        <ProductDetailModal
          isOpen={!!selectedProductModal}
          product={selectedProductModal}
          onClose={() => setSelectedProductModal(null)}
          onAddToCart={onAddToCart}
        />

      </div>
    </section>
  );
};
