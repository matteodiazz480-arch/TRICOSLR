import React, { useState, useEffect } from 'react';
import { Icon } from '../Icon';
import { DEFAULT_PROMOTIONS_DATA } from '../../lib/promotionsStore';

const AVAILABLE_ICONS = [
  { id: 'emoji_events', label: 'Trofeo' },
  { id: 'devices', label: 'Web / Pantalla' },
  { id: 'lunch_dining', label: 'Hamburguesa' },
  { id: 'fastfood', label: 'Pollo / Comida' },
  { id: 'share', label: 'Redes Sociales' },
  { id: 'card_giftcard', label: 'Regalo' },
  { id: 'local_pizza', label: 'Pizza' },
  { id: 'local_shipping', label: 'Delivery' },
  { id: 'stars', label: 'Estrella' },
];

export const GiveawayAdminModal = ({
  isOpen,
  onClose,
  giveaway,
  orders = [],
  onUpdateGiveaway,
  onDeleteGiveaway,
  onRestoreGiveaway,
  onToggleWinner,
}) => {
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'prizes' | 'winners'

  // Estado del formulario de sorteo
  const [formState, setFormState] = useState({
    title: '',
    subtitle: '',
    drawDate: '',
    winnersCount: 4,
    active: true,
    deleted: false,
    prizes: [],
  });

  // Estado para nuevo premio o edición de premio
  const [editingPrizeId, setEditingPrizeId] = useState(null);
  const [prizeForm, setPrizeForm] = useState({
    badge: '',
    title: '',
    detail: '',
    icon: 'emoji_events',
  });
  const [isAddingPrize, setIsAddingPrize] = useState(false);

  // Estado para asignación manual de ganador
  const [manualWinnerOrderId, setManualWinnerOrderId] = useState('');
  const [manualWinnerPrize, setManualWinnerPrize] = useState('');

  // Mensaje de feedback
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Confirmación de eliminación
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (giveaway) {
      const defaultPrizes = DEFAULT_PROMOTIONS_DATA.giveaway.prizes;
      const loadedPrizes =
        Array.isArray(giveaway.prizes) && giveaway.prizes.length > 0
          ? giveaway.prizes
          : defaultPrizes;

      setFormState({
        title: giveaway.title || DEFAULT_PROMOTIONS_DATA.giveaway.title,
        subtitle: giveaway.subtitle || DEFAULT_PROMOTIONS_DATA.giveaway.subtitle,
        drawDate: giveaway.drawDate || DEFAULT_PROMOTIONS_DATA.giveaway.drawDate,
        winnersCount: giveaway.winnersCount || loadedPrizes.length || 4,
        active: giveaway.active !== false,
        deleted: giveaway.deleted === true,
        prizes: loadedPrizes,
      });

      if (loadedPrizes.length > 0 && !manualWinnerPrize) {
        setManualWinnerPrize(`${loadedPrizes[0].badge}: ${loadedPrizes[0].title}`);
      }
    }
  }, [giveaway, isOpen]);

  if (!isOpen) return null;

  const showToast = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 2600);
  };

  const handleSaveGeneral = () => {
    if (!formState.title.trim()) {
      showToast('El título del sorteo no puede estar vacío');
      return;
    }
    onUpdateGiveaway({
      title: formState.title.trim(),
      subtitle: formState.subtitle.trim(),
      drawDate: formState.drawDate.trim(),
      winnersCount: Number(formState.winnersCount) || 1,
      active: formState.active,
      deleted: formState.deleted,
    });
    showToast('Configuración del sorteo guardada');
  };

  // Guardar premio (nuevo o editado)
  const handleSavePrize = (e) => {
    e.preventDefault();
    if (!prizeForm.title.trim()) return;

    let updatedPrizes = [...formState.prizes];
    if (editingPrizeId) {
      // Editar
      updatedPrizes = updatedPrizes.map((p) =>
        p.id === editingPrizeId
          ? {
              ...p,
              badge: prizeForm.badge.trim() || p.badge,
              title: prizeForm.title.trim(),
              detail: prizeForm.detail.trim(),
              icon: prizeForm.icon || 'emoji_events',
            }
          : p
      );
    } else {
      // Agregar nuevo
      const nextId =
        updatedPrizes.length > 0
          ? Math.max(...updatedPrizes.map((p) => Number(p.id) || 0)) + 1
          : 1;
      const defaultBadge = `${updatedPrizes.length + 1}° PREMIO`;
      const newPrize = {
        id: nextId,
        badge: prizeForm.badge.trim() || defaultBadge,
        title: prizeForm.title.trim(),
        detail: prizeForm.detail.trim(),
        icon: prizeForm.icon || 'emoji_events',
      };
      updatedPrizes.push(newPrize);
    }

    setFormState((prev) => ({
      ...prev,
      prizes: updatedPrizes,
      winnersCount: Math.max(prev.winnersCount, updatedPrizes.length),
    }));

    onUpdateGiveaway({
      prizes: updatedPrizes,
      winnersCount: Math.max(formState.winnersCount, updatedPrizes.length),
    });

    setEditingPrizeId(null);
    setIsAddingPrize(false);
    setPrizeForm({ badge: '', title: '', detail: '', icon: 'emoji_events' });
    showToast(editingPrizeId ? 'Premio actualizado' : 'Nuevo premio agregado');
  };

  // Iniciar edición de premio
  const handleStartEditPrize = (prize) => {
    setEditingPrizeId(prize.id);
    setPrizeForm({
      badge: prize.badge || '',
      title: prize.title || '',
      detail: prize.detail || '',
      icon: prize.icon || 'emoji_events',
    });
    setIsAddingPrize(true);
  };

  // Eliminar premio
  const handleDeletePrize = (prizeId) => {
    const updated = formState.prizes.filter((p) => p.id !== prizeId);
    setFormState((prev) => ({ ...prev, prizes: updated }));
    onUpdateGiveaway({ prizes: updated });
    showToast('Premio eliminado');
  };

  // Asignar ganador manualmente desde pedidos
  const handleAssignManualWinner = (e) => {
    e.preventDefault();
    if (!manualWinnerOrderId || !onToggleWinner) return;

    onToggleWinner(manualWinnerOrderId, manualWinnerPrize);
    setManualWinnerOrderId('');
    showToast('Ganador asignado correctamente');
  };

  // Cambiar premio de un ganador existente
  const handleChangeWinnerPrize = (orderId, newPrize) => {
    if (!onToggleWinner) return;
    onToggleWinner(orderId, newPrize);
    showToast('Premio de ganador actualizado');
  };

  // Quitar condición de ganador
  const handleRemoveWinner = (orderId) => {
    if (!onToggleWinner) return;
    onToggleWinner(orderId, null);
    showToast('Ganador desmarcado');
  };

  // Eliminar sorteo completo
  const handleConfirmDeleteGiveaway = () => {
    if (onDeleteGiveaway) {
      onDeleteGiveaway();
      setFormState((prev) => ({ ...prev, deleted: true, active: false }));
      setShowDeleteConfirm(false);
      showToast('Sorteo eliminado de la web y del panel');
      setTimeout(() => onClose(), 600);
    }
  };

  // Restaurar sorteo
  const handleRestore = () => {
    if (onRestoreGiveaway) {
      onRestoreGiveaway();
      setFormState((prev) => ({ ...prev, deleted: false, active: true }));
      showToast('Sorteo oficial restaurado');
    }
  };

  const currentWinners = orders.filter((o) => o.isWinner);
  const eligibleOrders = orders.filter((o) => !o.isWinner);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 select-none animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl border-3 border-cartoon-ink shadow-cartoon my-auto overflow-hidden animate-modalIn flex flex-col max-h-[92vh]">
        
        {/* Cabecera Estilo Cartoon */}
        <div className="px-5 sm:px-7 py-4 bg-cartoon-yellow border-b-3 border-cartoon-ink flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center text-cartoon-ink flex-shrink-0">
              <Icon name="campaign" size={22} />
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl text-cartoon-ink leading-tight">
                Administración de Sorteo y Premios
              </h3>
              <p className="font-sub font-semibold text-xs text-cartoon-ink/75">
                Configurá premios, ganadores, fecha de finalización y visibilidad pública.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-white hover:bg-cartoon-cream border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center text-cartoon-ink cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Feedback Toast */}
        {feedbackMsg && (
          <div className="px-5 py-2.5 bg-emerald-100 border-b-2 border-emerald-300 text-emerald-900 font-sub font-bold text-xs flex items-center gap-2">
            <Icon name="check_circle" size={16} className="text-emerald-700" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Pestañas de Navegación del Modal */}
        <div className="flex items-center border-b-2 border-cartoon-ink/15 px-4 sm:px-6 bg-[#FAF8F5] gap-2 overflow-x-auto no-scrollbar flex-shrink-0 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2.5 rounded-t-2xl font-sub font-bold text-xs sm:text-sm flex items-center gap-2 border-t-2 border-x-2 transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-white text-cartoon-ink border-cartoon-ink border-b-0 shadow-2xs font-display'
                : 'bg-transparent text-gray-500 border-transparent hover:text-cartoon-ink'
            }`}
          >
            <Icon name="tune" size={16} />
            <span>Configuración General</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prizes')}
            className={`px-4 py-2.5 rounded-t-2xl font-sub font-bold text-xs sm:text-sm flex items-center gap-2 border-t-2 border-x-2 transition-all cursor-pointer ${
              activeTab === 'prizes'
                ? 'bg-white text-cartoon-ink border-cartoon-ink border-b-0 shadow-2xs font-display'
                : 'bg-transparent text-gray-500 border-transparent hover:text-cartoon-ink'
            }`}
          >
            <Icon name="emoji_events" size={16} />
            <span>Premios ({formState.prizes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('winners')}
            className={`px-4 py-2.5 rounded-t-2xl font-sub font-bold text-xs sm:text-sm flex items-center gap-2 border-t-2 border-x-2 transition-all cursor-pointer ${
              activeTab === 'winners'
                ? 'bg-white text-cartoon-ink border-cartoon-ink border-b-0 shadow-2xs font-display'
                : 'bg-transparent text-gray-500 border-transparent hover:text-cartoon-ink'
            }`}
          >
            <Icon name="military_tech" size={16} />
            <span>Ganadores ({currentWinners.length}/{formState.winnersCount})</span>
          </button>
        </div>

        {/* Contenido Scrolleable del Modal */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Alerta de Sorteo Eliminado */}
          {formState.deleted && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-display text-sm">Este sorteo se encuentra ELIMINADO</p>
                <p className="font-sub text-xs text-rose-700">
                  No se muestra en la página pública de promociones. Podés restaurarlo con un solo clic.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRestore}
                className="btn-cartoon-green py-2 px-4 text-xs flex items-center gap-1.5"
              >
                <Icon name="restore" size={16} />
                <span>Restaurar Sorteo</span>
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1: CONFIGURACIÓN GENERAL */}
          {/* ============================================================== */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Título */}
                <div className="sm:col-span-2">
                  <label className="font-sub font-bold text-xs text-cartoon-ink block mb-1">
                    Título del Sorteo (Público)
                  </label>
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                    placeholder="GRAN SORTEO TRICO'S"
                  />
                </div>

                {/* Subtítulo */}
                <div className="sm:col-span-2">
                  <label className="font-sub font-bold text-xs text-cartoon-ink block mb-1">
                    Subtítulo / Instrucciones
                  </label>
                  <input
                    type="text"
                    value={formState.subtitle}
                    onChange={(e) => setFormState({ ...formState, subtitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                    placeholder="¡Con cada pedido en la web participás automáticamente por premios!"
                  />
                </div>

                {/* Fecha de Finalización / Sorteo */}
                <div>
                  <label className="font-sub font-bold text-xs text-cartoon-ink block mb-1">
                    Fecha de Finalización / Sortea
                  </label>
                  <input
                    type="text"
                    value={formState.drawDate}
                    onChange={(e) => setFormState({ ...formState, drawDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                    placeholder="Fin de mes (o ej: 31 de Diciembre)"
                  />
                </div>

                {/* Cantidad de Ganadores */}
                <div>
                  <label className="font-sub font-bold text-xs text-cartoon-ink block mb-1">
                    Cantidad Total de Ganadores
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formState.winnersCount}
                    onChange={(e) =>
                      setFormState({ ...formState, winnersCount: Math.max(1, Number(e.target.value)) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                  />
                </div>

                {/* Estado Activo / Pausado */}
                <div className="sm:col-span-2 flex items-center justify-between p-3.5 rounded-2xl bg-cartoon-cream border-2 border-cartoon-ink">
                  <div>
                    <span className="font-display text-sm text-cartoon-ink block">
                      Estado de Visibilidad
                    </span>
                    <span className="font-sub text-xs text-gray-500">
                      {formState.active
                        ? 'El banner del sorteo se muestra en la web pública.'
                        : 'El sorteo está pausado (oculto en la tienda pública).'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormState({ ...formState, active: !formState.active })}
                    className={`px-4 py-2 rounded-xl font-sub font-bold text-xs border-2 transition-all cursor-pointer ${
                      formState.active
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-500 shadow-2xs font-display'
                        : 'bg-gray-100 text-gray-500 border-gray-300'
                    }`}
                  >
                    {formState.active ? 'Sorteo Activo' : 'Sorteo Pausado'}
                  </button>
                </div>
              </div>

              {/* Botón de Guardar General */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveGeneral}
                  className="btn-cartoon-primary py-2.5 px-6 text-xs sm:text-sm"
                >
                  Guardar Información General
                </button>
              </div>

              {/* Zona de Peligro: Eliminar Sorteo Completo */}
              <div className="mt-8 pt-5 border-t-2 border-cartoon-ink/15">
                <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="font-display text-sm text-red-900">Eliminar Sorteo Completo</h5>
                    <p className="font-sub text-xs text-red-700">
                      Elimina el sorteo y hace que desaparezca de la página pública de promociones.
                    </p>
                  </div>

                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmDeleteGiveaway}
                        className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display text-xs border-2 border-cartoon-ink cursor-pointer"
                      >
                        Confirmar Eliminación
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1.5 rounded-xl bg-white text-gray-700 font-sub font-bold text-xs border border-gray-300 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-red-100 text-red-700 font-display text-xs border-2 border-red-400 shadow-cartoon-xs cursor-pointer"
                    >
                      Eliminar Sorteo
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: PREMIOS DEL SORTEO (AGREGAR, EDITAR, ELIMINAR) */}
          {/* ============================================================== */}
          {activeTab === 'prizes' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display text-base sm:text-lg text-cartoon-ink">
                    Premios en Juego
                  </h4>
                  <p className="font-sub text-xs text-gray-500">
                    Los premios se muestran en la tarjeta pública del sorteo y en la ruleta oficial.
                  </p>
                </div>

                {!isAddingPrize && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPrizeId(null);
                      setPrizeForm({
                        badge: `${formState.prizes.length + 1}° PREMIO`,
                        title: '',
                        detail: '',
                        icon: 'emoji_events',
                      });
                      setIsAddingPrize(true);
                    }}
                    className="btn-cartoon-primary py-2 px-3.5 text-xs flex items-center gap-1.5"
                  >
                    <Icon name="add" size={16} />
                    <span>Agregar Premio</span>
                  </button>
                )}
              </div>

              {/* Formulario de Agregar / Editar Premio */}
              {isAddingPrize && (
                <form
                  onSubmit={handleSavePrize}
                  className="p-4 rounded-2xl bg-cartoon-cream border-2 border-cartoon-ink shadow-cartoon-xs space-y-3 animate-fadeIn"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-cartoon-ink/15">
                    <span className="font-display text-xs sm:text-sm text-cartoon-ink">
                      {editingPrizeId ? 'Editar Premio' : 'Nuevo Premio'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingPrize(false)}
                      className="text-gray-500 hover:text-cartoon-ink text-xs font-sub font-bold cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-sub font-bold text-xs text-cartoon-ink block mb-1">
                        Insignia / Orden
                      </label>
                      <input
                        type="text"
                        required
                        value={prizeForm.badge}
                        onChange={(e) => setPrizeForm({ ...prizeForm, badge: e.target.value })}
                        placeholder="1° PREMIO"
                        className="w-full px-3 py-2 rounded-xl border-2 border-cartoon-ink/30 font-sub text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-ink uppercase"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-sub font-bold text-xs text-cartoon-ink block mb-1">
                        Título del Premio
                      </label>
                      <input
                        type="text"
                        required
                        value={prizeForm.title}
                        onChange={(e) => setPrizeForm({ ...prizeForm, title: e.target.value })}
                        placeholder="Combo Carioca + Delivery"
                        className="w-full px-3 py-2 rounded-xl border-2 border-cartoon-ink/30 font-sub text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-sub font-bold text-xs text-cartoon-ink block mb-1">
                        Detalle / Descripción Corta
                      </label>
                      <input
                        type="text"
                        value={prizeForm.detail}
                        onChange={(e) => setPrizeForm({ ...prizeForm, detail: e.target.value })}
                        placeholder="Envío 100% bonificado"
                        className="w-full px-3 py-2 rounded-xl border-2 border-cartoon-ink/30 font-sub text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                      />
                    </div>

                    <div>
                      <label className="font-sub font-bold text-xs text-cartoon-ink block mb-1">
                        Ícono
                      </label>
                      <select
                        value={prizeForm.icon}
                        onChange={(e) => setPrizeForm({ ...prizeForm, icon: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border-2 border-cartoon-ink/30 font-sub text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-ink bg-white"
                      >
                        {AVAILABLE_ICONS.map((ic) => (
                          <option key={ic.id} value={ic.id}>
                            {ic.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingPrize(false)}
                      className="px-3 py-1.5 rounded-xl border border-gray-300 font-sub text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-cartoon-primary py-1.5 px-4 text-xs"
                    >
                      Guardar Premio
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Premios Actuales */}
              <div className="space-y-2.5">
                {formState.prizes.map((prize, idx) => (
                  <div
                    key={prize.id || idx}
                    className="p-3.5 rounded-2xl bg-white border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-cartoon-yellow/30 border border-cartoon-ink flex items-center justify-center flex-shrink-0 text-cartoon-ink">
                        <Icon name={prize.icon || 'emoji_events'} size={20} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-display text-[10px] text-cartoon-red font-black block">
                          {prize.badge || `${idx + 1}° PREMIO`}
                        </span>
                        <h5 className="font-sub font-bold text-xs sm:text-sm text-cartoon-ink truncate">
                          {prize.title}
                        </h5>
                        <p className="font-sub text-[11px] text-gray-500 truncate">
                          {prize.detail || 'Sin descripción'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditPrize(prize)}
                        className="p-2 rounded-xl bg-cartoon-cream hover:bg-cartoon-yellow/40 border border-cartoon-ink text-cartoon-ink cursor-pointer active:scale-95"
                        title="Editar premio"
                      >
                        <Icon name="edit" size={15} />
                      </button>

                      {formState.prizes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeletePrize(prize.id)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 cursor-pointer active:scale-95"
                          title="Eliminar premio"
                        >
                          <Icon name="delete" size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: GESTIÓN DE GANADORES */}
          {/* ============================================================== */}
          {activeTab === 'winners' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-display text-base sm:text-lg text-cartoon-ink">
                  Ganadores del Sorteo
                </h4>
                <p className="font-sub text-xs text-gray-500">
                  Visualizá, modificá los premios asignados o desmarcá ganadores según corresponda.
                </p>
              </div>

              {/* Ganadores Actuales */}
              <div className="space-y-3">
                {currentWinners.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 text-center">
                    <Icon name="military_tech" size={28} className="text-gray-400 mx-auto mb-1" />
                    <p className="font-display text-sm text-gray-600">Aún no hay ganadores registrados</p>
                    <p className="font-sub text-xs text-gray-400 mt-0.5">
                      Podés girar la ruleta en la sección de pedidos o asignar uno manualmente a continuación.
                    </p>
                  </div>
                ) : (
                  currentWinners.map((w) => (
                    <div
                      key={w.id}
                      className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-200 border border-cartoon-ink flex items-center justify-center flex-shrink-0 text-cartoon-ink font-display text-sm">
                          ★
                        </div>
                        <div className="min-w-0">
                          <span className="font-display text-[10px] text-amber-800 uppercase block">
                            Ganador Confirmado • Ticket #{w.ticketNumber}
                          </span>
                          <h5 className="font-sub font-bold text-xs sm:text-sm text-cartoon-ink truncate">
                            {w.customerName}
                          </h5>
                          <span className="font-sub text-[11px] text-gray-600 block">
                            {w.phone || 'Sin teléfono'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Selector para cambiar premio */}
                        <select
                          value={w.winnerPrize || ''}
                          onChange={(e) => handleChangeWinnerPrize(w.id, e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl border border-amber-300 bg-white font-sub text-xs text-cartoon-ink focus:outline-none"
                        >
                          {formState.prizes.map((p) => {
                            const label = `${p.badge}: ${p.title}`;
                            return (
                              <option key={p.id} value={label}>
                                {label}
                              </option>
                            );
                          })}
                        </select>

                        {/* Botón para quitar ganador */}
                        <button
                          type="button"
                          onClick={() => handleRemoveWinner(w.id)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 font-sub font-bold text-xs cursor-pointer active:scale-95"
                          title="Quitar de ganadores"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Asignación Manual de Ganador desde Pedidos */}
              <div className="p-4 rounded-2xl bg-cartoon-cream border-2 border-cartoon-ink shadow-cartoon-xs space-y-3">
                <div>
                  <h5 className="font-display text-xs sm:text-sm text-cartoon-ink">
                    Asignar Ganador Manualmente
                  </h5>
                  <p className="font-sub text-[11px] text-gray-500">
                    Seleccioná cualquier cliente de los pedidos realizados y asignale un premio.
                  </p>
                </div>

                <form onSubmit={handleAssignManualWinner} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-6">
                    <label className="font-sub font-bold text-xs text-cartoon-ink block mb-1">
                      Cliente / Pedido
                    </label>
                    <select
                      required
                      value={manualWinnerOrderId}
                      onChange={(e) => setManualWinnerOrderId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border-2 border-cartoon-ink/30 font-sub text-xs text-cartoon-ink bg-white focus:outline-none focus:border-cartoon-ink"
                    >
                      <option value="">-- Seleccionar participante --</option>
                      {eligibleOrders.map((o) => (
                        <option key={o.id} value={o.id}>
                          #{o.ticketNumber} - {o.customerName} ({o.phone || 'Sin tel'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="font-sub font-bold text-xs text-cartoon-ink block mb-1">
                      Premio a Asignar
                    </label>
                    <select
                      value={manualWinnerPrize}
                      onChange={(e) => setManualWinnerPrize(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border-2 border-cartoon-ink/30 font-sub text-xs text-cartoon-ink bg-white focus:outline-none focus:border-cartoon-ink"
                    >
                      {formState.prizes.map((p) => {
                        const val = `${p.badge}: ${p.title}`;
                        return (
                          <option key={p.id} value={val}>
                            {val}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={!manualWinnerOrderId}
                      className="btn-cartoon-primary w-full py-2 px-3 text-xs disabled:opacity-50"
                    >
                      Asignar
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

        </div>

        {/* Pie del Modal */}
        <div className="px-5 sm:px-7 py-3.5 bg-gray-50 border-t-2 border-cartoon-ink/15 flex items-center justify-between flex-shrink-0">
          <span className="font-sub text-xs text-gray-500">
            {formState.deleted
              ? 'Sorteo marcado como eliminado'
              : `${formState.prizes.length} premios • ${formState.winnersCount} ganadores configurados`}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="btn-cartoon-white py-2 px-5 text-xs sm:text-sm"
          >
            Listo
          </button>
        </div>

      </div>
    </div>
  );
};
