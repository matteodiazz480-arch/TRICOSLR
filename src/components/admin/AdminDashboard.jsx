import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Icon } from '../Icon';
import { CATEGORIES } from '../../data/products';
import { ProductModal } from './ProductModal';
import { useProducts } from '../../context/ProductsContext';
import { clearSession } from '../../lib/security';
import { isProductOutOfStock } from '../../lib/firebase';
import {
  getFinances,
  subscribeToFinances,
  addEarning,
  addExpense,
  deleteFinanceItem,
} from '../../lib/financesStore';
import {
  getPromotions,
  subscribeToPromotions,
  updateGiveaway,
  addCoupon,
  deleteCoupon,
  toggleCouponActive,
} from '../../lib/promotionsStore';
import { compressImageFile } from '../../lib/imageCompressor';
import { LotteryOrdersSection } from './LotteryOrdersSection';
import { IngredientsSection } from './IngredientsSection';
import {
  getOrders,
  subscribeToOrders,
  deleteOrder,
  toggleOrderWinner,
  addOrder,
} from '../../lib/ordersStore';
import {
  getIngredients,
  subscribeToIngredients,
} from '../../lib/ingredientsStore';

const money = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

export const AdminDashboard = ({ onLogout, onGoToStore }) => {
  const { products, toggleActive, saveProduct, deleteProduct } = useProducts();

  const [activeTab, setActiveTab] = useState('balance');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const [finances, setFinances] = useState(() => getFinances());
  useEffect(() => {
    const unsubscribe = subscribeToFinances((items) => {
      setFinances(items);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const [orders, setOrders] = useState(() => getOrders());
  useEffect(() => {
    const unsubscribe = subscribeToOrders((items) => {
      setOrders(items);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const [ingredients, setIngredients] = useState(() => getIngredients());
  useEffect(() => {
    const unsubscribe = subscribeToIngredients((items) => {
      setIngredients(items);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const [earningForm, setEarningForm] = useState({
    amount: '',
    concept: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    concept: '',
    category: 'Insumos',
    date: new Date().toISOString().split('T')[0],
  });

  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const financialTotals = useMemo(() => {
    const totalEarnings = finances
      .filter((f) => f.type === 'earning')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    const totalExpenses = finances
      .filter((f) => f.type === 'expense')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    const netBalance = totalEarnings - totalExpenses;
    return { totalEarnings, totalExpenses, netBalance };
  }, [finances]);

  const handleAddEarningSubmit = async (e) => {
    e.preventDefault();
    if (!earningForm.amount || Number(earningForm.amount) <= 0) return;
    const next = await addEarning(earningForm);
    if (next) setFinances(next);
    setEarningForm({
      amount: '',
      concept: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) return;
    const next = await addExpense(expenseForm);
    if (next) setFinances(next);
    setExpenseForm({
      amount: '',
      concept: '',
      category: 'Insumos',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleDeleteFinance = async (id) => {
    setFinances((prev) => prev.filter((item) => item.id !== id));
    await deleteFinanceItem(id);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'todos' || p.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const [promoData, setPromoData] = useState(() => getPromotions());
  const [giveawayForm, setGiveawayForm] = useState(() => ({
    title: promoData?.giveaway?.title || "GRAN SORTEO TRICO'S",
    subtitle: promoData?.giveaway?.subtitle || 'Participá con tu pedido en la web',
    prizeName: promoData?.giveaway?.prizeName || 'Combo Carioca + Delivery Gratis',
    winnersCount: promoData?.giveaway?.winnersCount || 1,
    drawDate: promoData?.giveaway?.drawDate || 'Fin de mes',
    active: promoData?.giveaway?.active !== false,
  }));

  const [couponForm, setCouponForm] = useState({
    code: '',
    discount: 10,
    type: 'percentage',
    label: '',
    minPurchase: '',
  });

  const [promoMessage, setPromoMessage] = useState('');

  useEffect(() => {
    const unsub = subscribeToPromotions((data) => {
      if (data) {
        setPromoData(data);
        if (data.giveaway) {
          setGiveawayForm((prev) => ({
            ...prev,
            title: data.giveaway.title || prev.title,
            subtitle: data.giveaway.subtitle || prev.subtitle,
            prizeName: data.giveaway.prizeName || prev.prizeName,
            winnersCount: data.giveaway.winnersCount || prev.winnersCount,
            drawDate: data.giveaway.drawDate || prev.drawDate,
            active: data.giveaway.active !== false,
          }));
        }
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const cardFileInputRefs = useRef({});
  const [uploadingCardId, setUploadingCardId] = useState(null);

  const handleCardImageUpload = async (product, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploadingCardId(product.id);
    try {
      const compressed = await compressImageFile(file, 800, 800, 0.82);
      saveProduct({
        ...product,
        image: compressed,
      });
    } catch (err) {
      console.error('Error al comprimir imagen:', err);
    } finally {
      setUploadingCardId(null);
    }
  };

  const handleSaveGiveawaySubmit = (e) => {
    e.preventDefault();
    updateGiveaway({
      title: giveawayForm.title.trim(),
      subtitle: giveawayForm.subtitle.trim(),
      prizeName: giveawayForm.prizeName.trim(),
      winnersCount: Math.max(1, Number(giveawayForm.winnersCount) || 1),
      drawDate: giveawayForm.drawDate.trim(),
      active: giveawayForm.active,
    });
    setPromoMessage('Configuración del sorteo actualizada');
    setTimeout(() => setPromoMessage(''), 2800);
  };

  const handleToggleGiveawayActive = () => {
    const nextActive = !giveawayForm.active;
    setGiveawayForm((prev) => ({ ...prev, active: nextActive }));
    updateGiveaway({ active: nextActive });
  };

  const handleAddCouponSubmit = (e) => {
    e.preventDefault();
    const cleanCode = couponForm.code.trim().toUpperCase();
    if (!cleanCode) return;

    const discountVal =
      couponForm.type === 'percentage'
        ? Number(couponForm.discount) / 100
        : Number(couponForm.discount);

    addCoupon({
      code: cleanCode,
      discount: discountVal,
      type: couponForm.type,
      label: couponForm.label.trim() || `${cleanCode} Descuento`,
      minPurchase: Number(couponForm.minPurchase) || 0,
      active: true,
    });

    setCouponForm({
      code: '',
      discount: 10,
      type: 'percentage',
      label: '',
      minPurchase: '',
    });
    setPromoMessage(`Cupón ${cleanCode} creado`);
    setTimeout(() => setPromoMessage(''), 2800);
  };

  const navItems = [
    { id: 'sorteo', label: 'Pedidos y Sorteo', icon: 'receipt_long' },
    { id: 'carta', label: 'Carta', icon: 'restaurant_menu' },
    { id: 'ingredientes', label: 'Ingredientes', icon: 'inventory_2' },
    { id: 'balance', label: 'Balance', icon: 'account_balance_wallet' },
    { id: 'ganancias', label: 'Ingresos', icon: 'trending_up' },
    { id: 'gastos', label: 'Gastos', icon: 'trending_down' },
    { id: 'promociones', label: 'Promociones', icon: 'campaign' },
  ];

  const earningsList = finances.filter((f) => f.type === 'earning');
  const expensesList = finances.filter((f) => f.type === 'expense');

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-cartoon-ink flex flex-col md:flex-row select-none">
      {/* BARRA LATERAL ESCRITORIO ESTILO CARTOON */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col bg-white border-r-3 border-cartoon-ink p-5 justify-between sticky top-0 h-screen shadow-cartoon-xs">
        <div>
          <div className="flex items-center gap-3 pb-5 border-b-2 border-cartoon-ink/15">
            <div className="w-11 h-11 rounded-2xl bg-white border-2 border-cartoon-ink shadow-cartoon-xs p-1 flex items-center justify-center flex-shrink-0">
              <img src="/assets/logo.svg?v=4" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="font-display text-xl text-cartoon-ink leading-none">TRICO'S</h2>
              <span className="font-sub font-bold text-[11px] text-gray-500 uppercase tracking-wider mt-1 block">
                Panel de Control
              </span>
            </div>
          </div>

          <nav className="mt-5 space-y-1.5">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-sub font-bold text-xs transition-all cursor-pointer border-2 ${
                    active
                      ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-display text-sm'
                      : 'text-cartoon-ink/75 hover:bg-cartoon-cream hover:text-cartoon-ink border-transparent'
                  }`}
                >
                  <Icon name={item.icon} size={19} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 pt-4 border-t-2 border-cartoon-ink/15">
          <button
            onClick={onGoToStore}
            className="btn-cartoon-white w-full py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Icon name="storefront" size={16} />
            <span>Ver Tienda</span>
          </button>
          <button
            onClick={() => {
              clearSession();
              onLogout();
            }}
            className="btn-cartoon-red w-full py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Icon name="logout" size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* CABECERA MÓVIL ESTILO CARTOON */}
      <header className="md:hidden bg-white border-b-3 border-cartoon-ink px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white border-2 border-cartoon-ink shadow-cartoon-xs p-1 flex items-center justify-center">
            <img src="/assets/logo.svg?v=4" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-display text-base text-cartoon-ink">TRICO'S ADMIN</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onGoToStore}
            className="btn-cartoon-white px-2.5 py-1.5 text-xs flex items-center gap-1 cursor-pointer"
          >
            <Icon name="storefront" size={15} />
            <span>Tienda</span>
          </button>
          <button
            onClick={() => {
              clearSession();
              onLogout();
            }}
            className="btn-cartoon-red p-1.5 rounded-xl cursor-pointer"
            aria-label="Salir"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-32 md:pb-8 max-w-6xl w-full mx-auto">
        {/* ============================================================== */}
        {/* PESTAÑA: PEDIDOS, ESTADOS Y SORTEO */}
        {/* ============================================================== */}
        {activeTab === 'sorteo' && (
          <LotteryOrdersSection
            orders={orders}
            giveaway={giveawayForm}
            onDeleteOrder={deleteOrder}
            onToggleWinner={toggleOrderWinner}
            onAddManualOrder={addOrder}
          />
        )}

        {/* ============================================================== */}
        {/* PESTAÑA: CARTA DE PRODUCTOS CON KILL-SWITCH DE AGOTADO */}
        {/* ============================================================== */}
        {activeTab === 'carta' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-xl sm:text-2xl text-cartoon-ink">
                  Carta de Productos
                </h3>
                <p className="font-sub font-semibold text-xs sm:text-sm text-gray-500 mt-0.5">
                  Marcá un plato como Agotado o Disponible con un solo clic. El stock se descuenta de los ingredientes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setModalOpen(true);
                }}
                className="btn-cartoon-primary text-xs sm:text-sm py-2.5 px-4 self-start sm:self-auto flex items-center gap-2"
              >
                <Icon name="add" size={18} />
                <span>Agregar Producto</span>
              </button>
            </div>

            {/* Buscador y Filtro de Categoría */}
            <div className="bg-white p-4 rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative flex-1">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center">
                  <Icon name="search" size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Buscar producto en la carta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-2 rounded-2xl font-sub font-bold text-xs whitespace-nowrap cursor-pointer transition-all border-2 ${
                        active
                          ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-display'
                          : 'bg-white text-cartoon-ink/75 hover:bg-cartoon-cream border-cartoon-ink/20'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grilla de Productos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredProducts.map((prod) => {
                const isDirectlyPaused = prod.active === false;
                const isOutByIng = !isDirectlyPaused && isProductOutOfStock(prod);
                const isUnavailable = isDirectlyPaused || isOutByIng;
                const price = prod.variants?.[0]?.price || prod.price || 0;
                const priceDouble = prod.variants?.[1]?.price || null;
                const isUploading = uploadingCardId === prod.id;

                return (
                  <div
                    key={prod.id}
                    className={`bg-white rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs p-4 flex flex-col justify-between gap-3 transition-all ${
                      isUnavailable ? 'bg-rose-50/30 border-rose-300' : ''
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => {
                        cardFileInputRefs.current[prod.id] = el;
                      }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCardImageUpload(prod, file);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />

                    <div>
                      {/* Imagen con opción rápida de cambio */}
                      <div
                        onClick={() => cardFileInputRefs.current[prod.id]?.click()}
                        className="relative w-full h-38 sm:h-40 rounded-2xl bg-cartoon-cream border-2 border-cartoon-ink/30 overflow-hidden mb-3 cursor-pointer group"
                      >
                        {prod.image ? (
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                            <Icon name="add_photo_alternate" size={28} />
                            <span className="font-sub font-bold text-xs mt-1">Subir foto</span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="btn-cartoon-white py-1.5 px-3 text-xs">
                            {isUploading ? 'Subiendo...' : 'Cambiar foto'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-display text-base text-cartoon-ink truncate">
                            {prod.name}
                          </h4>
                          <p className="font-sub text-xs text-gray-500 line-clamp-1 mt-0.5">
                            {prod.description || 'Sin descripción'}
                          </p>
                        </div>

                        {/* Botón Kill-Switch de 1 Clic: Disponible vs Agotado */}
                        <button
                          type="button"
                          onClick={() => toggleActive(prod.id, prod.active !== false)}
                          className={`px-3 py-1.5 rounded-xl font-sub font-bold text-xs cursor-pointer transition-all flex-shrink-0 border-2 ${
                            isUnavailable
                              ? 'bg-cartoon-red text-white border-cartoon-ink shadow-cartoon-xs'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-400 hover:bg-emerald-200'
                          }`}
                          title="Marcar producto como Agotado o Disponible con un clic"
                        >
                          {isDirectlyPaused
                            ? 'Agotado'
                            : isOutByIng
                            ? 'Falta Insumo'
                            : 'Disponible'}
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t-2 border-cartoon-ink/15 flex items-center justify-between gap-2">
                      <div className="font-display text-base text-cartoon-ink">
                        {money(price)}
                        {priceDouble && (
                          <span className="font-sub text-xs text-gray-500 font-normal ml-1">
                            / Doble {money(priceDouble)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(prod);
                            setModalOpen(true);
                          }}
                          className="btn-cartoon-white py-1.5 px-3 text-xs"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(prod)}
                          className="p-2 rounded-xl text-gray-400 hover:text-cartoon-red hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer"
                          title="Eliminar de la carta"
                        >
                          <Icon name="delete" size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA: INGREDIENTES Y RECETAS */}
        {/* ============================================================== */}
        {activeTab === 'ingredientes' && (
          <IngredientsSection
            ingredients={ingredients}
            products={products}
          />
        )}

        {/* ============================================================== */}
        {/* PESTAÑA: BALANCE FINANCIERO */}
        {/* ============================================================== */}
        {activeTab === 'balance' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="font-display text-xl sm:text-2xl text-cartoon-ink">
                Resumen Financiero
              </h3>
              <p className="font-sub font-semibold text-xs sm:text-sm text-gray-500 mt-0.5">
                Estado general de ingresos, gastos y rentabilidad neta del negocio.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs">
                <span className="font-sub font-bold text-xs text-emerald-700 uppercase tracking-wider block">
                  Ingresos Totales
                </span>
                <p className="font-display text-3xl sm:text-4xl text-emerald-600 mt-1">
                  {money(financialTotals.totalEarnings)}
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs">
                <span className="font-sub font-bold text-xs text-rose-700 uppercase tracking-wider block">
                  Gastos Totales
                </span>
                <p className="font-display text-3xl sm:text-4xl text-cartoon-red mt-1">
                  {money(financialTotals.totalExpenses)}
                </p>
              </div>

              <div className="bg-cartoon-yellow text-cartoon-ink p-5 rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon">
                <span className="font-sub font-bold text-xs text-cartoon-ink/80 uppercase tracking-wider block">
                  Balance Neto
                </span>
                <p className="font-display text-3xl sm:text-4xl text-cartoon-ink mt-1">
                  {money(financialTotals.netBalance)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs overflow-hidden">
              <div className="px-5 py-4 bg-cartoon-cream/50 border-b-2 border-cartoon-ink/15 flex items-center justify-between">
                <h4 className="font-display text-base text-cartoon-ink">Últimos Movimientos</h4>
                <span className="font-sub font-bold text-xs text-gray-500">{finances.length} registros</span>
              </div>

              <div className="divide-y-2 divide-cartoon-ink/10">
                {finances.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 font-sub text-sm">
                    No hay movimientos financieros registrados aún.
                  </div>
                ) : (
                  finances.slice(0, 12).map((item) => (
                    <div key={item.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-sub font-bold text-sm text-cartoon-ink truncate">
                          {item.concept}
                        </p>
                        <span className="font-sub text-xs text-gray-400">{item.date}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-display text-sm sm:text-base ${
                            item.type === 'earning' ? 'text-emerald-600' : 'text-cartoon-red'
                          }`}
                        >
                          {item.type === 'earning' ? '+' : '-'}
                          {money(item.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteFinance(item.id)}
                          className="text-gray-300 hover:text-cartoon-red p-1 cursor-pointer transition-colors"
                          title="Eliminar movimiento"
                        >
                          <Icon name="delete" size={17} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA: INGRESOS */}
        {/* ============================================================== */}
        {activeTab === 'ganancias' && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="font-display text-xl sm:text-2xl text-cartoon-ink">Registro de Ingresos</h3>

            <form
              onSubmit={handleAddEarningSubmit}
              className="bg-white p-5 rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs grid grid-cols-1 sm:grid-cols-4 gap-3.5 items-end"
            >
              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                  Monto ($)
                </label>
                <input
                  type="number"
                  required
                  value={earningForm.amount}
                  onChange={(e) => setEarningForm({ ...earningForm, amount: e.target.value })}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                  Concepto
                </label>
                <input
                  type="text"
                  required
                  value={earningForm.concept}
                  onChange={(e) => setEarningForm({ ...earningForm, concept: e.target.value })}
                  placeholder="Ej: Venta presencial o evento"
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                />
              </div>
              <button type="submit" className="btn-cartoon-green py-2.5 text-xs sm:text-sm">
                Registrar Ingreso
              </button>
            </form>

            <div className="bg-white rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs divide-y-2 divide-cartoon-ink/10">
              {earningsList.length === 0 ? (
                <div className="p-8 text-center text-gray-400 font-sub text-sm">
                  No hay ingresos cargados.
                </div>
              ) : (
                earningsList.map((item) => (
                  <div key={item.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="font-sub font-bold text-sm text-cartoon-ink">{item.concept}</p>
                      <span className="font-sub text-xs text-gray-400">{item.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-base text-emerald-600">+{money(item.amount)}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteFinance(item.id)}
                        className="text-gray-300 hover:text-cartoon-red p-1 cursor-pointer transition-colors"
                        title="Eliminar"
                      >
                        <Icon name="delete" size={17} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA: GASTOS */}
        {/* ============================================================== */}
        {activeTab === 'gastos' && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="font-display text-xl sm:text-2xl text-cartoon-ink">Registro de Gastos</h3>

            <form
              onSubmit={handleAddExpenseSubmit}
              className="bg-white p-5 rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs grid grid-cols-1 sm:grid-cols-4 gap-3.5 items-end"
            >
              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                  Monto ($)
                </label>
                <input
                  type="number"
                  required
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                  Concepto
                </label>
                <input
                  type="text"
                  required
                  value={expenseForm.concept}
                  onChange={(e) => setExpenseForm({ ...expenseForm, concept: e.target.value })}
                  placeholder="Ej: Compra de insumos, packaging, etc."
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                />
              </div>
              <button type="submit" className="btn-cartoon-red py-2.5 text-xs sm:text-sm">
                Registrar Gasto
              </button>
            </form>

            <div className="bg-white rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs divide-y-2 divide-cartoon-ink/10">
              {expensesList.length === 0 ? (
                <div className="p-8 text-center text-gray-400 font-sub text-sm">
                  No hay gastos cargados.
                </div>
              ) : (
                expensesList.map((item) => (
                  <div key={item.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="font-sub font-bold text-sm text-cartoon-ink">{item.concept}</p>
                      <span className="font-sub text-xs text-gray-400">{item.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-base text-cartoon-red">-{money(item.amount)}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteFinance(item.id)}
                        className="text-gray-300 hover:text-cartoon-red p-1 cursor-pointer transition-colors"
                        title="Eliminar"
                      >
                        <Icon name="delete" size={17} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA: PROMOCIONES Y SORTEO */}
        {/* ============================================================== */}
        {activeTab === 'promociones' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="font-display text-xl sm:text-2xl text-cartoon-ink">
                Configuración de Sorteo y Cupones
              </h3>
              <p className="font-sub font-semibold text-xs sm:text-sm text-gray-500 mt-0.5">
                Administrá el sorteo de la tienda y creá cupones de descuento.
              </p>
            </div>

            {promoMessage && (
              <div className="p-3.5 rounded-2xl bg-cartoon-yellow text-cartoon-ink border-2 border-cartoon-ink shadow-cartoon-xs font-sub font-bold text-xs flex items-center gap-2">
                <Icon name="check_circle" size={18} />
                <span>{promoMessage}</span>
              </div>
            )}

            {/* Configuración del Sorteo */}
            <div className="bg-white rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3.5 border-b-2 border-cartoon-ink/15">
                <div>
                  <h4 className="font-display text-lg text-cartoon-ink">Sorteo Oficial</h4>
                  <span className="font-sub text-xs text-gray-500">
                    Visible en la página principal y conectado con la ruleta
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleGiveawayActive}
                  className={`px-3.5 py-1.5 rounded-2xl font-sub font-bold text-xs cursor-pointer border-2 transition-all ${
                    giveawayForm.active
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                      : 'bg-gray-100 text-gray-500 border-gray-300'
                  }`}
                >
                  {giveawayForm.active ? 'Sorteo Activo' : 'Sorteo Pausado'}
                </button>
              </div>

              <form onSubmit={handleSaveGiveawaySubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-sub font-bold text-xs text-cartoon-ink block mb-1">
                    Título del Sorteo
                  </label>
                  <input
                    type="text"
                    value={giveawayForm.title}
                    onChange={(e) => setGiveawayForm({ ...giveawayForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                  />
                </div>

                <div>
                  <label className="font-sub font-bold text-xs text-cartoon-ink block mb-1">
                    Fecha del Sorteo
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={giveawayForm.drawDate}
                      onChange={(e) => setGiveawayForm({ ...giveawayForm, drawDate: e.target.value })}
                      className="flex-1 px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                    />
                    <button type="submit" className="btn-cartoon-primary py-2.5 px-4 text-xs">
                      Guardar
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Cupones de Descuento */}
            <div className="bg-white rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs p-5 sm:p-6 space-y-4">
              <h4 className="font-display text-lg text-cartoon-ink">Cupones de Descuento</h4>

              <form onSubmit={handleAddCouponSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 items-end">
                <div>
                  <label className="font-sub font-bold text-xs text-cartoon-ink block mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    required
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                    placeholder="TRICO10"
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink uppercase focus:outline-none focus:border-cartoon-ink"
                  />
                </div>

                <div>
                  <label className="font-sub font-bold text-xs text-cartoon-ink block mb-1">
                    Descuento (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={couponForm.discount}
                    onChange={(e) => setCouponForm({ ...couponForm, discount: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                  />
                </div>

                <div>
                  <label className="font-sub font-bold text-xs text-cartoon-ink block mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={couponForm.label}
                    onChange={(e) => setCouponForm({ ...couponForm, label: e.target.value })}
                    placeholder="Descuento especial"
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                  />
                </div>

                <button type="submit" className="btn-cartoon-primary py-2.5 text-xs sm:text-sm">
                  Crear Cupón
                </button>
              </form>

              <div className="divide-y-2 divide-cartoon-ink/10">
                {(promoData?.coupons || []).map((c) => (
                  <div key={c.code} className="py-3.5 flex items-center justify-between">
                    <div>
                      <span className="font-display text-sm text-cartoon-ink">{c.code}</span>
                      <span className="font-sub text-xs text-gray-500 ml-2">{c.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCouponActive(c.code)}
                        className={`px-3 py-1 rounded-xl font-sub font-bold text-xs cursor-pointer border ${
                          c.active !== false
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-gray-100 text-gray-500 border-gray-300'
                        }`}
                      >
                        {c.active !== false ? 'Activo' : 'Pausado'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCoupon(c.code)}
                        className="text-gray-300 hover:text-cartoon-red p-1 cursor-pointer transition-colors"
                        title="Eliminar cupón"
                      >
                        <Icon name="delete" size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* DRAWER / MODAL "MÁS" PARA MÓVIL ESTILO CARTOON */}
      {isMoreMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl border-t-3 border-x-3 border-cartoon-ink p-5 pb-8 space-y-3.5 shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b-2 border-cartoon-ink/15">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cartoon-yellow border-2 border-cartoon-ink flex items-center justify-center">
                  <Icon name="apps" size={18} className="text-cartoon-ink" />
                </div>
                <span className="font-display text-lg text-cartoon-ink">Más opciones</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 border-2 border-cartoon-ink flex items-center justify-center text-cartoon-ink cursor-pointer"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {[
                {
                  id: 'ganancias',
                  label: 'Ingresos',
                  desc: 'Registros y entradas manuales',
                  icon: 'trending_up',
                  color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
                },
                {
                  id: 'gastos',
                  label: 'Gastos',
                  desc: 'Control de compras y costos',
                  icon: 'trending_down',
                  color: 'text-rose-700 bg-rose-50 border-rose-300',
                },
                {
                  id: 'promociones',
                  label: 'Promos & Sorteo',
                  desc: 'Premios, ruleta y cupones',
                  icon: 'campaign',
                  color: 'text-amber-800 bg-amber-50 border-amber-300',
                },
              ].map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMoreMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                      active
                        ? 'bg-cartoon-yellow border-cartoon-ink shadow-cartoon-xs text-cartoon-ink font-display'
                        : 'bg-white border-cartoon-ink/20 hover:border-cartoon-ink text-cartoon-ink font-sub font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center ${item.color}`}>
                        <Icon name={item.icon} size={20} />
                      </div>
                      <div className="text-left">
                        <span className="font-display text-sm block leading-tight">{item.label}</span>
                        <span className="font-sub text-xs text-gray-500 font-normal">{item.desc}</span>
                      </div>
                    </div>
                    <Icon name="chevron_right" size={18} className="text-gray-400" />
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t-2 border-cartoon-ink/15 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onGoToStore();
                }}
                className="btn-cartoon-white py-2.5 px-3 text-xs flex items-center justify-center gap-1.5"
              >
                <Icon name="storefront" size={16} />
                <span>Ver Tienda</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  clearSession();
                  onLogout();
                }}
                className="btn-cartoon-red py-2.5 px-3 text-xs flex items-center justify-center gap-1.5"
              >
                <Icon name="logout" size={16} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAVEGACIÓN INFERIOR MÓVIL ESTILO CARTOON (5 SLOTS CON BALANCE CENTRAL ELEVADO) */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-3 border-cartoon-ink shadow-[0_-4px_20px_rgba(30,27,24,0.12)] px-2 pt-1 pb-safe"
      >
        <div className="flex items-center justify-between relative max-w-md mx-auto">
          {/* Slot 1: Pedidos */}
          <button
            type="button"
            onClick={() => setActiveTab('sorteo')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer flex-1 ${
              activeTab === 'sorteo'
                ? 'text-cartoon-ink font-bold'
                : 'text-gray-500 hover:text-cartoon-ink'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                activeTab === 'sorteo'
                  ? 'bg-cartoon-yellow border-2 border-cartoon-ink shadow-cartoon-xs'
                  : ''
              }`}
            >
              <Icon name="receipt_long" size={20} />
            </div>
            <span className="font-sub font-bold text-[10px] mt-0.5 whitespace-nowrap">Pedidos</span>
          </button>

          {/* Slot 2: Carta */}
          <button
            type="button"
            onClick={() => setActiveTab('carta')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer flex-1 ${
              activeTab === 'carta'
                ? 'text-cartoon-ink font-bold'
                : 'text-gray-500 hover:text-cartoon-ink'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                activeTab === 'carta'
                  ? 'bg-cartoon-yellow border-2 border-cartoon-ink shadow-cartoon-xs'
                  : ''
              }`}
            >
              <Icon name="restaurant_menu" size={20} />
            </div>
            <span className="font-sub font-bold text-[10px] mt-0.5 whitespace-nowrap">Carta</span>
          </button>

          {/* Slot 3: BALANCE (BOTÓN CENTRAL DESTACADO SOBRESALIENDO ARRIBA) */}
          <div className="flex-1 flex flex-col items-center justify-center -mt-7 relative z-10">
            <button
              type="button"
              onClick={() => setActiveTab('balance')}
              aria-label="Balance Financiero"
              className={`w-14 h-14 rounded-full flex items-center justify-center border-3 border-cartoon-ink shadow-cartoon transition-all transform active:scale-95 cursor-pointer ${
                activeTab === 'balance'
                  ? 'bg-cartoon-yellow text-cartoon-ink ring-4 ring-cartoon-yellow/40 scale-105'
                  : 'bg-white text-cartoon-ink hover:bg-cartoon-cream'
              }`}
            >
              <Icon name="account_balance_wallet" size={24} />
            </button>
            <span
              className={`font-display text-[10px] uppercase font-bold tracking-wider mt-1 ${
                activeTab === 'balance' ? 'text-cartoon-ink' : 'text-gray-600'
              }`}
            >
              Balance
            </span>
          </div>

          {/* Slot 4: Stock / Ingredientes */}
          <button
            type="button"
            onClick={() => setActiveTab('ingredientes')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer flex-1 ${
              activeTab === 'ingredientes'
                ? 'text-cartoon-ink font-bold'
                : 'text-gray-500 hover:text-cartoon-ink'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                activeTab === 'ingredientes'
                  ? 'bg-cartoon-yellow border-2 border-cartoon-ink shadow-cartoon-xs'
                  : ''
              }`}
            >
              <Icon name="inventory_2" size={20} />
            </div>
            <span className="font-sub font-bold text-[10px] mt-0.5 whitespace-nowrap">Stock</span>
          </button>

          {/* Slot 5: Más */}
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer flex-1 ${
              ['ganancias', 'gastos', 'promociones'].includes(activeTab) || isMoreMenuOpen
                ? 'text-cartoon-ink font-bold'
                : 'text-gray-500 hover:text-cartoon-ink'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                ['ganancias', 'gastos', 'promociones'].includes(activeTab) || isMoreMenuOpen
                  ? 'bg-cartoon-yellow border-2 border-cartoon-ink shadow-cartoon-xs'
                  : ''
              }`}
            >
              <Icon name="more_horiz" size={20} />
            </div>
            <span className="font-sub font-bold text-[10px] mt-0.5 whitespace-nowrap">Más</span>
          </button>
        </div>
      </nav>

      {/* Modal Producto */}
      <ProductModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSave={saveProduct}
      />

      {/* Modal Confirmar Borrado de Producto */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="relative w-full max-w-xs bg-white rounded-3xl border-3 border-cartoon-ink shadow-cartoon p-6 text-center space-y-4 my-auto animate-modalIn">
            <h3 className="font-display text-base text-cartoon-ink">Eliminar producto</h3>
            <p className="font-sub text-xs text-gray-600">
              ¿Confirmás eliminar <strong>{deleteCandidate.name}</strong> de la carta?
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="btn-cartoon-white py-2 px-4 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(deleteCandidate.id);
                  setDeleteCandidate(null);
                }}
                className="btn-cartoon-red py-2 px-4 text-xs"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
