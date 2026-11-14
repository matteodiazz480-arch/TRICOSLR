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

  // Notificación temporal
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  };

  // Modales
  const [isLotteryModalOpen, setIsLotteryModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Estados de la Ruleta / Sorteador
  const defaultPrizes = giveaway?.prizes || [
    { id: 1, title: '1° Premio: Diseño Web Profesional', emoji: '💻' },
    { id: 2, title: '2° Premio: Combo Carioca + Delivery Gratis', emoji: '🍔' },
    { id: 3, title: '3° Premio: Mes de Redes Sociales', emoji: '📱' },
    { id: 4, title: '4° Premio: Combo Pollo para Compartir', emoji: '🍗' },
  ];
  const [selectedPrizeTitle, setSelectedPrizeTitle] = useState(
    defaultPrizes[0]?.title || '1° Premio: Diseño Web Profesional'
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayCandidate, setDisplayCandidate] = useState(null);
  const [chosenWinner, setChosenWinner] = useState(null);
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
      // Filtro por tipo
      if (filterType === 'delivery' && o.deliveryType !== 'delivery') return false;
      if (filterType === 'takeaway' && o.deliveryType !== 'takeaway') return false;
      if (filterType === 'winners' && !o.isWinner) return false;

      // Filtro por búsqueda
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

  // Copiar lista prolija al portapapeles para historias o WhatsApp
  const handleCopyList = () => {
    if (orders.length === 0) {
      showToast('No hay participantes registrados todavía.');
      return;
    }
    const lines = [];
    lines.push(`🎁 *LISTA OFICIAL DE PARTICIPANTES - SORTEO TRICO'S* 🎁`);
    lines.push(`📅 Sortea: ${giveaway?.drawDate || 'Fin de mes'}`);
    lines.push(`👥 Total participantes: ${orders.length}`);
    lines.push(`────────────────────────────────────────`);
    orders.forEach((o, i) => {
      const ticket = o.ticketNumber ? `#TRICO-${o.ticketNumber}` : `#${i + 1}`;
      const winnerBadge = o.isWinner ? ` 🏆 [GANADOR: ${o.winnerPrize || 'Premio'}]` : '';
      lines.push(`${i + 1}. Ticket ${ticket}: ${o.customerName} (${o.deliveryType === 'delivery' ? 'Delivery' : 'Retiro'})${winnerBadge}`);
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

  // Girar Ruleta de Sorteo
  const handleStartSpin = () => {
    if (orders.length === 0) {
      alert('No hay participantes registrados para sortear.');
      return;
    }
    if (isSpinning) return;

    setIsSpinning(true);
    setChosenWinner(null);

    const eligibleOrders = orders.filter((o) => !o.isWinner);
    const pool = eligibleOrders.length > 0 ? eligibleOrders : orders;

    let counter = 0;
    const totalIterations = 32 + Math.floor(Math.random() * 8);

    spinIntervalRef.current = setInterval(() => {
      counter++;
      const randomCandidate = pool[Math.floor(Math.random() * pool.length)];
      setDisplayCandidate(randomCandidate);

      if (counter >= totalIterations) {
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
        setIsSpinning(false);
        setChosenWinner(randomCandidate);

        // Festejo con confeti animado
        try {
          confetti({
            particleCount: 110,
            spread: 85,
            origin: { y: 0.55 },
            colors: ['#FFC93C', '#FF4757', '#2ED573', '#1E90FF'],
          });
        } catch {}
      }
    }, 70);
  };

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, []);

  // Confirmar y guardar ganador oficial
  const handleConfirmWinner = (winnerOrder) => {
    if (!winnerOrder) return;
    if (typeof onToggleWinner === 'function') {
      onToggleWinner(winnerOrder.id, selectedPrizeTitle);
    }
    showToast(`¡${winnerOrder.customerName} registrado como ganador de "${selectedPrizeTitle}"! 🏆`);
    setIsLotteryModalOpen(false);
  };

  // Abrir WhatsApp para avisar al ganador
  const handleNotifyWinnerByWhatsApp = (winnerOrder) => {
    if (!winnerOrder) return;
    const phone = winnerOrder.phone ? winnerOrder.phone.replace(/\D/g, '') : '';
    const cleanPhone = phone ? (phone.startsWith('549') ? phone : `549${phone}`) : '5493804379754';
    const msg = `¡Hola ${winnerOrder.customerName}! 🥳🎉 Te escribimos desde *TRICO'S* para darte una gran noticia:\n\n¡Sos GANADOR/A de nuestro Gran Sorteo Oficial con tu ticket *#TRICO-${winnerOrder.ticketNumber}*!\n\n🏆 *Premio obtenido:* ${selectedPrizeTitle}\n\nPor favor respondé a este mensaje para coordinar la entrega de tu premio. ¡Felicitaciones de todo el equipo de Trico's! 🍔🍗`;
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
    <div className="space-y-6 animate-modalIn">
      
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
            Registro en tiempo real de todos los clientes que realizaron pedidos en la web y participan por los 4 premios oficiales.
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setDisplayCandidate(null);
              setChosenWinner(null);
              setIsLotteryModalOpen(true);
            }}
            className="btn-cartoon-primary text-xs sm:text-sm py-2 px-3.5 flex items-center gap-2 shadow-cartoon-xs cursor-pointer font-display"
          >
            <span className="text-base">🎰</span>
            <span>Sortear Ganador al Azar</span>
          </button>

          <button
            type="button"
            onClick={handleCopyList}
            className="px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border-2 border-cartoon-ink font-sub font-bold text-xs text-cartoon-ink shadow-cartoon-xs flex items-center gap-1.5 cursor-pointer"
            title="Copiar lista de participantes para Instagram"
          >
            <Icon name="content_copy" size={16} />
            <span>Copiar Lista</span>
          </button>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-cartoon-yellow hover:bg-cartoon-yellow-light border-2 border-cartoon-ink font-sub font-bold text-xs text-cartoon-ink shadow-cartoon-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Icon name="person_add" size={16} />
            <span>+ Participante Manual</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas (KPIs del Sorteo) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border-2 sm:border-3 border-gray-200 p-3.5 sm:p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-xl flex-shrink-0">
            👥
          </div>
          <div className="min-w-0">
            <span className="font-sub text-[11px] text-gray-500 font-bold block">Participantes</span>
            <span className="font-display text-lg sm:text-2xl text-cartoon-ink">{orders.length}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 sm:border-3 border-gray-200 p-3.5 sm:p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-xl flex-shrink-0">
            💵
          </div>
          <div className="min-w-0">
            <span className="font-sub text-[11px] text-gray-500 font-bold block">Total Pedidos</span>
            <span className="font-display text-base sm:text-xl text-emerald-600">{money(totalAmount)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 sm:border-3 border-gray-200 p-3.5 sm:p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-300 flex items-center justify-center text-xl flex-shrink-0">
            🏆
          </div>
          <div className="min-w-0">
            <span className="font-sub text-[11px] text-gray-500 font-bold block">Ganadores</span>
            <span className="font-display text-lg sm:text-2xl text-indigo-700">{totalWinners}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 sm:border-3 border-gray-200 p-3.5 sm:p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-xl flex-shrink-0">
            📅
          </div>
          <div className="min-w-0">
            <span className="font-sub text-[11px] text-gray-500 font-bold block">Fecha Sorteo</span>
            <span className="font-display text-sm sm:text-base text-cartoon-red truncate block">
              {giveaway?.drawDate || 'Fin de mes'}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Píldoras de Filtro */}
      <div className="bg-white rounded-2xl border-2 sm:border-3 border-gray-200 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Buscador */}
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 flex items-center pointer-events-none">
            <Icon name="search" size={18} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, #ticket, teléfono, calle o producto..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-gray-50 border-2 border-gray-200 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-yellow"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

        {/* Píldoras de filtro */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: `Todos (${orders.length})` },
            { id: 'delivery', label: `🛵 Delivery (${orders.filter((o) => o.deliveryType === 'delivery').length})` },
            { id: 'takeaway', label: `🏪 Retiro (${orders.filter((o) => o.deliveryType === 'takeaway').length})` },
            { id: 'winners', label: `🏆 Ganadores (${totalWinners})` },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterType(pill.id)}
              className={`px-3 py-1.5 rounded-xl font-sub font-bold text-xs cursor-pointer whitespace-nowrap transition-all border-2 ${
                filterType === pill.id
                  ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-black'
                  : 'bg-gray-100 text-gray-600 border-transparent hover:border-gray-300'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Pedidos Participantes */}
      {filteredOrders.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-3xl border-2 sm:border-3 border-gray-200 shadow-sm space-y-2">
          <span className="text-4xl block">🔍</span>
          <h4 className="font-display text-base text-cartoon-ink">No se encontraron clientes</h4>
          <p className="font-sub text-xs text-gray-500 max-w-sm mx-auto">
            {search ? 'Probá con otra palabra o limpiá el buscador.' : 'Todavía no hay pedidos registrados para el sorteo.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const ticketTag = order.ticketNumber ? `#TRICO-${order.ticketNumber}` : `#TKT-${order.id.slice(-4)}`;
            const isWinner = order.isWinner;

            return (
              <div
                key={order.id}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 sm:border-3 transition-all bg-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                  isWinner ? 'border-amber-400 bg-amber-50/40 ring-2 ring-amber-300/40' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Columna Izquierda: Ticket, Nombre, Teléfono y Fecha */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-cartoon-yellow border-2 border-cartoon-ink font-display text-xs text-cartoon-ink shadow-cartoon-xs">
                      {ticketTag}
                    </span>

                    {isWinner && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-cartoon-ink font-sub font-black text-[10px] uppercase border border-cartoon-ink shadow-cartoon-xs flex items-center gap-1">
                        <span>🏆</span>
                        <span>{order.winnerPrize || 'Ganador del Sorteo'}</span>
                      </span>
                    )}

                    <span className="badge-cartoon bg-cartoon-green/20 text-cartoon-green-dark border-cartoon-green text-[10px]">
                      Participando 🎁
                    </span>

                    <span className="font-sub text-[11px] text-gray-400">
                      {formatOrderDate(order.createdAt)}
                    </span>
                  </div>

                  {/* Nombre y Teléfono */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                    <h4 className="font-display text-base sm:text-lg text-cartoon-ink leading-tight">
                      {order.customerName}
                    </h4>

                    {order.phone && (
                      <a
                        href={`https://wa.me/${order.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-sub font-bold text-emerald-600 hover:underline bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200"
                        title="Abrir chat de WhatsApp"
                      >
                        <Icon name="chat" size={13} />
                        <span>{order.phone}</span>
                      </a>
                    )}
                  </div>

                  {/* Modalidad y Dirección con Link a Google Maps */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-sub text-gray-600 pt-0.5">
                    <span className="font-bold text-cartoon-ink">
                      {order.deliveryType === 'delivery' ? '🛵 A Domicilio:' : '🏪 Retiro en Local'}
                    </span>
                    <span className="truncate max-w-xs">{order.address || 'Santa Cruz 524'}</span>

                    {order.mapUrl && (
                      <a
                        href={order.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-cartoon-red hover:underline bg-rose-50 px-2 py-0.5 rounded-lg border border-cartoon-red/30"
                        title="Ver ubicación exacta en Google Maps"
                      >
                        <Icon name="location_on" size={13} />
                        <span>Ver en Google Maps ↗</span>
                      </a>
                    )}

                    {order.addressNotes && (
                      <span className="text-gray-400 italic text-[11px]">
                        (Ref: {order.addressNotes})
                      </span>
                    )}
                  </div>

                  {/* Platos pedidos */}
                  {order.items && order.items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {order.items.map((it, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-sub text-[11px]"
                        >
                          {it.quantity}x {it.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Columna Derecha: Monto Total y Botones de Acción */}
                <div className="flex md:flex-col items-end justify-between md:justify-center gap-2 flex-shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                  <div className="text-left md:text-right">
                    <span className="font-sub text-[10px] text-gray-400 block">Total del pedido:</span>
                    <span className="font-display text-base sm:text-lg text-cartoon-ink">
                      {money(order.total)}
                    </span>
                    <span className="font-sub text-[10px] text-gray-500 block">
                      {order.paymentMethod || 'Efectivo'}
                    </span>
                  </div>

                  {/* Acciones del sorteo */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (order.isWinner) {
                          onToggleWinner(order.id, null);
                          showToast(`Se quitó la marca de ganador a ${order.customerName}`);
                        } else {
                          onToggleWinner(order.id, selectedPrizeTitle);
                          showToast(`¡${order.customerName} marcado como ganador! 🏆`);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-xl font-sub font-bold text-xs flex items-center gap-1 cursor-pointer transition-all border ${
                        isWinner
                          ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                          : 'bg-white hover:bg-amber-50 text-gray-700 border-gray-300 hover:border-amber-400'
                      }`}
                      title={isWinner ? 'Quitar condición de ganador' : 'Asignar como ganador de sorteo'}
                    >
                      <span>🏆</span>
                      <span>{isWinner ? 'Quitar Ganador' : 'Ganador'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(order.id)}
                      className="w-8 h-8 rounded-xl bg-white hover:bg-rose-50 text-gray-400 hover:text-cartoon-red border border-gray-200 flex items-center justify-center cursor-pointer transition-colors"
                      title="Eliminar pedido de prueba"
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
      {/* MODAL: RULETA Y SORTEADOR INTERACTIVO AL AZAR */}
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

            {/* Selector de Premio */}
            <div className="text-left space-y-1">
              <label className="font-sub font-bold text-xs text-cartoon-ink/80 block">
                Seleccioná el Premio que vas a sortear:
              </label>
              <select
                value={selectedPrizeTitle}
                onChange={(e) => setSelectedPrizeTitle(e.target.value)}
                disabled={isSpinning}
                className="w-full px-3 py-2 rounded-xl bg-white border-2 border-cartoon-ink font-sub font-bold text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-xs"
              >
                {defaultPrizes.map((p) => (
                  <option key={p.id} value={p.title}>
                    {p.emoji || '🎁'} {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Pantalla Arcade de la Ruleta */}
            <div className="relative rounded-2xl bg-white border-3 border-cartoon-ink p-5 sm:p-7 shadow-cartoon-sm flex flex-col items-center justify-center min-h-[170px] overflow-hidden">
              {isSpinning ? (
                <div className="space-y-2 animate-pulse">
                  <span className="text-3xl animate-spin inline-block">🎲</span>
                  <div className="space-y-0.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-cartoon-yellow border border-cartoon-ink font-display text-xs text-cartoon-ink">
                      #{displayCandidate?.ticketNumber ? `TRICO-${displayCandidate.ticketNumber}` : 'SORTEANDO'}
                    </span>
                    <h4 className="font-display text-xl sm:text-2xl text-cartoon-red truncate max-w-xs">
                      {displayCandidate?.customerName || 'Buscando ganador...'}
                    </h4>
                  </div>
                  <p className="font-sub text-xs text-gray-500 font-bold">¡Girando ruleta de participantes...!</p>
                </div>
              ) : chosenWinner ? (
                <div className="space-y-2 animate-bounce">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 border-2 border-cartoon-ink shadow-cartoon-xs">
                    <span className="text-base">🏆</span>
                    <span className="font-display text-xs text-cartoon-ink uppercase">¡TENEMOS GANADOR!</span>
                  </div>

                  <div>
                    <span className="font-display text-xs text-gray-500 block">
                      Ticket #TRICO-{chosenWinner.ticketNumber}
                    </span>
                    <h3 className="font-display text-2xl sm:text-3xl text-cartoon-ink">
                      {chosenWinner.customerName}
                    </h3>
                    {chosenWinner.phone && (
                      <p className="font-sub font-bold text-xs text-emerald-600 mt-0.5">
                        WhatsApp: {chosenWinner.phone}
                      </p>
                    )}
                  </div>

                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-300 font-sub text-xs text-amber-900 font-bold">
                    Premio: {selectedPrizeTitle}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-center">
                  <span className="text-4xl block">🎁</span>
                  <h4 className="font-display text-base sm:text-lg text-cartoon-ink">
                    ¿Quién será el afortunado?
                  </h4>
                  <p className="font-sub text-xs text-gray-500 max-w-xs">
                    Tocá el botón abajo para hacer girar la ruleta entre los {orders.length} clientes.
                  </p>
                </div>
              )}
            </div>

            {/* Botones de Control de la Ruleta */}
            <div className="space-y-2 pt-1">
              {!chosenWinner ? (
                <button
                  type="button"
                  onClick={handleStartSpin}
                  disabled={isSpinning || orders.length === 0}
                  className="w-full btn-cartoon-red text-sm sm:text-base py-3 flex items-center justify-center gap-2 shadow-cartoon cursor-pointer disabled:opacity-50"
                >
                  <span className="text-xl">🎲</span>
                  <span>{isSpinning ? 'GIRANDO...' : '¡GIRAR RULETA Y SORTEAR!'}</span>
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmWinner(chosenWinner)}
                    className="flex-1 btn-cartoon-primary text-xs sm:text-sm py-2.5 flex items-center justify-center gap-1.5 shadow-cartoon-xs cursor-pointer"
                  >
                    <Icon name="check_circle" size={18} />
                    <span>Guardar como Ganador</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNotifyWinnerByWhatsApp(chosenWinner)}
                    className="flex-1 btn-cartoon-green text-xs sm:text-sm py-2.5 flex items-center justify-center gap-1.5 shadow-cartoon-xs cursor-pointer"
                  >
                    <Icon name="chat" size={18} />
                    <span>Avisar por WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartSpin}
                    className="px-3 py-2.5 rounded-xl bg-white hover:bg-gray-100 border-2 border-cartoon-ink font-sub font-bold text-xs text-cartoon-ink cursor-pointer"
                  >
                    Volver a Girar
                  </button>
                </div>
              )}
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
                onClick={() => setIsManualModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3 font-sub text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nombre Completo: *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcos Juarez"
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border-2 border-gray-200 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-yellow"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Teléfono / WhatsApp:</label>
                <input
                  type="tel"
                  placeholder="Ej: 3804-123456"
                  value={manualForm.phone}
                  onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border-2 border-gray-200 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-yellow"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Concepto o Detalle:</label>
                <input
                  type="text"
                  placeholder="Ej: Participación Instagram @usuario / Compra en local"
                  value={manualForm.concept}
                  onChange={(e) => setManualForm({ ...manualForm, concept: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border-2 border-gray-200 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-yellow"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Monto de la compra (opcional):</label>
                <input
                  type="number"
                  placeholder="Ej: 15000"
                  value={manualForm.total}
                  onChange={(e) => setManualForm({ ...manualForm, total: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border-2 border-gray-200 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-yellow"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-cartoon-primary py-2.5 text-xs font-display flex items-center justify-center gap-1.5 shadow-cartoon-xs cursor-pointer"
                >
                  <Icon name="check" size={16} />
                  <span>Guardar Participante</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR BORRADO DE PEDIDO */}
      {/* ============================================================== */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-modalIn select-none">
          <div className="w-full max-w-sm bg-white rounded-3xl border-3 border-cartoon-ink shadow-cartoon-lg p-5 text-center space-y-4">
            <h3 className="font-display text-base text-cartoon-ink">¿Eliminar este pedido?</h3>
            <p className="font-sub text-xs text-gray-600">
              El cliente será quitado de la lista de participantes del sorteo.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-sub text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (typeof onDeleteOrder === 'function') onDeleteOrder(deleteConfirmId);
                  setDeleteConfirmId(null);
                  showToast('Pedido eliminado de la lista');
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
