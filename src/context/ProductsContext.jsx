import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  subscribeToProducts,
  updateProductStock,
  toggleProductActive,
  saveProduct,
  deleteProduct,
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

  const handleUpdateStock = async (productId, newStock) => {
    return await updateProductStock(productId, newStock);
  };

  const handleToggleActive = async (productId, currentActive) => {
    return await toggleProductActive(productId, currentActive);
  };

  const handleSaveProduct = async (productData) => {
    return await saveProduct(productData);
  };

  const handleDeleteProduct = async (productId) => {
    return await deleteProduct(productId);
  };

  return (
    <ProductsContext.Provider
      value={{
        products,
        loading,
        firebaseStatus,
        updateStock: handleUpdateStock,
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
