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
    priceDouble: 14000,
    hasVariants: true,
    image: '',
    description: '',
    hasProteinChoice: false,
    active: true,
  });
  const [error, setError] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (product) {
      const hasVar = Array.isArray(product.variants) && product.variants.length > 1;
      setFormData({
        name: product.name || '',
        category: product.category || 'burgers',
        price: product.variants?.[0]?.price || product.price || 12000,
        priceDouble: product.variants?.[1]?.price || (Number(product.price || 12000) + 2000),
        hasVariants: hasVar,
        image: product.image || '',
        description: product.description || '',
        hasProteinChoice: !!product.hasProteinChoice,
        active: product.active !== false,
      });
    } else {
      setFormData({
        name: '',
        category: 'burgers',
        price: 12000,
        priceDouble: 14000,
        hasVariants: true,
        image: '',
        description: '',
        hasProteinChoice: true,
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = sanitizeText(formData.name);
    if (!cleanName) {
      setError('El nombre del producto es obligatorio');
      return;
    }

    const cleanPrice = sanitizeNumber(formData.price, 0);
    const cleanPriceDouble = sanitizeNumber(formData.priceDouble, cleanPrice);

    const payload = {
      ...product,
      id: product?.id || `prod-${Date.now()}`,
      name: cleanName,
      category: formData.category,
      description: sanitizeText(formData.description),
      price: cleanPrice,
      variants: formData.hasVariants
        ? [
            { id: 'simple', label: 'Simple', price: cleanPrice },
            { id: 'doble', label: 'Doble', price: cleanPriceDouble },
          ]
        : null,
      image: formData.image || '',
      hasProteinChoice: formData.hasProteinChoice,
      active: formData.active,
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-modalIn">
        <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h3 className="font-display text-base text-slate-900">
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl font-sub font-semibold text-xs border border-rose-200">
              {error}
            </div>
          )}

          {/* Imagen */}
          <div>
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
              <div className="relative w-full h-36 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 group">
                <img
                  src={formData.image}
                  alt={formData.name || 'Vista previa'}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-cartoon-white py-1.5 px-3 text-xs"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-sub font-semibold text-xs cursor-pointer"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-5 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
              >
                <Icon
                  name={isProcessingImage ? 'sync' : 'add_photo_alternate'}
                  size={22}
                  className={`text-slate-400 mb-1 ${isProcessingImage ? 'animate-spin' : ''}`}
                />
                <span className="font-sub font-semibold text-xs text-slate-700">
                  {isProcessingImage ? 'Procesando imagen...' : 'Subir imagen del producto'}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: London Cheese"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                Categoría
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs text-slate-900 bg-white focus:outline-none focus:border-slate-900"
              >
                {CATEGORIES.filter((c) => c.id !== 'todos').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                {formData.hasVariants ? 'Precio Simple ($)' : 'Precio ($)'}
              </label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub font-semibold text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            {formData.hasVariants && (
              <div>
                <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                  Precio Doble ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={formData.priceDouble}
                  onChange={(e) => setFormData({ ...formData, priceDouble: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub font-semibold text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
              Descripción
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ingredientes y preparación..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs text-slate-900 focus:outline-none focus:border-slate-900 resize-none"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasVariants}
                onChange={(e) => setFormData({ ...formData, hasVariants: e.target.checked })}
                className="w-4 h-4 rounded text-slate-900 focus:ring-0 cursor-pointer"
              />
              <span className="font-sub font-medium text-xs text-slate-700">
                Tiene variantes Simple y Doble
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasProteinChoice}
                onChange={(e) => setFormData({ ...formData, hasProteinChoice: e.target.checked })}
                className="w-4 h-4 rounded text-slate-900 focus:ring-0 cursor-pointer"
              />
              <span className="font-sub font-medium text-xs text-slate-700">
                Permite elegir medallón de Carne o Pollo
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
              />
              <span className="font-sub font-medium text-xs text-slate-700">
                Disponible para pedir en la carta
              </span>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
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
  );
};
