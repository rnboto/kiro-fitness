// Integración: plato elegido por comida (persistente) + resumen «Mi día».

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { __resetBackendForTests } from '../storage/db';
import { getSettings } from '../storage';
import { platesForMeal } from '../domain/mealPlates';
import { readSelectedPlates } from '../domain/plateSelection';

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

async function goToNutricion(user: User) {
  await user.click(screen.getByRole('button', { name: /Nutrición/i }));
  return screen.findByRole('article', { name: /Post-entreno/ });
}

const post = platesForMeal('post');
const nonPortable = post.find((p) => !p.portable)!;

const chipOf = (card: HTMLElement, name: string) =>
  within(within(card).getByRole('group', { name: 'Ideas de comida' }))
    .getAllByRole('button')
    .find((b) => b.textContent?.startsWith(name))!;

const detailHeading = (card: HTMLElement) => within(card).getByRole('heading', { level: 4, name: /^(?!Ideas de comida)/ });

const miDiaPostRow = () => within(screen.getByRole('region', { name: 'Mi día' })).getByTestId('mi-dia-fila-post');

describe('Plato elegido por comida', { timeout: 20000 }, () => {
  it('un toque elige el plato, se persiste, sobrevive al reabrir y se puede quitar', async () => {
    const user = userEvent.setup();
    render(<App />);
    await completeOnboarding(user);
    let card = await goToNutricion(user);

    // Por defecto: sugerido.
    expect(detailHeading(card).textContent).toBe(post[0].name);
    expect(within(miDiaPostRow()).getByText('Sugerido')).toBeInTheDocument();

    // Un toque: queda elegido (sin diálogos).
    await user.click(chipOf(card, nonPortable.name));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(chipOf(card, nonPortable.name).textContent).toMatch(/Elegido/);
    expect(detailHeading(card).textContent).toBe(nonPortable.name);
    expect(miDiaPostRow().textContent).toContain(nonPortable.name);
    expect(within(miDiaPostRow()).queryByText('Sugerido')).not.toBeInTheDocument();
    await waitFor(async () => {
      expect(readSelectedPlates(await getSettings()).post).toBe(nonPortable.id);
    });

    // Cerrar y reabrir la app: sigue elegido.
    cleanup();
    __resetBackendForTests();
    render(<App />);
    await screen.findByRole('navigation', { name: /navegación principal/i });
    card = await goToNutricion(user);
    expect(chipOf(card, nonPortable.name).textContent).toMatch(/Elegido/);
    expect(detailHeading(card).textContent).toBe(nonPortable.name);
    expect(miDiaPostRow().textContent).toContain(nonPortable.name);

    // El filtro «Solo para llevar» no borra la elección.
    await user.click(within(card).getByRole('button', { name: 'Solo para llevar' }));
    expect(detailHeading(card).textContent).toBe(nonPortable.name);
    expect(within(card).getByText(/sigue elegida/)).toBeInTheDocument();
    expect(readSelectedPlates(await getSettings()).post).toBe(nonPortable.id);

    // Volver al sugerido restaura el predeterminado y quita la clave.
    await user.click(within(card).getByRole('button', { name: 'Volver al sugerido' }));
    expect(detailHeading(card).textContent).toBe(post[0].name);
    expect(within(miDiaPostRow()).getByText('Sugerido')).toBeInTheDocument();
    await waitFor(async () => {
      expect('post' in readSelectedPlates(await getSettings())).toBe(false);
    });
  });

  it('los gramos se recalculan solos si cambia el peso y la elección se conserva', async () => {
    const user = userEvent.setup();
    render(<App />);
    await completeOnboarding(user);
    const card = await goToNutricion(user);
    await user.click(chipOf(card, nonPortable.name));
    const gramsBefore = within(card).getAllByText(/g crudo/).map((e) => e.textContent);

    await user.click(screen.getByRole('button', { name: /Estadísticas/i }));
    const weightInput = await screen.findByLabelText(/Peso total/i);
    await user.clear(weightInput);
    await user.type(weightInput, '95');
    const mmeInput = screen.getByLabelText(/Masa muscular esquelética/i);
    await user.clear(mmeInput);
    await user.type(mmeInput, '45');
    await user.click(screen.getByRole('button', { name: /Guardar medición/i }));
    await screen.findByText(/Medición guardada/i);

    const after = await goToNutricion(user);
    expect(detailHeading(after).textContent).toBe(nonPortable.name);
    expect(chipOf(after, nonPortable.name).textContent).toMatch(/Elegido/);
    const gramsAfter = within(after).getAllByText(/g crudo/).map((e) => e.textContent);
    expect(gramsAfter).not.toEqual(gramsBefore);
    expect(readSelectedPlates(await getSettings()).post).toBe(nonPortable.id);
  });
});
