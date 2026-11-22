/**
 * Módulo de Gestión de Promociones, Cupones y Sorteos para Trico's.
 * Sincronización reactiva con localStorage, BroadcastChannel y Firestore.
 */
import { initFirebase } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const PROMOTIONS_KEY = 'tricos_promotions_data';

export const DEFAULT_PROMOTIONS_DATA = {
  freeDelivery: {
    active: true,
    minAmount: 55000,
  },
  giveaway: {
    active: true,
    deleted: false,
    title: 'GRAN SORTEO TRICO\'S',
    subtitle: '¡Con cada pedido en la web participás automáticamente por 4 premios!',
    prizeName: 'Diseño Web + Combos y Gestión',
    winnersCount: 4,
    drawDate: 'Fin de mes',
    prizes: [
      {
        id: 1,
        title: 'Diseño Web Profesional',
        detail: 'Creación + 1 mes dominio',
        icon: 'devices',
        badge: '1° PREMIO',
      },
      {
        id: 2,
        title: 'Combo Carioca + Delivery',
        detail: 'Envío 100% bonificado',
        icon: 'lunch_dining',
        badge: '2° PREMIO',
      },
      {
        id: 3,
        title: 'Mes Gestión Redes Sociales',
        detail: 'Planificación y diseño',
        icon: 'share',
        badge: '3° PREMIO',
      },
      {
        id: 4,
        title: 'Combo Pollo para Compartir',
        detail: 'Tiras crocantes con salsas',
        icon: 'fastfood',
        badge: '4° PREMIO',
      },
    ],
    terms: 'Participás automáticamente con cualquier pedido realizado en la web con tu número de teléfono.',
  },
  coupons: [
    {
      code: 'TRICO10',
      discount: 0.10,
      type: 'percentage', // 'percentage' | 'fixed'
      label: '10% OFF Especial de Bienvenida',
      active: true,
      minPurchase: 0,
    },
    {
      code: 'CRUNCH20',
      discount: 0.20,
      type: 'percentage',
      label: '20% OFF en Línea Pollo',
      active: true,
      minPurchase: 25000,
    },
  ],
};

export const getPromotions = () => {
  try {
    const raw = localStorage.getItem(PROMOTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const gw = parsed.giveaway || {};
        const fd = parsed.freeDelivery || {};
        return {
          freeDelivery: {
            ...DEFAULT_PROMOTIONS_DATA.freeDelivery,
            ...fd,
            active: fd.active !== undefined ? Boolean(fd.active) : DEFAULT_PROMOTIONS_DATA.freeDelivery.active,
            minAmount:
              fd.minAmount !== undefined
                ? Math.max(0, Number(fd.minAmount) || 0)
                : DEFAULT_PROMOTIONS_DATA.freeDelivery.minAmount,
          },
          giveaway: {
            ...DEFAULT_PROMOTIONS_DATA.giveaway,
            ...gw,
            deleted: gw.deleted === true,
            prizes:
              Array.isArray(gw.prizes) && gw.prizes.length > 0
                ? gw.prizes
                : DEFAULT_PROMOTIONS_DATA.giveaway.prizes,
          },
          coupons: Array.isArray(parsed.coupons) ? parsed.coupons : DEFAULT_PROMOTIONS_DATA.coupons,
        };
      }
    }
  } catch {}

  savePromotions(DEFAULT_PROMOTIONS_DATA, false);
  return DEFAULT_PROMOTIONS_DATA;
};

export const savePromotions = (data, shouldSyncCloud = true) => {
  try {
    localStorage.setItem(PROMOTIONS_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('tricos_promotions_sync', { detail: data }));
    try {
      const ch = new BroadcastChannel('tricos_promotions_channel');
      ch.postMessage(data);
      ch.close();
    } catch {}
  } catch (e) {
    console.error('Error guardando promociones:', e);
  }

  if (shouldSyncCloud) {
    const { isConfigured, db } = initFirebase();
    if (isConfigured && db) {
      setDoc(doc(db, 'promotions', 'main'), { ...data, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    }
  }
};

export const subscribeToPromotions = (callback) => {
  callback(getPromotions());

  const syncHandler = (e) => {
    if (e.detail && typeof e.detail === 'object') callback(e.detail);
  };
  window.addEventListener('tricos_promotions_sync', syncHandler);

  const storageHandler = (e) => {
    if (e.key === PROMOTIONS_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && typeof parsed === 'object') callback(parsed);
      } catch {}
    }
  };
  window.addEventListener('storage', storageHandler);

  let channel = null;
  try {
    channel = new BroadcastChannel('tricos_promotions_channel');
    channel.onmessage = (msg) => {
      if (msg.data && typeof msg.data === 'object') callback(msg.data);
    };
  } catch {}

  const { isConfigured, db } = initFirebase();
  let unsubscribeFirestore = null;
  if (isConfigured && db) {
    try {
      unsubscribeFirestore = onSnapshot(
        doc(db, 'promotions', 'main'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            callback(data);
            savePromotions(data, false);
          }
        },
        () => {}
      );
    } catch {}
  }

  return () => {
    window.removeEventListener('tricos_promotions_sync', syncHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel) channel.close();
    if (typeof unsubscribeFirestore === 'function') unsubscribeFirestore();
  };
};

export const updateGiveaway = (giveawayUpdates) => {
  const current = getPromotions();
  const next = {
    ...current,
    giveaway: {
      ...current.giveaway,
      ...giveawayUpdates,
    },
  };
  savePromotions(next, true);
  return next;
};

export const deleteGiveaway = () => {
  const current = getPromotions();
  const next = {
    ...current,
    giveaway: {
      ...current.giveaway,
      deleted: true,
      active: false,
    },
  };
  savePromotions(next, true);
  return next;
};

export const restoreGiveaway = () => {
  const current = getPromotions();
  const next = {
    ...current,
    giveaway: {
      ...DEFAULT_PROMOTIONS_DATA.giveaway,
      ...current.giveaway,
      deleted: false,
      active: true,
    },
  };
  savePromotions(next, true);
  return next;
};

export const addCoupon = (couponData) => {
  const current = getPromotions();
  const cleanCode = (couponData.code || '').trim().toUpperCase();
  if (!cleanCode) return current;

  const newCoupon = {
    code: cleanCode,
    discount: Number(couponData.discount) || 0.10,
    type: couponData.type || 'percentage',
    label: (couponData.label || `${cleanCode} Descuento`).trim(),
    active: couponData.active !== undefined ? couponData.active : true,
    minPurchase: Number(couponData.minPurchase) || 0,
    createdAt: Date.now(),
  };

  const filtered = current.coupons.filter((c) => c.code !== cleanCode);
  const next = {
    ...current,
    coupons: [newCoupon, ...filtered],
  };
  savePromotions(next, true);
  return next;
};

export const deleteCoupon = (code) => {
  const current = getPromotions();
  const next = {
    ...current,
    coupons: current.coupons.filter((c) => c.code !== code),
  };
  savePromotions(next, true);
  return next;
};

export const toggleCouponActive = (code, currentActive) => {
  const current = getPromotions();
  const next = {
    ...current,
    coupons: current.coupons.map((c) => (c.code === code ? { ...c, active: !currentActive } : c)),
  };
  savePromotions(next, true);
  return next;
};

export const updateFreeDelivery = (updates) => {
  const current = getPromotions();
  const currentFd = current.freeDelivery || DEFAULT_PROMOTIONS_DATA.freeDelivery;
  const next = {
    ...current,
    freeDelivery: {
      ...currentFd,
      ...updates,
      active: updates.active !== undefined ? Boolean(updates.active) : currentFd.active,
      minAmount:
        updates.minAmount !== undefined
          ? Math.max(0, Number(updates.minAmount) || 0)
          : currentFd.minAmount,
    },
  };
  savePromotions(next, true);
  return next;
};
