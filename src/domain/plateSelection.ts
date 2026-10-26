// Plato elegido por comida — capa de dominio PURA (sin React ni storage).
// Se persiste SOLO el id del plato (nunca gramos): los gramos se recalculan en
// cada render a partir del perfil. Cualquier id desconocido o de otra comida
// cae en silencio al plato predeterminado (el primero de esa comida).

import type { Settings } from '../storage';
import { PLATES, type MealId, type Plate } from './mealPlates';

export const MEAL_IDS: readonly MealId[] = ['pre', 'post', 'almuerzo', 'cena'];

export type SelectedPlates = NonNullable<Settings['selectedPlates']>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Id elegido para `mealId` o undefined si el mapa no es válido / no tiene clave. */
function chosenId(mealId: MealId, selectedPlates: unknown): string | undefined {
  if (!isRecord(selectedPlates)) return undefined;
  const id = selectedPlates[mealId];
  return typeof id === 'string' ? id : undefined;
}

/**
 * Plato elegido si existe en `catalogue` y pertenece a `mealId`; si no, el
 * primero de esa comida en `catalogue` (predeterminado determinista).
 */
export function resolveChosenPlate(
  mealId: MealId,
  selectedPlates: SelectedPlates | null | undefined,
  catalogue: readonly Plate[] = PLATES,
): Plate {
  const list = catalogue.filter((p) => p.meal === mealId);
  if (list.length === 0) {
    throw new Error(`No hay platos en el catálogo para la comida «${mealId}».`);
  }
  const id = chosenId(mealId, selectedPlates);
  return list.find((p) => p.id === id) ?? list[0];
}

/** true si hay una elección explícita válida (existe y pertenece a la comida). */
export function isPlateChosen(
  mealId: MealId,
  selectedPlates: SelectedPlates | null | undefined,
  catalogue: readonly Plate[] = PLATES,
): boolean {
  const id = chosenId(mealId, selectedPlates);
  return id !== undefined && catalogue.some((p) => p.meal === mealId && p.id === id);
}

/** Devuelve un mapa NUEVO con la elección puesta (plateId) o quitada (null). No muta. */
export function withPlateChoice(
  selectedPlates: SelectedPlates | null | undefined,
  mealId: MealId,
  plateId: string | null,
): SelectedPlates {
  const next: SelectedPlates = { ...readSelectedPlates({ selectedPlates }) };
  if (plateId === null) delete next[mealId];
  else next[mealId] = plateId;
  return next;
}

function sanitizeMap(raw: unknown): SelectedPlates {
  const out: SelectedPlates = {};
  if (!isRecord(raw)) return out;
  for (const id of MEAL_IDS) {
    const v = raw[id];
    if (typeof v === 'string' && v.length > 0) out[id] = v;
  }
  return out;
}

/** Lectura defensiva desde Settings (por defecto {}). */
export function readSelectedPlates(
  settings: { selectedPlates?: unknown } | null | undefined,
): SelectedPlates {
  return sanitizeMap(settings?.selectedPlates);
}

/**
 * Sanea `selectedPlates` SOLO si la clave viene en el objeto crudo (backups):
 * si falta, sigue faltando y los backups antiguos quedan idénticos.
 */
export function sanitizeSelectedPlatesKey(raw: Record<string, unknown>): Record<string, unknown> {
  if (!('selectedPlates' in raw)) return raw;
  return { ...raw, selectedPlates: sanitizeMap(raw.selectedPlates) };
}
