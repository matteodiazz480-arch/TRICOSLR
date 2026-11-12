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
    const next = await updateProductStock(productId, newStock);
    if (next) setProducts(next);
    return next;
  }, []);

  const handleDiscountStock = useCallback(async (orderItems) => {
    const next = await discountStockForOrder(orderItems);
    if (next) setProducts(next);
    return next;
  }, []);

  const handleToggleActive = useCallback(async (productId, currentActive) => {
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
