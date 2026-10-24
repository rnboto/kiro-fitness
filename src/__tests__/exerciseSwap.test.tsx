// Integración: Lista de Sustitución de Ejercicios (Gimnasio › Musculación).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { __resetBackendForTests } from '../storage/db';
import { getAllSets, getSettings, saveSettings } from '../storage';
import { readExerciseSwaps } from '../domain/exerciseSubstitutions';
import { toLocalDayKey } from '../domain/attendance';

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

async function goToGym(user: User) {
  const nav = screen.getByRole('navigation', { name: /navegación principal/i });
  await user.click(within(nav).getByRole('button', { name: /Gimnasio/i }));
  return screen.findByRole('article', { name: 'Press banca con barra' });
}

async function openGym(user: User) {
  render(<App />);
  await completeOnboarding(user);
  return goToGym(user);
}

const SLOT = 'f1-sup-a::bench_press';

// Onboarding + navegación completos en cada caso: margen extra para la
// ejecución en paralelo de toda la suite.
describe('Sustitución de ejercicios', { timeout: 20000 }, () => {
  it("abre la hoja, elige 'Solo hoy' y la tarjeta muestra el sustituto", async () => {
    const user = userEvent.setup();
    const card = await openGym(user);

    await user.click(
      within(card).getByRole('button', { name: 'Cambiar ejercicio: Press banca con barra' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Empuje horizontal de pecho' });
    expect(within(dialog).getByText('Elige uno si el original está ocupado')).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'Solo hoy' })).toBeChecked();
    expect(
      within(dialog).queryByRole('button', { name: 'Elegir Press banca con barra' }),
    ).not.toBeInTheDocument();
    const option = within(dialog).getByRole('button', {
      name: 'Elegir Press de banca con mancuernas',
    });
    expect(within(option).getByText('mancuernas')).toBeInTheDocument();
    const imgs = dialog.querySelectorAll('img');
    expect(imgs.length).toBeGreaterThan(0);
    imgs.forEach((img) => expect(img).toHaveAttribute('loading', 'lazy'));

    await user.click(option);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const swapped = await screen.findByRole('article', { name: 'Press de banca con mancuernas' });
    expect(within(swapped).getByText('Sustituido')).toBeInTheDocument();
    expect(within(swapped).getByText('Original: Press banca con barra')).toBeInTheDocument();
    expect(within(swapped).getByText('4×6-8')).toBeInTheDocument();
    expect(
      within(swapped).getByRole('button', { name: 'Restaurar original: Press banca con barra' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Press banca con barra' })).not.toBeInTheDocument();

    await waitFor(async () => {
      expect(readExerciseSwaps(await getSettings())[SLOT]).toEqual({
        toKey: 'db_bench_press',
        scope: 'hoy',
        date: toLocalDayKey(new Date().toISOString()),
      });
    });
  });

  it('una serie registrada tras el cambio usa el id del sustituto', async () => {
    const user = userEvent.setup();
    const card = await openGym(user);
    // Serie previa del original: debe quedar intacta.
    await user.click(within(card).getAllByRole('button', { name: 'Registrar serie' })[0]);
    await waitFor(async () => expect(await getAllSets()).toHaveLength(1));
    const [originalSet] = await getAllSets();
    await user.click(
      within(card).getByRole('button', { name: 'Cambiar ejercicio: Press banca con barra' }),
    );
    await user.click(screen.getByRole('button', { name: 'Elegir Press de banca con mancuernas' }));

    const swapped = await screen.findByRole('article', { name: 'Press de banca con mancuernas' });
    await user.click(within(swapped).getAllByRole('button', { name: 'Registrar serie' })[0]);

    await waitFor(async () => {
      const sets = await getAllSets();
      expect(sets).toHaveLength(2);
      expect(sets[0]).toEqual(originalSet);
      expect(originalSet).toMatchObject({ exerciseId: 'bench_press', dayId: 'f1-sup-a' });
      expect(sets[1]).toMatchObject({ exerciseId: 'db_bench_press', dayId: 'f1-sup-a', setIndex: 1 });
    });
  });

  it("'Dejar fijo' guarda el alcance fijo", async () => {
    const user = userEvent.setup();
    const card = await openGym(user);
    await user.click(
      within(card).getByRole('button', { name: 'Cambiar ejercicio: Press banca con barra' }),
    );
    await user.click(screen.getByLabelText('Dejar fijo'));
    await user.click(screen.getByRole('button', { name: 'Elegir Flexiones' }));

    const swapped = await screen.findByRole('article', { name: 'Flexiones' });
    expect(within(swapped).getByText('Fijo')).toBeInTheDocument();
    await waitFor(async () => {
      expect(readExerciseSwaps(await getSettings())[SLOT]?.scope).toBe('fijo');
    });
  });

  it('Restaurar original vuelve al ejercicio de la rutina', async () => {
    const user = userEvent.setup();
    const card = await openGym(user);
    await user.click(
      within(card).getByRole('button', { name: 'Cambiar ejercicio: Press banca con barra' }),
    );
    await user.click(screen.getByRole('button', { name: 'Elegir Press de banca con mancuernas' }));
    const swapped = await screen.findByRole('article', { name: 'Press de banca con mancuernas' });

    await user.click(
      within(swapped).getByRole('button', { name: 'Restaurar original: Press banca con barra' }),
    );
    const restored = await screen.findByRole('article', { name: 'Press banca con barra' });
    expect(within(restored).queryByText('Sustituido')).not.toBeInTheDocument();
    await waitFor(async () => {
      expect(SLOT in readExerciseSwaps(await getSettings())).toBe(false);
    });
  });

  it("una sustitución 'hoy' caducada se ignora al cargar", async () => {
    const user = userEvent.setup();
    render(<App />);
    await completeOnboarding(user);
    cleanup();

    await saveSettings({
      ...(await getSettings()),
      exerciseSwaps: { [SLOT]: { toKey: 'db_bench_press', scope: 'hoy', date: '2000-01-01' } },
    });
    render(<App />);
    await screen.findByRole('navigation', { name: /navegación principal/i });
    const card = await goToGym(user);
    expect(within(card).queryByText('Sustituido')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('article', { name: 'Press de banca con mancuernas' }),
    ).not.toBeInTheDocument();
  });

  it('Escape y ✕ cierran la hoja sin cambios', async () => {
    const user = userEvent.setup();
    const card = await openGym(user);
    const open = () =>
      user.click(
        within(card).getByRole('button', { name: 'Cambiar ejercicio: Press banca con barra' }),
      );

    await open();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await open();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    expect(screen.getByRole('article', { name: 'Press banca con barra' })).toBeInTheDocument();
    expect(readExerciseSwaps(await getSettings())).toEqual({});
  });

  it('Musculación sigue siendo el modo por defecto y Cardio/Abdominales no cambian', async () => {
    const user = userEvent.setup();
    await openGym(user);
    expect(screen.getAllByRole('button', { name: /Cambiar ejercicio:/ }).length).toBe(6);
    await user.click(screen.getByRole('tab', { name: 'Cardio' }));
    expect(screen.queryByRole('button', { name: /Cambiar ejercicio:/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Abdominales' }));
    expect(screen.queryByRole('button', { name: /Cambiar ejercicio:/ })).not.toBeInTheDocument();
  });
});
