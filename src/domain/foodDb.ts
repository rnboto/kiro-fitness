// Base de alimentos e intercambio — capa de dominio PURA (design §7).
// per100g expresa SIEMPRE los macros por 100 g EN CRUDO.

import type { MacroSet, MassMacro } from './nutrition';

export interface Food {
  id: string;
  name: string; // español
  per100g: MacroSet; // SIEMPRE macros por 100 g EN CRUDO
  cookedFactor?: number; // factor crudo→cocinado solo-presentación (cocido = crudo × factor)
  note?: string;
  category: 'proteina' | 'carbohidrato' | 'grasa' | 'mixto';
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
  },
  {
    id: 'ternera_magra',
    name: 'Ternera magra',
    category: 'proteina',
    per100g: { kcal: 175, proteinG: 26, carbsG: 0, fatG: 7.5 },
    cookedFactor: 0.75,
    note: 'Pesar en crudo; 100 g crudo ≈ 75 g cocido',
  },
  {
    id: 'salmon',
    name: 'Salmón',
    category: 'proteina',
    per100g: { kcal: 197, proteinG: 20, carbsG: 0, fatG: 13 },
    cookedFactor: 0.8,
    note: 'Pesar en crudo; 100 g crudo ≈ 80 g cocido',
  },
  {
    id: 'atun_natural',
    name: 'Atún al natural',
    category: 'proteina',
    per100g: { kcal: 116, proteinG: 26, carbsG: 0, fatG: 1 },
    note: 'Escurrido de lata',
  },
  {
    id: 'huevo',
    name: 'Huevo entero',
    category: 'proteina',
    per100g: { kcal: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5 },
    note: 'Sin cáscara; 1 huevo M ≈ 50 g',
  },
  {
    id: 'clara_huevo',
    name: 'Clara de huevo',
    category: 'proteina',
    per100g: { kcal: 52, proteinG: 11, carbsG: 0.7, fatG: 0.2 },
    note: '1 clara ≈ 33 g',
  },
  {
    id: 'yogur_griego',
    name: 'Yogur griego natural',
    category: 'proteina',
    per100g: { kcal: 97, proteinG: 9, carbsG: 4, fatG: 5 },
  },
  {
    id: 'queso_batido',
    name: 'Queso fresco batido 0%',
    category: 'proteina',
    per100g: { kcal: 47, proteinG: 8, carbsG: 4, fatG: 0.2 },
  },
  // --- Carbohidrato ---
  {
    id: 'arroz_blanco',
    name: 'Arroz blanco',
    category: 'carbohidrato',
    per100g: { kcal: 349, proteinG: 7, carbsG: 79, fatG: 0.6 },
    cookedFactor: 2.5,
    note: 'Pesar en crudo; 70 g crudo ≈ 175 g cocido',
  },
  {
    id: 'avena',
    name: 'Avena en copos',
    category: 'carbohidrato',
    per100g: { kcal: 355, proteinG: 13, carbsG: 60, fatG: 7 },
    cookedFactor: 3.0,
    note: 'Pesar en crudo; absorbe ×3 al cocer',
  },
  {
    id: 'patata',
    name: 'Patata',
    category: 'carbohidrato',
    per100g: { kcal: 77, proteinG: 2, carbsG: 17, fatG: 0.1 },
    cookedFactor: 0.95,
    note: 'Pesar en crudo; hervida ≈ ×0.95',
  },
  {
    id: 'boniato',
    name: 'Boniato',
    category: 'carbohidrato',
    per100g: { kcal: 86, proteinG: 1.6, carbsG: 20, fatG: 0.1 },
    cookedFactor: 0.95,
  },
  {
    id: 'pan_integral',
    name: 'Pan integral',
    category: 'carbohidrato',
    per100g: { kcal: 231, proteinG: 9, carbsG: 41, fatG: 3.4 },
  },
  {
    id: 'lentejas',
    name: 'Lentejas',
    category: 'carbohidrato',
    per100g: { kcal: 306, proteinG: 25, carbsG: 49, fatG: 1.1 },
    cookedFactor: 2.4,
    note: 'Pesar en crudo; cocidas ≈ ×2.4',
  },
  {
    id: 'platano',
    name: 'Plátano',
    category: 'carbohidrato',
    per100g: { kcal: 99, proteinG: 1.1, carbsG: 23, fatG: 0.3 },
    note: '1 unidad media ≈ 120 g',
  },
  // --- Grasa ---
  {
    id: 'aceite_oliva',
    name: 'Aceite de oliva virgen',
    category: 'grasa',
    per100g: { kcal: 900, proteinG: 0, carbsG: 0, fatG: 100 },
    note: '1 cda ≈ 10 g',
  },
  {
    id: 'almendras',
    name: 'Almendras',
    category: 'grasa',
    per100g: { kcal: 622, proteinG: 21, carbsG: 22, fatG: 50 },
    note: 'Crudas, sin sal',
  },
  {
    id: 'aguacate',
    name: 'Aguacate',
    category: 'grasa',
    per100g: { kcal: 179, proteinG: 2, carbsG: 9, fatG: 15 },
    note: '1/2 unidad ≈ 70 g',
  },
];

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
