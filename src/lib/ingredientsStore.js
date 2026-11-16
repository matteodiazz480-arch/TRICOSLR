/**
 * Módulo de Gestión de Inventario de Ingredientes y Recetas (Escandallo) para Trico's.
 * Sincronización en tiempo real multiplataforma con Firestore, BroadcastChannel y localStorage.
 * 
 * ESTRUCTURA DE BASE DE DATOS (FIREBASE FIRESTORE):
 * - Colección 'ingredients': documentos individuales por ingrediente y documento 'main'
 * - Colección 'recipes': recetas por plato y documento 'main'
 * - Colección 'promotions': documentos 'inventory' y 'recipes' como canal directo de sincronización
 * - Colección 'inventory': respaldos generales 'ingredients_data' y 'recipes_data'
 */
import { initFirebase } from './firebase.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';

export const INGREDIENTS_KEY = 'tricos_ingredients_data';
export const RECIPES_KEY = 'tricos_recipes_data';

// ============================================================================
// 1. INGREDIENTES INICIALES REALISTAS
// ============================================================================
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
    id: 'ing-huevo-frito',
    name: 'Huevo de Campo / Frito',
    unit: 'unidades',
    stock: 150,
    minStock: 30,
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
  {
    id: 'ing-guacamole',
    name: 'Guacamole Artesanal',
    unit: 'g',
    stock: 3000,
    minStock: 500,
  },
  {
    id: 'ing-doritos',
    name: 'Doritos Crocantes',
    unit: 'g',
    stock: 2000,
    minStock: 300,
  },
];

// ============================================================================
// 2. RECETAS POR DEFECTO CON REGLAS DE VARIANTES (SIMPLE VS DOBLE)
// doubleRule: 'duplicate' (x2 en doble) | 'fixed' (mismo valor, ej: pan o huevo) | 'custom'
// ============================================================================
export const DEFAULT_RECIPES = {
  // AK-47
  'burger-ak47': [
    { ingredientId: 'ing-carne-medallon', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate' },
    { ingredientId: 'ing-pan-brioche', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed' },
    { ingredientId: 'ing-queso-cheddar', amount: 3, amountSimple: 3, amountDouble: 6, doubleRule: 'duplicate' },
    { ingredientId: 'ing-bacon-ahumado', amount: 30, amountSimple: 30, amountDouble: 60, doubleRule: 'duplicate' },
    { ingredientId: 'ing-alioli', amount: 20, amountSimple: 20, amountDouble: 20, doubleRule: 'fixed' },
    { ingredientId: 'ing-papas-rusticas', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed' },
  ],
  // London Cheese
  'burger-london-cheese': [
    { ingredientId: 'ing-carne-medallon', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate' },
    { ingredientId: 'ing-pan-brioche', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed' },
    { ingredientId: 'ing-queso-cheddar', amount: 3, amountSimple: 3, amountDouble: 6, doubleRule: 'duplicate' },
    { ingredientId: 'ing-bacon-ahumado', amount: 30, amountSimple: 30, amountDouble: 60, doubleRule: 'duplicate' },
    { ingredientId: 'ing-barbacoa', amount: 25, amountSimple: 25, amountDouble: 25, doubleRule: 'fixed' },
    { ingredientId: 'ing-papas-rusticas', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed' },
  ],
  // Lemon Haze
  'burger-lemon-haze': [
    { ingredientId: 'ing-carne-medallon', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate' },
    { ingredientId: 'ing-pan-brioche', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed' },
    { ingredientId: 'ing-queso-tybo', amount: 2, amountSimple: 2, amountDouble: 4, doubleRule: 'duplicate' },
    { ingredientId: 'ing-lechuga-tomate', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed' },
    { ingredientId: 'ing-alioli', amount: 20, amountSimple: 20, amountDouble: 20, doubleRule: 'fixed' },
    { ingredientId: 'ing-papas-rusticas', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed' },
  ],
  // Gorila Glue (Ejemplo exacto del usuario: carne y queso duplican, pero huevo y pan se mantienen fijos en 1)
  'burger-gorila-glue': [
    { ingredientId: 'ing-carne-medallon', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate' },
    { ingredientId: 'ing-pan-brioche', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed' },
    { ingredientId: 'ing-queso-azul', amount: 40, amountSimple: 40, amountDouble: 80, doubleRule: 'duplicate' },
    { ingredientId: 'ing-bacon-ahumado', amount: 30, amountSimple: 30, amountDouble: 60, doubleRule: 'duplicate' },
    { ingredientId: 'ing-queso-tybo', amount: 2, amountSimple: 2, amountDouble: 4, doubleRule: 'duplicate' },
    { ingredientId: 'ing-huevo-frito', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed' }, // 🔒 EXCEPCIÓN: 1 solo huevo frito en simple y en doble
    { ingredientId: 'ing-alioli', amount: 20, amountSimple: 20, amountDouble: 20, doubleRule: 'fixed' },
    { ingredientId: 'ing-papas-rusticas', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed' },
  ],
  // Amnesia (lleva huevo frito también como excepción fija)
  'burger-amnesia': [
    { ingredientId: 'ing-carne-medallon', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate' },
    { ingredientId: 'ing-pan-brioche', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed' },
    { ingredientId: 'ing-huevo-frito', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed' },
    { ingredientId: 'ing-guacamole', amount: 30, amountSimple: 30, amountDouble: 30, doubleRule: 'fixed' },
    { ingredientId: 'ing-alioli', amount: 20, amountSimple: 20, amountDouble: 20, doubleRule: 'fixed' },
    { ingredientId: 'ing-papas-rusticas', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed' },
  ],
  // Acapulco Gold
  'burger-acapulco-gold': [
    { ingredientId: 'ing-carne-medallon', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate' },
    { ingredientId: 'ing-pan-brioche', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed' },
    { ingredientId: 'ing-queso-cheddar', amount: 3, amountSimple: 3, amountDouble: 6, doubleRule: 'duplicate' },
    { ingredientId: 'ing-guacamole', amount: 30, amountSimple: 30, amountDouble: 30, doubleRule: 'fixed' },
    { ingredientId: 'ing-doritos', amount: 25, amountSimple: 25, amountDouble: 25, doubleRule: 'fixed' },
    { ingredientId: 'ing-alioli', amount: 20, amountSimple: 20, amountDouble: 20, doubleRule: 'fixed' },
    { ingredientId: 'ing-papas-rusticas', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed' },
  ],
  // Pollo Tiras
  'pollo-tiras-x6': [
    { ingredientId: 'ing-pollo-crujiente', amount: 300, amountSimple: 300, amountDouble: 300, doubleRule: 'fixed' },
    { ingredientId: 'ing-alioli', amount: 40, amountSimple: 40, amountDouble: 40, doubleRule: 'fixed' },
    { ingredientId: 'ing-papas-rusticas', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed' },
  ],
  // Papas Cheddar & Bacon
  'papas-cheddar-bacon': [
    { ingredientId: 'ing-papas-rusticas', amount: 400, amountSimple: 400, amountDouble: 400, doubleRule: 'fixed' },
    { ingredientId: 'ing-queso-cheddar', amount: 4, amountSimple: 4, amountDouble: 4, doubleRule: 'fixed' },
    { ingredientId: 'ing-bacon-ahumado', amount: 40, amountSimple: 40, amountDouble: 40, doubleRule: 'fixed' },
  ],
};

// ============================================================================
// 3. CÁLCULO DE CANTIDAD A DESCONTAR SEGÚN VARIANTE Y REGLAS
// ============================================================================
/**
 * Determina con precisión la cantidad a descontar de un insumo de la receta
 * según la variante (Simple vs Doble) y respetando las excepciones de duplicación.
 */
export const getRecipeItemDeduction = (recItem, isDouble = false) => {
  const simpleAmount = Number(recItem.amountSimple ?? recItem.amount) || 0;
  if (!isDouble) {
    return simpleAmount;
  }

  // 1. Si la regla es explícitamente fija: se mantiene igual que en Simple
  if (recItem.doubleRule === 'fixed') {
    return simpleAmount;
  }

  // 2. Si la regla es duplicar: exactamente el doble
  if (recItem.doubleRule === 'duplicate') {
    return simpleAmount * 2;
  }

  // 3. Si la regla es personalizada y tiene un monto numérico configurado
  if (recItem.doubleRule === 'custom' && recItem.amountDouble !== undefined && recItem.amountDouble !== null && recItem.amountDouble !== '') {
    return Number(recItem.amountDouble) || simpleAmount;
  }

  // 4. Si tiene amountDouble explícito sin importar la regla
  if (recItem.amountDouble !== undefined && recItem.amountDouble !== null && recItem.amountDouble !== '') {
    return Number(recItem.amountDouble);
  }

  // 5. Fallback inteligente de seguridad para insumos sin regla asignada:
  // Panes, huevos, salsas, verduras y papas NO se duplican por defecto.
  const ingId = (recItem.ingredientId || '').toLowerCase();
  const isFixedByDefault =
    ingId.includes('pan') ||
    ingId.includes('huevo') ||
    ingId.includes('salsa') ||
    ingId.includes('alioli') ||
    ingId.includes('barbacoa') ||
    ingId.includes('lechuga') ||
    ingId.includes('tomate') ||
    ingId.includes('guacamole') ||
    ingId.includes('doritos') ||
    ingId.includes('papas');

  return isFixedByDefault ? simpleAmount : simpleAmount * 2;
};

// ============================================================================
// 4. OBTENER Y GUARDAR INGREDIENTES (PERSISTENCIA Y NUBE)
// ============================================================================
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

export const saveIngredients = async (items, shouldSyncCloud = true) => {
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
      const now = new Date().toISOString();
      const payload = { items, updatedAt: now };

      // 1. Canal primario directo de sincronización inmediata
      try {
        await setDoc(doc(db, 'promotions', 'inventory'), payload, { merge: true });
      } catch (err) {
        console.warn('Sync promotions/inventory:', err.message);
      }

      // 2. Tabla / Colección 'ingredients' (documento maestro y documentos individuales)
      try {
        await setDoc(doc(db, 'ingredients', 'main'), payload, { merge: true });
        if (Array.isArray(items)) {
          for (const ing of items) {
            if (ing && ing.id) {
              setDoc(doc(db, 'ingredients', ing.id), { ...ing, updatedAt: now }, { merge: true }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn('Sync tabla ingredients:', err.message);
      }

      // 3. Tabla / Colección 'inventory' (respaldo histórico)
      try {
        setDoc(doc(db, 'inventory', 'ingredients_data'), payload, { merge: true }).catch(() => {});
      } catch {}
    }
  }
};

// ============================================================================
// 5. SUSCRIPCIÓN EN TIEMPO REAL A INGREDIENTES
// ============================================================================
export const subscribeToIngredients = (callback) => {
  // Entregar inmediatamente la versión en memoria o local para respuesta instantánea
  callback(getIngredients());

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

  // Sincronización en tiempo real con Firestore
  const { isConfigured, db } = initFirebase();
  const unsubs = [];

  if (isConfigured && db) {
    // Escuchar documento 'promotions/inventory' (disponible sin fricción)
    try {
      const un1 = onSnapshot(
        doc(db, 'promotions', 'inventory'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (Array.isArray(data.items) && data.items.length > 0) {
              callback(data.items);
              saveIngredients(data.items, false);
            }
          }
        },
        () => {}
      );
      unsubs.push(un1);
    } catch {}

    // Escuchar colección / documento 'ingredients/main'
    try {
      const un2 = onSnapshot(
        doc(db, 'ingredients', 'main'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (Array.isArray(data.items) && data.items.length > 0) {
              callback(data.items);
              saveIngredients(data.items, false);
            }
          }
        },
        () => {}
      );
      unsubs.push(un2);
    } catch {}
  }

  return () => {
    window.removeEventListener('tricos_ingredients_sync', syncHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel) channel.close();
    unsubs.forEach((fn) => {
      if (typeof fn === 'function') fn();
    });
  };
};

// ============================================================================
// 6. OPERACIONES CRUD DE INGREDIENTES
// ============================================================================
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

// ============================================================================
// 7. GESTIÓN Y PERSISTENCIA DE RECETAS POR PRODUCTO
// ============================================================================
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

export const saveRecipes = async (recipes, shouldSyncCloud = true) => {
  try {
    localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
    window.dispatchEvent(new CustomEvent('tricos_recipes_sync', { detail: recipes }));
  } catch (e) {
    console.error('Error guardando recetas:', e);
  }

  if (shouldSyncCloud) {
    const { isConfigured, db } = initFirebase();
    if (isConfigured && db) {
      const now = new Date().toISOString();
      const payload = { recipes, updatedAt: now };

      // 1. Canal primario directo
      try {
        await setDoc(doc(db, 'promotions', 'recipes'), payload, { merge: true });
      } catch (err) {
        console.warn('Sync promotions/recipes:', err.message);
      }

      // 2. Tabla / Colección 'recipes'
      try {
        await setDoc(doc(db, 'recipes', 'main'), payload, { merge: true });
        for (const [prodId, items] of Object.entries(recipes)) {
          setDoc(doc(db, 'recipes', prodId), { productId: prodId, items, updatedAt: now }, { merge: true }).catch(() => {});
        }
      } catch (err) {
        console.warn('Sync tabla recipes:', err.message);
      }

      // 3. Tabla / Colección 'inventory' (respaldo)
      try {
        setDoc(doc(db, 'inventory', 'recipes_data'), payload, { merge: true }).catch(() => {});
      } catch {}
    }
  }
};

export const subscribeToRecipes = (callback) => {
  callback(getRecipes());

  const syncHandler = (e) => {
    if (e.detail && typeof e.detail === 'object') callback(e.detail);
  };
  window.addEventListener('tricos_recipes_sync', syncHandler);

  const storageHandler = (e) => {
    if (e.key === RECIPES_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && typeof parsed === 'object') callback(parsed);
      } catch {}
    }
  };
  window.addEventListener('storage', storageHandler);

  const { isConfigured, db } = initFirebase();
  const unsubs = [];

  if (isConfigured && db) {
    try {
      const u1 = onSnapshot(
        doc(db, 'promotions', 'recipes'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.recipes && typeof data.recipes === 'object') {
              callback(data.recipes);
              saveRecipes(data.recipes, false);
            }
          }
        },
        () => {}
      );
      unsubs.push(u1);
    } catch {}

    try {
      const u2 = onSnapshot(
        doc(db, 'recipes', 'main'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.recipes && typeof data.recipes === 'object') {
              callback(data.recipes);
              saveRecipes(data.recipes, false);
            }
          }
        },
        () => {}
      );
      unsubs.push(u2);
    } catch {}
  }

  return () => {
    window.removeEventListener('tricos_recipes_sync', syncHandler);
    window.removeEventListener('storage', storageHandler);
    unsubs.forEach((fn) => {
      if (typeof fn === 'function') fn();
    });
  };
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

// ============================================================================
// 8. DESCUENTO AUTOMÁTICO DE INGREDIENTES AL CONFIRMAR UN PEDIDO
// Descuenta en tiempo real del stock de ingredientes según variante y receta
// ============================================================================
/**
 * Descuenta del stock de ingredientes las cantidades correspondientes
 * a los productos solicitados en el pedido, con control granular de variantes (Simple vs Doble).
 * @param {Array} orderItems - Platos solicitados en el pedido
 * @param {Array} products - Lista de platos actual de la carta
 * @returns {Promise<Array>} Lista actualizada de ingredientes sincronizada con la nube
 */
export const deductIngredientsForOrder = async (orderItems = [], products = []) => {
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
        (p) => p.id === prodId || (p.id && prodId && String(prodId).startsWith(p.id))
      );
      if (foundProd) {
        recipe = foundProd.recipe || allRecipes[foundProd.id] || DEFAULT_RECIPES[foundProd.id];
      }
    }

    // Detectar si la hamburguesa es variante Doble
    const isDouble =
      (item.variant || '').toLowerCase().includes('doble') ||
      (item.variantId || '').toLowerCase().includes('doble') ||
      (item.name || '').toLowerCase().includes('doble');

    // Detectar si el cliente eligió medallón de pollo en lugar de carne
    const isChicken =
      (item.protein || '').toLowerCase().includes('pollo') ||
      (item.name || '').toLowerCase().includes('[pollo]') ||
      (item.name || '').toLowerCase().includes('pollo crunch');

    if (Array.isArray(recipe) && recipe.length > 0) {
      recipe.forEach((recItem) => {
        let targetId = recItem.ingredientId;
        // Si el plato permite elegir carne o pollo y eligió pollo:
        if (targetId === 'ing-carne-medallon' && isChicken) {
          targetId = 'ing-pollo-crujiente';
        }

        const targetIng = ingMap.get(targetId);
        if (targetIng) {
          // Obtener cantidad según variante Simple o Doble con sus excepciones
          const unitAmount = getRecipeItemDeduction(recItem, isDouble);
          const totalDeduction = unitAmount * qty;
          targetIng.stock = Math.max(0, targetIng.stock - totalDeduction);
          anyDeducted = true;
        }
      });
    } else {
      // Receta genérica de respaldo si es hamburguesa sin receta explícita asignada
      const isBurger =
        (item.category || '').includes('burger') ||
        (item.name || '').toLowerCase().includes('burger') ||
        (item.name || '').toLowerCase().includes('kush') ||
        (item.name || '').toLowerCase().includes('cheese');

      if (isBurger) {
        const meatId = isChicken ? 'ing-pollo-crujiente' : 'ing-carne-medallon';
        const meat = ingMap.get(meatId);
        const pan = ingMap.get('ing-pan-brioche');
        const cheddar = ingMap.get('ing-queso-cheddar');
        const papas = ingMap.get('ing-papas-rusticas');

        // Carne se duplica en doble (150g -> 300g)
        const meatGrams = (isDouble ? 300 : 150) * qty;
        // Pan es 1 siempre (fijo)
        const panUnits = 1 * qty;
        // Cheddar se duplica en doble (2 -> 4 fetas)
        const cheddarFetas = (isDouble ? 4 : 2) * qty;
        // Papas de guarnición fijas (200g)
        const papasGrams = 200 * qty;

        if (meat) meat.stock = Math.max(0, meat.stock - meatGrams);
        if (pan) pan.stock = Math.max(0, pan.stock - panUnits);
        if (cheddar) cheddar.stock = Math.max(0, cheddar.stock - cheddarFetas);
        if (papas) papas.stock = Math.max(0, papas.stock - papasGrams);
        anyDeducted = true;
      }
    }
  });

  if (anyDeducted) {
    const updatedList = Array.from(ingMap.values());
    await saveIngredients(updatedList, true);
    console.log('✅ Stock de ingredientes descontado automáticamente por pedido:', orderItems);
    return updatedList;
  }

  return ingredientsList;
};
