import { describe, expect, it } from 'vitest';
import { platesForMeal, type Plate } from '../mealPlates';
import {
  isPlateChosen,
  readSelectedPlates,
  resolveChosenPlate,
  sanitizeSelectedPlatesKey,
  withPlateChoice,
} from '../plateSelection';
import { DEFAULT_SETTINGS } from '../../storage/types';

describe('resolveChosenPlate', () => {
  it('devuelve el plato elegido si es válido', () => {
    const chosen = platesForMeal('almuerzo')[2];
    const plate = resolveChosenPlate('almuerzo', { almuerzo: chosen.id });
    expect(plate.id).toBe(chosen.id);
    expect(isPlateChosen('almuerzo', { almuerzo: chosen.id })).toBe(true);
  });

  it('id desconocido → primer plato de la comida', () => {
    const plate = resolveChosenPlate('post', { post: 'no_existe' });
    expect(plate.id).toBe(platesForMeal('post')[0].id);
    expect(isPlateChosen('post', { post: 'no_existe' })).toBe(false);
  });

  it('id de otra comida → primer plato de la comida', () => {
    const foreign = platesForMeal('cena')[0].id;
    expect(resolveChosenPlate('post', { post: foreign }).id).toBe(platesForMeal('post')[0].id);
    expect(isPlateChosen('post', { post: foreign })).toBe(false);
  });

  it('sin elección (undefined, null, {}) → predeterminado', () => {
    for (const map of [undefined, null, {}]) {
      expect(resolveChosenPlate('cena', map).id).toBe(platesForMeal('cena')[0].id);
      expect(isPlateChosen('cena', map)).toBe(false);
    }
  });

  it('un mapa no válido (cadena, array) se trata como sin elección', () => {
    expect(resolveChosenPlate('pre', 'x' as never).id).toBe(platesForMeal('pre')[0].id);
    expect(resolveChosenPlate('pre', [1] as never).id).toBe(platesForMeal('pre')[0].id);
  });

  it('respeta el catálogo recibido', () => {
    const fake = (id: string): Plate => ({ ...platesForMeal('cena')[0], id, meal: 'cena' });
    const catalogue = [fake('a'), fake('b')];
    expect(resolveChosenPlate('cena', { cena: 'b' }, catalogue).id).toBe('b');
    expect(resolveChosenPlate('cena', { cena: platesForMeal('cena')[1].id }, catalogue).id).toBe('a');
  });
});

describe('withPlateChoice', () => {
  it('pone, reemplaza y quita sin mutar la entrada y conservando las demás claves', () => {
    const input = { post: 'p1', cena: 'c1' };
    const set = withPlateChoice(input, 'almuerzo', 'a1');
    expect(set).toEqual({ post: 'p1', cena: 'c1', almuerzo: 'a1' });
    const replaced = withPlateChoice(set, 'post', 'p2');
    expect(replaced).toEqual({ post: 'p2', cena: 'c1', almuerzo: 'a1' });
    const removed = withPlateChoice(replaced, 'cena', null);
    expect(removed).toEqual({ post: 'p2', almuerzo: 'a1' });
    expect('cena' in removed).toBe(false);
    expect(input).toEqual({ post: 'p1', cena: 'c1' });
  });

  it('acepta undefined/null como mapa de partida', () => {
    expect(withPlateChoice(undefined, 'pre', 'x')).toEqual({ pre: 'x' });
    expect(withPlateChoice(null, 'pre', null)).toEqual({});
  });
});

describe('readSelectedPlates', () => {
  it('sin dato → {}', () => {
    expect(readSelectedPlates(undefined)).toEqual({});
    expect(readSelectedPlates(null)).toEqual({});
    expect(readSelectedPlates(DEFAULT_SETTINGS)).toEqual({});
  });

  it('valores corruptos → solo se conservan las claves válidas', () => {
    expect(readSelectedPlates({ selectedPlates: 'x' } as never)).toEqual({});
    expect(readSelectedPlates({ selectedPlates: [1] } as never)).toEqual({});
    expect(
      readSelectedPlates({ selectedPlates: { post: 5, foo: 'a', cena: '', pre: 'p' } } as never),
    ).toEqual({ pre: 'p' });
  });
});

describe('sanitizeSelectedPlatesKey', () => {
  it('si la clave falta, sigue faltando (objeto idéntico)', () => {
    const raw = { activityFactor: 1.4 };
    expect(sanitizeSelectedPlatesKey(raw)).toEqual(raw);
    expect('selectedPlates' in sanitizeSelectedPlatesKey(raw)).toBe(false);
  });

  it('si viene corrupta, se sanea; si es válida, se conserva', () => {
    expect(sanitizeSelectedPlatesKey({ selectedPlates: 'x' }).selectedPlates).toEqual({});
    expect(sanitizeSelectedPlatesKey({ selectedPlates: { post: 5 } }).selectedPlates).toEqual({});
    expect(
      sanitizeSelectedPlatesKey({ selectedPlates: { post: 'p', cena: 'c' } }).selectedPlates,
    ).toEqual({ post: 'p', cena: 'c' });
  });
});
