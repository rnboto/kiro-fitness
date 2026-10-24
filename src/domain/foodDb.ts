// Base de alimentos e intercambio — capa de dominio PURA (design §7).
// per100g expresa SIEMPRE los macros por 100 g EN CRUDO.

import type { MacroSet, MassMacro, MealPlan } from './nutrition';

export type MealId = MealPlan['id'];

export interface Food {
  id: string;
  name: string; // español
  per100g: MacroSet; // SIEMPRE macros por 100 g EN CRUDO
  cookedFactor?: number; // factor crudo→cocinado solo-presentación (cocido = crudo × factor)
  note?: string;
  category: 'proteina' | 'carbohidrato' | 'grasa' | 'mixto';
  /** Comidas del día en las que el alimento es típico (se muestran primero al intercambiar). */
  mealTags?: MealId[];
  /** Se puede comer tal cual, sin cocinar ni calentar (mesa de trabajo, tupper). */
  portableOk?: boolean;
  /** Unidad contable opcional para mostrar equivalencias (≈ 2 huevos). Solo presentación. */
  unit?: { singular: string; plural: string; grams: number };
}

// Fuente: USDA FoodData Central / BEDCA. per100g = por 100 g EN CRUDO.
// Tabla autoritativa cerrada (design §7); no se inventan datos nutricionales.
export const FOODS: Food[] = [
  // --- Proteína ---
  {
    id: 'pollo_pechuga',
    name: 'Pollo (pechuga)',
    category: 'proteina',
    per100g: { kcal: 156, proteinG: 31, carbsG: 0, fatG: 3.6 },
    cookedFactor: 0.7,
    note: 'Pesar en crudo; 100 g crudo ≈ 70 g cocido',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'ternera_magra',
    name: 'Ternera magra',
    category: 'proteina',
    per100g: { kcal: 175, proteinG: 26, carbsG: 0, fatG: 7.5 },
    cookedFactor: 0.75,
    note: 'Pesar en crudo; 100 g crudo ≈ 75 g cocido',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'salmon',
    name: 'Salmón',
    category: 'proteina',
    per100g: { kcal: 197, proteinG: 20, carbsG: 0, fatG: 13 },
    cookedFactor: 0.8,
    note: 'Pesar en crudo; 100 g crudo ≈ 80 g cocido',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'atun_natural',
    name: 'Atún al natural',
    category: 'proteina',
    per100g: { kcal: 116, proteinG: 26, carbsG: 0, fatG: 1 },
    note: 'Escurrido de lata',
    mealTags: ['post', 'almuerzo', 'cena'],
    portableOk: true,
  },
  {
    id: 'huevo',
    name: 'Huevo entero',
    category: 'proteina',
    per100g: { kcal: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5 },
    note: 'Sin cáscara; 1 huevo M ≈ 50 g',
    mealTags: ['post', 'almuerzo', 'cena'],
    unit: { singular: 'huevo', plural: 'huevos', grams: 50 },
  },
  {
    id: 'clara_huevo',
    name: 'Clara de huevo',
    category: 'proteina',
    per100g: { kcal: 52, proteinG: 11, carbsG: 0.7, fatG: 0.2 },
    note: '1 clara ≈ 33 g',
    mealTags: ['post', 'cena'],
    unit: { singular: 'clara', plural: 'claras', grams: 33 },
  },
  {
    id: 'yogur_griego',
    name: 'Yogur griego natural',
    category: 'proteina',
    per100g: { kcal: 97, proteinG: 9, carbsG: 4, fatG: 5 },
    mealTags: ['pre', 'post', 'cena'],
    portableOk: true,
    unit: { singular: 'yogur', plural: 'yogures', grams: 125 },
  },
  {
    id: 'queso_batido',
    name: 'Queso fresco batido 0%',
    category: 'proteina',
    per100g: { kcal: 47, proteinG: 8, carbsG: 4, fatG: 0.2 },
    mealTags: ['pre', 'post', 'cena'],
    portableOk: true,
  },
  // --- Carbohidrato ---
  {
    id: 'arroz_blanco',
    name: 'Arroz blanco',
    category: 'carbohidrato',
    per100g: { kcal: 349, proteinG: 7, carbsG: 79, fatG: 0.6 },
    cookedFactor: 2.5,
    note: 'Pesar en crudo; 70 g crudo ≈ 175 g cocido',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'avena',
    name: 'Avena en copos',
    category: 'carbohidrato',
    per100g: { kcal: 355, proteinG: 13, carbsG: 60, fatG: 7 },
    cookedFactor: 3.0,
    note: 'Pesar en crudo; absorbe ×3 al cocer',
    mealTags: ['pre', 'post'],
    portableOk: true,
  },
  {
    id: 'patata',
    name: 'Patata',
    category: 'carbohidrato',
    per100g: { kcal: 77, proteinG: 2, carbsG: 17, fatG: 0.1 },
    cookedFactor: 0.95,
    note: 'Pesar en crudo; hervida ≈ ×0.95',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'boniato',
    name: 'Boniato',
    category: 'carbohidrato',
    per100g: { kcal: 86, proteinG: 1.6, carbsG: 20, fatG: 0.1 },
    cookedFactor: 0.95,
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'pan_integral',
    name: 'Pan integral',
    category: 'carbohidrato',
    per100g: { kcal: 231, proteinG: 9, carbsG: 41, fatG: 3.4 },
    mealTags: ['pre', 'post', 'cena'],
    portableOk: true,
    unit: { singular: 'rebanada', plural: 'rebanadas', grams: 30 },
  },
  {
    id: 'lentejas',
    name: 'Lentejas',
    category: 'carbohidrato',
    per100g: { kcal: 306, proteinG: 25, carbsG: 49, fatG: 1.1 },
    cookedFactor: 2.4,
    note: 'Pesar en crudo; cocidas ≈ ×2.4',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'platano',
    name: 'Plátano',
    category: 'carbohidrato',
    per100g: { kcal: 99, proteinG: 1.1, carbsG: 23, fatG: 0.3 },
    note: '1 unidad media ≈ 120 g',
    mealTags: ['pre', 'post'],
    portableOk: true,
    unit: { singular: 'plátano', plural: 'plátanos', grams: 120 },
  },
  // --- Grasa ---
  {
    id: 'aceite_oliva',
    name: 'Aceite de oliva virgen',
    category: 'grasa',
    per100g: { kcal: 900, proteinG: 0, carbsG: 0, fatG: 100 },
    note: '1 cda ≈ 10 g',
    mealTags: ['post', 'almuerzo', 'cena'],
    portableOk: true,
    unit: { singular: 'cucharada', plural: 'cucharadas', grams: 10 },
  },
  {
    id: 'almendras',
    name: 'Almendras',
    category: 'grasa',
    per100g: { kcal: 622, proteinG: 21, carbsG: 22, fatG: 50 },
    note: 'Crudas, sin sal',
    mealTags: ['post', 'cena'],
    portableOk: true,
  },
  {
    id: 'aguacate',
    name: 'Aguacate',
    category: 'grasa',
    per100g: { kcal: 179, proteinG: 2, carbsG: 9, fatG: 15 },
    note: '1/2 unidad ≈ 70 g',
    mealTags: ['post', 'almuerzo', 'cena'],
    portableOk: true,
  },

  // =====================================================================
  // Ampliación de variedad. Política de kcal: se usa la kcal publicada
  // (USDA/BEDCA) si está a ≤ 5 de 4P + 4C + 9F; si no (alimentos ricos en
  // fibra: fruta, verdura, legumbres, frutos secos, miel, muesli) se fija
  // kcal = 4P + 4C + 9F redondeado. Los macros per100g son siempre EN CRUDO
  // / tal como se vende. portableOk = se puede comer sin cocinar ni calentar.
  // =====================================================================

  // --- Proteína (desayuno / fiambres / lácteos / pescado / carne) ---
  {
    id: 'pavo_lonchas',
    name: 'Pavo en lonchas (fiambre)',
    category: 'proteina',
    per100g: { kcal: 104, proteinG: 17.1, carbsG: 4.2, fatG: 1.7 },
    note: 'Fiambre; 1 loncha ≈ 12 g',
    mealTags: ['post', 'cena'],
    portableOk: true,
    unit: { singular: 'loncha', plural: 'lonchas', grams: 12 },
  },
  {
    id: 'jamon_cocido',
    name: 'Jamón cocido extra',
    category: 'proteina',
    per100g: { kcal: 109, proteinG: 17.5, carbsG: 1.5, fatG: 3.5 },
    note: '1 loncha ≈ 15 g',
    mealTags: ['post', 'cena'],
    portableOk: true,
    unit: { singular: 'loncha', plural: 'lonchas', grams: 15 },
  },
  {
    id: 'jamon_serrano',
    name: 'Jamón serrano (magro)',
    category: 'proteina',
    per100g: { kcal: 185, proteinG: 30.5, carbsG: 0, fatG: 7 },
    note: 'Sin la grasa visible; 1 loncha ≈ 20 g',
    mealTags: ['post', 'cena'],
    portableOk: true,
    unit: { singular: 'loncha', plural: 'lonchas', grams: 20 },
  },
  {
    id: 'salmon_ahumado',
    name: 'Salmón ahumado',
    category: 'proteina',
    per100g: { kcal: 117, proteinG: 18.3, carbsG: 0, fatG: 4.8 },
    mealTags: ['post', 'cena'],
    portableOk: true,
  },
  {
    id: 'skyr',
    name: 'Skyr natural',
    category: 'proteina',
    per100g: { kcal: 63, proteinG: 11, carbsG: 4, fatG: 0.2 },
    note: '1 tarro ≈ 150 g',
    mealTags: ['pre', 'post', 'cena'],
    portableOk: true,
    unit: { singular: 'tarro', plural: 'tarros', grams: 150 },
  },
  {
    id: 'requeson',
    name: 'Requesón / cottage bajo en grasa',
    category: 'proteina',
    per100g: { kcal: 72, proteinG: 12.4, carbsG: 2.7, fatG: 1 },
    mealTags: ['post', 'cena'],
    portableOk: true,
  },
  {
    id: 'queso_burgos',
    name: 'Queso fresco de Burgos',
    category: 'proteina',
    per100g: { kcal: 174, proteinG: 11.5, carbsG: 3, fatG: 13 },
    mealTags: ['post', 'cena'],
    portableOk: true,
  },
  {
    id: 'queso_porciones',
    name: 'Queso en porciones (light)',
    category: 'proteina',
    per100g: { kcal: 160, proteinG: 10, carbsG: 5, fatG: 11 },
    note: '1 porción ≈ 17 g',
    mealTags: ['post'],
    portableOk: true,
    unit: { singular: 'porción', plural: 'porciones', grams: 17 },
  },
  {
    id: 'yogur_griego_0',
    name: 'Yogur griego 0 %',
    category: 'proteina',
    per100g: { kcal: 57, proteinG: 10, carbsG: 4, fatG: 0.2 },
    note: '1 yogur ≈ 125 g',
    mealTags: ['pre', 'post', 'cena'],
    portableOk: true,
    unit: { singular: 'yogur', plural: 'yogures', grams: 125 },
  },
  {
    id: 'whey',
    name: 'Proteína whey (polvo)',
    category: 'proteina',
    per100g: { kcal: 395, proteinG: 78, carbsG: 7, fatG: 6 },
    note: '1 cacito ≈ 30 g; mezclar en shaker',
    mealTags: ['pre', 'post', 'cena'],
    portableOk: true,
    unit: { singular: 'cacito', plural: 'cacitos', grams: 30 },
  },
  {
    id: 'huevo_cocido',
    name: 'Huevo cocido',
    category: 'proteina',
    per100g: { kcal: 155, proteinG: 12.6, carbsG: 1.1, fatG: 10.6 },
    note: 'Sin cáscara; 1 huevo M ≈ 50 g',
    mealTags: ['post', 'almuerzo', 'cena'],
    portableOk: true,
    unit: { singular: 'huevo', plural: 'huevos', grams: 50 },
  },
  {
    id: 'tofu',
    name: 'Tofu firme',
    category: 'proteina',
    per100g: { kcal: 83, proteinG: 8.1, carbsG: 1.9, fatG: 4.8 },
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'pavo_pechuga',
    name: 'Pavo (pechuga fresca)',
    category: 'proteina',
    per100g: { kcal: 109, proteinG: 23.7, carbsG: 0, fatG: 1.5 },
    cookedFactor: 0.75,
    note: 'Pesar en crudo; 100 g crudo ≈ 75 g cocido',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'pollo_muslo',
    name: 'Muslo de pollo sin piel',
    category: 'proteina',
    per100g: { kcal: 119, proteinG: 19.7, carbsG: 0, fatG: 4 },
    cookedFactor: 0.75,
    note: 'Pesar en crudo, sin piel ni hueso; 100 g crudo ≈ 75 g cocido',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'cerdo_lomo',
    name: 'Cerdo magro (lomo)',
    category: 'proteina',
    per100g: { kcal: 133, proteinG: 21, carbsG: 0, fatG: 5.4 },
    cookedFactor: 0.75,
    note: 'Pesar en crudo; 100 g crudo ≈ 75 g cocido',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'merluza',
    name: 'Merluza',
    category: 'proteina',
    per100g: { kcal: 71, proteinG: 16.5, carbsG: 0, fatG: 0.9 },
    cookedFactor: 0.8,
    note: 'Pesar en crudo; 100 g crudo ≈ 80 g cocido',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'dorada_lubina',
    name: 'Dorada / lubina',
    category: 'proteina',
    per100g: { kcal: 100, proteinG: 19, carbsG: 0, fatG: 2.7 },
    cookedFactor: 0.8,
    note: 'Pesar en crudo, sin espinas; 100 g crudo ≈ 80 g cocido',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'gambas',
    name: 'Gambas',
    category: 'proteina',
    per100g: { kcal: 85, proteinG: 20.1, carbsG: 0.2, fatG: 0.5 },
    cookedFactor: 0.8,
    note: 'Peladas, en crudo; 100 g crudo ≈ 80 g cocido',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'calamar',
    name: 'Calamar / sepia',
    category: 'proteina',
    per100g: { kcal: 92, proteinG: 15.6, carbsG: 3.1, fatG: 1.4 },
    cookedFactor: 0.8,
    note: 'Pesar en crudo; 100 g crudo ≈ 80 g cocido',
    mealTags: ['almuerzo', 'cena'],
  },

  // --- Mixto (bebidas, verduras, fruta, barritas, hummus) ---
  {
    id: 'leche_desnatada',
    name: 'Leche desnatada',
    category: 'mixto',
    per100g: { kcal: 34, proteinG: 3.4, carbsG: 5, fatG: 0.1 },
    note: '1 vaso ≈ 250 g (brik)',
    mealTags: ['pre', 'post'],
    portableOk: true,
    unit: { singular: 'vaso', plural: 'vasos', grams: 250 },
  },
  {
    id: 'leche_semi',
    name: 'Leche semidesnatada',
    category: 'mixto',
    per100g: { kcal: 46, proteinG: 3.3, carbsG: 4.8, fatG: 1.6 },
    note: '1 vaso ≈ 250 g (brik)',
    mealTags: ['post'],
    portableOk: true,
    unit: { singular: 'vaso', plural: 'vasos', grams: 250 },
  },
  {
    id: 'bebida_soja',
    name: 'Bebida de soja sin azúcar',
    category: 'mixto',
    per100g: { kcal: 33, proteinG: 2.9, carbsG: 1.7, fatG: 1.6 },
    note: 'En brik; 1 vaso ≈ 250 g',
    mealTags: ['post'],
    portableOk: true,
    unit: { singular: 'vaso', plural: 'vasos', grams: 250 },
  },
  {
    id: 'barrita_proteina',
    name: 'Barrita de proteína',
    category: 'mixto',
    per100g: { kcal: 380, proteinG: 35, carbsG: 33, fatG: 12 },
    note: 'Valores medios; revisa la etiqueta. 1 barrita ≈ 45 g',
    mealTags: ['pre', 'post'],
    portableOk: true,
    unit: { singular: 'barrita', plural: 'barritas', grams: 45 },
  },
  {
    id: 'hummus',
    name: 'Hummus',
    category: 'mixto',
    per100g: { kcal: 175, proteinG: 7.9, carbsG: 14.3, fatG: 9.6 },
    mealTags: ['post', 'almuerzo', 'cena'],
    portableOk: true,
  },
  {
    id: 'crema_verduras',
    name: 'Crema de verduras (sin nata)',
    category: 'mixto',
    per100g: { kcal: 35, proteinG: 1.2, carbsG: 5.5, fatG: 1 },
    note: 'Ya preparada, tal cual se toma',
    mealTags: ['cena'],
  },
  {
    id: 'brocoli',
    name: 'Brócoli',
    category: 'mixto',
    per100g: { kcal: 41, proteinG: 2.8, carbsG: 6.6, fatG: 0.4 },
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'espinacas',
    name: 'Espinacas',
    category: 'mixto',
    per100g: { kcal: 30, proteinG: 2.9, carbsG: 3.6, fatG: 0.4 },
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'calabacin',
    name: 'Calabacín',
    category: 'mixto',
    per100g: { kcal: 20, proteinG: 1.2, carbsG: 3.1, fatG: 0.3 },
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'judias_verdes',
    name: 'Judías verdes',
    category: 'mixto',
    per100g: { kcal: 37, proteinG: 1.8, carbsG: 7, fatG: 0.2 },
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'ensalada_mixta',
    name: 'Ensalada mixta',
    category: 'mixto',
    per100g: { kcal: 18, proteinG: 1, carbsG: 3, fatG: 0.2 },
    note: 'Lechuga, tomate, zanahoria y cebolla, sin aliñar',
    mealTags: ['almuerzo', 'cena'],
    portableOk: true,
  },
  {
    id: 'champinones',
    name: 'Champiñones',
    category: 'mixto',
    per100g: { kcal: 28, proteinG: 3.1, carbsG: 3.3, fatG: 0.3 },
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'tomate',
    name: 'Tomate',
    category: 'mixto',
    per100g: { kcal: 18, proteinG: 0.9, carbsG: 3.9, fatG: 0.2 },
    mealTags: ['post', 'almuerzo', 'cena'],
    portableOk: true,
  },
  {
    id: 'manzana',
    name: 'Manzana',
    category: 'mixto',
    per100g: { kcal: 58, proteinG: 0.3, carbsG: 13.8, fatG: 0.2 },
    note: 'Con piel; 1 unidad ≈ 150 g',
    mealTags: ['pre', 'post', 'cena'],
    portableOk: true,
    unit: { singular: 'manzana', plural: 'manzanas', grams: 150 },
  },
  {
    id: 'mandarina',
    name: 'Mandarina',
    category: 'mixto',
    per100g: { kcal: 59, proteinG: 0.8, carbsG: 13.3, fatG: 0.3 },
    note: 'Peso con la pulpa pelada; 1 unidad ≈ 80 g',
    mealTags: ['pre', 'post'],
    portableOk: true,
    unit: { singular: 'mandarina', plural: 'mandarinas', grams: 80 },
  },
  {
    id: 'frutos_rojos',
    name: 'Frutos rojos (mezcla)',
    category: 'mixto',
    per100g: { kcal: 51, proteinG: 0.9, carbsG: 11, fatG: 0.4 },
    note: 'Fresas, arándanos, frambuesas (frescos o congelados)',
    mealTags: ['pre', 'post', 'cena'],
    portableOk: true,
  },

  // --- Carbohidrato ---
  {
    id: 'pan_centeno',
    name: 'Pan de centeno integral',
    category: 'carbohidrato',
    per100g: { kcal: 259, proteinG: 8.5, carbsG: 48, fatG: 3.3 },
    note: '1 rebanada ≈ 30 g',
    mealTags: ['pre', 'post', 'cena'],
    portableOk: true,
    unit: { singular: 'rebanada', plural: 'rebanadas', grams: 30 },
  },
  {
    id: 'pan_molde_integral',
    name: 'Pan de molde integral',
    category: 'carbohidrato',
    per100g: { kcal: 252, proteinG: 12.5, carbsG: 42.7, fatG: 3.5 },
    note: '1 rebanada ≈ 28 g',
    mealTags: ['post', 'cena'],
    portableOk: true,
    unit: { singular: 'rebanada', plural: 'rebanadas', grams: 28 },
  },
  {
    id: 'tortitas_arroz',
    name: 'Tortitas de arroz',
    category: 'carbohidrato',
    per100g: { kcal: 387, proteinG: 8.2, carbsG: 81.5, fatG: 2.8 },
    note: '1 tortita ≈ 9 g',
    mealTags: ['pre', 'post', 'cena'],
    portableOk: true,
    unit: { singular: 'tortita', plural: 'tortitas', grams: 9 },
  },
  {
    id: 'tortitas_avena',
    name: 'Tortitas de avena',
    category: 'carbohidrato',
    per100g: { kcal: 393, proteinG: 11, carbsG: 62, fatG: 11 },
    note: '1 tortita ≈ 10 g',
    mealTags: ['pre', 'post'],
    portableOk: true,
    unit: { singular: 'tortita', plural: 'tortitas', grams: 10 },
  },
  {
    id: 'galletas_avena',
    name: 'Galletas integrales de avena (sin azúcar añadido)',
    category: 'carbohidrato',
    per100g: { kcal: 437, proteinG: 7, carbsG: 68, fatG: 15 },
    note: 'Valores medios; revisa la etiqueta',
    mealTags: ['post'],
    portableOk: true,
  },
  {
    id: 'barrita_avena',
    name: 'Barrita de avena (sin azúcar añadido)',
    category: 'carbohidrato',
    per100g: { kcal: 388, proteinG: 8, carbsG: 62, fatG: 12 },
    note: 'Valores medios; revisa la etiqueta. 1 barrita ≈ 35 g',
    mealTags: ['pre', 'post'],
    portableOk: true,
    unit: { singular: 'barrita', plural: 'barritas', grams: 35 },
  },
  {
    id: 'copos_maiz',
    name: 'Copos de maíz sin azúcar',
    category: 'carbohidrato',
    per100g: { kcal: 368, proteinG: 7.5, carbsG: 84, fatG: 0.4 },
    mealTags: ['post'],
    portableOk: true,
  },
  {
    id: 'muesli',
    name: 'Muesli sin azúcar añadido',
    category: 'carbohidrato',
    per100g: { kcal: 352, proteinG: 10, carbsG: 65, fatG: 5.5 },
    mealTags: ['post'],
    portableOk: true,
  },
  {
    id: 'granola',
    name: 'Granola baja en azúcar',
    category: 'carbohidrato',
    per100g: { kcal: 435, proteinG: 10, carbsG: 62, fatG: 16 },
    note: 'Valores medios; revisa la etiqueta',
    mealTags: ['post'],
    portableOk: true,
  },
  {
    id: 'datiles',
    name: 'Dátiles (medjool)',
    category: 'carbohidrato',
    per100g: { kcal: 309, proteinG: 1.8, carbsG: 75, fatG: 0.2 },
    note: 'Sin hueso; 1 dátil ≈ 24 g',
    mealTags: ['pre', 'post'],
    portableOk: true,
    unit: { singular: 'dátil', plural: 'dátiles', grams: 24 },
  },
  {
    id: 'miel',
    name: 'Miel',
    category: 'carbohidrato',
    per100g: { kcal: 331, proteinG: 0.3, carbsG: 82.4, fatG: 0 },
    note: '1 cucharada ≈ 20 g',
    mealTags: ['pre', 'post'],
    portableOk: true,
    unit: { singular: 'cucharada', plural: 'cucharadas', grams: 20 },
  },
  {
    id: 'mermelada',
    name: 'Mermelada de fruta',
    category: 'carbohidrato',
    per100g: { kcal: 263, proteinG: 0.4, carbsG: 65, fatG: 0.1 },
    mealTags: ['pre', 'post'],
    portableOk: true,
  },
  {
    id: 'arroz_integral',
    name: 'Arroz integral',
    category: 'carbohidrato',
    per100g: { kcal: 370, proteinG: 7.9, carbsG: 77.2, fatG: 2.9 },
    cookedFactor: 2.5,
    note: 'Pesar en crudo; 70 g crudo ≈ 175 g cocido',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'pasta_integral',
    name: 'Pasta integral',
    category: 'carbohidrato',
    per100g: { kcal: 347, proteinG: 13, carbsG: 68, fatG: 2.5 },
    cookedFactor: 2.2,
    note: 'Pesar en crudo; cocida ≈ ×2.2',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'quinoa',
    name: 'Quinoa',
    category: 'carbohidrato',
    per100g: { kcal: 368, proteinG: 14.1, carbsG: 64.2, fatG: 6.1 },
    cookedFactor: 2.8,
    note: 'Pesar en crudo; cocida ≈ ×2.8',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'garbanzos',
    name: 'Garbanzos (secos)',
    category: 'carbohidrato',
    per100g: { kcal: 388, proteinG: 20.5, carbsG: 62.9, fatG: 6 },
    cookedFactor: 2.4,
    note: 'Pesar en crudo; cocidos ≈ ×2.4',
    mealTags: ['almuerzo', 'cena'],
  },
  {
    id: 'garbanzos_bote',
    name: 'Garbanzos cocidos (bote, escurridos)',
    category: 'carbohidrato',
    per100g: { kcal: 164, proteinG: 8.9, carbsG: 27.4, fatG: 2.6 },
    note: 'Escurrido; listos para comer',
    mealTags: ['almuerzo', 'cena'],
    portableOk: true,
  },
  {
    id: 'wrap_integral',
    name: 'Wrap / tortilla integral',
    category: 'carbohidrato',
    per100g: { kcal: 290, proteinG: 9, carbsG: 48, fatG: 7 },
    note: '1 wrap ≈ 60 g',
    mealTags: ['post', 'almuerzo', 'cena'],
    portableOk: true,
    unit: { singular: 'wrap', plural: 'wraps', grams: 60 },
  },

  // --- Grasa ---
  {
    id: 'cacahuete_crema',
    name: 'Crema de cacahuete 100 %',
    category: 'grasa',
    per100g: { kcal: 600, proteinG: 26, carbsG: 12, fatG: 50 },
    note: 'Sin azúcar ni aceites añadidos; 1 monodosis ≈ 20 g',
    mealTags: ['pre', 'post'],
    portableOk: true,
    unit: { singular: 'monodosis', plural: 'monodosis', grams: 20 },
  },
  {
    id: 'nueces',
    name: 'Nueces',
    category: 'grasa',
    per100g: { kcal: 634, proteinG: 15, carbsG: 4, fatG: 62 },
    note: 'Sin cáscara, sin sal',
    mealTags: ['post', 'cena'],
    portableOk: true,
  },
];

const FOOD_BY_ID: Map<string, Food> = new Map(FOODS.map((f) => [f.id, f]));

/** Busca un alimento por id (undefined si no existe). */
export function getFood(id: string): Food | undefined {
  return FOOD_BY_ID.get(id);
}

/** Cantidad máxima (g en crudo) que el modal de intercambio ofrece como alternativa razonable. */
export const MAX_SWAP_RAW_G = 800;

/**
 * Partición estable: primero los alimentos etiquetados para la comida, luego
 * el resto, conservando el orden original dentro de cada grupo.
 */
export function prioritizeForMeal<T extends { food: Food }>(items: T[], meal: MealId): T[] {
  const tagged = items.filter((i) => i.food.mealTags?.includes(meal));
  const others = items.filter((i) => !i.food.mealTags?.includes(meal));
  return [...tagged, ...others];
}

/**
 * Equivalencia en unidades contables (solo presentación), p.ej. `'≈ 2 huevos'`.
 * null si el alimento no define unidad o la cantidad es < 0,75 unidades.
 */
export function approxUnits(food: Food, grams: number): string | null {
  if (!food.unit || !Number.isFinite(grams) || food.unit.grams <= 0) return null;
  const raw = grams / food.unit.grams;
  if (raw < 0.75) return null;
  const value = raw < 3 ? Math.round(raw * 2) / 2 : Math.round(raw);
  const label = value === 1 ? food.unit.singular : food.unit.plural;
  return `≈ ${String(value).replace('.', ',')} ${label}`;
}

/**
 * Gramos (en crudo) para alcanzar `targetGrams` de un macro de masa.
 * Si food.per100g[macro] <= 0 el alimento NO aporta ese macro ⇒ devuelve null
 * (evita Infinity/NaN; p.ej. aceite para proteína/carbos).
 */
export function gramsForTargetMacro(
  food: Food,
  macro: MassMacro,
  targetGrams: number,
): number | null {
  return food.per100g[macro] <= 0 ? null : (targetGrams * 100) / food.per100g[macro];
}

/**
 * Intercambio por un macro de masa concreto (nunca kcal: el tipo lo impide).
 * Filtra misma category y per100g[macro] > 0, excluyendo food.id.
 */
export function swapEquivalents(
  food: Food,
  grams: number,
  macro: MassMacro,
  db: Food[],
): Array<{ food: Food; grams: number }> {
  const targetMacroGrams = (grams * food.per100g[macro]) / 100;
  const candidatos = db.filter(
    (f) => f.id !== food.id && f.category === food.category && f.per100g[macro] > 0,
  );
  return candidatos.map((f) => ({
    food: f,
    grams: gramsForTargetMacro(f, macro, targetMacroGrams)!,
  }));
}

/**
 * Conversión crudo→cocido SOLO para presentación. No re-alimenta el cálculo de
 * macros: cocido = crudo × cookedFactor (si está definido), si no, crudo.
 */
export function toCookedGrams(food: Food, rawGrams: number): number {
  return food.cookedFactor ? rawGrams * food.cookedFactor : rawGrams;
}
