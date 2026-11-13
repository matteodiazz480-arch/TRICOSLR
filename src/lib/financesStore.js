/**
 * Módulo de Gestión Financiera (Gastos y Ganancias) para Trico's.
 * Almacenamiento local persistente con sincronización reactiva multinavegador y Firestore.
 */
import { initFirebase } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

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

  saveFinances(initial, false);
  return initial;
};

export const saveFinances = (items, shouldSyncCloud = true) => {
  try {
    localStorage.setItem(FINANCES_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('tricos_finances_sync', { detail: items }));
    try {
      const ch = new BroadcastChannel('tricos_finances_channel');
      ch.postMessage(items);
      ch.close();
    } catch {}
  } catch (e) {
    console.error('Error guardando finanzas:', e);
  }

  // Sincronización en segundo plano con Firestore
  if (shouldSyncCloud && Array.isArray(items)) {
    const { isConfigured, db } = initFirebase();
    if (isConfigured && db && items.length > 0) {
      const latest = items[0];
      if (latest && latest.id) {
        setDoc(doc(db, 'finances', latest.id), latest, { merge: true }).catch(() => {});
      }
    }
  }
};

// Subscripción en tiempo real a movimientos financieros (Eventos locales + BroadcastChannel + Storage + Firestore)
export const subscribeToFinances = (callback) => {
  callback(getFinances());

  // Listener local de ventana
  const syncHandler = (e) => {
    if (e.detail && Array.isArray(e.detail)) callback(e.detail);
  };
  window.addEventListener('tricos_finances_sync', syncHandler);

  // Listener nativo storage (entre diferentes pestañas o ventanas del navegador)
  const storageHandler = (e) => {
    if (e.key === FINANCES_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) callback(parsed);
      } catch {}
    }
  };
  window.addEventListener('storage', storageHandler);

  // BroadcastChannel para sincronización instantánea sin latencia
  let channel = null;
  try {
    channel = new BroadcastChannel('tricos_finances_channel');
    channel.onmessage = (msg) => {
      if (msg.data && Array.isArray(msg.data)) callback(msg.data);
    };
  } catch {}

  // Sincronización en la nube con Firestore si está conectado
  const { isConfigured, db } = initFirebase();
  let unsubscribeFirestore = null;
  if (isConfigured && db) {
    try {
      const colRef = collection(db, 'finances');
      unsubscribeFirestore = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = [];
            snapshot.forEach((d) => list.push({ ...d.data(), id: d.id }));
            list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            callback(list);
            saveFinances(list, false);
          }
        },
        (err) => {
          // Si las reglas de Firestore aún no están públicas, fallback seguro a local
        }
      );
    } catch {}
  }

  return () => {
    window.removeEventListener('tricos_finances_sync', syncHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel) channel.close();
    if (typeof unsubscribeFirestore === 'function') unsubscribeFirestore();
  };
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
  saveFinances(next, true);
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
  saveFinances(next, true);
  return next;
};

export const deleteFinanceItem = (id) => {
  const current = getFinances();
  const next = current.filter((it) => it.id !== id);
  saveFinances(next, false);

  const { isConfigured, db } = initFirebase();
  if (isConfigured && db) {
    deleteDoc(doc(db, 'finances', id)).catch(() => {});
  }

  return next;
};
