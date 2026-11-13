import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Icon } from '../Icon';
import { CATEGORIES } from '../../data/products';
import { ProductModal } from './ProductModal';
import { useProducts } from '../../context/ProductsContext';
import { clearSession } from '../../lib/security';
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
  DEFAULT_PROMOTIONS_DATA,
} from '../../lib/promotionsStore';
import { compressImageFile } from '../../lib/imageCompressor';

const money = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

export const AdminDashboard = ({ onLogout, onGoToStore }) => {
  const { products, updateStock, toggleActive, saveProduct, deleteProduct } = useProducts();
  
  // Pestañas principales: 'ganancias' | 'gastos' | 'balance' | 'stock' | 'promociones'
  const [activeTab, setActiveTab] = useState('balance');

  // Finanzas: Ganancias y Gastos en tiempo real
  const [finances, setFinances] = useState(() => getFinances());
  useEffect(() => {
    const unsubscribe = subscribeToFinances((items) => {
      setFinances(items);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Formularios de Ganancias y Gastos
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

  // Stock
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Estadísticas de Stock para vista completa en PC
  const stockStats = useMemo(() => {
    const total = products.length;
    const activeCount = products.filter((p) => p.active !== false).length;
    const totalUnits = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const lowStock = products.filter(
      (p) => p.active !== false && Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 5
    ).length;
    const outOfStock = products.filter(
      (p) => p.active === false || Number(p.stock || 0) === 0
    ).length;
    return { total, activeCount, totalUnits, lowStock, outOfStock };
  }, [products]);

  // Cálculos Financieros
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

  // Manejo de agregar Ganancia
  const handleAddEarningSubmit = (e) => {
    e.preventDefault();
    if (!earningForm.amount || Number(earningForm.amount) <= 0) return;
    addEarning(earningForm);
    setEarningForm({
      amount: '',
      concept: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  // Manejo de agregar Gasto
  const handleAddExpenseSubmit = (e) => {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) return;
    addExpense(expenseForm);
    setExpenseForm({
      amount: '',
      concept: '',
      category: 'Insumos',
      date: new Date().toISOString().split('T')[0],
    });
  };

  // Filtrado de stock
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

  // Gestión de Promociones, Sorteo y Cupones
  const [promoData, setPromoData] = useState(() => getPromotions());
  const [giveawayForm, setGiveawayForm] = useState(() => ({
    title: promoData?.giveaway?.title || 'GRAN SORTEO TRICO\'S',
    subtitle: promoData?.giveaway?.subtitle || '¡Participá gratis con tu pedido o etiquetándonos en Instagram!',
    drawDate: promoData?.giveaway?.drawDate || 'Fin de mes',
    active: promoData?.giveaway?.active !== false,
  }));

  const [couponForm, setCouponForm] = useState({
    code: '',
    discount: 10,
    type: 'percentage', // 'percentage' | 'fixed'
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

  // Subida de imagen directa en cada tarjeta de producto (drag & drop o clic)
  const cardFileInputRefs = useRef({});
  const [draggingCardId, setDraggingCardId] = useState(null);
  const [uploadingCardId, setUploadingCardId] = useState(null);

  const handleCardImageUpload = async (product, file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Por favor seleccioná un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }
    setUploadingCardId(product.id);
    try {
      const compressed = await compressImageFile(file, 800, 800, 0.82);
      saveProduct({
        ...product,
        image: compressed,
      });
    } catch (err) {
      console.error('Error al comprimir imagen de plato:', err);
      alert('Hubo un problema al procesar la imagen.');
    } finally {
      setUploadingCardId(null);
    }
  };

  const handleSaveGiveawaySubmit = (e) => {
    e.preventDefault();
    updateGiveaway({
      title: giveawayForm.title.trim(),
      subtitle: giveawayForm.subtitle.trim(),
      drawDate: giveawayForm.drawDate.trim(),
      active: giveawayForm.active,
    });
    setPromoMessage('¡Información del sorteo guardada con éxito!');
    setTimeout(() => setPromoMessage(''), 3000);
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

    setPromoMessage(`¡Cupón "${cleanCode}" creado correctamente!`);
    setTimeout(() => setPromoMessage(''), 3000);
  };

  const navItems = [
    { id: 'balance', label: 'Balance', icon: 'account_balance_wallet', badge: money(financialTotals.netBalance) },
    { id: 'ganancias', label: 'Ganancias', icon: 'trending_up', badge: `+${money(financialTotals.totalEarnings)}` },
    { id: 'gastos', label: 'Gastos', icon: 'trending_down', badge: `-${money(financialTotals.totalExpenses)}` },
    { id: 'stock', label: 'Stock', icon: 'inventory_2', badge: `${products.length} platos` },
    { id: 'promociones', label: 'Promos', icon: 'campaign', badge: 'Sorteo & Cupones' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 flex flex-col md:flex-row select-none">
      
      {/* ============================================================== */}
      {/* NAVEGACIÓN EN COMPUTADORA: BARRA LATERAL AL COSTADO (SIDEBAR AMPLIO) */}
      {/* ============================================================== */}
      <aside className="hidden md:flex md:w-60 lg:w-64 md:fixed md:left-0 md:top-0 md:bottom-0 bg-white border-r-2 border-gray-200 flex-col justify-between p-5 z-30 shadow-sm">
        <div>
          {/* Logo Oficial Nítido y Nombre */}
          <div className="flex items-center gap-3 mb-6 px-1">
            <div className="w-12 h-12 rounded-full bg-white border-2 border-cartoon-ink shadow-cartoon-xs p-1 flex items-center justify-center flex-shrink-0">
              <img
                src="/assets/logo.svg?v=4"
                alt="Logo TRICO'S"
                className="w-full h-full object-contain block"
              />
            </div>
            <div>
              <h2 className="font-display text-xl text-cartoon-ink leading-tight">TRICO'S</h2>
              <span className="font-sub font-bold text-[11px] text-gray-500 uppercase tracking-wider block mt-0.5">
                Panel de Control
              </span>
            </div>
          </div>

          {/* Menú de Opciones al Costado */}
          <nav className="space-y-2.5">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-sub font-bold text-sm cursor-pointer transition-all border-2 ${
                    active
                      ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-black'
                      : 'border-transparent text-gray-600 hover:text-cartoon-ink hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={item.icon} size={20} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Acciones Inferiores en Sidebar */}
        <div className="pt-5 border-t border-gray-200 space-y-2.5">
          <button
            onClick={onGoToStore}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-sub font-bold text-sm cursor-pointer transition-colors"
          >
            <Icon name="storefront" size={18} />
            <span>Ver Tienda</span>
          </button>
          <button
            onClick={() => {
              clearSession();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-cartoon-red border border-rose-200 font-sub font-bold text-sm cursor-pointer transition-colors"
          >
            <Icon name="logout" size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* CONTENIDO PRINCIPAL (Espacioso y con gran presencia en PC) */}
      {/* ============================================================== */}
      <main className="flex-1 md:ml-60 lg:ml-64 p-5 sm:p-6 lg:p-8 pb-28 md:pb-8 w-full max-w-none">
        
        {/* Cabecera Móvil */}
        <div className="md:hidden flex items-center justify-between pb-4 mb-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-white border-2 border-cartoon-ink shadow-cartoon-xs p-0.5 flex items-center justify-center flex-shrink-0">
              <img
                src="/assets/logo.svg?v=4"
                alt="Logo TRICO'S"
                className="w-full h-full object-contain block"
              />
            </div>
            <h1 className="font-display text-base text-cartoon-ink">TRICO'S ADMIN</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onGoToStore}
              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-sub font-bold text-xs cursor-pointer"
            >
              Tienda
            </button>
            <button
              onClick={() => {
                clearSession();
                onLogout();
              }}
              className="p-1.5 rounded-lg text-cartoon-red cursor-pointer"
              title="Cerrar sesión"
            >
              <Icon name="logout" size={20} />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SECCIÓN 1: BALANCE GENERAL */}
        {/* ============================================================== */}
        {activeTab === 'balance' && (
          <div className="space-y-6 sm:space-y-8 animate-modalIn">
            
            {/* Tarjetas de Totales Proporcionadas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200/70 shadow-xs">
                <span className="font-sub font-bold text-xs text-emerald-700 uppercase tracking-wider block mb-0.5">
                  🟢 Total Ganancias
                </span>
                <span className="font-display text-2xl sm:text-3xl text-emerald-600 block leading-tight mt-0.5">
                  {money(financialTotals.totalEarnings)}
                </span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200/70 shadow-xs">
                <span className="font-sub font-bold text-xs text-rose-700 uppercase tracking-wider block mb-0.5">
                  🔴 Total Gastos
                </span>
                <span className="font-display text-2xl sm:text-3xl text-rose-600 block leading-tight mt-0.5">
                  {money(financialTotals.totalExpenses)}
                </span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200/70 shadow-xs">
                <span className="font-sub font-bold text-xs text-amber-800 uppercase tracking-wider block mb-0.5">
                  🟡 Balance Neto
                </span>
                <span className={`font-display text-2xl sm:text-3xl block leading-tight mt-0.5 ${
                  financialTotals.netBalance >= 0 ? 'text-cartoon-ink' : 'text-cartoon-red'
                }`}>
                  {money(financialTotals.netBalance)}
                </span>
              </div>
            </div>

            {/* Accesos rápidos a agregar */}
            <div className="grid grid-cols-2 gap-3.5">
              <button
                onClick={() => setActiveTab('ganancias')}
                className="py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-display text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <Icon name="add_circle" size={18} />
                <span>+ Cargar Ganancia</span>
              </button>
              <button
                onClick={() => setActiveTab('gastos')}
                className="py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 font-display text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <Icon name="remove_circle" size={18} />
                <span>- Cargar Gasto</span>
              </button>
            </div>

            {/* Movimientos Recientes */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 className="font-display text-base sm:text-lg text-cartoon-ink">Historial de Movimientos</h3>
                <span className="font-sub text-xs text-gray-500 font-bold">{finances.length} registros</span>
              </div>
              <div className="divide-y divide-gray-100">
                {finances.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 font-sub text-sm">
                    No hay movimientos registrados.
                  </div>
                ) : (
                  finances.map((item) => (
                    <div key={item.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3.5 hover:bg-gray-50/70 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          item.type === 'earning' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          <Icon name={item.type === 'earning' ? 'trending_up' : 'trending_down'} size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-sub font-bold text-sm text-cartoon-ink truncate">
                            {item.concept}
                          </p>
                          <p className="font-sub text-xs text-gray-500 mt-0.5">
                            {item.date} {item.category ? `• ${item.category}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`font-display text-sm sm:text-base ${
                          item.type === 'earning' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {item.type === 'earning' ? `+${money(item.amount)}` : `-${money(item.amount)}`}
                        </span>
                        <button
                          onClick={() => deleteFinanceItem(item.id)}
                          className="text-gray-400 hover:text-cartoon-red p-1 cursor-pointer transition-colors"
                          title="Eliminar movimiento"
                        >
                          <Icon name="delete" size={16} />
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
        {/* SECCIÓN 2: GANANCIAS */}
        {/* ============================================================== */}
        {activeTab === 'ganancias' && (
          <div className="space-y-6 sm:space-y-8 animate-modalIn">
            <div className="bg-white p-5 sm:p-6 lg:p-7 rounded-3xl border-2 border-gray-200 shadow-sm">
              <h3 className="font-display text-lg sm:text-xl lg:text-2xl text-emerald-700 mb-1 flex items-center gap-2.5">
                <Icon name="trending_up" size={24} />
                <span>Agregar Nueva Ganancia</span>
              </h3>
              <p className="font-sub text-xs sm:text-sm text-gray-500 mb-6">
                Registrá ventas del turno o ingresos extra
              </p>

              <form onSubmit={handleAddEarningSubmit} className="space-y-4 font-sub text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1.5 text-xs sm:text-sm">Monto ($ ARS):</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      required
                      value={earningForm.amount}
                      onChange={(e) => setEarningForm({ ...earningForm, amount: e.target.value })}
                      placeholder="Ej: 55000"
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 text-gray-900 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm sm:text-base transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1.5 text-xs sm:text-sm">Fecha:</label>
                    <input
                      type="date"
                      required
                      value={earningForm.date}
                      onChange={(e) => setEarningForm({ ...earningForm, date: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 text-gray-900 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm sm:text-base transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1.5 text-xs sm:text-sm">Concepto / Detalle:</label>
                  <input
                    type="text"
                    required
                    value={earningForm.concept}
                    onChange={(e) => setEarningForm({ ...earningForm, concept: e.target.value })}
                    placeholder="Ej: Ventas Turno Noche (Local y WhatsApp)"
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 text-gray-900 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm sm:text-base transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 sm:py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-display text-sm sm:text-base cursor-pointer transition-colors shadow-sm mt-3"
                >
                  + Guardar Ganancia
                </button>
              </form>
            </div>

            {/* Listado de Ganancias */}
            <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 lg:p-6 border-b border-gray-100 bg-gray-50/50">
                <h4 className="font-display text-base sm:text-lg text-cartoon-ink">Registro de Ganancias</h4>
              </div>
              <div className="divide-y divide-gray-100">
                {finances.filter((f) => f.type === 'earning').length === 0 ? (
                  <div className="p-10 text-center text-gray-400 font-sub text-sm">
                    No hay ganancias registradas.
                  </div>
                ) : (
                  finances.filter((f) => f.type === 'earning').map((item) => (
                    <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/70 transition-colors">
                      <div>
                        <p className="font-sub font-bold text-sm sm:text-base text-cartoon-ink">{item.concept}</p>
                        <p className="font-sub text-xs sm:text-sm text-gray-500 mt-0.5">{item.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display text-base sm:text-lg text-emerald-600">+{money(item.amount)}</span>
                        <button
                          onClick={() => deleteFinanceItem(item.id)}
                          className="text-gray-400 hover:text-cartoon-red p-1.5 cursor-pointer transition-colors"
                          title="Eliminar ganancia"
                        >
                          <Icon name="delete" size={18} />
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
        {/* SECCIÓN 3: GASTOS */}
        {/* ============================================================== */}
        {activeTab === 'gastos' && (
          <div className="space-y-6 sm:space-y-8 animate-modalIn">
            <div className="bg-white p-5 sm:p-6 lg:p-7 rounded-3xl border-2 border-gray-200 shadow-sm">
              <h3 className="font-display text-lg sm:text-xl lg:text-2xl text-rose-700 mb-1 flex items-center gap-2.5">
                <Icon name="trending_down" size={24} />
                <span>Agregar Nuevo Gasto</span>
              </h3>
              <p className="font-sub text-xs sm:text-sm text-gray-500 mb-6">
                Registrá compras de mercadería, insumos o sueldos
              </p>

              <form onSubmit={handleAddExpenseSubmit} className="space-y-4 font-sub text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1.5 text-xs sm:text-sm">Monto ($ ARS):</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      required
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      placeholder="Ej: 24000"
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 text-gray-900 focus:outline-none focus:border-rose-500 focus:bg-white text-sm sm:text-base transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1.5 text-xs sm:text-sm">Categoría:</label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 text-gray-900 focus:outline-none focus:border-rose-500 focus:bg-white text-sm sm:text-base transition-colors"
                    >
                      <option value="Insumos">Insumos (Carne, Pollo, Pan, Cheddar)</option>
                      <option value="Packaging">Packaging (Cajas, Bolsas)</option>
                      <option value="Delivery">Delivery / Cadetería</option>
                      <option value="Personal">Personal / Cocina</option>
                      <option value="Servicios">Servicios (Luz, Gas, Internet)</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1.5 text-xs sm:text-sm">Fecha:</label>
                    <input
                      type="date"
                      required
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 text-gray-900 focus:outline-none focus:border-rose-500 focus:bg-white text-sm sm:text-base transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1.5 text-xs sm:text-sm">Concepto / Detalle:</label>
                  <input
                    type="text"
                    required
                    value={expenseForm.concept}
                    onChange={(e) => setExpenseForm({ ...expenseForm, concept: e.target.value })}
                    placeholder="Ej: 15kg medallones de carne para el finde"
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 text-gray-900 focus:outline-none focus:border-rose-500 focus:bg-white text-sm sm:text-base transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 sm:py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-display text-sm sm:text-base cursor-pointer transition-colors shadow-sm mt-3"
                >
                  - Guardar Gasto
                </button>
              </form>
            </div>

            {/* Listado de Gastos */}
            <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 lg:p-6 border-b border-gray-100 bg-gray-50/50">
                <h4 className="font-display text-base sm:text-lg text-cartoon-ink">Registro de Gastos</h4>
              </div>
              <div className="divide-y divide-gray-100">
                {finances.filter((f) => f.type === 'expense').length === 0 ? (
                  <div className="p-10 text-center text-gray-400 font-sub text-sm">
                    No hay gastos registrados.
                  </div>
                ) : (
                  finances.filter((f) => f.type === 'expense').map((item) => (
                    <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/70 transition-colors">
                      <div>
                        <p className="font-sub font-bold text-sm sm:text-base text-cartoon-ink">{item.concept}</p>
                        <p className="font-sub text-xs sm:text-sm text-gray-500 mt-0.5">
                          {item.date} • <span className="text-gray-700 font-semibold">{item.category}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display text-base sm:text-lg text-rose-600">-{money(item.amount)}</span>
                        <button
                          onClick={() => deleteFinanceItem(item.id)}
                          className="text-gray-400 hover:text-cartoon-red p-1.5 cursor-pointer transition-colors"
                          title="Eliminar gasto"
                        >
                          <Icon name="delete" size={18} />
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
        {/* SECCIÓN 4: STOCK Y PLATOS (Amplio, Espacioso y Claro en PC) */}
        {/* ============================================================== */}
        {activeTab === 'stock' && (
          <div className="space-y-6 animate-modalIn">
            
            {/* Tarjetas Resumen de Stock (Llenan el espacio con datos útiles en PC) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="font-sub font-bold text-xs text-gray-500 uppercase tracking-wider block mb-0.5">
                  🍔 Total Platos
                </span>
                <span className="font-display text-2xl sm:text-3xl text-cartoon-ink block leading-tight mt-0.5">
                  {stockStats.total}
                </span>
                <span className="font-sub text-xs text-emerald-600 font-bold block mt-1">
                  {stockStats.activeCount} activos para venta
                </span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="font-sub font-bold text-xs text-gray-500 uppercase tracking-wider block mb-0.5">
                  📦 Stock Total Unidades
                </span>
                <span className="font-display text-2xl sm:text-3xl text-cartoon-ink block leading-tight mt-0.5">
                  {stockStats.totalUnits}
                </span>
                <span className="font-sub text-xs text-gray-400 block mt-1">
                  Unidades totales disponibles
                </span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200/80 shadow-xs">
                <span className="font-sub font-bold text-xs text-amber-700 uppercase tracking-wider block mb-0.5">
                  ⚠️ Stock Bajo (≤ 5)
                </span>
                <span className="font-display text-2xl sm:text-3xl text-amber-600 block leading-tight mt-0.5">
                  {stockStats.lowStock}
                </span>
                <span className="font-sub text-xs text-amber-600 font-bold block mt-1">
                  Requieren reposición
                </span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200/80 shadow-xs">
                <span className="font-sub font-bold text-xs text-rose-700 uppercase tracking-wider block mb-0.5">
                  🚫 Platos Agotados
                </span>
                <span className="font-display text-2xl sm:text-3xl text-rose-600 block leading-tight mt-0.5">
                  {stockStats.outOfStock}
                </span>
                <span className="font-sub text-xs text-rose-600 font-bold block mt-1">
                  Pausados en carta
                </span>
              </div>
            </div>

            {/* Buscador + Botón Nuevo Plato */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Icon name="search" size={20} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar hamburguesa o plato..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border-2 border-gray-200 text-gray-900 font-sub text-sm sm:text-base focus:outline-none focus:border-cartoon-yellow transition-colors shadow-sm"
                />
              </div>

              <button
                onClick={() => {
                  setEditingProduct(null);
                  setModalOpen(true);
                }}
                className="btn-cartoon-primary text-sm sm:text-base py-3.5 px-6 flex items-center justify-center gap-2 cursor-pointer flex-shrink-0 rounded-2xl"
              >
                <Icon name="add" size={20} />
                <span>Agregar Plato</span>
              </button>
            </div>

            {/* Categorías */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl font-sub font-bold text-xs sm:text-sm whitespace-nowrap cursor-pointer transition-all ${
                      isActive
                        ? 'bg-cartoon-yellow text-cartoon-ink border-2 border-cartoon-ink shadow-cartoon-xs font-black'
                        : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Catálogo en Rejilla de Tarjetas: 2 Columnas Lado a Lado en Celular y 3-4 en Escritorio */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {filteredProducts.map((prod) => {
                const stock = Number(prod.stock !== undefined ? prod.stock : 35);
                const isOutOfStock = stock <= 0 || prod.active === false;
                const isLowStock = stock > 0 && stock <= 5;
                const price = prod.price || prod.variants?.[0]?.price || 0;

                return (
                  <div
                    key={prod.id}
                    className={`group bg-white rounded-2xl border-2 sm:border-3 border-gray-200 hover:border-cartoon-yellow/80 hover:shadow-cartoon-sm transition-all duration-200 flex flex-col justify-between overflow-hidden p-2.5 sm:p-3.5 relative ${
                      !prod.active ? 'opacity-55 bg-gray-50' : ''
                    }`}
                  >
                    {/* 1. Imagen Grande y Destacada: Arrastrar o Clic para Subir Foto */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDraggingCardId(prod.id);
                      }}
                      onDragLeave={() => setDraggingCardId(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDraggingCardId(null);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleCardImageUpload(prod, file);
                      }}
                      onClick={() => cardFileInputRefs.current[prod.id]?.click()}
                      className={`relative w-full h-24 sm:h-32 md:h-36 rounded-xl bg-cartoon-cream border-2 overflow-hidden flex items-center justify-center mb-2 flex-shrink-0 cursor-pointer transition-all ${
                        draggingCardId === prod.id
                          ? 'border-cartoon-yellow bg-yellow-100 ring-4 ring-cartoon-yellow/40 scale-102'
                          : 'border-gray-200 hover:border-cartoon-yellow'
                      }`}
                      title="Hacé clic o arrastrá una imagen para este plato"
                    >
                      {/* Input oculto para selección por clic */}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => (cardFileInputRefs.current[prod.id] = el)}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCardImageUpload(prod, file);
                          e.target.value = '';
                        }}
                      />

                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover object-center block group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 p-2 text-center">
                          <span className="text-3xl sm:text-4xl mb-1">{prod.emoji || '🍔'}</span>
                          <span className="font-sub font-bold text-[9px] text-gray-500 uppercase tracking-wider">
                            + Subir Foto
                          </span>
                        </div>
                      )}

                      {/* Overlay informativo al pasar el cursor o en celular */}
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1 text-center">
                        <Icon name="photo_camera" size={20} />
                        <span className="font-sub font-black text-[10px] uppercase mt-0.5 tracking-wider drop-shadow-xs">
                          {prod.image ? 'Cambiar Foto' : 'Subir Foto'}
                        </span>
                        <span className="font-sub text-[8px] opacity-90">
                          Arrastrá o Clic
                        </span>
                      </div>

                      {/* Spinner de carga mientras comprime y sube */}
                      {uploadingCardId === prod.id && (
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-20">
                          <div className="w-5 h-5 border-2 border-cartoon-yellow border-t-transparent rounded-full animate-spin mb-1" />
                          <span className="font-sub text-[9px] font-bold">Guardando...</span>
                        </div>
                      )}

                      {/* Badges de Estado sobre la Foto */}
                      <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 items-end pointer-events-none z-10">
                        {!prod.active && (
                          <span className="px-1.5 py-0.5 rounded-md bg-gray-900/90 text-white font-sub font-black text-[9px] uppercase tracking-wider shadow-xs">
                            PAUSADO
                          </span>
                        )}
                        {prod.active && isOutOfStock && (
                          <span className="px-1.5 py-0.5 rounded-md bg-cartoon-red text-white font-sub font-black text-[9px] uppercase tracking-wider shadow-xs">
                            AGOTADO
                          </span>
                        )}
                        {prod.active && !isOutOfStock && isLowStock && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white font-sub font-black text-[9px] uppercase tracking-wider shadow-xs">
                            ÚLTIMAS {stock}
                          </span>
                        )}
                      </div>

                      {prod.badge && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-cartoon-yellow text-cartoon-ink font-sub font-black text-[9px] uppercase tracking-wider border border-cartoon-ink/30 shadow-xs pointer-events-none z-10">
                          {prod.badge}
                        </span>
                      )}
                    </div>

                    {/* 2. Información del Plato: Nombre Completo y Precio */}
                    <div className="mb-2 flex-1 min-w-0">
                      <h4
                        className="font-display text-xs sm:text-sm text-cartoon-ink font-bold line-clamp-2 leading-snug min-h-[2rem] sm:min-h-[2.4rem] flex items-center"
                        title={prod.name}
                      >
                        {prod.name}
                      </h4>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-sub font-black text-xs sm:text-sm text-amber-600">
                          {money(price)}
                        </span>
                        <span className="font-sub text-[10px] sm:text-xs text-gray-500 font-bold">
                          {stock} u.
                        </span>
                      </div>
                    </div>

                    {/* 3. Control Táctil de Stock a Ancho Completo */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl border border-gray-200 p-1 mb-2 shadow-inner">
                      <button
                        type="button"
                        onClick={() => updateStock(prod.id, Math.max(0, stock - 1))}
                        aria-label="Restar 1 unidad"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white hover:bg-cartoon-red hover:text-white border border-gray-200 font-display text-sm font-bold text-gray-800 flex items-center justify-center cursor-pointer transition-colors active:scale-90 shadow-2xs"
                      >
                        -
                      </button>
                      <div className="flex items-center justify-center flex-1 px-1">
                        <input
                          type="number"
                          min="0"
                          value={stock}
                          onChange={(e) => updateStock(prod.id, e.target.value)}
                          className="w-full text-center font-display text-xs sm:text-sm font-bold bg-transparent text-gray-900 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateStock(prod.id, stock + 1)}
                        aria-label="Sumar 1 unidad"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white hover:bg-emerald-500 hover:text-white border border-gray-200 font-display text-sm font-bold text-gray-800 flex items-center justify-center cursor-pointer transition-colors active:scale-90 shadow-2xs"
                      >
                        +
                      </button>
                    </div>

                    {/* 4. Barra de Acciones Limpia y Espaciosa */}
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(prod);
                          setModalOpen(true);
                        }}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-gray-100 hover:bg-cartoon-yellow hover:text-cartoon-ink font-sub font-bold text-[11px] sm:text-xs text-gray-700 flex items-center justify-center gap-1 transition-colors cursor-pointer active:scale-95 border border-gray-200/60"
                        title="Editar información del plato"
                      >
                        <Icon name="edit" size={13} />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleActive(prod.id, prod.active)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors active:scale-95 border ${
                          prod.active
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
                            : 'bg-cartoon-red text-white border-cartoon-red'
                        }`}
                        title={prod.active ? 'Pausar plato (ocultar de la carta)' : 'Reactivar plato'}
                      >
                        <Icon name={prod.active ? 'visibility' : 'visibility_off'} size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(prod)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-100 text-gray-400 hover:text-cartoon-red hover:bg-rose-50 border border-gray-200 flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                        title="Eliminar plato"
                      >
                        <Icon name="delete" size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECCIÓN 5: PROMOCIONES, SORTEO Y CUPONES */}
        {/* ============================================================== */}
        {activeTab === 'promociones' && (
          <div className="space-y-6 sm:space-y-8 animate-modalIn">
            
            {/* Mensaje de notificación temporal si existe */}
            {promoMessage && (
              <div className="p-4 rounded-2xl bg-emerald-500 text-white font-sub font-bold text-sm shadow-cartoon-xs flex items-center gap-2 animate-bounce">
                <Icon name="check_circle" size={20} />
                <span>{promoMessage}</span>
              </div>
            )}

            {/* Cabecera de la Sección */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-xl sm:text-2xl text-cartoon-ink flex items-center gap-2">
                  <span>🎁</span>
                  <span>Gestión de Promociones y Sorteo</span>
                </h3>
                <p className="font-sub text-xs sm:text-sm text-gray-500 mt-0.5">
                  Activá o pausá el sorteo oficial y administrá los cupones de descuento para tus clientes.
                </p>
              </div>
            </div>

            {/* TARJETA 1: GESTIÓN DEL GRAN SORTEO TRICO'S */}
            <div className="bg-white rounded-3xl border-2 sm:border-3 border-gray-200 p-4 sm:p-7 shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-2xl flex-shrink-0">
                    🏆
                  </div>
                  <div>
                    <h4 className="font-display text-base sm:text-lg text-cartoon-ink">
                      Gran Sorteo Oficial de Trico's
                    </h4>
                    <span className="font-sub text-xs text-gray-500">
                      Visible en la sección de Promociones de la web
                    </span>
                  </div>
                </div>

                {/* Switch Activar / Pausar Sorteo */}
                <button
                  type="button"
                  onClick={handleToggleGiveawayActive}
                  className={`px-4 py-2 rounded-xl font-sub font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all border-2 ${
                    giveawayForm.active
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-cartoon-xs'
                      : 'bg-gray-100 text-gray-500 border-gray-300'
                  }`}
                >
                  <Icon name={giveawayForm.active ? 'check_circle' : 'pause_circle'} size={18} />
                  <span>{giveawayForm.active ? 'Sorteo Activo en la Web' : 'Sorteo Pausado'}</span>
                </button>
              </div>

              {/* Formulario para editar textos y fecha del sorteo */}
              <form onSubmit={handleSaveGiveawaySubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="font-sub font-bold text-xs text-gray-700 block mb-1">
                      Título del Sorteo
                    </label>
                    <input
                      type="text"
                      value={giveawayForm.title}
                      onChange={(e) => setGiveawayForm({ ...giveawayForm, title: e.target.value })}
                      placeholder="GRAN SORTEO TRICO'S"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border-2 border-gray-200 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-yellow"
                    />
                  </div>

                  <div>
                    <label className="font-sub font-bold text-xs text-gray-700 block mb-1">
                      Fecha del Sorteo
                    </label>
                    <input
                      type="text"
                      value={giveawayForm.drawDate}
                      onChange={(e) => setGiveawayForm({ ...giveawayForm, drawDate: e.target.value })}
                      placeholder="Ej. Fin de mes / 30 de Nov"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border-2 border-gray-200 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-yellow"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-sub font-bold text-xs text-gray-700 block mb-1">
                    Subtítulo / Instrucción corta
                  </label>
                  <input
                    type="text"
                    value={giveawayForm.subtitle}
                    onChange={(e) => setGiveawayForm({ ...giveawayForm, subtitle: e.target.value })}
                    placeholder="¡Participá gratis con tu pedido o etiquetándonos en Instagram!"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border-2 border-gray-200 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-yellow"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="btn-cartoon-primary text-xs sm:text-sm py-2 px-5 cursor-pointer shadow-cartoon-xs flex items-center gap-1.5"
                  >
                    <Icon name="save" size={16} />
                    <span>Guardar Cambios del Sorteo</span>
                  </button>
                </div>
              </form>

              {/* Lista Visual de los 4 Premios Oficiales Configurados */}
              <div>
                <h5 className="font-sub font-black text-xs text-gray-700 uppercase tracking-wider mb-3">
                  Premios Oficiales Configurados (4 Premios)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(promoData?.giveaway?.prizes || DEFAULT_PROMOTIONS_DATA.giveaway.prizes).map((prize, idx) => (
                    <div
                      key={prize.id || idx}
                      className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-2xl">{prize.emoji || '🎁'}</span>
                          <span className="px-2 py-0.5 rounded-md bg-cartoon-yellow text-cartoon-ink font-display text-[10px] font-bold">
                            {prize.badge || `${idx + 1}° PREMIO`}
                          </span>
                        </div>
                        <h6 className="font-display text-xs sm:text-sm text-cartoon-ink font-bold leading-tight mb-1">
                          {prize.title}
                        </h6>
                        <p className="font-sub text-[11px] text-gray-600 leading-snug">
                          {prize.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* TARJETA 2: GESTIÓN DE CUPONES DE DESCUENTO */}
            <div className="bg-white rounded-3xl border-2 sm:border-3 border-gray-200 p-4 sm:p-7 shadow-sm space-y-6">
              
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 border-2 border-rose-300 flex items-center justify-center text-2xl flex-shrink-0">
                  🏷️
                </div>
                <div>
                  <h4 className="font-display text-base sm:text-lg text-cartoon-ink">
                    Cupones de Descuento
                  </h4>
                  <span className="font-sub text-xs text-gray-500">
                    Creá códigos para que tus clientes apliquen rebajas en el carrito
                  </span>
                </div>
              </div>

              {/* Formulario Crear Nuevo Cupón */}
              <form
                onSubmit={handleAddCouponSubmit}
                className="bg-cartoon-cream/50 p-4 sm:p-5 rounded-2xl border-2 border-dashed border-gray-300 space-y-3.5"
              >
                <span className="font-sub font-black text-xs text-cartoon-ink uppercase tracking-wider block">
                  + Crear Nuevo Cupón
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="font-sub font-bold text-[11px] text-gray-600 block mb-1">
                      Código del Cupón *
                    </label>
                    <input
                      type="text"
                      required
                      value={couponForm.code}
                      onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                      placeholder="Ej. BURGER15"
                      className="w-full px-3 py-2 rounded-xl bg-white border-2 border-gray-200 font-display text-xs text-cartoon-ink uppercase focus:outline-none focus:border-cartoon-yellow"
                    />
                  </div>

                  <div>
                    <label className="font-sub font-bold text-[11px] text-gray-600 block mb-1">
                      Tipo Descuento
                    </label>
                    <select
                      value={couponForm.type}
                      onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border-2 border-gray-200 font-sub text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-yellow"
                    >
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed">Monto Fijo ($)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-sub font-bold text-[11px] text-gray-600 block mb-1">
                      {couponForm.type === 'percentage' ? 'Porcentaje (%) *' : 'Monto ($) *'}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={couponForm.discount}
                      onChange={(e) => setCouponForm({ ...couponForm, discount: e.target.value })}
                      placeholder={couponForm.type === 'percentage' ? '15' : '2000'}
                      className="w-full px-3 py-2 rounded-xl bg-white border-2 border-gray-200 font-sub text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-yellow"
                    />
                  </div>

                  <div>
                    <label className="font-sub font-bold text-[11px] text-gray-600 block mb-1">
                      Compra Mínima ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={couponForm.minPurchase}
                      onChange={(e) => setCouponForm({ ...couponForm, minPurchase: e.target.value })}
                      placeholder="0 = Sin mínimo"
                      className="w-full px-3 py-2 rounded-xl bg-white border-2 border-gray-200 font-sub text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-yellow"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                    <button
                      type="submit"
                      className="btn-cartoon-primary w-full py-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-cartoon-xs"
                    >
                      <Icon name="add" size={16} />
                      <span>Crear Cupón</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-sub font-bold text-[11px] text-gray-600 block mb-1">
                    Descripción / Mensaje para el cliente
                  </label>
                  <input
                    type="text"
                    value={couponForm.label}
                    onChange={(e) => setCouponForm({ ...couponForm, label: e.target.value })}
                    placeholder="Ej. 15% OFF en toda la carta por esta semana"
                    className="w-full px-3 py-2 rounded-xl bg-white border-2 border-gray-200 font-sub text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-yellow"
                  />
                </div>
              </form>

              {/* Lista de Cupones Existentes */}
              <div className="space-y-3">
                <span className="font-sub font-black text-xs text-gray-700 uppercase tracking-wider block">
                  Cupones Creados ({(promoData?.coupons || []).length})
                </span>

                {(promoData?.coupons || []).length === 0 ? (
                  <div className="p-6 text-center text-gray-400 font-sub text-xs border border-dashed rounded-2xl">
                    No hay cupones creados aún. Creá el primero arriba.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(promoData?.coupons || []).map((cp) => {
                      const discountStr =
                        cp.type === 'fixed'
                          ? `$${Number(cp.discount).toLocaleString('es-AR')}`
                          : `${Math.round(Number(cp.discount) * 100)}%`;

                      return (
                        <div
                          key={cp.code}
                          className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between transition-all ${
                            cp.active !== false
                              ? 'bg-white border-gray-200 hover:border-cartoon-yellow/80 shadow-xs'
                              : 'bg-gray-50 border-gray-200 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-display text-base text-cartoon-red tracking-wider font-bold">
                                {cp.code}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-display text-[11px] font-bold">
                                {discountStr} OFF
                              </span>
                            </div>

                            <p className="font-sub font-bold text-xs text-cartoon-ink line-clamp-1 mb-1">
                              {cp.label || 'Cupón de Descuento'}
                            </p>

                            <span className="font-sub text-[11px] text-gray-500 block">
                              {cp.minPurchase > 0
                                ? `Compra mínima: $${Number(cp.minPurchase).toLocaleString('es-AR')}`
                                : 'Sin monto mínimo'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => toggleCouponActive(cp.code, cp.active !== false)}
                              className={`px-2.5 py-1 rounded-lg font-sub font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${
                                cp.active !== false
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                            >
                              <Icon name={cp.active !== false ? 'check' : 'pause'} size={13} />
                              <span>{cp.active !== false ? 'Activo' : 'Pausado'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Seguro que querés eliminar el cupón "${cp.code}"?`)) {
                                  deleteCoupon(cp.code);
                                }
                              }}
                              className="p-1 rounded-lg text-gray-400 hover:text-cartoon-red hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Eliminar cupón"
                            >
                              <Icon name="delete" size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* NAVEGACIÓN EN CELULAR: BARRA INFERIOR FIJA ESTILO APLICACIÓN */}
      {/* ============================================================== */}
      <nav
        aria-label="Navegación inferior móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t-2 border-gray-200 flex items-center justify-around py-2 px-1 backdrop-blur-md shadow-lg"
      >
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                active ? 'text-cartoon-ink bg-cartoon-yellow/25 font-black border border-cartoon-ink/20 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon name={item.icon} size={20} />
              <span className="font-sub font-bold text-[10px] mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modal de Crear / Editar Producto */}
      <ProductModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSave={saveProduct}
      />

      {/* Modal de Confirmación de Borrado */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-modalIn">
          <div className="w-full max-w-sm bg-white rounded-3xl border-3 border-cartoon-ink shadow-cartoon-lg p-5 text-center space-y-4">
            <h3 className="font-display text-base text-cartoon-ink">¿Eliminar este plato?</h3>
            <p className="font-sub text-xs text-gray-600">
              Vas a eliminar <strong>"{deleteCandidate.name}"</strong> del catálogo.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-sub text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteProduct(deleteCandidate.id);
                  setDeleteCandidate(null);
                }}
                className="px-4 py-2 rounded-xl bg-cartoon-red text-white font-sub font-bold text-xs cursor-pointer shadow-sm hover:bg-cartoon-red-dark transition-colors"
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
