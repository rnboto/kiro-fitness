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
  const onSwap = vi.fn();
  render(
    <MealCard
      meal={meal(id)}
      selectedPlateId={selectedPlateId}
      onSelectPlate={onSelectPlate}
      onSwap={onSwap}
    />,
  );
  return { onSelectPlate, onSwap };
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
