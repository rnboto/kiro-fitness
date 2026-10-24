import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import FoodSwapModal from '../FoodSwapModal';
import { FOODS, getFood } from '../../../domain/foodDb';

afterEach(() => cleanup());

describe('FoodSwapModal', () => {
  it('lista primero los alimentos de la comida y omite cantidades absurdas', () => {
    render(
      <FoodSwapModal
        open
        food={getFood('arroz_blanco')!}
        grams={70}
        macro="carbsG"
        mealId="pre"
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog');
    const items = within(dialog).getAllByRole('listitem');
    expect(items.length).toBeGreaterThan(0);

    const names = items.map((li) => li.querySelector('span')!.textContent!);
    const tagged = names.map((n) => FOODS.find((f) => f.name === n)!.mealTags!.includes('pre'));
    // Una vez aparece el primer no etiquetado, ya no vuelve a haber etiquetados.
    const firstUntagged = tagged.indexOf(false);
    expect(tagged.slice(0, firstUntagged === -1 ? tagged.length : firstUntagged).every(Boolean)).toBe(true);
    if (firstUntagged !== -1) expect(tagged.slice(firstUntagged).some(Boolean)).toBe(false);
    expect(firstUntagged).toBeGreaterThan(0);

    // Nada por encima de 800 g crudos.
    for (const li of items) {
      const m = li.textContent!.match(/(\d+) g crudo/);
      expect(Number(m![1])).toBeLessThanOrEqual(800);
    }
  });

  it('sin mealId sigue listando alternativas de la categoría', () => {
    render(
      <FoodSwapModal
        open
        food={getFood('pollo_pechuga')!}
        grams={130}
        macro="proteinG"
        onClose={vi.fn()}
      />,
    );
    expect(within(screen.getByRole('dialog')).getAllByRole('listitem').length).toBeGreaterThan(0);
  });
});
