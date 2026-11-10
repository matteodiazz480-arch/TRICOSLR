import React, { useState } from 'react';
import { Icon } from './Icon';
import { Reveal } from './Reveal';

export const PromosSection = () => {
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <section
      id="promos"
      className="py-8 sm:py-14 md:py-18 relative"
      style={{ backgroundColor: '#FFF5D6' }}
    >
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        
        {/* Header Compacto */}
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-10">
            <h2 className="font-display text-2xl sm:text-5xl text-cartoon-ink tracking-tight mb-1.5 sm:mb-2">
              COMBOS & CUPONES EXCLUSIVOS
            </h2>
            <p className="font-sub text-xs sm:text-lg text-cartoon-ink/75">
              Aprovechá nuestros descuentos para comer rico y pagar menos.
            </p>
          </div>
        </Reveal>

        {/* Tarjetas Lado a Lado en Móvil y PC (grid-cols-2) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-8">
          
          {/* Card 1: Cupón de Descuento */}
          <Reveal delay={0} className="h-full">
            <div className="card-cartoon h-full bg-white p-3.5 sm:p-8 flex flex-col justify-between relative overflow-hidden border-3 sm:border-4 border-cartoon-ink">
              <div>
                <span className="badge-cartoon bg-cartoon-yellow text-cartoon-ink mb-2 sm:mb-3 inline-block">
                  BIENVENIDA
                </span>
                <h3 className="font-display text-base sm:text-3xl text-cartoon-ink leading-tight mb-1.5 sm:mb-2">
                  10% OFF en tu primer pedido
                </h3>
                <p className="font-sub text-[11px] sm:text-base text-cartoon-ink/80 leading-snug sm:leading-relaxed mb-3 sm:mb-6">
                  Ingresá el cupón en el carrito antes de finalizar tu pedido.
                </p>
              </div>

              {/* Cupón Box Interactivo */}
              <div className="bg-cartoon-cream p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 sm:border-3 border-dashed border-cartoon-ink flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                <div>
                  <span className="font-sub text-[9px] sm:text-[10px] font-bold text-cartoon-ink/60 uppercase block">
                    Cupón
                  </span>
                  <span className="font-display text-base sm:text-2xl text-cartoon-red tracking-wider block leading-tight">
                    TRICO10
                  </span>
                </div>

                <button
                  onClick={() => handleCopy('TRICO10')}
                  className="btn-cartoon-white text-[11px] sm:text-xs py-1.5 px-2.5 sm:py-2 sm:px-3.5 flex items-center justify-center gap-1 w-full sm:w-auto"
                >
                  {copiedCode ? (
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

          {/* Card 2: Envíos Gratis Promo */}
          <Reveal delay={90} className="h-full">
            <div className="card-cartoon h-full bg-white p-3.5 sm:p-8 flex flex-col justify-between relative overflow-hidden border-3 sm:border-4 border-cartoon-ink">
              <div>
                <span className="badge-cartoon bg-cartoon-teal text-cartoon-ink mb-2 sm:mb-3 inline-block">
                  DELIVERY GRATIS
                </span>
                <h3 className="font-display text-base sm:text-3xl text-cartoon-ink leading-tight mb-1.5 sm:mb-2">
                  Envío GRATIS desde $55.000
                </h3>
                <p className="font-sub text-[11px] sm:text-base text-cartoon-ink/80 leading-snug sm:leading-relaxed mb-3 sm:mb-6">
                  Pedite un combo con amigos y el envío corre por nuestra cuenta.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pt-2 border-t-2 border-dashed border-cartoon-ink/15">
                <div className="flex items-center justify-center sm:justify-start gap-1 text-base sm:text-2xl">
                  <span>🍔</span>
                  <span>+</span>
                  <span>🍗</span>
                  <span>=</span>
                  <span className="font-display text-xs sm:text-lg text-cartoon-green-dark">ENVÍO $0</span>
                </div>

                <a
                  href="#menu"
                  className="btn-cartoon-primary text-xs sm:text-sm py-1.5 px-3 sm:py-2.5 sm:px-4 whitespace-nowrap w-full sm:w-auto text-center"
                >
                  Armar Combo
                </a>
              </div>
            </div>
          </Reveal>

        </div>

      </div>
    </section>
  );
};
