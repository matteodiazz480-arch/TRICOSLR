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
    <section id="promos" className="py-10 sm:py-16 bg-white border-t border-slate-200 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="font-sub font-semibold text-xs text-amber-600 uppercase tracking-widest block mb-1">
              Promociones Vigentes
            </span>
            <h2 className="font-display text-2xl sm:text-4xl text-slate-900 tracking-tight mb-2">
              Sorteo y Beneficios
            </h2>
            <p className="font-sub text-xs sm:text-sm text-slate-500">
              Participá automáticamente con cada compra y aprovechá los cupones activos.
            </p>
          </div>
        </Reveal>

        {giveaway.active && (
          <Reveal delay={0}>
            <div className="mb-8 rounded-2xl bg-slate-900 text-white p-5 sm:p-7 border border-slate-800 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Icon name="emoji_events" size={18} />
                  </div>
                  <h3 className="font-display text-lg sm:text-2xl text-white">
                    {giveaway.title || "GRAN SORTEO TRICO'S"}
                  </h3>
                </div>
                {giveaway.drawDate && (
                  <span className="px-3 py-1 rounded-lg bg-white/10 font-sub font-semibold text-xs text-amber-400">
                    Fecha de sorteo: {giveaway.drawDate}
                  </span>
                )}
              </div>

              <p className="font-sub text-xs sm:text-sm text-slate-300 mb-5">
                Con cada pedido realizado en la web participás automáticamente por los 4 premios oficiales.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { badge: '1° PREMIO', title: 'Diseño Web Profesional', desc: 'Creación completa y dominio' },
                  { badge: '2° PREMIO', title: 'Combo Carioca + Envío', desc: 'Banquete completo bonificado' },
                  { badge: '3° PREMIO', title: 'Gestión de Redes Sociales', desc: 'Planificación mensual y diseño' },
                  { badge: '4° PREMIO', title: 'Combo Pollo para Compartir', desc: 'Piezas crocantes con salsas' },
                ].map((prize, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/80 rounded-xl border border-slate-700 p-3.5 flex flex-col justify-between"
                  >
                    <span className="font-sub font-bold text-[10px] text-amber-400 uppercase tracking-wider block mb-1">
                      {prize.badge}
                    </span>
                    <p className="font-display text-xs sm:text-sm text-white leading-snug">
                      {prize.title}
                    </p>
                    <span className="font-sub text-[11px] text-slate-400 block mt-1">
                      {prize.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((coupon, idx) => {
            const isCopied = copiedCode === coupon.code;
            const discountLabel =
              coupon.type === 'fixed'
                ? `$${Number(coupon.discount).toLocaleString('es-AR')} OFF`
                : `${Math.round(Number(coupon.discount) * 100)}% OFF`;

            return (
              <Reveal key={coupon.code} delay={idx * 40} className="h-full">
                <div className="card-cartoon h-full bg-slate-50 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="badge-cartoon bg-white text-slate-700">
                        Cupón
                      </span>
                      <span className="font-display text-sm text-rose-600">
                        {discountLabel}
                      </span>
                    </div>

                    <h3 className="font-display text-base text-slate-900 leading-snug mb-1">
                      {coupon.label || `Descuento ${discountLabel}`}
                    </h3>

                    {coupon.minPurchase > 0 && (
                      <p className="font-sub text-xs text-slate-500 mb-3">
                        Compra mínima: ${Number(coupon.minPurchase).toLocaleString('es-AR')}
                      </p>
                    )}
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 mt-3">
                    <div>
                      <span className="font-sub text-[10px] text-slate-400 uppercase block">
                        Código
                      </span>
                      <span className="font-display text-sm text-slate-900 tracking-wider block">
                        {coupon.code}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(coupon.code)}
                      className="btn-cartoon-white text-xs py-1.5 px-3"
                    >
                      <Icon name={isCopied ? 'check' : 'content_copy'} size={14} />
                      <span>{isCopied ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              </Reveal>
            );
          })}

          <Reveal delay={80} className="h-full">
            <div className="card-cartoon h-full bg-slate-50 p-5 flex flex-col justify-between">
              <div>
                <span className="badge-cartoon bg-emerald-50 text-emerald-700 border-emerald-200 mb-2">
                  Beneficio de Envío
                </span>
                <h3 className="font-display text-base text-slate-900 leading-snug mb-1">
                  Envío bonificado desde $55.000
                </h3>
                <p className="font-sub text-xs text-slate-500">
                  Bonificación automática al superar el monto en tu carrito.
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-3">
                <span className="font-display text-xs text-emerald-700">SIN CARGO DE ENVÍO</span>
                <a href="#menu" className="btn-cartoon-white text-xs py-1.5 px-3">
                  Ver Carta
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
