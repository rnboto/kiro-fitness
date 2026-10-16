// Tests de integración (Testing Library + jsdom): gating / onboarding (design §12).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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

describe('Gating y onboarding', () => {
  it('sin perfil renderiza WelcomeScreen a pantalla completa sin TabBar', async () => {
    render(<App />);

    expect(
      await screen.findByText(/Bienvenido a tu nuevo estilo de vida/i),
    ).toBeInTheDocument();

    // No hay barra de navegación en el onboarding.
    expect(screen.queryByRole('navigation', { name: /navegación principal/i })).toBeNull();
  });

  it('tras enviar el formulario Evolt válido aparece la app con la TabBar de 5 pestañas', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText(/Bienvenido a tu nuevo estilo de vida/i);

    await user.type(screen.getByLabelText(/Edad/i), '30');
    await user.type(screen.getByLabelText(/Altura/i), '178');
    await user.type(screen.getByLabelText(/Peso total/i), '80');
    await user.type(screen.getByLabelText(/% de grasa/i), '15');
    await user.type(screen.getByLabelText(/Masa muscular esquelética/i), '38');

    await user.click(screen.getByRole('button', { name: /Desbloquear mi plan/i }));

    const nav = await screen.findByRole('navigation', { name: /navegación principal/i });
    expect(nav).toBeInTheDocument();

    // Las 5 pestañas, en orden.
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map((b) => b.textContent?.trim());
    const expectedOrder = ['Perfil', 'Nutrición', 'Gimnasio', 'Estadísticas', 'Notificaciones'];
    const tabLabels = labels.filter((l) => l && expectedOrder.some((e) => l.includes(e)));
    const indices = expectedOrder.map((e) => tabLabels.findIndex((l) => l?.includes(e)));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expectedOrder.forEach((label) => {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    });
  });

  it('la TabBar lista exactamente las 5 pestañas en el orden definido', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/Bienvenido a tu nuevo estilo de vida/i);

    await user.type(screen.getByLabelText(/Edad/i), '30');
    await user.type(screen.getByLabelText(/Altura/i), '178');
    await user.type(screen.getByLabelText(/Peso total/i), '80');
    await user.type(screen.getByLabelText(/% de grasa/i), '15');
    await user.type(screen.getByLabelText(/Masa muscular esquelética/i), '38');
    await user.click(screen.getByRole('button', { name: /Desbloquear mi plan/i }));

    const nav = await screen.findByRole('navigation', { name: /navegación principal/i });
    const tabButtons = Array.from(nav.querySelectorAll('button'));
    const order = tabButtons.map((b) => b.textContent?.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ]/g, '').trim());
    expect(order).toEqual(['Perfil', 'Nutrición', 'Gimnasio', 'Estadísticas', 'Notificaciones']);
  });
});
