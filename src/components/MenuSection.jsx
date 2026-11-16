import React, { useState, useMemo } from 'react';
import { CATEGORIES, MENU_SECTIONS } from '../data/products';
import { ProductCard } from './ProductCard';
import { Icon } from './Icon';
import { Reveal } from './Reveal';
import { useProducts } from '../context/ProductsContext';

export const MenuSection = ({ onAddToCart, onSelectProduct }) => {
  const { products } = useProducts();
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFullMenu, setShowFullMenu] = useState(false);

  const dynamicSections = useMemo(() => {
    return MENU_SECTIONS.map((sec) => {
      const items = products.filter((p) => p.category === sec.id);
      return {
        ...sec,
        items,
      };
    }).filter((sec) => sec.items.length > 0);
  }, [products]);

  const featuredPreviewProducts = useMemo(() => {
    const burgers = products.filter((p) => p.category === 'burgers').slice(0, 4);
    const combos = products.filter((p) => p.category === 'combos').slice(0, 2);
    return [...burgers, ...combos];
  }, [products]);

  const totalPlates = useMemo(() => products.length, [products]);

  const searchedProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return products.filter((item) => {
      const matchName = item.name.toLowerCase().includes(query);
      const matchDesc = item.description?.toLowerCase().includes(query);
      return matchName || matchDesc;
    });
  }, [searchQuery, products]);

  const sectionsToDisplay = useMemo(() => {
    if (selectedCategory === 'todos') {
      return dynamicSections;
    }
    return dynamicSections.filter((sec) => sec.id === selectedCategory);
  }, [selectedCategory, dynamicSections]);

  return (
    <section id="menu" className="py-10 sm:py-16 bg-slate-50 relative select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-6 sm:mb-8">
            <span className="font-sub font-semibold text-xs text-amber-600 uppercase tracking-widest block mb-1">
              Menú Oficial
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-slate-900 tracking-tight">
              Nuestra Carta
            </h2>
          </div>

          {/* Buscador */}
          <div className="max-w-md mx-auto mb-6">
            <div className="relative w-full">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex items-center">
                <Icon name="search" size={18} />
              </div>
              <input
                type="text"
                placeholder="Buscar hamburguesas, pollo, combos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white border border-slate-200 font-sub text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 w-5 h-5 flex items-center justify-center cursor-pointer"
                >
                  <Icon name="close" size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Selector de Categorías */}
          <div className="mb-8 sm:mb-10">
            <div className="flex items-center sm:justify-center gap-2 overflow-x-auto no-scrollbar py-1 px-1">
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
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border font-sub font-semibold text-xs sm:text-sm whitespace-nowrap cursor-pointer transition-all flex-shrink-0 ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <Icon name={cat.icon} size={16} className={isActive ? 'text-amber-400' : 'text-slate-400'} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        {searchQuery.trim() ? (
          <div>
            <div className="mb-4">
              <span className="font-sub font-medium text-xs text-slate-500">
                Resultados para "{searchQuery}": {searchedProducts.length}
              </span>
            </div>

            {searchedProducts.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {searchedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelectProduct={onSelectProduct}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Icon name="search_off" size={20} />
                </div>
                <h4 className="font-display text-base text-slate-900 mb-1">
                  Sin resultados
                </h4>
                <p className="font-sub text-xs text-slate-500">
                  Probá con otro término o seleccioná una categoría.
                </p>
              </div>
            )}
          </div>
        ) : selectedCategory === 'todos' && !showFullMenu ? (
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-lg sm:text-xl text-slate-900 tracking-tight">
                Destacados de la Carta
              </h3>
              <span className="font-sub text-xs text-slate-500">Selección principal</span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {featuredPreviewProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelectProduct={onSelectProduct}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>

            <div className="text-center mt-8">
              <button
                onClick={() => setShowFullMenu(true)}
                className="btn-cartoon-primary py-3 px-7 text-sm"
              >
                <Icon name="restaurant_menu" size={18} />
                <span>Ver Carta Completa ({totalPlates} productos)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {sectionsToDisplay.map((section) => (
              <div key={section.id}>
                <div className="border-b border-slate-200 pb-3 mb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <h3 className="font-display text-lg sm:text-xl text-slate-900 tracking-tight">
                    {section.title}
                  </h3>
                  {section.subtitle && (
                    <span className="font-sub text-xs text-slate-500">{section.subtitle}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                  {section.items.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelectProduct={onSelectProduct}
                      onAddToCart={onAddToCart}
                    />
                  ))}
                </div>
              </div>
            ))}

            {selectedCategory === 'todos' && showFullMenu && (
              <div className="text-center pt-4">
                <button
                  onClick={() => {
                    setShowFullMenu(false);
                    const el = document.getElementById('menu');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="btn-cartoon-white py-2 px-5 text-xs sm:text-sm"
                >
                  <Icon name="expand_less" size={16} />
                  <span>Contraer carta</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
