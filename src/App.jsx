import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { MenuSection } from './components/MenuSection';
import { MascotSection } from './components/MascotSection';
import { PromosSection } from './components/PromosSection';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { BrandRibbon } from './components/BrandRibbon';
import { ScallopedMountainDivider } from './components/SectionDividers';
import { ProductDetailSection } from './components/ProductDetailSection';
import { Icon } from './components/Icon';
import { ProductsProvider, useProducts } from './context/ProductsContext';
import { getSession } from './lib/security';
import { addEarning } from './lib/financesStore';
import { recordOrderInFirestore } from './lib/firebase';

// Carga perezosa (lazy-load) para máxima velocidad de la tienda pública
const AdminLogin = React.lazy(() =>
  import('./components/admin/AdminLogin').then((m) => ({ default: m.AdminLogin }))
);
const AdminDashboard = React.lazy(() =>
  import('./components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);

function StoreApp() {
  const { products, updateStock, discountStock } = useProducts();
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('tricos_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Vista actual: 'store' o 'admin'
  const [view, setView] = useState(() => (window.location.hash === '#admin' ? 'admin' : 'store'));
  const [adminSession, setAdminSession] = useState(() => getSession());

  // Producto seleccionado para el apartado individual
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#admin') {
        setView('admin');
        setSelectedProduct(null);
        setAdminSession(getSession());
      } else if (hash.startsWith('#producto-')) {
        const prodId = hash.replace('#producto-', '');
        const found = products.find((p) => p.id === prodId);
        if (found) {
          setSelectedProduct(found);
          setView('store');
        }
      } else {
        setView('store');
        setSelectedProduct(null);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [products]);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    try {
      window.location.hash = `producto-${product.id}`;
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToMenu = () => {
    setSelectedProduct(null);
    try {
      window.location.hash = 'menu';
    } catch {}
    setTimeout(() => {
      const el = document.getElementById('menu');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  useEffect(() => {
    try {
      localStorage.setItem('tricos_cart', JSON.stringify(cartItems));
    } catch (err) {
      console.error('Error saving cart:', err);
    }
  }, [cartItems]);

  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const handleAddToCart = (product) => {
    const baseId = product.originalId || product.id;
    const live = products.find((p) => p.id === baseId || (p.id && baseId.startsWith(p.id)));
    const liveStock = live ? Number(live.stock ?? 35) : Number(product.stock ?? 35);
    const liveActive = live ? live.active !== false : product.active !== false;

    // Protección estricta: si está sin stock o inactivo, bloquear completamente
    if (!liveActive || liveStock <= 0) {
      return;
    }

    setCartItems((prev) => {
      const currentInCartForBase = prev
        .filter((i) => {
          const itemBaseId = i.product.originalId || i.product.id;
          return itemBaseId === baseId || (itemBaseId && itemBaseId.startsWith(baseId));
        })
        .reduce((sum, i) => sum + i.quantity, 0);

      if (currentInCartForBase >= liveStock) {
        return prev;
      }

      const existingIndex = prev.findIndex((i) => i.product.id === product.id);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        };
        return next;
      }
      return [...prev, { product: { ...product, stock: liveStock }, quantity: 1, note: '' }];
    });
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const baseId = item.product.originalId || item.product.id;
          const live = products.find((p) => p.id === baseId || (p.id && baseId.startsWith(p.id)));
          const maxStock = live ? Number(live.stock ?? 35) : Number(item.product.stock ?? 35);
          if (maxStock <= 0) return { ...item, quantity: 0 };
          const capped = Math.min(newQuantity, maxStock);
          return { ...item, quantity: capped };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleOrderSuccess = async (orderDetails) => {
    // 1. Descuento automático e inmediato del stock en el panel y Firestore
    try {
      const orderItems =
        orderDetails?.items && orderDetails.items.length > 0
          ? orderDetails.items
          : cartItems.map((item) => ({
              productId: item.product.originalId || item.product.id,
              originalId: item.product.originalId || item.product.id,
              name: item.product.name,
              quantity: item.quantity,
            }));

      await discountStock(orderItems);
    } catch (err) {
      console.warn('Error descontando stock tras pedido:', err);
    }

    // 2. Registro automático de la venta en las ganancias del panel y Firestore
    try {
      if (orderDetails?.total) {
        addEarning({
          amount: orderDetails.total,
          concept: `Venta WhatsApp: ${orderDetails.customerName || 'Cliente'} (${
            orderDetails.deliveryType === 'delivery' ? 'Delivery' : 'Retiro'
          })`,
          date: new Date().toISOString().split('T')[0],
        });
      }
    } catch (err) {
      console.warn('Error registrando ganancia automática:', err);
    }

    // 3. Registro formal en la colección 'orders' de Firestore
    try {
      await recordOrderInFirestore(orderDetails);
    } catch (err) {
      console.warn('Error guardando pedido en Firestore:', err);
    }

    setIsCartOpen(false);
    setCompletedOrder(orderDetails);
    setIsSuccessOpen(true);
    handleClearCart();
  };

  // Si la vista es el Panel Administrador (cargado de forma asíncrona)
  if (view === 'admin') {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center font-display text-cartoon-ink">
            <div className="w-10 h-10 border-3 border-cartoon-yellow border-t-cartoon-red rounded-full animate-spin mb-3" />
            <span className="text-sm">Cargando Panel...</span>
          </div>
        }
      >
        {adminSession ? (
          <AdminDashboard
            session={adminSession}
            onLogout={() => setAdminSession(null)}
            onGoToStore={() => {
              window.location.hash = '';
              setView('store');
            }}
          />
        ) : (
          <AdminLogin
            onLoginSuccess={(sess) => setAdminSession(sess)}
            onBackToSite={() => {
              window.location.hash = '';
              setView('store');
            }}
          />
        )}
      </React.Suspense>
    );
  }

  // Vista de Tienda para Clientes
  return (
    <div className="min-h-screen flex flex-col bg-cartoon-cream selection:bg-cartoon-yellow selection:text-cartoon-ink">
      
      {/* 1. Header Compacto con Logo Completo y Proporcionado */}
      <Navbar
        cartCount={totalItemsCount}
        cartTotal={cartSubtotal}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main className="flex-1">
        {selectedProduct ? (
          /* Apartado individual del plato con stock reactivo en tiempo real */
          <ProductDetailSection
            product={
              products.find((p) => p.id === selectedProduct.id) || selectedProduct
            }
            onBack={handleBackToMenu}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setIsCartOpen(true)}
          />
        ) : (
          /* Vista principal de la tienda */
          <>
            {/* 2. Hero Section (#FFC93C) con Título + Personaje al lado en Móvil y PC */}
            <Hero onOpenCart={() => setIsCartOpen(true)} />

            {/* Transición 1: Hero (#FFC93C) -> Carta (#FFFDF6) */}
            <ScallopedMountainDivider
              topColor="#FFC93C"
              bottomColor="#FFFDF6"
              strokeColor="#1E1B18"
            />

            {/* Cinta con Sello y Puntos Fuertes de la Marca */}
            <BrandRibbon />

            {/* 3. Carta de Comidas (#FFFDF6) con Stock en Tiempo Real */}
            <MenuSection
              onAddToCart={handleAddToCart}
              onSelectProduct={handleSelectProduct}
            />

            {/* Transición 2: Carta (#FFFDF6) -> Combos & Cupones (#FFF5D6) */}
            <ScallopedMountainDivider
              topColor="#FFFDF6"
              bottomColor="#FFF5D6"
              strokeColor="#1E1B18"
            />

            {/* 4. Combos y Cupones (#FFF5D6) */}
            <PromosSection />

            {/* 5. Sección "El Sello del Verdadero Crunch" con Carrusel Infinito recortado por las líneas negras onduladas */}
            <MascotSection
              topNeighborColor="#FFF5D6"
              bottomNeighborColor="#1E1B18"
              strokeColor="#1E1B18"
            />
          </>
        )}

        {/* 6. Footer (#1E1B18) con transición fluida desde la ola inferior */}
        <Footer />
      </main>

      {/* Botón Flotante de Carrito en Móvil */}
      {totalItemsCount > 0 && !isCartOpen && (
        <aside
          aria-label="Acceso rápido al carrito"
          className="fixed bottom-5 right-5 z-40 md:hidden animate-modalIn"
        >
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 bg-cartoon-red text-white font-display text-base rounded-full border-3 border-cartoon-ink shadow-cartoon-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
          >
            <div className="relative flex items-center justify-center">
              <Icon name="shopping_bag" size={22} />
              <span className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-cartoon-yellow text-cartoon-ink font-display text-[11px] border-2 border-cartoon-ink flex items-center justify-center">
                {totalItemsCount}
              </span>
            </div>
            <span>${cartSubtotal.toLocaleString('es-AR')}</span>
          </button>
        </aside>
      )}

      {/* Modales y Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        products={products}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        appliedCoupon={appliedCoupon}
        setAppliedCoupon={setAppliedCoupon}
        onOrderSuccess={handleOrderSuccess}
      />

      <OrderSuccessModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        orderDetails={completedOrder}
      />

    </div>
  );
}

export function App() {
  return (
    <ProductsProvider>
      <StoreApp />
    </ProductsProvider>
  );
}

export default App;
