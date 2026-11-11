import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Icon } from './Icon';
import { DeliveryLocationPicker } from './DeliveryLocationPicker';
import { RESTAURANT_INFO } from '../data/products';
import { isFreeDelivery, shippingFor } from '../lib/delivery';

const money = (n) => `$${n.toLocaleString('es-AR')}`;

export const CartDrawer = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  deliveryType,
  setDeliveryType,
  appliedCoupon,
  setAppliedCoupon,
  onOrderSuccess,
}) => {
  // Etapas del flujo: 'cart' -> 'location' -> 'checkout' (sin rótulos numéricos visuales)
  const [step, setStep] = useState('cart');
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    addressNotes: '',
    notes: '',
    paymentMethod: 'Efectivo',
    changeAmount: '',
  });
  const [errors, setErrors] = useState({});

  // Bloquear el scroll del fondo mientras la tienda esté abierta para que nunca se asome la página principal
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Al cerrar el drawer o vaciar el carrito, volver al primer paso
  useEffect(() => {
    if (!isOpen) {
      setStep('cart');
      setLocationError('');
      setErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (items.length === 0) setStep('cart');
  }, [items.length]);

  if (!isOpen) return null;

  // Cálculos de totales
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = appliedCoupon ? Math.round(subtotal * appliedCoupon.discount) : 0;
  const free = isFreeDelivery(subtotal);
  const shippingFee = shippingFor({ deliveryType, subtotal, deliveryInfo });
  const total = Math.max(0, subtotal - discountAmount + (shippingFee || 0));
  const threshold = RESTAURANT_INFO.freeDeliveryThreshold;
  const progress = Math.min(100, Math.round((subtotal / threshold) * 100));

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (RESTAURANT_INFO.coupons[code]) {
      setAppliedCoupon({ code, ...RESTAURANT_INFO.coupons[code] });
      setCouponError('');
    } else {
      setCouponError('Cupón inválido o expirado');
    }
  };

  // Validar etapa de entrega antes de pasar a datos
  const handleProceedToCheckout = () => {
    if (deliveryType === 'delivery' && !deliveryInfo) {
      setLocationError('Marcá tu casa en el mapa para continuar');
      return;
    }
    setLocationError('');
    setStep('checkout');
  };

  // Validar y enviar pedido final a WhatsApp (Mensaje limpio, preciso y sin relleno)
  const handleFinalSubmit = (ev) => {
    ev.preventDefault();
    const e = {};
    if (!formData.name.trim()) e.name = 'Ingresá tu nombre';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFC93C', '#FF4757', '#2ED573', '#1E90FF'],
      });
    } catch {
      /* sin confeti */
    }

    const L = [];
    L.push(`🍔 *PEDIDO TRICO'S*`);
    L.push(`*Cliente:* ${formData.name.trim()}`);
    L.push(`*Entrega:* ${deliveryType === 'delivery' ? 'A Domicilio' : 'Retiro en Local'}`);

    if (deliveryType === 'delivery' && deliveryInfo) {
      if (deliveryInfo.address) L.push(`*Dirección:* ${deliveryInfo.address}`);
      if (formData.addressNotes.trim()) L.push(`*Referencia:* ${formData.addressNotes.trim()}`);
      L.push(`*Ubicación:* https://maps.google.com/?q=${deliveryInfo.lat.toFixed(6)},${deliveryInfo.lng.toFixed(6)}`);
    }

    L.push(
      `*Pago:* ${formData.paymentMethod}${
        formData.paymentMethod === 'Efectivo' && formData.changeAmount.trim()
          ? ` (Paga con: $${formData.changeAmount.trim()})`
          : ''
      }`
    );

    if (formData.notes.trim()) L.push(`*Aclaraciones:* ${formData.notes.trim()}`);

    L.push('');
    L.push(`*Detalle:*`);
    items.forEach((item) => {
      L.push(`• ${item.quantity}x ${item.product.name} (${money(item.product.price * item.quantity)})`);
      if (item.note) L.push(`  ↳ _${item.note}_`);
    });

    L.push('');
    L.push(`*TOTAL: ${money(total)}*`);

    window.open(`https://wa.me/${RESTAURANT_INFO.phone}?text=${encodeURIComponent(L.join('\n'))}`, '_blank');
    onOrderSuccess({
      customerName: formData.name,
      total,
      deliveryType,
      items: items.map((item) => ({
        productId: item.product.originalId || item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      })),
    });
    setDeliveryInfo(null);
    setStep('cart');
  };

  const inputClass = (hasError) =>
    `w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border-2 sm:border-3 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-sm ${
      hasError ? 'border-cartoon-red' : 'border-cartoon-ink'
    }`;

  const headerTitle =
    step === 'cart' ? 'Tu Pedido' : step === 'location' ? 'Entrega' : 'Tus Datos y Pago';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-cartoon-cream sm:bg-cartoon-ink/65 sm:backdrop-blur-sm flex justify-end">
      {/* Fondo clicable para cerrar solo en versión escritorio */}
      <div onClick={onClose} className="hidden sm:block absolute inset-0 -z-10" />

      <aside
        aria-label="Carrito de compras"
        className={`relative w-full bg-cartoon-cream border-0 sm:border-l-4 border-cartoon-ink shadow-2xl flex flex-col h-full z-10 overflow-hidden ${
          step !== 'cart' ? 'sm:max-w-lg' : 'sm:max-w-md'
        }`}
      >
        {/* Encabezado limpio con navegación */}
        <div className="p-3.5 sm:p-4 bg-cartoon-yellow border-b-2 sm:border-b-3 border-cartoon-ink flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {step === 'location' ? (
              <button
                onClick={() => setStep('cart')}
                aria-label="Volver a los productos"
                className="w-9 h-9 rounded-xl bg-white border-2 border-cartoon-ink shadow-cartoon-sm flex items-center justify-center text-cartoon-ink active:scale-95 transition-transform cursor-pointer"
              >
                <Icon name="arrow_back" size={18} />
              </button>
            ) : step === 'checkout' ? (
              <button
                onClick={() => setStep('location')}
                aria-label="Volver a la ubicación"
                className="w-9 h-9 rounded-xl bg-white border-2 border-cartoon-ink shadow-cartoon-sm flex items-center justify-center text-cartoon-ink active:scale-95 transition-transform cursor-pointer"
              >
                <Icon name="arrow_back" size={18} />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-white border-2 border-cartoon-ink shadow-cartoon-sm flex items-center justify-center">
                <Icon name="shopping_bag" size={18} className="text-cartoon-ink" />
              </div>
            )}
            <div>
              <h2 className="font-display text-base sm:text-lg text-cartoon-ink leading-tight">{headerTitle}</h2>
              <span className="font-sub font-bold text-[10px] sm:text-xs text-cartoon-ink/70">
                {items.length === 1 ? '1 producto' : `${items.length} productos`}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white hover:bg-cartoon-cream-dark border-2 border-cartoon-ink shadow-cartoon-sm flex items-center justify-center text-cartoon-ink transition-transform active:scale-95 cursor-pointer"
            aria-label="Cerrar carrito"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* ============================================================== */}
        {/* ETAPA 1: REVISIÓN DE PRODUCTOS */}
        {/* ============================================================== */}
        {step === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3 min-h-0">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 mb-3 animate-bob">
                    <img src="/assets/sticker_personaje.png" alt="Carrito Vacío" className="w-full h-full object-contain" />
                  </div>
                  <h3 className="font-display text-lg sm:text-xl text-cartoon-ink mb-1">Tu carrito está vacío</h3>
                  <p className="font-sub text-xs text-cartoon-ink/70 max-w-xs mb-5">
                    Agregá tus platos favoritos desde la carta para armar tu pedido.
                  </p>
                  <button onClick={onClose} className="btn-cartoon-primary text-xs py-2 px-5">
                    Ver Carta
                  </button>
                </div>
              ) : (
                <>
                  {/* Progreso hacia el delivery gratis */}
                  <div className={`rounded-xl border-2 sm:border-3 border-cartoon-ink p-2.5 shadow-cartoon-sm ${free ? 'bg-cartoon-green' : 'bg-white'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon name="two_wheeler" size={18} className="text-cartoon-ink" />
                      <p className="font-display text-xs sm:text-sm text-cartoon-ink">
                        {free ? '¡Tenés delivery gratis!' : `Te faltan ${money(threshold - subtotal)} para delivery gratis`}
                      </p>
                    </div>
                    <div className="h-2.5 rounded-full bg-cartoon-cream-dark border-2 border-cartoon-ink overflow-hidden">
                      <div
                        className="h-full bg-cartoon-yellow border-r-2 border-cartoon-ink"
                        style={{
                          width: `${progress}%`,
                          transition: 'width 400ms cubic-bezier(0.23, 1, 0.32, 1)',
                          borderRightWidth: progress >= 100 ? 0 : undefined,
                        }}
                      />
                    </div>
                  </div>

                  {/* Lista de productos agregados */}
                  <div className="space-y-2">
                    {items.map(({ product, quantity }) => (
                      <div
                        key={product.id}
                        className="bg-white p-2.5 sm:p-3 rounded-xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-sm flex items-center gap-2.5"
                      >
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-cartoon-cream-dark border-2 border-cartoon-ink flex-shrink-0 flex items-center justify-center">
                          <span className="text-xl sm:text-2xl select-none">{product.emoji || '🍔'}</span>
                        </div>
                        <div className="flex-1 min-w-0 pr-1">
                          <h4 className="font-display text-xs sm:text-sm text-cartoon-ink truncate leading-tight">{product.name}</h4>
                          <div className="font-sub font-bold text-[10px] sm:text-xs text-cartoon-ink/60 mb-1">
                            {money(product.price)} c/u
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                              aria-label="Restar"
                              className="w-6 h-6 rounded-md bg-cartoon-cream hover:bg-cartoon-cream-dark border border-cartoon-ink flex items-center justify-center text-cartoon-ink active:scale-90 transition-transform cursor-pointer"
                            >
                              <Icon name="remove" size={12} />
                            </button>
                            <span className="font-display text-xs sm:text-sm text-cartoon-ink w-4 text-center">{quantity}</span>
                            <button
                              onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                              aria-label="Sumar"
                              className="w-6 h-6 rounded-md bg-cartoon-cream hover:bg-cartoon-cream-dark border border-cartoon-ink flex items-center justify-center text-cartoon-ink active:scale-90 transition-transform cursor-pointer"
                            >
                              <Icon name="add" size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0">
                          <button
                            onClick={() => onRemoveItem(product.id)}
                            className="text-cartoon-ink/40 hover:text-cartoon-red transition-colors p-1 cursor-pointer"
                            title="Eliminar producto"
                          >
                            <Icon name="delete" size={15} />
                          </button>
                          <span className="font-display text-xs sm:text-sm text-cartoon-ink">{money(product.price * quantity)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cupón */}
                  <div className="bg-white p-2.5 rounded-xl border border-cartoon-ink/30">
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <div className="relative flex-1">
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cartoon-ink/40 flex items-center">
                          <Icon name="local_offer" size={13} />
                        </div>
                        <input
                          type="text"
                          placeholder="Cupón (ej: TRICO10)"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-cartoon-cream border border-cartoon-ink/40 font-sub text-xs uppercase focus:outline-none focus:border-cartoon-ink"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-cartoon-ink text-white font-sub font-bold text-xs rounded-lg hover:bg-cartoon-ink/90 cursor-pointer flex-shrink-0"
                      >
                        Aplicar
                      </button>
                    </form>
                    {appliedCoupon && (
                      <div className="mt-1 text-[11px] font-sub text-cartoon-green-dark font-bold flex items-center justify-between">
                        <span>✓ {appliedCoupon.label}</span>
                        <button onClick={() => setAppliedCoupon(null)} className="text-cartoon-red hover:underline text-[10px] cursor-pointer">
                          Quitar
                        </button>
                      </div>
                    )}
                    {couponError && <p className="mt-1 text-xs font-sub text-cartoon-red font-bold">{couponError}</p>}
                  </div>
                </>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-3.5 sm:p-4 bg-white border-t-2 sm:border-t-3 border-cartoon-ink space-y-2 flex-shrink-0 pb-6 sm:pb-5">
                <div className="space-y-1 text-xs font-sub">
                  <div className="flex justify-between text-cartoon-ink/80">
                    <span>Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-cartoon-green-dark font-bold">
                      <span>Descuento ({appliedCoupon.code})</span>
                      <span>-{money(discountAmount)}</span>
                    </div>
                  )}
                  <div className="pt-1 border-t border-cartoon-ink/15 flex justify-between items-center text-cartoon-ink font-display text-base">
                    <span>TOTAL</span>
                    <span className="text-cartoon-red">{money(subtotal - discountAmount)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setStep('location')}
                  className="w-full btn-cartoon-red text-xs sm:text-sm py-2.5 sm:py-3 flex items-center justify-center gap-1.5 group cursor-pointer"
                >
                  <span>CONTINUAR</span>
                  <Icon name="arrow_forward" size={16} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            )}
          </>
        )}

        {/* ============================================================== */}
        {/* ETAPA 2: MODALIDAD Y UBICACIÓN DESPEJADA (Estilo Uber) */}
        {/* ============================================================== */}
        {step === 'location' && (
          <div className="flex-1 flex flex-col min-h-0 animate-modalIn">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 min-h-0 flex flex-col">
              
              {/* Selector de Modalidad */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-sm flex-shrink-0">
                {[
                  { id: 'delivery', label: 'A Domicilio', icon: 'two_wheeler' },
                  { id: 'takeaway', label: 'Retiro en Local', icon: 'storefront' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setDeliveryType(opt.id);
                      setLocationError('');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-sub font-bold text-xs sm:text-sm cursor-pointer transition-colors duration-150 ${
                      deliveryType === opt.id
                        ? 'bg-cartoon-yellow text-cartoon-ink border-2 border-cartoon-ink shadow-cartoon-sm'
                        : 'text-cartoon-ink/60 border-2 border-transparent hover:text-cartoon-ink'
                    }`}
                  >
                    <Icon name={opt.icon} size={16} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Contenido según modalidad */}
              {deliveryType === 'delivery' ? (
                <DeliveryLocationPicker
                  subtotal={subtotal}
                  value={deliveryInfo}
                  onChange={(info) => {
                    setDeliveryInfo(info);
                    setLocationError('');
                  }}
                  error={locationError}
                />
              ) : (
                <div className="bg-white rounded-xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-sm p-4 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cartoon-yellow border-2 border-cartoon-ink flex items-center justify-center flex-shrink-0">
                      <Icon name="storefront" size={20} className="text-cartoon-ink" />
                    </div>
                    <div>
                      <h4 className="font-display text-sm text-cartoon-ink">Retiro en Local</h4>
                      <p className="font-sub text-[11px] text-cartoon-ink/70">Prepararemos tu pedido para que lo retires caliente.</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-cartoon-ink/15 font-sub text-xs text-cartoon-ink/80 space-y-0.5">
                    <p><strong>Dirección:</strong> {RESTAURANT_INFO.address}</p>
                    <p><strong>Horarios:</strong> {RESTAURANT_INFO.schedule}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Barra inferior de Entrega */}
            <div className="p-3.5 sm:p-4 bg-white border-t-2 sm:border-t-3 border-cartoon-ink space-y-2 flex-shrink-0 pb-6 sm:pb-5">
              <div className="space-y-1 text-xs font-sub">
                <div className="flex justify-between text-cartoon-ink/80">
                  <span>Subtotal</span>
                  <span>{money(subtotal - discountAmount)}</span>
                </div>
                {deliveryType === 'delivery' && (
                  <div className="flex justify-between text-cartoon-ink/80">
                    <span>Envío</span>
                    {free || shippingFee === 0 ? (
                      <span className="text-cartoon-green-dark font-bold">¡GRATIS!</span>
                    ) : (
                      <span>{shippingFee ? money(shippingFee) : 'Marcá en el mapa'}</span>
                    )}
                  </div>
                )}
                <div className="pt-1 border-t border-cartoon-ink/15 flex justify-between items-center text-cartoon-ink font-display text-base">
                  <span>TOTAL ESTIMADO</span>
                  <span className="text-cartoon-red">{money(total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="w-full btn-cartoon-red text-xs sm:text-sm py-2.5 sm:py-3 flex items-center justify-center gap-1.5 group cursor-pointer"
              >
                <span>CONTINUAR</span>
                <Icon name="arrow_forward" size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ETAPA 3: DATOS DEL CLIENTE Y FORMA DE PAGO */}
        {/* ============================================================== */}
        {step === 'checkout' && (
          <form onSubmit={handleFinalSubmit} className="flex-1 flex flex-col min-h-0 animate-modalIn">
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 min-h-0">
              
              {/* Nombre del Cliente */}
              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink/75 mb-1">
                  Tu Nombre:
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

              {/* Referencia de dirección (si es delivery) */}
              {deliveryType === 'delivery' && (
                <div>
                  <label className="block font-sub font-bold text-xs text-cartoon-ink/75 mb-1">
                    Referencia de tu casa (opcional):
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cartoon-ink/50 flex items-center">
                      <Icon name="home" size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="Piso, depto, color de puerta o reja…"
                      value={formData.addressNotes}
                      onChange={(e) => setFormData({ ...formData, addressNotes: e.target.value })}
                      className={inputClass(false)}
                    />
                  </div>
                </div>
              )}

              {/* Forma de Pago: Solo Efectivo o Transferencia */}
              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink/75 mb-1">
                  Forma de Pago:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Efectivo', label: '💵 Efectivo' },
                    { id: 'Transferencia', label: '📲 Transferencia' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: method.id })}
                      className={`py-2 px-2 rounded-xl border-2 border-cartoon-ink font-sub font-bold text-xs cursor-pointer transition-all duration-150 active:scale-[0.97] flex items-center justify-center gap-1.5 ${
                        formData.paymentMethod === method.id
                          ? 'bg-cartoon-yellow text-cartoon-ink shadow-cartoon-sm'
                          : 'bg-white text-cartoon-ink/70 hover:bg-cartoon-cream-dark'
                      }`}
                    >
                      <span>{method.label}</span>
                    </button>
                  ))}
                </div>

                {formData.paymentMethod === 'Efectivo' ? (
                  <input
                    type="text"
                    placeholder="¿Con cuánto abonás? (ej: $20.000 para el vuelto)"
                    value={formData.changeAmount}
                    onChange={(e) => setFormData({ ...formData, changeAmount: e.target.value })}
                    className="mt-2 w-full px-3 py-2 rounded-xl bg-white border-2 border-cartoon-ink/40 font-sub text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-ink shadow-sm"
                  />
                ) : (
                  <div className="mt-2 p-2 rounded-xl bg-[#FFF9D2] border border-cartoon-ink/40 font-sub text-[11px] text-cartoon-ink flex items-center gap-2 shadow-sm">
                    <span className="text-sm select-none">💡</span>
                    <span>Al confirmar tu pedido te enviamos el <strong>Alias / CBU</strong> para transferir al instante.</span>
                  </div>
                )}
              </div>

              {/* Aclaraciones opcionales */}
              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink/75 mb-1">
                  Aclaraciones del pedido (opcional):
                </label>
                <textarea
                  rows="2"
                  placeholder="Sin cebolla, salsas extras, etc…"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border-2 border-cartoon-ink font-sub text-xs text-cartoon-ink focus:outline-none shadow-cartoon-sm"
                />
              </div>

              {/* Resumen rápido de la entrega elegida */}
              <div className="bg-white p-2.5 rounded-xl border border-cartoon-ink/30 font-sub text-xs text-cartoon-ink/80">
                <p>
                  <strong>Entrega:</strong> {deliveryType === 'delivery' ? (deliveryInfo?.address ? `A Domicilio (${deliveryInfo.address})` : 'A Domicilio') : 'Retiro en Local'}
                </p>
              </div>
            </div>

            {/* Resumen de totales + Botón a WhatsApp */}
            <div className="p-3.5 sm:p-4 bg-white border-t-2 sm:border-t-3 border-cartoon-ink space-y-2 flex-shrink-0 pb-6 sm:pb-5">
              <div className="space-y-1 text-xs font-sub">
                <div className="flex justify-between text-cartoon-ink/80">
                  <span>Subtotal</span>
                  <span>{money(subtotal - discountAmount)}</span>
                </div>
                {deliveryType === 'delivery' && (
                  <div className="flex justify-between text-cartoon-ink/80">
                    <span>Envío</span>
                    {free || shippingFee === 0 ? (
                      <span className="text-cartoon-green-dark font-bold">¡GRATIS!</span>
                    ) : (
                      <span>{money(shippingFee)}</span>
                    )}
                  </div>
                )}
                <div className="pt-1 border-t border-cartoon-ink/15 flex justify-between items-center text-cartoon-ink font-display text-base">
                  <span>TOTAL A PAGAR</span>
                  <span className="text-cartoon-red">{money(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full btn-cartoon-red text-xs sm:text-sm py-2.5 sm:py-3 flex items-center justify-center gap-2 shadow-cartoon cursor-pointer"
              >
                <Icon name="chat" size={18} />
                <span>CONFIRMAR PEDIDO</span>
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
};
