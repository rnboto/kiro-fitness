import { describe, it, expect } from 'vitest';
import { computePlate } from '../plateSizing';
import type { Plate } from '../mealPlates';
import { getFood, gramsForTargetMacro } from '../foodDb';

const target = { kcal: 500, proteinG: 40, carbsG: 60, fatG: 15 };

function plate(components: Plate['components']): Plate {
  return { id: 't', meal: 'post', name: 'T', description: 'T', portable: false, components };
}

describe('computePlate', () => {
  it('(a) un componente de proteína coincide con gramsForTargetMacro redondeado', () => {
    const r = computePlate(
      plate([{ foodId: 'pollo_pechuga', role: 'proteina', sizing: { by: 'proteinG' } }]),
      target,
    );
    const expected = Math.round(gramsForTargetMacro(getFood('pollo_pechuga')!, 'proteinG', 40)!);
    expect(r.items[0].rawGrams).toBe(expected);
    expect(r.items[0].sizedBy).toBe('proteinG');
  });

  it('(b) un reparto 50/50 suma la proteína objetivo (± redondeo)', () => {
    const r = computePlate(
      plate([
        { foodId: 'skyr', role: 'proteina', sizing: { by: 'proteinG', share: 0.5 } },
        { foodId: 'whey', role: 'proteina', sizing: { by: 'proteinG', share: 0.5 } },
      ]),
      target,
    );
    expect(Math.abs(r.totals.proteinG - 40)).toBeLessThan(1);
    expect(r.items[0].macros.proteinG).toBeGreaterThan(15);
    expect(r.items[1].macros.proteinG).toBeGreaterThan(15);
  });

  it('(c) contribuciones cruzadas: avena (carbos) + whey (proteína) clava la proteína', () => {
    const r = computePlate(
      plate([
        { foodId: 'avena', role: 'carbohidrato', sizing: { by: 'carbsG' } },
        { foodId: 'whey', role: 'proteina', sizing: { by: 'proteinG' } },
      ]),
      target,
    );
    expect(Math.abs(r.totals.proteinG - 40)).toBeLessThanOrEqual(1);
  });

  it('(d) minG / maxG se respetan', () => {
    const min = computePlate(
      plate([{ foodId: 'avena', role: 'carbohidrato', sizing: { by: 'carbsG', minG: 200 } }]),
      target,
    );
    expect(min.items[0].rawGrams).toBe(200);
    const max = computePlate(
      plate([{ foodId: 'avena', role: 'carbohidrato', sizing: { by: 'carbsG', maxG: 20 } }]),
      target,
    );
    expect(max.items[0].rawGrams).toBe(20);
  });

  it('(e) las porciones fijas no se mueven', () => {
    const r = computePlate(
      plate([
        { foodId: 'platano', role: 'fruta-verdura', sizing: { by: 'fixed', grams: 120 } },
        { foodId: 'avena', role: 'carbohidrato', sizing: { by: 'carbsG' } },
      ]),
      target,
    );
    expect(r.items[0].rawGrams).toBe(120);
    expect(r.items[0].sizedBy).toBeNull();
  });

  it('(f) objetivos a cero, negativos o NaN dan gramos enteros, finitos y >= 0', () => {
    const comps: Plate['components'] = [
      { foodId: 'skyr', role: 'proteina', sizing: { by: 'proteinG' } },
      { foodId: 'avena', role: 'carbohidrato', sizing: { by: 'carbsG', minG: 10 } },
      { foodId: 'aceite_oliva', role: 'grasa', sizing: { by: 'fatG' } },
      { foodId: 'platano', role: 'fruta-verdura', sizing: { by: 'fixed', grams: 120 } },
    ];
    const targets = [
      { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      { kcal: -5, proteinG: -1, carbsG: -2, fatG: -3 },
      { kcal: NaN, proteinG: NaN, carbsG: Infinity, fatG: NaN },
    ];
    for (const t of targets) {
      const r = computePlate(plate(comps), t);
      for (const it of r.items) {
        expect(Number.isInteger(it.rawGrams)).toBe(true);
        expect(it.rawGrams).toBeGreaterThanOrEqual(0);
      }
      for (const v of Object.values(r.totals)) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('(g) un alimento que no aporta el macro dimensionado da 0 g (sin Infinity)', () => {
    const r = computePlate(
      plate([{ foodId: 'aceite_oliva', role: 'proteina', sizing: { by: 'proteinG' } }]),
      target,
    );
    expect(r.items[0].rawGrams).toBe(0);
    expect(Number.isFinite(r.totals.kcal)).toBe(true);
  });

  it('(h) cookedGrams = round(crudo × factor) y no altera los macros', () => {
    const r = computePlate(
      plate([
        { foodId: 'arroz_blanco', role: 'carbohidrato', sizing: { by: 'carbsG' } },
        { foodId: 'yogur_griego_0', role: 'proteina', sizing: { by: 'fixed', grams: 125 } },
      ]),
      target,
    );
    const rice = r.items[0];
    expect(rice.cookedGrams).toBe(Math.round(rice.rawGrams * 2.5));
    expect(r.items[1].cookedGrams).toBeNull();
    const food = getFood('arroz_blanco')!;
    expect(rice.macros.carbsG).toBeCloseTo((food.per100g.carbsG * rice.rawGrams) / 100, 10);
  });

  it('(i) un foodId desconocido lanza error', () => {
    expect(() =>
      computePlate(
        plate([{ foodId: 'no_existe', role: 'extra', sizing: { by: 'fixed', grams: 10 } }]),
        target,
      ),
    ).toThrow();
  });
});
