import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  subscribeToProducts,
  updateProductStock,
  toggleProductActive,
  saveProduct,
  deleteProduct,
  discountStockForOrder,
  initFirebase,
  getLocalProducts,
} from '../lib/firebase';

const ProductsContext = createContext(null);

export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState(() => getLocalProducts());
  const [loading, setLoading] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState({ isConfigured: false });

  useEffect(() => {
    // Verificar estado de Firebase
    const status = initFirebase();
    setFirebaseStatus(status);

    // Suscribirse a cambios en tiempo real
    const unsubscribe = subscribeToProducts((items) => {
      setProducts(items);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleUpdateStock = useCallback(async (productId, newStock) => {
    const parsed = Number(newStock);
    const stockVal = isNaN(parsed) ? 0 : Math.max(0, Math.round(parsed));

    // 1. Actualización optimista e inmediata para garantizar respuesta táctil fluida y sin retrasos
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: stockVal, updatedAt: new Date().toISOString() } : p))
    );

    // 2. Persistir localmente y sincronizar en Firestore
    const next = await updateProductStock(productId, stockVal);
    if (next) setProducts(next);
    return next;
  }, []);

  const handleDiscountStock = useCallback(async (orderItems) => {
    if (!orderItems || orderItems.length === 0) return;

    // Actualización inmediata del stock local para evitar sobreventas
    setProducts((prev) => {
      const copy = [...prev];
      orderItems.forEach((oi) => {
        const id = oi.productId || oi.originalId || oi.id;
        const idx = copy.findIndex((p) => p.id === id || (p.id && id && id.startsWith(p.id)));
        if (idx !== -1) {
          const currentStock = Number(copy[idx].stock !== undefined ? copy[idx].stock : 35);
          const newStock = Math.max(0, currentStock - (Number(oi.quantity) || 1));
          copy[idx] = { ...copy[idx], stock: newStock };
        }
      });
      return copy;
    });

    const next = await discountStockForOrder(orderItems);
    if (next) setProducts(next);
    return next;
  }, []);

  const handleToggleActive = useCallback(async (productId, currentActive) => {
    const nextActive = !currentActive;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, active: nextActive } : p))
    );
    const next = await toggleProductActive(productId, currentActive);
    if (next) setProducts(next);
    return next;
  }, []);

  const handleSaveProduct = useCallback(async (productData) => {
    const next = await saveProduct(productData);
    if (next) setProducts(next);
    return next;
  }, []);

  const handleDeleteProduct = useCallback(async (productId) => {
    const next = await deleteProduct(productId);
    if (next) setProducts(next);
    return next;
  }, []);

  return (
    <ProductsContext.Provider
      value={{
        products,
        loading,
        firebaseStatus,
        updateStock: handleUpdateStock,
        discountStock: handleDiscountStock,
        toggleActive: handleToggleActive,
        saveProduct: handleSaveProduct,
        deleteProduct: handleDeleteProduct,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = () => {
  const ctx = useContext(ProductsContext);
  if (!ctx) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return ctx;
};
