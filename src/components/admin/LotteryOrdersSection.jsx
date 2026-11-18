import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Icon } from '../Icon';
import { buildWhatsAppUrl } from '../../lib/whatsapp';
import { DEFAULT_PROMOTIONS_DATA } from '../../lib/promotionsStore';
import { updateOrderStatus } from '../../lib/ordersStore';

const money = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

const formatDate = (iso) => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const ORDER_STATUSES = [
  {
    id: 'pendiente',
    label: 'Pendiente',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'preparacion',
    label: 'En preparación',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  {
    id: 'enviado',
    label: 'Enviado',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
];

const normalizeStatus = (raw) => {
  const s = String(raw || '').toLowerCase();
  if (s === 'preparacion' || s === 'en preparacion' || s === 'en preparación') return 'preparacion';
  if (s === 'enviado' || s === 'entregado' || s === 'completado') return 'enviado';
  return 'pendiente';
};

const WHEEL_COLORS = [
  '#0F172A',
  '#1E293B',
  '#B45309',
  '#334155',
  '#BE123C',
  '#1D4ED8',
  '#047857',
  '#475569',
];

export const LotteryOrdersSection = ({
  orders = [],
  giveaway = {},
  onDeleteOrder,
  onToggleWinner,
  onAddManualOrder,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pendiente' | 'preparacion' | 'enviado' | 'winners'

  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2800);
  };

  // Modales
  const [isLotteryModalOpen, setIsLotteryModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Premios oficiales
  const officialPrizes = useMemo(() => {
    if (Array.isArray(giveaway?.prizes) && giveaway.prizes.length > 0) {
      return giveaway.prizes;
    }
    return DEFAULT_PROMOTIONS_DATA.giveaway.prizes;
  }, [giveaway]);

  const [selectedPrizeId, setSelectedPrizeId] = useState(1);
  const selectedPrize = useMemo(() => {
    return officialPrizes.find((p) => p.id === selectedPrizeId) || officialPrizes[0];
  }, [officialPrizes, selectedPrizeId]);

  // Estados de la Ruleta Visual
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [chosenWinner, setChosenWinner] = useState(null);
  const spinTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  // Formulario participante manual
  const [manualForm, setManualForm] = useState({
    name: '',
    phone: '',
    concept: 'Pedido en mostrador',
    total: '',
  });

  // Contadores por estado para los filtros
  const statusCounts = useMemo(() => {
    const counts = { all: orders.length, pendiente: 0, preparacion: 0, enviado: 0, winners: 0 };
    orders.forEach((o) => {
      const st = normalizeStatus(o.status);
      counts[st] = (counts[st] || 0) + 1;
      if (o.isWinner) counts.winners += 1;
    });
    return counts;
  }, [orders]);

  // Filtrado de pedidos
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = normalizeStatus(o.status);
      if (statusFilter === 'pendiente' && st !== 'pendiente') return false;
      if (statusFilter === 'preparacion' && st !== 'preparacion') return false;
      if (statusFilter === 'enviado' && st !== 'enviado') return false;
      if (statusFilter === 'winners' && !o.isWinner) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const matchName = (o.customerName || '').toLowerCase().includes(q);
      const matchPhone = (o.phone || '').toLowerCase().includes(q);
      const matchTicket = String(o.ticketNumber || '').includes(q);
      return matchName || matchPhone || matchTicket;
    });
  }, [orders, search, statusFilter]);

  // Segmentos de la ruleta (máximo 12 visibles en la rueda para legibilidad, aunque el sorteo elige entre todos los elegibles)
  const wheelCandidates = useMemo(() => {
    const pool = orders.filter((o) => !o.isWinner);
    const source = pool.length > 0 ? pool : orders;
    return source.slice(0, 12);
  }, [orders]);

  const handleStartSpin = () => {
    if (orders.length === 0 || isSpinning) return;

    const eligiblePool = orders.filter((o) => !o.isWinner);
    const pool = eligiblePool.length > 0 ? eligiblePool : orders;
    const winnerIndex = Math.floor(Math.random() * pool.length);
    const finalWinner = pool[winnerIndex];

    // Calcular ángulo hacia el segmento visual correspondiente
    const segCount = Math.max(1, wheelCandidates.length);
    const visualIdx = wheelCandidates.findIndex((c) => c.id === finalWinner.id);
    const targetIdx = visualIdx >= 0 ? visualIdx : winnerIndex % segCount;
    const segAngle = 360 / segCount;
    const segmentCenterAngle = targetIdx * segAngle + segAngle / 2;

    // Girar al menos 6 vueltas completas (2160°) + posición exacta en el puntero superior (0°)
    const extraSpins = 360 * 6;
    const currentBase = wheelRotation - (wheelRotation % 360);
    const nextRotation = currentBase + extraSpins + (360 - segmentCenterAngle);

    setChosenWinner(null);
    setIsSpinning(true);
    setWheelRotation(nextRotation);

    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    spinTimeoutRef.current = setTimeout(() => {
      setIsSpinning(false);
      setChosenWinner(finalWinner);
    }, 4200);
  };

  const handleResetSpin = () => {
    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    setIsSpinning(false);
    setChosenWinner(null);
    setWheelRotation(0);
  };

  const handleConfirmWinner = (order) => {
    if (!order || !onToggleWinner) return;
    const prizeLabel = selectedPrize
      ? `${selectedPrize.badge}: ${selectedPrize.title}`
      : giveaway?.prizeName || 'Premio Oficial';
    onToggleWinner(order.id, prizeLabel);
    showToast(`${order.customerName} registrado como ganador de ${prizeLabel}`);
  };

  const handleStatusChange = async (orderId, nextStatus) => {
    await updateOrderStatus(orderId, nextStatus);
    if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
      setSelectedOrderDetails((prev) => ({ ...prev, status: nextStatus }));
    }
    const label = ORDER_STATUSES.find((s) => s.id === nextStatus)?.label || nextStatus;
    showToast(`Estado actualizado a: ${label}`);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualForm.name.trim() || !manualForm.phone.trim()) return;

    if (onAddManualOrder) {
      onAddManualOrder({
        customerName: manualForm.name.trim(),
        phone: manualForm.phone.trim(),
        deliveryType: 'takeaway',
        address: 'Registro manual en local',
        total: Number(manualForm.total) || 0,
        paymentMethod: 'Mostrador',
        status: 'pendiente',
        items: [
          {
            name: manualForm.concept.trim() || 'Pedido en mostrador',
            quantity: 1,
            price: Number(manualForm.total) || 0,
            subtotal: Number(manualForm.total) || 0,
          },
        ],
        participatingGiveaway: true,
      });
    }

    setManualForm({ name: '', phone: '', concept: 'Pedido en mostrador', total: '' });
    setIsManualModalOpen(false);
    showToast('Pedido / participante registrado');
  };

  // Generador de sectores SVG para la ruleta circular
  const renderWheelSectors = () => {
    const count = wheelCandidates.length;
    if (count === 0) return null;

    if (count === 1) {
      const only = wheelCandidates[0];
      return (
        <g>
          <circle cx="160" cy="160" r="150" fill="#0F172A" />
          <text
            x="160"
            y="90"
            fill="#FFFFFF"
            fontSize="12"
            fontWeight="700"
            textAnchor="middle"
          >
            {only.customerName}
          </text>
        </g>
      );
    }

    const radius = 150;
    const center = 160;
    const anglePerSlice = 360 / count;

    return wheelCandidates.map((cand, i) => {
      const startAngle = i * anglePerSlice - 90;
      const endAngle = (i + 1) * anglePerSlice - 90;
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArcFlag = anglePerSlice > 180 ? 1 : 0;
      const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      const midAngle = startAngle + anglePerSlice / 2;
      const textRadius = radius * 0.62;
      const tx = center + textRadius * Math.cos((midAngle * Math.PI) / 180);
      const ty = center + textRadius * Math.sin((midAngle * Math.PI) / 180);
      const shortName =
        (cand.customerName || 'Cliente').length > 13
          ? `${cand.customerName.slice(0, 12)}…`
          : cand.customerName || 'Cliente';

      return (
        <g key={cand.id || i}>
          <path
            d={d}
            fill={WHEEL_COLORS[i % WHEEL_COLORS.length]}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <text
            x={tx}
            y={ty}
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="600"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${midAngle}, ${tx}, ${ty})`}
          >
            {shortName}
          </text>
        </g>
      );
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {toastMessage && (
        <div className="p-3 rounded-xl bg-slate-900 text-white font-sub font-medium text-xs shadow-md flex items-center gap-2">
          <Icon name="check_circle" size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cabecera Simple y Directa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-lg sm:text-xl text-slate-900">
            Pedidos, Estados y Sorteo
          </h3>
          <p className="font-sub text-xs text-slate-500 mt-0.5">
            Gestioná el estado de despacho de cada pedido y realizá el sorteo oficial.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              handleResetSpin();
              setIsLotteryModalOpen(true);
            }}
            className="btn-cartoon-primary text-xs py-2 px-4"
          >
            <Icon name="casino" size={16} />
            <span>Abrir Ruleta de Sorteo</span>
          </button>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="btn-cartoon-white text-xs py-2 px-3.5"
          >
            <Icon name="add" size={16} />
            <span>Cargar Manual</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* BARRA DE BÚSQUEDA Y FILTROS VISUALES DE ESTADO */}
      {/* ============================================================== */}
      <div className="bg-white p-4 rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center">
            <Icon name="search" size={18} />
          </div>
          <input
            type="text"
            placeholder="Buscar por cliente, teléfono o N° de ticket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
          />
        </div>

        {/* Filtros de Estado */}
        <div className="flex items-center gap-1.5 overflow-x-auto cartoon-scrollbar-horizontal pb-1.5 py-0.5">
          {[
            { id: 'all', label: `Todos (${statusCounts.all})`, dot: null },
            { id: 'pendiente', label: `Pendientes (${statusCounts.pendiente})`, dot: 'bg-amber-500' },
            { id: 'preparacion', label: `En preparación (${statusCounts.preparacion})`, dot: 'bg-blue-500' },
            { id: 'enviado', label: `Enviados (${statusCounts.enviado})`, dot: 'bg-emerald-500' },
            { id: 'winners', label: `Ganadores (${statusCounts.winners})`, dot: 'bg-rose-500' },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-2 rounded-2xl font-sub font-bold text-xs whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-all border-2 ${
                  active
                    ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-display'
                    : 'bg-white text-cartoon-ink/75 hover:bg-cartoon-cream border-cartoon-ink/20'
                }`}
              >
                {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot}`} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* LISTADO LIMPIO DE PEDIDOS Y CLIENTES */}
      {/* ============================================================== */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs p-10 text-center">
          <p className="font-display text-base text-cartoon-ink mb-1">No hay pedidos en esta vista</p>
          <p className="font-sub font-semibold text-xs text-gray-500">
            Cambiá el filtro de estado o realizá otra búsqueda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const currentStId = normalizeStatus(order.status);
            const stConfig =
              ORDER_STATUSES.find((s) => s.id === currentStId) || ORDER_STATUSES[0];

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all"
              >
                {/* Columna Izquierda: Datos del Cliente y Pedido */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-xs px-2.5 py-1 rounded-xl bg-cartoon-cream border-2 border-cartoon-ink/20 text-cartoon-ink">
                      #{order.ticketNumber || '1001'}
                    </span>

                    <h4 className="font-display text-base text-cartoon-ink truncate">
                      {order.customerName}
                    </h4>

                    {order.phone && (
                      <a
                        href={buildWhatsAppUrl(order.phone, `Hola ${order.customerName}, te escribimos de Trico's sobre tu pedido.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-sub font-bold text-xs transition-colors"
                      >
                        <Icon name="call" size={13} />
                        <span>{order.phone}</span>
                      </a>
                    )}

                    {order.isWinner && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-sub font-bold text-[11px]">
                        Ganador: {order.winnerPrize || 'Sorteo'}
                      </span>
                    )}

                    <span className="font-sub text-xs text-slate-400">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  {/* Resumen conciso de productos y dirección */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-sub text-slate-500">
                    <span className="font-medium text-slate-700">
                      {order.deliveryType === 'delivery' ? 'Envío a domicilio' : 'Retiro en local'}
                    </span>
                    {order.address && (
                      <span className="truncate max-w-xs">• {order.address}</span>
                    )}
                    {order.mapUrl && (
                      <a
                        href={order.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-900 font-semibold hover:underline inline-flex items-center gap-0.5"
                      >
                        <Icon name="location_on" size={13} className="text-rose-600" />
                        <span>Mapa</span>
                      </a>
                    )}
                  </div>

                  {Array.isArray(order.items) && order.items.length > 0 && (
                    <p className="font-sub text-xs text-slate-600 truncate pt-0.5">
                      {order.items.map((it) => `${it.quantity}x ${it.name}`).join(' | ')}
                    </p>
                  )}
                </div>

                {/* Columna Derecha: Selector Sobrio de Estado, Total y Acciones */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  {/* Selector directo de Estado (Pendiente / En preparación / Enviado) */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {ORDER_STATUSES.map((st) => {
                      const active = currentStId === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleStatusChange(order.id, st.id)}
                          className={`px-2.5 py-1 rounded-lg font-sub font-semibold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all ${
                            active
                              ? `${st.badgeClass} border shadow-2xs`
                              : 'text-slate-500 hover:text-slate-800 border border-transparent'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dotClass}`} />
                          <span>{st.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-right min-w-[80px]">
                    <span className="font-display text-sm sm:text-base text-slate-900 block">
                      {money(order.total)}
                    </span>
                    <span className="font-sub text-[10px] text-slate-400">
                      {order.paymentMethod || 'Efectivo'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedOrderDetails(order)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-sub font-semibold text-xs cursor-pointer transition-colors"
                    >
                      Ficha
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(order.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                      title="Eliminar"
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
      {/* MODAL 1: RULETA VISUAL MODERNA Y PROFESIONAL */}
      {/* ============================================================== */}
      {isLotteryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-modalIn">
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-display text-base sm:text-lg">Ruleta Oficial de Sorteo</h3>
                <p className="font-sub text-xs text-slate-400">
                  {orders.length} participantes registrados
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleResetSpin();
                  setIsLotteryModalOpen(false);
                }}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Selector de Premio a Sortear */}
              <div>
                <label className="block font-sub font-semibold text-xs text-slate-500 uppercase tracking-wider mb-2">
                  Premio en juego:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {officialPrizes.map((p) => {
                    const active = selectedPrize?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={isSpinning}
                        onClick={() => setSelectedPrizeId(p.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className={`font-sub font-bold text-[10px] block ${active ? 'text-amber-400' : 'text-slate-400'}`}>
                          {p.badge}
                        </span>
                        <span className="font-display text-xs line-clamp-1 mt-0.5">
                          {p.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contenedor Central de la Ruleta Circular y Resultado */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Rueda SVG */}
                <div className="md:col-span-7 flex flex-col items-center justify-center relative">
                  {/* Puntero Superior */}
                  <div className="z-20 -mb-3">
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-rose-600 filter drop-shadow-sm" />
                  </div>

                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full p-2 bg-slate-900 shadow-xl border-4 border-slate-800 flex items-center justify-center">
                    <svg
                      viewBox="0 0 320 320"
                      className="w-full h-full rounded-full overflow-hidden"
                      style={{
                        transform: `rotate(${wheelRotation}deg)`,
                        transition: isSpinning
                          ? 'transform 4.2s cubic-bezier(0.15, 0.85, 0.15, 1)'
                          : 'none',
                      }}
                    >
                      {renderWheelSectors()}
                    </svg>

                    {/* Centro de la Ruleta */}
                    <div className="absolute w-14 h-14 rounded-full bg-white border-4 border-slate-900 shadow-md flex items-center justify-center">
                      <img
                        src="/assets/logo.svg"
                        alt="Trico's"
                        className="w-9 h-9 object-contain"
                      />
                    </div>
                  </div>
                </div>

                {/* Panel de Control y Ganador */}
                <div className="md:col-span-5 flex flex-col justify-between space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center min-h-[150px] flex flex-col items-center justify-center">
                    {isSpinning ? (
                      <div className="space-y-2">
                        <span className="inline-block w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                        <p className="font-display text-sm text-slate-900">Girando ruleta...</p>
                        <p className="font-sub text-xs text-slate-500">Seleccionando ganador al azar</p>
                      </div>
                    ) : chosenWinner ? (
                      <div className="space-y-1.5 animate-fadeIn">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-sub font-bold text-[10px] uppercase">
                          Ganador Seleccionado
                        </span>
                        <h4 className="font-display text-lg text-slate-900">
                          {chosenWinner.customerName}
                        </h4>
                        <p className="font-sub text-xs text-slate-600">
                          Ticket #{chosenWinner.ticketNumber} • {chosenWinner.phone || 'Sin teléfono'}
                        </p>
                        <p className="font-sub font-semibold text-xs text-amber-700 pt-1">
                          {selectedPrize?.title}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-display text-sm text-slate-700">Listo para sortear</p>
                        <p className="font-sub text-xs text-slate-400">
                          Presioná el botón para girar la ruleta
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Acciones de la Ruleta */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={isSpinning || orders.length === 0}
                      onClick={handleStartSpin}
                      className="w-full btn-cartoon-red py-3 text-xs sm:text-sm disabled:opacity-40"
                    >
                      <span>{chosenWinner ? 'Volver a Girar' : 'Girar Ruleta'}</span>
                    </button>

                    {chosenWinner && !isSpinning && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleConfirmWinner(chosenWinner)}
                          className="btn-cartoon-primary py-2 text-xs"
                        >
                          Guardar Ganador
                        </button>

                        {chosenWinner.phone && (
                          <a
                            href={buildWhatsAppUrl(
                              chosenWinner.phone,
                              `Hola ${chosenWinner.customerName}, te contactamos de Trico's para avisarte que ganaste el sorteo (${selectedPrize?.title}) con tu ticket #${chosenWinner.ticketNumber}.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-cartoon-green py-2 text-xs no-underline"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    )}

                    {(chosenWinner || wheelRotation > 0) && !isSpinning && (
                      <button
                        type="button"
                        onClick={handleResetSpin}
                        className="w-full btn-cartoon-white py-2 text-xs"
                      >
                        Reiniciar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: FICHA SIMPLIFICADA DEL CLIENTE Y PEDIDO */}
      {/* ============================================================== */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4 my-auto animate-modalIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs text-slate-400">
                  Ticket #{selectedOrderDetails.ticketNumber}
                </span>
                <h3 className="font-display text-base text-slate-900">
                  {selectedOrderDetails.customerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-sub">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Teléfono</span>
                <span className="font-semibold text-slate-900">
                  {selectedOrderDetails.phone || 'No especificado'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Modalidad</span>
                <span className="font-semibold text-slate-900">
                  {selectedOrderDetails.deliveryType === 'delivery' ? 'Envío a domicilio' : 'Retiro en local'}
                </span>
              </div>
              {selectedOrderDetails.address && (
                <div className="flex justify-between py-1 border-b border-slate-100 gap-4">
                  <span className="text-slate-500 flex-shrink-0">Dirección</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {selectedOrderDetails.address}
                  </span>
                </div>
              )}
              {selectedOrderDetails.mapUrl && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Ubicación</span>
                  <a
                    href={selectedOrderDetails.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-rose-600 hover:underline"
                  >
                    Abrir en Google Maps
                  </a>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs font-sub">
              {(selectedOrderDetails.items || []).map((it, i) => (
                <div key={i} className="flex justify-between text-slate-700">
                  <span>
                    <strong>{it.quantity}x</strong> {it.name}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {money(it.subtotal || it.price * it.quantity)}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-200 flex justify-between font-display text-sm text-slate-900">
                <span>Total</span>
                <span>{money(selectedOrderDetails.total)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              {selectedOrderDetails.phone && (
                <a
                  href={buildWhatsAppUrl(
                    selectedOrderDetails.phone,
                    `Hola ${selectedOrderDetails.customerName}, nos comunicamos de Trico's por tu pedido #${selectedOrderDetails.ticketNumber}.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 btn-cartoon-green py-2 text-xs no-underline"
                >
                  Contactar por WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="btn-cartoon-white py-2 px-4 text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: CARGAR PEDIDO / PARTICIPANTE MANUAL */}
      {/* ============================================================== */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4 my-auto animate-modalIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-display text-base text-slate-900">Cargar Pedido Manual</h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3.5">
              <div>
                <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                  Nombre del Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  placeholder="Nombre y apellido"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                  Teléfono Celular *
                </label>
                <input
                  type="tel"
                  required
                  value={manualForm.phone}
                  onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                  placeholder="Ej: 3804123456"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                    Detalle
                  </label>
                  <input
                    type="text"
                    value={manualForm.concept}
                    onChange={(e) => setManualForm({ ...manualForm, concept: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                    Total ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={manualForm.total}
                    onChange={(e) => setManualForm({ ...manualForm, total: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="btn-cartoon-white py-2 px-4 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-cartoon-primary py-2 px-5 text-xs"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: CONFIRMAR ELIMINACIÓN */}
      {/* ============================================================== */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="relative w-full max-w-xs bg-white rounded-2xl border border-slate-200 shadow-xl p-5 text-center space-y-4 my-auto animate-modalIn">
            <h3 className="font-display text-sm text-slate-900">Eliminar registro</h3>
            <p className="font-sub text-xs text-slate-500">
              ¿Confirmás eliminar este pedido del listado?
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="btn-cartoon-white py-2 px-4 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteOrder) onDeleteOrder(deleteConfirmId);
                  setDeleteConfirmId(null);
                  showToast('Registro eliminado');
                }}
                className="btn-cartoon-red py-2 px-4 text-xs"
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
