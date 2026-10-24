// Integración: Historial de mediciones (Estadísticas · Cuerpo) con editar/borrar,
// desempate del mismo día (gana la medición añadida después) y la regla de no
// borrar la última medición. También comprueba que Perfil → Ficha actual usa el
// perfil actualizado tras añadir/editar/borrar.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { __resetBackendForTests } from '../storage/db';
import { getAllEntries } from '../storage';

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

async function goTo(user: User, name: RegExp) {
  const nav = screen.getByRole('navigation', { name: /navegación principal/i });
  await user.click(within(nav).getByRole('button', { name }));
}

async function addSecondMeasurement(user: User) {
  const weightInput = await screen.findByLabelText(/Peso total/i);
  await user.clear(weightInput);
  await user.type(weightInput, '82');
  const mmeInput = screen.getByLabelText(/Masa muscular esquelética/i);
  await user.clear(mmeInput);
  await user.type(mmeInput, '39');
  await user.click(screen.getByRole('button', { name: /Guardar medición/i }));
  await screen.findByText(/Medición guardada/i);
}

function historyRows() {
  const region = screen.getByRole('region', { name: /Historial de mediciones/i });
  return within(region).getAllByRole('listitem');
}

async function setupWithTwoEntries(user: User) {
  render(<App />);
  await completeOnboarding(user);
  await goTo(user, /Estadísticas/i);
  await addSecondMeasurement(user);
  await waitFor(() => expect(historyRows()).toHaveLength(2));
}

describe('Historial de mediciones', () => {
  it('con una sola medición el borrado está deshabilitado y se explica por qué', async () => {
    const user = userEvent.setup();
    render(<App />);
    await completeOnboarding(user);
    await goTo(user, /Estadísticas/i);

    await waitFor(() => expect(historyRows()).toHaveLength(1));
    const del = screen.getByRole('button', { name: /Borrar medición del/i });
    expect(del).toBeDisabled();
    expect(screen.getByText('Necesitas al menos una medición')).toBeInTheDocument();
  });

  it('mismo día: la medición añadida después es la actual (primera de la lista y en Perfil)', async () => {
    const user = userEvent.setup();
    await setupWithTwoEntries(user);

    const rows = historyRows();
    expect(within(rows[0]).getByText('82 kg')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Actual')).toBeInTheDocument();
    expect(within(rows[1]).getByText('80 kg')).toBeInTheDocument();
    expect(within(rows[1]).queryByText('Actual')).toBeNull();

    await goTo(user, /Perfil/i);
    const ficha = await screen.findByRole('heading', { name: /Ficha actual/i });
    expect(within(ficha.closest('section') as HTMLElement).getByText('82 kg')).toBeInTheDocument();
  });

  it('editar cambia el valor mostrado, conserva los ids y no toca la otra entrada', async () => {
    const user = userEvent.setup();
    await setupWithTwoEntries(user);
    const before = await getAllEntries();

    // Editar la fila de 80 kg (la segunda, más antigua).
    await user.click(screen.getByRole('button', { name: /Editar medición del .* \(80 kg\)/i }));
    const dialog = screen.getByRole('dialog', { name: 'Editar medición' });
    const weight = within(dialog).getByLabelText(/Peso total/i);
    expect(weight).toHaveValue(80);
    await user.clear(weight);
    await user.type(weight, '79');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const rows = historyRows();
    expect(rows).toHaveLength(2);
    expect(within(rows[1]).getByText('79 kg')).toBeInTheDocument();

    const after = await getAllEntries();
    expect(after.map((e) => e.id).sort()).toEqual(before.map((e) => e.id).sort());
    expect(after.filter((e) => e.weightKg === 79)).toHaveLength(1);
    const untouched = before.find((e) => e.weightKg === 82);
    expect(after.find((e) => e.id === untouched?.id)).toEqual(untouched);
  });

  it('editar la medición actual actualiza la Ficha actual de Perfil', async () => {
    const user = userEvent.setup();
    await setupWithTwoEntries(user);

    await user.click(screen.getByRole('button', { name: /Editar medición del .* \(82 kg\)/i }));
    const dialog = screen.getByRole('dialog', { name: 'Editar medición' });
    const weight = within(dialog).getByLabelText(/Peso total/i);
    await user.clear(weight);
    await user.type(weight, '81');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await goTo(user, /Perfil/i);
    const ficha = await screen.findByRole('heading', { name: /Ficha actual/i });
    expect(within(ficha.closest('section') as HTMLElement).getByText('81 kg')).toBeInTheDocument();
  });

  it('la edición valida igual que el alta y no guarda datos inválidos', async () => {
    const user = userEvent.setup();
    await setupWithTwoEntries(user);
    const before = await getAllEntries();

    await user.click(screen.getByRole('button', { name: /Editar medición del .* \(80 kg\)/i }));
    const dialog = screen.getByRole('dialog', { name: 'Editar medición' });

    const mme = within(dialog).getByLabelText(/Masa muscular esquelética/i);
    await user.clear(mme);
    await user.type(mme, '85');
    fireEvent.change(within(dialog).getByLabelText(/Fecha de la medición/i), {
      target: { value: '' },
    });
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));

    expect(await within(dialog).findByText(/La MME debe estar entre 10 y 80 kg/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Introduce una fecha válida/i)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Editar medición' })).toBeInTheDocument();
    expect(await getAllEntries()).toEqual(before);
  });

  it('borrar pide confirmación; cancelar conserva y confirmar elimina; la última no se puede borrar', async () => {
    const user = userEvent.setup();
    await setupWithTwoEntries(user);

    // Cancelar mantiene las 2 filas.
    await user.click(screen.getByRole('button', { name: /Borrar medición del .* \(80 kg\)/i }));
    let dialog = screen.getByRole('dialog', { name: 'Borrar medición' });
    expect(within(dialog).getByText(/¿Seguro que quieres borrar la medición del/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(historyRows()).toHaveLength(2);
    expect(await getAllEntries()).toHaveLength(2);

    // Confirmar elimina la entrada.
    await user.click(screen.getByRole('button', { name: /Borrar medición del .* \(80 kg\)/i }));
    dialog = screen.getByRole('dialog', { name: 'Borrar medición' });
    await user.click(within(dialog).getByRole('button', { name: 'Sí, borrar' }));

    await waitFor(() => expect(historyRows()).toHaveLength(1));
    expect(await getAllEntries()).toHaveLength(1);

    // La última queda protegida y la app sigue desbloqueada.
    expect(screen.getByRole('button', { name: /Borrar medición del/i })).toBeDisabled();
    expect(screen.getByText('Necesitas al menos una medición')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /navegación principal/i })).toBeInTheDocument();
    expect(screen.queryByText(/Bienvenido a tu nuevo estilo de vida/i)).toBeNull();
  });
});
