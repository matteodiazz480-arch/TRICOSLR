/**
 * Módulo de Gestión de Inventario de Ingredientes y Recetas (Escandallo) para Trico's.
 * Sincronización en tiempo real multiplataforma con Firestore, BroadcastChannel y localStorage.
 *
 * ESTRUCTURA DE BASE DE DATOS (FIREBASE FIRESTORE):
 * - Colección 'ingredients': documentos individuales por ingrediente y documento 'main'
 * - Colección 'recipes': recetas por plato y documento 'main'
 * - Colección 'promotions': documentos 'inventory' y 'recipes' como canal directo de sincronización
 * - Colección 'products': cada producto sincroniza su propiedad 'recipe'
 */
import { initFirebase, sanitizeForFirestore } from './firebase.js';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export const INGREDIENTS_KEY = 'tricos_ingredients_data';
export const RECIPES_KEY = 'tricos_recipes_data';

// ============================================================================
// 1. INGREDIENTES INICIALES REALISTAS
// ============================================================================
export const DEFAULT_INGREDIENTS = [
  {
    id: 'ing-carne-medallon',
    name: 'Carne Vacuna Premium (Tapa de Asado)',
    unit: 'g',
    stock: 25000,
    minStock: 4000,
    outOfStock: false,
  },
  {
    id: 'ing-pollo-crujiente',
    name: 'Pechuga de Pollo Marinado y Rebozado',
    unit: 'g',
    stock: 18000,
    minStock: 3000,
    outOfStock: false,
  },
  {
    id: 'ing-pan-brioche',
    name: 'Pan Brioche Artesanal',
    unit: 'unidades',
    stock: 120,
    minStock: 25,
    outOfStock: false,
  },
  {
    id: 'ing-queso-cheddar',
    name: 'Feta de Queso Cheddar Americano',
    unit: 'fetas',
    stock: 350,
    minStock: 50,
    outOfStock: false,
  },
  {
    id: 'ing-bacon-ahumado',
    name: 'Panceta / Bacon Ahumado Crocante',
    unit: 'g',
    stock: 6000,
    minStock: 1000,
    outOfStock: false,
  },
  {
    id: 'ing-queso-tybo',
    name: 'Feta de Queso Tybo Cremoso',
    unit: 'fetas',
    stock: 220,
    minStock: 40,
    outOfStock: false,
  },
  {
    id: 'ing-queso-azul',
    name: 'Queso Azul / Roquefort',
    unit: 'g',
    stock: 3500,
    minStock: 600,
    outOfStock: false,
  },
  {
    id: 'ing-huevo-frito',
    name: 'Huevo de Campo / Frito',
    unit: 'unidades',
    stock: 150,
    minStock: 30,
    outOfStock: false,
  },
  {
    id: 'ing-papas-rusticas',
    name: 'Papas Rústicas para Freír',
    unit: 'g',
    stock: 40000,
    minStock: 8000,
    outOfStock: false,
  },
  {
    id: 'ing-cebolla-crispy',
    name: 'Cebolla Crispy',
    unit: 'g',
    stock: 3500,
    minStock: 700,
    outOfStock: false,
  },
  {
    id: 'ing-alioli',
    name: 'Salsa Alioli de la Casa',
    unit: 'ml',
    stock: 6000,
    minStock: 1200,
    outOfStock: false,
  },
  {
    id: 'ing-barbacoa',
    name: 'Salsa Barbacoa Ahumada',
    unit: 'ml',
    stock: 5000,
    minStock: 1000,
    outOfStock: false,
  },
  {
    id: 'ing-lechuga-tomate',
    name: 'Verduras Frescas (Lechuga y Tomate)',
    unit: 'porciones',
    stock: 80,
    minStock: 15,
    outOfStock: false,
  },
  {
    id: 'ing-guacamole',
    name: 'Guacamole Artesanal',
    unit: 'g',
    stock: 3000,
    minStock: 500,
    outOfStock: false,
  },
  {
    id: 'ing-doritos',
    name: 'Doritos Crocantes',
    unit: 'g',
    stock: 2000,
    minStock: 300,
    outOfStock: false,
  },
];

// ============================================================================
// 2. RECETAS POR DEFECTO CON REGLAS DE VARIANTES (SIMPLE VS DOBLE) Y PROTEÍNA (CARNE VS POLLO)
// doubleRule: 'duplicate' (x2 en doble) | 'fixed' (mismo valor, ej: pan o huevo) | 'custom'
// proteinScope: 'all' (ambas) | 'carne' (solo carne) | 'pollo' (solo pollo)
// ============================================================================
export const DEFAULT_RECIPES = {
  'burger-ak47': [
    { ingredientId: 'ing-carne-medallon', ingredientName: 'Carne Vacuna Premium (Tapa de Asado)', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'carne' },
    { ingredientId: 'ing-pollo-crujiente', ingredientName: 'Pechuga de Pollo Marinado y Rebozado', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'pollo' },
    { ingredientId: 'ing-pan-brioche', ingredientName: 'Pan Brioche Artesanal', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-queso-cheddar', ingredientName: 'Feta de Queso Cheddar Americano', amount: 3, amountSimple: 3, amountDouble: 6, doubleRule: 'duplicate', proteinScope: 'all' },
    { ingredientId: 'ing-bacon-ahumado', ingredientName: 'Panceta / Bacon Ahumado Crocante', amount: 30, amountSimple: 30, amountDouble: 60, doubleRule: 'duplicate', proteinScope: 'all' },
    { ingredientId: 'ing-alioli', ingredientName: 'Salsa Alioli de la Casa', amount: 20, amountSimple: 20, amountDouble: 20, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'burger-london-cheese': [
    { ingredientId: 'ing-carne-medallon', ingredientName: 'Carne Vacuna Premium (Tapa de Asado)', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'carne' },
    { ingredientId: 'ing-pollo-crujiente', ingredientName: 'Pechuga de Pollo Marinado y Rebozado', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'pollo' },
    { ingredientId: 'ing-pan-brioche', ingredientName: 'Pan Brioche Artesanal', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-queso-cheddar', ingredientName: 'Feta de Queso Cheddar Americano', amount: 3, amountSimple: 3, amountDouble: 6, doubleRule: 'duplicate', proteinScope: 'all' },
    { ingredientId: 'ing-bacon-ahumado', ingredientName: 'Panceta / Bacon Ahumado Crocante', amount: 30, amountSimple: 30, amountDouble: 60, doubleRule: 'duplicate', proteinScope: 'all' },
    { ingredientId: 'ing-barbacoa', ingredientName: 'Salsa Barbacoa Ahumada', amount: 25, amountSimple: 25, amountDouble: 25, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'burger-lemon-haze': [
    { ingredientId: 'ing-carne-medallon', ingredientName: 'Carne Vacuna Premium (Tapa de Asado)', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'carne' },
    { ingredientId: 'ing-pollo-crujiente', ingredientName: 'Pechuga de Pollo Marinado y Rebozado', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'pollo' },
    { ingredientId: 'ing-pan-brioche', ingredientName: 'Pan Brioche Artesanal', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-queso-tybo', ingredientName: 'Feta de Queso Tybo Cremoso', amount: 2, amountSimple: 2, amountDouble: 4, doubleRule: 'duplicate', proteinScope: 'all' },
    { ingredientId: 'ing-lechuga-tomate', ingredientName: 'Verduras Frescas (Lechuga y Tomate)', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-alioli', ingredientName: 'Salsa Alioli de la Casa', amount: 20, amountSimple: 20, amountDouble: 20, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'burger-gorila-glue': [
    { ingredientId: 'ing-carne-medallon', ingredientName: 'Carne Vacuna Premium (Tapa de Asado)', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'carne' },
    { ingredientId: 'ing-pollo-crujiente', ingredientName: 'Pechuga de Pollo Marinado y Rebozado', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'pollo' },
    { ingredientId: 'ing-pan-brioche', ingredientName: 'Pan Brioche Artesanal', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-queso-azul', ingredientName: 'Queso Azul / Roquefort', amount: 40, amountSimple: 40, amountDouble: 80, doubleRule: 'duplicate', proteinScope: 'all' },
    { ingredientId: 'ing-bacon-ahumado', ingredientName: 'Panceta / Bacon Ahumado Crocante', amount: 30, amountSimple: 30, amountDouble: 60, doubleRule: 'duplicate', proteinScope: 'all' },
    { ingredientId: 'ing-queso-tybo', ingredientName: 'Feta de Queso Tybo Cremoso', amount: 2, amountSimple: 2, amountDouble: 4, doubleRule: 'duplicate', proteinScope: 'all' },
    { ingredientId: 'ing-huevo-frito', ingredientName: 'Huevo de Campo / Frito', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-alioli', ingredientName: 'Salsa Alioli de la Casa', amount: 20, amountSimple: 20, amountDouble: 20, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'burger-amnesia': [
    { ingredientId: 'ing-carne-medallon', ingredientName: 'Carne Vacuna Premium (Tapa de Asado)', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'carne' },
    { ingredientId: 'ing-pollo-crujiente', ingredientName: 'Pechuga de Pollo Marinado y Rebozado', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'pollo' },
    { ingredientId: 'ing-pan-brioche', ingredientName: 'Pan Brioche Artesanal', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-huevo-frito', ingredientName: 'Huevo de Campo / Frito', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-guacamole', ingredientName: 'Guacamole Artesanal', amount: 30, amountSimple: 30, amountDouble: 30, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-alioli', ingredientName: 'Salsa Alioli de la Casa', amount: 20, amountSimple: 20, amountDouble: 20, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'burger-acapulco-gold': [
    { ingredientId: 'ing-carne-medallon', ingredientName: 'Carne Vacuna Premium (Tapa de Asado)', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'carne' },
    { ingredientId: 'ing-pollo-crujiente', ingredientName: 'Pechuga de Pollo Marinado y Rebozado', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'pollo' },
    { ingredientId: 'ing-pan-brioche', ingredientName: 'Pan Brioche Artesanal', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-queso-cheddar', ingredientName: 'Feta de Queso Cheddar Americano', amount: 3, amountSimple: 3, amountDouble: 6, doubleRule: 'duplicate', proteinScope: 'all' },
    { ingredientId: 'ing-guacamole', ingredientName: 'Guacamole Artesanal', amount: 30, amountSimple: 30, amountDouble: 30, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-doritos', ingredientName: 'Doritos Crocantes', amount: 25, amountSimple: 25, amountDouble: 25, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-alioli', ingredientName: 'Salsa Alioli de la Casa', amount: 20, amountSimple: 20, amountDouble: 20, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'burger-gelato-kush': [
    { ingredientId: 'ing-carne-medallon', ingredientName: 'Carne Vacuna Premium (Tapa de Asado)', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'carne' },
    { ingredientId: 'ing-pollo-crujiente', ingredientName: 'Pechuga de Pollo Marinado y Rebozado', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'pollo' },
    { ingredientId: 'ing-pan-brioche', ingredientName: 'Pan Brioche Artesanal', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-queso-cheddar', ingredientName: 'Feta de Queso Cheddar Americano', amount: 2, amountSimple: 2, amountDouble: 4, doubleRule: 'duplicate', proteinScope: 'all' },
    { ingredientId: 'ing-bacon-ahumado', ingredientName: 'Panceta / Bacon Ahumado Crocante', amount: 30, amountSimple: 30, amountDouble: 60, doubleRule: 'duplicate', proteinScope: 'all' },
    { ingredientId: 'ing-huevo-frito', ingredientName: 'Huevo de Campo / Frito', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-alioli', ingredientName: 'Salsa Alioli de la Casa', amount: 20, amountSimple: 20, amountDouble: 20, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'burger-london-pepe-kush': [
    { ingredientId: 'ing-carne-medallon', ingredientName: 'Carne Vacuna Premium (Tapa de Asado)', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'carne' },
    { ingredientId: 'ing-pollo-crujiente', ingredientName: 'Pechuga de Pollo Marinado y Rebozado', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'pollo' },
    { ingredientId: 'ing-pan-brioche', ingredientName: 'Pan Brioche Artesanal', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-queso-cheddar', ingredientName: 'Feta de Queso Cheddar Americano', amount: 2, amountSimple: 2, amountDouble: 4, doubleRule: 'duplicate', proteinScope: 'all' },
    { ingredientId: 'ing-bacon-ahumado', ingredientName: 'Panceta / Bacon Ahumado Crocante', amount: 30, amountSimple: 30, amountDouble: 60, doubleRule: 'duplicate', proteinScope: 'all' },
    { ingredientId: 'ing-alioli', ingredientName: 'Salsa Alioli de la Casa', amount: 20, amountSimple: 20, amountDouble: 20, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'burger-og-kush': [
    { ingredientId: 'ing-carne-medallon', ingredientName: 'Carne Vacuna Premium (Tapa de Asado)', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'carne' },
    { ingredientId: 'ing-pollo-crujiente', ingredientName: 'Pechuga de Pollo Marinado y Rebozado', amount: 150, amountSimple: 150, amountDouble: 300, doubleRule: 'duplicate', proteinScope: 'pollo' },
    { ingredientId: 'ing-pan-brioche', ingredientName: 'Pan Brioche Artesanal', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-queso-cheddar', ingredientName: 'Feta de Queso Cheddar Americano', amount: 2, amountSimple: 2, amountDouble: 4, doubleRule: 'duplicate', proteinScope: 'all' },
    { ingredientId: 'ing-bacon-ahumado', ingredientName: 'Panceta / Bacon Ahumado Crocante', amount: 30, amountSimple: 30, amountDouble: 60, doubleRule: 'duplicate', proteinScope: 'all' },
    { ingredientId: 'ing-alioli', ingredientName: 'Salsa Alioli de la Casa', amount: 20, amountSimple: 20, amountDouble: 20, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'trico-jr': [
    { ingredientId: 'ing-carne-medallon', ingredientName: 'Carne Vacuna Premium (Tapa de Asado)', amount: 120, amountSimple: 120, amountDouble: 240, doubleRule: 'duplicate', proteinScope: 'carne' },
    { ingredientId: 'ing-pollo-crujiente', ingredientName: 'Pechuga de Pollo Marinado y Rebozado', amount: 120, amountSimple: 120, amountDouble: 240, doubleRule: 'duplicate', proteinScope: 'pollo' },
    { ingredientId: 'ing-pan-brioche', ingredientName: 'Pan Brioche Artesanal', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-huevo-frito', ingredientName: 'Huevo de Campo / Frito', amount: 1, amountSimple: 1, amountDouble: 1, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 150, amountSimple: 150, amountDouble: 150, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'trico-pollo-1': [
    { ingredientId: 'ing-pollo-crujiente', ingredientName: 'Pechuga de Pollo Marinado y Rebozado', amount: 300, amountSimple: 300, amountDouble: 300, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-alioli', ingredientName: 'Salsa Alioli de la Casa', amount: 30, amountSimple: 30, amountDouble: 30, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'trico-pollo-2': [
    { ingredientId: 'ing-pollo-crujiente', ingredientName: 'Pechuga de Pollo Marinado y Rebozado', amount: 600, amountSimple: 600, amountDouble: 600, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-alioli', ingredientName: 'Salsa Alioli de la Casa', amount: 60, amountSimple: 60, amountDouble: 60, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 400, amountSimple: 400, amountDouble: 400, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'porcion-papas-cheddar': [
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 400, amountSimple: 400, amountDouble: 400, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-queso-cheddar', ingredientName: 'Feta de Queso Cheddar Americano', amount: 4, amountSimple: 4, amountDouble: 4, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-bacon-ahumado', ingredientName: 'Panceta / Bacon Ahumado Crocante', amount: 40, amountSimple: 40, amountDouble: 40, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'combo-420': [
    { ingredientId: 'ing-carne-medallon', ingredientName: 'Carne Vacuna Premium (Tapa de Asado)', amount: 300, amountSimple: 300, amountDouble: 300, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-pan-brioche', ingredientName: 'Pan Brioche Artesanal', amount: 2, amountSimple: 2, amountDouble: 2, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-queso-cheddar', ingredientName: 'Feta de Queso Cheddar Americano', amount: 4, amountSimple: 4, amountDouble: 4, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 400, amountSimple: 400, amountDouble: 400, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'combo-carioca': [
    { ingredientId: 'ing-carne-medallon', ingredientName: 'Carne Vacuna Premium (Tapa de Asado)', amount: 600, amountSimple: 600, amountDouble: 600, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-pan-brioche', ingredientName: 'Pan Brioche Artesanal', amount: 4, amountSimple: 4, amountDouble: 4, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-queso-cheddar', ingredientName: 'Feta de Queso Cheddar Americano', amount: 8, amountSimple: 8, amountDouble: 8, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 800, amountSimple: 800, amountDouble: 800, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'combo-zaza': [
    { ingredientId: 'ing-carne-medallon', ingredientName: 'Carne Vacuna Premium (Tapa de Asado)', amount: 300, amountSimple: 300, amountDouble: 300, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-pollo-crujiente', ingredientName: 'Pechuga de Pollo Marinado y Rebozado', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-pan-brioche', ingredientName: 'Pan Brioche Artesanal', amount: 2, amountSimple: 2, amountDouble: 2, doubleRule: 'fixed', proteinScope: 'all' },
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 400, amountSimple: 400, amountDouble: 400, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'extra-carne': [
    { ingredientId: 'ing-carne-medallon', ingredientName: 'Carne Vacuna Premium (Tapa de Asado)', amount: 150, amountSimple: 150, amountDouble: 150, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'extra-cheddar': [
    { ingredientId: 'ing-queso-cheddar', ingredientName: 'Feta de Queso Cheddar Americano', amount: 2, amountSimple: 2, amountDouble: 2, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'extra-panceta': [
    { ingredientId: 'ing-bacon-ahumado', ingredientName: 'Panceta / Bacon Ahumado Crocante', amount: 30, amountSimple: 30, amountDouble: 30, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'extra-papas': [
    { ingredientId: 'ing-papas-rusticas', ingredientName: 'Papas Rústicas para Freír', amount: 200, amountSimple: 200, amountDouble: 200, doubleRule: 'fixed', proteinScope: 'all' },
  ],
  'extra-trico-pollo': [
    { ingredientId: 'ing-pollo-crujiente', ingredientName: 'Pechuga de Pollo Marinado y Rebozado', amount: 150, amountSimple: 150, amountDouble: 150, doubleRule: 'fixed', proteinScope: 'all' },
  ],
};

// ============================================================================
// 3. CÁLCULO DE CANTIDAD A DESCONTAR SEGÚN VARIANTE Y REGLAS
// ============================================================================
export const getRecipeItemDeduction = (recItem, isDouble = false) => {
  const simpleAmount = Number(recItem.amountSimple ?? recItem.amount) || 0;
  if (!isDouble) {
    return simpleAmount;
  }

  if (recItem.doubleRule === 'fixed') {
    return simpleAmount;
  }

  if (recItem.doubleRule === 'duplicate') {
    return simpleAmount * 2;
  }

  if (
    recItem.doubleRule === 'custom' &&
    recItem.amountDouble !== undefined &&
    recItem.amountDouble !== null &&
    recItem.amountDouble !== ''
  ) {
    return Number(recItem.amountDouble) || simpleAmount;
  }

  if (
    recItem.amountDouble !== undefined &&
    recItem.amountDouble !== null &&
    recItem.amountDouble !== ''
  ) {
    return Number(recItem.amountDouble);
  }

  // Fallback inteligente de seguridad: panes, huevos, salsas, verduras y papas son fijos (1x)
  const ingRef = `${recItem.ingredientId || ''} ${recItem.ingredientName || ''}`.toLowerCase();
  const isFixedByDefault =
    ingRef.includes('pan') ||
    ingRef.includes('huevo') ||
    ingRef.includes('salsa') ||
    ingRef.includes('alioli') ||
    ingRef.includes('barbacoa') ||
    ingRef.includes('lechuga') ||
    ingRef.includes('tomate') ||
    ingRef.includes('guacamole') ||
    ingRef.includes('doritos') ||
    ingRef.includes('papas');

  return isFixedByDefault ? simpleAmount : simpleAmount * 2;
};

// ============================================================================
// 4. BÚSQUEDA INTELIGENTE DE INGREDIENTE EN EL INVENTARIO
// ============================================================================
export const findMatchingIngredientInList = (list, recItem, isChicken = false) => {
  if (!Array.isArray(list) || list.length === 0 || !recItem) return null;

  let targetId = recItem.ingredientId || '';
  if (targetId === 'ing-carne-medallon' && isChicken) {
    targetId = 'ing-pollo-crujiente';
  }

  // 1. Coincidencia exacta por ID
  const exact = list.find((i) => i.id === targetId);
  if (exact) return exact;

  // 2. Coincidencia por nombre guardado en la receta
  if (recItem.ingredientName) {
    const cleanTargetName = recItem.ingredientName.trim().toLowerCase();
    const byName = list.find((i) => (i.name || '').trim().toLowerCase() === cleanTargetName);
    if (byName) return byName;
  }

  // 3. Coincidencia semántica si el administrador creó sus propios insumos personalizados (ej: "Pan", "Cheddar", "Carne")
  const searchTerms = `${targetId} ${recItem.ingredientName || ''}`.toLowerCase();
  const keywords = ['pan', 'cheddar', 'carne', 'pollo', 'bacon', 'panceta', 'huevo', 'tybo', 'azul', 'roquefort', 'papas', 'alioli', 'barbacoa', 'guacamole', 'cebolla'];
  for (const kw of keywords) {
    if (searchTerms.includes(kw)) {
      const matched = list.find((i) => (i.name || '').toLowerCase().includes(kw));
      if (matched) return matched;
    }
  }

  return null;
};

// ============================================================================
// 5. OBTENER Y GUARDAR INGREDIENTES (PERSISTENCIA Y NUBE)
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
  const cleanItems = sanitizeForFirestore(items || []);
  try {
    localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(cleanItems));
    window.dispatchEvent(new CustomEvent('tricos_ingredients_sync', { detail: cleanItems }));
    try {
      const ch = new BroadcastChannel('tricos_ingredients_channel');
      ch.postMessage(cleanItems);
      ch.close();
    } catch {}
  } catch (e) {
    console.error('Error guardando ingredientes en localStorage:', e);
  }

  if (shouldSyncCloud) {
    const { isConfigured, db } = initFirebase();
    if (isConfigured && db) {
      const now = new Date().toISOString();
      const payload = sanitizeForFirestore({ items: cleanItems, updatedAt: now });

      await Promise.allSettled([
        setDoc(doc(db, 'promotions', 'inventory'), payload, { merge: true }),
        setDoc(doc(db, 'ingredients', 'main'), payload, { merge: true }),
        setDoc(doc(db, 'inventory', 'ingredients_data'), payload, { merge: true }),
        ...(Array.isArray(cleanItems)
          ? cleanItems
              .filter((ing) => ing && ing.id)
              .map((ing) =>
                setDoc(doc(db, 'ingredients', ing.id), { ...ing, updatedAt: now }, { merge: true })
              )
          : []),
      ]);
    }
  }
};

// ============================================================================
// 6. SUSCRIPCIÓN EN TIEMPO REAL A INGREDIENTES
// ============================================================================
export const subscribeToIngredients = (callback) => {
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

  const { isConfigured, db } = initFirebase();
  const unsubs = [];

  if (isConfigured && db) {
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
// 7. OPERACIONES CRUD Y BOTÓN DE AGOTADO (KILL-SWITCH) DE INGREDIENTES
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
    outOfStock: Boolean(ingredientData.outOfStock),
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

/**
 * Kill-Switch rápido de 1 clic para marcar un ingrediente como "Agotado" o "Disponible"
 * sin necesidad de alterar los números de inventario.
 */
export const toggleIngredientOutOfStock = (id) => {
  const list = getIngredients();
  const next = list.map((item) => {
    if (item.id === id) {
      const nextOut = !item.outOfStock;
      return { ...item, outOfStock: nextOut };
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
      const prevStock = Number(item.stock) || 0;
      const newStock = Math.max(0, prevStock + Number(delta));
      return {
        ...item,
        stock: newStock,
        outOfStock: newStock <= 0 ? true : prevStock <= 0 && newStock > 0 ? false : item.outOfStock,
      };
    }
    return item;
  });
  saveIngredients(next, true);
  return next;
};

// ============================================================================
// 8. GESTIÓN Y PERSISTENCIA DE RECETAS POR PRODUCTO
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
  const cleanRecipes = sanitizeForFirestore(recipes || {});
  try {
    localStorage.setItem(RECIPES_KEY, JSON.stringify(cleanRecipes));
    window.dispatchEvent(new CustomEvent('tricos_recipes_sync', { detail: cleanRecipes }));
    try {
      const ch = new BroadcastChannel('tricos_recipes_channel');
      ch.postMessage(cleanRecipes);
      ch.close();
    } catch {}
  } catch (e) {
    console.error('Error guardando recetas:', e);
  }

  if (shouldSyncCloud) {
    const { isConfigured, db } = initFirebase();
    if (isConfigured && db) {
      const now = new Date().toISOString();
      const payload = sanitizeForFirestore({ recipes: cleanRecipes, updatedAt: now });

      await Promise.allSettled([
        setDoc(doc(db, 'promotions', 'recipes'), payload, { merge: true }),
        setDoc(doc(db, 'recipes', 'main'), payload, { merge: true }),
        setDoc(doc(db, 'inventory', 'recipes_data'), payload, { merge: true }),
        ...Object.entries(cleanRecipes).map(([prodId, items]) =>
          setDoc(doc(db, 'recipes', prodId), { productId: prodId, items, updatedAt: now }, { merge: true })
        ),
      ]);
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

  let channel = null;
  try {
    channel = new BroadcastChannel('tricos_recipes_channel');
    channel.onmessage = (msg) => {
      if (msg.data && typeof msg.data === 'object') callback(msg.data);
    };
  } catch {}

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
              const merged = { ...DEFAULT_RECIPES, ...data.recipes };
              callback(merged);
              saveRecipes(merged, false);
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
              const merged = { ...DEFAULT_RECIPES, ...data.recipes };
              callback(merged);
              saveRecipes(merged, false);
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
    if (channel) channel.close();
    unsubs.forEach((fn) => {
      if (typeof fn === 'function') fn();
    });
  };
};

export const getProductRecipe = (productId, product = null) => {
  const allRecipes = getRecipes();
  let rawRecipe = [];
  if (productId && Array.isArray(allRecipes[productId]) && allRecipes[productId].length > 0) {
    rawRecipe = allRecipes[productId];
  } else if (product && Array.isArray(product.recipe) && product.recipe.length > 0) {
    rawRecipe = product.recipe;
  } else {
    rawRecipe = DEFAULT_RECIPES[productId] || [];
  }

  // Migración suave en lectura: si es un plato con elección Carne/Pollo y la receta heredada aún no tiene scopes
  if (
    product?.hasProteinChoice &&
    Array.isArray(rawRecipe) &&
    rawRecipe.length > 0 &&
    !rawRecipe.some((r) => r.proteinScope !== undefined)
  ) {
    const carneItem = rawRecipe.find((r) => r.ingredientId === 'ing-carne-medallon');
    const hasPollo = rawRecipe.some((r) => r.ingredientId === 'ing-pollo-crujiente');
    if (carneItem && !hasPollo) {
      const upgraded = [];
      for (const r of rawRecipe) {
        if (r.ingredientId === 'ing-carne-medallon') {
          upgraded.push({
            ...r,
            proteinScope: 'carne',
          });
          upgraded.push({
            ...r,
            ingredientId: 'ing-pollo-crujiente',
            ingredientName: 'Pechuga de Pollo Marinado y Rebozado',
            proteinScope: 'pollo',
          });
        } else {
          upgraded.push({
            ...r,
            proteinScope: 'all',
          });
        }
      }
      return upgraded;
    }
  }

  return rawRecipe;
};

export const setProductRecipe = async (productId, recipeItems) => {
  const allRecipes = getRecipes();
  const next = {
    ...allRecipes,
    [productId]: recipeItems,
  };
  await saveRecipes(next, true);

  // También sincronizar la receta dentro del propio documento del producto en Firebase
  const { isConfigured, db } = initFirebase();
  if (isConfigured && db && productId) {
    try {
      await setDoc(
        doc(db, 'products', productId),
        { recipe: recipeItems, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {}
  }

  return next;
};

/**
 * Verifica si un producto está agotado debido a que alguno de sus ingredientes
 * fue marcado como "Agotado" (Kill-Switch) o tiene stock 0.
 */
export const isProductOutOfStockByIngredients = (product, ingredientsList = null, recipesMap = null) => {
  if (!product) return false;
  const list = Array.isArray(ingredientsList) ? ingredientsList : getIngredients();
  const allRecipes = recipesMap || getRecipes();

  const prodId = product.originalId || product.id;
  const recipe =
    allRecipes[prodId] ||
    (Array.isArray(product.recipe) && product.recipe.length > 0 ? product.recipe : null) ||
    DEFAULT_RECIPES[prodId] ||
    [];

  if (!Array.isArray(recipe) || recipe.length === 0) return false;

  let hasCarne = false;
  let carneOk = false;
  let hasPollo = false;
  let polloOk = false;

  for (const recItem of recipe) {
    const scope = recItem.proteinScope || 'all';
    const matchedIng = findMatchingIngredientInList(list, recItem, false);
    const needed = Number(recItem.amountSimple ?? recItem.amount) || 1;
    const isIngOut = matchedIng
      ? matchedIng.outOfStock === true || Number(matchedIng.stock) < needed
      : false;

    if (scope === 'all') {
      if (isIngOut) return true;
    } else if (scope === 'carne') {
      hasCarne = true;
      if (!isIngOut) carneOk = true;
    } else if (scope === 'pollo') {
      hasPollo = true;
      if (!isIngOut) polloOk = true;
    }
  }

  if (hasCarne && !hasPollo && !carneOk) return true;
  if (hasPollo && !hasCarne && !polloOk) return true;
  if (hasCarne && hasPollo && !carneOk && !polloOk) return true;

  return false;
};

// ============================================================================
// 9. DESCUENTO AUTOMÁTICO DE INGREDIENTES AL CONFIRMAR UN PEDIDO
// ============================================================================
export const deductIngredientsForOrder = async (orderItems = [], products = []) => {
  if (!orderItems || orderItems.length === 0) return getIngredients();

  // Intentar sincronizar con el inventario y recetas más recientes de Firestore antes de descontar
  let liveIngredients = getIngredients();
  let liveRecipes = getRecipes();

  const { isConfigured, db } = initFirebase();
  if (isConfigured && db) {
    try {
      const [invSnap, recSnap] = await Promise.allSettled([
        getDoc(doc(db, 'promotions', 'inventory')),
        getDoc(doc(db, 'promotions', 'recipes')),
      ]);

      if (invSnap.status === 'fulfilled' && invSnap.value.exists()) {
        const invData = invSnap.value.data();
        if (Array.isArray(invData?.items) && invData.items.length > 0) {
          liveIngredients = invData.items;
        }
      }

      if (recSnap.status === 'fulfilled' && recSnap.value.exists()) {
        const recData = recSnap.value.data();
        if (recData?.recipes && typeof recData.recipes === 'object') {
          liveRecipes = { ...DEFAULT_RECIPES, ...recData.recipes };
        }
      }
    } catch {}
  }

  const ingredientsList = liveIngredients.map((ing) => ({ ...ing }));
  const allRecipes = liveRecipes;

  let anyDeducted = false;

  orderItems.forEach((item) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const rawId = String(item.productId || item.originalId || item.id || '');
    const rawName = String(item.baseName || item.name || '').toLowerCase();

    // 1. Buscar receta por ID exacto
    let recipe = allRecipes[rawId] || DEFAULT_RECIPES[rawId];

    // 2. Buscar por prefijo de ID en el mapa de recetas (ej: 'burger-ak47-doble' -> 'burger-ak47')
    if (!recipe) {
      const prefixKey = Object.keys(allRecipes).find((k) => rawId && rawId.startsWith(k));
      if (prefixKey) recipe = allRecipes[prefixKey];
    }

    // 3. Buscar en el listado de productos por ID, prefijo o coincidencia de nombre
    if (!recipe && Array.isArray(products)) {
      const foundProd = products.find(
        (p) =>
          p.id === rawId ||
          (p.id && rawId && rawId.startsWith(p.id)) ||
          (p.name && rawName.includes(p.name.toLowerCase()))
      );
      if (foundProd) {
        recipe =
          allRecipes[foundProd.id] ||
          (Array.isArray(foundProd.recipe) && foundProd.recipe.length > 0 ? foundProd.recipe : null) ||
          DEFAULT_RECIPES[foundProd.id];
      }
    }

    if (!recipe && Array.isArray(item.recipe)) {
      recipe = item.recipe;
    }

    // Detectar si el pedido es variante Doble
    const isDouble =
      String(item.variant || '').toLowerCase().includes('doble') ||
      String(item.variantId || '').toLowerCase().includes('doble') ||
      rawName.includes('doble') ||
      rawId.toLowerCase().includes('-doble');

    // Detectar si eligió medallón de pollo
    const isChicken =
      String(item.protein || '').toLowerCase().includes('pollo') ||
      rawName.includes('[pollo') ||
      rawName.includes('pollo crunch') ||
      rawName.includes('pollo frito');

    if (Array.isArray(recipe) && recipe.length > 0) {
      const hasExplicitScopes = recipe.some(
        (r) => r.proteinScope === 'pollo' || r.proteinScope === 'carne'
      );

      recipe.forEach((recItem) => {
        const scope = recItem.proteinScope || 'all';

        // Respetar el alcance de proteína (Solo Carne / Solo Pollo / Ambos)
        if (scope === 'carne' && isChicken) return;
        if (scope === 'pollo' && !isChicken) return;

        // Si la receta no tiene scopes explícitos (formato anterior), usar intercambio automático carne->pollo
        const shouldAutoSwap = !hasExplicitScopes && isChicken;
        const targetIng = findMatchingIngredientInList(ingredientsList, recItem, shouldAutoSwap);

        if (targetIng) {
          const unitAmount = getRecipeItemDeduction(recItem, isDouble);
          const totalDeduction = unitAmount * qty;
          targetIng.stock = Math.max(0, Number(targetIng.stock || 0) - totalDeduction);
          if (targetIng.stock <= 0) {
            targetIng.outOfStock = true;
          }
          anyDeducted = true;
        }
      });
    } else {
      // Receta genérica de respaldo para hamburguesas nuevas sin receta configurada
      const isBurger =
        String(item.category || '').includes('burger') ||
        rawName.includes('burger') ||
        rawName.includes('kush') ||
        rawName.includes('cheese') ||
        rawId.startsWith('burger-');

      if (isBurger) {
        const fallbackItems = [
          {
            ingredientId: isChicken ? 'ing-pollo-crujiente' : 'ing-carne-medallon',
            amountSimple: 150,
            doubleRule: 'duplicate',
          },
          { ingredientId: 'ing-pan-brioche', amountSimple: 1, doubleRule: 'fixed' },
          { ingredientId: 'ing-queso-cheddar', amountSimple: 2, doubleRule: 'duplicate' },
          { ingredientId: 'ing-papas-rusticas', amountSimple: 200, doubleRule: 'fixed' },
        ];
        fallbackItems.forEach((fb) => {
          const targetIng = findMatchingIngredientInList(ingredientsList, fb, isChicken);
          if (targetIng) {
            const unitAmount = getRecipeItemDeduction(fb, isDouble);
            targetIng.stock = Math.max(0, Number(targetIng.stock || 0) - unitAmount * qty);
            if (targetIng.stock <= 0) targetIng.outOfStock = true;
            anyDeducted = true;
          }
        });
      }
    }
  });

  if (anyDeducted) {
    await saveIngredients(ingredientsList, true);
    return ingredientsList;
  }

  return ingredientsList;
};
