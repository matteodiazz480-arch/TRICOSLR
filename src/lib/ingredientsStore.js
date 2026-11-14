/**
 * Módulo de Gestión de Inventario de Ingredientes y Recetas (Escandallo) para Trico's.
 * Sincronización en tiempo real con localStorage, BroadcastChannel y Firestore.
 */
import { initFirebase } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';

const INGREDIENTS_KEY = 'tricos_ingredients_data';
const RECIPES_KEY = 'tricos_recipes_data';

// Ingredientes iniciales realistas para una hamburguesería artesanal
export const DEFAULT_INGREDIENTS = [
  {
    id: 'ing-carne-medallon',
    name: 'Carne Vacuna Premium (Tapa de Asado)',
    unit: 'g', // gramos
    stock: 25000, // 25 kg
    minStock: 4000, // Alerta a 4 kg
  },
  {
    id: 'ing-pollo-crujiente',
    name: 'Pechuga de Pollo Marinado y Rebozado',
    unit: 'g',
    stock: 18000, // 18 kg
    minStock: 3000,
  },
  {
    id: 'ing-pan-brioche',
    name: 'Pan Brioche Artesanal',
    unit: 'unidades',
    stock: 120, // 120 panes
    minStock: 25,
  },
  {
    id: 'ing-queso-cheddar',
    name: 'Feta de Queso Cheddar Americano',
    unit: 'fetas',
    stock: 350,
    minStock: 50,
  },
  {
    id: 'ing-bacon-ahumado',
    name: 'Panceta / Bacon Ahumado Crocante',
    unit: 'g',
    stock: 6000,
    minStock: 1000,
  },
  {
    id: 'ing-queso-tybo',
    name: 'Feta de Queso Tybo Cremoso',
    unit: 'fetas',
    stock: 220,
    minStock: 40,
  },
  {
    id: 'ing-queso-azul',
    name: 'Queso Azul / Roquefort',
    unit: 'g',
    stock: 3500,
    minStock: 600,
  },
  {
    id: 'ing-papas-rusticas',
    name: 'Papas Rústicas para Freír',
    unit: 'g',
    stock: 40000, // 40 kg
    minStock: 8000,
  },
  {
    id: 'ing-cebolla-crispy',
    name: 'Cebolla Crispy',
    unit: 'g',
    stock: 3500,
    minStock: 700,
  },
  {
    id: 'ing-alioli',
    name: 'Salsa Alioli de la Casa',
    unit: 'ml',
    stock: 6000,
    minStock: 1200,
  },
  {
    id: 'ing-barbacoa',
    name: 'Salsa Barbacoa Ahumada',
    unit: 'ml',
    stock: 5000,
    minStock: 1000,
  },
  {
    id: 'ing-lechuga-tomate',
    name: 'Verduras Frescas (Lechuga y Tomate)',
    unit: 'porciones',
    stock: 80,
    minStock: 15,
  },
];

// Recetas por defecto por plato (ingredientes necesarios por unidad de hamburguesa/plato)
export const DEFAULT_RECIPES = {
  'burger-ak47': [
    { ingredientId: 'ing-carne-medallon', amount: 150 }, // 150g carne
    { ingredientId: 'ing-pan-brioche', amount: 1 },      // 1 pan
    { ingredientId: 'ing-queso-cheddar', amount: 3 },     // 3 fetas cheddar
    { ingredientId: 'ing-bacon-ahumado', amount: 30 },    // 30g bacon
    { ingredientId: 'ing-alioli', amount: 20 },           // 20ml alioli
    { ingredientId: 'ing-papas-rusticas', amount: 200 },  // 200g papas guarnición
  ],
  'burger-london-cheese': [
    { ingredientId: 'ing-carne-medallon', amount: 150 },
    { ingredientId: 'ing-pan-brioche', amount: 1 },
    { ingredientId: 'ing-queso-cheddar', amount: 3 },
    { ingredientId: 'ing-bacon-ahumado', amount: 30 },
    { ingredientId: 'ing-barbacoa', amount: 25 },
    { ingredientId: 'ing-papas-rusticas', amount: 200 },
  ],
  'burger-lemon-haze': [
    { ingredientId: 'ing-carne-medallon', amount: 150 },
    { ingredientId: 'ing-pan-brioche', amount: 1 },
    { ingredientId: 'ing-queso-tybo', amount: 2 },
    { ingredientId: 'ing-lechuga-tomate', amount: 1 },
    { ingredientId: 'ing-alioli', amount: 20 },
    { ingredientId: 'ing-papas-rusticas', amount: 200 },
  ],
  'burger-gorila-glue': [
    { ingredientId: 'ing-carne-medallon', amount: 150 },
    { ingredientId: 'ing-pan-brioche', amount: 1 },
    { ingredientId: 'ing-queso-azul', amount: 40 },
    { ingredientId: 'ing-bacon-ahumado', amount: 30 },
    { ingredientId: 'ing-queso-tybo', amount: 2 },
    { ingredientId: 'ing-alioli', amount: 20 },
    { ingredientId: 'ing-papas-rusticas', amount: 200 },
  ],
  'pollo-tiras-x6': [
    { ingredientId: 'ing-pollo-crujiente', amount: 300 }, // 300g pollo
    { ingredientId: 'ing-alioli', amount: 40 },
    { ingredientId: 'ing-papas-rusticas', amount: 200 },
  ],
  'papas-cheddar-bacon': [
    { ingredientId: 'ing-papas-rusticas', amount: 400 },
    { ingredientId: 'ing-queso-cheddar', amount: 4 },
    { ingredientId: 'ing-bacon-ahumado', amount: 40 },
  ],
};

// -------------------------------------------------------------
// OBTENER Y GUARDAR INGREDIENTES
// -------------------------------------------------------------
export const getIngredients = () => {
  try {
    const raw = localStorage.getItem(INGREDIENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  saveIngredients(DEFAULT_INGREDIENTS, false);
  return DEFAULT_INGREDIENTS;
};

export const saveIngredients = (items, shouldSyncCloud = true) => {
  try {
    localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('tricos_ingredients_sync', { detail: items }));
    try {
      const ch = new BroadcastChannel('tricos_ingredients_channel');
      ch.postMessage(items);
      ch.close();
    } catch {}
  } catch (e) {
    console.error('Error guardando ingredientes en localStorage:', e);
  }

  if (shouldSyncCloud) {
    const { isConfigured, db } = initFirebase();
    if (isConfigured && db) {
      try {
        setDoc(doc(db, 'inventory', 'ingredients_data'), {
          items,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      } catch {}
    }
  }
};

// -------------------------------------------------------------
// SUSCRIPCIÓN EN TIEMPO REAL
// -------------------------------------------------------------
export const subscribeToIngredients = (callback) => {
  const syncHandler = (e) => {
    if (Array.isArray(e.detail)) callback(e.detail);
  };
  window.addEventListener('tricos_ingredients_sync', syncHandler);

  const storageHandler = (e) => {
    if (e.key === INGREDIENTS_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) callback(parsed);
      } catch {}
    }
  };
  window.addEventListener('storage', storageHandler);

  let channel = null;
  try {
    channel = new BroadcastChannel('tricos_ingredients_channel');
    channel.onmessage = (msg) => {
      if (Array.isArray(msg.data)) callback(msg.data);
    };
  } catch {}

  // Firestore sync
  const { isConfigured, db } = initFirebase();
  let unsubscribeFirestore = null;
  if (isConfigured && db) {
    try {
      unsubscribeFirestore = onSnapshot(
        doc(db, 'inventory', 'ingredients_data'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (Array.isArray(data.items)) {
              callback(data.items);
              saveIngredients(data.items, false);
            }
          }
        },
        () => {}
      );
    } catch {}
  }

  return () => {
    window.removeEventListener('tricos_ingredients_sync', syncHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel) channel.close();
    if (typeof unsubscribeFirestore === 'function') unsubscribeFirestore();
  };
};

// -------------------------------------------------------------
// OPERACIONES CRUD DE INGREDIENTES
// -------------------------------------------------------------
export const addIngredient = (ingredientData) => {
  const list = getIngredients();
  const cleanName = (ingredientData.name || '').trim();
  if (!cleanName) return list;

  const newIngredient = {
    id: ingredientData.id || `ing-${Date.now()}`,
    name: cleanName,
    unit: ingredientData.unit || 'g',
    stock: Math.max(0, Number(ingredientData.stock) || 0),
    minStock: Math.max(0, Number(ingredientData.minStock) || 0),
  };

  const next = [newIngredient, ...list];
  saveIngredients(next, true);
  return next;
};

export const updateIngredient = (id, updates) => {
  const list = getIngredients();
  const next = list.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        ...updates,
        stock: updates.stock !== undefined ? Math.max(0, Number(updates.stock) || 0) : item.stock,
        minStock: updates.minStock !== undefined ? Math.max(0, Number(updates.minStock) || 0) : item.minStock,
      };
    }
    return item;
  });
  saveIngredients(next, true);
  return next;
};

export const deleteIngredient = (id) => {
  const list = getIngredients();
  const next = list.filter((i) => i.id !== id);
  saveIngredients(next, true);
  return next;
};

export const adjustIngredientStock = (id, delta) => {
  const list = getIngredients();
  const next = list.map((item) => {
    if (item.id === id) {
      const newStock = Math.max(0, (Number(item.stock) || 0) + Number(delta));
      return { ...item, stock: newStock };
    }
    return item;
  });
  saveIngredients(next, true);
  return next;
};

// -------------------------------------------------------------
// GESTIÓN DE RECETAS POR PRODUCTO
// -------------------------------------------------------------
export const getRecipes = () => {
  try {
    const raw = localStorage.getItem(RECIPES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_RECIPES, ...parsed };
      }
    }
  } catch {}

  saveRecipes(DEFAULT_RECIPES, false);
  return DEFAULT_RECIPES;
};

export const saveRecipes = (recipes, shouldSyncCloud = true) => {
  try {
    localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
    window.dispatchEvent(new CustomEvent('tricos_recipes_sync', { detail: recipes }));
  } catch (e) {
    console.error('Error guardando recetas:', e);
  }

  if (shouldSyncCloud) {
    const { isConfigured, db } = initFirebase();
    if (isConfigured && db) {
      try {
        setDoc(doc(db, 'inventory', 'recipes_data'), {
          recipes,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      } catch {}
    }
  }
};

export const getProductRecipe = (productId, product = null) => {
  if (product && Array.isArray(product.recipe) && product.recipe.length > 0) {
    return product.recipe;
  }
  const allRecipes = getRecipes();
  return allRecipes[productId] || DEFAULT_RECIPES[productId] || [];
};

export const setProductRecipe = (productId, recipeItems) => {
  const allRecipes = getRecipes();
  const next = {
    ...allRecipes,
    [productId]: recipeItems,
  };
  saveRecipes(next, true);
  return next;
};

// -------------------------------------------------------------
// DESCUENTO AUTOMÁTICO DE INGREDIENTES AL CONFIRMAR UN PEDIDO
// -------------------------------------------------------------
/**
 * Descuenta del stock de ingredientes las cantidades correspondientes
 * a los productos solicitados en el pedido.
 * @param {Array} orderItems - Platos solicitados en el pedido [{ id, quantity, productId, ... }]
 * @param {Array} products - Lista de platos actual de la carta
 * @returns {Array} Lista actualizada de ingredientes
 */
export const deductIngredientsForOrder = (orderItems = [], products = []) => {
  if (!orderItems || orderItems.length === 0) return getIngredients();

  const ingredientsList = [...getIngredients()];
  const allRecipes = getRecipes();

  // Mapear ingredientes por ID para acceso O(1)
  const ingMap = new Map();
  ingredientsList.forEach((ing) => ingMap.set(ing.id, { ...ing }));

  let anyDeducted = false;

  orderItems.forEach((item) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const prodId = item.productId || item.originalId || item.id;

    // Buscar receta asociada
    let recipe = allRecipes[prodId] || DEFAULT_RECIPES[prodId];
    if (!recipe && Array.isArray(item.recipe)) recipe = item.recipe;

    // Si aún no se encontró, buscar en la lista de productos por ID o coincidencia de prefijo
    if (!recipe && Array.isArray(products)) {
      const foundProd = products.find(
        (p) => p.id === prodId || (p.id && prodId && prodId.startsWith(p.id))
      );
      if (foundProd) {
        recipe = foundProd.recipe || allRecipes[foundProd.id] || DEFAULT_RECIPES[foundProd.id];
      }
    }

    // Si la hamburguesa es variante Doble, multiplicar proporcionalmente la carne
    const isDouble =
      (item.variant?.label || '').toLowerCase().includes('doble') ||
      (item.name || '').toLowerCase().includes('doble');

    if (Array.isArray(recipe) && recipe.length > 0) {
      recipe.forEach((recItem) => {
        const targetIng = ingMap.get(recItem.ingredientId);
        if (targetIng) {
          let unitAmount = Number(recItem.amount) || 0;
          // Si es doble y el ingrediente es carne, se duplica el medallón
          if (isDouble && recItem.ingredientId === 'ing-carne-medallon') {
            unitAmount *= 2;
          }
          const totalDeduction = unitAmount * qty;
          targetIng.stock = Math.max(0, targetIng.stock - totalDeduction);
          anyDeducted = true;
        }
      });
    } else {
      // Receta genérica de respaldo si es hamburguesa sin receta explícita
      const isBurger =
        (item.category || '').includes('burger') ||
        (item.name || '').toLowerCase().includes('burger') ||
        (item.name || '').toLowerCase().includes('kush');

      if (isBurger) {
        const carne = ingMap.get('ing-carne-medallon');
        const pan = ingMap.get('ing-pan-brioche');
        const cheddar = ingMap.get('ing-queso-cheddar');
        const papas = ingMap.get('ing-papas-rusticas');

        const carneGrams = (isDouble ? 300 : 150) * qty;
        if (carne) carne.stock = Math.max(0, carne.stock - carneGrams);
        if (pan) pan.stock = Math.max(0, pan.stock - 1 * qty);
        if (cheddar) cheddar.stock = Math.max(0, cheddar.stock - 2 * qty);
        if (papas) papas.stock = Math.max(0, papas.stock - 200 * qty);
        anyDeducted = true;
      }
    }
  });

  if (anyDeducted) {
    const updatedList = Array.from(ingMap.values());
    saveIngredients(updatedList, true);
    console.log('✅ Stock de ingredientes descontado automáticamente por pedido:', orderItems);
    return updatedList;
  }

  return ingredientsList;
};
