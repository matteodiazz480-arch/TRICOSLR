import React, { useState, useMemo, useEffect } from 'react';
import { Icon } from '../Icon';
import {
  addIngredient,
  updateIngredient,
  deleteIngredient,
  adjustIngredientStock,
  toggleIngredientOutOfStock,
  getProductRecipe,
  setProductRecipe,
  subscribeToRecipes,
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
  const [subTab, setSubTab] = useState('inventario');
  const [search, setSearch] = useState('');
  const [filterAlert, setFilterAlert] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [formIngredient, setFormIngredient] = useState({
    name: '',
    unit: 'g',
    stock: 1000,
    minStock: 200,
  });

  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const [selectedProductId, setSelectedProductId] = useState(
    products[0]?.id || 'burger-ak47'
  );
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || products[0],
    [products, selectedProductId]
  );

  const [allRecipesMap, setAllRecipesMap] = useState({});
  const [currentRecipe, setCurrentRecipe] = useState(() =>
    getProductRecipe(selectedProductId, selectedProduct)
  );

  useEffect(() => {
    const unsub = subscribeToRecipes((recipes) => {
      if (recipes && typeof recipes === 'object') {
        setAllRecipesMap(recipes);
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  useEffect(() => {
    const prod = products.find((p) => p.id === selectedProductId);
    setCurrentRecipe(getProductRecipe(selectedProductId, prod));
  }, [selectedProductId, products, allRecipesMap]);

  const handleSelectProduct = (prodId) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    setCurrentRecipe(getProductRecipe(prodId, prod));
  };

  const [recipeNewItem, setRecipeNewItem] = useState({
    ingredientId: ingredients[0]?.id || '',
    amountSimple: 1,
    doubleRule: 'duplicate',
    amountDouble: 2,
  });

  // Garantizar que el selector de ingrediente siempre apunte a un ID válido existente
  useEffect(() => {
    if (ingredients.length > 0) {
      const exists = ingredients.some((i) => i.id === recipeNewItem.ingredientId);
      if (!exists) {
        const first = ingredients[0];
        const nameLower = `${first.id} ${first.name}`.toLowerCase();
        const isSingle =
          nameLower.includes('pan') ||
          nameLower.includes('huevo') ||
          nameLower.includes('salsa') ||
          nameLower.includes('alioli') ||
          nameLower.includes('barbacoa') ||
          nameLower.includes('papas');
        const rule = isSingle ? 'fixed' : 'duplicate';
        const defaultAmt = first.unit === 'g' ? 150 : 1;
        setRecipeNewItem({
          ingredientId: first.id,
          amountSimple: defaultAmt,
          doubleRule: rule,
          amountDouble: rule === 'duplicate' ? defaultAmt * 2 : defaultAmt,
        });
      }
    }
  }, [ingredients, recipeNewItem.ingredientId]);

  const handleIngredientSelectChange = (ingId) => {
    const ingObj = ingredients.find((i) => i.id === ingId);
    const refText = `${ingId} ${ingObj?.name || ''}`.toLowerCase();
    const isSingle =
      refText.includes('pan') ||
      refText.includes('huevo') ||
      refText.includes('salsa') ||
      refText.includes('alioli') ||
      refText.includes('barbacoa') ||
      refText.includes('lechuga') ||
      refText.includes('tomate') ||
      refText.includes('guacamole') ||
      refText.includes('doritos') ||
      refText.includes('papas');

    const defaultRule = isSingle ? 'fixed' : 'duplicate';
    const simple = Number(recipeNewItem.amountSimple) || 1;
    setRecipeNewItem((prev) => ({
      ...prev,
      ingredientId: ingId,
      doubleRule: defaultRule,
      amountDouble: defaultRule === 'duplicate' ? simple * 2 : simple,
    }));
  };

  const [toast, setToast] = useState('');
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const stats = useMemo(() => {
    const total = ingredients.length;
    const lowStock = ingredients.filter(
      (i) => !i.outOfStock && Number(i.stock) > 0 && Number(i.stock) <= Number(i.minStock || 0)
    ).length;
    const outOfStock = ingredients.filter((i) => i.outOfStock || Number(i.stock) <= 0).length;
    return { total, lowStock, outOfStock };
  }, [ingredients]);

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((item) => {
      const isOut = item.outOfStock || Number(item.stock) <= 0;
      const isLow = !isOut && Number(item.stock) <= Number(item.minStock || 0);
      if (filterAlert === 'low' && !isLow) return false;
      if (filterAlert === 'out' && !isOut) return false;
      if (!search.trim()) return true;
      return item.name.toLowerCase().includes(search.toLowerCase().trim());
    });
  }, [ingredients, search, filterAlert]);

  const handleOpenCreate = () => {
    setEditingIngredient(null);
    setFormIngredient({
      name: '',
      unit: 'unidades',
      stock: 100,
      minStock: 20,
    });
    setIsModalOpen(true);
  };

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
      showToast(`Ingrediente "${formIngredient.name}" actualizado`);
    } else {
      addIngredient({
        name: formIngredient.name.trim(),
        unit: formIngredient.unit,
        stock: Math.max(0, Number(formIngredient.stock) || 0),
        minStock: Math.max(0, Number(formIngredient.minStock) || 0),
      });
      showToast(`Ingrediente "${formIngredient.name}" creado`);
    }

    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteCandidate) return;
    deleteIngredient(deleteCandidate.id);
    showToast(`Ingrediente "${deleteCandidate.name}" eliminado`);
    setDeleteCandidate(null);
  };

  const handleAddIngredientToRecipe = async (e) => {
    e.preventDefault();
    const targetIngId = recipeNewItem.ingredientId || ingredients[0]?.id;
    if (!targetIngId) return;

    const ingObj = ingredients.find((i) => i.id === targetIngId);
    const amountSimple = Number(recipeNewItem.amountSimple);
    if (isNaN(amountSimple) || amountSimple <= 0) return;

    let amountDouble = amountSimple;
    if (recipeNewItem.doubleRule === 'duplicate') {
      amountDouble = amountSimple * 2;
    } else if (recipeNewItem.doubleRule === 'custom') {
      amountDouble = Number(recipeNewItem.amountDouble) || amountSimple;
    } else {
      amountDouble = amountSimple;
    }

    const newRecEntry = {
      ingredientId: targetIngId,
      ingredientName: ingObj?.name || '',
      unit: ingObj?.unit || '',
      amount: amountSimple,
      amountSimple,
      amountDouble,
      doubleRule: recipeNewItem.doubleRule,
    };

    const existingIndex = currentRecipe.findIndex(
      (r) => r.ingredientId === targetIngId
    );

    let updatedRecipe;
    if (existingIndex !== -1) {
      updatedRecipe = [...currentRecipe];
      updatedRecipe[existingIndex] = newRecEntry;
    } else {
      updatedRecipe = [...currentRecipe, newRecEntry];
    }

    setCurrentRecipe(updatedRecipe);
    await setProductRecipe(selectedProductId, updatedRecipe);
    showToast(`Receta de "${selectedProduct?.name}" guardada`);
  };

  const handleToggleRecipeDoubleRule = async (ingredientId) => {
    const updatedRecipe = currentRecipe.map((item) => {
      if (item.ingredientId !== ingredientId) return item;
      const simple = Number(item.amountSimple ?? item.amount) || 1;
      const refText = `${item.ingredientId} ${item.ingredientName || ''}`.toLowerCase();
      const currentRule =
        item.doubleRule ||
        (refText.includes('pan') ||
        refText.includes('huevo') ||
        refText.includes('salsa') ||
        refText.includes('alioli') ||
        refText.includes('barbacoa') ||
        refText.includes('papas')
          ? 'fixed'
          : 'duplicate');
      const nextRule = currentRule === 'duplicate' ? 'fixed' : 'duplicate';
      const nextDouble = nextRule === 'duplicate' ? simple * 2 : simple;

      return {
        ...item,
        amount: simple,
        amountSimple: simple,
        doubleRule: nextRule,
        amountDouble: nextDouble,
      };
    });

    setCurrentRecipe(updatedRecipe);
    await setProductRecipe(selectedProductId, updatedRecipe);
    showToast('Regla de variante actualizada');
  };

  const handleRemoveFromRecipe = async (ingredientId) => {
    const updatedRecipe = currentRecipe.filter((r) => r.ingredientId !== ingredientId);
    setCurrentRecipe(updatedRecipe);
    await setProductRecipe(selectedProductId, updatedRecipe);
    showToast('Ingrediente quitado de la receta');
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {toast && (
        <div className="p-3 rounded-xl bg-slate-900 text-white font-sub font-medium text-xs shadow-md flex items-center gap-2">
          <Icon name="check_circle" size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-lg sm:text-xl text-slate-900">
            Inventario de Ingredientes y Recetas
          </h3>
          <p className="font-sub text-xs text-slate-500 mt-0.5">
            El stock se descuenta automáticamente en tiempo real con cada pedido según su variante.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border-2 border-cartoon-ink shadow-cartoon-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('inventario')}
            className={`px-3.5 py-2 rounded-xl font-sub font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all border-2 ${
              subTab === 'inventario'
                ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-display'
                : 'text-cartoon-ink/75 hover:bg-cartoon-cream border-transparent'
            }`}
          >
            <Icon name="inventory_2" size={16} />
            <span>Stock de Insumos</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('recetas')}
            className={`px-3.5 py-2 rounded-xl font-sub font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all border-2 ${
              subTab === 'recetas'
                ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-display'
                : 'text-cartoon-ink/75 hover:bg-cartoon-cream border-transparent'
            }`}
          >
            <Icon name="menu_book" size={16} />
            <span>Recetas (Simple / Doble)</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SUB-PESTAÑA 1: INVENTARIO DE INSUMOS CON KILL-SWITCH */}
      {/* ============================================================== */}
      {subTab === 'inventario' && (
        <div className="space-y-4">
          {/* Resumen y Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs">
            <div className="relative flex-1">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center">
                <Icon name="search" size={18} />
              </div>
              <input
                type="text"
                placeholder="Buscar ingrediente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white border-2 border-cartoon-ink/30 font-sub text-xs sm:text-sm text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: `Todos (${stats.total})` },
                { id: 'low', label: `Stock Bajo (${stats.lowStock})` },
                { id: 'out', label: `Agotados (${stats.outOfStock})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterAlert(f.id)}
                  className={`px-3.5 py-2 rounded-2xl font-sub font-bold text-xs cursor-pointer transition-all border-2 ${
                    filterAlert === f.id
                      ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-display'
                      : 'bg-white text-cartoon-ink/75 hover:bg-cartoon-cream border-cartoon-ink/20'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <button
                type="button"
                onClick={handleOpenCreate}
                className="btn-cartoon-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
              >
                <Icon name="add" size={16} />
                <span>Nuevo</span>
              </button>
            </div>
          </div>

          {/* Grilla de Ingredientes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIngredients.map((item) => {
              const stock = Number(item.stock) || 0;
              const min = Number(item.minStock) || 0;
              const isOut = item.outOfStock === true || stock <= 0;
              const isLow = !isOut && stock <= min;
              const stepDelta = item.unit === 'g' || item.unit === 'ml' ? 500 : 10;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs p-4 flex flex-col justify-between gap-3 transition-all ${
                    isOut ? 'bg-rose-50/40 border-rose-400' : isLow ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-display text-base text-cartoon-ink truncate">
                        {item.name}
                      </h4>
                      <span className="font-sub font-semibold text-xs text-gray-500">
                        Mínimo sugerido: {min.toLocaleString('es-AR')} {item.unit}
                      </span>
                    </div>

                    {/* Botón Kill-Switch de 1 Clic: Disponible / Agotado */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleIngredientOutOfStock(item.id);
                        showToast(
                          isOut
                            ? `"${item.name}" habilitado nuevamente`
                            : `"${item.name}" marcado como Agotado`
                        );
                      }}
                      className={`px-3 py-1.5 rounded-xl font-sub font-bold text-xs cursor-pointer transition-all flex-shrink-0 border-2 ${
                        isOut
                          ? 'bg-cartoon-red text-white border-cartoon-ink shadow-cartoon-xs'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-400 hover:bg-emerald-200'
                      }`}
                      title="Marcar como agotado o disponible con un clic"
                    >
                      {isOut ? 'Agotado' : 'Disponible'}
                    </button>
                  </div>

                  {/* Cantidad Actual */}
                  <div className="flex items-baseline justify-between pt-3 border-t-2 border-cartoon-ink/15">
                    <div>
                      <span className="font-display text-2xl text-cartoon-ink">
                        {stock.toLocaleString('es-AR')}
                      </span>
                      <span className="font-sub font-bold text-xs text-gray-500 ml-1">
                        {item.unit}
                      </span>
                    </div>

                    {/* Ajuste rápido y Edición */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => adjustIngredientStock(item.id, -stepDelta)}
                        className="btn-cartoon-white px-2.5 py-1 text-xs"
                      >
                        -{stepDelta}
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustIngredientStock(item.id, stepDelta)}
                        className="btn-cartoon-white px-2.5 py-1 text-xs"
                      >
                        +{stepDelta}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-cartoon-ink hover:bg-cartoon-cream cursor-pointer"
                        title="Editar"
                      >
                        <Icon name="edit" size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(item)}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-cartoon-red hover:bg-rose-50 cursor-pointer"
                        title="Eliminar"
                      >
                        <Icon name="delete" size={17} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-PESTAÑA 2: RECETAS Y VARIANTES (SIMPLE VS DOBLE) */}
      {/* ============================================================== */}
      {subTab === 'recetas' && (
        <div className="space-y-4">
          {/* Selector de Producto */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5">
            <label className="block font-sub font-semibold text-xs text-slate-600">
              Seleccioná el producto para configurar su receta:
            </label>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {products.map((prod) => {
                const isSelected = selectedProductId === prod.id;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleSelectProduct(prod.id)}
                    className={`px-3.5 py-2 rounded-xl font-sub font-semibold text-xs whitespace-nowrap cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {prod.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuración de la Receta */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-display text-base text-slate-900">
                  Receta de {selectedProduct?.name}
                </h4>
                <p className="font-sub text-xs text-slate-500">
                  Definí cuánto se descuenta en versión Simple y cómo se comporta en versión Doble.
                </p>
              </div>
              <span className="badge-cartoon bg-slate-100 text-slate-700">
                {currentRecipe.length} insumos
              </span>
            </div>

            {currentRecipe.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-sub text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Sin ingredientes asignados. Utilizá el formulario inferior para agregarlos.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentRecipe.map((recItem) => {
                  const ingInfo =
                    ingredients.find((i) => i.id === recItem.ingredientId) ||
                    ingredients.find(
                      (i) =>
                        recItem.ingredientName &&
                        i.name.toLowerCase() === recItem.ingredientName.toLowerCase()
                    );
                  const ingName = ingInfo ? ingInfo.name : recItem.ingredientName || recItem.ingredientId;
                  const unit = ingInfo ? ingInfo.unit : recItem.unit || '';

                  const simpleVal = Number(recItem.amountSimple ?? recItem.amount) || 0;
                  const refText = `${recItem.ingredientId} ${ingName}`.toLowerCase();
                  const isFixed =
                    recItem.doubleRule === 'fixed' ||
                    (recItem.amountDouble !== undefined && Number(recItem.amountDouble) === simpleVal) ||
                    (!recItem.doubleRule &&
                      (refText.includes('pan') ||
                        refText.includes('huevo') ||
                        refText.includes('salsa') ||
                        refText.includes('alioli') ||
                        refText.includes('barbacoa') ||
                        refText.includes('papas')));

                  const doubleVal = isFixed
                    ? simpleVal
                    : recItem.amountDouble !== undefined
                    ? Number(recItem.amountDouble)
                    : simpleVal * 2;

                  return (
                    <div
                      key={recItem.ingredientId}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-display text-xs sm:text-sm text-slate-900 truncate">
                          {ingName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromRecipe(recItem.ingredientId)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Quitar"
                        >
                          <Icon name="close" size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="font-sub text-[10px] text-slate-400 block">Simple</span>
                          <span className="font-display text-xs text-slate-900">
                            {simpleVal} {unit}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="font-sub text-[10px] text-slate-400 block">Doble</span>
                          <span className="font-display text-xs text-slate-900">
                            {doubleVal} {unit}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleRecipeDoubleRule(recItem.ingredientId)}
                        className={`py-1.5 px-2.5 rounded-lg font-sub font-semibold text-[11px] flex items-center justify-between cursor-pointer transition-colors border ${
                          isFixed
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        <span>{isFixed ? 'Fijo en Doble (No duplica)' : 'Se duplica en Doble (x2)'}</span>
                        <span className="underline text-[10px]">Cambiar</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Formulario para Agregar Insumo a la Receta */}
            <form
              onSubmit={handleAddIngredientToRecipe}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                    Ingrediente
                  </label>
                  <select
                    value={recipeNewItem.ingredientId}
                    onChange={(e) => handleIngredientSelectChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-sub text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  >
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                    Cantidad en Simple
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={recipeNewItem.amountSimple}
                    onChange={(e) => {
                      const simple = Number(e.target.value);
                      setRecipeNewItem((prev) => ({
                        ...prev,
                        amountSimple: e.target.value,
                        amountDouble: prev.doubleRule === 'duplicate' ? simple * 2 : simple,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-sub font-semibold text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                    Comportamiento en Doble
                  </label>
                  <select
                    value={recipeNewItem.doubleRule}
                    onChange={(e) => {
                      const rule = e.target.value;
                      const simple = Number(recipeNewItem.amountSimple) || 1;
                      setRecipeNewItem((prev) => ({
                        ...prev,
                        doubleRule: rule,
                        amountDouble: rule === 'duplicate' ? simple * 2 : simple,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-sub text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  >
                    <option value="duplicate">Duplicar (x2 - Carne, Queso)</option>
                    <option value="fixed">Fijo (x1 - Ej: Huevo, Pan)</option>
                    <option value="custom">Cantidad personalizada</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full btn-cartoon-primary py-2 px-3 text-xs"
                  >
                    Guardar
                  </button>
                </div>
              </div>

              {recipeNewItem.doubleRule === 'custom' && (
                <div className="pt-2 flex items-center gap-3">
                  <label className="font-sub font-semibold text-xs text-slate-700">
                    Cantidad en Doble:
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={recipeNewItem.amountDouble}
                    onChange={(e) =>
                      setRecipeNewItem((prev) => ({ ...prev, amountDouble: e.target.value }))
                    }
                    className="w-32 px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-sub font-semibold text-xs text-slate-900"
                  />
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR INGREDIENTE (SIMPLIFICADO) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4 my-auto animate-modalIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-display text-base text-slate-900">
                {editingIngredient ? 'Editar Insumo' : 'Nuevo Insumo'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} className="space-y-3.5">
              <div>
                <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                  Nombre del Insumo
                </label>
                <input
                  type="text"
                  required
                  value={formIngredient.name}
                  onChange={(e) => setFormIngredient({ ...formIngredient, name: e.target.value })}
                  placeholder="Ej: Pan Brioche, Queso Cheddar"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                  Unidad de Medida
                </label>
                <select
                  value={formIngredient.unit}
                  onChange={(e) => setFormIngredient({ ...formIngredient, unit: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs text-slate-900 bg-white focus:outline-none focus:border-slate-900"
                >
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                    Stock Actual
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formIngredient.stock}
                    onChange={(e) => setFormIngredient({ ...formIngredient, stock: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub font-semibold text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-sub font-semibold text-xs text-slate-700 mb-1">
                    Alerta Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formIngredient.minStock}
                    onChange={(e) => setFormIngredient({ ...formIngredient, minStock: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-sub text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="relative w-full max-w-xs bg-white rounded-2xl border border-slate-200 shadow-xl p-5 text-center space-y-4 my-auto animate-modalIn">
            <h3 className="font-display text-sm text-slate-900">Eliminar insumo</h3>
            <p className="font-sub text-xs text-slate-500">
              ¿Confirmás eliminar <strong>{deleteCandidate.name}</strong> del inventario?
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="btn-cartoon-white py-2 px-4 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
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
