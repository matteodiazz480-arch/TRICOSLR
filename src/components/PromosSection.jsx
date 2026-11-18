import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { Reveal } from './Reveal';
import { subscribeToPromotions, DEFAULT_PROMOTIONS_DATA } from '../lib/promotionsStore';

export const PromosSection = () => {
  const [promoData, setPromoData] = useState(DEFAULT_PROMOTIONS_DATA);
  const [copiedCode, setCopiedCode] = useState(null);

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
      className="py-8 sm:py-14 md:py-18 relative bg-[#FFF5D6]"
    >
      <div className="max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-3.5 sm:px-6 lg:px-8 xl:px-12">
        
        {/* Cabecera Simple */}
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
            <h2 className="font-display text-2xl sm:text-4xl text-cartoon-ink tracking-tight mb-1 sm:mb-2">
              SORTEO & BENEFICIOS
            </h2>
            <p className="font-sub text-xs sm:text-sm text-cartoon-ink/75">
              Participá con tu compra y aprovechá nuestros cupones de descuento.
            </p>
          </div>
        </Reveal>

        {/* ============================================================== */}
        {/* TARJETA DEL SORTEO: SIMPLIFICADA, ELEGANTE Y DIRECTA */}
        {/* ============================================================== */}
        {giveaway && giveaway.active && !giveaway.deleted && (
          <Reveal delay={0}>
            <div className="mb-8 rounded-3xl bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-200 border-3 sm:border-4 border-cartoon-ink shadow-cartoon-sm p-4 sm:p-6">
              
              {/* Encabezado del Sorteo */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Icon name="emoji_events" size={24} className="text-cartoon-ink" />
                  <h3 className="font-display text-lg sm:text-2xl text-cartoon-ink">
                    {giveaway.title || 'GRAN SORTEO TRICO\'S'}
                  </h3>
                </div>
                {giveaway.drawDate && (
                  <span className="px-2.5 py-1 rounded-xl bg-white border-2 border-cartoon-ink font-sub font-black text-xs text-cartoon-ink shadow-2xs">
                    Sortea: {giveaway.drawDate}
                  </span>
                )}
              </div>

              <p className="font-sub font-bold text-xs sm:text-sm text-cartoon-ink/80 mb-4">
                {giveaway.subtitle || `¡Con cada pedido en la web participás automáticamente por ${(giveaway.prizes || DEFAULT_PROMOTIONS_DATA.giveaway.prizes).length} premios!`}
              </p>

              {/* Los Premios Dinámicos mapeados desde la administración */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {(giveaway.prizes || DEFAULT_PROMOTIONS_DATA.giveaway.prizes).map((prize, idx) => (
                  <div key={prize.id || idx} className="bg-white rounded-xl border-2 border-cartoon-ink p-3 flex items-center gap-2.5 shadow-2xs">
                    <div className="w-9 h-9 rounded-lg bg-cartoon-yellow/30 border border-cartoon-ink flex items-center justify-center flex-shrink-0 text-cartoon-ink">
                      <Icon name={prize.icon || 'emoji_events'} size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-display text-[10px] text-cartoon-red font-black block">
                        {prize.badge || `${idx + 1}° PREMIO`}
                      </span>
                      <p className="font-sub font-bold text-xs text-cartoon-ink leading-tight truncate">
                        {prize.title}
                      </p>
                      <span className="font-sub text-[10px] text-gray-500 block truncate">
                        {prize.detail}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón rápido a la carta */}
              <div className="mt-4 pt-3 border-t border-cartoon-ink/15 flex items-center justify-between gap-2">
                <span className="font-sub text-xs text-cartoon-ink/70 hidden sm:inline">
                  Tu número de WhatsApp al pedir es tu número de ticket.
                </span>
                <a
                  href="#menu"
                  className="btn-cartoon-primary text-xs py-1.5 px-4 flex items-center gap-1.5 shadow-2xs ml-auto"
                >
                  <Icon name="restaurant_menu" size={15} />
                  <span>Pedir y Participar</span>
                </a>
              </div>

            </div>
          </Reveal>
        )}

        {/* ============================================================== */}
        {/* CUPONES DE DESCUENTO DINÁMICOS */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          
          {coupons.map((coupon, idx) => {
            const isCopied = copiedCode === coupon.code;
            const discountLabel =
              coupon.type === 'fixed'
                ? `$${Number(coupon.discount).toLocaleString('es-AR')} OFF`
                : `${Math.round(Number(coupon.discount) * 100)}% OFF`;

            return (
              <Reveal key={coupon.code} delay={idx * 40} className="h-full">
                <div className="card-cartoon h-full bg-white p-4 sm:p-5 flex flex-col justify-between border-3 border-cartoon-ink relative overflow-hidden">
                  
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="badge-cartoon bg-cartoon-yellow text-cartoon-ink text-[10px]">
                        CUPÓN
                      </span>
                      <span className="font-display text-sm text-cartoon-red font-black">
                        {discountLabel}
                      </span>
                    </div>

                    <h3 className="font-display text-sm sm:text-base text-cartoon-ink leading-snug mb-1">
                      {coupon.label || `Descuento ${discountLabel}`}
                    </h3>

                    {coupon.minPurchase > 0 && (
                      <p className="font-sub text-[11px] text-gray-500 mb-2.5">
                        Compra mínima: ${Number(coupon.minPurchase).toLocaleString('es-AR')}
                      </p>
                    )}
                  </div>

                  {/* Cuadro del Código y Botón Copiar */}
                  <div className="bg-cartoon-cream p-2 rounded-xl border-2 border-dashed border-cartoon-ink flex items-center justify-between gap-2 mt-2">
                    <div>
                      <span className="font-sub text-[9px] font-bold text-cartoon-ink/60 uppercase block">
                        CÓDIGO
                      </span>
                      <span className="font-display text-sm sm:text-base text-cartoon-red tracking-wider block leading-tight">
                        {coupon.code}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(coupon.code)}
                      className="btn-cartoon-white text-xs py-1 px-3 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Icon name="check" size={13} className="text-cartoon-green font-bold" />
                          <span>Listo</span>
                        </>
                      ) : (
                        <>
                          <Icon name="content_copy" size={13} />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              </Reveal>
            );
          })}

          {/* Delivery Gratis Promo */}
          <Reveal delay={80} className="h-full">
            <div className="card-cartoon h-full bg-white p-4 sm:p-5 flex flex-col justify-between border-3 border-cartoon-ink relative overflow-hidden">
              <div>
                <span className="badge-cartoon bg-cartoon-teal text-cartoon-ink text-[10px] mb-1.5 inline-block">
                  DELIVERY
                </span>
                <h3 className="font-display text-sm sm:text-base text-cartoon-ink leading-snug mb-1">
                  Envío GRATIS desde $55.000
                </h3>
                <p className="font-sub text-[11px] text-gray-500 mb-2.5">
                  El costo de envío corre por nuestra cuenta.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200 mt-2">
                <span className="font-display text-xs text-cartoon-green-dark">ENVÍO $0</span>
                <a
                  href="#menu"
                  className="btn-cartoon-white text-xs py-1 px-3"
                >
                  Ver Menú
                </a>
              </div>
            </div>
          </Reveal>

        </div>

      </div>
    </section>
  );
};
