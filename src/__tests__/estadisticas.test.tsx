// Integración (Testing Library + jsdom): tras el onboarding, la pestaña
// Estadísticas renderiza el control segmentado con sus 4 tabs internas y el FAB
// global del Cronómetro/Temporizador está presente en el árbol (FEAT-005).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { __resetBackendForTests } from '../storage/db';

beforeEach(() => {
  localStorage.clear();
  __resetBackendForTests();
});

afterEach(() => {
  cleanup();
});

async function completeOnboarding(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText(/Bienvenido a tu nuevo estilo de vida/i);
  await user.type(screen.getByLabelText(/Edad/i), '30');
  await user.type(screen.getByLabelText(/Altura/i), '178');
  await user.type(screen.getByLabelText(/Peso total/i), '80');
  await user.type(screen.getByLabelText(/% de grasa/i), '15');
  await user.type(screen.getByLabelText(/Masa muscular esquelética/i), '38');
  await user.click(screen.getByRole('button', { name: /Desbloquear mi plan/i }));
  await screen.findByRole('navigation', { name: /navegación principal/i });
}

describe('Estadísticas y FAB (FEAT-005)', () => {
  it('el FAB del cronómetro está presente tras el onboarding', async () => {
    const user = userEvent.setup();
    render(<App />);
    await completeOnboarding(user);

    expect(
      screen.getByRole('button', { name: /Abrir cronómetro y temporizador/i }),
    ).toBeInTheDocument();
  });

  it('Estadísticas muestra el control segmentado con 4 tabs internas', async () => {
    const user = userEvent.setup();
    render(<App />);
    await completeOnboarding(user);

    const nav = screen.getByRole('navigation', { name: /navegación principal/i });
    await user.click(within(nav).getByRole('button', { name: /Estadísticas/i }));

    // Cabecera de la pantalla.
    expect(
      screen.getByRole('heading', { name: /^Estadísticas$/i }),
    ).toBeInTheDocument();

    // Control segmentado (tablist) con las 4 tabs internas.
    const tablist = screen.getByRole('tablist', { name: /sección de estadísticas/i });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Cuerpo',
      'Fuerza',
      'Nutrición',
      'Adherencia',
    ]);
  });

  it('cambiar de tab interna muestra su contenido y su selector de rango', async () => {
    const user = userEvent.setup();
    render(<App />);
    await completeOnboarding(user);

    const nav = screen.getByRole('navigation', { name: /navegación principal/i });
    await user.click(within(nav).getByRole('button', { name: /Estadísticas/i }));

    const tablist = screen.getByRole('tablist', { name: /sección de estadísticas/i });
    await user.click(within(tablist).getByRole('tab', { name: 'Nutrición' }));

    // La tab Nutrición muestra su título y un selector de rango.
    expect(
      screen.getByRole('heading', { name: /Objetivo nutricional/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /rango temporal/i })).toBeInTheDocument();
  });
});
