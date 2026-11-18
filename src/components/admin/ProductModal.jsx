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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] my-auto animate-modalIn">
        <div className="p-3.5 sm:p-4 bg-cartoon-yellow border-b-2 sm:border-b-3 border-cartoon-ink flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center text-cartoon-ink flex-shrink-0">
              <Icon name="restaurant_menu" size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base sm:text-lg text-cartoon-ink leading-tight truncate">
                {product ? 'Editar Producto' : 'Nuevo Plato'}
              </h3>
              <span className="font-sub text-[10px] sm:text-[11px] text-cartoon-ink/75 font-semibold block truncate">
                Carta oficial de TRICO'S
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white hover:bg-cartoon-cream border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center text-cartoon-ink cursor-pointer flex-shrink-0"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3.5 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-cartoon-red text-white rounded-2xl font-sub font-bold text-xs border-2 border-cartoon-ink shadow-cartoon-xs flex items-center gap-2">
              <Icon name="error" size={18} />
              <span>{error}</span>
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
              <div className="relative w-full h-38 sm:h-44 rounded-2xl border-2 sm:border-3 border-cartoon-ink overflow-hidden bg-cartoon-cream shadow-cartoon-xs group">
                <img
                  src={formData.image}
                  alt={formData.name || 'Vista previa'}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
                    className="btn-cartoon-red py-1.5 px-3 text-xs"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 px-4 rounded-2xl border-2 border-dashed border-cartoon-ink/40 bg-cartoon-cream/40 hover:bg-cartoon-cream/80 flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
              >
                <Icon
                  name={isProcessingImage ? 'sync' : 'add_photo_alternate'}
                  size={26}
                  className={`text-gray-400 mb-1 ${isProcessingImage ? 'animate-spin' : ''}`}
                />
                <span className="font-sub font-bold text-xs text-cartoon-ink">
                  {isProcessingImage ? 'Procesando imagen...' : 'Subir foto del plato (PNG o JPG)'}
                </span>
                <span className="font-sub text-[10px] text-gray-500 mt-0.5">
                  Se optimiza automáticamente
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                Nombre del Producto
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Triple Cheddar Bacon"
                className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
              />
            </div>

            <div>
              <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                Categoría
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub font-bold text-xs sm:text-sm text-cartoon-ink bg-white focus:outline-none focus:border-cartoon-ink cursor-pointer"
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
              <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                {formData.hasVariants ? 'Precio Simple ($)' : 'Precio ($)'}
              </label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub font-bold text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
              />
            </div>

            {formData.hasVariants && (
              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                  Precio Doble ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={formData.priceDouble}
                  onChange={(e) => setFormData({ ...formData, priceDouble: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub font-bold text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
              Descripción e Ingredientes
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ej: Pan brioche, doble medallón smash, salsa especial..."
              className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink resize-none"
            />
          </div>

          <div className="p-3.5 bg-cartoon-cream/60 rounded-2xl border-2 border-cartoon-ink/20 space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasVariants}
                onChange={(e) => setFormData({ ...formData, hasVariants: e.target.checked })}
                className="w-4 h-4 rounded text-cartoon-ink focus:ring-0 cursor-pointer"
              />
              <span className="font-sub font-bold text-xs text-cartoon-ink">
                Tiene variantes Simple y Doble
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasProteinChoice}
                onChange={(e) => setFormData({ ...formData, hasProteinChoice: e.target.checked })}
                className="w-4 h-4 rounded text-cartoon-ink focus:ring-0 cursor-pointer"
              />
              <span className="font-sub font-bold text-xs text-cartoon-ink">
                ¿Permite elegir Carne o Pollo?
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
              />
              <span className="font-sub font-bold text-xs text-cartoon-ink">
                Habilitado en la carta para pedir
              </span>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-cartoon-white py-2.5 px-4 text-xs sm:text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-cartoon-primary py-2.5 px-5 text-xs sm:text-sm shadow-cartoon-xs"
            >
              Guardar Plato
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
