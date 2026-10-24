// Cálculo de raciones de un plato — capa de dominio PURA.
//
// Dado el objetivo de macros de una comida (DailyPlan.meals[i].macros) y un
// plato del catálogo, devuelve cada alimento con gramos ENTEROS en crudo, el
// equivalente cocinado (solo presentación) y los macros resultantes del plato.
//
// No se reimplementa la matemática de alimentos: se reutilizan
// `gramsForTargetMacro` y `toCookedGrams` de foodDb. `cookedFactor` NUNCA se
// realimenta al cálculo.
//
// Limitación documentada: las porciones fijas (fruta, verdura, tostada…) no
// escalan con el perfil; en perfiles muy pequeños o grandes los totales se
// desvían del objetivo y la UI muestra siempre los totales reales del plato.

import { getFood, gramsForTargetMacro, toCookedGrams, type Food } from './foodDb';
import type { PlateComponent, Plate } from './mealPlates';
import type { MacroSet, MassMacro } from './nutrition';

export interface PlateItem {
  component: PlateComponent;
  food: Food;
  /** Macro por el que se dimensionó (null si es una porción fija). */
  sizedBy: MassMacro | null;
  /** Gramos en crudo, enteros y >= 0. */
  rawGrams: number;
  /** Equivalente cocinado redondeado (null si el alimento no tiene cookedFactor). Solo presentación. */
  cookedGrams: number | null;
  /** Macros aportados por los gramos ya redondeados. */
  macros: MacroSet;
}

export interface PlateResult {
  plate: Plate;
  items: PlateItem[];
  /** Suma de macros de los gramos redondeados (totales honestos). */
  totals: MacroSet;
  /** Objetivo de la comida, sin tocar. */
  target: MacroSet;
}

/** Tolerancia del plato frente al objetivo de la comida. */
export const PLATE_TOLERANCE = {
  kcalPct: 0.15,
  proteinPct: 0.1,
  carbsPct: 0.15,
  fatPct: 0.15,
  /** Margen absoluto mínimo (g) para macros pequeños. */
  proteinAbsG: 4,
  absFloorG: 8,
} as const;

const MACROS: MassMacro[] = ['proteinG', 'carbsG', 'fatG'];
const PASSES = 4;

const safe = (n: number): number => (Number.isFinite(n) ? n : 0);

function sanitizeTarget(t: MacroSet): MacroSet {
  return {
    kcal: Math.max(0, safe(t.kcal)),
    proteinG: Math.max(0, safe(t.proteinG)),
    carbsG: Math.max(0, safe(t.carbsG)),
    fatG: Math.max(0, safe(t.fatG)),
  };
}

/**
 * Dimensiona un plato. Los macros cruzados (la avena aporta proteína, el skyr
 * hidratos…) se resuelven con pocas pasadas tipo Gauss-Seidel en el orden
 * proteína → carbohidratos → grasa; los coeficientes cruzados son << 1, por lo
 * que converge en 2-3 pasadas (se hacen 4).
 */
export function computePlate(plate: Plate, target: MacroSet): PlateResult {
  const tgt = sanitizeTarget(target);
  const foods = plate.components.map((c) => {
    const food = getFood(c.foodId);
    if (!food) throw new Error(`Alimento no encontrado en FOODS: ${c.foodId} (plato ${plate.id})`);
    return food;
  });

  const grams = plate.components.map((c) =>
    c.sizing.by === 'fixed' ? Math.max(0, safe(c.sizing.grams)) : Math.max(0, safe(c.sizing.minG ?? 0)),
  );

  for (let pass = 0; pass < PASSES; pass++) {
    for (const macro of MACROS) {
      const group = plate.components
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => c.sizing.by === macro);
      if (group.length === 0) continue;

      let contributed = 0;
      plate.components.forEach((c, i) => {
        if (c.sizing.by !== macro) contributed += (foods[i].per100g[macro] * grams[i]) / 100;
      });
      const remaining = Math.max(0, tgt[macro] - contributed);
      const totalShare = group.reduce(
        (s, { c }) => s + (c.sizing.by === 'fixed' ? 0 : (c.sizing.share ?? 1)),
        0,
      );

      for (const { c, i } of group) {
        if (c.sizing.by === 'fixed') continue;
        const share = (c.sizing.share ?? 1) / (totalShare || 1);
        let g = gramsForTargetMacro(foods[i], macro, remaining * share) ?? 0;
        g = safe(g);
        g = Math.max(c.sizing.minG ?? 0, g);
        g = Math.min(c.sizing.maxG ?? Infinity, g);
        grams[i] = Math.max(0, g);
      }
    }
  }

  const items: PlateItem[] = plate.components.map((component, i) => {
    const food = foods[i];
    const rawGrams = Math.max(0, Math.round(safe(grams[i])));
    const k = rawGrams / 100;
    return {
      component,
      food,
      sizedBy: component.sizing.by === 'fixed' ? null : component.sizing.by,
      rawGrams,
      cookedGrams: food.cookedFactor ? Math.round(toCookedGrams(food, rawGrams)) : null,
      macros: {
        kcal: food.per100g.kcal * k,
        proteinG: food.per100g.proteinG * k,
        carbsG: food.per100g.carbsG * k,
        fatG: food.per100g.fatG * k,
      },
    };
  });

  const totals = items.reduce<MacroSet>(
    (t, it) => ({
      kcal: t.kcal + it.macros.kcal,
      proteinG: t.proteinG + it.macros.proteinG,
      carbsG: t.carbsG + it.macros.carbsG,
      fatG: t.fatG + it.macros.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  return { plate, items, totals, target };
}

/**
 * Desviación relativa/absoluta de los totales del plato respecto al objetivo
 * y si entra en PLATE_TOLERANCE. Proteína: max(10 %, 4 g); carbos y grasa:
 * max(15 %, 8 g); kcal: 15 %.
 */
export function plateDeviation(result: PlateResult): {
  kcalPct: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  ok: boolean;
} {
  const { totals: t, target: g } = result;
  const T = PLATE_TOLERANCE;
  const kcalPct = g.kcal > 0 ? (t.kcal - g.kcal) / g.kcal : 0;
  const dP = t.proteinG - g.proteinG;
  const dC = t.carbsG - g.carbsG;
  const dF = t.fatG - g.fatG;
  const ok =
    Math.abs(kcalPct) <= T.kcalPct &&
    Math.abs(dP) <= Math.max(T.proteinPct * g.proteinG, T.proteinAbsG) &&
    Math.abs(dC) <= Math.max(T.carbsPct * g.carbsG, T.absFloorG) &&
    Math.abs(dF) <= Math.max(T.fatPct * g.fatG, T.absFloorG);
  return { kcalPct, proteinG: dP, carbsG: dC, fatG: dF, ok };
}
