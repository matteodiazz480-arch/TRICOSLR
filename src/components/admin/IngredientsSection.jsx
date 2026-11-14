import React, { useState, useMemo } from 'react';
import { Icon } from '../Icon';
import {
  addIngredient,
  updateIngredient,
  deleteIngredient,
  adjustIngredientStock,
  getProductRecipe,
  setProductRecipe,
} from '../../lib/ingredientsStore';

const UNITS = [
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'unidades', label: 'Unidades (u.)' },
  { value: 'fetas', label: 'Fetas' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'porciones', label: 'Porciones' },
];

export const IngredientsSection = ({ ingredients = [], products = [] }) => {
  // Pestaña interna: 'inventario' | 'recetas'
  const [subTab, setSubTab] = useState('inventario');

  // Búsqueda y Filtros de Ingredientes
  const [search, setSearch] = useState('');
  const [filterAlert, setFilterAlert] = useState('all'); // 'all' | 'low' | 'out'

  // Modal para Crear / Editar Ingrediente
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [formIngredient, setFormIngredient] = useState({
    name: '',
    unit: 'g',
    stock: 1000,
    minStock: 200,
  });

  // Modal de Confirmación de Borrado
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Recetas: Plato seleccionado actualmente para editar su receta
  const [selectedProductId, setSelectedProductId] = useState(
    products[0]?.id || 'burger-ak47'
  );
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || products[0],
    [products, selectedProductId]
  );

  // Receta actual del plato seleccionado
  const [currentRecipe, setCurrentRecipe] = useState(() =>
    getProductRecipe(selectedProductId, selectedProduct)
  );

  // Al cambiar de plato seleccionado, actualizar receta mostrada
  const handleSelectProduct = (prodId) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    setCurrentRecipe(getProductRecipe(prodId, prod));
  };

  // Formulario para agregar ingrediente a la receta del plato
  const [recipeNewItem, setRecipeNewItem] = useState({
    ingredientId: ingredients[0]?.id || '',
    amount: 1,
  });

  // Mensaje temporal toast
  const [toast, setToast] = useState('');
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Métricas de inventario
  const stats = useMemo(() => {
    const total = ingredients.length;
    const lowStock = ingredients.filter(
      (i) => Number(i.stock) > 0 && Number(i.stock) <= Number(i.minStock || 0)
    ).length;
    const outOfStock = ingredients.filter((i) => Number(i.stock) <= 0).length;
    return { total, lowStock, outOfStock };
  }, [ingredients]);

  // Lista filtrada de ingredientes
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((item) => {
      if (filterAlert === 'low' && !(Number(item.stock) > 0 && Number(item.stock) <= Number(item.minStock || 0))) {
        return false;
      }
      if (filterAlert === 'out' && !(Number(item.stock) <= 0)) {
        return false;
      }
      if (!search.trim()) return true;
      return item.name.toLowerCase().includes(search.toLowerCase().trim());
    });
  }, [ingredients, search, filterAlert]);

  // Abrir modal de creación
  const handleOpenCreate = () => {
    setEditingIngredient(null);
    setFormIngredient({
      name: '',
      unit: 'g',
      stock: 1000,
      minStock: 200,
    });
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (item) => {
    setEditingIngredient(item);
    setFormIngredient({
      name: item.name,
      unit: item.unit || 'g',
      stock: item.stock,
      minStock: item.minStock || 0,
    });
    setIsModalOpen(true);
  };

  // Guardar ingrediente (crear o editar)
  const handleSaveIngredient = (e) => {
    e.preventDefault();
    if (!formIngredient.name.trim()) return;

    if (editingIngredient) {
      updateIngredient(editingIngredient.id, {
        name: formIngredient.name.trim(),
        unit: formIngredient.unit,
        stock: Math.max(0, Number(formIngredient.stock) || 0),
        minStock: Math.max(0, Number(formIngredient.minStock) || 0),
      });
      showToast(`Ingrediente "${formIngredient.name}" actualizado.`);
    } else {
      addIngredient({
        name: formIngredient.name.trim(),
        unit: formIngredient.unit,
        stock: Math.max(0, Number(formIngredient.stock) || 0),
        minStock: Math.max(0, Number(formIngredient.minStock) || 0),
      });
      showToast(`Ingrediente "${formIngredient.name}" creado con éxito.`);
    }

    setIsModalOpen(false);
  };

  // Confirmar eliminación
  const handleConfirmDelete = () => {
    if (!deleteCandidate) return;
    deleteIngredient(deleteCandidate.id);
    showToast(`Ingrediente "${deleteCandidate.name}" eliminado.`);
    setDeleteCandidate(null);
  };

  // Agregar ingrediente a la receta del plato
  const handleAddIngredientToRecipe = (e) => {
    e.preventDefault();
    if (!recipeNewItem.ingredientId) return;

    const amount = Number(recipeNewItem.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Ingresá una cantidad válida mayor a 0');
      return;
    }

    // Verificar si ya existe en la receta
    const existingIndex = currentRecipe.findIndex(
      (r) => r.ingredientId === recipeNewItem.ingredientId
    );

    let updatedRecipe;
    if (existingIndex !== -1) {
      updatedRecipe = [...currentRecipe];
      updatedRecipe[existingIndex] = {
        ...updatedRecipe[existingIndex],
        amount: Number(updatedRecipe[existingIndex].amount) + amount,
      };
    } else {
      updatedRecipe = [
        ...currentRecipe,
        {
          ingredientId: recipeNewItem.ingredientId,
          amount,
        },
      ];
    }

    setCurrentRecipe(updatedRecipe);
    setProductRecipe(selectedProductId, updatedRecipe);
    showToast(`Receta de "${selectedProduct?.name}" actualizada con éxito.`);
  };

  // Quitar ingrediente de la receta del plato
  const handleRemoveFromRecipe = (ingredientId) => {
    const updatedRecipe = currentRecipe.filter((r) => r.ingredientId !== ingredientId);
    setCurrentRecipe(updatedRecipe);
    setProductRecipe(selectedProductId, updatedRecipe);
    showToast('Ingrediente quitado de la receta.');
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      
      {/* Toast Notificación */}
      {toast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500 text-white font-sub font-bold text-sm shadow-cartoon-xs flex items-center gap-2">
          <Icon name="check_circle" size={20} />
          <span>{toast}</span>
        </div>
      )}

      {/* Cabecera y Selector de Sub-pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-xl sm:text-2xl text-cartoon-ink flex items-center gap-2">
            <span>🥩</span>
            <span>Gestión de Ingredientes & Stock Real</span>
          </h3>
          <p className="font-sub text-xs sm:text-sm text-gray-500 mt-0.5">
            El stock se descuenta automáticamente de los ingredientes cada vez que un cliente realiza un pedido.
          </p>
        </div>

        {/* Sub-Pestañas: Inventario de Ingredientes / Recetas por Plato */}
        <div className="inline-flex bg-gray-200/80 p-1 rounded-2xl border-2 border-gray-300 flex-shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('inventario')}
            className={`px-3.5 py-2 rounded-xl font-sub font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'inventario'
                ? 'bg-white text-cartoon-ink shadow-cartoon-xs border-2 border-cartoon-ink font-black'
                : 'text-gray-600 hover:text-cartoon-ink'
            }`}
          >
            <Icon name="inventory_2" size={16} />
            <span>Inventario ({ingredients.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('recetas');
              if (selectedProduct) {
                setCurrentRecipe(getProductRecipe(selectedProduct.id, selectedProduct));
              }
            }}
            className={`px-3.5 py-2 rounded-xl font-sub font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'recetas'
                ? 'bg-white text-cartoon-ink shadow-cartoon-xs border-2 border-cartoon-ink font-black'
                : 'text-gray-600 hover:text-cartoon-ink'
            }`}
          >
            <Icon name="restaurant" size={16} />
            <span>Recetas por Hamburguesa</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VISTA 1: INVENTARIO DE INGREDIENTES */}
      {/* ============================================================== */}
      {subTab === 'inventario' && (
        <div className="space-y-5">
          
          {/* Métricas Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="font-sub font-bold text-xs text-gray-500 uppercase tracking-wider block">
                  Total Ingredientes
                </span>
                <span className="font-display text-2xl sm:text-3xl text-cartoon-ink block mt-0.5">
                  {stats.total}
                </span>
                <span className="font-sub text-[11px] text-gray-400 block mt-0.5">
                  Materia prima registrada
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-2xl">
                📦
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="font-sub font-bold text-xs text-amber-700 uppercase tracking-wider block">
                  Stock Bajo / Alerta
                </span>
                <span className="font-display text-2xl sm:text-3xl text-amber-600 block mt-0.5">
                  {stats.lowStock}
                </span>
                <span className="font-sub text-[11px] text-amber-600 font-bold block mt-0.5">
                  Próximos a reponer
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-2xl">
                ⚠️
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="font-sub font-bold text-xs text-rose-700 uppercase tracking-wider block">
                  Ingredientes Agotados
                </span>
                <span className="font-display text-2xl sm:text-3xl text-rose-600 block mt-0.5">
                  {stats.outOfStock}
                </span>
                <span className="font-sub text-[11px] text-rose-600 font-bold block mt-0.5">
                  Requieren reposición urgente
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border-2 border-rose-300 flex items-center justify-center text-2xl">
                🚫
              </div>
            </div>
          </div>

          {/* Barra de Acciones: Buscador, Filtros y Botón Nuevo Ingrediente */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Icon name="search" size={18} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ingrediente (ej: carne, cheddar, pan...)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-gray-200 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-yellow shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Filtros */}
              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setFilterAlert('all')}
                  className={`px-2.5 py-1.5 rounded-lg font-sub font-bold text-xs cursor-pointer ${
                    filterAlert === 'all' ? 'bg-white shadow-xs text-cartoon-ink font-black' : 'text-gray-500'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterAlert('low')}
                  className={`px-2.5 py-1.5 rounded-lg font-sub font-bold text-xs cursor-pointer ${
                    filterAlert === 'low' ? 'bg-amber-100 text-amber-800 font-black' : 'text-gray-500'
                  }`}
                >
                  Bajos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterAlert('out')}
                  className={`px-2.5 py-1.5 rounded-lg font-sub font-bold text-xs cursor-pointer ${
                    filterAlert === 'out' ? 'bg-rose-100 text-rose-800 font-black' : 'text-gray-500'
                  }`}
                >
                  Agotados
                </button>
              </div>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="btn-cartoon-primary text-xs sm:text-sm py-2 px-3.5 flex items-center gap-1.5 shadow-cartoon-xs cursor-pointer flex-shrink-0"
              >
                <Icon name="add" size={18} />
                <span>Nuevo Ingrediente</span>
              </button>
            </div>
          </div>

          {/* Grilla de Tarjetas de Ingredientes Espaciosa */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredIngredients.map((item) => {
              const stock = Number(item.stock || 0);
              const minStock = Number(item.minStock || 0);
              const isOut = stock <= 0;
              const isLow = stock > 0 && stock <= minStock;

              // Paso de ajuste rápido según unidad (+100g, +10 unidades, etc.)
              const step = item.unit === 'g' ? 500 : item.unit === 'ml' ? 250 : 5;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border-2 p-4 shadow-sm flex flex-col justify-between space-y-3 transition-all ${
                    isOut
                      ? 'border-rose-300 bg-rose-50/20'
                      : isLow
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-gray-200 hover:border-cartoon-ink'
                  }`}
                >
                  {/* Encabezado: Nombre y Badge de Estado */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-display text-sm sm:text-base text-cartoon-ink leading-snug truncate">
                        {item.name}
                      </h4>
                      <span className="font-sub text-[11px] text-gray-500 block mt-0.5">
                        Alerta de reposición: {minStock.toLocaleString('es-AR')} {item.unit}
                      </span>
                    </div>

                    {isOut ? (
                      <span className="px-2 py-0.5 rounded-lg bg-cartoon-red text-white font-sub font-black text-[10px] uppercase shadow-xs flex-shrink-0">
                        Agotado
                      </span>
                    ) : isLow ? (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-white font-sub font-black text-[10px] uppercase shadow-xs flex-shrink-0">
                        Stock Bajo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-sub font-bold text-[10px] flex-shrink-0">
                        Óptimo
                      </span>
                    )}
                  </div>

                  {/* Stock Actual Grande y Claro */}
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div>
                      <span className="font-sub font-bold text-[10px] text-gray-400 uppercase tracking-wider block">
                        Stock Disponible
                      </span>
                      <span className="font-display text-xl text-cartoon-ink block mt-0.5">
                        {stock.toLocaleString('es-AR')}{' '}
                        <span className="text-xs font-sub font-normal text-gray-500">{item.unit}</span>
                      </span>
                    </div>

                    {/* Botones de Ajuste Rápido de Stock (+ y -) */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => adjustIngredientStock(item.id, -step)}
                        title={`Restar ${step} ${item.unit}`}
                        className="w-8 h-8 rounded-lg bg-white hover:bg-rose-50 text-cartoon-ink hover:text-cartoon-red border border-gray-300 flex items-center justify-center font-display text-base active:scale-90 cursor-pointer shadow-2xs"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustIngredientStock(item.id, step)}
                        title={`Sumar ${step} ${item.unit}`}
                        className="w-8 h-8 rounded-lg bg-white hover:bg-emerald-50 text-cartoon-ink hover:text-emerald-700 border border-gray-300 flex items-center justify-center font-display text-base active:scale-90 cursor-pointer shadow-2xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Acciones de Edición y Eliminación */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-cartoon-yellow hover:text-cartoon-ink text-gray-700 font-sub font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Icon name="edit" size={14} />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteCandidate(item)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-cartoon-red hover:text-white text-cartoon-red transition-colors cursor-pointer"
                      title="Eliminar ingrediente"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 2: RECETAS POR HAMBURGUESA / PLATO (ESCANDALLO) */}
      {/* ============================================================== */}
      {subTab === 'recetas' && (
        <div className="space-y-6">
          
          {/* Tarjeta Explicativa */}
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 text-cartoon-ink flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">💡</span>
            <div className="text-xs sm:text-sm font-sub leading-relaxed">
              <strong className="font-bold">¿Cómo funciona el descuento automático de stock?</strong>
              <p className="text-gray-700 mt-0.5">
                Seleccioná una hamburguesa o plato de la carta y definí qué ingredientes utiliza y cuántos gramos, fetas o unidades requiere por porción.
                Cuando un cliente haga un pedido, el sistema descontará exactamente esas cantidades del inventario general.
              </p>
            </div>
          </div>

          {/* Selector de Plato de la Carta */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-gray-200 shadow-sm space-y-3">
            <label className="block font-sub font-bold text-xs sm:text-sm text-cartoon-ink">
              1. Seleccioná el Plato o Hamburguesa a configurar:
            </label>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {products.map((prod) => {
                const isSelected = selectedProductId === prod.id;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleSelectProduct(prod.id)}
                    className={`px-3.5 py-2 rounded-xl font-sub font-bold text-xs whitespace-nowrap cursor-pointer transition-all border-2 flex items-center gap-2 ${
                      isSelected
                        ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-black scale-102'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span>{prod.emoji || '🍔'}</span>
                    <span>{prod.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de Ingredientes de la Receta del Plato */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border-2 border-gray-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{selectedProduct?.emoji || '🍔'}</span>
                <div>
                  <h4 className="font-display text-base sm:text-lg text-cartoon-ink">
                    Receta Oficial de {selectedProduct?.name}
                  </h4>
                  <span className="font-sub text-xs text-gray-500">
                    Ingredientes que se descuentan por cada porción que pide un cliente
                  </span>
                </div>
              </div>

              <span className="badge-cartoon bg-gray-100 text-gray-700 border-gray-300 text-xs">
                {currentRecipe.length} ingredientes asignados
              </span>
            </div>

            {/* Listado de Ingredientes Asignados */}
            {currentRecipe.length === 0 ? (
              <div className="p-6 text-center text-gray-400 font-sub text-xs bg-gray-50 rounded-xl border border-dashed border-gray-300">
                Este plato todavía no tiene ingredientes asignados a su receta. Agregá el primero abajo.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentRecipe.map((recItem) => {
                  const ingInfo = ingredients.find((i) => i.id === recItem.ingredientId);
                  const ingName = ingInfo ? ingInfo.name : recItem.ingredientId;
                  const unit = ingInfo ? ingInfo.unit : '';

                  return (
                    <div
                      key={recItem.ingredientId}
                      className="p-3.5 rounded-xl bg-gray-50 border-2 border-gray-200 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <span className="font-display text-xs sm:text-sm text-cartoon-ink block truncate">
                          {ingName}
                        </span>
                        <span className="font-sub font-bold text-xs text-amber-700 block mt-0.5">
                          {recItem.amount} {unit} por plato
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromRecipe(recItem.ingredientId)}
                        className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-cartoon-red text-cartoon-red hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Quitar de la receta"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Formulario para Asignar Nuevo Ingrediente a este Plato */}
            <form
              onSubmit={handleAddIngredientToRecipe}
              className="p-4 rounded-xl bg-cartoon-cream/40 border-2 border-cartoon-ink/20 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
            >
              <div className="flex-1">
                <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                  Ingrediente a utilizar:
                </label>
                <select
                  value={recipeNewItem.ingredientId}
                  onChange={(e) =>
                    setRecipeNewItem({ ...recipeNewItem, ingredientId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border-2 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none"
                >
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-44">
                <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                  Cantidad por plato:
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={recipeNewItem.amount}
                  onChange={(e) =>
                    setRecipeNewItem({ ...recipeNewItem, amount: e.target.value })
                  }
                  placeholder="Ej: 150 (g) ó 2 (u.)"
                  className="w-full px-3 py-2 rounded-xl bg-white border-2 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="btn-cartoon-primary text-xs sm:text-sm py-2 px-4 flex items-center justify-center gap-1.5 cursor-pointer shadow-cartoon-xs flex-shrink-0"
              >
                <Icon name="add" size={16} />
                <span>Asignar a la Receta</span>
              </button>
            </form>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREAR / EDITAR INGREDIENTE */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="relative w-full max-w-md bg-white rounded-3xl border-3 sm:border-4 border-cartoon-ink shadow-cartoon-lg p-5 sm:p-6 space-y-4 my-auto animate-modalIn max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-display text-base sm:text-lg text-cartoon-ink">
                {editingIngredient ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 cursor-pointer"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} className="space-y-3.5">
              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                  Nombre del Ingrediente:
                </label>
                <input
                  type="text"
                  required
                  value={formIngredient.name}
                  onChange={(e) => setFormIngredient({ ...formIngredient, name: e.target.value })}
                  placeholder="Ej: Medallón de Carne Vacuna, Pan Brioche, Cheddar"
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                    Unidad de Medida:
                  </label>
                  <select
                    value={formIngredient.unit}
                    onChange={(e) => setFormIngredient({ ...formIngredient, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border-2 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-xs"
                  >
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                    Stock Actual:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formIngredient.stock}
                    onChange={(e) => setFormIngredient({ ...formIngredient, stock: e.target.value })}
                    placeholder="1000"
                    className="w-full px-3 py-2 rounded-xl border-2 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                  Stock Mínimo (Alerta de reposición):
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formIngredient.minStock}
                  onChange={(e) => setFormIngredient({ ...formIngredient, minStock: e.target.value })}
                  placeholder="200"
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-cartoon-ink font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none shadow-cartoon-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-sub text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-cartoon-primary text-xs py-2 px-5 flex items-center gap-1.5 shadow-cartoon-xs cursor-pointer"
                >
                  <Icon name="save" size={16} />
                  <span>Guardar</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMACIÓN DE BORRADO DE INGREDIENTE */}
      {/* ============================================================== */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="relative w-full max-w-sm bg-white rounded-3xl border-3 border-cartoon-ink shadow-cartoon-lg p-5 text-center space-y-4 my-auto animate-modalIn">
            <h3 className="font-display text-base text-cartoon-ink">¿Eliminar este ingrediente?</h3>
            <p className="font-sub text-xs text-gray-600">
              Vas a eliminar <strong>"{deleteCandidate.name}"</strong> del inventario.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-sub text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
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
