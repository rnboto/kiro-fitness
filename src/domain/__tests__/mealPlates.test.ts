import { describe, it, expect } from 'vitest';
import { buildDailyPlan, type NutritionInput } from '../nutrition';
import { FOODS, getFood } from '../foodDb';
import { PLATES, platesForMeal, resolvePlate, type MealId } from '../mealPlates';
import { computePlate, plateDeviation } from '../plateSizing';

const MEALS: MealId[] = ['pre', 'post', 'almuerzo', 'cena'];

function input(overrides: Partial<NutritionInput> = {}): NutritionInput {
  return {
    weightKg: 80,
    bodyFatPct: 15,
    mmeKg: 40,
    activityFactor: 1.375,
    proteinGPerKg: 2,
    bmrBasis: 'lbm',
    trainingStart: '07:00',
    ...overrides,
  };
}

const samplePlan = buildDailyPlan(input());
const targetOf = (m: MealId) => samplePlan.meals.find((x) => x.id === m)!.macros;

describe('catálogo de platos', () => {
  it('ids únicos y solo alimentos existentes', () => {
    expect(new Set(PLATES.map((p) => p.id)).size).toBe(PLATES.length);
    const foodIds = new Set(FOODS.map((f) => f.id));
    for (const p of PLATES) {
      for (const c of p.components) expect(foodIds.has(c.foodId), `${p.id}: ${c.foodId}`).toBe(true);
    }
  });

  it('mínimos por comida', () => {
    expect(platesForMeal('pre').length).toBeGreaterThanOrEqual(5);
    expect(platesForMeal('post').length).toBeGreaterThanOrEqual(8);
    expect(platesForMeal('almuerzo').length).toBeGreaterThanOrEqual(8);
    expect(platesForMeal('cena').length).toBeGreaterThanOrEqual(8);
  });

  it('cada plato tiene un componente dimensionado por proteína con alimentos suficientemente densos', () => {
    for (const p of PLATES) {
      expect(p.components.some((c) => c.sizing.by === 'proteinG'), p.id).toBe(true);
      for (const c of p.components) {
        const f = getFood(c.foodId)!;
        if (c.sizing.by === 'proteinG') expect(f.per100g.proteinG, p.id).toBeGreaterThanOrEqual(8);
        if (c.sizing.by === 'carbsG') expect(f.per100g.carbsG, p.id).toBeGreaterThanOrEqual(15);
        if (c.sizing.by === 'fatG') expect(f.per100g.fatG, p.id).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('Post-entreno (desayuno): >= 5 platos portables y el primero es portable', () => {
    const post = platesForMeal('post');
    expect(post.filter((p) => p.portable).length).toBeGreaterThanOrEqual(5);
    expect(post[0].portable).toBe(true);
  });

  it('todo plato portable solo usa alimentos portableOk', () => {
    for (const p of PLATES.filter((x) => x.portable)) {
      for (const c of p.components) {
        expect(getFood(c.foodId)!.portableOk, `${p.id}: ${c.foodId}`).toBe(true);
      }
    }
  });

  it('Pre-entreno: todos los platos son portables', () => {
    for (const p of platesForMeal('pre')) expect(p.portable, p.id).toBe(true);
  });
});

describe('resolvePlate', () => {
  it('sin id, id desconocido o de otra comida → primer plato de la comida', () => {
    const first = platesForMeal('post')[0];
    expect(resolvePlate('post').id).toBe(first.id);
    expect(resolvePlate('post', 'no_existe').id).toBe(first.id);
    expect(resolvePlate('post', platesForMeal('cena')[0].id).id).toBe(first.id);
  });

  it('devuelve el seleccionado si pertenece a la comida', () => {
    const second = platesForMeal('almuerzo')[1];
    expect(resolvePlate('almuerzo', second.id).id).toBe(second.id);
  });
});

describe('gramos de cada plato — perfil de muestra 80 kg / 15 %', () => {
  it('todos los platos caen dentro de la tolerancia con gramos enteros', () => {
    for (const p of PLATES) {
      const r = computePlate(p, targetOf(p.meal));
      for (const it of r.items) {
        expect(Number.isInteger(it.rawGrams), `${p.id}:${it.food.id}`).toBe(true);
        expect(it.rawGrams).toBeGreaterThanOrEqual(0);
        expect(it.rawGrams).toBeLessThanOrEqual(800);
      }
      for (const v of Object.values(r.totals)) expect(Number.isFinite(v)).toBe(true);
      const d = plateDeviation(r);
      expect(d.ok, `${p.id} kcal ${(d.kcalPct * 100).toFixed(1)}% P ${d.proteinG.toFixed(1)} C ${d.carbsG.toFixed(1)} F ${d.fatG.toFixed(1)}`).toBe(true);
    }
  });

  it('cada plato muestra al menos un alimento con gramos > 0', () => {
    for (const p of PLATES) {
      const r = computePlate(p, targetOf(p.meal));
      expect(r.items.filter((i) => i.rawGrams > 0).length, p.id).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('robustez con otros perfiles', () => {
  const profiles: NutritionInput[] = [
    input({ weightKg: 55, bodyFatPct: 30, mmeKg: 22 }),
    input({ weightKg: 100, bodyFatPct: 20, mmeKg: 45 }),
    input({ weightKg: 50, bodyFatPct: 40, mmeKg: 18, activityFactor: 1.2 }),
  ];
  it('gramos finitos, enteros y no negativos para todos los platos', () => {
    for (const prof of profiles) {
      const plan = buildDailyPlan(prof);
      for (const p of PLATES) {
        const meal = plan.meals.find((m) => m.id === p.meal)!;
        const r = computePlate(p, meal.macros);
        for (const it of r.items) {
          expect(Number.isFinite(it.rawGrams)).toBe(true);
          expect(Number.isInteger(it.rawGrams)).toBe(true);
          expect(it.rawGrams).toBeGreaterThanOrEqual(0);
        }
        for (const v of Object.values(r.totals)) expect(Number.isFinite(v)).toBe(true);
      }
    }
  });
});

describe('la matemática de nutrición no cambia (perfil 80 kg / 15 %)', () => {
  it('LBM 68, BMR 1838.8, TDEE ~2528.35, objetivo ~2022.68, proteína >= 32 por comida', () => {
    expect(samplePlan.lbmKg).toBeCloseTo(68, 10);
    expect(samplePlan.bmr).toBeCloseTo(1838.8, 10);
    expect(samplePlan.tdee).toBeCloseTo(2528.35, 6);
    expect(samplePlan.targetKcal).toBeCloseTo(2022.68, 6);
    expect(samplePlan.meals.map((m) => m.id).sort()).toEqual([...MEALS].sort());
    for (const m of samplePlan.meals) expect(m.macros.proteinG).toBeGreaterThanOrEqual(32);
  });
});
