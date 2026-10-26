// Rótulos SOLO de interfaz de las comidas (el nombre almacenado no cambia).

import type { MealId } from '../../domain/mealPlates';

const MEAL_TITLE_HINT: Partial<Record<MealId, string>> = {
  post: 'Desayuno',
};

/** Nombre mostrado: «Post-entreno · Desayuno»; el resto, tal cual. */
export function mealTitle(mealId: MealId, name: string): string {
  const hint = MEAL_TITLE_HINT[mealId];
  return hint ? `${name} · ${hint}` : name;
}
