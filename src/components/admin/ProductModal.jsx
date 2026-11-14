import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../Icon';
import { CATEGORIES } from '../../data/products';
import { sanitizeText, sanitizeNumber } from '../../lib/security';
import { compressImageFile } from '../../lib/imageCompressor';

export const ProductModal = ({ isOpen, onClose, product, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'burgers',
    price: 12000,
    emoji: '🍔',
    image: '',
    description: '',
    badge: '',
    hasProteinChoice: false,
    active: true,
  });
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        category: product.category || 'burgers',
        price: product.price || (product.variants ? product.variants[0]?.price : 12000),
        emoji: product.emoji || '🍔',
        image: product.image || '',
        description: product.description || '',
        badge: product.badge || '',
        hasProteinChoice: !!product.hasProteinChoice,
        active: product.active !== undefined ? product.active : true,
      });
    } else {
      setFormData({
        name: '',
        category: 'burgers',
        price: 12000,
        emoji: '🍔',
        image: '',
        description: '',
        badge: '',
        hasProteinChoice: false,
        active: true,
      });
    }
    setError('');
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleImageFile = async (file) => {
    if (!file) return;
    try {
      setIsProcessingImage(true);
      setError('');
      const compressedUrl = await compressImageFile(file, 800, 800, 0.82);
      setFormData((prev) => ({ ...prev, image: compressedUrl }));
    } catch (err) {
      setError(err.message || 'Error al procesar la imagen');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = sanitizeText(formData.name);
    if (!cleanName) {
      setError('El nombre del plato es obligatorio');
      return;
    }

    const cleanPrice = sanitizeNumber(formData.price, 0);

    const payload = {
      ...formData,
      id: product?.id || `prod-${Date.now()}`,
      name: cleanName,
      description: sanitizeText(formData.description),
      badge: sanitizeText(formData.badge),
      price: cleanPrice,
      image: formData.image || '',
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-5 select-none">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border-3 sm:border-4 border-cartoon-ink shadow-cartoon-lg overflow-hidden flex flex-col max-h-[92vh] my-auto animate-modalIn">
        
        {/* Cabecera Limpia y Espaciosa */}
        <div className="p-4 sm:p-5 bg-cartoon-yellow border-b-3 border-cartoon-ink flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center text-2xl flex-shrink-0">
              🍔
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl text-cartoon-ink leading-tight">
                {product ? 'EDITAR PLATO' : 'NUEVO PLATO EN CARTA'}
              </h3>
              <p className="font-sub font-bold text-xs text-cartoon-ink/75">
                {product ? `Modificando: ${product.name}` : 'Agregá un nuevo ítem a la carta digital'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white hover:bg-cartoon-cream-dark border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center text-cartoon-ink active:scale-95 cursor-pointer transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Formulario Limpio, Organizado y sin saturar */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-cartoon-red text-white rounded-xl font-sub font-bold text-xs border-2 border-cartoon-ink flex items-center gap-2">
              <Icon name="error" size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Subir / Cambiar Foto del Plato */}
          <div>
            <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1.5">
              Foto del Plato:
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
              }}
              className="hidden"
            />

            {formData.image ? (
              <div className="relative w-full h-36 sm:h-44 rounded-2xl border-2 sm:border-3 border-cartoon-ink overflow-hidden bg-cartoon-cream shadow-cartoon-xs group">
                <img
                  src={formData.image}
                  alt={formData.name || 'Vista previa'}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-cartoon-primary py-2 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="photo_camera" size={16} />
                    <span>Cambiar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                    className="px-3 py-2 rounded-xl bg-cartoon-red text-white font-sub font-bold text-xs border-2 border-cartoon-ink shadow-cartoon-xs flex items-center gap-1.5 cursor-pointer hover:bg-cartoon-red-dark transition-colors"
                  >
                    <Icon name="delete" size={16} />
                    <span>Quitar</span>
                  </button>
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-emerald-500 text-white font-sub font-bold text-[10px] shadow-xs pointer-events-none">
                  ✓ Foto Cargada
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-5 px-4 rounded-2xl border-2 sm:border-3 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-cartoon-red bg-cartoon-yellow/20 scale-[1.01]'
                    : 'border-cartoon-ink/30 bg-cartoon-cream/30 hover:bg-cartoon-cream/60 hover:border-cartoon-ink'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-white border-2 border-cartoon-ink flex items-center justify-center text-cartoon-ink mb-1.5 shadow-cartoon-xs">
                  <Icon name={isProcessingImage ? 'sync' : 'add_photo_alternate'} size={22} className={isProcessingImage ? 'animate-spin' : ''} />
                </div>
                <p className="font-display text-xs sm:text-sm text-cartoon-ink">
                  {isProcessingImage ? 'Optimizando foto...' : 'Arrastrá una foto o hacé clic para subirla'}
                </p>
                <span className="font-sub text-[11px] text-gray-500 mt-0.5">
                  JPG, PNG o WEBP (se adapta automáticamente)
                </span>
              </div>
            )}
          </div>

          {/* Nombre del Producto */}
          <div>
            <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
              Nombre del Producto:
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Triple Cheddar Bacon"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:bg-yellow-50 shadow-cartoon-xs"
            />
          </div>

          {/* Fila: Categoría y Precio (Bien distribuidos) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                Categoría en Carta:
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink bg-white focus:outline-none shadow-cartoon-xs"
              >
                {CATEGORIES.filter((c) => c.id !== 'todos').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                Precio ($ ARS):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-display text-xs text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="12000"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border-2 border-cartoon-ink font-sub font-bold text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-xs"
                />
              </div>
            </div>
          </div>

          {/* Descripción e Ingredientes para el cliente */}
          <div>
            <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
              Descripción del Plato (visible para el cliente):
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ej: Pan brioche artesanal, doble carne premium, triple cheddar, bacon crocante y alioli."
              className="w-full px-3.5 py-2 rounded-xl border-2 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-xs resize-none"
            />
          </div>

          {/* Etiqueta Destacada Opcional */}
          <div>
            <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
              Etiqueta Destacada (opcional):
            </label>
            <input
              type="text"
              value={formData.badge}
              onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
              placeholder="Ej: MÁS PEDIDO, NUEVO, RECOMENDADO"
              className="w-full px-3.5 py-2 rounded-xl border-2 border-cartoon-ink font-sub text-xs text-cartoon-ink focus:outline-none shadow-cartoon-xs"
            />
          </div>

          {/* Opciones y Visibilidad con interruptores claros */}
          <div className="p-3 bg-gray-50 rounded-2xl border-2 border-gray-200 space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.hasProteinChoice}
                onChange={(e) => setFormData({ ...formData, hasProteinChoice: e.target.checked })}
                className="w-4 h-4 rounded text-cartoon-red focus:ring-0 cursor-pointer"
              />
              <span className="font-sub font-bold text-xs text-cartoon-ink">
                ¿Permite al cliente elegir entre medallón de Carne o Pollo?
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
              />
              <span className="font-sub font-bold text-xs text-cartoon-ink">
                Habilitado en la carta digital (visible para hacer pedidos)
              </span>
            </label>
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-sub font-bold text-xs sm:text-sm cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-cartoon-primary text-xs sm:text-sm py-2.5 px-6 flex items-center gap-2 shadow-cartoon-xs cursor-pointer font-display"
            >
              <Icon name="save" size={18} />
              <span>Guardar Plato</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
