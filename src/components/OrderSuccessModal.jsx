import React from 'react';
import { Icon } from './Icon';

export const OrderSuccessModal = ({ isOpen, onClose, orderDetails }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-cartoon-ink/70 backdrop-blur-sm transition-opacity"
      />

      <div className="relative bg-cartoon-cream w-full max-w-md rounded-3xl border-4 border-cartoon-ink shadow-cartoon-xl overflow-hidden z-10 p-6 sm:p-8 text-center animate-pop-in">
        
        {/* Personaje festejando aislado sin fondos decorativos */}
        <div className="w-32 h-32 mx-auto mb-4 relative flex items-center justify-center">
          <img
            src="/assets/sticker_personaje.png"
            alt="Mascota Trico"
            className="w-full h-full object-contain animate-bob"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentNode.innerHTML = '<span class="text-7xl">🎉</span>';
            }}
          />
        </div>

        <span className="badge-cartoon bg-cartoon-green text-cartoon-ink mb-3 inline-block">
          PEDIDO ENVIADO
        </span>

        <h3 className="font-display text-2xl sm:text-3xl text-cartoon-ink mb-2">
          ¡Gracias por tu pedido{orderDetails?.customerName ? `, ${orderDetails.customerName}` : ''}!
        </h3>

        <p className="font-sub text-sm sm:text-base text-cartoon-ink/80 mb-6 leading-relaxed">
          Tu pedido ya fue enviado por WhatsApp. Te responderemos a la brevedad para confirmar el tiempo de entrega.
        </p>

        <div className="bg-white p-4 rounded-2xl border-3 border-cartoon-ink shadow-cartoon-sm mb-6 text-left space-y-1.5 text-xs sm:text-sm font-sub">
          <div className="flex justify-between">
            <span className="text-cartoon-ink/60">Modalidad:</span>
            <span className="font-bold text-cartoon-ink">
              {orderDetails?.deliveryType === 'delivery'
                ? 'Envío a Domicilio'
                : 'Retiro en Local'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-cartoon-ink/60">Total:</span>
            <span className="font-display text-base text-cartoon-red">
              ${orderDetails?.total?.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full btn-cartoon-primary py-3 text-base sm:text-lg cursor-pointer"
        >
          Entendido
        </button>

      </div>
    </div>
  );
};
