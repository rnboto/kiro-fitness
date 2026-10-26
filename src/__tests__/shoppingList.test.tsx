// Integración: Nutrición › Lista de la compra (marcar «comprados», persistencia,
// «Desmarcar todo», «Ocultar comprados», imprimir y cantidades de oficina).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { __resetBackendForTests } from '../storage/db';
import { getSettings } from '../storage';
import {
  SHOPPING_ITEMS,
  formatResetDate,
  readShoppingChecked,
  readShoppingLastReset,
  todayKey,
} from '../domain/shoppingList';

const TOTAL = SHOPPING_ITEMS.length;

beforeEach(() => {
  localStorage.clear();
  __resetBackendForTests();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

async function openList(user: User) {
  await user.click(screen.getByRole('tab', { name: 'Lista de la compra' }));
  return screen.findByRole('region', { name: 'Lista de la compra' });
}

const row = (name: RegExp) => screen.getByRole('checkbox', { name });
const rowText = (name: RegExp) => row(name).closest('label')!.textContent ?? '';
const counter = (n: number) => screen.getByText(`${n} de ${TOTAL} comprados`);
const checkedKeys = async () => readShoppingChecked(await getSettings());

const chipOf = (card: HTMLElement, name: string) =>
  within(within(card).getByRole('group', { name: 'Ideas de comida' }))
    .getAllByRole('button')
    .find((b) => b.textContent?.startsWith(name))!;

describe('Lista de la compra', { timeout: 20000 }, () => {
  it('Nutrición abre en «Comidas» (contenido actual) y la lista está en la otra pestaña', async () => {
    const user = userEvent.setup();
    render(<App />);
    await completeOnboarding(user);
    const card = await goToNutricion(user);

    expect(screen.getByRole('tab', { name: 'Comidas' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Lista de la compra' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(card).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Mi día' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desmarcar todo' })).not.toBeInTheDocument();

    await openList(user);
    expect(screen.getByRole('tab', { name: 'Lista de la compra' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByRole('article', { name: /Post-entreno/ })).not.toBeInTheDocument();

    // Volver a Comidas recupera las tarjetas y «Mi día».
    await user.click(screen.getByRole('tab', { name: 'Comidas' }));
    expect(await screen.findByRole('article', { name: /Post-entreno/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Mi día' })).toBeInTheDocument();
  });

  it('muestra contador, botón arriba (desactivado), secciones y cantidades de oficina', async () => {
    const user = userEvent.setup();
    render(<App />);
    await completeOnboarding(user);
    await goToNutricion(user);
    const list = await openList(user);

    expect(counter(0)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Productos comprados' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
    const reset = screen.getByRole('button', { name: 'Desmarcar todo' });
    expect(reset).toBeDisabled();
    // El botón está en la barra superior, antes de cualquier producto.
    const firstRow = within(list).getAllByRole('checkbox')[0];
    expect(
      reset.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(screen.getByRole('heading', { name: 'Para dejar en la oficina' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Para casa (almuerzo y cena)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Despensa / básicos' })).toBeInTheDocument();
    expect(within(list).getAllByRole('checkbox')).toHaveLength(TOTAL);
    expect(screen.getByText(/Cantidades orientativas; se recalculan con tu perfil/)).toBeInTheDocument();

    // Oficina: cantidad calculada con el plato por defecto (1 plátano de 120 g × 5 días).
    expect(rowText(/^Plátano/)).toContain('≈ 5 plátanos · 5 días');
    // Casa: solo consejo de compra, sin cantidades.
    expect(rowText(/^Pollo \(pechuga\)/)).not.toContain('5 días');
    // Producto de oficina que no está en los platos elegidos: solo formato.
    expect(rowText(/^Barrita de proteína/)).toContain('1 caja o sueltas');
  });

  it('un toque marca/desmarca, actualiza contadores y se guarda; Espacio también', async () => {
    const user = userEvent.setup();
    render(<App />);
    await completeOnboarding(user);
    await goToNutricion(user);
    await openList(user);

    const platano = row(/^Plátano/);
    expect(platano).not.toBeChecked();
    await user.click(platano.closest('label')!);
    expect(row(/^Plátano/)).toBeChecked();
    expect(counter(1)).toBeInTheDocument();
    expect(screen.getByText('1/19')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('button', { name: 'Desmarcar todo' })).toBeEnabled();
    await waitFor(async () => expect((await checkedKeys()).platano).toBe(true));

    // Dos toques seguidos en filas distintas: ambos se guardan.
    await user.click(row(/^Pollo \(pechuga\)/).closest('label')!);
    await user.click(row(/^Tomate/).closest('label')!);
    expect(counter(3)).toBeInTheDocument();
    await waitFor(async () =>
      expect(await checkedKeys()).toEqual({ platano: true, pollo_pechuga: true, tomate: true }),
    );

    // Teclado: Espacio sobre la fila enfocada.
    row(/^Manzana/).focus();
    await user.keyboard(' ');
    expect(row(/^Manzana/)).toBeChecked();
    expect(counter(4)).toBeInTheDocument();

    // Tocar de nuevo desmarca.
    await user.click(row(/^Plátano/).closest('label')!);
    expect(row(/^Plátano/)).not.toBeChecked();
    expect(counter(3)).toBeInTheDocument();
    await waitFor(async () => expect((await checkedKeys()).platano).toBeUndefined());
  });

  it('las marcas sobreviven a cerrar y reabrir la app', async () => {
    const user = userEvent.setup();
    render(<App />);
    await completeOnboarding(user);
    await goToNutricion(user);
    await openList(user);
    await user.click(row(/^Plátano/).closest('label')!);
    await user.click(row(/^Sal$/).closest('label')!);
    await waitFor(async () => expect(Object.keys(await checkedKeys())).toHaveLength(2));

    cleanup();
    __resetBackendForTests();
    render(<App />);
    await screen.findByRole('navigation', { name: /navegación principal/i });
    await goToNutricion(user);
    // Siempre se abre en «Comidas».
    expect(screen.getByRole('tab', { name: 'Comidas' })).toHaveAttribute('aria-selected', 'true');
    await openList(user);
    expect(counter(2)).toBeInTheDocument();
    expect(row(/^Plátano/)).toBeChecked();
    expect(row(/^Sal$/)).toBeChecked();
    expect(row(/^Manzana/)).not.toBeChecked();
  });

  it('«Ocultar comprados» quita las filas marcadas y las devuelve al desactivarlo', async () => {
    const user = userEvent.setup();
    render(<App />);
    await completeOnboarding(user);
    await goToNutricion(user);
    await openList(user);
    await user.click(row(/^Plátano/).closest('label')!);

    const hide = screen.getByRole('switch', { name: /Ocultar comprados/ });
    await user.click(hide);
    expect(screen.queryByRole('checkbox', { name: /^Plátano/ })).not.toBeInTheDocument();
    expect(row(/^Manzana/)).toBeInTheDocument();
    expect(counter(1)).toBeInTheDocument();
    expect(screen.getByText('1/19')).toBeInTheDocument();

    await user.click(hide);
    expect(row(/^Plátano/)).toBeChecked();
  });

  it('«Desmarcar todo» pide confirmación, se puede cancelar y al confirmar limpia todo', async () => {
    const user = userEvent.setup();
    render(<App />);
    await completeOnboarding(user);
    await goToNutricion(user);
    await openList(user);
    await user.click(row(/^Plátano/).closest('label')!);
    await user.click(row(/^Lentejas/).closest('label')!);
    expect(counter(2)).toBeInTheDocument();
    expect(screen.queryByText(/Última vez desmarcado/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Desmarcar todo' }));
    let dialog = screen.getByRole('dialog', { name: 'Desmarcar todo' });
    expect(
      within(dialog).getByText(
        '¿Desmarcar los 2 productos comprados? Úsalo al empezar la compra del mes siguiente.',
      ),
    ).toBeInTheDocument();

    // Cancelar no toca nada.
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(counter(2)).toBeInTheDocument();

    // Confirmar limpia todo y deja la fecha.
    await user.click(screen.getByRole('button', { name: 'Desmarcar todo' }));
    dialog = screen.getByRole('dialog', { name: 'Desmarcar todo' });
    await user.click(within(dialog).getByRole('button', { name: 'Sí, desmarcar todo' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(counter(0)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desmarcar todo' })).toBeDisabled();
    expect(row(/^Plátano/)).not.toBeChecked();
    expect(
      screen.getByText(`Última vez desmarcado: ${formatResetDate(todayKey())}`),
    ).toBeInTheDocument();

    await waitFor(async () => {
      const s = await getSettings();
      expect(s.shoppingChecked).toEqual({});
      expect(readShoppingLastReset(s)).toBe(todayKey());
    });
  });

  it('«Imprimir / guardar PDF» abre el diálogo de impresión del navegador', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<App />);
    await completeOnboarding(user);
    await goToNutricion(user);
    await openList(user);
    await user.click(screen.getByRole('button', { name: 'Imprimir / guardar PDF' }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('cambiar de plato en Comidas ajusta las cantidades de oficina', async () => {
    const user = userEvent.setup();
    render(<App />);
    await completeOnboarding(user);
    const card = await goToNutricion(user);

    // Por defecto el muesli sale en el desayuno: tiene cantidad calculada.
    await openList(user);
    expect(rowText(/^Muesli/)).toContain('5 días');
    expect(rowText(/^Wrap/)).toContain('1 paquete');
    expect(rowText(/^Wrap/)).not.toContain('5 días');

    await user.click(screen.getByRole('tab', { name: 'Comidas' }));
    const post = await screen.findByRole('article', { name: /Post-entreno/ });
    expect(post).toBeInTheDocument();
    expect(card).toBeDefined();
    await user.click(chipOf(post, 'Wrap integral con huevo cocido y aguacate'));

    await openList(user);
    expect(rowText(/^Wrap/)).toMatch(/≈ \d+ wraps? · 5 días/);
    expect(rowText(/^Muesli/)).toContain('1 paquete');
    expect(rowText(/^Muesli/)).not.toContain('5 días');
  });
});
