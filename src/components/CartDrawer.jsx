import React, { useEffect, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Icon } from './Icon';
import DeliveryMap from './DeliveryMap';
import { RESTAURANT_INFO } from '../data/products';
import { isProductOutOfStock } from '../lib/firebase';
import { getPromotions } from '../lib/promotionsStore';
import { buildWhatsAppUrl, openWhatsApp } from '../lib/whatsapp';
import { searchAddress, reverseAddress, buildGoogleMapsUrl } from '../lib/delivery';

const money = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;
const STORAGE_FORM_KEY = 'tricos_customer_form_v2';
const STORAGE_LOCATION_KEY = 'tricos_customer_location_v1';
const FREE_DELIVERY_THRESHOLD = RESTAURANT_INFO.freeDeliveryThreshold || 55000;

const getInitialFormData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_FORM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        name: parsed.name || '',
        phone: parsed.phone || '',
        deliveryType: parsed.deliveryType || 'delivery',
        addressNotes: parsed.addressNotes || '',
        notes: parsed.notes || '',
        paymentMethod: parsed.paymentMethod || 'Efectivo',
        changeAmount: parsed.changeAmount || '',
      };
    }
  } catch {}
  return {
    name: '',
    phone: '',
    deliveryType: 'delivery',
    addressNotes: '',
    notes: '',
    paymentMethod: 'Efectivo',
    changeAmount: '',
  };
};

const getInitialLocation = () => {
  try {
    const raw = localStorage.getItem(STORAGE_LOCATION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
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
  // Flujo organizado por etapas:
  // 'cart' (Paso 1: Tu Pedido) -> 'location' (Paso 2: Ubicación en Mapa) -> 'checkout' (Paso 3: Tus Datos y Pago)
  const [step, setStep] = useState('cart');
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [formData, setFormData] = useState(getInitialFormData);
  const [errors, setErrors] = useState({});

  // Ubicación y mapa interactivo (Paso 2)
  const [selectedLocation, setSelectedLocation] = useState(getInitialLocation);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Persistir datos del formulario
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FORM_KEY, JSON.stringify(formData));
    } catch {}
  }, [formData]);

  // Persistir última ubicación seleccionada
  useEffect(() => {
    try {
      if (selectedLocation) {
        localStorage.setItem(STORAGE_LOCATION_KEY, JSON.stringify(selectedLocation));
      }
    } catch {}
  }, [selectedLocation]);

  // Reset al cerrar drawer
  useEffect(() => {
    if (!isOpen) {
      setStep('cart');
      setErrors({});
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

  // Búsqueda de calles en La Rioja con debounce
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
    }, 450);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [searchQuery]);

  // Detección en tiempo real de platos sin stock
  const outOfStockItems = useMemo(() => {
    return items.filter((item) => {
      const baseId = item.product.originalId || item.product.id;
      const live = products.find((p) => p.id === baseId || (p.id && baseId.startsWith(p.id)));
      if (!live) return false;
      return isProductOutOfStock(live);
    });
  }, [items, products]);

  const hasOutOfStockItems = outOfStockItems.length > 0;

  // Bloquear scroll de fondo mientras el drawer esté abierto
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

  // Pasar de Etapa 1 (cart) a Etapa 2 (ubicación en mapa)
  const handleProceedToLocation = () => {
    if (hasOutOfStockItems) {
      alert('Uno o más platos en tu carrito se han quedado sin stock. Por favor quitalos para continuar.');
      return;
    }
    setStep('location');
  };

  // Al tocar el mapa interactivo para marcar la casa
  const handlePickLocation = async ({ lat, lng }) => {
    setLocationError('');
    setGeoError('');
    setSelectedLocation({
      lat,
      lng,
      address: 'Detectando dirección...',
    });

    try {
      const addr = await reverseAddress({ lat, lng });
      const finalAddress = addr || 'Ubicación seleccionada en La Rioja';
      setSelectedLocation({
        lat,
        lng,
        address: finalAddress,
      });
    } catch {
      setSelectedLocation((prev) => ({
        ...prev,
        address: 'Ubicación marcada en el mapa',
      }));
    }
  };

  // Botón GPS
  const handleUseMyLocation = () => {
    setGeoError('');
    setLocationError('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Tu navegador no permite compartir ubicación GPS.');
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
        setGeoError('No pudimos acceder a tu GPS. Podés tocar directamente en el mapa.');
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  };

  // Pasar de Etapa 2 (ubicación en mapa) a Etapa 3 (datos del cliente y pago)
  const handleProceedFromLocation = () => {
    if (formData.deliveryType === 'delivery') {
      if (!selectedLocation || selectedLocation.lat == null || selectedLocation.lng == null) {
        setLocationError('Por favor tocá en el mapa para marcar la casa donde querés recibir el pedido 📍');
        return;
      }
    }
    setLocationError('');
    setStep('checkout');
  };

  // Enviar pedido final con listado organizado completo y enlace de ubicación en Google Maps
  const handleSubmitOrder = (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();

    const e = {};
    if (!formData.name.trim()) e.name = 'Ingresá tu nombre para el pedido';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (hasOutOfStockItems) {
      alert('Uno o más platos en tu carrito se han quedado sin stock. Por favor quitalos para continuar.');
      setStep('cart');
      return;
    }

    if (formData.deliveryType === 'delivery') {
      if (!selectedLocation || selectedLocation.lat == null || selectedLocation.lng == null) {
        setStep('location');
        setLocationError('Por favor marcá en el mapa la ubicación de tu casa antes de confirmar 📍');
        return;
      }
    }

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFC93C', '#FF4757', '#2ED573', '#1E90FF'],
      });
    } catch {}

    const googleMapsUrl =
      formData.deliveryType === 'delivery' && selectedLocation?.lat && selectedLocation?.lng
        ? buildGoogleMapsUrl(selectedLocation.lat, selectedLocation.lng)
        : null;

    const displayAddress =
      formData.deliveryType === 'delivery'
        ? selectedLocation?.address || 'Ubicación seleccionada en el mapa'
        : RESTAURANT_INFO.address;

    // Generar Listado Organizado para WhatsApp con el enlace directo al mapa
    const L = [];
    L.push(`🍔 *PEDIDO TRICO'S*`);
    L.push(`────────────────────────`);
    L.push(`👤 *Cliente:* ${formData.name.trim()}`);
    L.push(`🛵 *Entrega:* ${formData.deliveryType === 'delivery' ? 'A Domicilio' : 'Retiro en Local'}`);

    if (formData.deliveryType === 'delivery') {
      if (displayAddress) {
        L.push(`📍 *Dirección:* ${displayAddress}`);
      }
      if (googleMapsUrl) {
        L.push(`🗺️ *Ubicación en Google Maps:* ${googleMapsUrl}`);
      }
      if (formData.addressNotes.trim()) {
        L.push(`   ↳ *Referencia de la casa:* ${formData.addressNotes.trim()}`);
      }
      if (isFreeDeliveryQualified) {
        L.push(`🎉 *Beneficio:* ¡Delivery Gratis bonificado!`);
      }
    } else {
      L.push(`📍 *Punto de Retiro:* ${RESTAURANT_INFO.address}`);
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

    // 2. Notificar al sistema de la orden completada (Firestore, ganancias, modal)
    if (typeof onOrderSuccess === 'function') {
      try {
        onOrderSuccess({
          customerName: formData.name.trim(),
          phone: (formData.phone || '').trim(),
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

  const headerTitle =
    step === 'cart'
      ? 'Tu Pedido'
      : step === 'location'
      ? formData.deliveryType === 'delivery'
        ? 'Ubicá tu Casa'
        : 'Punto de Retiro'
      : 'Tus Datos y Pago';

  const headerSubtitle =
    step === 'cart'
      ? items.length === 1
        ? '1 producto seleccionado'
        : `${items.length} productos seleccionados`
      : step === 'location'
      ? 'Paso 2 de 3 • Selección en el mapa'
      : 'Paso 3 de 3 • Confirmación final';

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
            {step === 'location' ? (
              <button
                type="button"
                onClick={() => setStep('cart')}
                aria-label="Volver a revisar productos"
                className="w-9 h-9 rounded-xl bg-white border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center text-cartoon-ink active:scale-95 transition-transform cursor-pointer"
              >
                <Icon name="arrow_back" size={18} />
              </button>
            ) : step === 'checkout' ? (
              <button
                type="button"
                onClick={() => setStep('location')}
                aria-label="Volver a la ubicación"
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
                {headerSubtitle}
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
                                <span className="text-xl">🍔</span>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <h4 className="font-display text-xs sm:text-sm text-cartoon-ink truncate leading-tight">
                                  {product.name}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => onRemoveItem(product.id)}
                                  className="text-cartoon-ink/40 hover:text-cartoon-red transition-colors p-0.5 cursor-pointer"
                                  title="Quitar plato"
                                  aria-label="Quitar plato"
                                >
                                  <Icon name="close" size={14} />
                                </button>
                              </div>

                              <p className="font-sub text-[11px] text-cartoon-ink/70">
                                {money(product.price)} c/u
                              </p>

                              {isItemOutOfStock && (
                                <span className="inline-block mt-0.5 text-[10px] font-bold text-cartoon-red bg-rose-100 px-1.5 py-0.2 rounded border border-cartoon-red/40">
                                  Sin stock disponible
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Control de cantidad y subtotal del item */}
                          <div className="flex items-center justify-between pt-1 border-t border-cartoon-ink/10 text-xs">
                            <div className="flex items-center gap-1.5 bg-cartoon-cream border-2 border-cartoon-ink rounded-xl p-0.5 shadow-cartoon-xs">
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                                className="w-6 h-6 rounded-lg bg-white border border-cartoon-ink flex items-center justify-center text-cartoon-ink font-bold hover:bg-cartoon-yellow active:scale-95 cursor-pointer"
                                aria-label="Restar una unidad"
                              >
                                -
                              </button>
                              <span className="font-display text-xs w-5 text-center text-cartoon-ink">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                                disabled={isItemOutOfStock}
                                className="w-6 h-6 rounded-lg bg-white border border-cartoon-ink flex items-center justify-center text-cartoon-ink font-bold hover:bg-cartoon-yellow active:scale-95 cursor-pointer disabled:opacity-40"
                                aria-label="Sumar una unidad"
                              >
                                +
                              </button>
                            </div>

                            <div className="text-right">
                              <span className="font-sub text-[10px] text-cartoon-ink/60 block">Subtotal:</span>
                              <span className="font-display text-xs sm:text-sm text-cartoon-ink">
                                {money(itemSubtotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cupón de descuento */}
                  <div className="p-2.5 rounded-2xl bg-white border-2 border-cartoon-ink shadow-cartoon-xs">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-cartoon-green/15 border border-cartoon-green rounded-xl p-2">
                        <div className="flex items-center gap-1.5 text-xs font-sub font-bold text-cartoon-green-dark">
                          <span>🎟️</span>
                          <span>Cupón: {appliedCoupon.code}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAppliedCoupon(null)}
                          className="text-xs text-cartoon-red font-bold hover:underline cursor-pointer"
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

            {/* Pie de Etapa 1: Resumen y Botón para avanzar a Etapa 2 (Ubicación en mapa) */}
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
                  onClick={handleProceedToLocation}
                  className="w-full btn-cartoon-red text-xs sm:text-sm py-3 flex items-center justify-center gap-2 group cursor-pointer shadow-cartoon active:scale-95 transition-transform"
                >
                  <Icon name="location_on" size={18} />
                  <span>ELEGIR UBICACIÓN DE ENTREGA</span>
                  <Icon name="arrow_forward" size={18} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ETAPA 2: UBICACIÓN DE TU CASA EN EL MAPA INTERACTIVO */}
        {/* ============================================================== */}
        {step === 'location' && (
          <div className="flex-1 flex flex-col min-h-0 animate-modalIn">
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5 min-h-0 flex flex-col">
              {/* Selector de Modalidad: Delivery o Retiro */}
              <div className="flex-shrink-0">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'delivery', label: '🛵 A Domicilio' },
                    { id: 'takeaway', label: '🏪 Retiro en Local' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, deliveryType: opt.id });
                        setLocationError('');
                      }}
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

              {formData.deliveryType === 'delivery' ? (
                <>
                  {/* Banner amigable */}
                  <div className="p-2.5 rounded-xl bg-cartoon-yellow-light/80 border-2 border-cartoon-ink shadow-cartoon-xs flex items-center gap-2 flex-shrink-0">
                    <span className="text-xl flex-shrink-0 animate-bounce">📍</span>
                    <p className="font-sub font-bold text-xs text-cartoon-ink leading-tight">
                      Tocá el mapa exactamente donde está tu casa para que el cadete llegue directo.
                    </p>
                  </div>

                  {/* Buscador de calles y botón GPS */}
                  <div className="flex gap-2 flex-shrink-0">
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cartoon-ink/50 pointer-events-none flex items-center">
                        <Icon name="search" size={16} />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscá tu calle en La Rioja..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border-2 border-cartoon-ink font-sub text-xs text-cartoon-ink focus:outline-none shadow-cartoon-xs"
                      />
                      {(searchResults.length > 0 || isSearching) && (
                        <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border-2 border-cartoon-ink rounded-xl shadow-cartoon overflow-hidden max-h-48 overflow-y-auto">
                          {isSearching && searchResults.length === 0 && (
                            <li className="px-3 py-2 font-sub text-xs text-cartoon-ink/60">Buscando calles...</li>
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
                                className="w-full text-left px-3 py-2 font-sub text-xs text-cartoon-ink hover:bg-cartoon-yellow-light flex items-center gap-2 border-b border-cartoon-ink/10 last:border-0 cursor-pointer"
                              >
                                <Icon name="location_on" size={14} className="text-cartoon-red flex-shrink-0" />
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
                      title="Usar mi ubicación GPS actual"
                      aria-label="Usar mi ubicación GPS"
                      disabled={isGeoLoading}
                      className="px-3 rounded-xl bg-cartoon-yellow hover:bg-cartoon-yellow-light border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center text-cartoon-ink active:scale-95 cursor-pointer font-sub font-bold text-xs gap-1 flex-shrink-0"
                    >
                      <Icon name="my_location" size={16} className={isGeoLoading ? 'animate-spin' : ''} />
                      <span className="hidden xs:inline">Mi GPS</span>
                    </button>
                  </div>

                  {geoError && (
                    <p className="text-[11px] font-sub font-bold text-cartoon-red px-1 flex-shrink-0">{geoError}</p>
                  )}

                  {/* Contenedor del Mapa interactivo */}
                  <div
                    className={`relative flex-1 min-h-[290px] sm:min-h-[360px] rounded-2xl border-2 sm:border-3 overflow-hidden shadow-cartoon-xs bg-cartoon-cream-dark ${
                      locationError ? 'border-cartoon-red ring-2 ring-cartoon-red/40' : 'border-cartoon-ink'
                    }`}
                  >
                    <DeliveryMap value={selectedLocation} onPick={handlePickLocation} />

                    {!selectedLocation && (
                      <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none z-20">
                        <div className="bg-cartoon-ink text-white font-sub font-bold text-xs px-3.5 py-1.5 rounded-full shadow-cartoon border border-white/20 flex items-center gap-1.5 animate-bounce">
                          <span>📍</span>
                          <span>Tocá el mapa donde está tu casa</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tarjeta de casa elegida y link de Google Maps */}
                  <div className="bg-white rounded-xl border-2 border-cartoon-ink/40 p-2.5 shadow-cartoon-xs flex flex-col gap-1 text-xs font-sub flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-cartoon-ink/70 font-bold flex items-center gap-1">
                        <Icon name="home" size={14} className="text-cartoon-red" />
                        Casa seleccionada:
                      </span>
                      {selectedLocation?.lat ? (
                        <span className="badge-cartoon bg-cartoon-green text-cartoon-ink text-[10px]">
                          Ubicada ✓
                        </span>
                      ) : (
                        <span className="badge-cartoon bg-cartoon-yellow text-cartoon-ink text-[10px]">
                          Pendiente
                        </span>
                      )}
                    </div>

                    <p className="font-bold text-cartoon-ink truncate">
                      {selectedLocation?.address || 'Ninguna casa seleccionada aún (tocá en el mapa)'}
                    </p>

                    {selectedLocation?.lat && (
                      <div className="pt-1 border-t border-cartoon-ink/10 flex items-center justify-between text-[11px]">
                        <span className="text-cartoon-ink/60 truncate max-w-[200px]">
                          🔗 {buildGoogleMapsUrl(selectedLocation.lat, selectedLocation.lng)}
                        </span>
                        <span className="font-bold text-cartoon-green-dark flex-shrink-0 ml-2">
                          Se enviará en el mensaje
                        </span>
                      </div>
                    )}
                  </div>

                  {locationError && (
                    <p className="text-xs font-sub font-bold text-cartoon-red text-center animate-shake flex-shrink-0">
                      {locationError}
                    </p>
                  )}
                </>
              ) : (
                /* Retiro en Local */
                <div className="space-y-3 pt-2">
                  <div className="p-4 rounded-2xl bg-white border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs text-xs font-sub text-cartoon-ink space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🏪</span>
                      <div>
                        <h4 className="font-display text-sm sm:text-base text-cartoon-ink">
                          Retiro en el Local Trico's
                        </h4>
                        <p className="text-cartoon-ink/70">{RESTAURANT_INFO.address}, La Rioja</p>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-cartoon-cream border border-cartoon-ink/20 flex items-center gap-2">
                      <span>⏰</span>
                      <p className="font-bold text-xs text-cartoon-ink">Horario: {RESTAURANT_INFO.schedule}</p>
                    </div>
                  </div>

                  {/* Mapa centrado en el local */}
                  <div className="relative h-64 rounded-2xl border-2 sm:border-3 border-cartoon-ink overflow-hidden shadow-cartoon-xs bg-cartoon-cream-dark">
                    <DeliveryMap value={null} onPick={() => {}} />
                  </div>
                </div>
              )}
            </div>

            {/* Pie de Etapa 2: Botón para continuar a datos del cliente */}
            <div className="p-3.5 sm:p-4 bg-white border-t-2 sm:border-t-3 border-cartoon-ink space-y-2 flex-shrink-0">
              <div className="flex justify-between items-center text-xs font-sub">
                <span className="text-cartoon-ink/80">Total del pedido:</span>
                <span className="font-display text-lg text-cartoon-red font-black">{money(total)}</span>
              </div>

              <button
                type="button"
                onClick={handleProceedFromLocation}
                className="w-full btn-cartoon-primary text-sm sm:text-base py-3 flex items-center justify-center gap-2 shadow-cartoon cursor-pointer transition-transform active:scale-95"
              >
                <span>CONTINUAR A TUS DATOS (PASO 3)</span>
                <Icon name="arrow_forward" size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ETAPA 3: DATOS DEL CLIENTE Y PAGO (Sin campos innecesarios) */}
        {/* ============================================================== */}
        {step === 'checkout' && (
          <form onSubmit={handleSubmitOrder} className="flex-1 flex flex-col min-h-0 animate-modalIn">
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 min-h-0">
              
              {/* Tarjeta de Resumen de Ubicación Elegida */}
              <div className="p-3 rounded-2xl bg-white border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-between gap-2.5">
                <div className="min-w-0 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cartoon-yellow border border-cartoon-ink flex items-center justify-center flex-shrink-0 text-base">
                    {formData.deliveryType === 'delivery' ? '🛵' : '🏪'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-xs text-cartoon-ink truncate leading-tight">
                      {formData.deliveryType === 'delivery'
                        ? selectedLocation?.address || 'Ubicación marcada en el mapa'
                        : `Retiro: ${RESTAURANT_INFO.address}`}
                    </p>
                    <span className="font-sub font-bold text-[10px] text-cartoon-green-dark block mt-0.5">
                      {formData.deliveryType === 'delivery' ? 'Ubicación confirmada en el mapa ✓' : 'Listo para retirar ✓'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('location')}
                  className="text-xs font-sub font-bold text-cartoon-red hover:underline flex-shrink-0 cursor-pointer"
                >
                  Cambiar
                </button>
              </div>

              {/* Nombre del Cliente */}
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

              {/* Teléfono / WhatsApp para el sorteo */}
              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink/80 mb-1">
                  Teléfono / WhatsApp (para avisarte si ganás el sorteo):
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cartoon-ink/50 flex items-center">
                    <Icon name="call" size={16} />
                  </div>
                  <input
                    type="tel"
                    placeholder="Ej: 3804-123456"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border-2 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-xs"
                  />
                </div>
              </div>

              {/* Piso, Depto o Referencia visual (Solo si es Delivery) */}
              {formData.deliveryType === 'delivery' && (
                <div>
                  <label className="block font-sub font-bold text-xs text-cartoon-ink/80 mb-1">
                    Detalles de la casa, Piso o Referencia (opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Portón negro, timbre blanco, casa con rejas"
                    value={formData.addressNotes}
                    onChange={(e) => setFormData({ ...formData, addressNotes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border-2 border-cartoon-ink font-sub text-xs text-cartoon-ink focus:outline-none shadow-cartoon-xs"
                  />
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

            {/* Pie de Etapa 3: Resumen y Confirmación Final a WhatsApp */}
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
                  <span>Modalidad:</span>
                  <span className="font-bold text-cartoon-ink">
                    {formData.deliveryType === 'delivery'
                      ? (isFreeDeliveryQualified ? '🛵 A Domicilio (¡Envío Gratis!)' : '🛵 A Domicilio')
                      : '🏪 Retiro en Local'}
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
                <span>CONFIRMAR PEDIDO Y ABRIR WHATSAPP</span>
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
};
