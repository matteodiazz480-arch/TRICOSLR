import React, { useState } from 'react';
import { Icon } from './Icon';

const money = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

export const OrderSuccessModal = ({ isOpen, onClose, orderDetails }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !orderDetails) return null;

  const handleCopy = () => {
    try {
      if (orderDetails.whatsappMessage) {
        navigator.clipboard.writeText(orderDetails.whatsappMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4 flex items-center justify-center select-none">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-cartoon-ink/75 backdrop-blur-xs transition-opacity"
      />

      <div className="relative bg-cartoon-cream w-full max-w-lg rounded-3xl border-3 sm:border-4 border-cartoon-ink shadow-cartoon-xl overflow-hidden z-10 p-4 sm:p-6 text-center animate-pop-in my-auto max-h-[92vh] flex flex-col">
        
        {/* Cabecera con personaje */}
        <div className="flex-shrink-0 flex items-center justify-between pb-3 border-b-2 border-cartoon-ink/15">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-12 h-12 rounded-2xl bg-cartoon-yellow border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                src="/assets/sticker_personaje.png"
                alt="Trico"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = '<span class="text-2xl">🍔</span>';
                }}
              />
            </div>
            <div>
              <span className="badge-cartoon bg-cartoon-green text-cartoon-ink text-[10px] inline-block mb-0.5">
                PEDIDO LISTO
              </span>
              <h3 className="font-display text-base sm:text-lg text-cartoon-ink leading-tight">
                ¡Gracias{orderDetails.customerName ? `, ${orderDetails.customerName}` : ''}!
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border-2 border-cartoon-ink flex items-center justify-center text-cartoon-ink hover:bg-cartoon-cream-dark cursor-pointer"
            aria-label="Cerrar modal"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Instrucción visual destacada */}
        <div className="my-2 p-2.5 bg-[#E8F8F0] rounded-xl border border-cartoon-green/50 text-left flex items-center gap-2">
          <span className="text-xl">💬</span>
          <p className="font-sub font-bold text-xs text-cartoon-green-dark leading-tight">
            Tocá el botón verde para enviar tu pedido directo al WhatsApp oficial de Trico's:
          </p>
        </div>

        {/* LISTADO ORGANIZADO DEL PEDIDO (Scrollable si hay muchos productos) */}
        <div className="flex-1 overflow-y-auto bg-white p-3 sm:p-4 rounded-2xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs text-left space-y-2.5 my-1 text-xs font-sub">
          
          {/* Datos generales */}
          <div className="space-y-1 pb-2 border-b border-cartoon-ink/15">
            <div className="flex justify-between items-center">
              <span className="text-cartoon-ink/60">Modalidad:</span>
              <span className="font-bold text-cartoon-ink">
                {orderDetails.deliveryType === 'delivery'
                  ? (orderDetails.isFreeDelivery ? '🛵 A Domicilio (¡Envío Gratis!)' : '🛵 A Domicilio')
                  : '🏪 Retiro en Local'}
              </span>
            </div>
            {orderDetails.deliveryType === 'delivery' && orderDetails.address && (
              <div className="flex justify-between items-center">
                <span className="text-cartoon-ink/60">Dirección:</span>
                <span className="font-bold text-cartoon-ink truncate max-w-[200px]">
                  {orderDetails.address}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-cartoon-ink/60">Forma de Pago:</span>
              <span className="font-bold text-cartoon-ink">
                {orderDetails.paymentMethod}
                {orderDetails.changeAmount ? ` (Paga con: $${orderDetails.changeAmount})` : ''}
              </span>
            </div>
          </div>

          {/* Listado de Productos con Nombres, Cantidades, Precios individuales y Subtotales */}
          <div>
            <span className="font-display text-[11px] text-cartoon-ink uppercase tracking-wider block mb-1.5">
              Productos del Pedido:
            </span>
            <div className="space-y-1.5">
              {(orderDetails.items || []).map((it, idx) => {
                const itemSubtotal = (it.price || 0) * (it.quantity || 1);
                return (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-cartoon-cream/50 border border-cartoon-ink/15 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-xs text-cartoon-ink leading-tight truncate">
                        {it.quantity}x {it.name}
                      </p>
                      <span className="font-sub text-[10px] text-cartoon-ink/60">
                        {money(it.price)} c/u
                      </span>
                    </div>
                    <span className="font-display text-xs text-cartoon-ink font-bold whitespace-nowrap">
                      {money(itemSubtotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desglose y Total General */}
          <div className="pt-2 border-t-2 border-dashed border-cartoon-ink/20 space-y-1">
            <div className="flex justify-between text-cartoon-ink/70 text-xs">
              <span>Subtotal:</span>
              <span className="font-bold">{money(orderDetails.subtotal || orderDetails.total)}</span>
            </div>
            {orderDetails.discountAmount > 0 && (
              <div className="flex justify-between text-cartoon-green font-bold text-xs">
                <span>Descuento aplicado:</span>
                <span>-{money(orderDetails.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-cartoon-ink/15 font-display text-sm sm:text-base text-cartoon-ink">
              <span>TOTAL GENERAL:</span>
              <span className="text-cartoon-red text-base sm:text-lg font-black">
                {money(orderDetails.total)}
              </span>
            </div>
          </div>
        </div>

        {/* ACCIONES DIRECTAS A PRUEBA DE FALLOS */}
        <div className="space-y-2 pt-2 flex-shrink-0">
          
          {/* BOTÓN 1: Gigante Verde para Abrir WhatsApp Directamente */}
          {orderDetails.whatsappUrl && (
            <a
              href={orderDetails.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-2xl bg-cartoon-green hover:bg-[#25D366] text-cartoon-ink font-display text-sm sm:text-base border-3 border-cartoon-ink shadow-cartoon hover:shadow-cartoon-lg active:scale-95 flex items-center justify-center gap-2 transition-all cursor-pointer no-underline"
            >
              <Icon name="chat" size={22} />
              <span>ENVIAR PEDIDO A WHATSAPP</span>
            </a>
          )}

          {/* BOTÓN 2: Copiar Mensaje del Pedido como respaldo */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-cartoon-cream-dark text-cartoon-ink font-sub font-bold text-xs border-2 border-cartoon-ink shadow-cartoon-xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Icon name={copied ? 'check' : 'content_copy'} size={16} className={copied ? 'text-cartoon-green' : ''} />
              <span>{copied ? '¡Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-3 rounded-xl bg-cartoon-yellow hover:bg-cartoon-yellow-dark text-cartoon-ink font-display text-xs border-2 border-cartoon-ink shadow-cartoon-xs active:scale-95 flex items-center justify-center gap-1 cursor-pointer transition-all"
            >
              <span>Volver a la Carta</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
