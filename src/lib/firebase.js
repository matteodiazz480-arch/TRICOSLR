import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { PRODUCTS } from '../data/products';
import { logSecurityEvent } from './security';

// Configuración de Firebase leída de variables de entorno o guardada por el administrador
export const getFirebaseConfig = () => {
  try {
    const saved = localStorage.getItem('tricos_firebase_custom_config');
    if (saved) return JSON.parse(saved);
  } catch {}

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAC1rEWztNCcLO7Tu3wzXShdJh5C3t65FE',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'tricos-burguers.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tricos-burguers',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'tricos-burguers.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '267701557169',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:267701557169:web:01db58322eb98f971ecf90',
  };
};

let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;

// Inicializa Firebase si los campos mínimos están presentes
export const initFirebase = () => {
  const config = getFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    return { isConfigured: false, app: null, auth: null, db: null };
  }

  try {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
    firebaseAuth = getAuth(firebaseApp);
    firestoreDb = getFirestore(firebaseApp);
    return { isConfigured: true, app: firebaseApp, auth: firebaseAuth, db: firestoreDb };
  } catch (err) {
    console.warn('Error inicializando Firebase:', err);
    return { isConfigured: false, app: null, auth: null, db: null, error: err.message };
  }
};

// Guardar nueva configuración de Firebase desde el dashboard
export const saveCustomFirebaseConfig = (newConfig) => {
  try {
    localStorage.setItem('tricos_firebase_custom_config', JSON.stringify(newConfig));
    logSecurityEvent('FIREBASE_CONFIG_UPDATED', { projectId: newConfig.projectId });
    return initFirebase();
  } catch (e) {
    return { isConfigured: false, error: e.message };
  }
};

// ============================================================================
// PRODUCTOS Y GESTIÓN DE STOCK (Firestore + Fallback Local Persistente)
// ============================================================================

const LOCAL_PRODUCTS_KEY = 'tricos_products_db';

// Inicialización de productos por defecto con stock (50 unidades por defecto a cada plato)
export const getDefaultProductsWithStock = () => {
  return PRODUCTS.map((p) => ({
    ...p,
    stock: p.stock !== undefined ? p.stock : 35, // Stock inicial realista
    active: p.active !== undefined ? p.active : true, // Habilitado para pedir
    updatedAt: new Date().toISOString(),
  }));
};

// Obtener productos desde cache local
export const getLocalProducts = () => {
  const defaults = getDefaultProductsWithStock();
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = defaults.map((def) => {
          const found = parsed.find((p) => p.id === def.id);
          if (!found) return def;
          return {
            ...def,
            ...found,
            image: found.image || def.image,
          };
        });
        // Preservar productos personalizados agregados en el panel admin
        const customItems = parsed.filter((p) => !defaults.some((d) => d.id === p.id));
        return [...merged, ...customItems];
      }
    }
  } catch {}
  saveLocalProducts(defaults);
  return defaults;
};

// Helper global y estricto para verificar si un producto está agotado
export const isProductOutOfStock = (product) => {
  if (!product) return true;
  if (product.active === false) return true;
  const n = Number(product.stock);
  return isNaN(n) || n <= 0;
};

// Guardar productos en cache local y emitir evento en tiempo real
export const saveLocalProducts = (products) => {
  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent('tricos_products_sync', { detail: products }));
    try {
      const ch = new BroadcastChannel('tricos_products_channel');
      ch.postMessage(products);
      ch.close();
    } catch {}
  } catch (e) {
    console.error('Error guardando productos locales:', e);
  }
};

// Subscripción en tiempo real a la colección de productos
export const subscribeToProducts = (callback) => {
  // Siempre entregar primero el catálogo actual de cache local para carga instantánea
  callback(getLocalProducts());

  // Escuchar eventos en la misma ventana (custom event)
  const localSyncHandler = (e) => {
    if (e.detail && Array.isArray(e.detail)) {
      callback(e.detail);
    }
  };
  window.addEventListener('tricos_products_sync', localSyncHandler);

  // Escuchar evento 'storage' nativo del navegador para sincronizar entre pestañas abiertas
  const storageHandler = (e) => {
    if (e.key === LOCAL_PRODUCTS_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed) && parsed.length > 0) {
          callback(parsed);
        }
      } catch {}
    }
  };
  window.addEventListener('storage', storageHandler);

  // BroadcastChannel para sincronización instantánea entre pestañas
  let channel = null;
  try {
    channel = new BroadcastChannel('tricos_products_channel');
    channel.onmessage = (msg) => {
      if (msg.data && Array.isArray(msg.data)) {
        callback(msg.data);
      }
    };
  } catch {}

  const { isConfigured, db } = initFirebase();
  let unsubscribeFirestore = null;

  // Si Firebase Firestore está conectado, mantener sincronización en la nube
  if (isConfigured && db) {
    try {
      const productsCol = collection(db, 'products');
      unsubscribeFirestore = onSnapshot(
        productsCol,
        async (snapshot) => {
          if (snapshot.empty) {
            const defaults = getLocalProducts();
            for (const item of defaults) {
              await setDoc(doc(db, 'products', item.id), item, { merge: true });
            }
            callback(defaults);
            saveLocalProducts(defaults);
          } else {
            const remoteList = [];
            snapshot.forEach((d) => remoteList.push({ ...d.data(), id: d.id }));
            callback(remoteList);
            saveLocalProducts(remoteList);
          }
        },
        (err) => {
          console.warn('Firestore snapshot error, manteniendo catálogo local:', err);
          callback(getLocalProducts());
        }
      );
    } catch (err) {
      console.warn('Error iniciando onSnapshot en Firestore:', err);
    }
  }

  return () => {
    window.removeEventListener('tricos_products_sync', localSyncHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel) channel.close();
    if (typeof unsubscribeFirestore === 'function') {
      unsubscribeFirestore();
    }
  };
};

// Descontar stock atómicamente para un pedido completo
export const discountStockForOrder = async (orderItems) => {
  if (!Array.isArray(orderItems) || orderItems.length === 0) return getLocalProducts();

  const current = getLocalProducts();
  const next = [...current];
  const affectedUpdates = [];

  // 1. Agrupar deducciones consolidadas por producto base
  const deductionsByProdId = new Map();

  for (const item of orderItems) {
    if (!item) continue;
    const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
    const targetId = item.productId || item.id || item.originalId;
    const origId = item.originalId;
    const rawName = (item.name || item.baseName || '').trim().toLowerCase();

    // Búsqueda inteligente y tolerante en el catálogo de productos
    const matched = next.find((p) => {
      if (!p) return false;
      if (targetId && p.id === targetId) return true;
      if (origId && p.id === origId) return true;
      if (targetId && typeof targetId === 'string' && targetId.startsWith(p.id)) return true;
      if (origId && typeof origId === 'string' && origId.startsWith(p.id)) return true;
      if (rawName && p.name) {
        const pName = p.name.trim().toLowerCase();
        if (rawName === pName || rawName.startsWith(pName) || pName.startsWith(rawName)) return true;
      }
      return false;
    });

    if (matched) {
      const prev = deductionsByProdId.get(matched.id) || 0;
      deductionsByProdId.set(matched.id, prev + qty);
    }
  }

  // 2. Aplicar la resta a cada producto encontrado
  deductionsByProdId.forEach((deductQty, prodId) => {
    const idx = next.findIndex((p) => p.id === prodId);
    if (idx !== -1) {
      const currentStock = Number(next[idx].stock !== undefined ? next[idx].stock : 35);
      const newStock = Math.max(0, currentStock - deductQty);
      next[idx] = {
        ...next[idx],
        stock: newStock,
        updatedAt: new Date().toISOString(),
      };
      affectedUpdates.push({ id: prodId, stock: newStock });
    }
  });

  // 3. Persistir en localStorage y notificar a la aplicación de inmediato
  saveLocalProducts(next);

  // 4. Sincronizar en Firestore esperándolo para que persista antes de cambiar de app
  const { isConfigured, db } = initFirebase();
  if (isConfigured && db && affectedUpdates.length > 0) {
    try {
      await Promise.all(
        affectedUpdates.map(({ id, stock }) =>
          setDoc(doc(db, 'products', id), { stock, updatedAt: new Date().toISOString() }, { merge: true })
        )
      );
    } catch (err) {
      console.warn('Error sincronizando deducción de stock en Firestore:', err);
    }
  }

  logSecurityEvent('ORDER_STOCK_DEDUCTED', {
    itemsCount: orderItems.length,
    affectedCount: affectedUpdates.length,
  });

  return next;
};

// Registrar pedido formalmente en la colección 'orders' de Firestore
export const recordOrderInFirestore = async (orderData) => {
  const { isConfigured, db } = initFirebase();
  if (!isConfigured || !db || !orderData) return null;

  try {
    const orderId = `order-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const docData = {
      id: orderId,
      customerName: (orderData.customerName || 'Cliente').trim(),
      total: Number(orderData.total || 0),
      deliveryType: orderData.deliveryType || 'delivery',
      items: (orderData.items || []).map((it) => ({
        productId: it.productId || it.id || '',
        name: it.name || '',
        quantity: Number(it.quantity || 1),
        price: Number(it.price || 0),
      })),
      createdAt: new Date().toISOString(),
      status: 'confirmado',
    };
    await setDoc(doc(db, 'orders', orderId), docData);
    return orderId;
  } catch (err) {
    console.warn('Error guardando pedido en Firestore:', err);
    return null;
  }
};

// Actualizar stock de un producto específico
export const updateProductStock = async (productId, newStock) => {
  const stock = Math.max(0, Math.round(Number(newStock)));
  const { isConfigured, db } = initFirebase();

  if (isConfigured && db) {
    try {
      const docRef = doc(db, 'products', productId);
      await updateDoc(docRef, {
        stock,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Error en Firestore updateDoc, actualizando local:', err);
    }
  }

  // Actualizar local
  const current = getLocalProducts();
  const next = current.map((p) => (p.id === productId ? { ...p, stock, updatedAt: new Date().toISOString() } : p));
  saveLocalProducts(next);
  logSecurityEvent('STOCK_UPDATED', { productId, newStock: stock });
  return next;
};

// Alternar estado activo / inactivo de un producto
export const toggleProductActive = async (productId, currentActive) => {
  const active = !currentActive;
  const { isConfigured, db } = initFirebase();

  if (isConfigured && db) {
    try {
      const docRef = doc(db, 'products', productId);
      await updateDoc(docRef, {
        active,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {}
  }

  const current = getLocalProducts();
  const next = current.map((p) => (p.id === productId ? { ...p, active, updatedAt: new Date().toISOString() } : p));
  saveLocalProducts(next);
  logSecurityEvent('PRODUCT_TOGGLED', { productId, active });
  return next;
};

// Crear o editar un producto completo
export const saveProduct = async (productData) => {
  const { isConfigured, db } = initFirebase();
  const id = productData.id || `custom-${Date.now()}`;
  const record = {
    ...productData,
    id,
    stock: Math.max(0, Math.round(Number(productData.stock || 0))),
    price: Math.max(0, Number(productData.price || 0)),
    active: productData.active !== undefined ? productData.active : true,
    updatedAt: new Date().toISOString(),
  };

  if (isConfigured && db) {
    try {
      await setDoc(doc(db, 'products', id), record, { merge: true });
    } catch (err) {
      console.warn('Error guardando en Firestore:', err);
    }
  }

  const current = getLocalProducts();
  const index = current.findIndex((p) => p.id === id);
  let next;
  if (index >= 0) {
    next = [...current];
    next[index] = record;
  } else {
    next = [record, ...current];
  }
  saveLocalProducts(next);
  logSecurityEvent('PRODUCT_SAVED', { id, name: record.name });
  return next;
};

// Eliminar un producto
export const deleteProduct = async (productId) => {
  const { isConfigured, db } = initFirebase();

  if (isConfigured && db) {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (err) {
      console.warn('Error eliminando en Firestore:', err);
    }
  }

  const current = getLocalProducts();
  const next = current.filter((p) => p.id !== productId);
  saveLocalProducts(next);
  logSecurityEvent('PRODUCT_DELETED', { productId });
  return next;
};
