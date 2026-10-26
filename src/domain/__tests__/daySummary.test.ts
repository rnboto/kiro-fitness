import { describe, expect, it } from 'vitest';
import { buildDailyPlan, type DailyPlan, type NutritionInput } from '../nutrition';
import { platesForMeal } from '../mealPlates';
import { computePlate } from '../plateSizing';
import { buildDaySummary, formatSignedDiff, DAY_SUMMARY_TOLERANCE } from '../daySummary';

const input: NutritionInput = {
  weightKg: 80,
  bodyFatPct: 15,
  mmeKg: 38,
  activityFactor: 1.375,
  proteinGPerKg: 2,
  bmrBasis: 'lbm',
  trainingStart: '07:00',
};
const plan = buildDailyPlan(input);
const KEYS = ['kcal', 'proteinG', 'carbsG', 'fatG'] as const;

describe('plan de 80 kg / 15 % (la matemática no cambia)', () => {
  it('conserva LBM, BMR, TDEE, objetivo y proteína mínima por comida', () => {
    expect(plan.lbmKg).toBeCloseTo(68, 5);
    expect(plan.bmr).toBeCloseTo(1838.8, 1);
    expect(plan.tdee).toBeCloseTo(2528.35, 1);
    expect(plan.targetKcal).toBeCloseTo(2022.68, 1);
    expect(plan.meals).toHaveLength(4);
    for (const m of plan.meals) expect(m.macros.proteinG).toBeGreaterThanOrEqual(32);
  });
});

describe('buildDaySummary', () => {
  it('con platos por defecto: 4 filas en orden, sumas y diferencias coherentes', () => {
    const s = buildDaySummary(plan, {});
    expect(s.rows.map((r) => r.mealId)).toEqual(['pre', 'post', 'almuerzo', 'cena']);
    expect(s.rows.map((r) => r.time)).toEqual(plan.meals.map((m) => m.time));
    for (const r of s.rows) {
      expect(r.plate.id).toBe(platesForMeal(r.mealId)[0].id);
      expect(r.isChosen).toBe(false);
    }
    expect(s.target.kcal).toBeCloseTo(2022.68, 1);
    expect(s.target.proteinG).toBeCloseTo(plan.totals.proteinG, 6);
    for (const k of KEYS) {
      const sum = plan.meals.reduce(
        (acc, m) => acc + computePlate(platesForMeal(m.id)[0], m.macros).totals[k],
        0,
      );
      expect(s.total[k]).toBeCloseTo(sum, 6);
      expect(s.diff[k]).toBeCloseTo(s.total[k] - s.target[k], 6);
      const expected =
        s.target[k] > 0
          ? Math.abs(s.diff[k]) / s.target[k] <= DAY_SUMMARY_TOLERANCE
          : Math.abs(s.diff[k]) < 0.5;
      expect(s.status[k]).toBe(expected ? 'ok' : 'off');
    }
  });

  it('con una elección distinta cambia solo esa fila y el total', () => {
    const base = buildDaySummary(plan, {});
    const chosen = platesForMeal('almuerzo')[3];
    const s = buildDaySummary(plan, { almuerzo: chosen.id });
    const idx = s.rows.findIndex((r) => r.mealId === 'almuerzo');
    expect(s.rows[idx].plate.id).toBe(chosen.id);
    expect(s.rows[idx].isChosen).toBe(true);
    s.rows.forEach((r, i) => {
      if (i === idx) return;
      expect(r.plate.id).toBe(base.rows[i].plate.id);
      expect(r.isChosen).toBe(false);
      expect(r.totals).toEqual(base.rows[i].totals);
    });
    const meal = plan.meals[idx];
    const expected = computePlate(chosen, meal.macros).totals;
    expect(s.rows[idx].totals).toEqual(expected);
    for (const k of KEYS) {
      const sum = s.rows.reduce((acc, r) => acc + r.totals[k], 0);
      expect(s.total[k]).toBeCloseTo(sum, 6);
    }
    expect(KEYS.some((k) => Math.abs(s.total[k] - base.total[k]) > 1e-9)).toBe(true);
  });

  it('un id guardado inválido cae al plato por defecto', () => {
    const base = buildDaySummary(plan, {});
    const s = buildDaySummary(plan, { post: 'no_existe', cena: platesForMeal('pre')[0].id });
    expect(s.rows.map((r) => r.plate.id)).toEqual(base.rows.map((r) => r.plate.id));
    expect(s.rows.every((r) => !r.isChosen)).toBe(true);
    expect(s.total).toEqual(base.total);
  });

  it('objetivo 0 y total 0 → estado «ok»', () => {
    const zero: DailyPlan = {
      ...plan,
      targetKcal: 0,
      totals: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      meals: plan.meals.map((m) => ({ ...m, macros: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 } })),
    };
    // Catálogo ficticio: un plato vacío por comida (totales 0).
    const empty = (['pre', 'post', 'almuerzo', 'cena'] as const).map((meal) => ({
      id: `vacio_${meal}`,
      meal,
      name: 'Vacío',
      description: '',
      portable: false,
      components: [],
    }));
    const s = buildDaySummary(zero, {}, empty);
    for (const k of KEYS) {
      expect(s.total[k]).toBe(0);
      expect(s.status[k]).toBe('ok');
    }
  });
});

describe('formatSignedDiff', () => {
  it('redondea, pone signo ASCII y normaliza -0', () => {
    expect(formatSignedDiff(-34.6, 'kcal')).toBe('-35 kcal');
    expect(formatSignedDiff(4.2, 'g')).toBe('+4 g');
    expect(formatSignedDiff(-0.3, 'g')).toBe('0 g');
    expect(formatSignedDiff(0, 'kcal')).toBe('0 kcal');
  });
});
