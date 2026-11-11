import React, { useState, useMemo, useEffect } from 'react';
import { Icon } from '../Icon';
import { CATEGORIES } from '../../data/products';
import { ProductModal } from './ProductModal';
import { useProducts } from '../../context/ProductsContext';
import { clearSession } from '../../lib/security';
import {
  getFinances,
  addEarning,
  addExpense,
  deleteFinanceItem,
} from '../../lib/financesStore';

const money = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

export const AdminDashboard = ({ onLogout, onGoToStore }) => {
  const { products, updateStock, toggleActive, saveProduct, deleteProduct } = useProducts();
  
  // Pestañas principales: 'ganancias' | 'gastos' | 'balance' | 'stock'
  const [activeTab, setActiveTab] = useState('balance');

  // Finanzas: Ganancias y Gastos
  const [finances, setFinances] = useState(() => getFinances());
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) setFinances(e.detail);
    };
    window.addEventListener('tricos_finances_sync', handler);
    return () => window.removeEventListener('tricos_finances_sync', handler);
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

  const navItems = [
    { id: 'balance', label: 'Balance', icon: 'account_balance_wallet', badge: money(financialTotals.netBalance) },
    { id: 'ganancias', label: 'Ganancias', icon: 'trending_up', badge: `+${money(financialTotals.totalEarnings)}` },
    { id: 'gastos', label: 'Gastos', icon: 'trending_down', badge: `-${money(financialTotals.totalExpenses)}` },
    { id: 'stock', label: 'Stock', icon: 'inventory_2', badge: `${products.length} platos` },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 flex flex-col md:flex-row select-none">
      
      {/* ============================================================== */}
      {/* NAVEGACIÓN EN COMPUTADORA: BARRA LATERAL AL COSTADO (SIDEBAR AMPLIO) */}
      {/* ============================================================== */}
      <aside className="hidden md:flex md:w-72 lg:w-80 md:fixed md:left-0 md:top-0 md:bottom-0 bg-white border-r-2 border-gray-200 flex-col justify-between p-6 lg:p-7 z-30 shadow-sm">
        <div>
          {/* Logo Oficial Nítido y Nombre */}
          <div className="flex items-center gap-3.5 mb-8 px-1">
            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-white border-2 border-cartoon-ink shadow-cartoon-xs p-1 flex items-center justify-center flex-shrink-0">
              <img
                src="/assets/logo_crisp.png"
                alt="Logo TRICO'S"
                className="w-full h-full object-contain block"
              />
            </div>
            <div>
              <h2 className="font-display text-2xl lg:text-3xl text-cartoon-ink leading-tight">TRICO'S</h2>
              <span className="font-sub font-bold text-xs text-gray-500 uppercase tracking-widest block mt-0.5">
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
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-sub font-bold text-sm lg:text-base cursor-pointer transition-all border-2 ${
                    active
                      ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-black'
                      : 'border-transparent text-gray-600 hover:text-cartoon-ink hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={item.icon} size={22} />
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
      <main className="flex-1 md:ml-72 lg:ml-80 p-5 sm:p-7 lg:p-10 pb-28 md:pb-10 max-w-7xl w-full">
        
        {/* Cabecera Móvil */}
        <div className="md:hidden flex items-center justify-between pb-4 mb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white border-2 border-cartoon-ink shadow-cartoon-xs p-1 flex items-center justify-center flex-shrink-0">
              <img
                src="/assets/logo_crisp.png"
                alt="Logo TRICO'S"
                className="w-full h-full object-contain block"
              />
            </div>
            <h1 className="font-display text-lg text-cartoon-ink">TRICO'S ADMIN</h1>
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
            
            {/* Tarjetas de Totales Grandes y Claras */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white p-5 sm:p-6 lg:p-8 rounded-3xl border-2 border-emerald-100 shadow-sm">
                <span className="font-sub font-bold text-xs sm:text-sm lg:text-base text-emerald-700 uppercase tracking-wider block mb-1">
                  🟢 Total Ganancias
                </span>
                <span className="font-display text-3xl sm:text-4xl lg:text-5xl text-emerald-600 block leading-tight mt-1">
                  {money(financialTotals.totalEarnings)}
                </span>
              </div>

              <div className="bg-white p-5 sm:p-6 lg:p-8 rounded-3xl border-2 border-rose-100 shadow-sm">
                <span className="font-sub font-bold text-xs sm:text-sm lg:text-base text-rose-700 uppercase tracking-wider block mb-1">
                  🔴 Total Gastos
                </span>
                <span className="font-display text-3xl sm:text-4xl lg:text-5xl text-rose-600 block leading-tight mt-1">
                  {money(financialTotals.totalExpenses)}
                </span>
              </div>

              <div className="bg-white p-5 sm:p-6 lg:p-8 rounded-3xl border-2 border-amber-100 shadow-sm">
                <span className="font-sub font-bold text-xs sm:text-sm lg:text-base text-amber-800 uppercase tracking-wider block mb-1">
                  🟡 Balance Neto
                </span>
                <span className={`font-display text-3xl sm:text-4xl lg:text-5xl block leading-tight mt-1 ${
                  financialTotals.netBalance >= 0 ? 'text-cartoon-ink' : 'text-cartoon-red'
                }`}>
                  {money(financialTotals.netBalance)}
                </span>
              </div>
            </div>

            {/* Accesos rápidos a agregar */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setActiveTab('ganancias')}
                className="py-4 px-5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 text-emerald-800 font-display text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-pointer transition-colors shadow-sm"
              >
                <Icon name="add_circle" size={22} />
                <span>+ Cargar Ganancia</span>
              </button>
              <button
                onClick={() => setActiveTab('gastos')}
                className="py-4 px-5 rounded-2xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 text-rose-800 font-display text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-pointer transition-colors shadow-sm"
              >
                <Icon name="remove_circle" size={22} />
                <span>- Cargar Gasto</span>
              </button>
            </div>

            {/* Movimientos Recientes */}
            <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 lg:p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 className="font-display text-base sm:text-lg lg:text-xl text-cartoon-ink">Historial de Movimientos</h3>
                <span className="font-sub text-xs sm:text-sm text-gray-500 font-bold">{finances.length} registros</span>
              </div>
              <div className="divide-y divide-gray-100">
                {finances.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 font-sub text-sm">
                    No hay movimientos registrados.
                  </div>
                ) : (
                  finances.map((item) => (
                    <div key={item.id} className="p-4 sm:p-5 lg:p-6 flex items-center justify-between gap-4 hover:bg-gray-50/70 transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          item.type === 'earning' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          <Icon name={item.type === 'earning' ? 'trending_up' : 'trending_down'} size={22} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-sub font-bold text-sm sm:text-base lg:text-lg text-cartoon-ink truncate">
                            {item.concept}
                          </p>
                          <p className="font-sub text-xs sm:text-sm text-gray-500 mt-0.5">
                            {item.date} {item.category ? `• ${item.category}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`font-display text-sm sm:text-base lg:text-lg ${
                          item.type === 'earning' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {item.type === 'earning' ? `+${money(item.amount)}` : `-${money(item.amount)}`}
                        </span>
                        <button
                          onClick={() => deleteFinanceItem(item.id)}
                          className="text-gray-400 hover:text-cartoon-red p-1.5 cursor-pointer transition-colors"
                          title="Eliminar movimiento"
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
        {/* SECCIÓN 2: GANANCIAS */}
        {/* ============================================================== */}
        {activeTab === 'ganancias' && (
          <div className="space-y-6 sm:space-y-8 animate-modalIn">
            <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-3xl border-2 border-gray-200 shadow-sm">
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
            <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-3xl border-2 border-gray-200 shadow-sm">
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
        {/* SECCIÓN 4: STOCK Y PLATOS (Amplio, Espacioso y Claro) */}
        {/* ============================================================== */}
        {activeTab === 'stock' && (
          <div className="space-y-6 sm:space-y-8 animate-modalIn">
            
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

            {/* Catálogo con control de stock grande y cómodo */}
            <div className="bg-white rounded-3xl border-2 border-gray-200 divide-y divide-gray-100 shadow-sm overflow-hidden">
              {filteredProducts.map((prod) => {
                const isOutOfStock = (prod.stock || 0) === 0;

                return (
                  <div
                    key={prod.id}
                    className={`p-4 sm:p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70 transition-colors ${
                      !prod.active ? 'opacity-40' : ''
                    }`}
                  >
                    {/* Info */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-cartoon-cream border border-gray-200 flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0 shadow-xs">
                        {prod.emoji || '🍔'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <h4 className="font-display text-base sm:text-lg lg:text-xl text-cartoon-ink truncate">{prod.name}</h4>
                          {isOutOfStock && (
                            <span className="px-2 py-0.5 rounded-md bg-cartoon-red text-white font-sub font-bold text-[10px]">
                              AGOTADO
                            </span>
                          )}
                        </div>
                        <span className="font-sub font-bold text-sm sm:text-base text-amber-600">
                          {money(prod.price || prod.variants?.[0]?.price)}
                        </span>
                      </div>
                    </div>

                    {/* Controles de Stock */}
                    <div className="flex items-center gap-3 sm:gap-4 justify-between sm:justify-end">
                      <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-2xl border border-gray-200 shadow-inner">
                        <button
                          type="button"
                          onClick={() => updateStock(prod.id, Math.max(0, (prod.stock || 0) - 1))}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-200 hover:bg-cartoon-red hover:text-white font-display text-sm sm:text-base text-gray-800 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={prod.stock || 0}
                          onChange={(e) => updateStock(prod.id, e.target.value)}
                          className="w-14 sm:w-16 text-center font-display text-sm sm:text-base bg-transparent text-gray-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateStock(prod.id, (prod.stock || 0) + 1)}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-200 hover:bg-emerald-500 hover:text-white font-display text-sm sm:text-base text-gray-800 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleActive(prod.id, prod.active)}
                          title={prod.active ? 'Pausar' : 'Reactivar'}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
                            prod.active ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-cartoon-red text-white'
                          }`}
                        >
                          <Icon name={prod.active ? 'visibility' : 'visibility_off'} size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(prod);
                            setModalOpen(true);
                          }}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-cartoon-ink flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Icon name="edit" size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(prod)}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-100 text-gray-400 hover:text-cartoon-red hover:bg-rose-50 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Icon name="delete" size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
