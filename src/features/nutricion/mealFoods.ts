// Deriva alimentos sugeridos (con gramos exactos en crudo) para una comida a
// partir de sus macros. Usa la base de alimentos del dominio (design §7).
//
// Estrategia simple y determinista: un alimento representativo por macro
// (proteína, carbohidrato, grasa) y los gramos crudos que cubren ese macro.

import { FOODS, gramsForTargetMacro, type Food } from '../../domain/foodDb';
import type { MacroSet, MassMacro } from '../../domain/nutrition';

export interface MealFoodItem {
  food: Food;
  /** Macro dominante por el que se calculó la ración. */
  macro: MassMacro;
  /** Gramos en crudo (exactos, sin redondear). */
  rawGrams: number;
}

function findFood(id: string): Food {
  const food = FOODS.find((f) => f.id === id);
  if (!food) throw new Error(`Alimento no encontrado en FOODS: ${id}`);
  return food;
}

// Alimentos representativos por macro (deterministas).
const PROTEIN_FOOD = findFood('pollo_pechuga');
const CARB_FOOD = findFood('arroz_blanco');
const FAT_FOOD = findFood('aceite_oliva');

/**
 * Para una comida, devuelve los alimentos sugeridos con sus gramos en crudo.
 * Se omite un macro si su aporte redondeado es 0 (p.ej. carbos clampados).
 */
export function mealFoodItems(macros: MacroSet): MealFoodItem[] {
  const items: MealFoodItem[] = [];

  const push = (food: Food, macro: MassMacro, targetGrams: number) => {
    if (targetGrams <= 0.5) return; // irrelevante tras redondeo
    const grams = gramsForTargetMacro(food, macro, targetGrams);
    if (grams === null || !Number.isFinite(grams) || grams <= 0) return;
    items.push({ food, macro, rawGrams: grams });
  };

  push(PROTEIN_FOOD, 'proteinG', macros.proteinG);
  push(CARB_FOOD, 'carbsG', macros.carbsG);
  push(FAT_FOOD, 'fatG', macros.fatG);

  return items;
}
