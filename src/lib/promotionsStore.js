/**
 * Módulo de Gestión de Promociones, Cupones y Sorteos para Trico's.
 * Sincronización reactiva con localStorage, BroadcastChannel y Firestore.
 */
import { initFirebase } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const PROMOTIONS_KEY = 'tricos_promotions_data';

export const DEFAULT_PROMOTIONS_DATA = {
  giveaway: {
    active: true,
    title: 'GRAN SORTEO TRICO\'S',
    subtitle: '¡Participá gratis con tu pedido o etiquetándonos en Instagram!',
    drawDate: 'Fin de mes',
    prizes: [
      {
        id: 1,
        title: 'Diseño de Web Profesional Personalizada',
        detail: 'Para oficios, emprendimientos o comercio (incluye creación completa y mes de dominio gratis).',
        emoji: '💻',
        badge: '1° PREMIO',
      },
      {
        id: 2,
        title: 'Combo Carioca + Delivery Gratis',
        detail: 'Súper banquete de hamburguesas con papas fritas y envío 100% bonificado a tu casa.',
        emoji: '🍔',
        badge: '2° PREMIO',
      },
      {
        id: 3,
        title: 'Mes de Gestión de Redes Sociales',
        detail: 'Planificación estratégica, diseño gráfico de publicaciones y optimización de perfil.',
        emoji: '📱',
        badge: '3° PREMIO',
      },
      {
        id: 4,
        title: 'Combo Pollo Frito para Compartir',
        detail: 'Tiras y piezas ultra crocantes con doble salsa especial y papas doradas.',
        emoji: '🍗',
        badge: '4° PREMIO',
      },
    ],
    terms: 'Participás automáticamente con cualquier pedido realizado en la web con tu número de teléfono, o compartiendo una foto de tu pedido en Instagram etiquetando a @tricos.',
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
        return {
          giveaway: { ...DEFAULT_PROMOTIONS_DATA.giveaway, ...(parsed.giveaway || {}) },
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
