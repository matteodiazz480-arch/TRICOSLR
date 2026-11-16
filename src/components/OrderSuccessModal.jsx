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

      <div className="relative bg-cartoon-cream w-full max-w-md rounded-3xl border-3 sm:border-4 border-cartoon-ink shadow-cartoon-xl overflow-hidden z-10 p-4 sm:p-6 text-center animate-pop-in my-auto max-h-[92vh] flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between pb-3 border-b-2 border-cartoon-ink/15">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-11 h-11 rounded-2xl bg-cartoon-yellow border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                src="/assets/sticker_personaje.png"
                alt="Trico"
                className="w-full h-full object-contain"
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

        {/* Resumen limpio del pedido */}
        <div className="flex-1 overflow-y-auto bg-white p-3.5 rounded-2xl border-2 border-cartoon-ink shadow-cartoon-xs text-left space-y-2.5 my-3 text-xs font-sub">
          <div className="space-y-1 pb-2 border-b border-cartoon-ink/15">
            <div className="flex justify-between items-center">
              <span className="text-cartoon-ink/60">Modalidad:</span>
              <span className="font-bold text-cartoon-ink">
                {orderDetails.deliveryType === 'delivery' ? 'A Domicilio' : 'Retiro en Local'}
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
          </div>

          <div className="space-y-1.5">
            {(orderDetails.items || []).map((it, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 text-cartoon-ink"
              >
                <span className="font-bold truncate">
                  {it.quantity}x {it.name}
                </span>
                <span className="font-display whitespace-nowrap">
                  {money((it.price || 0) * (it.quantity || 1))}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t-2 border-dashed border-cartoon-ink/20 flex justify-between items-center font-display text-sm sm:text-base text-cartoon-ink">
            <span>TOTAL:</span>
            <span className="text-cartoon-red text-base sm:text-lg font-black">
              {money(orderDetails.total)}
            </span>
          </div>
        </div>

        <div className="space-y-2 flex-shrink-0">
          {orderDetails.whatsappUrl && (
            <a
              href={orderDetails.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-2xl bg-cartoon-green hover:bg-[#25D366] text-cartoon-ink font-display text-sm sm:text-base border-3 border-cartoon-ink shadow-cartoon active:scale-95 flex items-center justify-center gap-2 transition-all cursor-pointer no-underline"
            >
              <Icon name="chat" size={20} />
              <span>ENVIAR PEDIDO A WHATSAPP</span>
            </a>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="py-2 px-3 rounded-xl bg-white hover:bg-cartoon-cream-dark text-cartoon-ink font-sub font-bold text-xs border-2 border-cartoon-ink shadow-cartoon-xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Icon name={copied ? 'check' : 'content_copy'} size={15} />
              <span>{copied ? 'Copiado' : 'Copiar Texto'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 rounded-xl bg-cartoon-yellow hover:bg-cartoon-yellow-dark text-cartoon-ink font-display text-xs border-2 border-cartoon-ink shadow-cartoon-xs active:scale-95 flex items-center justify-center cursor-pointer"
            >
              <span>Cerrar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
