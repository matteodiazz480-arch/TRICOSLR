/**
 * Módulo de Gestión Financiera (Gastos y Ganancias) para Trico's.
 * Almacenamiento local persistente con sincronización reactiva.
 */

const FINANCES_KEY = 'tricos_finances_data';

export const getFinances = () => {
  try {
    const raw = localStorage.getItem(FINANCES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  // Datos iniciales de demostración prácticos para que no empiece en 0
  const initial = [
    {
      id: 'fin-1',
      type: 'earning', // 'earning' | 'expense'
      amount: 145000,
      concept: 'Ventas Turno Noche (Local + Delivery)',
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now() - 3600000 * 2,
    },
    {
      id: 'fin-2',
      type: 'expense',
      amount: 42000,
      concept: 'Compra de medallones tapa de asado premium (10kg)',
      category: 'Insumos',
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now() - 3600000 * 5,
    },
    {
      id: 'fin-3',
      type: 'expense',
      amount: 18500,
      concept: 'Panes brioche artesanales (50 u.)',
      category: 'Insumos',
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now() - 3600000 * 8,
    },
    {
      id: 'fin-4',
      type: 'earning',
      amount: 88000,
      concept: 'Ventas del fin de semana (Turno Tarde)',
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      createdAt: Date.now() - 86400000,
    },
  ];

  saveFinances(initial);
  return initial;
};

export const saveFinances = (items) => {
  try {
    localStorage.setItem(FINANCES_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('tricos_finances_sync', { detail: items }));
  } catch (e) {
    console.error('Error guardando finanzas:', e);
  }
};

export const addEarning = (earningData) => {
  const current = getFinances();
  const item = {
    id: `earning-${Date.now()}`,
    type: 'earning',
    amount: Math.max(0, Math.round(Number(earningData.amount || 0))),
    concept: (earningData.concept || 'Ingreso de ventas').trim(),
    date: earningData.date || new Date().toISOString().split('T')[0],
    createdAt: Date.now(),
  };
  const next = [item, ...current];
  saveFinances(next);
  return next;
};

export const addExpense = (expenseData) => {
  const current = getFinances();
  const item = {
    id: `expense-${Date.now()}`,
    type: 'expense',
    amount: Math.max(0, Math.round(Number(expenseData.amount || 0))),
    concept: (expenseData.concept || 'Gasto operativo').trim(),
    category: expenseData.category || 'Insumos',
    date: expenseData.date || new Date().toISOString().split('T')[0],
    createdAt: Date.now(),
  };
  const next = [item, ...current];
  saveFinances(next);
  return next;
};

export const deleteFinanceItem = (id) => {
  const current = getFinances();
  const next = current.filter((it) => it.id !== id);
  saveFinances(next);
  return next;
};
