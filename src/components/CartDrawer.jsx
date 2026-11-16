import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from './Icon';
import { RESTAURANT_INFO } from '../data/products';
import { isProductOutOfStock } from '../lib/firebase';
import { useProducts } from '../context/ProductsContext';
import { getPromotions } from '../lib/promotionsStore';
import { buildWhatsAppUrl, openWhatsApp } from '../lib/whatsapp';
import { buildGoogleMapsUrl, reverseAddress, searchAddress } from '../lib/delivery';
import DeliveryMap from './DeliveryMap';

const FREE_DELIVERY_THRESHOLD = RESTAURANT_INFO.freeDeliveryThreshold || 55000;
const money = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

export const CartDrawer = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  appliedCoupon,
  setAppliedCoupon,
  onOrderSuccess,
}) => {
  const { products } = useProducts();

  const [step, setStep] = useState('cart');
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  const [selectedLocation, setSelectedLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('tricos_customer_location');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [locationError, setLocationError] = useState('');
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('tricos_customer_info');
      return saved
        ? JSON.parse(saved)
        : {
            name: '',
            phone: '',
            deliveryType: 'delivery',
            addressNotes: '',
            paymentMethod: 'Efectivo',
            changeAmount: '',
            notes: '',
          };
    } catch {
      return {
        name: '',
        phone: '',
        deliveryType: 'delivery',
        addressNotes: '',
        paymentMethod: 'Efectivo',
        changeAmount: '',
        notes: '',
      };
    }
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    try {
      localStorage.setItem('tricos_customer_info', JSON.stringify(formData));
    } catch {}
  }, [formData]);

  useEffect(() => {
    try {
      if (selectedLocation) {
        localStorage.setItem('tricos_customer_location', JSON.stringify(selectedLocation));
      }
    } catch {}
  }, [selectedLocation]);

  useEffect(() => {
    if (!isOpen) {
      setStep('cart');
      setLocationError('');
      setGeoError('');
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (items.length === 0) {
      setStep('cart');
    }
  }, [items.length]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSearchResults([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setIsSearching(true);
      searchAddress(q, ctrl.signal)
        .then((res) => setSearchResults(res))
        .catch(() => {})
        .finally(() => setIsSearching(false));
    }, 400);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [searchQuery]);

  const outOfStockItems = useMemo(() => {
    return items.filter((item) => {
      const baseId = item.product.originalId || item.product.id;
      const live = products.find((p) => p.id === baseId || (p.id && baseId.startsWith(p.id)));
      if (!live) return false;
      return isProductOutOfStock(live);
    });
  }, [items, products]);

  const hasOutOfStockItems = outOfStockItems.length > 0;

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

  const handleProceedToLocation = () => {
    if (hasOutOfStockItems) {
      alert('Uno o más platos en tu carrito se encuentran agotados. Por favor quitalos para continuar.');
      return;
    }
    setStep('location');
  };

  const handlePickLocation = async ({ lat, lng }) => {
    setLocationError('');
    setGeoError('');
    setSelectedLocation({
      lat,
      lng,
      address: 'Buscando dirección...',
    });

    try {
      const addr = await reverseAddress({ lat, lng });
      setSelectedLocation({
        lat,
        lng,
        address: addr || 'Ubicación seleccionada en el mapa',
      });
    } catch {
      setSelectedLocation({
        lat,
        lng,
        address: 'Ubicación seleccionada en el mapa',
      });
    }
  };

  const handleUseMyLocation = () => {
    setGeoError('');
    setLocationError('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Tu navegador no permite usar GPS.');
      return;
    }

    setIsGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGeoLoading(false);
        handlePickLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        setIsGeoLoading(false);
        setGeoError('No se pudo obtener tu GPS. Marcá el punto directamente en el mapa.');
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  };

  const handleProceedFromLocation = () => {
    if (formData.deliveryType === 'delivery') {
      if (!selectedLocation || selectedLocation.lat == null || selectedLocation.lng == null) {
        setLocationError('Marcá un punto en el mapa para continuar.');
        return;
      }
    }
    setLocationError('');
    setStep('checkout');
  };

  const handleSubmitOrder = async (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();

    const e = {};
    if (!formData.name.trim()) e.name = 'Ingresá tu nombre';
    const cleanPhone = (formData.phone || '').trim();
    if (!cleanPhone) {
      e.phone = 'Ingresá tu número de celular';
    } else if (cleanPhone.replace(/\D/g, '').length < 6) {
      e.phone = 'Ingresá un número válido';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (hasOutOfStockItems) {
      alert('Uno o más platos en tu carrito se encuentran agotados. Por favor quitalos para continuar.');
      setStep('cart');
      return;
    }

    if (formData.deliveryType === 'delivery') {
      if (!selectedLocation || selectedLocation.lat == null || selectedLocation.lng == null) {
        setStep('location');
        setLocationError('Marcá tu ubicación en el mapa antes de confirmar.');
        return;
      }
    }

    const googleMapsUrl =
      formData.deliveryType === 'delivery' && selectedLocation?.lat && selectedLocation?.lng
        ? buildGoogleMapsUrl(selectedLocation.lat, selectedLocation.lng)
        : null;

    const displayAddress =
      formData.deliveryType === 'delivery'
        ? selectedLocation?.address || 'Ubicación seleccionada en el mapa'
        : RESTAURANT_INFO.address;

    const L = [];
    L.push(`*PEDIDO TRICO'S*`);
    L.push(`------------------------`);
    L.push(`*Cliente:* ${formData.name.trim()}`);
    L.push(`*Celular:* ${cleanPhone}`);
    L.push(`*Modalidad:* ${formData.deliveryType === 'delivery' ? 'Envío a domicilio' : 'Retiro en local'}`);

    if (formData.deliveryType === 'delivery') {
      if (displayAddress) {
        L.push(`*Dirección:* ${displayAddress}`);
      }
      if (googleMapsUrl) {
        L.push(`*Ubicación Maps:* ${googleMapsUrl}`);
      }
      if (formData.addressNotes.trim()) {
        L.push(`*Referencia:* ${formData.addressNotes.trim()}`);
      }
      if (isFreeDeliveryQualified) {
        L.push(`*Beneficio:* Envío bonificado`);
      }
    } else {
      L.push(`*Punto de retiro:* ${RESTAURANT_INFO.address}`);
    }

    L.push(
      `*Pago:* ${formData.paymentMethod}${
        formData.paymentMethod === 'Efectivo' && formData.changeAmount.trim()
          ? ` (Abona con: $${formData.changeAmount.trim()})`
          : ''
      }`
    );

    if (formData.notes.trim()) {
      L.push(`*Aclaraciones:* ${formData.notes.trim()}`);
    }

    L.push('');
    L.push(`*DETALLE DEL PEDIDO:*`);
    L.push(`------------------------`);
    items.forEach((item) => {
      const itemSubtotal = item.product.price * item.quantity;
      L.push(`- ${item.quantity}x ${item.product.name} (${money(itemSubtotal)})`);
      if (item.note) {
        L.push(`  Nota: ${item.note}`);
      }
    });

    if (appliedCoupon && discountAmount > 0) {
      L.push('');
      L.push(`*Descuento (${appliedCoupon.code}):* -${money(discountAmount)}`);
    }

    L.push(`------------------------`);
    L.push(`*TOTAL: ${money(total)}*`);

    const messageText = L.join('\n');
    const whatsappUrl = buildWhatsAppUrl(RESTAURANT_INFO.phone, messageText);

    if (typeof onOrderSuccess === 'function') {
      try {
        await onOrderSuccess({
          customerName: formData.name.trim(),
          phone: cleanPhone,
          deliveryType: formData.deliveryType,
          address: displayAddress,
          addressNotes: formData.addressNotes.trim(),
          location: selectedLocation,
          mapUrl: googleMapsUrl,
          paymentMethod: formData.paymentMethod,
          changeAmount: formData.changeAmount.trim(),
          notes: formData.notes.trim(),
          subtotal,
          discountAmount,
          total,
          isFreeDelivery: isFreeDeliveryQualified,
          whatsappUrl,
          whatsappMessage: messageText,
          items: items.map((item) => {
            const prod = item.product || {};
            const isDobleName = (prod.name || '').toLowerCase().includes('doble');
            return {
              productId: prod.originalId || prod.id,
              originalId: prod.originalId || prod.id,
              name: prod.name,
              quantity: item.quantity,
              price: prod.price,
              subtotal: prod.price * item.quantity,
              variant: prod.variant || (isDobleName ? 'Doble' : 'Simple'),
              variantId: prod.variantId || (isDobleName ? 'doble' : 'simple'),
              protein: prod.protein || null,
            };
          }),
        });
      } catch (err) {
        console.warn('Error en onOrderSuccess:', err);
      }
    }

    openWhatsApp(RESTAURANT_INFO.phone, messageText);
    setStep('cart');
  };

  const inputClass = (hasError) =>
    `w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border font-sub text-xs sm:text-sm text-slate-900 focus:outline-none transition-colors ${
      hasError ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300 focus:border-slate-900'
    }`;

  const headerTitle =
    step === 'cart'
      ? 'Tu Pedido'
      : step === 'location'
      ? 'Entrega'
      : 'Confirmar Datos';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div onClick={onClose} className="hidden sm:block absolute inset-0 -z-10" />

      <aside
        aria-label="Carrito de compras"
        className="relative w-full sm:max-w-md bg-white border-0 sm:border-l border-slate-200 shadow-2xl flex flex-col h-full z-10 overflow-hidden"
      >
        {/* Cabecera limpia */}
        <div className="px-4 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {step !== 'cart' && (
              <button
                type="button"
                onClick={() => setStep(step === 'checkout' ? 'location' : 'cart')}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer transition-colors"
                aria-label="Volver"
              >
                <Icon name="arrow_back" size={18} />
              </button>
            )}
            <h2 className="font-display text-base sm:text-lg text-slate-900">{headerTitle}</h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer transition-colors"
            aria-label="Cerrar"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* ============================================================== */}
        {/* ETAPA 1: PRODUCTOS EN EL CARRITO */}
        {/* ============================================================== */}
        {step === 'cart' && (
          <div className="flex-1 flex flex-col min-h-0 animate-fadeIn">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <Icon name="shopping_bag" size={24} />
                  </div>
                  <h3 className="font-display text-base text-slate-900 mb-1">Tu carrito está vacío</h3>
                  <p className="font-sub text-xs text-slate-500 max-w-xs mb-4">
                    Seleccioná productos de la carta para armar tu pedido.
                  </p>
                  <button onClick={onClose} className="btn-cartoon-primary text-xs py-2 px-5">
                    Ver la Carta
                  </button>
                </div>
              ) : (
                <>
                  {/* Progreso de Envío Gratis */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="font-sub font-semibold text-xs text-slate-800 mb-1.5">
                      {isFreeDeliveryQualified
                        ? 'Contás con envío bonificado en este pedido'
                        : `Sumá ${money(FREE_DELIVERY_THRESHOLD - subtotal)} más para envío gratis`}
                    </p>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Lista de items */}
                  <div className="space-y-2.5">
                    {items.map(({ product, quantity }) => {
                      const isItemOutOfStock = outOfStockItems.some((it) => it.product.id === product.id);
                      const itemSubtotal = product.price * quantity;

                      return (
                        <div
                          key={product.id}
                          className={`p-3 rounded-xl border flex flex-col gap-2.5 ${
                            isItemOutOfStock ? 'bg-rose-50/60 border-rose-300' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {product.image && (
                              <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden">
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-display text-sm text-slate-900 truncate leading-snug">
                                  {product.name}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => onRemoveItem(product.id)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  aria-label="Quitar"
                                >
                                  <Icon name="close" size={16} />
                                </button>
                              </div>
                              <p className="font-sub text-xs text-slate-500 mt-0.5">{money(product.price)} c/u</p>
                              {isItemOutOfStock && (
                                <span className="inline-block mt-1 text-[10px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                                  Agotado temporalmente
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                                className="w-6 h-6 rounded-md bg-white text-slate-700 font-semibold text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                              >
                                -
                              </button>
                              <span className="font-sub font-semibold text-xs w-6 text-center text-slate-900">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                                disabled={isItemOutOfStock}
                                className="w-6 h-6 rounded-md bg-white text-slate-700 font-semibold text-xs flex items-center justify-center shadow-2xs cursor-pointer disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>

                            <span className="font-display text-sm text-slate-900">{money(itemSubtotal)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cupón */}
                  <div className="pt-1">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                        <span className="text-xs font-sub font-semibold text-emerald-800">
                          Cupón aplicado: {appliedCoupon.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAppliedCoupon(null)}
                          className="text-xs text-rose-600 font-semibold hover:underline cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Código de descuento"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value);
                            setCouponError('');
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-sub text-xs uppercase text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          className="btn-cartoon-white text-xs py-2 px-3.5"
                        >
                          Aplicar
                        </button>
                      </div>
                    )}
                    {couponError && <p className="mt-1 text-xs font-sub text-rose-600">{couponError}</p>}
                  </div>
                </>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-4 bg-white border-t border-slate-200 space-y-3 flex-shrink-0">
                <div className="space-y-1 text-xs font-sub">
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Descuento:</span>
                      <span>-{money(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-900 font-display text-base">
                    <span>Total</span>
                    <span>{money(total)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleProceedToLocation}
                  className="w-full btn-cartoon-primary py-3 text-sm"
                >
                  <span>Continuar</span>
                  <Icon name="arrow_forward" size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ETAPA 2: SELECCIÓN DE UBICACIÓN LIMPIA Y EN UN SOLO PASO */}
        {/* ============================================================== */}
        {step === 'location' && (
          <div className="flex-1 flex flex-col min-h-0 animate-fadeIn">
            <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
              {/* Selector Delivery / Retiro */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl flex-shrink-0">
                {[
                  { id: 'delivery', label: 'Envío a domicilio' },
                  { id: 'takeaway', label: 'Retiro en local' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, deliveryType: opt.id });
                      setLocationError('');
                    }}
                    className={`py-2 px-3 rounded-lg font-sub font-semibold text-xs cursor-pointer transition-all ${
                      formData.deliveryType === opt.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {formData.deliveryType === 'delivery' ? (
                <>
                  {/* Buscador y GPS en una sola barra limpia */}
                  <div className="flex gap-2 flex-shrink-0">
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                        <Icon name="search" size={16} />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar calle o barrio..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-sub text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
                      />
                      {(searchResults.length > 0 || isSearching) && (
                        <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-44 overflow-y-auto">
                          {isSearching && searchResults.length === 0 && (
                            <li className="px-3 py-2 font-sub text-xs text-slate-500">Buscando...</li>
                          )}
                          {searchResults.map((r, i) => (
                            <li key={`${r.lat}-${r.lng}-${i}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  handlePickLocation({ lat: r.lat, lng: r.lng });
                                  setSearchQuery('');
                                  setSearchResults([]);
                                }}
                                className="w-full text-left px-3 py-2 font-sub text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100 last:border-0 cursor-pointer"
                              >
                                <Icon name="location_on" size={14} className="text-slate-400 flex-shrink-0" />
                                <span className="truncate">{r.label}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleUseMyLocation}
                      disabled={isGeoLoading}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-sub font-semibold text-xs flex items-center gap-1.5 cursor-pointer flex-shrink-0 transition-colors"
                    >
                      <Icon name="my_location" size={15} className={isGeoLoading ? 'animate-spin' : ''} />
                      <span>GPS</span>
                    </button>
                  </div>

                  {geoError && <p className="text-xs font-sub text-rose-600 flex-shrink-0">{geoError}</p>}

                  {/* Mapa amplio y despejado */}
                  <div
                    className={`relative flex-1 min-h-[280px] rounded-xl border overflow-hidden ${
                      locationError ? 'border-rose-500' : 'border-slate-200'
                    }`}
                  >
                    <DeliveryMap value={selectedLocation} onPick={handlePickLocation} />
                  </div>

                  {/* Línea compacta con la dirección marcada */}
                  {selectedLocation?.lat != null && (
                    <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs font-sub text-slate-800 flex-shrink-0">
                      <Icon name="location_on" size={15} className="text-rose-600 flex-shrink-0" />
                      <span className="truncate font-medium">{selectedLocation.address}</span>
                    </div>
                  )}

                  {locationError && (
                    <p className="text-xs font-sub font-medium text-rose-600 flex-shrink-0">{locationError}</p>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <h4 className="font-display text-sm text-slate-900">Punto de retiro</h4>
                    <p className="font-sub text-xs text-slate-600">{RESTAURANT_INFO.address}, La Rioja</p>
                    <p className="font-sub text-xs text-slate-500 pt-1">Horario: {RESTAURANT_INFO.schedule}</p>
                  </div>

                  <div className="relative h-64 rounded-xl border border-slate-200 overflow-hidden">
                    <DeliveryMap value={null} onPick={() => {}} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
              <button
                type="button"
                onClick={handleProceedFromLocation}
                className="w-full btn-cartoon-primary py-3 text-sm"
              >
                <span>Continuar</span>
                <Icon name="arrow_forward" size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ETAPA 3: DATOS DEL CLIENTE Y CONFIRMACIÓN */}
        {/* ============================================================== */}
        {step === 'checkout' && (
          <form onSubmit={handleSubmitOrder} className="flex-1 flex flex-col min-h-0 animate-fadeIn">
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-0">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[11px] font-sub text-slate-500 block">
                    {formData.deliveryType === 'delivery' ? 'Envío a domicilio' : 'Retiro en local'}
                  </span>
                  <p className="font-sub font-semibold text-xs text-slate-900 truncate">
                    {formData.deliveryType === 'delivery'
                      ? selectedLocation?.address || 'Ubicación seleccionada'
                      : RESTAURANT_INFO.address}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('location')}
                  className="text-xs font-sub font-semibold text-slate-700 hover:text-slate-900 underline cursor-pointer flex-shrink-0"
                >
                  Cambiar
                </button>
              </div>

              <div>
                <label className="block font-sub font-medium text-xs text-slate-700 mb-1">
                  Nombre y Apellido *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">
                    <Icon name="person" size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    className={inputClass(errors.name)}
                  />
                </div>
                {errors.name && <p className="mt-1 text-xs font-sub text-rose-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block font-sub font-medium text-xs text-slate-700 mb-1">
                  Teléfono Celular *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">
                    <Icon name="call" size={16} />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 3804123456"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (errors.phone) setErrors({ ...errors, phone: '' });
                    }}
                    className={inputClass(errors.phone)}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-xs font-sub text-rose-600">{errors.phone}</p>}
              </div>

              {formData.deliveryType === 'delivery' && (
                <div>
                  <label className="block font-sub font-medium text-xs text-slate-700 mb-1">
                    Referencia o piso (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Portón negro, casa esquina"
                    value={formData.addressNotes}
                    onChange={(e) => setFormData({ ...formData, addressNotes: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 font-sub text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
              )}

              <div>
                <label className="block font-sub font-medium text-xs text-slate-700 mb-1">
                  Medio de pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Efectivo', 'Transferencia'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: m })}
                      className={`py-2 px-3 rounded-xl border font-sub font-semibold text-xs cursor-pointer transition-all ${
                        formData.paymentMethod === m
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {formData.paymentMethod === 'Efectivo' && (
                  <input
                    type="text"
                    placeholder="¿Con cuánto abonás? (Opcional)"
                    value={formData.changeAmount}
                    onChange={(e) => setFormData({ ...formData, changeAmount: e.target.value })}
                    className="mt-2 w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-sub text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                )}
              </div>

              <div>
                <label className="block font-sub font-medium text-xs text-slate-700 mb-1">
                  Notas del pedido (opcional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Aclaraciones sobre la preparación..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-sub text-xs text-slate-900 focus:outline-none focus:border-slate-900 resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 space-y-3 flex-shrink-0">
              <div className="flex justify-between items-center text-slate-900 font-display text-base">
                <span>Total a pagar</span>
                <span>{money(total)}</span>
              </div>

              <button
                type="submit"
                className="w-full btn-cartoon-red py-3 text-sm"
              >
                <span>Confirmar pedido por WhatsApp</span>
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
};
