import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { Reveal } from './Reveal';
import { subscribeToPromotions, DEFAULT_PROMOTIONS_DATA } from '../lib/promotionsStore';

export const PromosSection = () => {
  const [promoData, setPromoData] = useState(DEFAULT_PROMOTIONS_DATA);
  const [copiedCode, setCopiedCode] = useState(null);
  const [showHowToModal, setShowHowToModal] = useState(false);

  useEffect(() => {
    const unsub = subscribeToPromotions((data) => {
      if (data) setPromoData(data);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const handleCopy = (code) => {
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2200);
    } catch {}
  };

  const giveaway = promoData?.giveaway || DEFAULT_PROMOTIONS_DATA.giveaway;
  const coupons = (promoData?.coupons || []).filter((c) => c.active !== false);

  return (
    <section
      id="promos"
      className="py-10 sm:py-16 md:py-20 relative bg-[#FFF5D6]"
    >
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        
        {/* Cabecera de la Sección */}
        <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
            <span className="badge-cartoon bg-cartoon-yellow text-cartoon-ink font-black text-xs sm:text-sm px-3.5 py-1 mb-2.5 inline-flex items-center gap-1.5 shadow-cartoon-xs">
              <span>🎁</span>
              <span>SORTEOS & BENEFICIOS EXCLUSIVOS</span>
            </span>
            <h2 className="font-display text-2xl sm:text-5xl text-cartoon-ink tracking-tight mb-2 sm:mb-3">
              PREMIOS, COMBOS & CUPONES
            </h2>
            <p className="font-sub text-xs sm:text-base text-cartoon-ink/80 max-w-xl mx-auto">
              Participá en nuestro gran sorteo oficial y disfrutá cupones de descuento directos para tu pedido.
            </p>
          </div>
        </Reveal>

        {/* ============================================================== */}
        {/* TARJETA DESTACADA: GRAN SORTEO TRICO'S (NO ESTORBA, MUY ATRACTIVO) */}
        {/* ============================================================== */}
        {giveaway.active && (
          <Reveal delay={0}>
            <div className="relative mb-8 sm:mb-12 rounded-3xl sm:rounded-4xl bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-200 border-3 sm:border-4 border-cartoon-ink shadow-cartoon-md p-4 sm:p-8 overflow-hidden">
              
              {/* Decoraciones de fondo sutiles */}
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/30 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

              {/* Barra Superior del Sorteo */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 sm:mb-6 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-cartoon-red text-white font-display text-xs sm:text-sm shadow-cartoon-xs tracking-wider animate-pulse flex items-center gap-1">
                    <span>🔥</span>
                    <span>SORTEO OFICIAL</span>
                  </span>
                  {giveaway.drawDate && (
                    <span className="px-3 py-1 rounded-xl bg-white/90 border border-cartoon-ink/30 text-cartoon-ink font-sub font-bold text-xs sm:text-sm">
                      Sortea: {giveaway.drawDate}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowHowToModal(true)}
                  className="btn-cartoon-white text-xs sm:text-sm py-1.5 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-cartoon-xs"
                >
                  <Icon name="help_outline" size={16} />
                  <span>¿Cómo participar?</span>
                </button>
              </div>

              {/* Título Principal */}
              <div className="mb-6 relative z-10 text-center sm:text-left">
                <h3 className="font-display text-2xl sm:text-4xl lg:text-5xl text-cartoon-ink leading-tight mb-1 sm:mb-2">
                  {giveaway.title || 'GRAN SORTEO TRICO\'S'}
                </h3>
                <p className="font-sub font-bold text-xs sm:text-base text-cartoon-ink/80 max-w-2xl">
                  {giveaway.subtitle || '¡Participá gratis con tu pedido o etiquetándonos en Instagram!'}
                </p>
              </div>

              {/* Los 4 Premios del Sorteo (Grid 2 columnas en mobile y 4 en PC) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
                {(giveaway.prizes || []).map((prize, idx) => (
                  <div
                    key={prize.id || idx}
                    className="bg-white/95 backdrop-blur-xs rounded-2xl border-2 sm:border-3 border-cartoon-ink p-3.5 sm:p-4.5 flex flex-col justify-between shadow-cartoon-xs hover:-translate-y-1 transition-transform duration-200"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-2xl sm:text-3xl">{prize.emoji || '🎁'}</span>
                        <span className="font-display text-[10px] sm:text-xs px-2 py-0.5 rounded-lg bg-cartoon-yellow text-cartoon-ink border border-cartoon-ink/40 font-black">
                          {prize.badge || `${idx + 1}° PREMIO`}
                        </span>
                      </div>
                      <h4 className="font-display text-sm sm:text-base text-cartoon-ink font-bold leading-snug mb-1.5">
                        {prize.title}
                      </h4>
                      <p className="font-sub text-[11px] sm:text-xs text-gray-700 leading-relaxed">
                        {prize.detail}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-dashed border-gray-200 flex items-center justify-between text-[10px] text-gray-500 font-sub font-bold">
                      <span>Premio #{idx + 1}</span>
                      <span className="text-emerald-700 font-black">100% GRATIS</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Banner inferior de participación rápida */}
              <div className="mt-5 sm:mt-6 pt-4 border-t-2 border-dashed border-cartoon-ink/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  <span className="font-sub font-bold text-xs sm:text-sm text-cartoon-ink">
                    ¡Todos los pedidos hechos desde esta web participan automáticamente!
                  </span>
                </div>
                <a
                  href="#menu"
                  className="btn-cartoon-red text-xs sm:text-sm py-2 px-5 flex items-center justify-center gap-2 w-full sm:w-auto shadow-cartoon-xs whitespace-nowrap"
                >
                  <Icon name="restaurant_menu" size={16} />
                  <span>Pedir y Participar</span>
                </a>
              </div>

            </div>
          </Reveal>
        )}

        {/* ============================================================== */}
        {/* CUPONES DE DESCUENTO DINÁMICOS & PROMOS ACTIVAS */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
          
          {/* Cupones administrables dinámicos */}
          {coupons.map((coupon, idx) => {
            const isCopied = copiedCode === coupon.code;
            const discountLabel =
              coupon.type === 'fixed'
                ? `$${Number(coupon.discount).toLocaleString('es-AR')} OFF`
                : `${Math.round(Number(coupon.discount) * 100)}% OFF`;

            return (
              <Reveal key={coupon.code} delay={idx * 50} className="h-full">
                <div className="card-cartoon h-full bg-white p-4 sm:p-6 flex flex-col justify-between border-3 sm:border-4 border-cartoon-ink relative overflow-hidden">
                  
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="badge-cartoon bg-cartoon-yellow text-cartoon-ink text-[10px] sm:text-xs">
                        {coupon.label || 'CUPÓN EXCLUSIVO'}
                      </span>
                      <span className="font-display text-sm text-cartoon-red font-black">
                        {discountLabel}
                      </span>
                    </div>

                    <h3 className="font-display text-base sm:text-xl text-cartoon-ink leading-snug mb-1.5">
                      {coupon.label || `Descuento ${discountLabel}`}
                    </h3>

                    <p className="font-sub text-[11px] sm:text-xs text-cartoon-ink/75 mb-3 leading-relaxed">
                      {coupon.minPurchase > 0
                        ? `Válido para compras superiores a $${Number(coupon.minPurchase).toLocaleString('es-AR')}.`
                        : 'Válido para usar en cualquier pedido en el carrito.'}
                    </p>
                  </div>

                  {/* Cuadro del Código y Botón Copiar */}
                  <div className="bg-cartoon-cream p-2.5 sm:p-3 rounded-xl border-2 border-dashed border-cartoon-ink flex items-center justify-between gap-2">
                    <div>
                      <span className="font-sub text-[9px] font-bold text-cartoon-ink/60 uppercase block">
                        CÓDIGO
                      </span>
                      <span className="font-display text-base sm:text-xl text-cartoon-red tracking-wider block leading-tight">
                        {coupon.code}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(coupon.code)}
                      className="btn-cartoon-white text-xs py-1.5 px-3 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Icon name="check" size={14} className="text-cartoon-green font-bold" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Icon name="content_copy" size={14} />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              </Reveal>
            );
          })}

          {/* Tarjeta Extra: Delivery Gratis */}
          <Reveal delay={120} className="h-full">
            <div className="card-cartoon h-full bg-white p-4 sm:p-6 flex flex-col justify-between border-3 sm:border-4 border-cartoon-ink relative overflow-hidden">
              <div>
                <span className="badge-cartoon bg-cartoon-teal text-cartoon-ink text-[10px] sm:text-xs mb-2 inline-block">
                  DELIVERY BONIFICADO
                </span>
                <h3 className="font-display text-base sm:text-xl text-cartoon-ink leading-snug mb-1.5">
                  Envío GRATIS desde $55.000
                </h3>
                <p className="font-sub text-[11px] sm:text-xs text-cartoon-ink/75 mb-3 leading-relaxed">
                  Sumá tus hamburguesas favoritas con amigos y nosotros nos encargamos del costo del delivery.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t-2 border-dashed border-cartoon-ink/15">
                <div className="flex items-center gap-1 text-base sm:text-xl">
                  <span>🍔</span>
                  <span>+</span>
                  <span>🍗</span>
                  <span className="font-display text-xs sm:text-sm text-cartoon-green-dark ml-1">ENVÍO $0</span>
                </div>
                <a
                  href="#menu"
                  className="btn-cartoon-primary text-xs py-2 px-3.5 whitespace-nowrap"
                >
                  Ver Carta
                </a>
              </div>
            </div>
          </Reveal>

        </div>

      </div>

      {/* Modal Amigable "¿Cómo participar en el Sorteo?" (No estorba, solo al pedirlo) */}
      {showHowToModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-modalIn">
          <div className="w-full max-w-lg bg-white rounded-3xl border-3 sm:border-4 border-cartoon-ink shadow-cartoon-lg p-5 sm:p-7 relative space-y-4">
            
            <button
              onClick={() => setShowHowToModal(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 border-2 border-cartoon-ink flex items-center justify-center text-cartoon-ink cursor-pointer"
              aria-label="Cerrar ventana"
            >
              <Icon name="close" size={18} />
            </button>

            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <h3 className="font-display text-lg sm:text-xl text-cartoon-ink leading-tight">
                  ¿Cómo participar en el Sorteo?
                </h3>
                <span className="font-sub text-xs text-gray-500 font-bold">
                  Súper fácil, tenés dos formas automáticas:
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-cartoon-cream border-2 border-cartoon-ink flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">1️⃣</span>
                <div>
                  <h4 className="font-display text-sm text-cartoon-ink font-bold">Haciendo tu pedido en la web</h4>
                  <p className="font-sub text-xs text-gray-700 mt-0.5">
                    Cada vez que confirmás un pedido en esta web con tu número de teléfono de WhatsApp, tu compra suma un ticket para el sorteo de fin de mes.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">2️⃣</span>
                <div>
                  <h4 className="font-display text-sm text-cartoon-ink font-bold">En Instagram (@tricos)</h4>
                  <p className="font-sub text-xs text-gray-700 mt-0.5">
                    Subí una historia disfrutando tu pedido o etiquetá a 2 amigos en nuestro post oficial del sorteo en Instagram.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowHowToModal(false)}
                className="btn-cartoon-primary w-full py-2.5 text-sm cursor-pointer"
              >
                ¡Entendido, quiero participar!
              </button>
            </div>

          </div>
        </div>
      )}

    </section>
  );
};
