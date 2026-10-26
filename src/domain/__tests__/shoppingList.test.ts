import { describe, expect, it } from 'vitest';
import {
  CASA_OVERRIDES,
  SHOPPING_EXCLUDED,
  SHOPPING_ITEMS,
  SHOPPING_ITEM_KEYS,
  SHOPPING_SECTION_ORDER,
  WORK_DAYS,
  checkedCountIn,
  formatOfficeAmount,
  formatResetDate,
  officeQuantities,
  readShoppingChecked,
  readShoppingLastReset,
  sanitizeShoppingKeys,
  shoppingSections,
  todayKey,
  withShoppingReset,
  withShoppingToggled,
} from '../shoppingList';
import { getFood } from '../foodDb';
import { PLATES, platesForMeal } from '../mealPlates';
import { buildDailyPlan, type DailyPlan } from '../nutrition';
import { computePlate } from '../plateSizing';
import { DEFAULT_SETTINGS } from '../../storage/types';

// Perfiles de ejemplo SOLO para los tests (nada de esto se publica en la app).
function planFor(weightKg: number, bodyFatPct: number, mmeKg: number): DailyPlan {
  return buildDailyPlan({
    weightKg,
    bodyFatPct,
    mmeKg,
    activityFactor: DEFAULT_SETTINGS.activityFactor,
    proteinGPerKg: DEFAULT_SETTINGS.proteinGPerKg,
    bmrBasis: DEFAULT_SETTINGS.bmrBasis,
    trainingStart: DEFAULT_SETTINGS.trainingStart,
  });
}
const PLAN_A = planFor(80, 15, 38);
const PLAN_B = planFor(62, 28, 24);

const officeItems = SHOPPING_ITEMS.filter((i) => i.location.place === 'oficina');
const casaItems = SHOPPING_ITEMS.filter((i) => i.location.place === 'casa');

const allPlateFoods = new Set(PLATES.flatMap((p) => p.components.map((c) => c.foodId)));
const portableOfficeFoods = new Set(
  PLATES.filter((p) => p.portable && (p.meal === 'pre' || p.meal === 'post')).flatMap((p) =>
    p.components.map((c) => c.foodId),
  ),
);

describe('catálogo de la lista de la compra · integridad', () => {
  it('cada clave aparece exactamente una vez', () => {
    const keys = SHOPPING_ITEMS.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(SHOPPING_ITEM_KEYS.size).toBe(keys.length);
  });

  it('un alimento (foodId) no se repite aunque cambie la clave', () => {
    const foodIds = SHOPPING_ITEMS.flatMap((i) => (i.foodId ? [i.foodId] : []));
    expect(new Set(foodIds).size).toBe(foodIds.length);
  });

  it('los productos de alimento usan como clave un id real de foodDb', () => {
    for (const i of SHOPPING_ITEMS.filter((x) => x.foodId)) {
      expect(i.key).toBe(i.foodId);
      expect(getFood(i.foodId!), i.key).toBeDefined();
    }
  });

  it('los extras de despensa usan «pantry:» y no tienen foodId', () => {
    const pantry = SHOPPING_ITEMS.filter((i) => !i.foodId);
    expect(pantry.map((i) => i.key).sort()).toEqual(
      ['pantry:cafe_te', 'pantry:edulcorante', 'pantry:especias', 'pantry:sal', 'pantry:vinagre'].sort(),
    );
    for (const i of pantry) {
      expect(i.location).toEqual({ place: 'casa', aisle: 'despensa' });
    }
  });

  it('todo alimento usado por algún plato está catalogado o figura en SHOPPING_EXCLUDED', () => {
    for (const foodId of allPlateFoods) {
      const catalogued = SHOPPING_ITEM_KEYS.has(foodId);
      const excluded = foodId in SHOPPING_EXCLUDED;
      expect(catalogued || excluded, foodId).toBe(true);
      // Y no puede estar a la vez en ambos sitios.
      expect(catalogued && excluded, foodId).toBe(false);
    }
  });

  it('cada exclusión es un alimento de plato real y lleva motivo', () => {
    for (const [foodId, reason] of Object.entries(SHOPPING_EXCLUDED)) {
      expect(allPlateFoods.has(foodId), foodId).toBe(true);
      expect(reason.length).toBeGreaterThan(0);
    }
  });

  it('todo alimento catalogado (no despensa) lo usa algún plato', () => {
    for (const i of SHOPPING_ITEMS.filter((x) => x.foodId)) {
      expect(allPlateFoods.has(i.foodId!), i.key).toBe(true);
    }
  });

  it('oficina solo contiene alimentos de platos portables de Pre/Post', () => {
    for (const i of officeItems) {
      expect(portableOfficeFoods.has(i.foodId!), i.key).toBe(true);
    }
  });

  it('los alimentos portables Pre/Post que no van a oficina son exactamente CASA_OVERRIDES (y están en casa)', () => {
    const notOffice = [...portableOfficeFoods].filter(
      (f) => !officeItems.some((i) => i.foodId === f),
    );
    expect(notOffice.sort()).toEqual(Object.keys(CASA_OVERRIDES).sort());
    for (const f of notOffice) {
      expect(casaItems.some((i) => i.key === f), f).toBe(true);
      expect(CASA_OVERRIDES[f].length).toBeGreaterThan(0);
    }
  });

  it('los alimentos que solo salen en Almuerzo/Cena o en desayunos no portables van a casa', () => {
    for (const i of casaItems.filter((x) => x.foodId)) {
      if (i.key in CASA_OVERRIDES) continue;
      expect(portableOfficeFoods.has(i.key), i.key).toBe(false);
    }
  });

  it('cada producto de oficina tiene medida y formato; los count tienen unidad en foodDb', () => {
    for (const i of officeItems) {
      expect(i.measure, i.key).toBeDefined();
      expect((i.format ?? '').length, i.key).toBeGreaterThan(0);
      if (i.measure === 'count') expect(getFood(i.foodId!)?.unit, i.key).toBeDefined();
    }
  });

  it('el texto de formato nunca lleva cifras con unidades de peso/volumen', () => {
    for (const i of officeItems) {
      expect(i.format!, i.key).not.toMatch(/\d+\s*(g|kg|l|ml)\b/i);
    }
  });

  it('nombres y consejos no están vacíos; los productos de casa no llevan medida ni formato', () => {
    for (const i of SHOPPING_ITEMS) {
      expect(i.name.trim().length, i.key).toBeGreaterThan(0);
      expect(i.tip.trim().length, i.key).toBeGreaterThan(0);
    }
    for (const i of casaItems) {
      expect(i.measure).toBeUndefined();
      expect(i.format).toBeUndefined();
    }
  });

  it('shoppingSections respeta el orden definido y cubre todos los productos', () => {
    const sections = shoppingSections();
    expect(sections.map((s) => s.id)).toEqual([...SHOPPING_SECTION_ORDER]);
    expect(sections.flatMap((s) => s.items)).toHaveLength(SHOPPING_ITEMS.length);
    expect(sections[0].title).toBe('a) Sin nevera (aguanta en el cajón)');
    expect(sections.at(-1)?.title).toBe('Despensa / básicos');
  });

  it('recuento por bloque: 29 oficina · 38 casa · 67 en total', () => {
    expect(officeItems).toHaveLength(29);
    expect(casaItems).toHaveLength(38);
    expect(SHOPPING_ITEMS).toHaveLength(67);
    const bySection = Object.fromEntries(shoppingSections().map((s) => [s.id, s.items.length]));
    expect(bySection).toMatchObject({
      oficina_sin_nevera: 19,
      oficina_con_nevera: 9,
      oficina_opcional: 1,
      casa_despensa: 5,
    });
  });
});

describe('formatOfficeAmount · redondeo', () => {
  it('gramos: múltiplos de 5 por debajo de 100, de 10 hasta 1 kg y kg con un decimal', () => {
    expect(formatOfficeAmount(37, 'g')).toBe('≈ 35 g');
    expect(formatOfficeAmount(2, 'g')).toBe('≈ 5 g');
    expect(formatOfficeAmount(123, 'g')).toBe('≈ 120 g');
    expect(formatOfficeAmount(996, 'g')).toBe('≈ 1 kg');
    expect(formatOfficeAmount(1234, 'g')).toBe('≈ 1,2 kg');
    expect(formatOfficeAmount(2000, 'g')).toBe('≈ 2 kg');
  });

  it('unidades: se redondea por exceso, mínimo 1 y singular/plural de foodDb', () => {
    const unit = getFood('platano')!.unit!;
    expect(formatOfficeAmount(600, 'count', unit)).toBe('≈ 5 plátanos');
    expect(formatOfficeAmount(601, 'count', unit)).toBe('≈ 6 plátanos');
    expect(formatOfficeAmount(100, 'count', unit)).toBe('≈ 1 plátano');
  });

  it('litros: múltiplos de 0,25 con coma decimal y mínimo 0,25', () => {
    expect(formatOfficeAmount(1250, 'litros')).toBe('≈ 1,25 L');
    expect(formatOfficeAmount(1000, 'litros')).toBe('≈ 1 L');
    expect(formatOfficeAmount(100, 'litros')).toBe('≈ 0,25 L');
  });
});

describe('officeQuantities', () => {
  const defaultPre = platesForMeal('pre')[0];
  const defaultPost = platesForMeal('post')[0];

  /** Σ gramos crudos de un alimento en los platos dados, dimensionados con `plan`, × 5. */
  function expectedWeekly(plan: DailyPlan, plates: Record<'pre' | 'post', typeof defaultPre>) {
    const sum = new Map<string, number>();
    for (const mealId of ['pre', 'post'] as const) {
      const meal = plan.meals.find((m) => m.id === mealId)!;
      for (const it of computePlate(plates[mealId], meal.macros).items) {
        sum.set(it.food.id, (sum.get(it.food.id) ?? 0) + it.rawGrams);
      }
    }
    return sum;
  }

  for (const [label, plan] of [
    ['perfil A (80 kg / 15 %)', PLAN_A],
    ['perfil B (62 kg / 28 %)', PLAN_B],
  ] as const) {
    it(`${label}: con los platos por defecto calcula exactamente lo de esos platos`, () => {
      const q = officeQuantities(plan, undefined);
      expect(Object.keys(q).sort()).toEqual(officeItems.map((i) => i.key).sort());
      const daily = expectedWeekly(plan, { pre: defaultPre, post: defaultPost });
      for (const item of officeItems) {
        const entry = q[item.key];
        const grams = (daily.get(item.key) ?? 0) * WORK_DAYS;
        if (grams > 0) {
          expect(entry.kind, item.key).toBe('computed');
          expect(entry.text).toBe(
            `${formatOfficeAmount(grams, item.measure!, getFood(item.key)?.unit)} · 5 días`,
          );
        } else {
          expect(entry).toEqual({ kind: 'format', text: item.format });
        }
      }
    });
  }

  it('los productos de casa nunca reciben cantidad', () => {
    const q = officeQuantities(PLAN_A, undefined);
    for (const k of ['tomate', 'pollo_pechuga', 'huevo', 'aguacate', 'pantry:sal']) {
      expect(q[k], k).toBeUndefined();
    }
  });

  it('plátano: cantidad en unidades enteras para 5 días', () => {
    const q = officeQuantities(PLAN_A, undefined);
    expect(q.platano).toMatchObject({ kind: 'computed' });
    expect(q.platano.text).toMatch(/^≈ \d+ plátanos? · 5 días$/);
  });

  it('un perfil distinto da cantidades distintas', () => {
    const a = officeQuantities(PLAN_A, undefined);
    const b = officeQuantities(PLAN_B, undefined);
    const dif = officeItems.filter((i) => a[i.key].text !== b[i.key].text);
    expect(dif.length).toBeGreaterThan(0);
  });

  it('plato elegido distinto: solo cuentan los alimentos de los platos elegidos', () => {
    const q = officeQuantities(PLAN_A, { post: 'post_wrap_huevo_aguacate' });
    const wrap = platesForMeal('post').find((p) => p.id === 'post_wrap_huevo_aguacate')!;
    expect(wrap).toBeDefined();
    for (const k of ['wrap_integral', 'huevo_cocido', 'atun_natural']) {
      expect(q[k].kind, k).toBe('computed');
    }
    // El muesli del plato por defecto deja de calcularse y vuelve a su formato.
    const muesli = officeItems.find((i) => i.key === 'muesli')!;
    expect(q.muesli).toEqual({ kind: 'format', text: muesli.format });
    // El aguacate es de casa: no aparece aunque esté en el plato.
    expect(q.aguacate).toBeUndefined();
  });

  it('plato no portable: calcula pan/mandarina y no inventa huevo, claras ni tomate', () => {
    const q = officeQuantities(PLAN_A, { post: 'post_tortilla_claras_pan_tomate' });
    expect(q.pan_integral.kind).toBe('computed');
    expect(q.mandarina.kind).toBe('computed');
    for (const k of ['huevo', 'clara_huevo', 'tomate']) expect(q[k], k).toBeUndefined();
  });

  it('un id desconocido cae al plato por defecto', () => {
    expect(officeQuantities(PLAN_A, { post: 'no_existe', pre: 'post_otro' })).toEqual(
      officeQuantities(PLAN_A, undefined),
    );
  });

  it('un cambio de plato modifica las cantidades de oficina (se ajustan)', () => {
    const base = officeQuantities(PLAN_A, undefined);
    const changed = officeQuantities(PLAN_A, { pre: 'pre_datiles_cafe' });
    expect(changed.datiles.kind).toBe('computed');
    expect(base.datiles.text).not.toBe(changed.datiles.text);
  });

  it('sin plan (sin perfil) todo muestra solo el formato de compra, sin cifras', () => {
    const q = officeQuantities(null, undefined);
    for (const item of officeItems) {
      expect(q[item.key]).toEqual({ kind: 'format', text: item.format });
    }
  });

  it('regla de no inventar cifras: lo que no es computed no lleva cantidades de peso/volumen ni «≈»', () => {
    for (const plan of [PLAN_A, PLAN_B, null]) {
      for (const sel of [undefined, { post: 'post_wrap_huevo_aguacate' }] as const) {
        const q = officeQuantities(plan, sel);
        for (const entry of Object.values(q)) {
          if (entry.kind === 'format') {
            expect(entry.text).not.toMatch(/\d+\s*(g|kg|l|ml)\b/i);
            expect(entry.text).not.toContain('≈');
            expect(entry.text).not.toContain('días');
          }
        }
      }
    }
  });
});

describe('ajustes: lectura y escritura defensivas', () => {
  it('readShoppingChecked descarta claves desconocidas, valores no true y no-objetos', () => {
    expect(readShoppingChecked(undefined)).toEqual({});
    expect(readShoppingChecked({ shoppingChecked: 'x' })).toEqual({});
    expect(readShoppingChecked({ shoppingChecked: ['platano'] })).toEqual({});
    expect(
      readShoppingChecked({
        shoppingChecked: { platano: true, muesli: 1, inventado: true, 'pantry:sal': true, skyr: false },
      }),
    ).toEqual({ platano: true, 'pantry:sal': true });
  });

  it('withShoppingToggled añade y quita sin mutar; una clave desconocida no cambia nada', () => {
    const empty = {};
    const one = withShoppingToggled(empty, 'platano');
    expect(one).toEqual({ platano: true });
    expect(empty).toEqual({});
    expect(withShoppingToggled(one, 'platano')).toEqual({});
    expect(one).toEqual({ platano: true });
    expect(withShoppingToggled(one, 'inventado')).toEqual({ platano: true });
  });

  it('withShoppingReset vacía las marcas, fija la fecha y no toca el resto', () => {
    const s = { ...DEFAULT_SETTINGS, shoppingChecked: { platano: true as const } };
    const r = withShoppingReset(s, '2026-11-03');
    expect(r.shoppingChecked).toEqual({});
    expect(r.shoppingLastReset).toBe('2026-11-03');
    expect(r.activityFactor).toBe(s.activityFactor);
    expect(s.shoppingChecked).toEqual({ platano: true });
  });

  it('readShoppingLastReset solo acepta fechas reales YYYY-MM-DD', () => {
    expect(readShoppingLastReset({ shoppingLastReset: '2026-11-03' })).toBe('2026-11-03');
    expect(readShoppingLastReset({ shoppingLastReset: '2026-02-30' })).toBeNull();
    expect(readShoppingLastReset({ shoppingLastReset: 'x' })).toBeNull();
    expect(readShoppingLastReset({ shoppingLastReset: 5 })).toBeNull();
    expect(readShoppingLastReset(null)).toBeNull();
  });

  it('todayKey usa la fecha local y formatResetDate escribe la fecha en español', () => {
    expect(todayKey(new Date(2026, 10, 3, 9, 0))).toBe('2026-11-03');
    expect(formatResetDate('2026-11-03')).toBe('3 de noviembre de 2026');
    expect(formatResetDate('2027-01-15')).toBe('15 de enero de 2027');
  });

  it('checkedCountIn cuenta solo los productos dados', () => {
    const sin = SHOPPING_ITEMS.filter((i) => i.key === 'platano' || i.key === 'muesli');
    expect(checkedCountIn(sin, { platano: true, tomate: true })).toBe(1);
  });

  it('sanitizeShoppingKeys solo toca las claves presentes', () => {
    const base = { activityFactor: 1.4 };
    expect(sanitizeShoppingKeys(base)).toEqual(base);
    expect('shoppingChecked' in sanitizeShoppingKeys(base)).toBe(false);
    expect('shoppingLastReset' in sanitizeShoppingKeys(base)).toBe(false);

    const dirty = sanitizeShoppingKeys({
      ...base,
      shoppingChecked: { muesli: true, foo: true, skyr: 1 },
      shoppingLastReset: '2026-13-40',
    });
    expect(dirty.shoppingChecked).toEqual({ muesli: true });
    expect('shoppingLastReset' in dirty).toBe(false);

    const ok = sanitizeShoppingKeys({ ...base, shoppingChecked: 'x', shoppingLastReset: '2026-11-03' });
    expect(ok.shoppingChecked).toEqual({});
    expect(ok.shoppingLastReset).toBe('2026-11-03');
  });
});
