import { describe, it, expect } from 'vitest';
import {
  FOODS,
  gramsForTargetMacro,
  swapEquivalents,
  toCookedGrams,
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

describe('coherencia de tabla (18 filas)', () => {
  it('cada per100g.kcal cuadra con 4P + 4C + 9F (±5 kcal)', () => {
    expect(FOODS).toHaveLength(18);
    for (const f of FOODS) {
      const derived = 4 * f.per100g.proteinG + 4 * f.per100g.carbsG + 9 * f.per100g.fatG;
      expect(Math.abs(derived - f.per100g.kcal)).toBeLessThanOrEqual(5);
    }
  });
});
