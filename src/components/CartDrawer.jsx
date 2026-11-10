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
  const [step, setStep] = useState('cart'); // 'cart' | 'checkout'
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    addressNotes: '',
    notes: '',
    paymentMethod: 'Efectivo',
    changeAmount: '',
  });
  const [errors, setErrors] = useState({});

  // Al cerrar, volver siempre al primer paso
  useEffect(() => {
    if (!isOpen) setStep('cart');
  }, [isOpen]);

  // Si el carrito queda vacío, volver al paso 1
  useEffect(() => {
    if (items.length === 0) setStep('cart');
  }, [items.length]);

  if (!isOpen) return null;

  // Totales
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

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Ingresá tu nombre';
    if (!formData.phone.trim()) e.phone = 'Ingresá tu teléfono';
    if (deliveryType === 'delivery' && !deliveryInfo) e.location = 'Marcá tu casa en el mapa para calcular el envío';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#FFC93C', '#FF4757', '#2ED573', '#1E90FF'] });
    } catch {
      /* sin confeti */
    }

    const L = [];
    L.push(`🍔 *¡HOLA TRICO'S! QUIERO CONFIRMAR MI PEDIDO* 🍔`);
    L.push(`━━━━━━━━━━━━━━━━━━━━━`);
    L.push(`👤 *Cliente:* ${formData.name.trim()}`);
    L.push(`📱 *Teléfono:* ${formData.phone.trim()}`);
    L.push(`🛵 *Modalidad:* ${deliveryType === 'delivery' ? 'Envío a Domicilio' : 'Retiro en Local'}`);
    if (deliveryType === 'delivery' && deliveryInfo) {
      if (deliveryInfo.address) L.push(`📍 *Dirección:* ${deliveryInfo.address}`);
      if (formData.addressNotes.trim()) L.push(`🏠 *Referencia:* ${formData.addressNotes.trim()}`);
      L.push(`📏 *Distancia:* ${deliveryInfo.km.toFixed(1).replace('.', ',')} km`);
      L.push(`🗺️ *Ubicación:* https://maps.google.com/?q=${deliveryInfo.lat.toFixed(6)},${deliveryInfo.lng.toFixed(6)}`);
    }
    L.push(`💳 *Forma de Pago:* ${formData.paymentMethod}`);
    if (formData.paymentMethod === 'Efectivo' && formData.changeAmount.trim()) {
      L.push(`💵 *Paga con:* $${formData.changeAmount.trim()}`);
    }
    if (formData.notes.trim()) L.push(`📝 *Aclaraciones:* ${formData.notes.trim()}`);
    L.push('');
    L.push(`🛒 *DETALLE DEL PEDIDO:*`);
    items.forEach((item) => {
      L.push(`• ${item.quantity}x ${item.product.name} - ${money(item.product.price * item.quantity)}`);
      if (item.note) L.push(`  ↳ _Nota: ${item.note}_`);
    });
    L.push(`━━━━━━━━━━━━━━━━━━━━━`);
    L.push(`Subtotal: ${money(subtotal)}`);
    if (appliedCoupon) L.push(`🎉 Descuento (${appliedCoupon.code}): -${money(discountAmount)}`);
    if (deliveryType === 'delivery') {
      L.push(`🛵 Envío: ${shippingFee === 0 ? `¡GRATIS! (pedido desde ${money(threshold)})` : money(shippingFee)}`);
    }
    L.push(`💰 *TOTAL A PAGAR: ${money(total)}*`);
    L.push(`━━━━━━━━━━━━━━━━━━━━━`);
    L.push(`¡Muchas gracias! Aguardo confirmación del pedido. ✨`);

    window.open(`https://wa.me/${RESTAURANT_INFO.phone}?text=${encodeURIComponent(L.join('\n'))}`, '_blank');
    onOrderSuccess({ customerName: formData.name, total, deliveryType });
    setDeliveryInfo(null);
    setStep('cart');
  };

  const inputClass = (hasError) =>
    `w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border-3 font-sub text-sm text-cartoon-ink focus:outline-none shadow-cartoon-sm ${
      hasError ? 'border-cartoon-red' : 'border-cartoon-ink'
    }`;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-cartoon-ink/65 backdrop-blur-sm animate-fadeIn"
      />

      <aside
        aria-label="Carrito de compras"
        className={`fixed inset-y-0 right-0 w-full bg-cartoon-cream border-l-0 sm:border-l-4 border-cartoon-ink shadow-2xl flex flex-col animate-slideInRight h-[100dvh] max-h-[100dvh] z-10 overflow-hidden ${
          step === 'checkout' ? 'sm:max-w-xl' : 'sm:max-w-md'
        }`}
        style={{ transition: 'max-width 320ms var(--ease-drawer)' }}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-5 bg-cartoon-yellow border-b-3 border-cartoon-ink flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {step === 'checkout' ? (
              <button
                onClick={() => setStep('cart')}
                aria-label="Volver al carrito"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border-2 border-cartoon-ink shadow-cartoon-sm flex items-center justify-center text-cartoon-ink active:scale-95 transition-transform cursor-pointer"
              >
                <Icon name="arrow_back" size={20} />
              </button>
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border-2 border-cartoon-ink shadow-cartoon-sm flex items-center justify-center">
                <Icon name="shopping_bag" size={20} className="text-cartoon-ink" />
              </div>
            )}
            <div>
              <h2 className="font-display text-lg sm:text-xl text-cartoon-ink leading-tight">
                {step === 'checkout' ? 'Finalizar Pedido' : 'Tu Pedido'}
              </h2>
              <span className="font-sub font-bold text-[11px] sm:text-xs text-cartoon-ink/70">
                {items.length === 1 ? '1 producto' : `${items.length} productos`}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white hover:bg-cartoon-cream-dark border-2 border-cartoon-ink shadow-cartoon-sm flex items-center justify-center text-cartoon-ink transition-transform active:scale-95 cursor-pointer"
            aria-label="Cerrar carrito"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {step === 'cart' ? (
          <>
            {/* PASO 1: Carrito */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 min-h-0">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 mb-4 animate-bob">
                    <img src="/assets/sticker_personaje.png" alt="Carrito Vacío" className="w-full h-full object-contain" />
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl text-cartoon-ink mb-1">Tu carrito está vacío</h3>
                  <p className="font-sub text-xs sm:text-sm text-cartoon-ink/70 max-w-xs mb-6">
                    Agregá tus platos favoritos desde la carta para armar tu pedido.
                  </p>
                  <button onClick={onClose} className="btn-cartoon-primary text-xs sm:text-sm py-2 px-5">
                    Ver Carta
                  </button>
                </div>
              ) : (
                <>
                  {/* Progreso hacia el delivery gratis */}
                  <div
                    className={`rounded-2xl border-3 border-cartoon-ink p-3 shadow-cartoon-sm ${
                      free ? 'bg-cartoon-green' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="two_wheeler" size={20} className="text-cartoon-ink" />
                      <p className="font-display text-sm text-cartoon-ink">
                        {free ? '¡Tenés delivery gratis!' : `Te faltan ${money(threshold - subtotal)} para delivery gratis`}
                      </p>
                    </div>
                    <div className="h-3 rounded-full bg-cartoon-cream-dark border-2 border-cartoon-ink overflow-hidden">
                      <div
                        className="h-full bg-cartoon-yellow border-r-2 border-cartoon-ink"
                        style={{
                          width: `${progress}%`,
                          transition: 'width 500ms cubic-bezier(0.23, 1, 0.32, 1)',
                          borderRightWidth: progress >= 100 ? 0 : undefined,
                        }}
                      />
                    </div>
                  </div>

                  {/* Productos */}
                  <div className="space-y-2.5">
                    {items.map(({ product, quantity }) => (
                      <div
                        key={product.id}
                        className="bg-white p-3 rounded-2xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-sm flex items-center gap-2.5 sm:gap-3"
                      >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-cartoon-cream-dark border-2 border-cartoon-ink flex-shrink-0 flex items-center justify-center">
                          <span className="text-2xl sm:text-3xl select-none">{product.emoji || '🍔'}</span>
                        </div>
                        <div className="flex-1 min-w-0 pr-1">
                          <h4 className="font-display text-sm sm:text-base text-cartoon-ink truncate leading-tight">{product.name}</h4>
                          <div className="font-sub font-bold text-[11px] sm:text-xs text-cartoon-ink/60 mb-1">
                            {money(product.price)} c/u
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                              aria-label="Restar"
                              className="w-7 h-7 rounded-lg bg-cartoon-cream hover:bg-cartoon-cream-dark border-2 border-cartoon-ink flex items-center justify-center text-cartoon-ink active:scale-90 transition-transform cursor-pointer"
                            >
                              <Icon name="remove" size={14} />
                            </button>
                            <span className="font-display text-sm sm:text-base text-cartoon-ink w-5 text-center">{quantity}</span>
                            <button
                              onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                              aria-label="Sumar"
                              className="w-7 h-7 rounded-lg bg-cartoon-cream hover:bg-cartoon-cream-dark border-2 border-cartoon-ink flex items-center justify-center text-cartoon-ink active:scale-90 transition-transform cursor-pointer"
                            >
                              <Icon name="add" size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0">
                          <button
                            onClick={() => onRemoveItem(product.id)}
                            className="text-cartoon-ink/40 hover:text-cartoon-red transition-colors p-1 cursor-pointer"
                            title="Eliminar producto"
                          >
                            <Icon name="delete" size={16} />
                          </button>
                          <span className="font-display text-sm sm:text-base text-cartoon-ink">{money(product.price * quantity)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cupón */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-2xl border-2 border-cartoon-ink/30">
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <div className="relative flex-1">
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cartoon-ink/40 flex items-center">
                          <Icon name="local_offer" size={14} />
                        </div>
                        <input
                          type="text"
                          placeholder="Cupón (ej: TRICO10)"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-cartoon-cream border-2 border-cartoon-ink/40 font-sub text-xs uppercase focus:outline-none focus:border-cartoon-ink"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-cartoon-ink text-white font-sub font-bold text-xs rounded-xl hover:bg-cartoon-ink/90 cursor-pointer flex-shrink-0"
                      >
                        Aplicar
                      </button>
                    </form>
                    {appliedCoupon && (
                      <div className="mt-1.5 text-xs font-sub text-cartoon-green-dark font-bold flex items-center justify-between">
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
              <div className="p-3.5 sm:p-5 bg-white border-t-3 border-cartoon-ink space-y-2 flex-shrink-0 pb-6 sm:pb-5">
                <div className="space-y-1 text-xs sm:text-sm font-sub">
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
                  <div className="flex justify-between text-cartoon-ink/80">
                    <span>Envío</span>
                    {free ? (
                      <span className="text-cartoon-green-dark font-bold">GRATIS</span>
                    ) : (
                      <span>Según distancia</span>
                    )}
                  </div>
                  <div className="pt-1.5 border-t-2 border-cartoon-ink/20 flex justify-between items-center text-cartoon-ink">
                    <span className="font-display text-base sm:text-lg">TOTAL</span>
                    <span className="font-display text-xl sm:text-2xl text-cartoon-red">{money(subtotal - discountAmount)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setStep('checkout')}
                  className="w-full btn-cartoon-red text-sm sm:text-base py-2.5 sm:py-3 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>CONTINUAR PEDIDO</span>
                  <Icon name="arrow_forward" size={18} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            )}
          </>
        ) : (
          /* PASO 2: Datos + mapa de entrega */
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 animate-modalIn">
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 min-h-0">
              {/* Modalidad */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-2xl border-3 border-cartoon-ink shadow-cartoon-sm">
                {[
                  { id: 'delivery', label: 'A Domicilio', icon: 'two_wheeler' },
                  { id: 'takeaway', label: 'Retiro en Local', icon: 'storefront' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDeliveryType(opt.id)}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-sub font-bold text-sm cursor-pointer transition-colors duration-150 ${
                      deliveryType === opt.id ? 'bg-cartoon-yellow text-cartoon-ink border-2 border-cartoon-ink' : 'text-cartoon-ink/60 border-2 border-transparent'
                    }`}
                  >
                    <Icon name={opt.icon} size={18} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Mapa (solo a domicilio) */}
              {deliveryType === 'delivery' ? (
                <>
                  <DeliveryLocationPicker
                    subtotal={subtotal}
                    value={deliveryInfo}
                    onChange={(info) => {
                      setDeliveryInfo(info);
                      setErrors((e) => ({ ...e, location: undefined }));
                    }}
                    error={errors.location}
                  />
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cartoon-ink/50 flex items-center">
                      <Icon name="home" size={18} />
                    </div>
                    <input
                      type="text"
                      placeholder="Piso, depto, color de casa, entre calles…"
                      value={formData.addressNotes}
                      onChange={(e) => setFormData({ ...formData, addressNotes: e.target.value })}
                      className={inputClass(false)}
                    />
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl border-3 border-cartoon-ink shadow-cartoon-sm p-3 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-cartoon-yellow border-2 border-cartoon-ink flex items-center justify-center flex-shrink-0">
                    <Icon name="storefront" size={22} className="text-cartoon-ink" />
                  </div>
                  <div>
                    <p className="font-display text-sm text-cartoon-ink">{RESTAURANT_INFO.address}</p>
                    <p className="font-sub font-bold text-xs text-cartoon-ink/60">{RESTAURANT_INFO.schedule}</p>
                  </div>
                </div>
              )}

              {/* Nombre y teléfono */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cartoon-ink/50 flex items-center">
                      <Icon name="person" size={18} />
                    </div>
                    <input
                      type="text"
                      placeholder="Tu nombre"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={inputClass(errors.name)}
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-xs font-sub font-bold text-cartoon-red">{errors.name}</p>}
                </div>
                <div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cartoon-ink/50 flex items-center">
                      <Icon name="call" size={18} />
                    </div>
                    <input
                      type="tel"
                      placeholder="Tu WhatsApp"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={inputClass(errors.phone)}
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs font-sub font-bold text-cartoon-red">{errors.phone}</p>}
                </div>
              </div>

              {/* Forma de Pago: Solo Efectivo o Transferencia */}
              <div>
                <p className="font-sub font-bold text-xs text-cartoon-ink/75 mb-1.5 flex items-center gap-1.5">
                  <Icon name="payments" size={16} />
                  <span>Forma de Pago:</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Efectivo', label: '💵 Efectivo' },
                    { id: 'Transferencia', label: '📲 Transferencia' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: method.id })}
                      className={`py-2.5 px-2 rounded-xl border-2 sm:border-3 border-cartoon-ink font-sub font-bold text-xs sm:text-sm cursor-pointer transition-all duration-150 active:scale-[0.97] flex items-center justify-center gap-1.5 ${
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
                    className="mt-2 w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-cartoon-ink/40 font-sub text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-ink shadow-sm"
                  />
                ) : (
                  <div className="mt-2 p-2.5 rounded-xl bg-[#FFF9D2] border-2 border-cartoon-ink/40 font-sub text-xs text-cartoon-ink flex items-center gap-2 shadow-sm">
                    <span className="text-base select-none">💡</span>
                    <span>Te enviamos el <strong>Alias / CBU</strong> al confirmar tu pedido por WhatsApp para transferir al instante.</span>
                  </div>
                )}
              </div>

              <textarea
                rows="2"
                placeholder="Aclaraciones: sin cebolla, tocar timbre…"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-2xl bg-white border-3 border-cartoon-ink font-sub text-sm text-cartoon-ink focus:outline-none shadow-cartoon-sm"
              />
            </div>

            {/* Resumen + enviar */}
            <div className="p-3.5 sm:p-5 bg-white border-t-3 border-cartoon-ink space-y-2 flex-shrink-0 pb-6 sm:pb-5">
              <div className="space-y-1 text-xs sm:text-sm font-sub">
                <div className="flex justify-between text-cartoon-ink/80">
                  <span>Subtotal</span>
                  <span>{money(subtotal - discountAmount)}</span>
                </div>
                {deliveryType === 'delivery' && (
                  <div className="flex justify-between text-cartoon-ink/80">
                    <span>Envío{deliveryInfo ? ` (${deliveryInfo.km.toFixed(1).replace('.', ',')} km)` : ''}</span>
                    {shippingFee === 0 ? (
                      <span className="text-cartoon-green-dark font-bold">GRATIS</span>
                    ) : shippingFee == null ? (
                      <span>Marcá tu casa</span>
                    ) : (
                      <span>{money(shippingFee)}</span>
                    )}
                  </div>
                )}
                <div className="pt-1.5 border-t-2 border-cartoon-ink/20 flex justify-between items-center text-cartoon-ink">
                  <span className="font-display text-base sm:text-lg">TOTAL A PAGAR</span>
                  <span className="font-display text-xl sm:text-2xl text-cartoon-red">{money(total)}</span>
                </div>
              </div>
              <button
                type="submit"
                className="w-full btn-cartoon-green text-sm sm:text-base py-2.5 sm:py-3 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Icon name="send" size={18} className="text-cartoon-ink" />
                <span>ENVIAR PEDIDO POR WHATSAPP</span>
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
};
