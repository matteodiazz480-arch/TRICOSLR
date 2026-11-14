import React, { useEffect, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Icon } from './Icon';
import { RESTAURANT_INFO } from '../data/products';
import { isProductOutOfStock } from '../lib/firebase';
import { getPromotions } from '../lib/promotionsStore';
import { buildWhatsAppUrl, openWhatsApp } from '../lib/whatsapp';

const money = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;
const STORAGE_FORM_KEY = 'tricos_customer_form_v2';
const FREE_DELIVERY_THRESHOLD = RESTAURANT_INFO.freeDeliveryThreshold || 55000;

const getInitialFormData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_FORM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        name: parsed.name || '',
        deliveryType: parsed.deliveryType || 'delivery',
        address: parsed.address || '',
        addressNotes: parsed.addressNotes || '',
        notes: parsed.notes || '',
        paymentMethod: parsed.paymentMethod || 'Efectivo',
        changeAmount: parsed.changeAmount || '',
      };
    }
  } catch {}
  return {
    name: '',
    deliveryType: 'delivery',
    address: '',
    addressNotes: '',
    notes: '',
    paymentMethod: 'Efectivo',
    changeAmount: '',
  };
};

export const CartDrawer = ({
  isOpen,
  onClose,
  items,
  products = [],
  onUpdateQuantity,
  onRemoveItem,
  appliedCoupon,
  setAppliedCoupon,
  onOrderSuccess,
}) => {
  // Apartado de tienda organizado por etapas: 'cart' (Etapa 1) -> 'checkout' (Etapa 2)
  const [step, setStep] = useState('cart');
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [formData, setFormData] = useState(getInitialFormData);
  const [errors, setErrors] = useState({});

  // Persistir datos del formulario para que el cliente no los pierda al navegar o cerrar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FORM_KEY, JSON.stringify(formData));
    } catch {}
  }, [formData]);

  // Al cerrar o si el carrito se vacía, volver al primer paso
  useEffect(() => {
    if (!isOpen) {
      setStep('cart');
      setErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (items.length === 0) {
      setStep('cart');
    }
  }, [items.length]);

  // Detección en tiempo real de platos sin stock en el carrito
  const outOfStockItems = useMemo(() => {
    return items.filter((item) => {
      const baseId = item.product.originalId || item.product.id;
      const live = products.find((p) => p.id === baseId || (p.id && baseId.startsWith(p.id)));
      if (!live) return false;
      return isProductOutOfStock(live);
    });
  }, [items, products]);

  const hasOutOfStockItems = outOfStockItems.length > 0;

  // Bloquear el scroll del fondo mientras el drawer esté abierto
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Cálculos de totales y progreso de delivery gratis desde $55.000
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const isFreeDeliveryQualified = subtotal >= FREE_DELIVERY_THRESHOLD;
  const progressPercent = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100));

  const discountAmount = appliedCoupon
    ? Math.round(
        appliedCoupon.type === 'fixed'
          ? Math.min(subtotal, Number(appliedCoupon.discount) || 0)
          : subtotal * (Number(appliedCoupon.discount) || 0)
      )
    : 0;
  const total = Math.max(0, subtotal - discountAmount);

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    try {
      const promoData = getPromotions();
      const dynamicCoupon = promoData?.coupons?.find(
        (c) => c.code?.toUpperCase() === code && c.active !== false
      );
      if (dynamicCoupon) {
        if (dynamicCoupon.minPurchase && subtotal < dynamicCoupon.minPurchase) {
          setCouponError(`Compra mínima requerida: ${money(dynamicCoupon.minPurchase)}`);
          return;
        }
        setAppliedCoupon({
          code: dynamicCoupon.code,
          discount: dynamicCoupon.discount,
          type: dynamicCoupon.type || 'percentage',
          label: dynamicCoupon.label,
        });
        setCouponError('');
        return;
      }
    } catch {}

    if (RESTAURANT_INFO.coupons && RESTAURANT_INFO.coupons[code]) {
      setAppliedCoupon({ code, ...RESTAURANT_INFO.coupons[code] });
      setCouponError('');
    } else {
      setCouponError('Cupón inválido o expirado');
    }
  };

  // Pasar de Etapa 1 a Etapa 2
  const handleProceedToCheckout = () => {
    if (hasOutOfStockItems) {
      alert('Uno o más platos en tu carrito se han quedado sin stock. Por favor quitalos para continuar.');
      return;
    }
    setStep('checkout');
  };

  // Enviar pedido final con listado organizado completo
  const handleSubmitOrder = (ev) => {
    ev.preventDefault();
    const e = {};
    if (!formData.name.trim()) e.name = 'Ingresá tu nombre';
    if (formData.deliveryType === 'delivery' && !formData.address.trim()) {
      e.address = 'Ingresá tu dirección de entrega';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (hasOutOfStockItems) {
      alert('Uno o más platos en tu carrito se han quedado sin stock. Por favor quitalos para continuar.');
      setStep('cart');
      return;
    }

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFC93C', '#FF4757', '#2ED573', '#1E90FF'],
      });
    } catch {}

    // Generar Listado Organizado para WhatsApp
    const L = [];
    L.push(`🍔 *PEDIDO TRICO'S*`);
    L.push(`────────────────────────`);
    L.push(`👤 *Cliente:* ${formData.name.trim()}`);
    L.push(`🛵 *Entrega:* ${formData.deliveryType === 'delivery' ? 'A Domicilio' : 'Retiro en Local'}`);

    if (formData.deliveryType === 'delivery') {
      L.push(`📍 *Dirección:* ${formData.address.trim()}`);
      if (formData.addressNotes.trim()) {
        L.push(`   ↳ *Referencia:* ${formData.addressNotes.trim()}`);
      }
      if (isFreeDeliveryQualified) {
        L.push(`🎉 *Beneficio:* ¡Delivery Gratis bonificado!`);
      }
    }

    L.push(
      `💵 *Pago:* ${formData.paymentMethod}${
        formData.paymentMethod === 'Efectivo' && formData.changeAmount.trim()
          ? ` (Paga con: $${formData.changeAmount.trim()})`
          : ''
      }`
    );

    if (formData.notes.trim()) {
      L.push(`📝 *Aclaraciones:* ${formData.notes.trim()}`);
    }

    L.push('');
    L.push(`📋 *LISTADO DE PRODUCTOS:*`);
    L.push(`────────────────────────`);
    items.forEach((item) => {
      const itemSubtotal = item.product.price * item.quantity;
      L.push(`• *${item.quantity}x ${item.product.name}*`);
      L.push(`   Precio unitario: ${money(item.product.price)} | Subtotal: ${money(itemSubtotal)}`);
      if (item.note) {
        L.push(`   ↳ Nota: _${item.note}_`);
      }
    });

    if (appliedCoupon && discountAmount > 0) {
      L.push('');
      L.push(`🎟️ *Descuento aplicado:* -${money(discountAmount)} (${appliedCoupon.code})`);
    }

    L.push(`────────────────────────`);
    L.push(`💰 *TOTAL GENERAL: ${money(total)}*`);
    L.push(`────────────────────────`);
    L.push(`¡Hola Trico's! Quiero confirmar este pedido.`);

    const messageText = L.join('\n');
    const whatsappUrl = buildWhatsAppUrl(RESTAURANT_INFO.phone, messageText);

    // 1. Abrir WhatsApp inmediatamente en el hilo de interacción del usuario
    openWhatsApp(RESTAURANT_INFO.phone, messageText);

    // 2. Notificar al sistema de la orden completada
    if (typeof onOrderSuccess === 'function') {
      try {
        onOrderSuccess({
          customerName: formData.name.trim(),
          deliveryType: formData.deliveryType,
          address: formData.address.trim(),
          addressNotes: formData.addressNotes.trim(),
          paymentMethod: formData.paymentMethod,
          changeAmount: formData.changeAmount.trim(),
          notes: formData.notes.trim(),
          subtotal,
          discountAmount,
          total,
          isFreeDelivery: isFreeDeliveryQualified,
          whatsappUrl,
          whatsappMessage: messageText,
          items: items.map((item) => ({
            productId: item.product.originalId || item.product.id,
            originalId: item.product.originalId || item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price,
            subtotal: item.product.price * item.quantity,
          })),
        });
      } catch (err) {
        console.warn('Error en onOrderSuccess:', err);
      }
    }

    setStep('cart');
  };

  const inputClass = (hasError) =>
    `w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border-2 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-xs transition-colors ${
      hasError ? 'border-cartoon-red bg-rose-50/50' : 'border-cartoon-ink focus:border-cartoon-yellow'
    }`;

  const headerTitle = step === 'cart' ? 'Tu Pedido' : 'Tus Datos y Pago';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-cartoon-cream sm:bg-cartoon-ink/65 sm:backdrop-blur-sm flex justify-end">
      {/* Fondo clicable para cerrar en escritorio */}
      <div onClick={onClose} className="hidden sm:block absolute inset-0 -z-10" />

      <aside
        aria-label="Carrito de compras"
        className="relative w-full sm:max-w-md bg-cartoon-cream border-0 sm:border-l-4 border-cartoon-ink shadow-2xl flex flex-col h-full z-10 overflow-hidden"
      >
        {/* Encabezado con navegación por etapas */}
        <div className="p-3.5 sm:p-4 bg-cartoon-yellow border-b-2 sm:border-b-3 border-cartoon-ink flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {step === 'checkout' ? (
              <button
                type="button"
                onClick={() => setStep('cart')}
                aria-label="Volver a revisar productos"
                className="w-9 h-9 rounded-xl bg-white border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center text-cartoon-ink active:scale-95 transition-transform cursor-pointer"
              >
                <Icon name="arrow_back" size={18} />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-white border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center">
                <Icon name="shopping_bag" size={18} className="text-cartoon-ink" />
              </div>
            )}
            <div>
              <h2 className="font-display text-base sm:text-lg text-cartoon-ink leading-tight">{headerTitle}</h2>
              <span className="font-sub font-bold text-[10px] sm:text-xs text-cartoon-ink/70">
                {step === 'cart'
                  ? (items.length === 1 ? '1 producto seleccionado' : `${items.length} productos seleccionados`)
                  : 'Paso 2 de 2 • Confirmación'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white hover:bg-cartoon-cream-dark border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center text-cartoon-ink transition-transform active:scale-95 cursor-pointer"
            aria-label="Cerrar carrito"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* ============================================================== */}
        {/* ETAPA 1: REVISIÓN DE PRODUCTOS SELECCIONADOS */}
        {/* ============================================================== */}
        {step === 'cart' && (
          <div className="flex-1 flex flex-col min-h-0 animate-modalIn">
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 min-h-0">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-24 h-24 mb-3 opacity-90">
                    <img src="/assets/sticker_personaje.png" alt="Carrito Vacío" className="w-full h-full object-contain" />
                  </div>
                  <h3 className="font-display text-base sm:text-lg text-cartoon-ink mb-1">Tu carrito está vacío</h3>
                  <p className="font-sub text-xs text-cartoon-ink/70 max-w-xs mb-4">
                    Elegí tus hamburguesas o pollo frito favoritos para armar tu pedido.
                  </p>
                  <button onClick={onClose} className="btn-cartoon-primary text-xs py-2 px-5 cursor-pointer">
                    Ver la Carta
                  </button>
                </div>
              ) : (
                <>
                  {/* Barra de progreso de Delivery Gratis desde $55.000 */}
                  <div className={`rounded-xl border-2 sm:border-3 border-cartoon-ink p-2.5 shadow-cartoon-xs transition-colors ${
                    isFreeDeliveryQualified ? 'bg-cartoon-green' : 'bg-white'
                  }`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">🛵</span>
                      <p className="font-display text-xs sm:text-sm text-cartoon-ink">
                        {isFreeDeliveryQualified
                          ? '¡Genial! Tenés delivery gratis'
                          : `Te faltan ${money(FREE_DELIVERY_THRESHOLD - subtotal)} para delivery gratis`}
                      </p>
                    </div>
                    <div className="h-2.5 rounded-full bg-cartoon-cream-dark border-2 border-cartoon-ink overflow-hidden">
                      <div
                        className="h-full bg-cartoon-yellow border-r-2 border-cartoon-ink transition-all duration-300"
                        style={{
                          width: `${progressPercent}%`,
                          borderRightWidth: progressPercent >= 100 ? 0 : undefined,
                        }}
                      />
                    </div>
                  </div>

                  {/* Listado de Productos con Nombres, Cantidades, Precios y Subtotales */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="font-display text-xs text-cartoon-ink uppercase tracking-wider">
                        Productos en tu pedido:
                      </span>
                      <span className="font-sub text-[11px] text-cartoon-ink/60 font-bold">
                        {items.reduce((acc, i) => acc + i.quantity, 0)} u.
                      </span>
                    </div>

                    {items.map(({ product, quantity, note }) => {
                      const isItemOutOfStock = outOfStockItems.some((it) => it.product.id === product.id);
                      const itemSubtotal = product.price * quantity;

                      return (
                        <div
                          key={product.id}
                          className={`p-2.5 sm:p-3 rounded-2xl border-2 shadow-cartoon-xs flex flex-col gap-2 transition-all ${
                            isItemOutOfStock ? 'bg-rose-50/90 border-cartoon-red' : 'bg-white border-cartoon-ink'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* Miniatura */}
                            <div className="w-12 h-12 rounded-xl bg-cartoon-cream border-2 border-cartoon-ink flex-shrink-0 overflow-hidden flex items-center justify-center">
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xl select-none">{product.emoji || '🍔'}</span>
                              )}
                            </div>

                            {/* Info y Precio Unitario */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="font-display text-xs sm:text-sm text-cartoon-ink leading-tight truncate">
                                  {product.name}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => onRemoveItem(product.id)}
                                  className="text-cartoon-ink/40 hover:text-cartoon-red p-1 cursor-pointer transition-colors"
                                  title="Eliminar producto"
                                >
                                  <Icon name="delete" size={15} />
                                </button>
                              </div>

                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-sub text-[11px] text-cartoon-ink/70">
                                  {money(product.price)} c/u
                                </span>
                                {isItemOutOfStock && (
                                  <span className="px-1.5 py-0.2 rounded bg-cartoon-red text-white text-[9px] font-black uppercase">
                                    Agotado
                                  </span>
                                )}
                              </div>

                              {note && (
                                <p className="font-sub text-[10px] text-cartoon-ink/60 italic truncate mt-0.5">
                                  ↳ {note}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Modificador de Cantidades y Subtotal de Ítem */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-cartoon-ink/10">
                            <div className="flex items-center gap-1.5 bg-cartoon-cream/80 p-1 rounded-xl border border-cartoon-ink/20">
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                                aria-label="Restar 1"
                                className="w-6 h-6 rounded-lg bg-white border border-cartoon-ink flex items-center justify-center text-cartoon-ink active:scale-90 transition-transform cursor-pointer font-bold text-xs"
                              >
                                -
                              </button>
                              <span className="font-display text-xs text-cartoon-ink w-5 text-center font-bold">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                disabled={isItemOutOfStock}
                                onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                                aria-label="Sumar 1"
                                className="w-6 h-6 rounded-lg bg-white border border-cartoon-ink flex items-center justify-center text-cartoon-ink active:scale-90 transition-transform cursor-pointer font-bold text-xs disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>

                            <div className="text-right">
                              <span className="font-sub text-[10px] text-cartoon-ink/60 block leading-none">Subtotal:</span>
                              <span className="font-display text-xs sm:text-sm text-cartoon-ink font-bold">
                                {money(itemSubtotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cupón de descuento */}
                  <div className="bg-white p-3 rounded-2xl border-2 border-cartoon-ink shadow-cartoon-xs">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🎟️</span>
                          <div>
                            <span className="font-display text-xs text-cartoon-green block">
                              Cupón: {appliedCoupon.code}
                            </span>
                            <span className="font-sub text-[10px] text-cartoon-ink/70">
                              Descuento: -{money(discountAmount)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAppliedCoupon(null)}
                          className="font-sub text-[11px] text-cartoon-red hover:underline cursor-pointer font-bold"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="¿Tenés cupón de descuento?"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value);
                            setCouponError('');
                          }}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-cartoon-cream/50 border border-cartoon-ink font-sub text-xs uppercase text-cartoon-ink focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          className="btn-cartoon-primary text-xs py-1.5 px-3 rounded-xl border border-cartoon-ink cursor-pointer"
                        >
                          Aplicar
                        </button>
                      </div>
                    )}
                    {couponError && <p className="mt-1 text-[11px] font-sub text-cartoon-red font-bold">{couponError}</p>}
                  </div>
                </>
              )}
            </div>

            {/* Pie de Etapa 1: Resumen y Botón para avanzar a Etapa 2 */}
            {items.length > 0 && (
              <div className="p-3.5 sm:p-4 bg-white border-t-2 sm:border-t-3 border-cartoon-ink space-y-2 flex-shrink-0">
                <div className="space-y-1 text-xs font-sub">
                  <div className="flex justify-between text-cartoon-ink/80">
                    <span>Subtotal de productos:</span>
                    <span className="font-bold">{money(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-cartoon-green font-bold">
                      <span>Descuento cupón:</span>
                      <span>-{money(discountAmount)}</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-cartoon-ink/15 flex justify-between items-center text-cartoon-ink font-display text-base">
                    <span>TOTAL ESTIMADO:</span>
                    <span className="text-cartoon-red font-black">{money(total)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  className="w-full btn-cartoon-red text-xs sm:text-sm py-3 flex items-center justify-center gap-2 group cursor-pointer shadow-cartoon active:scale-95 transition-transform"
                >
                  <span>CONTINUAR A TUS DATOS</span>
                  <Icon name="arrow_forward" size={18} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ETAPA 2: DATOS DEL CLIENTE, ENTREGA Y PAGO */}
        {/* ============================================================== */}
        {step === 'checkout' && (
          <form onSubmit={handleSubmitOrder} className="flex-1 flex flex-col min-h-0 animate-modalIn">
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 min-h-0">
              
              {/* Nombre */}
              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink/80 mb-1">
                  Tu Nombre: <span className="text-cartoon-red">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cartoon-ink/50 flex items-center">
                    <Icon name="person" size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="¿A nombre de quién es el pedido?"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    className={inputClass(errors.name)}
                  />
                </div>
                {errors.name && <p className="mt-1 text-xs font-sub font-bold text-cartoon-red">{errors.name}</p>}
              </div>

              {/* Modalidad de Entrega */}
              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink/80 mb-1">
                  ¿Cómo querés recibir tu pedido?:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'delivery', label: '🛵 A Domicilio' },
                    { id: 'takeaway', label: '🏪 Retiro en Local' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, deliveryType: opt.id })}
                      className={`py-2 px-2 rounded-xl border-2 font-sub font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                        formData.deliveryType === opt.id
                          ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-black'
                          : 'bg-white text-cartoon-ink/70 border-cartoon-ink/30 hover:border-cartoon-ink'
                      }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dirección simple si es A Domicilio (sin mapas ni km) */}
              {formData.deliveryType === 'delivery' ? (
                <div className="space-y-2 pt-1 border-t border-cartoon-ink/10">
                  <div>
                    <label className="block font-sub font-bold text-xs text-cartoon-ink/80 mb-1">
                      Dirección de Entrega: <span className="text-cartoon-red">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cartoon-ink/50 flex items-center">
                        <Icon name="location_on" size={16} />
                      </div>
                      <input
                        type="text"
                        placeholder="Calle y número (ej: San Martín 450)"
                        value={formData.address}
                        onChange={(e) => {
                          setFormData({ ...formData, address: e.target.value });
                          if (errors.address) setErrors({ ...errors, address: '' });
                        }}
                        className={inputClass(errors.address)}
                      />
                    </div>
                    {errors.address && (
                      <p className="mt-1 text-xs font-sub font-bold text-cartoon-red">{errors.address}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-sub font-bold text-xs text-cartoon-ink/70 mb-1">
                      Piso, Depto o Referencia (opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Piso 2 B / Portón negro"
                      value={formData.addressNotes}
                      onChange={(e) => setFormData({ ...formData, addressNotes: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border-2 border-cartoon-ink font-sub text-xs text-cartoon-ink focus:outline-none shadow-cartoon-xs"
                    />
                  </div>

                  {/* Aviso de beneficio de delivery gratis */}
                  {isFreeDeliveryQualified ? (
                    <div className="p-2 rounded-xl bg-cartoon-green/20 border border-cartoon-green text-[11px] font-sub text-cartoon-green-dark font-bold flex items-center gap-1.5">
                      <span>🎉</span>
                      <span>¡Tu pedido supera los $55.000! Tenés envío 100% bonificado.</span>
                    </div>
                  ) : (
                    <p className="text-[11px] font-sub text-cartoon-ink/65 italic">
                      🛵 El costo del delivery se coordina directamente con el cadete al confirmar.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-white border-2 border-cartoon-ink/30 text-xs font-sub text-cartoon-ink space-y-1 shadow-cartoon-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📍</span>
                    <p className="font-bold">Retiro en: {RESTAURANT_INFO.address}</p>
                  </div>
                  <p className="text-[11px] text-cartoon-ink/70 pl-6">⏰ {RESTAURANT_INFO.schedule}</p>
                </div>
              )}

              {/* Forma de Pago */}
              <div className="pt-1 border-t border-cartoon-ink/10">
                <label className="block font-sub font-bold text-xs text-cartoon-ink/80 mb-1">
                  Forma de Pago:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Efectivo', label: '💵 Efectivo' },
                    { id: 'Transferencia', label: '📲 Transferencia' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: m.id })}
                      className={`py-2 px-2 rounded-xl border-2 font-sub font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                        formData.paymentMethod === m.id
                          ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-black'
                          : 'bg-white text-cartoon-ink/70 border-cartoon-ink/30 hover:border-cartoon-ink'
                      }`}
                    >
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>

                {formData.paymentMethod === 'Efectivo' ? (
                  <input
                    type="text"
                    placeholder="¿Con cuánto abonás? (ej: $20.000 para el vuelto)"
                    value={formData.changeAmount}
                    onChange={(e) => setFormData({ ...formData, changeAmount: e.target.value })}
                    className="mt-2 w-full px-3 py-2 rounded-xl bg-white border-2 border-cartoon-ink font-sub text-xs text-cartoon-ink focus:outline-none shadow-cartoon-xs"
                  />
                ) : (
                  <p className="mt-2 text-[11px] font-sub text-cartoon-ink/70 bg-[#FFF9D2] p-2 rounded-xl border border-cartoon-ink/30">
                    💡 Te enviamos el Alias / CBU por WhatsApp para transferir en el momento.
                  </p>
                )}
              </div>

              {/* Aclaraciones opcionales */}
              <div className="pt-1 border-t border-cartoon-ink/10">
                <label className="block font-sub font-bold text-xs text-cartoon-ink/80 mb-1">
                  Aclaraciones para la cocina (opcional):
                </label>
                <textarea
                  rows="2"
                  placeholder="Sin cebolla, salsas extras, etc…"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border-2 border-cartoon-ink font-sub text-xs text-cartoon-ink focus:outline-none shadow-cartoon-xs"
                />
              </div>
            </div>

            {/* Pie de Etapa 2: Resumen y Confirmación Final a WhatsApp */}
            <div className="p-3.5 sm:p-4 bg-white border-t-2 sm:border-t-3 border-cartoon-ink space-y-2 flex-shrink-0">
              <div className="space-y-1 text-xs font-sub">
                <div className="flex justify-between text-cartoon-ink/80">
                  <span>Subtotal de productos:</span>
                  <span className="font-bold">{money(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-cartoon-green font-bold">
                    <span>Descuento cupón:</span>
                    <span>-{money(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-cartoon-ink/80">
                  <span>Entrega:</span>
                  <span className="font-bold text-cartoon-ink">
                    {formData.deliveryType === 'delivery'
                      ? (isFreeDeliveryQualified ? '¡GRATIS!' : 'A Domicilio')
                      : 'Retiro en Local'}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-cartoon-ink/15 flex justify-between items-center text-cartoon-ink font-display text-base sm:text-lg">
                  <span>TOTAL A PAGAR:</span>
                  <span className="text-cartoon-red font-black">{money(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full btn-cartoon-red text-sm sm:text-base py-3 flex items-center justify-center gap-2 shadow-cartoon cursor-pointer transition-transform active:scale-95"
              >
                <Icon name="chat" size={20} />
                <span>REALIZAR PEDIDO POR WHATSAPP</span>
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
};
