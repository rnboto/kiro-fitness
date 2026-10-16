// Motor de nutrición — capa de dominio PURA (sin React, sin storage).
// Todas las funciones son determinísticas y unit-testeables (design §6).

/** Macros completos (incluye kcal). */
export interface MacroSet {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Macros de masa (gramos). Excluye 'kcal' a propósito, porque las operaciones
 * por macro (intercambio, gramos objetivo) no soportan kcal (design §6).
 */
export type MassMacro = 'proteinG' | 'carbsG' | 'fatG';

/** Entradas base derivadas del perfil + ajustes (design §6). */
export interface NutritionInput {
  weightKg: number; // peso total (profile.weightKg)
  bodyFatPct: number; // % grasa (profile.bodyFatPct)
  mmeKg: number; // MME — métrica de progreso (ver nota de desviación §6.1)
  activityFactor: number; // settings.activityFactor (default 1.375)
  proteinGPerKg: number; // settings.proteinGPerKg (default 2.0)
  bmrBasis: 'lbm' | 'mme'; // settings.bmrBasis (default 'lbm'); ver §6.1
  /** 'HH:mm' de inicio de entreno; de aquí derivan Pre/Post (design §6.2). */
  trainingStart: string;
}

/** Plan de una comida concreta. */
export interface MealPlan {
  id: 'pre' | 'post' | 'almuerzo' | 'cena';
  name: string; // 'Pre-entreno' | 'Post-entreno' | 'Almuerzo' | 'Cena'
  time: string; // 'HH:mm'
  macros: MacroSet;
}

/** Plan diario completo derivado del perfil. */
export interface DailyPlan {
  lbmKg: number; // SIEMPRE la LBM calculada (aunque bmrBasis sea 'mme')
  bmr: number;
  tdee: number;
  targetKcal: number; // tras déficit 20%
  totals: MacroSet;
  meals: MealPlan[]; // exactamente 4, ordenadas por hora ascendente
  warning?: 'CARBS_CLAMPED_TO_ZERO' | 'FAT_REDUCED_TO_FLOOR'; // ausente = plan normal
}

// NOTA: `age` y `sex` del perfil NO intervienen en Katch-McArdle. La fórmula es
// independiente de edad y sexo (opera solo sobre masa magra). Se capturan y
// muestran en Perfil como ficha/histórico, pero nunca en el cálculo energético.

/** LBM = peso × (1 − %grasa/100). */
export function leanBodyMass(weightKg: number, bodyFatPct: number): number {
  return weightKg * (1 - bodyFatPct / 100);
}

/**
 * BMR Katch-McArdle = 370 + 21.6 × massKg.
 * NOTA EN CÓDIGO: la fórmula estándar usa LBM TOTAL, no la MME. `massKg` = LBM
 * si bmrBasis='lbm' (default/correcto) o MME si bmrBasis='mme' (modo literal al
 * brief). La selección la hace buildDailyPlan según settings.bmrBasis.
 */
export function katchMcArdleBMR(massKg: number): number {
  return 370 + 21.6 * massKg;
}

/** TDEE = BMR × factor de actividad. */
export function tdee(bmr: number, activityFactor: number): number {
  return bmr * activityFactor;
}

/** Aplica un déficit calórico (default 20%): tdee × (1 − pct). */
export function applyDeficit(tdeeKcal: number, pct = 0.2): number {
  return tdeeKcal * (1 - pct);
}

/** Rango matutino de clamp para trainingStart (design §6.2). */
const TRAINING_START_MIN = 5 * 60; // 05:00
const TRAINING_START_MAX = 10 * 60; // 10:00

/** Parsea 'HH:mm' a minutos desde medianoche; valores inválidos → 07:00. */
function parseTimeToMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return 7 * 60;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 7 * 60;
  return h * 60 + m;
}

/** Formatea minutos desde medianoche a 'HH:mm'. */
function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Clampa a 05:00-10:00 (en minutos). */
function clampTrainingStart(minutes: number): number {
  return Math.min(TRAINING_START_MAX, Math.max(TRAINING_START_MIN, minutes));
}

/** Reparto porcentual de carbohidratos por comida (design §6.2). */
const CARB_SPLIT: Record<MealPlan['id'], number> = {
  pre: 0.3,
  post: 0.35,
  almuerzo: 0.2,
  cena: 0.15,
};

/** Reparto porcentual de grasa por comida (design §6.2). */
const FAT_SPLIT: Record<MealPlan['id'], number> = {
  pre: 0.1,
  post: 0.1,
  almuerzo: 0.4,
  cena: 0.4,
};

const MEAL_NAMES: Record<MealPlan['id'], string> = {
  pre: 'Pre-entreno',
  post: 'Post-entreno',
  almuerzo: 'Almuerzo',
  cena: 'Cena',
};

/** Orden fijo para el reparto del remanente de proteína (design §6.2). */
const PROTEIN_ORDER: MealPlan['id'][] = ['pre', 'post', 'almuerzo', 'cena'];

/**
 * Orquesta todo el cálculo de nutrición (design §6).
 * - lbm = leanBodyMass(weightKg, bodyFatPct)
 * - base = bmrBasis === 'mme' ? mmeKg : lbm
 * - bmr = katchMcArdleBMR(base)
 * - DailyPlan.lbmKg SIEMPRE reporta la LBM calculada.
 */
export function buildDailyPlan(input: NutritionInput): DailyPlan {
  const { weightKg, bodyFatPct, mmeKg, activityFactor, proteinGPerKg, bmrBasis } = input;

  const lbmKg = leanBodyMass(weightKg, bodyFatPct);
  const base = bmrBasis === 'mme' ? mmeKg : lbmKg;
  const bmr = katchMcArdleBMR(base);
  const tdeeKcal = tdee(bmr, activityFactor);
  const targetKcal = applyDeficit(tdeeKcal, 0.2);

  // --- Proteína: piso por comida redondeado al alza (design §6.2) ---
  const minProteinPerMealG = Math.ceil(0.4 * weightKg);
  const proteinaDiaria = Math.max(4 * minProteinPerMealG, Math.round(proteinGPerKg * weightKg));

  // Reparto determinista en enteros.
  const rem = proteinaDiaria - 4 * minProteinPerMealG;
  const perMealBase = Math.floor(rem / 4);
  const leftover = rem % 4; // se asigna de 1 en 1 en orden [pre,post,almuerzo,cena]
  const proteinByMeal: Record<MealPlan['id'], number> = {
    pre: minProteinPerMealG + perMealBase,
    post: minProteinPerMealG + perMealBase,
    almuerzo: minProteinPerMealG + perMealBase,
    cena: minProteinPerMealG + perMealBase,
  };
  for (let i = 0; i < leftover; i++) {
    proteinByMeal[PROTEIN_ORDER[i]] += 1;
  }

  // --- Grasa y carbohidratos (design §6.2) ---
  const protKcal = proteinaDiaria * 4;
  let fatG = (targetKcal * 0.25) / 9;
  let carbsKcal = targetKcal - protKcal - fatG * 9;
  let warning: DailyPlan['warning'];

  if (carbsKcal < 0) {
    // Reducir la grasa hasta el piso de 0.6 g/kg.
    const fatFloorG = 0.6 * weightKg;
    const reducedFatG = Math.max(fatFloorG, (targetKcal - protKcal) / 9);
    fatG = reducedFatG;
    carbsKcal = targetKcal - protKcal - fatG * 9;
    if (carbsKcal >= 0) {
      warning = 'FAT_REDUCED_TO_FLOOR';
    } else {
      // Carbos siguen negativos tras bajar la grasa al piso.
      carbsKcal = 0;
      warning = 'CARBS_CLAMPED_TO_ZERO';
    }
  }

  const carbsG = carbsKcal / 4;

  // --- Horas de comida derivadas de trainingStart (design §6.2) ---
  const trainingStartMin = clampTrainingStart(parseTimeToMinutes(input.trainingStart));
  const timeById: Record<MealPlan['id'], string> = {
    pre: minutesToTime(trainingStartMin - 45),
    post: minutesToTime(trainingStartMin + 75),
    almuerzo: '13:00',
    cena: '20:30',
  };

  // --- Construcción de comidas ---
  const ids: MealPlan['id'][] = ['pre', 'post', 'almuerzo', 'cena'];
  const meals: MealPlan[] = ids.map((id) => {
    const mealProteinG = proteinByMeal[id];
    const mealCarbsG = carbsG * CARB_SPLIT[id];
    const mealFatG = fatG * FAT_SPLIT[id];
    const mealKcal = mealProteinG * 4 + mealCarbsG * 4 + mealFatG * 9;
    return {
      id,
      name: MEAL_NAMES[id],
      time: timeById[id],
      macros: {
        kcal: mealKcal,
        proteinG: mealProteinG,
        carbsG: mealCarbsG,
        fatG: mealFatG,
      },
    };
  });

  // Ordenar por hora ascendente (salvaguarda de presentación coherente).
  meals.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

  const totals: MacroSet = {
    kcal: proteinaDiaria * 4 + carbsG * 4 + fatG * 9,
    proteinG: proteinaDiaria,
    carbsG,
    fatG,
  };

  const plan: DailyPlan = {
    lbmKg,
    bmr,
    tdee: tdeeKcal,
    targetKcal,
    totals,
    meals,
  };
  if (warning) plan.warning = warning;
  return plan;
}
