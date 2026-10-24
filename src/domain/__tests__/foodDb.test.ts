import { describe, it, expect } from 'vitest';
import {
  FOODS,
  gramsForTargetMacro,
  swapEquivalents,
  toCookedGrams,
  getFood,
  prioritizeForMeal,
  approxUnits,
  type Food,
} from '../foodDb';

const byId = (id: string): Food => {
  const f = FOODS.find((x) => x.id === id);
  if (!f) throw new Error(`food ${id} no encontrado`);
  return f;
};

describe('gramsForTargetMacro', () => {
  it('devuelve null si per100g[macro] <= 0', () => {
    const aceite = byId('aceite_oliva');
    expect(gramsForTargetMacro(aceite, 'proteinG', 20)).toBeNull();
    expect(gramsForTargetMacro(aceite, 'carbsG', 20)).toBeNull();
  });

  it('calcula gramos crudos para un macro válido', () => {
    const pollo = byId('pollo_pechuga'); // 31 g prot / 100 g
    // Para 31 g de proteína → 100 g.
    expect(gramsForTargetMacro(pollo, 'proteinG', 31)).toBeCloseTo(100, 6);
  });
});

describe('swapEquivalents', () => {
  it('filtra misma category y per100g[macro] > 0, excluye el propio alimento', () => {
    const pollo = byId('pollo_pechuga');
    const equivalentes = swapEquivalents(pollo, 100, 'proteinG', FOODS);
    // Todos de categoría proteína, ninguno el propio pollo, todos aportan proteína.
    for (const { food } of equivalentes) {
      expect(food.category).toBe('proteina');
      expect(food.id).not.toBe('pollo_pechuga');
      expect(food.per100g.proteinG).toBeGreaterThan(0);
    }
    expect(equivalentes.length).toBeGreaterThan(0);
  });

  it('iguala la cantidad del macro objetivo', () => {
    const pollo = byId('pollo_pechuga');
    const targetProt = (100 * pollo.per100g.proteinG) / 100; // 31 g
    const equivalentes = swapEquivalents(pollo, 100, 'proteinG', FOODS);
    for (const { food, grams } of equivalentes) {
      const prot = (grams * food.per100g.proteinG) / 100;
      expect(prot).toBeCloseTo(targetProt, 6);
    }
  });
});

describe('toCookedGrams', () => {
  it('cocido = crudo × cookedFactor', () => {
    const arroz = byId('arroz_blanco'); // factor 2.5
    expect(toCookedGrams(arroz, 70)).toBeCloseTo(175, 6);
  });

  it('sin cookedFactor devuelve los gramos crudos', () => {
    const atun = byId('atun_natural');
    expect(toCookedGrams(atun, 120)).toBe(120);
  });

  it('ida-y-vuelta: los macros derivados de rawGrams no cambian al mostrar cocidos', () => {
    const arroz = byId('arroz_blanco');
    const rawGrams = 70;
    const macrosAntes = (arroz.per100g.carbsG * rawGrams) / 100;
    // Mostrar gramos cocidos no re-alimenta el cálculo.
    toCookedGrams(arroz, rawGrams);
    const macrosDespues = (arroz.per100g.carbsG * rawGrams) / 100;
    expect(macrosDespues).toBe(macrosAntes);
  });
});

const CATEGORIES = ['proteina', 'carbohidrato', 'grasa', 'mixto'];
const MEALS = ['pre', 'post', 'almuerzo', 'cena'];

describe('coherencia de tabla', () => {
  it('hay entre 60 y 80 alimentos con ids únicos', () => {
    expect(FOODS.length).toBeGreaterThanOrEqual(60);
    expect(FOODS.length).toBeLessThanOrEqual(80);
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length);
  });

  it('cada per100g.kcal cuadra con 4P + 4C + 9F (±5 kcal) en TODAS las filas', () => {
    for (const f of FOODS) {
      const derived = 4 * f.per100g.proteinG + 4 * f.per100g.carbsG + 9 * f.per100g.fatG;
      expect(Math.abs(derived - f.per100g.kcal), f.id).toBeLessThanOrEqual(5);
    }
  });

  it('cada alimento tiene mealTags válidos no vacíos y category válida', () => {
    for (const f of FOODS) {
      expect(CATEGORIES, f.id).toContain(f.category);
      expect(f.mealTags?.length ?? 0, f.id).toBeGreaterThan(0);
      for (const tag of f.mealTags ?? []) expect(MEALS, f.id).toContain(tag);
    }
  });

  it('los macros no son negativos y cookedFactor, si existe, es > 0', () => {
    for (const f of FOODS) {
      const { kcal, proteinG, carbsG, fatG } = f.per100g;
      for (const v of [kcal, proteinG, carbsG, fatG]) expect(v, f.id).toBeGreaterThanOrEqual(0);
      if (f.cookedFactor !== undefined) expect(f.cookedFactor, f.id).toBeGreaterThan(0);
    }
  });

  it('cobertura por comida', () => {
    const count = (m: string) => FOODS.filter((f) => f.mealTags?.includes(m as never)).length;
    expect(count('pre')).toBeGreaterThanOrEqual(8);
    expect(count('post')).toBeGreaterThanOrEqual(20);
    expect(count('almuerzo')).toBeGreaterThanOrEqual(25);
    expect(count('cena')).toBeGreaterThanOrEqual(25);
  });

  it('los 18 alimentos originales no cambian (ids y valores)', () => {
    const original: Array<[string, number, number, number, number, number | undefined]> = [
      ['pollo_pechuga', 156, 31, 0, 3.6, 0.7],
      ['ternera_magra', 175, 26, 0, 7.5, 0.75],
      ['salmon', 197, 20, 0, 13, 0.8],
      ['atun_natural', 116, 26, 0, 1, undefined],
      ['huevo', 143, 12.6, 0.7, 9.5, undefined],
      ['clara_huevo', 52, 11, 0.7, 0.2, undefined],
      ['yogur_griego', 97, 9, 4, 5, undefined],
      ['queso_batido', 47, 8, 4, 0.2, undefined],
      ['arroz_blanco', 349, 7, 79, 0.6, 2.5],
      ['avena', 355, 13, 60, 7, 3.0],
      ['patata', 77, 2, 17, 0.1, 0.95],
      ['boniato', 86, 1.6, 20, 0.1, 0.95],
      ['pan_integral', 231, 9, 41, 3.4, undefined],
      ['lentejas', 306, 25, 49, 1.1, 2.4],
      ['platano', 99, 1.1, 23, 0.3, undefined],
      ['aceite_oliva', 900, 0, 0, 100, undefined],
      ['almendras', 622, 21, 22, 50, undefined],
      ['aguacate', 179, 2, 9, 15, undefined],
    ];
    for (const [id, kcal, p, c, fat, cooked] of original) {
      const f = byId(id);
      expect(f.per100g, id).toEqual({ kcal, proteinG: p, carbsG: c, fatG: fat });
      expect(f.cookedFactor, id).toBe(cooked);
    }
  });
});

describe('getFood', () => {
  it('encuentra por id y devuelve undefined si no existe', () => {
    expect(getFood('skyr')?.id).toBe('skyr');
    expect(getFood('no_existe')).toBeUndefined();
  });
});

describe('prioritizeForMeal', () => {
  it('pone primero los etiquetados para la comida y conserva el orden', () => {
    const items = ['tofu', 'granola', 'skyr', 'pollo_pechuga', 'muesli'].map((id) => ({
      food: byId(id),
    }));
    const ids = prioritizeForMeal(items, 'post').map((i) => i.food.id);
    expect(ids).toEqual(['granola', 'skyr', 'muesli', 'tofu', 'pollo_pechuga']);
  });
});

describe('approxUnits', () => {
  it('equivalencia en unidades contables', () => {
    expect(approxUnits(byId('huevo'), 100)).toBe('≈ 2 huevos');
    expect(approxUnits(byId('huevo'), 50)).toBe('≈ 1 huevo');
    expect(approxUnits(byId('huevo'), 75)).toBe('≈ 1,5 huevos');
  });

  it('null sin unidad o por debajo de 0,75 unidades', () => {
    expect(approxUnits(byId('salmon'), 100)).toBeNull();
    expect(approxUnits(byId('huevo'), 30)).toBeNull();
  });
});