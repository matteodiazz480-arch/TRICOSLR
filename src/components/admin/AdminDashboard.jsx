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
  clearAllFinances,
} from '../../lib/financesStore';
import {
  getPromotions,
  subscribeToPromotions,
  updateGiveaway,
  deleteGiveaway,
  restoreGiveaway,
  addCoupon,
  deleteCoupon,
  toggleCouponActive,
  DEFAULT_PROMOTIONS_DATA,
} from '../../lib/promotionsStore';
import { compressImageFile } from '../../lib/imageCompressor';
import { LotteryOrdersSection } from './LotteryOrdersSection';
import { IngredientsSection } from './IngredientsSection';
import { GiveawayAdminModal } from './GiveawayAdminModal';
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

  const handleResetBalance = async () => {
    if (window.confirm('¿Seguro que querés reiniciar el balance a $0? Esto eliminará todos los registros de ingresos y gastos guardados.')) {
      setFinances([]);
      await clearAllFinances();
    }
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
  const [isGiveawayModalOpen, setIsGiveawayModalOpen] = useState(false);

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
  const pendingOrdersCount = orders.filter((o) => {
    const s = String(o.status || '').toLowerCase();
    return !s || s === 'pendiente' || s === 'confirmado';
  }).length;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-cartoon-ink flex flex-col md:flex-row select-none">
      {/* BARRA LATERAL ESCRITORIO ESTILO CARTOON - Totalmente adaptable a laptops y monitores */}
      <aside className="hidden md:flex md:w-56 lg:w-60 xl:w-64 flex-col bg-white border-r-3 border-cartoon-ink p-4 lg:p-5 justify-between sticky top-0 h-screen overflow-y-auto cartoon-scrollbar shadow-cartoon-xs flex-shrink-0">
        <div>
          <div className="flex items-center gap-3 pb-4 border-b-2 border-cartoon-ink/15">
            <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-2xl bg-white border-2 border-cartoon-ink shadow-cartoon-xs p-1 flex items-center justify-center flex-shrink-0">
              <img src="/assets/logo.svg?v=4" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="font-display text-lg lg:text-xl text-cartoon-ink leading-none">TRICO'S</h2>
              <span className="font-sub font-bold text-[10px] lg:text-[11px] text-gray-500 uppercase tracking-wider mt-1 block">
                Panel de Control
              </span>
            </div>
          </div>

          <nav className="mt-4 space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 lg:px-3.5 lg:py-2.5 rounded-2xl font-sub font-bold text-xs transition-all cursor-pointer border-2 ${
                    active
                      ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-display text-sm'
                      : 'text-cartoon-ink/75 hover:bg-cartoon-cream hover:text-cartoon-ink border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 lg:gap-3">
                    <Icon name={item.icon} size={18} />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'sorteo' && pendingOrdersCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-cartoon-red text-white font-display text-[10px] border border-cartoon-ink">
                      {pendingOrdersCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 pt-3 border-t-2 border-cartoon-ink/15">
          <button
            onClick={onGoToStore}
            className="btn-cartoon-white w-full py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Icon name="storefront" size={15} />
            <span>Ver Tienda</span>
          </button>
          <button
            onClick={() => {
              clearSession();
              onLogout();
            }}
            className="btn-cartoon-red w-full py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Icon name="logout" size={15} />
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

      {/* CONTENIDO PRINCIPAL - Adaptación responsive amplia sin efecto aplastado */}
      <main className="flex-1 p-3.5 sm:p-5 lg:p-6 xl:p-8 pb-32 md:pb-24 max-w-7xl w-full mx-auto min-w-0">
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

            {/* Grilla de Productos (2 columnas en celular, 3 en escritorio) */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-5">
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
                    className={`bg-white rounded-2xl sm:rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs p-2.5 sm:p-4 flex flex-col justify-between gap-2 sm:gap-3 transition-all overflow-hidden ${
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
                        className="relative w-full h-24 sm:h-38 rounded-xl sm:rounded-2xl bg-cartoon-cream border-2 border-cartoon-ink/20 overflow-hidden mb-1.5 sm:mb-3 cursor-pointer group"
                      >
                        {prod.image ? (
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                            <Icon name="add_photo_alternate" size={22} className="sm:scale-125" />
                            <span className="font-sub font-bold text-[10px] sm:text-xs mt-0.5">Subir foto</span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="btn-cartoon-white py-1 px-2 text-[10px] sm:text-xs">
                            {isUploading ? '...' : 'Cambiar'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-1 sm:gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-display text-xs sm:text-base text-cartoon-ink truncate leading-tight">
                            {prod.name}
                          </h4>
                          <p className="font-sub text-[10px] sm:text-xs text-gray-500 line-clamp-1 mt-0.5">
                            {prod.description || 'Sin descripción'}
                          </p>
                        </div>

                        {/* Botón Kill-Switch de 1 Clic: Disponible vs Agotado */}
                        <button
                          type="button"
                          onClick={() => toggleActive(prod.id, prod.active !== false)}
                          className={`px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl font-sub font-bold text-[9px] sm:text-xs cursor-pointer transition-all flex-shrink-0 border-1.5 sm:border-2 ${
                            isUnavailable
                              ? 'bg-cartoon-red text-white border-cartoon-ink'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-400 hover:bg-emerald-200'
                          }`}
                          title="Marcar producto como Agotado o Disponible con un clic"
                        >
                          {isDirectlyPaused
                            ? 'Agotado'
                            : isOutByIng
                            ? 'Falta'
                            : 'Activo'}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 sm:pt-3 border-t-1.5 sm:border-t-2 border-cartoon-ink/15 flex items-center justify-between gap-1">
                      <div className="font-display text-xs sm:text-base text-cartoon-ink truncate min-w-0 flex-1">
                        {money(price)}
                        {priceDouble && (
                          <span className="font-sub text-[9px] sm:text-xs text-gray-500 font-normal ml-0.5 block sm:inline">
                            / 2x {money(priceDouble)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(prod);
                            setModalOpen(true);
                          }}
                          className="btn-cartoon-white py-1 px-1.5 sm:py-1.5 sm:px-3 text-[10px] sm:text-xs"
                          title="Editar"
                        >
                          <span className="hidden sm:inline">Editar</span>
                          <Icon name="edit" size={13} className="sm:hidden" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(prod)}
                          className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl text-gray-400 hover:text-cartoon-red hover:bg-rose-50 cursor-pointer"
                          title="Eliminar de la carta"
                        >
                          <Icon name="delete" size={14} />
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

            {/* Aviso directo de pedidos en tiempo real con acceso de un clic */}
            <div className="bg-cartoon-yellow/20 border-2 sm:border-3 border-cartoon-ink rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-cartoon-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cartoon-yellow border-2 border-cartoon-ink flex items-center justify-center flex-shrink-0 shadow-cartoon-xs">
                  <Icon name="receipt_long" size={20} className="text-cartoon-ink" />
                </div>
                <div>
                  <h4 className="font-display text-sm text-cartoon-ink">
                    {orders.length} pedidos registrados en Firestore
                  </h4>
                  <p className="font-sub font-semibold text-xs text-gray-600">
                    {pendingOrdersCount} pedidos activos listados en el panel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('sorteo')}
                className="btn-cartoon-primary text-xs py-2 px-4 self-start sm:self-auto flex items-center gap-1.5"
              >
                <span>Ver pedidos y sorteo</span>
                <Icon name="arrow_forward" size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs overflow-hidden">
                <span className="font-sub font-bold text-xs text-emerald-700 uppercase tracking-wider block truncate">
                  Ingresos Totales
                </span>
                <p className="font-display text-3xl sm:text-4xl text-emerald-600 mt-1 truncate">
                  {money(financialTotals.totalEarnings)}
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs overflow-hidden">
                <span className="font-sub font-bold text-xs text-rose-700 uppercase tracking-wider block truncate">
                  Gastos Totales
                </span>
                <p className="font-display text-3xl sm:text-4xl text-cartoon-red mt-1 truncate">
                  {money(financialTotals.totalExpenses)}
                </p>
              </div>

              <div className="bg-cartoon-yellow text-cartoon-ink p-5 rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon overflow-hidden">
                <span className="font-sub font-bold text-xs text-cartoon-ink/80 uppercase tracking-wider block truncate">
                  Balance Neto
                </span>
                <p className="font-display text-3xl sm:text-4xl text-cartoon-ink mt-1 truncate">
                  {money(financialTotals.netBalance)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs overflow-hidden">
              <div className="px-5 py-4 bg-cartoon-cream/50 border-b-2 border-cartoon-ink/15 flex items-center justify-between">
                <h4 className="font-display text-base text-cartoon-ink">Últimos Movimientos</h4>
                <div className="flex items-center gap-2">
                  <span className="font-sub font-bold text-xs text-gray-500">{finances.length} registros</span>
                  {finances.length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetBalance}
                      className="px-2.5 py-1 rounded-xl bg-white border border-cartoon-ink/20 font-sub font-bold text-[11px] text-cartoon-red hover:bg-rose-50 cursor-pointer"
                      title="Reiniciar balance y vaciar registros a $0"
                    >
                      Reiniciar a $0
                    </button>
                  )}
                </div>
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

            {/* Configuración del Sorteo Oficial con Modal Flotante */}
            <div className="bg-white rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b-2 border-cartoon-ink/15">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display text-lg sm:text-xl text-cartoon-ink">Sorteo Oficial</h4>
                    {promoData?.giveaway?.deleted ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 font-sub font-bold text-[10px] uppercase">
                        Eliminado (Oculto en web)
                      </span>
                    ) : promoData?.giveaway?.active !== false ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-sub font-bold text-[10px] uppercase">
                        Activo en Web
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300 font-sub font-bold text-[10px] uppercase">
                        Pausado
                      </span>
                    )}
                  </div>
                  <span className="font-sub text-xs text-gray-500 mt-0.5 block">
                    Conectado con la ruleta de pedidos y la página pública de promociones.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGiveawayModalOpen(true)}
                    className="btn-cartoon-primary py-2.5 px-4 text-xs sm:text-sm flex items-center gap-2"
                  >
                    <Icon name="tune" size={17} />
                    <span>Administrar Sorteo</span>
                  </button>
                </div>
              </div>

              {/* Métricas y Resumen Rápido del Sorteo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded-2xl bg-cartoon-cream/60 border border-cartoon-ink/20">
                  <span className="font-sub font-bold text-[10px] text-gray-500 uppercase block">Título</span>
                  <span className="font-display text-xs sm:text-sm text-cartoon-ink truncate block mt-0.5">
                    {promoData?.giveaway?.title || "GRAN SORTEO TRICO'S"}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-cartoon-cream/60 border border-cartoon-ink/20">
                  <span className="font-sub font-bold text-[10px] text-gray-500 uppercase block">Finalización</span>
                  <span className="font-display text-xs sm:text-sm text-cartoon-ink truncate block mt-0.5">
                    {promoData?.giveaway?.drawDate || 'Fin de mes'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-cartoon-cream/60 border border-cartoon-ink/20">
                  <span className="font-sub font-bold text-[10px] text-gray-500 uppercase block">Premios en Juego</span>
                  <span className="font-display text-xs sm:text-sm text-cartoon-ink truncate block mt-0.5">
                    {(promoData?.giveaway?.prizes || DEFAULT_PROMOTIONS_DATA.giveaway.prizes).length} premios
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-cartoon-cream/60 border border-cartoon-ink/20">
                  <span className="font-sub font-bold text-[10px] text-gray-500 uppercase block">Ganadores</span>
                  <span className="font-display text-xs sm:text-sm text-cartoon-ink truncate block mt-0.5">
                    {orders.filter((o) => o.isWinner).length} / {promoData?.giveaway?.winnersCount || 4} asignados
                  </span>
                </div>
              </div>
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
                  <div key={c.code} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 truncate">
                      <span className="font-display text-sm text-cartoon-ink">{c.code}</span>
                      <span className="font-sub text-xs text-gray-500 ml-2">{c.label}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
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

      {/* NAVEGACIÓN INFERIOR MÓVIL ESTILO CARTOON (5 SLOTS CON BALANCE CENTRAL ELEVADO - SIN SOMBRA) */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2.5 border-cartoon-ink pb-safe"
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto relative px-1">
          {/* Slot 1: Pedidos */}
          <button
            type="button"
            onClick={() => setActiveTab('sorteo')}
            className={`relative flex flex-col items-center justify-center h-full py-1 cursor-pointer transition-colors ${
              activeTab === 'sorteo' ? 'text-cartoon-ink' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div
              className={`relative p-1 rounded-xl transition-all ${
                activeTab === 'sorteo'
                  ? 'bg-cartoon-yellow text-cartoon-ink border-2 border-cartoon-ink'
                  : ''
              }`}
            >
              <Icon name="receipt_long" size={20} />
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-cartoon-red text-white font-display text-[9px] flex items-center justify-center border border-cartoon-ink">
                  {pendingOrdersCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] mt-1 whitespace-nowrap leading-none ${
                activeTab === 'sorteo' ? 'font-display text-cartoon-ink' : 'font-sub font-bold'
              }`}
            >
              Pedidos
            </span>
          </button>

          {/* Slot 2: Carta */}
          <button
            type="button"
            onClick={() => setActiveTab('carta')}
            className={`relative flex flex-col items-center justify-center h-full py-1 cursor-pointer transition-colors ${
              activeTab === 'carta' ? 'text-cartoon-ink' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                activeTab === 'carta'
                  ? 'bg-cartoon-yellow text-cartoon-ink border-2 border-cartoon-ink'
                  : ''
              }`}
            >
              <Icon name="restaurant_menu" size={20} />
            </div>
            <span
              className={`text-[10px] mt-1 whitespace-nowrap leading-none ${
                activeTab === 'carta' ? 'font-display text-cartoon-ink' : 'font-sub font-bold'
              }`}
            >
              Carta
            </span>
          </button>

          {/* Slot 3: BALANCE (CENTRAL ELEVADO - TOTALMENTE ALINEADO - SIN SOMBRA) */}
          <div className="relative flex flex-col items-center justify-end h-full pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('balance')}
              aria-label="Balance Financiero"
              className={`absolute -top-3.5 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border-2.5 border-cartoon-ink flex items-center justify-center cursor-pointer transition-transform active:scale-95 ${
                activeTab === 'balance'
                  ? 'bg-cartoon-yellow text-cartoon-ink ring-3 ring-cartoon-yellow/30'
                  : 'bg-white text-cartoon-ink hover:bg-cartoon-cream'
              }`}
            >
              <Icon name="account_balance_wallet" size={22} />
            </button>
            <span
              className={`text-[10px] whitespace-nowrap leading-none ${
                activeTab === 'balance'
                  ? 'font-display text-cartoon-ink'
                  : 'font-sub font-bold text-gray-500'
              }`}
            >
              Balance
            </span>
          </div>

          {/* Slot 4: Stock */}
          <button
            type="button"
            onClick={() => setActiveTab('ingredientes')}
            className={`relative flex flex-col items-center justify-center h-full py-1 cursor-pointer transition-colors ${
              activeTab === 'ingredientes' ? 'text-cartoon-ink' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                activeTab === 'ingredientes'
                  ? 'bg-cartoon-yellow text-cartoon-ink border-2 border-cartoon-ink'
                  : ''
              }`}
            >
              <Icon name="inventory_2" size={20} />
            </div>
            <span
              className={`text-[10px] mt-1 whitespace-nowrap leading-none ${
                activeTab === 'ingredientes' ? 'font-display text-cartoon-ink' : 'font-sub font-bold'
              }`}
            >
              Stock
            </span>
          </button>

          {/* Slot 5: Más */}
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(true)}
            className={`relative flex flex-col items-center justify-center h-full py-1 cursor-pointer transition-colors ${
              ['ganancias', 'gastos', 'promociones'].includes(activeTab) || isMoreMenuOpen
                ? 'text-cartoon-ink'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                ['ganancias', 'gastos', 'promociones'].includes(activeTab) || isMoreMenuOpen
                  ? 'bg-cartoon-yellow text-cartoon-ink border-2 border-cartoon-ink'
                  : ''
              }`}
            >
              <Icon name="more_horiz" size={20} />
            </div>
            <span
              className={`text-[10px] mt-1 whitespace-nowrap leading-none ${
                ['ganancias', 'gastos', 'promociones'].includes(activeTab) || isMoreMenuOpen
                  ? 'font-display text-cartoon-ink'
                  : 'font-sub font-bold'
              }`}
            >
              Más
            </span>
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

      {/* Modal Administración de Sorteo y Premios */}
      <GiveawayAdminModal
        isOpen={isGiveawayModalOpen}
        onClose={() => setIsGiveawayModalOpen(false)}
        giveaway={promoData?.giveaway}
        orders={orders}
        onUpdateGiveaway={(updates) => {
          updateGiveaway(updates);
          setPromoMessage('Sorteo actualizado');
          setTimeout(() => setPromoMessage(''), 2200);
        }}
        onDeleteGiveaway={() => {
          deleteGiveaway();
          setPromoMessage('Sorteo eliminado de la web');
          setTimeout(() => setPromoMessage(''), 2200);
        }}
        onRestoreGiveaway={() => {
          restoreGiveaway();
          setPromoMessage('Sorteo restaurado');
          setTimeout(() => setPromoMessage(''), 2200);
        }}
        onToggleWinner={toggleOrderWinner}
      />
    </div>
  );
};
