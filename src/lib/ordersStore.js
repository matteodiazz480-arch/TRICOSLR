/**
 * Módulo de Gestión de Pedidos y Participantes del Sorteo para Trico's.
 * Sincronización multi-dispositivo en tiempo real con Firestore, localStorage y BroadcastChannel.
 */
import { initFirebase, sanitizeForFirestore, flushFirestoreWrites } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const ORDERS_KEY = 'tricos_orders_data';

export const INITIAL_ORDERS = [
  {
    id: 'order-1731542400000',
    ticketNumber: 1001,
    customerName: 'Lucas Herrera',
    phone: '3804-123456',
    deliveryType: 'delivery',
    address: 'Av. Ortiz de Ocampo 1230, La Rioja',
    addressNotes: 'Portón negro, casa de dos pisos',
    mapUrl: 'https://www.google.com/maps?q=-29.421500,-66.852100',
    total: 26000,
    paymentMethod: 'Efectivo',
    items: [
      { name: 'Burger Ak-47 Doble', quantity: 1, price: 14000, subtotal: 14000 },
      { name: 'Trico Pollo Tiras x6', quantity: 1, price: 12000, subtotal: 12000 },
    ],
    participatingGiveaway: true,
    createdAt: '2026-11-13T21:40:00.000Z',
    status: 'confirmado',
    isWinner: false,
    winnerPrize: null,
  },
  {
    id: 'order-1731553200000',
    ticketNumber: 1002,
    customerName: 'Valentina Gómez',
    phone: '3804-654321',
    deliveryType: 'takeaway',
    address: 'Santa Cruz 524, B° San Martín',
    addressNotes: 'Retira en local',
    mapUrl: '',
    total: 18500,
    paymentMethod: 'Transferencia',
    items: [
      { name: 'Burger London Cheese Simple', quantity: 1, price: 12500, subtotal: 12500 },
      { name: 'Papas Rústicas Cheddar', quantity: 1, price: 6000, subtotal: 6000 },
    ],
    participatingGiveaway: true,
    createdAt: '2026-11-13T22:15:00.000Z',
    status: 'confirmado',
    isWinner: false,
    winnerPrize: null,
  },
  {
    id: 'order-1731600000000',
    ticketNumber: 1003,
    customerName: 'Joaquín Mercado',
    phone: '3804-789012',
    deliveryType: 'delivery',
    address: 'B° San Martín, Santa Cruz 610, La Rioja',
    addressNotes: 'Timbre blanco, rejas verdes',
    mapUrl: 'https://www.google.com/maps?q=-29.398500,-66.862000',
    total: 34000,
    paymentMethod: 'Efectivo',
    items: [
      { name: 'Combo Pollo Box x12', quantity: 1, price: 22000, subtotal: 22000 },
      { name: 'Burger Ak-47 Simple', quantity: 1, price: 12000, subtotal: 12000 },
    ],
    participatingGiveaway: true,
    createdAt: '2026-11-14T19:05:00.000Z',
    status: 'confirmado',
    isWinner: false,
    winnerPrize: null,
  },
  {
    id: 'order-1731607200000',
    ticketNumber: 1004,
    customerName: 'Camila Romero',
    phone: '3804-332211',
    deliveryType: 'delivery',
    address: 'Pelagio B. Luna 840, La Rioja',
    addressNotes: 'Dpto 2A',
    mapUrl: 'https://www.google.com/maps?q=-29.414000,-66.858000',
    total: 24000,
    paymentMethod: 'Transferencia',
    items: [
      { name: 'Burger Carioca Doble', quantity: 1, price: 14000, subtotal: 14000 },
      { name: 'Papas Especiales Bacon', quantity: 1, price: 10000, subtotal: 10000 },
    ],
    participatingGiveaway: true,
    createdAt: '2026-11-14T20:10:00.000Z',
    status: 'confirmado',
    isWinner: false,
    winnerPrize: null,
  },
];

export const getOrders = () => {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  // Si está vacío, sembramos los pedidos iniciales para que el admin vea clientes participando
  saveOrders(INITIAL_ORDERS, false);
  return INITIAL_ORDERS;
};

export const saveOrders = (orders, syncCloud = true) => {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders || []));
    window.dispatchEvent(new CustomEvent('tricos_orders_sync', { detail: orders || [] }));
    try {
      const ch = new BroadcastChannel('tricos_orders_channel');
      ch.postMessage(orders || []);
      ch.close();
    } catch {}
  } catch (err) {
    console.error('Error guardando pedidos localmente:', err);
  }

  if (syncCloud) {
    const { isConfigured, db } = initFirebase();
    if (isConfigured && db && Array.isArray(orders)) {
      orders.forEach(async (order) => {
        try {
          if (order && order.id) {
            await setDoc(doc(db, 'orders', order.id), order, { merge: true });
          }
        } catch (err) {
          console.warn('Error sincronizando pedido en Firestore:', err);
        }
      });
    }
  }
};

/**
 * Registra un nuevo pedido y participante en el sorteo (espera confirmación en Firestore)
 */
export const addOrder = async (orderData) => {
  const current = getOrders();
  const nextTicketNumber =
    current.reduce((max, o) => Math.max(max, Number(o.ticketNumber) || 1000), 1000) + 1;

  const orderId = orderData.id || `order-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newOrder = sanitizeForFirestore({
    id: orderId,
    ticketNumber: orderData.ticketNumber || nextTicketNumber,
    customerName: (orderData.customerName || 'Cliente').trim(),
    phone: (orderData.phone || '').trim(),
    deliveryType: orderData.deliveryType || 'delivery',
    address: orderData.address || '',
    addressNotes: orderData.addressNotes || '',
    mapUrl: orderData.mapUrl || '',
    location: orderData.location
      ? {
          lat: Number(orderData.location.lat) || 0,
          lng: Number(orderData.location.lng) || 0,
          address: String(orderData.location.address || ''),
        }
      : null,
    total: Number(orderData.total || 0),
    paymentMethod: orderData.paymentMethod || 'Efectivo',
    changeAmount: orderData.changeAmount || '',
    notes: orderData.notes || '',
    items: (orderData.items || []).map((it) => ({
      productId: it.productId || it.originalId || '',
      originalId: it.originalId || it.productId || '',
      name: it.name || '',
      quantity: Number(it.quantity || 1),
      price: Number(it.price || 0),
      subtotal: Number(it.subtotal || it.price * it.quantity || 0),
      variant: it.variant || 'Simple',
      variantId: it.variantId || 'simple',
      protein: it.protein || null,
    })),
    participatingGiveaway: true,
    createdAt: orderData.createdAt || new Date().toISOString(),
    status: orderData.status || 'pendiente',
    isWinner: false,
    winnerPrize: null,
  });

  const updated = [newOrder, ...current.filter((o) => o.id !== orderId)];
  saveOrders(updated, false);

  // Guardar directamente el nuevo pedido en Firestore (orders + canal rápido promotions/orders_sync) y esperar confirmación
  const { isConfigured, db } = initFirebase();
  if (isConfigured && db) {
    try {
      await Promise.allSettled([
        setDoc(doc(db, 'orders', orderId), newOrder, { merge: true }),
        setDoc(
          doc(db, 'promotions', 'orders_sync'),
          { latestOrder: newOrder, updatedAt: newOrder.createdAt },
          { merge: true }
        ),
      ]);
      await flushFirestoreWrites(1500);
    } catch (err) {
      console.warn('Error en Firestore addOrder:', err);
    }
  }

  return newOrder;
};

/**
 * Actualizar el estado operativo de un pedido ('pendiente' | 'preparacion' | 'enviado')
 */
export const updateOrderStatus = async (orderId, newStatus) => {
  const current = getOrders();
  const updated = current.map((o) => {
    if (o.id !== orderId) return o;
    return {
      ...o,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
  });

  saveOrders(updated, false);

  const { isConfigured, db } = initFirebase();
  if (isConfigured && db && orderId) {
    try {
      await setDoc(
        doc(db, 'orders', orderId),
        { status: newStatus, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      console.warn('Error actualizando estado del pedido en Firestore:', err);
    }
  }

  return updated;
};

/**
 * Eliminar un pedido
 */
export const deleteOrder = async (orderId) => {
  const current = getOrders();
  const updated = current.filter((o) => o.id !== orderId);
  saveOrders(updated, false);

  const { isConfigured, db } = initFirebase();
  if (isConfigured && db) {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (err) {
      console.warn('Error eliminando pedido en Firestore:', err);
    }
  }

  return updated;
};

/**
 * Marcar o desmarcar un ganador del sorteo
 */
export const toggleOrderWinner = (orderId, prizeTitle = null) => {
  const current = getOrders();
  const updated = current.map((o) => {
    if (o.id !== orderId) return o;
    const isNowWinner = prizeTitle ? true : !o.isWinner;
    return {
      ...o,
      isWinner: isNowWinner,
      winnerPrize: isNowWinner ? prizeTitle || 'Premio del Sorteo' : null,
    };
  });

  saveOrders(updated, true);
  return updated;
};

/**
 * Subscripción en tiempo real a la lista de pedidos
 */
export const subscribeToOrders = (callback) => {
  callback(getOrders());

  const syncHandler = (e) => {
    if (e.detail && Array.isArray(e.detail)) callback(e.detail);
  };
  window.addEventListener('tricos_orders_sync', syncHandler);

  const storageHandler = (e) => {
    if (e.key === ORDERS_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) callback(parsed);
      } catch {}
    }
  };
  window.addEventListener('storage', storageHandler);

  let channel = null;
  try {
    channel = new BroadcastChannel('tricos_orders_channel');
    channel.onmessage = (msg) => {
      if (msg.data && Array.isArray(msg.data)) callback(msg.data);
    };
  } catch {}

  const { isConfigured, db } = initFirebase();
  const unsubs = [];
  if (isConfigured && db) {
    try {
      const colRef = collection(db, 'orders');
      const unsubCol = onSnapshot(
        colRef,
        (snapshot) => {
          if (snapshot.empty) return;
          const list = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({ ...data, id: d.id });
          });
          list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          callback(list);
          saveOrders(list, false);
        },
        (err) => {
          console.warn('Firestore orders onSnapshot:', err);
        }
      );
      unsubs.push(unsubCol);
    } catch (err) {
      console.warn('Error iniciando onSnapshot de pedidos:', err);
    }

    try {
      const unsubSync = onSnapshot(
        doc(db, 'promotions', 'orders_sync'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const latest = data?.latestOrder;
            if (latest && latest.id) {
              const current = getOrders();
              if (!current.some((o) => o.id === latest.id)) {
                const merged = [latest, ...current];
                merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                callback(merged);
                saveOrders(merged, false);
              }
            }
          }
        },
        () => {}
      );
      unsubs.push(unsubSync);
    } catch {}
  }

  return () => {
    window.removeEventListener('tricos_orders_sync', syncHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel) channel.close();
    unsubs.forEach((fn) => {
      if (typeof fn === 'function') fn();
    });
  };
};
