import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../Icon';
import { CATEGORIES } from '../../data/products';
import { sanitizeText, sanitizeNumber } from '../../lib/security';
import { compressImageFile } from '../../lib/imageCompressor';

const EMOJI_OPTIONS = ['🍔', '🍗', '🍟', '🧀', '🥓', '🥤', '🥩', '🌶️', '🥪', '🍱', '🌭', '🥗'];

export const ProductModal = ({ isOpen, onClose, product, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'burgers',
    price: 12000,
    stock: 35,
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
        stock: product.stock !== undefined ? product.stock : 35,
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
        stock: 35,
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
    const cleanStock = sanitizeNumber(formData.stock, 0);

    const payload = {
      ...formData,
      id: product?.id || `prod-${Date.now()}`,
      name: cleanName,
      description: sanitizeText(formData.description),
      badge: sanitizeText(formData.badge),
      price: cleanPrice,
      stock: cleanStock,
      image: formData.image || '',
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-cartoon-ink/70 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-5 select-none animate-modalIn">
      <div className="w-full max-w-lg bg-white rounded-3xl border-3 sm:border-4 border-cartoon-ink shadow-cartoon-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 bg-cartoon-yellow border-b-3 border-cartoon-ink flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center text-xl">
              {formData.emoji}
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl text-cartoon-ink leading-tight">
                {product ? 'EDITAR PLATO' : 'NUEVO PLATO'}
              </h3>
              <p className="font-sub font-bold text-xs text-cartoon-ink/70">
                {product ? `Modificando ${product.name}` : 'Agregá una nueva opción a la carta'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white hover:bg-cartoon-cream-dark border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center text-cartoon-ink active:scale-95 cursor-pointer"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-cartoon-red text-white rounded-xl font-sub font-bold text-xs border-2 border-cartoon-ink flex items-center gap-2">
              <Icon name="error" size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Subir / Cambiar Imagen del Producto (Arrastrar o Clic) */}
          <div>
            <label className="block font-sub font-bold text-xs text-cartoon-ink/80 mb-1.5">
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
              <div className="relative w-full h-40 sm:h-48 rounded-2xl border-3 border-cartoon-ink overflow-hidden bg-cartoon-cream shadow-cartoon-sm group">
                <img
                  src={formData.image}
                  alt={formData.name || 'Vista previa'}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-cartoon-primary py-2 px-3.5 text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="photo_camera" size={16} />
                    <span>Cambiar Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                    className="px-3.5 py-2 rounded-xl bg-cartoon-red text-white font-display text-xs border-2 border-cartoon-ink shadow-cartoon-xs flex items-center gap-1.5 cursor-pointer hover:bg-cartoon-red-dark transition-colors"
                  >
                    <Icon name="delete" size={16} />
                    <span>Quitar</span>
                  </button>
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-emerald-500 text-white font-sub font-bold text-[10px] shadow-xs pointer-events-none">
                  ✓ Foto Activa
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
                className={`w-full py-6 px-4 rounded-2xl border-3 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-cartoon-red bg-cartoon-yellow/20 scale-[1.01]'
                    : 'border-cartoon-ink/30 bg-cartoon-cream/40 hover:bg-cartoon-cream/80 hover:border-cartoon-ink'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-white border-2 border-cartoon-ink flex items-center justify-center text-cartoon-ink mb-2 shadow-cartoon-xs">
                  <Icon name={isProcessingImage ? 'sync' : 'add_photo_alternate'} size={24} className={isProcessingImage ? 'animate-spin' : ''} />
                </div>
                <p className="font-display text-xs sm:text-sm text-cartoon-ink mb-0.5">
                  {isProcessingImage ? 'Optimizando foto...' : 'Arrastrá una imagen o hacé clic para subirla'}
                </p>
                <span className="font-sub text-[11px] text-cartoon-ink/60">
                  PNG, JPG o WEBP (se ajusta y optimiza automáticamente)
                </span>
              </div>
            )}
          </div>

          {/* Nombre */}
          <div>
            <label className="block font-sub font-bold text-xs text-cartoon-ink/80 mb-1">
              Nombre del Producto:
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Triple Cheddar Bacon"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 sm:border-3 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:bg-cartoon-yellow-light/20 shadow-cartoon-xs"
            />
          </div>

          {/* Categoría y Emoji */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-sub font-bold text-xs text-cartoon-ink/80 mb-1">
                Categoría:
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border-2 sm:border-3 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink bg-white focus:outline-none shadow-cartoon-xs"
              >
                {CATEGORIES.filter((c) => c.id !== 'todos').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-sub font-bold text-xs text-cartoon-ink/80 mb-1">
                Emoji del Plato:
              </label>
              <div className="flex gap-1.5 overflow-x-auto py-1">
                {EMOJI_OPTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setFormData({ ...formData, emoji: em })}
                    className={`w-9 h-9 rounded-xl border-2 border-cartoon-ink flex items-center justify-center text-lg flex-shrink-0 cursor-pointer ${
                      formData.emoji === em ? 'bg-cartoon-yellow shadow-cartoon-xs scale-105' : 'bg-white hover:bg-cartoon-cream'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Precio y Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-sub font-bold text-xs text-cartoon-ink/80 mb-1">
                Precio ($ ARS):
              </label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border-2 sm:border-3 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-xs"
              />
            </div>

            <div>
              <label className="block font-sub font-bold text-xs text-cartoon-ink/80 mb-1">
                Stock Disponible (Unidades):
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border-2 sm:border-3 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-xs"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block font-sub font-bold text-xs text-cartoon-ink/80 mb-1">
              Descripción e Ingredientes:
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ej: Pan brioche, doble carne, salsa especial..."
              className="w-full px-3.5 py-2 rounded-xl border-2 sm:border-3 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-xs resize-none"
            />
          </div>

          {/* Badge y Opciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-sub font-bold text-xs text-cartoon-ink/80 mb-1">
                Etiqueta Destacada (Opcional):
              </label>
              <input
                type="text"
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                placeholder="Ej: MÁS PEDIDO, NUEVO"
                className="w-full px-3 py-2 rounded-xl border-2 sm:border-3 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-xs"
              />
            </div>

            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer font-sub font-bold text-xs text-cartoon-ink">
                <input
                  type="checkbox"
                  checked={formData.hasProteinChoice}
                  onChange={(e) => setFormData({ ...formData, hasProteinChoice: e.target.checked })}
                  className="w-4 h-4 rounded border-2 border-cartoon-ink text-cartoon-red focus:ring-0"
                />
                <span>¿Permite elegir Carne o Pollo?</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-sub font-bold text-xs text-cartoon-ink">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 rounded border-2 border-cartoon-ink text-cartoon-green-dark focus:ring-0"
                />
                <span>Habilitado en la carta</span>
              </label>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t-2 border-cartoon-ink/15 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn-cartoon-white text-xs sm:text-sm py-2 px-4 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-cartoon-primary text-xs sm:text-sm py-2 px-5 flex items-center gap-2 cursor-pointer"
            >
              <Icon name="save" size={16} />
              <span>Guardar Plato</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
