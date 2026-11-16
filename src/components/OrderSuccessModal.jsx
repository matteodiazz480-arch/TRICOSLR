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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center select-none">
      <div className="relative bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-5 space-y-4 my-auto animate-modalIn">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Icon name="check_circle" size={20} />
            </div>
            <div>
              <h3 className="font-display text-base text-slate-900">Pedido registrado</h3>
              <p className="font-sub text-xs text-slate-500">
                {orderDetails.customerName || 'Cliente'} • {orderDetails.deliveryType === 'delivery' ? 'Envío a domicilio' : 'Retiro en local'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
            aria-label="Cerrar"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs font-sub">
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {(orderDetails.items || []).map((it, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-700">
                <span className="truncate pr-2">
                  <strong className="text-slate-900">{it.quantity}x</strong> {it.name}
                </span>
                <span className="font-semibold text-slate-900">
                  {money((it.price || 0) * (it.quantity || 1))}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-display text-sm text-slate-900">
            <span>Total</span>
            <span>{money(orderDetails.total)}</span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {orderDetails.whatsappUrl && (
            <a
              href={orderDetails.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full btn-cartoon-green py-3 text-sm no-underline"
            >
              <Icon name="chat" size={18} />
              <span>Enviar por WhatsApp</span>
            </a>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="btn-cartoon-white py-2 text-xs"
            >
              <Icon name={copied ? 'check' : 'content_copy'} size={15} />
              <span>{copied ? 'Copiado' : 'Copiar resumen'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn-cartoon-white py-2 text-xs"
            >
              <span>Cerrar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
