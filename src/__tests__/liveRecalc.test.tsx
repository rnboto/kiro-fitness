// Test de integración: recálculo EN VIVO del plan de Nutrición al cambiar el
// perfil (design §6.4, §12).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
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

describe('Recálculo en vivo de Nutrición', () => {
  it('cambiar el peso en Perfil actualiza los totales en Nutrición', async () => {
    const user = userEvent.setup();
    render(<App />);
    await completeOnboarding(user);

    // Ir a Nutrición y leer el objetivo kcal inicial.
    await user.click(screen.getByRole('button', { name: /Nutrición/i }));
    const targetBefore = await screen.findByTestId('target-kcal');
    const kcalBefore = Number(targetBefore.textContent?.replace(/[^\d]/g, ''));
    const proteinBefore = Number(
      (await screen.findByTestId('total-protein')).textContent?.replace(/[^\d]/g, ''),
    );
    expect(kcalBefore).toBeGreaterThan(0);

    // Volver a Perfil y registrar una medición con más peso/MME.
    await user.click(screen.getByRole('button', { name: /Perfil/i }));
    const weightInput = await screen.findByLabelText(/Peso total/i);
    await user.clear(weightInput);
    await user.type(weightInput, '95');
    const mmeInput = screen.getByLabelText(/Masa muscular esquelética/i);
    await user.clear(mmeInput);
    await user.type(mmeInput, '45');

    await user.click(screen.getByRole('button', { name: /Guardar medición/i }));
    await screen.findByText(/Medición guardada/i);

    // Volver a Nutrición: el plan debe reflejar el nuevo perfil (más proteína).
    await user.click(screen.getByRole('button', { name: /Nutrición/i }));
    await waitFor(() => {
      const proteinAfter = Number(
        screen.getByTestId('total-protein').textContent?.replace(/[^\d]/g, ''),
      );
      expect(proteinAfter).toBeGreaterThan(proteinBefore);
    });
  });
});
