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
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
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
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const defaults = getDefaultProductsWithStock();
  saveLocalProducts(defaults);
  return defaults;
};

// Guardar productos en cache local y emitir evento en tiempo real
export const saveLocalProducts = (products) => {
  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent('tricos_products_sync', { detail: products }));
  } catch (e) {
    console.error('Error guardando productos locales:', e);
  }
};

// Subscripción en tiempo real a la colección de productos
export const subscribeToProducts = (callback) => {
  const { isConfigured, db } = initFirebase();

  // Si Firebase está conectado a Firestore
  if (isConfigured && db) {
    const productsCol = collection(db, 'products');

    const unsubscribe = onSnapshot(
      productsCol,
      async (snapshot) => {
        if (snapshot.empty) {
          // Si la colección está vacía en Firestore, sembrar los productos iniciales
          const defaults = getLocalProducts();
          for (const item of defaults) {
            await setDoc(doc(db, 'products', item.id), item);
          }
          callback(defaults);
          saveLocalProducts(defaults);
        } else {
          const list = [];
          snapshot.forEach((d) => list.push({ ...d.data(), id: d.id }));
          callback(list);
          saveLocalProducts(list);
        }
      },
      (err) => {
        console.warn('Firestore snapshot error, cayendo a almacenamiento local:', err);
        callback(getLocalProducts());
      }
    );

    return unsubscribe;
  }

  // Fallback: modo local reactivo con eventos de ventana
  callback(getLocalProducts());
  const handler = (e) => {
    if (e.detail) callback(e.detail);
  };
  window.addEventListener('tricos_products_sync', handler);
  return () => window.removeEventListener('tricos_products_sync', handler);
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
