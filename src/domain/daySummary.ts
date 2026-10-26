// Resumen «Mi día» — capa de dominio PURA. Suma los platos elegidos de las 4
// comidas (mismos resultados de computePlate, sin matemática nueva) y los
// compara con el objetivo diario del DailyPlan.

import type { DailyPlan, MacroSet } from './nutrition';
import { PLATES, type MealId, type Plate } from './mealPlates';
import { computePlate } from './plateSizing';
import { isPlateChosen, resolveChosenPlate, type SelectedPlates } from './plateSelection';

/** Margen (±10 %) dentro del cual la diferencia se considera «en objetivo». */
export const DAY_SUMMARY_TOLERANCE = 0.1;

export type MacroStatus = 'ok' | 'off';

export interface DaySummaryRow {
  mealId: MealId;
  mealName: string;
  time: string;
  plate: Plate;
  /** true si hay elección explícita válida; false = plato sugerido. */
  isChosen: boolean;
  totals: MacroSet;
}

export interface DaySummary {
  rows: DaySummaryRow[];
  total: MacroSet;
  target: MacroSet;
  /** total − objetivo (sin redondear). */
  diff: MacroSet;
  status: Record<keyof MacroSet, MacroStatus>;
}

const KEYS: (keyof MacroSet)[] = ['kcal', 'proteinG', 'carbsG', 'fatG'];

function statusFor(target: number, diff: number): MacroStatus {
  if (target > 0) return Math.abs(diff) / target <= DAY_SUMMARY_TOLERANCE ? 'ok' : 'off';
  return Math.abs(diff) < 0.5 ? 'ok' : 'off';
}

/** Construye el resumen del día con los platos elegidos (o sugeridos). */
export function buildDaySummary(
  plan: DailyPlan,
  selectedPlates: SelectedPlates | null | undefined,
  catalogue: readonly Plate[] = PLATES,
): DaySummary {
  const rows: DaySummaryRow[] = plan.meals.map((meal) => {
    const plate = resolveChosenPlate(meal.id, selectedPlates, catalogue);
    return {
      mealId: meal.id,
      mealName: meal.name,
      time: meal.time,
      plate,
      isChosen: isPlateChosen(meal.id, selectedPlates, catalogue),
      totals: computePlate(plate, meal.macros).totals,
    };
  });

  const total: MacroSet = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const row of rows) for (const k of KEYS) total[k] += row.totals[k];

  const target: MacroSet = {
    kcal: plan.targetKcal,
    proteinG: plan.totals.proteinG,
    carbsG: plan.totals.carbsG,
    fatG: plan.totals.fatG,
  };

  const diff = {} as MacroSet;
  const status = {} as Record<keyof MacroSet, MacroStatus>;
  for (const k of KEYS) {
    diff[k] = total[k] - target[k];
    status[k] = statusFor(target[k], diff[k]);
  }
  return { rows, total, target, diff, status };
}

/** «-35 kcal», «+4 g», «0 g»: redondea y normaliza -0. Signos ASCII. */
export function formatSignedDiff(value: number, unit: 'kcal' | 'g'): string {
  const r = Math.round(value) + 0; // + 0 convierte -0 en 0
  const body = r > 0 ? `+${r}` : `${r}`;
  return `${body} ${unit}`;
}
