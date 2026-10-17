// Integración (Testing Library + jsdom) del calendario de asistencia dentro de
// la pantalla Perfil: siembra una serie de fuerza y una sesión de cardio,
// navega a Perfil y comprueba el calendario, el resaltado de un día automático,
// el alternado manual y el resumen (racha / días del mes).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { __resetBackendForTests } from '../storage/db';
import { addSet, addCardioSession, getAllAttendanceMarks } from '../storage';

beforeEach(() => {
  localStorage.clear();
  __resetBackendForTests();
});

afterEach(() => {
  cleanup();
});

/** Nombres de mes en español (para localizar el mes actual en el calendario). */
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

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

describe('Calendario de asistencia (Perfil)', () => {
  it('renderiza el mes actual, resalta un día automático, alterna uno manual y muestra el resumen', async () => {
    const user = userEvent.setup();

    // Siembra una serie de fuerza HOY y una sesión de cardio HOY (día automático).
    const now = new Date();
    const todayDay = now.getDate();
    await addSet({
      date: now.toISOString(),
      dayId: 's1-d1',
      exerciseId: 'bench_press',
      setIndex: 1,
      weightKg: 60,
      reps: 10,
    });
    await addCardioSession({
      date: now.toISOString(),
      type: 'correr',
      durationMin: 30,
      distanceKm: 5,
    });

    render(<App />);
    await completeOnboarding(user);

    // Perfil no está gateado: accesible directamente tras el onboarding.
    const nav = screen.getByRole('navigation', { name: /navegación principal/i });
    await user.click(within(nav).getByRole('button', { name: /Perfil/i }));

    // El calendario muestra el nombre del mes actual en español.
    const monthName = MONTH_NAMES[now.getMonth()];
    await screen.findByText(new RegExp(`${monthName}\\s+${now.getFullYear()}`, 'i'));

    // La línea de ayuda en español está presente.
    expect(screen.getByText(/Toca un día para marcar que entrenaste/i)).toBeInTheDocument();

    // El día de HOY (automático) está resaltado como entrenado y NO es alternable.
    const grid = screen.getByRole('grid');
    const todayCell = within(grid).getByRole('button', {
      name: new RegExp(`^Día ${todayDay}, entrenado, hoy$`, 'i'),
    });
    expect(todayCell).toHaveAttribute('aria-pressed', 'true');
    expect(todayCell).toBeDisabled();

    // El resumen "Racha" y "Días entrenados este mes" aparece.
    expect(screen.getByText(/^Racha$/i)).toBeInTheDocument();
    expect(screen.getByText(/Días entrenados este mes/i)).toBeInTheDocument();

    // Alternar un día NO automático: elige otro día del mes distinto de hoy.
    const otherDay = todayDay === 1 ? 2 : 1;
    const otherCell = within(grid).getByRole('button', {
      name: new RegExp(`^Día ${otherDay}$`, 'i'),
    });
    expect(otherCell).not.toBeDisabled();
    await user.click(otherCell);

    // Tras el clic, el día queda marcado y la marca se persiste en el store.
    await waitFor(() => expect(otherCell).toHaveAttribute('aria-pressed', 'true'));
    await waitFor(async () => {
      const marks = await getAllAttendanceMarks();
      expect(marks.length).toBe(1);
    });
  });
});
