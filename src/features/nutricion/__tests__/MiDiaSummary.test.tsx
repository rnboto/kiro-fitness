import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MiDiaSummary from '../MiDiaSummary';
import { buildDailyPlan } from '../../../domain/nutrition';
import { platesForMeal } from '../../../domain/mealPlates';
import { buildDaySummary, formatSignedDiff } from '../../../domain/daySummary';
import type { SelectedPlates } from '../../../domain/plateSelection';

afterEach(() => cleanup());

const plan = buildDailyPlan({
  weightKg: 80,
  bodyFatPct: 15,
  mmeKg: 38,
  activityFactor: 1.375,
  proteinGPerKg: 2,
  bmrBasis: 'lbm',
  trainingStart: '07:00',
});

function setup(selected: SelectedPlates = {}) {
  const summary = buildDaySummary(plan, selected);
  const onSelectMeal = vi.fn();
  render(<MiDiaSummary summary={summary} onSelectMeal={onSelectMeal} />);
  return { summary, onSelectMeal };
}

const rowIds = ['pre', 'post', 'almuerzo', 'cena'] as const;
const roundLine = (m: { kcal: number; proteinG: number; carbsG: number; fatG: number }) =>
  `${Math.round(m.kcal)} kcal · P ${Math.round(m.proteinG)} g · C ${Math.round(
    m.carbsG,
  )} g · G ${Math.round(m.fatG)} g`;

describe('MiDiaSummary', () => {
  it('muestra 4 filas en orden horario con hora y plato sugerido', () => {
    const { summary } = setup();
    const region = screen.getByRole('region', { name: 'Mi día' });
    const rows = rowIds.map((id) => screen.getByTestId(`mi-dia-fila-${id}`));
    rows.forEach((row, i) => {
      expect(row.textContent).toContain(plan.meals[i].time);
      expect(row.textContent).toContain(summary.rows[i].plate.name);
      expect(row.textContent).toContain(roundLine(summary.rows[i].totals));
      expect(within(row).getByText('Sugerido')).toBeTruthy();
    });
    expect(within(region).getAllByText('Sugerido')).toHaveLength(4);
    // orden en el DOM
    const order = within(region)
      .getAllByRole('button')
      .map((b) => b.getAttribute('data-testid'));
    expect(order).toEqual(rowIds.map((id) => `mi-dia-fila-${id}`));
  });

  it('con un plato elegido cambia solo esa fila y el total', () => {
    const chosen = platesForMeal('almuerzo')[3];
    const { summary } = setup({ almuerzo: chosen.id });
    const row = screen.getByTestId('mi-dia-fila-almuerzo');
    expect(row.textContent).toContain(chosen.name);
    expect(within(row).queryByText('Sugerido')).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Mi día' })).getAllByText('Sugerido')).toHaveLength(3);
    expect(screen.getByTestId('mi-dia-total').textContent).toContain(roundLine(summary.total));
  });

  it('total, objetivo y diferencias coinciden con el resumen; el color es solo una pista', () => {
    const { summary } = setup();
    expect(screen.getByTestId('mi-dia-objetivo').textContent).toContain(roundLine(summary.target));
    const units = { kcal: 'kcal', proteinG: 'g', carbsG: 'g', fatG: 'g' } as const;
    for (const key of ['kcal', 'proteinG', 'carbsG', 'fatG'] as const) {
      const el = screen.getByTestId(`mi-dia-diff-${key}`);
      expect(el.textContent).toBe(formatSignedDiff(summary.diff[key], units[key]));
      expect(el.getAttribute('data-status')).toBe(summary.status[key]);
    }
  });

  it('incluye la nota de desviación', () => {
    setup();
    expect(
      screen.getByText(
        'Los platos se ajustan a cada comida con una desviación de hasta ~14 %; el total del día puede diferir un poco del objetivo.',
      ),
    ).toBeTruthy();
  });

  it('pulsar una fila avisa con el id de la comida', async () => {
    const user = userEvent.setup();
    const { onSelectMeal } = setup();
    await user.click(screen.getByTestId('mi-dia-fila-cena'));
    expect(onSelectMeal).toHaveBeenCalledWith('cena');
  });
});
