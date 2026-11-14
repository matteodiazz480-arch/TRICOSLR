import React, { useState, useMemo, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Icon } from '../Icon';

const money = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

const formatOrderDate = (isoStr) => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
};

export const LotteryOrdersSection = ({
  orders = [],
  giveaway = {},
  onDeleteOrder,
  onToggleWinner,
  onAddManualOrder,
}) => {
  // Filtros y búsqueda
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'delivery' | 'takeaway' | 'winners'

  // Notificación temporal toast
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  };

  // Modales
  const [isLotteryModalOpen, setIsLotteryModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null); // Ficha del Cliente
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Configuración del Sorteo proveniente automáticamente de Promos
  const prizeToRaffle = giveaway?.prizeName || 'Combo Carioca + Delivery Gratis';
  const winnersCountConfig = Math.max(1, Number(giveaway?.winnersCount) || 1);

  // Estados de la Ruleta / Sorteador
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayCandidate, setDisplayCandidate] = useState(null);
  const [chosenWinners, setChosenWinners] = useState([]); // Array de ganadores seleccionados
  const spinIntervalRef = useRef(null);

  // Formulario de Participante Manual
  const [manualForm, setManualForm] = useState({
    name: '',
    phone: '',
    concept: 'Participación Sorteo (Instagram / Local)',
    total: '',
  });

  // Filtrado reactivo de pedidos participantes
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filterType === 'delivery' && o.deliveryType !== 'delivery') return false;
      if (filterType === 'takeaway' && o.deliveryType !== 'takeaway') return false;
      if (filterType === 'winners' && !o.isWinner) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const name = (o.customerName || '').toLowerCase();
      const phone = (o.phone || '').toLowerCase();
      const ticket = String(o.ticketNumber || '').toLowerCase();
      const address = (o.address || '').toLowerCase();
      const itemsStr = (o.items || []).map((i) => i.name).join(' ').toLowerCase();

      return (
        name.includes(q) ||
        phone.includes(q) ||
        ticket.includes(q) ||
        address.includes(q) ||
        itemsStr.includes(q)
      );
    });
  }, [orders, search, filterType]);

  // Totales
  const totalAmount = useMemo(
    () => orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [orders]
  );
  const totalWinners = useMemo(() => orders.filter((o) => o.isWinner).length, [orders]);

  // Copiar lista prolija al portapapeles
  const handleCopyList = () => {
    if (orders.length === 0) {
      showToast('No hay participantes registrados todavía.');
      return;
    }
    const lines = [];
    lines.push(`🎁 *LISTA OFICIAL DE PARTICIPANTES - SORTEO TRICO'S* 🎁`);
    lines.push(`🏆 Premio: ${prizeToRaffle}`);
    lines.push(`👥 Ganadores a elegir: ${winnersCountConfig}`);
    lines.push(`📅 Sortea: ${giveaway?.drawDate || 'Fin de mes'}`);
    lines.push(`👥 Total participantes: ${orders.length}`);
    lines.push(`────────────────────────────────────────`);
    orders.forEach((o, i) => {
      const ticket = o.ticketNumber ? `#TRICO-${o.ticketNumber}` : `#${i + 1}`;
      const winnerBadge = o.isWinner ? ` 🏆 [GANADOR: ${o.winnerPrize || 'Premio'}]` : '';
      const cel = o.phone ? ` - Cel: ${o.phone}` : '';
      lines.push(`${i + 1}. Ticket ${ticket}: ${o.customerName}${cel} (${o.deliveryType === 'delivery' ? 'Delivery' : 'Retiro'})${winnerBadge}`);
    });
    lines.push(`────────────────────────────────────────`);
    lines.push(`¡Muchos éxitos a todos! 🍔 Trico's Burgers & Chicken`);

    try {
      navigator.clipboard.writeText(lines.join('\n'));
      showToast('¡Lista completa copiada al portapapeles! 📋');
    } catch {
      showToast('No se pudo copiar automáticamente.');
    }
  };

  // Girar Ruleta de Sorteo (Iniciar o Volver a Sortear)
  const handleStartSpin = () => {
    if (orders.length === 0) {
      alert('No hay participantes registrados para sortear.');
      return;
    }
    if (isSpinning) return;

    setIsSpinning(true);
    setChosenWinners([]);

    // Filtramos participantes que aún no hayan ganado
    const eligibleOrders = orders.filter((o) => !o.isWinner);
    const pool = eligibleOrders.length >= winnersCountConfig ? eligibleOrders : orders;

    let counter = 0;
    const totalIterations = 35 + Math.floor(Math.random() * 10);

    spinIntervalRef.current = setInterval(() => {
      counter++;
      const randomCandidate = pool[Math.floor(Math.random() * pool.length)];
      setDisplayCandidate(randomCandidate);

      if (counter >= totalIterations) {
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
        setIsSpinning(false);

        // Seleccionar los N ganadores sin duplicados
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, Math.min(winnersCountConfig, pool.length));
        setChosenWinners(selected);

        // Festejo con confeti animado
        try {
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.55 },
            colors: ['#FFC93C', '#FF4757', '#2ED573', '#1E90FF'],
          });
        } catch {}
      }
    }, 65);
  };

  // Reiniciar Sorteo (Limpia la ruleta por si hubo algún inconveniente)
  const handleResetSpin = () => {
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }
    setIsSpinning(false);
    setDisplayCandidate(null);
    setChosenWinners([]);
    showToast('Sorteo reiniciado. Podés volver a girar la ruleta.');
  };

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, []);

  // Confirmar y guardar ganadores oficiales
  const handleConfirmWinners = () => {
    if (chosenWinners.length === 0) return;
    chosenWinners.forEach((w) => {
      if (typeof onToggleWinner === 'function') {
        onToggleWinner(w.id, prizeToRaffle);
      }
    });
    showToast(`¡${chosenWinners.length} ganador(es) registrado(s) oficialmente para "${prizeToRaffle}"! 🏆`);
    setIsLotteryModalOpen(false);
  };

  // Abrir WhatsApp para avisar a un ganador específico
  const handleNotifyWinnerByWhatsApp = (winnerOrder) => {
    if (!winnerOrder) return;
    const rawPhone = winnerOrder.phone ? winnerOrder.phone.replace(/\D/g, '') : '';
    const cleanPhone = rawPhone ? (rawPhone.startsWith('549') ? rawPhone : `549${rawPhone}`) : '5493804379754';
    const msg = `¡Hola ${winnerOrder.customerName}! 🥳🎉 Te escribimos desde *TRICO'S* para darte una gran noticia:\n\n¡Sos GANADOR/A de nuestro Gran Sorteo Oficial con tu ticket *#TRICO-${winnerOrder.ticketNumber}*!\n\n🏆 *Premio obtenido:* ${prizeToRaffle}\n\nPor favor respondé a este mensaje para coordinar la entrega de tu premio. ¡Felicitaciones de todo el equipo de Trico's! 🍔🍗`;
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Agregar participante manual
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualForm.name.trim()) return;

    if (typeof onAddManualOrder === 'function') {
      onAddManualOrder({
        customerName: manualForm.name.trim(),
        phone: manualForm.phone.trim(),
        deliveryType: 'takeaway',
        address: 'Participación Manual / Redes',
        addressNotes: manualForm.concept.trim(),
        total: Number(manualForm.total) || 0,
        paymentMethod: 'Manual / Mostrador',
        items: [
          {
            name: manualForm.concept.trim() || 'Participación Sorteo',
            quantity: 1,
            price: Number(manualForm.total) || 0,
            subtotal: Number(manualForm.total) || 0,
          },
        ],
        participatingGiveaway: true,
      });
    }

    setManualForm({ name: '', phone: '', concept: 'Participación Sorteo (Instagram / Local)', total: '' });
    setIsManualModalOpen(false);
    showToast('¡Participante agregado con éxito al sorteo! 🎁');
  };

  return (
    <div className="space-y-6 animate-modalIn select-none">
      
      {/* Toast de notificación temporal */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500 text-white font-sub font-bold text-sm shadow-cartoon-xs flex items-center gap-2 animate-bounce">
          <Icon name="check_circle" size={20} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cabecera Principal y Acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-xl sm:text-2xl text-cartoon-ink flex items-center gap-2">
            <span>🎁</span>
            <span>Clientes & Participantes del Sorteo</span>
          </h3>
          <p className="font-sub text-xs sm:text-sm text-gray-500 mt-0.5">
            Premio configurado en Promos: <strong className="text-cartoon-ink">{prizeToRaffle}</strong> ({winnersCountConfig} {winnersCountConfig === 1 ? 'ganador' : 'ganadores'}).
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setDisplayCandidate(null);
              setChosenWinners([]);
              setIsLotteryModalOpen(true);
            }}
            className="btn-cartoon-primary text-xs sm:text-sm py-2 px-3.5 flex items-center gap-2 shadow-cartoon-xs cursor-pointer font-display"
          >
            <span className="text-lg">🎰</span>
            <span>Ruleta de Sorteo</span>
          </button>

          <button
            type="button"
            onClick={handleCopyList}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-100 text-cartoon-ink border-2 border-cartoon-ink font-sub font-bold text-xs flex items-center gap-1.5 shadow-cartoon-xs cursor-pointer transition-colors"
          >
            <Icon name="content_copy" size={16} />
            <span>Copiar Lista</span>
          </button>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-cartoon-cream hover:bg-cartoon-cream-dark text-cartoon-ink border-2 border-cartoon-ink font-sub font-bold text-xs flex items-center gap-1.5 shadow-cartoon-xs cursor-pointer transition-colors"
          >
            <Icon name="person_add" size={16} />
            <span>+ Manual</span>
          </button>
        </div>
      </div>

      {/* Métricas Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="font-sub font-bold text-xs text-gray-400 uppercase tracking-wider block">
            👥 Total Clientes
          </span>
          <span className="font-display text-2xl sm:text-3xl text-cartoon-ink block mt-0.5">
            {orders.length}
          </span>
          <span className="font-sub text-[11px] text-emerald-600 font-bold block mt-0.5">
            Participando en el sorteo
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="font-sub font-bold text-xs text-gray-400 uppercase tracking-wider block">
            🏆 Premio Configurado
          </span>
          <span className="font-display text-sm sm:text-base text-cartoon-ink block mt-1 line-clamp-2 leading-tight">
            {prizeToRaffle}
          </span>
          <span className="font-sub text-[11px] text-gray-500 block mt-0.5">
            {winnersCountConfig} ganador(es) a sortear
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
          <span className="font-sub font-bold text-xs text-amber-700 uppercase tracking-wider block">
            ⭐ Ganadores Elegidos
          </span>
          <span className="font-display text-2xl sm:text-3xl text-amber-600 block mt-0.5">
            {totalWinners}
          </span>
          <span className="font-sub text-[11px] text-amber-700 font-bold block mt-0.5">
            Con premio asignado
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="font-sub font-bold text-xs text-gray-400 uppercase tracking-wider block">
            💰 Ventas Totales
          </span>
          <span className="font-display text-2xl sm:text-3xl text-cartoon-ink block mt-0.5">
            {money(totalAmount)}
          </span>
          <span className="font-sub text-[11px] text-gray-400 block mt-0.5">
            Acumulado de pedidos web
          </span>
        </div>
      </div>

      {/* Buscador y Píldoras de Filtro */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Icon name="search" size={18} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, celular, ticket #..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-gray-200 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-yellow shadow-xs"
          />
        </div>

        {/* Píldoras de Filtro */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl font-sub font-bold text-xs whitespace-nowrap cursor-pointer transition-all border ${
              filterType === 'all'
                ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-black'
                : 'bg-white text-gray-600 border-gray-200 hover:text-cartoon-ink'
            }`}
          >
            Todos ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('delivery')}
            className={`px-3 py-1.5 rounded-xl font-sub font-bold text-xs whitespace-nowrap cursor-pointer transition-all border ${
              filterType === 'delivery'
                ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-black'
                : 'bg-white text-gray-600 border-gray-200 hover:text-cartoon-ink'
            }`}
          >
            🛵 Delivery
          </button>
          <button
            type="button"
            onClick={() => setFilterType('takeaway')}
            className={`px-3 py-1.5 rounded-xl font-sub font-bold text-xs whitespace-nowrap cursor-pointer transition-all border ${
              filterType === 'takeaway'
                ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-black'
                : 'bg-white text-gray-600 border-gray-200 hover:text-cartoon-ink'
            }`}
          >
            🏪 Retiro
          </button>
          <button
            type="button"
            onClick={() => setFilterType('winners')}
            className={`px-3 py-1.5 rounded-xl font-sub font-bold text-xs whitespace-nowrap cursor-pointer transition-all border ${
              filterType === 'winners'
                ? 'bg-amber-400 text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-black'
                : 'bg-white text-gray-600 border-gray-200 hover:text-cartoon-ink'
            }`}
          >
            🏆 Ganadores ({totalWinners})
          </button>
        </div>
      </div>

      {/* Lista de Tarjetas de Clientes Participantes */}
      {filteredOrders.length === 0 ? (
        <div className="p-10 bg-white rounded-3xl border-2 border-dashed border-gray-200 text-center space-y-2">
          <span className="text-4xl block">🔍</span>
          <h4 className="font-display text-base sm:text-lg text-cartoon-ink">
            No se encontraron clientes con esos filtros
          </h4>
          <p className="font-sub text-xs text-gray-400">
            Probá limpiando el buscador o cambiando la categoría.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order, idx) => {
            const ticketDisplay = order.ticketNumber ? `#TRICO-${order.ticketNumber}` : `#${idx + 1}`;
            const isWinner = !!order.isWinner;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border-2 p-3.5 sm:p-4.5 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isWinner
                    ? 'border-amber-400 bg-amber-50/30 ring-2 ring-amber-300/60'
                    : 'border-gray-200 hover:border-cartoon-ink'
                }`}
              >
                {/* Columna Izquierda: Información del Cliente y Celular destacado */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-cartoon bg-cartoon-yellow text-cartoon-ink border-cartoon-ink font-display text-xs">
                      {ticketDisplay}
                    </span>

                    {isWinner && (
                      <span className="badge-cartoon bg-amber-400 text-cartoon-ink border-cartoon-ink font-display text-xs flex items-center gap-1">
                        <span>🏆</span>
                        <span>{order.winnerPrize || 'Ganador'}</span>
                      </span>
                    )}

                    <span className="badge-cartoon bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                      Participando 🎁
                    </span>

                    <span className="font-sub text-[11px] text-gray-400">
                      {formatOrderDate(order.createdAt)}
                    </span>
                  </div>

                  {/* Nombre y Número de Celular / WhatsApp */}
                  <div className="flex flex-wrap items-center gap-3 pt-0.5">
                    <h4
                      onClick={() => setSelectedOrderDetails(order)}
                      className="font-display text-base sm:text-lg text-cartoon-ink hover:text-cartoon-red cursor-pointer transition-colors"
                      title="Ver Ficha del Cliente"
                    >
                      {order.customerName}
                    </h4>

                    {/* Celular Prominente con Botón de WhatsApp y Copiar */}
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                      <Icon name="call" size={14} className="text-emerald-700" />
                      <span className="font-sub font-black text-xs text-emerald-900">
                        {order.phone || 'Sin celular'}
                      </span>
                      {order.phone && (
                        <a
                          href={`https://wa.me/${order.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-[10px] font-sub font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                          title="Abrir WhatsApp"
                        >
                          <Icon name="chat" size={12} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Modalidad y Dirección */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-sub text-gray-600">
                    <span className="font-bold text-cartoon-ink">
                      {order.deliveryType === 'delivery' ? '🛵 Delivery:' : '🏪 Retiro en Local'}
                    </span>
                    <span className="truncate max-w-xs">{order.address || 'Santa Cruz 524'}</span>

                    {order.mapUrl && (
                      <a
                        href={order.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-cartoon-red hover:underline bg-rose-50 px-2 py-0.5 rounded-lg border border-cartoon-red/30"
                        title="Ver en Google Maps"
                      >
                        <Icon name="location_on" size={13} />
                        <span>Google Maps ↗</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Total, Ver Ficha y Acciones */}
                <div className="flex md:flex-col items-end justify-between md:justify-center gap-2 flex-shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                  <div className="text-left md:text-right">
                    <span className="font-sub text-[10px] text-gray-400 block">Total pedido:</span>
                    <span className="font-display text-base sm:text-lg text-cartoon-ink">
                      {money(order.total)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Botón Ver Ficha del Cliente */}
                    <button
                      type="button"
                      onClick={() => setSelectedOrderDetails(order)}
                      className="px-2.5 py-1 rounded-xl bg-gray-100 hover:bg-cartoon-yellow hover:text-cartoon-ink text-gray-700 font-sub font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors border border-gray-200"
                    >
                      <Icon name="badge" size={14} />
                      <span>Ficha</span>
                    </button>

                    {/* Botón Marcar / Desmarcar Ganador */}
                    <button
                      type="button"
                      onClick={() => {
                        if (order.isWinner) {
                          onToggleWinner(order.id, null);
                          showToast(`Se quitó la marca de ganador a ${order.customerName}`);
                        } else {
                          onToggleWinner(order.id, prizeToRaffle);
                          showToast(`¡${order.customerName} registrado como ganador! 🏆`);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-xl font-sub font-bold text-xs flex items-center gap-1 cursor-pointer transition-all border ${
                        isWinner
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-white hover:bg-amber-50 text-gray-700 border-gray-300'
                      }`}
                      title={isWinner ? 'Quitar condición de ganador' : 'Asignar como ganador'}
                    >
                      <span>🏆</span>
                      <span>{isWinner ? 'Ganador' : 'Hacer Ganador'}</span>
                    </button>

                    {/* Botón Borrar */}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(order.id)}
                      className="w-8 h-8 rounded-xl bg-white hover:bg-rose-50 text-gray-400 hover:text-cartoon-red border border-gray-200 flex items-center justify-center cursor-pointer transition-colors"
                      title="Eliminar pedido"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RULETA Y SORTEADOR INTERACTIVO */}
      {/* ============================================================== */}
      {isLotteryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-modalIn">
          <div className="relative w-full max-w-lg bg-cartoon-cream rounded-3xl border-3 sm:border-4 border-cartoon-ink shadow-cartoon-xl overflow-hidden p-4 sm:p-6 text-center space-y-4">
            
            {/* Cabecera del Sorteador */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-cartoon-ink/15">
              <div className="flex items-center gap-2 text-left">
                <span className="text-3xl">🎰</span>
                <div>
                  <h3 className="font-display text-lg sm:text-xl text-cartoon-ink leading-tight">
                    Ruleta Oficial del Sorteo
                  </h3>
                  <span className="font-sub text-xs text-cartoon-ink/70">
                    {orders.length} clientes participando con sus pedidos
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLotteryModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white border-2 border-cartoon-ink flex items-center justify-center text-cartoon-ink hover:bg-cartoon-cream-dark cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            {/* Información del Premio Actual (Sincronizado desde Promos) */}
            <div className="p-3 rounded-2xl bg-white border-2 border-cartoon-ink/20 text-left flex items-center justify-between">
              <div>
                <span className="font-sub font-bold text-[10px] text-gray-400 uppercase tracking-wider block">
                  Premio a Sortear (Configurado en Promos):
                </span>
                <span className="font-display text-sm sm:text-base text-cartoon-ink block mt-0.5">
                  🏆 {prizeToRaffle}
                </span>
              </div>
              <div className="text-right">
                <span className="font-sub text-[10px] text-gray-400 block">Ganadores:</span>
                <span className="badge-cartoon bg-cartoon-yellow text-cartoon-ink font-display text-xs">
                  {winnersCountConfig} {winnersCountConfig === 1 ? 'Ganador' : 'Ganadores'}
                </span>
              </div>
            </div>

            {/* Pantalla Arcade de la Ruleta */}
            <div className="relative rounded-2xl bg-white border-3 border-cartoon-ink p-5 sm:p-6 shadow-cartoon-sm flex flex-col items-center justify-center min-h-[190px] overflow-hidden">
              {isSpinning ? (
                <div className="space-y-2 animate-pulse">
                  <span className="text-4xl animate-spin inline-block">🎲</span>
                  <div className="space-y-0.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-cartoon-yellow border border-cartoon-ink font-display text-xs text-cartoon-ink">
                      #{displayCandidate?.ticketNumber ? `TRICO-${displayCandidate.ticketNumber}` : 'GIRANDO'}
                    </span>
                    <h4 className="font-display text-xl sm:text-2xl text-cartoon-red truncate max-w-xs">
                      {displayCandidate?.customerName || 'Buscando ganador...'}
                    </h4>
                  </div>
                  <p className="font-sub text-xs text-gray-500 font-bold">¡Girando ruleta de participantes...!</p>
                </div>
              ) : chosenWinners.length > 0 ? (
                <div className="space-y-3 w-full">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 border-2 border-cartoon-ink shadow-cartoon-xs">
                    <span className="text-base">🏆</span>
                    <span className="font-display text-xs text-cartoon-ink uppercase">
                      ¡{chosenWinners.length === 1 ? 'TENEMOS GANADOR' : `${chosenWinners.length} GANADORES SELECCIONADOS`}!
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {chosenWinners.map((winner, idx) => (
                      <div
                        key={winner.id}
                        className="p-2.5 rounded-xl bg-amber-50 border-2 border-amber-300 flex items-center justify-between gap-2 text-left"
                      >
                        <div>
                          <span className="font-display text-[10px] text-amber-800 uppercase block">
                            Ganador {idx + 1} • Ticket #TRICO-{winner.ticketNumber}
                          </span>
                          <span className="font-display text-base text-cartoon-ink block">
                            {winner.customerName}
                          </span>
                          {winner.phone && (
                            <span className="font-sub font-bold text-xs text-emerald-700 block">
                              📱 {winner.phone}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleNotifyWinnerByWhatsApp(winner)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-sub font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs flex-shrink-0"
                          title="Avisar por WhatsApp"
                        >
                          <Icon name="chat" size={14} />
                          <span>Avisar</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-center">
                  <span className="text-4xl block">🎁</span>
                  <h4 className="font-display text-base sm:text-lg text-cartoon-ink">
                    ¿Quién se lleva el premio?
                  </h4>
                  <p className="font-sub text-xs text-gray-500 max-w-xs">
                    Tocá el botón abajo para iniciar el sorteo aleatorio entre todos los clientes.
                  </p>
                </div>
              )}
            </div>

            {/* Botones de Control de la Ruleta (Iniciar, Reiniciar, Volver a Sortear) */}
            <div className="space-y-2 pt-1">
              {chosenWinners.length === 0 ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleStartSpin}
                    disabled={isSpinning || orders.length === 0}
                    className="flex-1 btn-cartoon-red text-sm sm:text-base py-3 flex items-center justify-center gap-2 shadow-cartoon cursor-pointer disabled:opacity-50"
                  >
                    <span className="text-xl">🎲</span>
                    <span>{isSpinning ? 'GIRANDO...' : '¡Iniciar Sorteo!'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetSpin}
                    disabled={isSpinning}
                    className="px-3.5 py-3 rounded-xl bg-white hover:bg-gray-100 border-2 border-cartoon-ink font-sub font-bold text-xs text-cartoon-ink cursor-pointer"
                  >
                    🔄 Reiniciar
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmWinners}
                      className="flex-1 btn-cartoon-primary text-xs sm:text-sm py-2.5 flex items-center justify-center gap-1.5 shadow-cartoon-xs cursor-pointer"
                    >
                      <Icon name="check_circle" size={18} />
                      <span>Guardar Ganador(es)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStartSpin}
                      className="px-3 py-2.5 rounded-xl bg-white hover:bg-gray-100 border-2 border-cartoon-ink font-sub font-bold text-xs text-cartoon-ink cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>🔁</span>
                      <span>Volver a Sortear</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetSpin}
                      className="px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 font-sub font-bold text-xs text-gray-700 cursor-pointer"
                    >
                      🔄 Reiniciar
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: FICHA COMPLETA DEL CLIENTE */}
      {/* ============================================================== */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-modalIn select-none">
          <div className="w-full max-w-lg bg-white rounded-3xl border-3 sm:border-4 border-cartoon-ink shadow-cartoon-lg p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cartoon-yellow border-2 border-cartoon-ink flex items-center justify-center text-xl">
                  👤
                </div>
                <div>
                  <h3 className="font-display text-lg text-cartoon-ink">
                    Ficha del Cliente
                  </h3>
                  <span className="font-sub font-bold text-xs text-gray-500">
                    Ticket #TRICO-{selectedOrderDetails.ticketNumber || '0000'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 cursor-pointer"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Datos Personales y Celular */}
            <div className="p-4 bg-gray-50 rounded-2xl border-2 border-gray-200 space-y-2.5">
              <div>
                <span className="font-sub font-bold text-[10px] text-gray-400 uppercase tracking-wider block">
                  Nombre del Cliente
                </span>
                <span className="font-display text-lg text-cartoon-ink block">
                  {selectedOrderDetails.customerName}
                </span>
              </div>

              <div>
                <span className="font-sub font-bold text-[10px] text-gray-400 uppercase tracking-wider block">
                  Número de Celular / WhatsApp
                </span>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="font-sub font-black text-sm text-emerald-800">
                    📱 {selectedOrderDetails.phone || 'No registrado'}
                  </span>

                  {selectedOrderDetails.phone && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedOrderDetails.phone);
                          showToast('Número copiado al portapapeles');
                        }}
                        className="px-2 py-1 rounded-lg bg-white border border-gray-300 font-sub text-xs text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        Copiar
                      </button>
                      <a
                        href={`https://wa.me/${selectedOrderDetails.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-cartoon-green py-1 px-3 text-xs flex items-center gap-1 shadow-xs"
                      >
                        <Icon name="chat" size={14} />
                        <span>Abrir WhatsApp</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modalidad y Ubicación con Google Maps */}
            <div className="p-4 bg-gray-50 rounded-2xl border-2 border-gray-200 space-y-2">
              <span className="font-sub font-bold text-[10px] text-gray-400 uppercase tracking-wider block">
                Modalidad de Entrega & Ubicación
              </span>
              <p className="font-sub text-xs text-cartoon-ink font-bold">
                {selectedOrderDetails.deliveryType === 'delivery' ? '🛵 Pedido a Domicilio' : '🏪 Retiro en el Local'}
              </p>
              <p className="font-sub text-xs text-gray-600">
                {selectedOrderDetails.address || 'Santa Cruz 524'}
              </p>
              {selectedOrderDetails.addressNotes && (
                <p className="font-sub text-xs text-gray-500 italic">
                  Referencia: {selectedOrderDetails.addressNotes}
                </p>
              )}

              {selectedOrderDetails.mapUrl && (
                <div className="pt-2">
                  <a
                    href={selectedOrderDetails.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-cartoon-primary py-2 px-3 text-xs flex items-center justify-center gap-1.5 shadow-cartoon-xs"
                  >
                    <Icon name="location_on" size={16} />
                    <span>Abrir Ubicación en Google Maps ↗</span>
                  </a>
                </div>
              )}
            </div>

            {/* Platos Solicitados */}
            <div>
              <span className="font-sub font-bold text-xs text-cartoon-ink block mb-1.5">
                Platos del Pedido:
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {(selectedOrderDetails.items || []).map((it, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs font-sub"
                  >
                    <span>
                      <strong>{it.quantity}x</strong> {it.name}
                    </span>
                    <span className="font-bold text-cartoon-ink">
                      {money(it.price * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total y Estado del Sorteo */}
            <div className="p-3 bg-amber-50 rounded-2xl border-2 border-amber-200 flex items-center justify-between">
              <div>
                <span className="font-sub text-[10px] text-amber-800 uppercase block">Total Abonado</span>
                <span className="font-display text-lg text-cartoon-ink">
                  {money(selectedOrderDetails.total)}
                </span>
              </div>

              <div>
                {selectedOrderDetails.isWinner ? (
                  <span className="badge-cartoon bg-amber-400 text-cartoon-ink font-display text-xs">
                    🏆 Ganador: {selectedOrderDetails.winnerPrize}
                  </span>
                ) : (
                  <span className="badge-cartoon bg-emerald-100 text-emerald-800 text-xs">
                    🎁 Participando
                  </span>
                )}
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="btn-cartoon-primary py-2 px-5 text-xs font-display shadow-cartoon-xs cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: AGREGAR PARTICIPANTE MANUAL */}
      {/* ============================================================== */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-modalIn select-none">
          <div className="w-full max-w-md bg-white rounded-3xl border-3 border-cartoon-ink shadow-cartoon-lg p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">➕</span>
                <h3 className="font-display text-base sm:text-lg text-cartoon-ink">
                  Agregar Participante Manual
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 cursor-pointer"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                  Nombre Completo:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcos Albarracín"
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-xs"
                />
              </div>

              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                  Número de Celular / WhatsApp:
                </label>
                <input
                  type="tel"
                  placeholder="Ej: 3804-987654"
                  value={manualForm.phone}
                  onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-xs"
                />
              </div>

              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                  Concepto / Origen:
                </label>
                <input
                  type="text"
                  value={manualForm.concept}
                  onChange={(e) => setManualForm({ ...manualForm, concept: e.target.value })}
                  placeholder="Ej: Sorteo Instagram, Pedido en Mostrador"
                  className="w-full px-3 py-2 rounded-xl border-2 border-cartoon-ink font-sub text-xs text-cartoon-ink focus:outline-none shadow-cartoon-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-sub text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-cartoon-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-cartoon-xs cursor-pointer"
                >
                  <Icon name="check" size={16} />
                  <span>Agregar al Sorteo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMACIÓN DE BORRADO DE PEDIDO */}
      {/* ============================================================== */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-modalIn select-none">
          <div className="w-full max-w-sm bg-white rounded-3xl border-3 border-cartoon-ink shadow-cartoon-lg p-5 text-center space-y-4">
            <h3 className="font-display text-base text-cartoon-ink">¿Eliminar este pedido?</h3>
            <p className="font-sub text-xs text-gray-600">
              Se quitará el registro del cliente y su participación del sorteo.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-sub text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof onDeleteOrder === 'function') onDeleteOrder(deleteConfirmId);
                  setDeleteConfirmId(null);
                  showToast('Pedido eliminado del sorteo.');
                }}
                className="px-4 py-2 rounded-xl bg-cartoon-red text-white font-sub font-bold text-xs cursor-pointer shadow-sm hover:bg-cartoon-red-dark"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
