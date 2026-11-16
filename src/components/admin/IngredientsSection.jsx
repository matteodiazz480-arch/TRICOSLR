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

  const [proteinFilter, setProteinFilter] = useState('all'); // 'all' | 'carne' | 'pollo'

  const handleSelectProduct = (prodId) => {
    setSelectedProductId(prodId);
    setProteinFilter('all');
    const prod = products.find((p) => p.id === prodId);
    setCurrentRecipe(getProductRecipe(prodId, prod));
  };

  const detectProteinScopeForIngredient = (ingId, ingName = '', activeFilter = 'all') => {
    const refText = `${ingId} ${ingName}`.toLowerCase();
    if (
      refText.includes('pollo') ||
      refText.includes('pechuga') ||
      refText.includes('chicken') ||
      refText.includes('suprema')
    ) {
      return 'pollo';
    }
    if (
      refText.includes('carne') ||
      refText.includes('vacuna') ||
      refText.includes('asado') ||
      refText.includes('medallon') ||
      refText.includes('medallón')
    ) {
      return 'carne';
    }
    return activeFilter !== 'all' ? activeFilter : 'all';
  };

  const [recipeNewItem, setRecipeNewItem] = useState({
    ingredientId: ingredients[0]?.id || '',
    amountSimple: 1,
    doubleRule: 'duplicate',
    amountDouble: 2,
    proteinScope: 'all',
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
          proteinScope: detectProteinScopeForIngredient(first.id, first.name, 'all'),
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
    const defaultScope = detectProteinScopeForIngredient(ingId, ingObj?.name || '', proteinFilter);

    setRecipeNewItem((prev) => ({
      ...prev,
      ingredientId: ingId,
      doubleRule: defaultRule,
      amountDouble: defaultRule === 'duplicate' ? simple * 2 : simple,
      proteinScope: defaultScope,
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

    const targetScope = recipeNewItem.proteinScope || 'all';

    const newRecEntry = {
      ingredientId: targetIngId,
      ingredientName: ingObj?.name || '',
      unit: ingObj?.unit || '',
      amount: amountSimple,
      amountSimple,
      amountDouble,
      doubleRule: recipeNewItem.doubleRule,
      proteinScope: targetScope,
    };

    const existingIndex = currentRecipe.findIndex(
      (r) => r.ingredientId === targetIngId && (r.proteinScope || 'all') === targetScope
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

  const handleToggleRecipeDoubleRule = async (ingredientId, targetScope = 'all') => {
    const updatedRecipe = currentRecipe.map((item) => {
      if (item.ingredientId !== ingredientId || (item.proteinScope || 'all') !== targetScope) {
        return item;
      }
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
        proteinScope: item.proteinScope || 'all',
      };
    });

    setCurrentRecipe(updatedRecipe);
    await setProductRecipe(selectedProductId, updatedRecipe);
    showToast('Regla de variante actualizada');
  };

  const handleCycleProteinScope = async (ingredientId, currentScope = 'all') => {
    const order = ['all', 'carne', 'pollo'];
    const nextScope = order[(order.indexOf(currentScope) + 1) % order.length];

    const updatedRecipe = currentRecipe.map((item) => {
      if (item.ingredientId === ingredientId && (item.proteinScope || 'all') === currentScope) {
        return {
          ...item,
          proteinScope: nextScope,
        };
      }
      return item;
    });

    setCurrentRecipe(updatedRecipe);
    await setProductRecipe(selectedProductId, updatedRecipe);
    const labelMap = {
      all: 'Ambos (Carne y Pollo)',
      carne: 'Solo Carne',
      pollo: 'Solo Pollo',
    };
    showToast(`Aplica a: ${labelMap[nextScope]}`);
  };

  const handleRemoveFromRecipe = async (ingredientId, targetScope = 'all') => {
    const updatedRecipe = currentRecipe.filter(
      (r) => !(r.ingredientId === ingredientId && (r.proteinScope || 'all') === targetScope)
    );
    setCurrentRecipe(updatedRecipe);
    await setProductRecipe(selectedProductId, updatedRecipe);
    showToast('Ingrediente quitado de la receta');
  };

  const visibleRecipeItems = useMemo(() => {
    if (proteinFilter === 'all') return currentRecipe;
    return currentRecipe.filter((item) => {
      const sc = item.proteinScope || 'all';
      return sc === 'all' || sc === proteinFilter;
    });
  }, [currentRecipe, proteinFilter]);

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {toast && (
        <div className="p-3.5 rounded-2xl bg-cartoon-yellow text-cartoon-ink border-2 border-cartoon-ink font-sub font-bold text-xs shadow-cartoon-xs flex items-center gap-2">
          <Icon name="check_circle" size={18} />
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
      {/* SUB-PESTAÑA 2: RECETAS, VARIANTES (SIMPLE/DOBLE) Y CARNE/POLLO */}
      {/* ============================================================== */}
      {subTab === 'recetas' && (
        <div className="space-y-4">
          {/* Selector de Producto */}
          <div className="bg-white p-4 rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs space-y-2.5">
            <label className="block font-sub font-bold text-xs text-cartoon-ink">
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
                    className={`px-3.5 py-2 rounded-2xl font-sub font-bold text-xs whitespace-nowrap cursor-pointer transition-all border-2 ${
                      isSelected
                        ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-display'
                        : 'bg-white text-cartoon-ink/75 border-cartoon-ink/20 hover:border-cartoon-ink'
                    }`}
                  >
                    {prod.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuración de la Receta */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 sm:border-3 border-cartoon-ink shadow-cartoon-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b-2 border-cartoon-ink/15">
              <div>
                <h4 className="font-display text-lg text-cartoon-ink">
                  Receta de {selectedProduct?.name}
                </h4>
                <p className="font-sub font-semibold text-xs text-gray-500">
                  Diferenciá ingredientes para Carne o Pollo, y definí Simple vs Doble.
                </p>
              </div>

              {/* Selector de vista por proteína (Carne / Pollo / Todos) */}
              <div className="flex items-center gap-1.5 bg-cartoon-cream p-1 rounded-2xl border-2 border-cartoon-ink self-start sm:self-auto">
                {[
                  { id: 'all', label: `Todos (${currentRecipe.length})` },
                  { id: 'carne', label: 'Versión Carne' },
                  { id: 'pollo', label: 'Versión Pollo' },
                ].map((pf) => (
                  <button
                    key={pf.id}
                    type="button"
                    onClick={() => {
                      setProteinFilter(pf.id);
                      if (pf.id !== 'all') {
                        setRecipeNewItem((prev) => ({
                          ...prev,
                          proteinScope: detectProteinScopeForIngredient(
                            prev.ingredientId,
                            ingredients.find((i) => i.id === prev.ingredientId)?.name || '',
                            pf.id
                          ),
                        }));
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-sub font-bold text-xs cursor-pointer transition-all border ${
                      proteinFilter === pf.id
                        ? 'bg-cartoon-yellow text-cartoon-ink border-cartoon-ink shadow-cartoon-xs font-display'
                        : 'text-cartoon-ink/70 hover:text-cartoon-ink border-transparent'
                    }`}
                  >
                    {pf.label}
                  </button>
                ))}
              </div>
            </div>

            {visibleRecipeItems.length === 0 ? (
              <div className="p-6 text-center text-gray-500 font-sub font-semibold text-xs bg-cartoon-cream/40 rounded-2xl border-2 border-dashed border-cartoon-ink/25">
                Sin ingredientes asignados para esta vista. Utilizá el formulario inferior para agregarlos.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {visibleRecipeItems.map((recItem) => {
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

                  const scope = recItem.proteinScope || 'all';
                  const scopeConfig =
                    scope === 'carne'
                      ? {
                          label: 'Solo Carne',
                          cls: 'bg-rose-100 text-rose-800 border-rose-300',
                        }
                      : scope === 'pollo'
                      ? {
                          label: 'Solo Pollo',
                          cls: 'bg-amber-100 text-amber-900 border-amber-400',
                        }
                      : {
                          label: 'Carne y Pollo (Ambos)',
                          cls: 'bg-white text-cartoon-ink border-cartoon-ink/30',
                        };

                  return (
                    <div
                      key={`${recItem.ingredientId}-${scope}`}
                      className="p-3.5 rounded-2xl bg-cartoon-cream/50 border-2 border-cartoon-ink shadow-cartoon-xs flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-display text-sm text-cartoon-ink truncate">
                          {ingName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromRecipe(recItem.ingredientId, scope)}
                          className="text-gray-400 hover:text-cartoon-red cursor-pointer"
                          title="Quitar"
                        >
                          <Icon name="close" size={16} />
                        </button>
                      </div>

                      {/* Badge interactivo de Proteína (Carne / Pollo / Ambos) */}
                      <button
                        type="button"
                        onClick={() => handleCycleProteinScope(recItem.ingredientId, scope)}
                        className={`py-1 px-2.5 rounded-xl font-sub font-bold text-[11px] flex items-center justify-between cursor-pointer transition-colors border ${scopeConfig.cls}`}
                        title="Tocá para cambiar si aplica a Carne, Pollo o Ambos"
                      >
                        <span>{scopeConfig.label}</span>
                        <span className="underline text-[10px] ml-2">Cambiar</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2 rounded-xl border border-cartoon-ink/20">
                          <span className="font-sub font-bold text-[10px] text-gray-400 block">Simple</span>
                          <span className="font-display text-sm text-cartoon-ink">
                            {simpleVal} {unit}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-cartoon-ink/20">
                          <span className="font-sub font-bold text-[10px] text-gray-400 block">Doble</span>
                          <span className="font-display text-sm text-cartoon-ink">
                            {doubleVal} {unit}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleRecipeDoubleRule(recItem.ingredientId, scope)}
                        className={`py-1.5 px-2.5 rounded-xl font-sub font-bold text-[11px] flex items-center justify-between cursor-pointer transition-colors border ${
                          isFixed
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-blue-50 text-blue-800 border-blue-300'
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
              className="p-4 rounded-2xl bg-cartoon-cream/60 border-2 border-cartoon-ink space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-3">
                  <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                    Ingrediente
                  </label>
                  <select
                    value={recipeNewItem.ingredientId}
                    onChange={(e) => handleIngredientSelectChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border-2 border-cartoon-ink/30 font-sub font-semibold text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                  >
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                    Aplica a (Carne / Pollo)
                  </label>
                  <select
                    value={recipeNewItem.proteinScope}
                    onChange={(e) =>
                      setRecipeNewItem((prev) => ({ ...prev, proteinScope: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-white border-2 border-cartoon-ink/30 font-sub font-bold text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                  >
                    <option value="all">Ambos (Carne y Pollo)</option>
                    <option value="carne">Solo si pide Carne</option>
                    <option value="pollo">Solo si pide Pollo</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                    Cant. Simple
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
                    className="w-full px-3 py-2.5 rounded-xl bg-white border-2 border-cartoon-ink/30 font-sub font-bold text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                    Regla en Doble
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
                    className="w-full px-3 py-2.5 rounded-xl bg-white border-2 border-cartoon-ink/30 font-sub font-semibold text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                  >
                    <option value="duplicate">Duplicar (x2)</option>
                    <option value="fixed">Fijo (x1)</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full btn-cartoon-primary py-2.5 px-3 text-xs"
                  >
                    Guardar
                  </button>
                </div>
              </div>

              {recipeNewItem.doubleRule === 'custom' && (
                <div className="pt-2 flex items-center gap-3">
                  <label className="font-sub font-bold text-xs text-cartoon-ink">
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
                    className="w-32 px-3 py-1.5 rounded-xl bg-white border-2 border-cartoon-ink/30 font-sub font-bold text-xs text-cartoon-ink"
                  />
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR INGREDIENTE (ESTILO CARTOON) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="relative w-full max-w-sm bg-white rounded-3xl border-3 border-cartoon-ink shadow-cartoon overflow-hidden my-auto animate-modalIn">
            <div className="p-4 bg-cartoon-yellow border-b-3 border-cartoon-ink flex items-center justify-between">
              <h3 className="font-display text-lg text-cartoon-ink">
                {editingIngredient ? 'Editar Insumo' : 'Nuevo Insumo'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white hover:bg-cartoon-cream border-2 border-cartoon-ink shadow-cartoon-xs flex items-center justify-center text-cartoon-ink cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} className="p-5 space-y-3.5">
              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                  Nombre del Insumo
                </label>
                <input
                  type="text"
                  required
                  value={formIngredient.name}
                  onChange={(e) => setFormIngredient({ ...formIngredient, name: e.target.value })}
                  placeholder="Ej: Pan Brioche, Pechuga de Pollo"
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                />
              </div>

              <div>
                <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                  Unidad de Medida
                </label>
                <select
                  value={formIngredient.unit}
                  onChange={(e) => setFormIngredient({ ...formIngredient, unit: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub font-bold text-xs text-cartoon-ink bg-white focus:outline-none focus:border-cartoon-ink"
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
                  <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                    Stock Actual
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formIngredient.stock}
                    onChange={(e) => setFormIngredient({ ...formIngredient, stock: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub font-bold text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
                  />
                </div>

                <div>
                  <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1">
                    Alerta Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formIngredient.minStock}
                    onChange={(e) => setFormIngredient({ ...formIngredient, minStock: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-cartoon-ink/30 font-sub font-bold text-xs text-cartoon-ink focus:outline-none focus:border-cartoon-ink"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="relative w-full max-w-xs bg-white rounded-3xl border-3 border-cartoon-ink shadow-cartoon p-6 text-center space-y-4 my-auto animate-modalIn">
            <h3 className="font-display text-base text-cartoon-ink">Eliminar insumo</h3>
            <p className="font-sub text-xs text-gray-600">
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
