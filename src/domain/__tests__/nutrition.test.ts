import { describe, it, expect } from 'vitest';
import {
  leanBodyMass,
  katchMcArdleBMR,
  tdee,
  applyDeficit,
  buildDailyPlan,
  type NutritionInput,
} from '../nutrition';

/** Base de input con los defaults de Settings (design §5). */
function baseInput(overrides: Partial<NutritionInput> = {}): NutritionInput {
  return {
    weightKg: 80,
    bodyFatPct: 15,
    mmeKg: 40,
    activityFactor: 1.375,
    proteinGPerKg: 2.0,
    bmrBasis: 'lbm',
    trainingStart: '07:00',
    ...overrides,
  };
}

describe('fórmulas base', () => {
  it('leanBodyMass = peso × (1 − %grasa/100)', () => {
    expect(leanBodyMass(80, 15)).toBeCloseTo(68, 10);
  });

  it('katchMcArdleBMR = 370 + 21.6 × masa', () => {
    expect(katchMcArdleBMR(68)).toBeCloseTo(1838.8, 10);
  });

  it('tdee = bmr × factor', () => {
    expect(tdee(1838.8, 1.375)).toBeCloseTo(2528.35, 6);
  });

  it('applyDeficit default 20%', () => {
    expect(applyDeficit(2528.35)).toBeCloseTo(2022.68, 6);
  });
});

describe('buildDailyPlan — perfil 80kg/15% (asserts de muestra design §12)', () => {
  const plan = buildDailyPlan(baseInput());

  it('LBM 68, BMR 1838.8, TDEE ~2528.35, target ~2022.68', () => {
    expect(plan.lbmKg).toBeCloseTo(68, 10);
    expect(plan.bmr).toBeCloseTo(1838.8, 10);
    expect(plan.tdee).toBeCloseTo(2528.35, 6);
    expect(plan.targetKcal).toBeCloseTo(2022.68, 6);
  });

  it('cada comida tiene proteína >= ceil(0.4×80) = 32', () => {
    expect(plan.meals).toHaveLength(4);
    for (const meal of plan.meals) {
      expect(meal.macros.proteinG).toBeGreaterThanOrEqual(32);
    }
  });

  it('lbmKg SIEMPRE reporta la LBM aunque bmrBasis sea mme', () => {
    const planMme = buildDailyPlan(baseInput({ bmrBasis: 'mme', mmeKg: 40 }));
    expect(planMme.lbmKg).toBeCloseTo(68, 10);
    // BMR usa la MME como base.
    expect(planMme.bmr).toBeCloseTo(370 + 21.6 * 40, 10);
  });
});

describe('reparto determinista de proteína', () => {
  it('83 kg => Pre 42 / Post 42 / Almuerzo 41 / Cena 41 (suma 166)', () => {
    const plan = buildDailyPlan(baseInput({ weightKg: 83, bodyFatPct: 20 }));
    const byId = Object.fromEntries(plan.meals.map((m) => [m.id, m.macros.proteinG]));
    expect(byId.pre).toBe(42);
    expect(byId.post).toBe(42);
    expect(byId.almuerzo).toBe(41);
    expect(byId.cena).toBe(41);
    expect(byId.pre + byId.post + byId.almuerzo + byId.cena).toBe(166);
    expect(plan.totals.proteinG).toBe(166);
  });

  it('cada comida >= ceil(0.4×peso) para varios pesos', () => {
    for (const w of [60, 72, 83, 95, 110]) {
      const plan = buildDailyPlan(baseInput({ weightKg: w, bodyFatPct: 18 }));
      const floor = Math.ceil(0.4 * w);
      for (const meal of plan.meals) {
        expect(meal.macros.proteinG).toBeGreaterThanOrEqual(floor);
      }
    }
  });
});

describe('ramas de warning', () => {
  it('FAT_REDUCED_TO_FLOOR cuando los carbos quedan negativos pero se recuperan al bajar grasa al piso', () => {
    // Proteína muy alta recorta el target hasta que la grasa al 25% deja carbos
    // negativos; al bajar la grasa al piso 0.6 g/kg se recuperan carbos >= 0.
    const plan = buildDailyPlan(
      baseInput({ weightKg: 42, bodyFatPct: 32, proteinGPerKg: 5.0, mmeKg: 20 }),
    );
    expect(plan.warning).toBe('FAT_REDUCED_TO_FLOOR');
    expect(plan.totals.carbsG).toBeGreaterThanOrEqual(0);
    // La grasa se reduce respecto al 25% inicial pero nunca baja del piso 0.6 g/kg.
    expect(plan.totals.fatG).toBeGreaterThanOrEqual(0.6 * 42);
    expect(plan.totals.fatG).toBeLessThan((plan.targetKcal * 0.25) / 9);
  });

  it('CARBS_CLAMPED_TO_ZERO en perfil extremo deja carbos a 0', () => {
    const plan = buildDailyPlan(
      baseInput({ weightKg: 50, bodyFatPct: 45, proteinGPerKg: 4.0, mmeKg: 20 }),
    );
    expect(plan.warning).toBe('CARBS_CLAMPED_TO_ZERO');
    expect(plan.totals.carbsG).toBe(0);
  });

  it('plan normal no emite warning', () => {
    const plan = buildDailyPlan(baseInput());
    expect(plan.warning).toBeUndefined();
  });
});

describe('horas de comida y orden', () => {
  it('Pre = trainingStart − 45min, Post = trainingStart + 75min (default 07:00)', () => {
    const plan = buildDailyPlan(baseInput({ trainingStart: '07:00' }));
    const byId = Object.fromEntries(plan.meals.map((m) => [m.id, m.time]));
    expect(byId.pre).toBe('06:15');
    expect(byId.post).toBe('08:15');
    expect(byId.almuerzo).toBe('13:00');
    expect(byId.cena).toBe('20:30');
  });

  it('clampa trainingStart al rango 05:00-10:00', () => {
    const early = buildDailyPlan(baseInput({ trainingStart: '03:00' }));
    const earlyPre = early.meals.find((m) => m.id === 'pre')!.time;
    // Clamp a 05:00 => Pre 04:15.
    expect(earlyPre).toBe('04:15');

    const late = buildDailyPlan(baseInput({ trainingStart: '12:00' }));
    const latePost = late.meals.find((m) => m.id === 'post')!.time;
    // Clamp a 10:00 => Post 11:15.
    expect(latePost).toBe('11:15');
  });

  it('meals ordenadas por hora ascendente', () => {
    const plan = buildDailyPlan(baseInput());
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    for (let i = 1; i < plan.meals.length; i++) {
      expect(toMin(plan.meals[i].time)).toBeGreaterThanOrEqual(toMin(plan.meals[i - 1].time));
    }
  });
});
