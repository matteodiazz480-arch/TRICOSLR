import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { MenuSection } from './components/MenuSection';
import { MascotSection } from './components/MascotSection';
import { PromosSection } from './components/PromosSection';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { FreeDeliveryRibbon } from './components/FreeDeliveryRibbon';
import { ScallopedMountainDivider } from './components/SectionDividers';
import { Icon } from './components/Icon';

export function App() {
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

  const [deliveryType, setDeliveryType] = useState('delivery');
  const [appliedCoupon, setAppliedCoupon] = useState(null);

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
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.product.id === product.id);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        };
        return next;
      }
      return [...prev, { product, quantity: 1, note: '' }];
    });
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleRemoveItem = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleOrderSuccess = (orderDetails) => {
    setIsCartOpen(false);
    setCompletedOrder(orderDetails);
    setIsSuccessOpen(true);
    handleClearCart();
  };

  return (
    <div className="min-h-screen flex flex-col bg-cartoon-cream selection:bg-cartoon-yellow selection:text-cartoon-ink">
      
      {/* 1. Header Compacto con Logo Completo y Proporcionado */}
      <Navbar
        cartCount={totalItemsCount}
        cartTotal={cartSubtotal}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main className="flex-1">
        {/* 2. Hero Section (#FFC93C) con Título + Personaje al lado en Móvil y PC */}
        <Hero onOpenCart={() => setIsCartOpen(true)} />

        {/* Transición 1: Hero (#FFC93C) -> Carta (#FFFDF6) */}
        <ScallopedMountainDivider
          topColor="#FFC93C"
          bottomColor="#FFFDF6"
          strokeColor="#1E1B18"
        />

        {/* Cinta: delivery gratis desde $55.000 */}
        <FreeDeliveryRibbon />

        {/* 3. Carta de Comidas (#FFFDF6) */}
        <MenuSection onAddToCart={handleAddToCart} />

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
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        deliveryType={deliveryType}
        setDeliveryType={setDeliveryType}
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

export default App;
