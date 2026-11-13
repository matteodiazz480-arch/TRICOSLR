/**
 * Módulo de Gestión Financiera (Gastos y Ganancias) para Trico's.
 * Sincronización en tiempo real multi-dispositivo y persistencia garantizada en Firestore y localStorage.
 */
import { initFirebase } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const FINANCES_KEY = 'tricos_finances_data';

export const getFinances = () => {
  try {
    const raw = localStorage.getItem(FINANCES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

export const saveFinances = (items) => {
  try {
    localStorage.setItem(FINANCES_KEY, JSON.stringify(items || []));
    window.dispatchEvent(new CustomEvent('tricos_finances_sync', { detail: items || [] }));
    try {
      const ch = new BroadcastChannel('tricos_finances_channel');
      ch.postMessage(items || []);
      ch.close();
    } catch {}
  } catch (e) {
    console.error('Error guardando finanzas localmente:', e);
  }
};

// Subscripción en tiempo real a movimientos financieros
export const subscribeToFinances = (callback) => {
  // 1. Emitir valor actual en cache local de inmediato
  callback(getFinances());

  // 2. Listener local de eventos en la misma ventana
  const syncHandler = (e) => {
    if (e.detail && Array.isArray(e.detail)) callback(e.detail);
  };
  window.addEventListener('tricos_finances_sync', syncHandler);

  // 3. Listener de storage (entre pestañas del mismo navegador)
  const storageHandler = (e) => {
    if (e.key === FINANCES_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) callback(parsed);
      } catch {}
    }
  };
  window.addEventListener('storage', storageHandler);

  // 4. BroadcastChannel para sincronización instantánea
  let channel = null;
  try {
    channel = new BroadcastChannel('tricos_finances_channel');
    channel.onmessage = (msg) => {
      if (msg.data && Array.isArray(msg.data)) callback(msg.data);
    };
  } catch {}

  // 5. Firestore en la nube (Sincronización multi-dispositivo en tiempo real)
  const { isConfigured, db } = initFirebase();
  let unsubscribeFirestore = null;
  if (isConfigured && db) {
    try {
      const colRef = collection(db, 'finances');
      unsubscribeFirestore = onSnapshot(
        colRef,
        (snapshot) => {
          const list = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({ ...data, id: d.id });
          });
          // Ordenar cronológicamente descendente (lo más nuevo arriba)
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          
          callback(list);
          saveFinances(list);
        },
        (err) => {
          console.warn('Firestore finances onSnapshot:', err);
        }
      );
    } catch (err) {
      console.warn('Error iniciando onSnapshot de finanzas:', err);
    }
  }

  return () => {
    window.removeEventListener('tricos_finances_sync', syncHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel) channel.close();
    if (typeof unsubscribeFirestore === 'function') unsubscribeFirestore();
  };
};

export const addEarning = async (earningData) => {
  const current = getFinances();
  const id = `earning-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const item = {
    id,
    type: 'earning',
    amount: Math.max(0, Math.round(Number(earningData.amount || 0))),
    concept: (earningData.concept || 'Ingreso de ventas').trim(),
    date: earningData.date || new Date().toISOString().split('T')[0],
    createdAt: Date.now(),
  };

  const next = [item, ...current.filter((x) => x.id !== id)];
  saveFinances(next);

  const { isConfigured, db } = initFirebase();
  if (isConfigured && db) {
    try {
      await setDoc(doc(db, 'finances', id), item, { merge: true });
    } catch (err) {
      console.warn('Error guardando ganancia en Firestore:', err);
    }
  }

  return next;
};

export const addExpense = async (expenseData) => {
  const current = getFinances();
  const id = `expense-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const item = {
    id,
    type: 'expense',
    amount: Math.max(0, Math.round(Number(expenseData.amount || 0))),
    concept: (expenseData.concept || 'Gasto operativo').trim(),
    category: expenseData.category || 'Insumos',
    date: expenseData.date || new Date().toISOString().split('T')[0],
    createdAt: Date.now(),
  };

  const next = [item, ...current.filter((x) => x.id !== id)];
  saveFinances(next);

  const { isConfigured, db } = initFirebase();
  if (isConfigured && db) {
    try {
      await setDoc(doc(db, 'finances', id), item, { merge: true });
    } catch (err) {
      console.warn('Error guardando gasto en Firestore:', err);
    }
  }

  return next;
};

export const deleteFinanceItem = async (id) => {
  const current = getFinances();
  const next = current.filter((it) => it.id !== id);
  saveFinances(next);

  const { isConfigured, db } = initFirebase();
  if (isConfigured && db) {
    try {
      await deleteDoc(doc(db, 'finances', id));
    } catch (err) {
      console.warn('Error eliminando movimiento en Firestore:', err);
    }
  }

  return next;
};
