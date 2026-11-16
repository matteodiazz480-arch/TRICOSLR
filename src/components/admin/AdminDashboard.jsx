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

  const [activeTab, setActiveTab] = useState('sorteo');

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row select-none">
      {/* BARRA LATERAL ESCRITORIO */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col bg-white border-r border-slate-200 p-5 justify-between sticky top-0 h-screen">
        <div>
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center flex-shrink-0">
              <img src="/assets/logo.svg?v=4" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="font-display text-lg text-slate-900 leading-none">TRICO'S</h2>
              <span className="font-sub font-semibold text-[10px] text-slate-400 uppercase tracking-wider mt-0.5 block">
                Administración
              </span>
            </div>
          </div>

          <nav className="mt-5 space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sub font-semibold text-xs transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-100">
          <button
            onClick={onGoToStore}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-sub font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Icon name="storefront" size={16} />
            <span>Ver Tienda</span>
          </button>
          <button
            onClick={() => {
              clearSession();
              onLogout();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-sub font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Icon name="logout" size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* CABECERA MÓVIL */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 p-0.5 flex items-center justify-center">
            <img src="/assets/logo.svg?v=4" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-display text-base text-slate-900">TRICO'S ADMIN</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onGoToStore}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-sub font-semibold text-xs flex items-center gap-1 cursor-pointer"
          >
            <Icon name="storefront" size={15} />
            <span>Tienda</span>
          </button>
          <button
            onClick={() => {
              clearSession();
              onLogout();
            }}
            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 cursor-pointer"
            aria-label="Salir"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-6xl w-full mx-auto">
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
          <div className="space-y-5 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg sm:text-xl text-slate-900">
                  Carta de Productos
                </h3>
                <p className="font-sub text-xs text-slate-500 mt-0.5">
                  Usá el botón de estado para marcar un producto como Agotado o Disponible con un solo clic.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingProduct(null);
                  setModalOpen(true);
                }}
                className="btn-cartoon-primary text-xs py-2.5 px-4 self-start sm:self-auto"
              >
                <Icon name="add" size={16} />
                <span>Agregar Producto</span>
              </button>
            </div>

            {/* Buscador y Filtro de Categoría */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                  <Icon name="search" size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-sub text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl font-sub font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grilla de Productos Limpia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    className={`bg-white rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                      isUnavailable ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
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
                        className="relative w-full h-36 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden mb-3 cursor-pointer group"
                      >
                        {prod.image ? (
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <Icon name="add_photo_alternate" size={24} />
                            <span className="font-sub text-[11px] mt-1">Subir foto</span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="px-2.5 py-1 rounded-lg bg-white text-slate-900 font-sub font-semibold text-xs shadow-xs">
                            {isUploading ? 'Subiendo...' : 'Cambiar foto'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-display text-sm text-slate-900 truncate">
                            {prod.name}
                          </h4>
                          <p className="font-sub text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {prod.description || 'Sin descripción'}
                          </p>
                        </div>

                        {/* Botón Kill-Switch de 1 Clic: Disponible vs Agotado */}
                        <button
                          type="button"
                          onClick={() => toggleActive(prod.id, prod.active !== false)}
                          className={`px-2.5 py-1 rounded-lg font-sub font-semibold text-[11px] cursor-pointer transition-colors flex-shrink-0 border ${
                            isUnavailable
                              ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
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

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="font-display text-sm text-slate-900">
                        {money(price)}
                        {priceDouble && (
                          <span className="font-sub text-xs text-slate-400 font-normal ml-1">
                            / Doble {money(priceDouble)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(prod);
                            setModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-sub font-semibold text-xs cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(prod)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Eliminar"
                        >
                          <Icon name="delete" size={15} />
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
              <h3 className="font-display text-lg sm:text-xl text-slate-900">
                Resumen Financiero
              </h3>
              <p className="font-sub text-xs text-slate-500 mt-0.5">
                Estado general de ingresos, gastos y rentabilidad neta.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <span className="font-sub font-semibold text-xs text-slate-500 uppercase">
                  Ingresos Totales
                </span>
                <p className="font-display text-2xl text-emerald-600 mt-1">
                  {money(financialTotals.totalEarnings)}
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <span className="font-sub font-semibold text-xs text-slate-500 uppercase">
                  Gastos Totales
                </span>
                <p className="font-display text-2xl text-rose-600 mt-1">
                  {money(financialTotals.totalExpenses)}
                </p>
              </div>

              <div className="bg-slate-900 text-white p-5 rounded-2xl">
                <span className="font-sub font-semibold text-xs text-slate-400 uppercase">
                  Balance Neto
                </span>
                <p className="font-display text-2xl mt-1">
                  {money(financialTotals.netBalance)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-display text-sm text-slate-900">Últimos Movimientos</h4>
                <span className="font-sub text-xs text-slate-400">{finances.length} registros</span>
              </div>

              <div className="divide-y divide-slate-100">
                {finances.slice(0, 12).map((item) => (
                  <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-sub font-semibold text-xs text-slate-900 truncate">
                        {item.concept}
                      </p>
                      <span className="font-sub text-[11px] text-slate-400">{item.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-display text-xs sm:text-sm ${
                          item.type === 'earning' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {item.type === 'earning' ? '+' : '-'}
                        {money(item.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteFinance(item.id)}
                        className="text-slate-300 hover:text-rose-600 cursor-pointer"
                      >
                        <Icon name="delete" size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA: INGRESOS */}
        {/* ============================================================== */}
        {activeTab === 'ganancias' && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="font-display text-lg sm:text-xl text-slate-900">Registro de Ingresos</h3>

            <form
              onSubmit={handleAddEarningSubmit}
              className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <div>
                <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                  Monto ($)
                </label>
                <input
                  type="number"
                  required
                  value={earningForm.amount}
                  onChange={(e) => setEarningForm({ ...earningForm, amount: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                  Concepto
                </label>
                <input
                  type="text"
                  required
                  value={earningForm.concept}
                  onChange={(e) => setEarningForm({ ...earningForm, concept: e.target.value })}
                  placeholder="Ej: Venta en local"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs"
                />
              </div>
              <button type="submit" className="btn-cartoon-green py-2 text-xs">
                Registrar Ingreso
              </button>
            </form>

            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {earningsList.map((item) => (
                <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-sub font-semibold text-xs text-slate-900">{item.concept}</p>
                    <span className="font-sub text-[11px] text-slate-400">{item.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm text-emerald-600">+{money(item.amount)}</span>
                    <button
                      onClick={() => handleDeleteFinance(item.id)}
                      className="text-slate-300 hover:text-rose-600 cursor-pointer"
                    >
                      <Icon name="delete" size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA: GASTOS */}
        {/* ============================================================== */}
        {activeTab === 'gastos' && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="font-display text-lg sm:text-xl text-slate-900">Registro de Gastos</h3>

            <form
              onSubmit={handleAddExpenseSubmit}
              className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <div>
                <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                  Monto ($)
                </label>
                <input
                  type="number"
                  required
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                  Concepto
                </label>
                <input
                  type="text"
                  required
                  value={expenseForm.concept}
                  onChange={(e) => setExpenseForm({ ...expenseForm, concept: e.target.value })}
                  placeholder="Ej: Compra de insumos, packaging"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs"
                />
              </div>
              <button type="submit" className="btn-cartoon-red py-2 text-xs">
                Registrar Gasto
              </button>
            </form>

            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {expensesList.map((item) => (
                <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-sub font-semibold text-xs text-slate-900">{item.concept}</p>
                    <span className="font-sub text-[11px] text-slate-400">{item.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm text-rose-600">-{money(item.amount)}</span>
                    <button
                      onClick={() => handleDeleteFinance(item.id)}
                      className="text-slate-300 hover:text-rose-600 cursor-pointer"
                    >
                      <Icon name="delete" size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA: PROMOCIONES Y SORTEO */}
        {/* ============================================================== */}
        {activeTab === 'promociones' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="font-display text-lg sm:text-xl text-slate-900">
                Configuración de Sorteo y Cupones
              </h3>
              <p className="font-sub text-xs text-slate-500 mt-0.5">
                Administrá la visibilidad del sorteo en la tienda y los códigos de descuento.
              </p>
            </div>

            {promoMessage && (
              <div className="p-3 rounded-xl bg-slate-900 text-white font-sub text-xs flex items-center gap-2">
                <Icon name="check_circle" size={16} className="text-emerald-400" />
                <span>{promoMessage}</span>
              </div>
            )}

            {/* Configuración del Sorteo */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-display text-base text-slate-900">Sorteo Oficial</h4>
                  <span className="font-sub text-xs text-slate-500">
                    Visible en la página principal de la tienda
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleGiveawayActive}
                  className={`px-3 py-1.5 rounded-xl font-sub font-semibold text-xs cursor-pointer border ${
                    giveawayForm.active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {giveawayForm.active ? 'Sorteo Activo' : 'Sorteo Pausado'}
                </button>
              </div>

              <form onSubmit={handleSaveGiveawaySubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-sub font-semibold text-xs text-slate-700 block mb-1">
                    Título del Sorteo
                  </label>
                  <input
                    type="text"
                    value={giveawayForm.title}
                    onChange={(e) => setGiveawayForm({ ...giveawayForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs"
                  />
                </div>

                <div>
                  <label className="font-sub font-semibold text-xs text-slate-700 block mb-1">
                    Fecha del Sorteo
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={giveawayForm.drawDate}
                      onChange={(e) => setGiveawayForm({ ...giveawayForm, drawDate: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs"
                    />
                    <button type="submit" className="btn-cartoon-primary py-2 px-4 text-xs">
                      Guardar
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Cupones de Descuento */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h4 className="font-display text-base text-slate-900">Cupones de Descuento</h4>

              <form onSubmit={handleAddCouponSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="font-sub font-semibold text-xs text-slate-700 block mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    required
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                    placeholder="TRICO10"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="font-sub font-semibold text-xs text-slate-700 block mb-1">
                    Descuento (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={couponForm.discount}
                    onChange={(e) => setCouponForm({ ...couponForm, discount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs"
                  />
                </div>

                <div>
                  <label className="font-sub font-semibold text-xs text-slate-700 block mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={couponForm.label}
                    onChange={(e) => setCouponForm({ ...couponForm, label: e.target.value })}
                    placeholder="Descuento especial"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs"
                  />
                </div>

                <button type="submit" className="btn-cartoon-primary py-2 text-xs">
                  Crear Cupón
                </button>
              </form>

              <div className="divide-y divide-slate-100">
                {(promoData?.coupons || []).map((c) => (
                  <div key={c.code} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-display text-xs text-slate-900">{c.code}</span>
                      <span className="font-sub text-xs text-slate-500 ml-2">{c.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCouponActive(c.code)}
                        className={`px-2.5 py-1 rounded-lg font-sub font-semibold text-[11px] cursor-pointer ${
                          c.active !== false
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {c.active !== false ? 'Activo' : 'Pausado'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCoupon(c.code)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Icon name="delete" size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* NAVEGACIÓN INFERIOR MÓVIL */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-center gap-1 overflow-x-auto no-scrollbar py-2 px-2 shadow-lg"
      >
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all cursor-pointer flex-shrink-0 ${
                active
                  ? 'text-white bg-slate-900 font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon name={item.icon} size={17} />
              <span className="font-sub text-[10px] mt-0.5 whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="relative w-full max-w-xs bg-white rounded-2xl border border-slate-200 shadow-xl p-5 text-center space-y-4 my-auto animate-modalIn">
            <h3 className="font-display text-sm text-slate-900">Eliminar producto</h3>
            <p className="font-sub text-xs text-slate-500">
              ¿Confirmás eliminar <strong>{deleteCandidate.name}</strong> de la carta?
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="btn-cartoon-white py-2 px-4 text-xs"
              >
                Cancelar
              </button>
              <button
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
