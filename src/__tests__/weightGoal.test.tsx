// Integración: tarjeta "Objetivo de peso" (Estadísticas · Cuerpo).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { __resetBackendForTests } from '../storage/db';
import { getSettings } from '../storage';
import { readGoal } from '../domain/goal';

beforeEach(() => {
  localStorage.clear();
  __resetBackendForTests();
});

afterEach(() => {
  cleanup();
});

type User = ReturnType<typeof userEvent.setup>;

async function completeOnboarding(user: User) {
  await screen.findByText(/Bienvenido a tu nuevo estilo de vida/i);
  await user.type(screen.getByLabelText(/Edad/i), '30');
  await user.type(screen.getByLabelText(/Altura/i), '178');
  await user.type(screen.getByLabelText(/Peso total/i), '80');
  await user.type(screen.getByLabelText(/% de grasa/i), '15');
  await user.type(screen.getByLabelText(/Masa muscular esquelética/i), '38');
  await user.click(screen.getByRole('button', { name: /Desbloquear mi plan/i }));
  await screen.findByRole('navigation', { name: /navegación principal/i });
}

async function openCuerpo(user: User) {
  render(<App />);
  await completeOnboarding(user);
  const nav = screen.getByRole('navigation', { name: /navegación principal/i });
  await user.click(within(nav).getByRole('button', { name: /Estadísticas/i }));
  return screen.findByRole('region', { name: /Objetivo de peso/i });
}

describe('Objetivo de peso', () => {
  it('sin objetivo muestra atajos calculados desde el peso actual', async () => {
    const user = userEvent.setup();
    const card = await openCuerpo(user);

    const group = within(card).getByRole('group', { name: /Objetivos rápidos/i });
    const chips = within(group).getAllByRole('button');
    expect(chips.map((c) => c.textContent)).toEqual([
      'Bajar 5 kg→ 75 kg',
      'Bajar 6 kg→ 74 kg',
      'Bajar 7 kg→ 73 kg',
      'Bajar 10 kg→ 70 kg',
    ]);
    expect(within(group).getByRole('button', { name: 'Bajar 6 kg' })).toBeInTheDocument();
  });

  it('elegir un atajo fija el objetivo y muestra progreso 0 % sin inventar ritmo', async () => {
    const user = userEvent.setup();
    const card = await openCuerpo(user);

    await user.click(within(card).getByRole('button', { name: 'Bajar 5 kg' }));

    const bar = await within(card).findByRole('progressbar', { name: /Progreso del objetivo/i });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(within(card).getByText('Inicio')).toBeInTheDocument();
    expect(within(card).getByText('Objetivo')).toBeInTheDocument();
    expect(within(card).getByText('75 kg')).toBeInTheDocument();
    expect(within(card).getAllByText('80 kg').length).toBeGreaterThanOrEqual(2);
    expect(
      within(card).getByText(/Registra al menos dos mediciones con 7 días de diferencia/i),
    ).toBeInTheDocument();

    await waitFor(async () => {
      expect(readGoal(await getSettings())).toEqual({ goalWeightKg: 75, goalStartWeightKg: 80 });
    });
  });

  it('el objetivo manual valida rango, avisa por encima y guarda un valor correcto', async () => {
    const user = userEvent.setup();
    const card = await openCuerpo(user);
    const input = within(card).getByLabelText(/Peso objetivo/i);
    const submit = within(card).getByRole('button', { name: 'Fijar objetivo' });

    await user.type(input, '20');
    await user.click(submit);
    expect(await within(card).findByRole('alert')).toHaveTextContent(/entre 30 y 300/i);
    expect(readGoal(await getSettings()).goalWeightKg).toBeNull();

    await user.clear(input);
    await user.type(input, '85');
    expect(within(card).getByText(/por encima de tu peso actual/i)).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, '78');
    await user.click(submit);

    await within(card).findByRole('progressbar', { name: /Progreso del objetivo/i });
    await waitFor(async () => {
      expect(readGoal(await getSettings())).toEqual({ goalWeightKg: 78, goalStartWeightKg: 80 });
    });
  });

  it('quitar objetivo pide confirmación y vuelve a mostrar los atajos', async () => {
    const user = userEvent.setup();
    const card = await openCuerpo(user);
    await user.click(within(card).getByRole('button', { name: 'Bajar 6 kg' }));
    await within(card).findByRole('progressbar', { name: /Progreso del objetivo/i });

    await user.click(within(card).getByRole('button', { name: 'Quitar objetivo' }));
    const dialog = screen.getByRole('dialog', { name: 'Quitar objetivo' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(within(card).getByRole('progressbar')).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: 'Quitar objetivo' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Quitar objetivo' })).getByRole('button', {
        name: 'Sí, quitar',
      }),
    );

    expect(await within(card).findByRole('group', { name: /Objetivos rápidos/i })).toBeInTheDocument();
    await waitFor(async () => {
      expect(readGoal(await getSettings())).toEqual({ goalWeightKg: null, goalStartWeightKg: null });
    });
  });

  it('cambiar objetivo permite elegir otro y cancelar', async () => {
    const user = userEvent.setup();
    const card = await openCuerpo(user);
    await user.click(within(card).getByRole('button', { name: 'Bajar 5 kg' }));
    await within(card).findByRole('progressbar');

    await user.click(within(card).getByRole('button', { name: 'Cambiar objetivo' }));
    await user.click(within(card).getByRole('button', { name: 'Cancelar' }));
    expect(within(card).getByRole('progressbar')).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: 'Cambiar objetivo' }));
    await user.click(within(card).getByRole('button', { name: 'Bajar 7 kg' }));
    await waitFor(async () => {
      expect(readGoal(await getSettings()).goalWeightKg).toBe(73);
    });
  });

  it('al llegar al objetivo muestra el mensaje de logro y 100 %', async () => {
    const user = userEvent.setup();
    const card = await openCuerpo(user);
    await user.click(within(card).getByRole('button', { name: 'Bajar 5 kg' }));
    await within(card).findByRole('progressbar');

    // Nueva medición de 74 kg (por debajo del objetivo de 75).
    const weightInput = screen.getByLabelText(/Peso total/i);
    await user.clear(weightInput);
    await user.type(weightInput, '74');
    await user.click(screen.getByRole('button', { name: /Guardar medición/i }));
    await screen.findByText(/Medición guardada/i);

    expect(await within(card).findByText(/Objetivo alcanzado/i)).toBeInTheDocument();
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});
