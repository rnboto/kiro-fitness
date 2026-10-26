import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MealCard from '../MealCard';
import { buildDailyPlan, type MealPlan } from '../../../domain/nutrition';
import { platesForMeal } from '../../../domain/mealPlates';

afterEach(() => cleanup());

const plan = buildDailyPlan({
  weightKg: 80,
  bodyFatPct: 15,
  mmeKg: 40,
  activityFactor: 1.375,
  proteinGPerKg: 2,
  bmrBasis: 'lbm',
  trainingStart: '07:00',
});
const meal = (id: MealPlan['id']): MealPlan => plan.meals.find((m) => m.id === id)!;

function setup(id: MealPlan['id'], selectedPlateId?: string) {
  const onSelectPlate = vi.fn();
  const onClearPlate = vi.fn();
  const onSwap = vi.fn();
  const element = (selected?: string) => (
    <MealCard
      meal={meal(id)}
      selectedPlateId={selected}
      onSelectPlate={onSelectPlate}
      onClearPlate={onClearPlate}
      onSwap={onSwap}
    />
  );
  const view = render(element(selectedPlateId));
  const rerender = (selected?: string) => view.rerender(element(selected));
  return { onSelectPlate, onClearPlate, onSwap, rerender };
}

const chips = () => within(screen.getByRole('group', { name: 'Ideas de comida' })).getAllByRole('button');
const plateChips = () => chips().filter((b) => b.textContent !== 'Solo para llevar');

describe('MealCard · Ideas de comida', () => {
  it('Post-entreno se rotula como Desayuno solo en la UI; Pre-entreno no', () => {
    expect(meal('post').name).toBe('Post-entreno');
    setup('post');
    expect(screen.getByRole('heading', { level: 3 }).textContent).toMatch(/Post-entreno · Desayuno/);
    cleanup();
    setup('pre');
    expect(screen.getByRole('heading', { level: 3 }).textContent).not.toMatch(/Desayuno/);
  });

  it('lista todos los platos de la comida y muestra el primero (portátil) por defecto', () => {
    setup('post');
    const post = platesForMeal('post');
    expect(post.length).toBeGreaterThanOrEqual(8);
    expect(plateChips()).toHaveLength(post.length);
    expect(screen.getByRole('heading', { level: 4, name: post[0].name })).toBeTruthy();
    expect(screen.getByText('Para llevar al trabajo')).toBeTruthy();
  });

  it('pulsar otro plato avisa con su id', async () => {
    const user = userEvent.setup();
    const { onSelectPlate } = setup('post');
    const post = platesForMeal('post');
    await user.click(plateChips()[1]);
    expect(onSelectPlate).toHaveBeenCalledWith(post[1].id);
  });

  it('«Solo para llevar» empieza apagado, filtra portátiles y no cambia la selección', async () => {
    const user = userEvent.setup();
    const { onSelectPlate } = setup('post');
    const toggle = screen.getByRole('button', { name: 'Solo para llevar' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    const remaining = plateChips();
    expect(remaining.length).toBe(platesForMeal('post').filter((p) => p.portable).length);
    for (const chip of remaining) expect(chip.textContent).toMatch(/Portátil/);
    expect(onSelectPlate).not.toHaveBeenCalled();
  });

  it('almuerzo (1 plato portátil) también ofrece el filtro', async () => {
    const user = userEvent.setup();
    setup('almuerzo');
    await user.click(screen.getByRole('button', { name: 'Solo para llevar' }));
    expect(plateChips()).toHaveLength(platesForMeal('almuerzo').filter((p) => p.portable).length);
    expect(plateChips()).toHaveLength(1);
  });

  it('tocar un alimento dimensionado abre el intercambio con gramos enteros', async () => {
    const user = userEvent.setup();
    const { onSwap } = setup('almuerzo', platesForMeal('almuerzo')[0].id);
    const detail = screen.getByRole('heading', { level: 4, name: platesForMeal('almuerzo')[0].name })
      .parentElement!.parentElement!;
    const rows = within(detail).getAllByRole('button');
    await user.click(rows[0]);
    expect(onSwap).toHaveBeenCalledTimes(1);
    const [food, grams, macro] = onSwap.mock.calls[0];
    expect(food.id).toBe('pollo_pechuga');
    expect(macro).toBe('proteinG');
    expect(Number.isInteger(grams)).toBe(true);
  });

  it('muestra totales del plato, objetivo y la nota de cantidades en crudo', () => {
    setup('pre');
    expect(screen.getByText(/Este plato:/)).toBeTruthy();
    expect(screen.getByText(/Objetivo:/)).toBeTruthy();
    expect(screen.getByText(/Cantidades en crudo/)).toBeTruthy();
  });

  it('un id guardado de otra comida cae al primer plato', () => {
    setup('almuerzo', platesForMeal('cena')[2].id);
    expect(
      screen.getByRole('heading', { level: 4, name: platesForMeal('almuerzo')[0].name }),
    ).toBeTruthy();
  });

  it('conserva el cálculo básico por macros', () => {
    setup('almuerzo');
    expect(screen.getByText('Cálculo básico por macros')).toBeTruthy();
    expect(screen.getAllByText('Pollo (pechuga)').length).toBeGreaterThan(0);
  });
});

describe('MealCard · plato elegido', () => {
  const post = platesForMeal('post');
  const chipOf = (name: string) => plateChips().find((b) => b.textContent?.startsWith(name))!;

  it('por defecto el plato mostrado es «Sugerido»: sin «Elegido» ni «Volver al sugerido»', () => {
    setup('post');
    expect(chipOf(post[0].name).textContent).toMatch(/Sugerido/);
    expect(screen.queryByText('Elegido')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Volver al sugerido' })).toBeNull();
  });

  it('con un plato elegido: marca «Elegido», la tarjeta lo muestra con sus gramos', () => {
    const chosen = post[3];
    setup('post', chosen.id);
    const chip = chipOf(chosen.name);
    expect(chip.textContent).toMatch(/Elegido/);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(chipOf(post[0].name).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('heading', { level: 4, name: chosen.name })).toBeTruthy();
    expect(screen.getAllByText(/g crudo/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Este plato:/)).toBeTruthy();
    expect(screen.getByText(/Objetivo:/)).toBeTruthy();
    expect(screen.queryByText('Sugerido')).toBeNull();
  });

  it('al volver a montar con el mismo id sigue «Elegido»', () => {
    const chosen = post[2];
    setup('post', chosen.id);
    cleanup();
    setup('post', chosen.id);
    expect(chipOf(chosen.name).textContent).toMatch(/Elegido/);
    expect(screen.getByRole('heading', { level: 4, name: chosen.name })).toBeTruthy();
  });

  it('reacciona a un cambio de la elección recibida', () => {
    const { rerender } = setup('post');
    rerender(post[4].id);
    expect(screen.getByRole('heading', { level: 4, name: post[4].name })).toBeTruthy();
    rerender(undefined);
    expect(screen.getByRole('heading', { level: 4, name: post[0].name })).toBeTruthy();
  });

  it('«Solo para llevar» no borra la elección: un plato no portátil elegido sigue en la tarjeta', async () => {
    const user = userEvent.setup();
    const nonPortable = post.find((p) => !p.portable)!;
    const { onSelectPlate, onClearPlate } = setup('post', nonPortable.id);
    await user.click(screen.getByRole('button', { name: 'Solo para llevar' }));
    expect(screen.getByRole('heading', { level: 4, name: nonPortable.name })).toBeTruthy();
    expect(plateChips().some((b) => b.textContent?.startsWith(nonPortable.name))).toBe(false);
    expect(screen.getByText(/no es para llevar; sigue elegida/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Volver al sugerido' })).toBeTruthy();
    expect(onSelectPlate).not.toHaveBeenCalled();
    expect(onClearPlate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Solo para llevar' }));
    expect(screen.queryByText(/sigue elegida/)).toBeNull();
    expect(chipOf(nonPortable.name).textContent).toMatch(/Elegido/);
  });

  it('«Volver al sugerido» avisa una sola vez', async () => {
    const user = userEvent.setup();
    const { onClearPlate } = setup('post', post[3].id);
    await user.click(screen.getByRole('button', { name: 'Volver al sugerido' }));
    expect(onClearPlate).toHaveBeenCalledTimes(1);
  });

  it('un id de otra comida cae al sugerido y no ofrece «Volver al sugerido»', () => {
    setup('almuerzo', platesForMeal('cena')[2].id);
    expect(screen.queryByRole('button', { name: 'Volver al sugerido' })).toBeNull();
    expect(screen.queryByText('Elegido')).toBeNull();
  });

  it('la tarjeta tiene id de ancla y nombre accesible', () => {
    setup('cena');
    const article = screen.getByRole('article', { name: /Cena/ });
    expect(article.id).toBe('comida-cena');
  });
});
