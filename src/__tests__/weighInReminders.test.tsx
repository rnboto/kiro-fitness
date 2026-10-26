// Integración: pesajes semanal/mensual en Notificaciones, banner "Toca pesarte"
// (Perfil y Notificaciones) y exportación al calendario del móvil (.ics).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { __resetBackendForTests } from '../storage/db';
import { addEntry, getSettings, saveSettings, DEFAULT_SETTINGS } from '../storage';

beforeEach(() => {
  localStorage.clear();
  __resetBackendForTests();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type User = ReturnType<typeof userEvent.setup>;

/** 'YYYY-MM-DD' local de hoy menos `days` días. */
function todayMinus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function seedMeasurement(daysAgo: number) {
  await addEntry({
    date: todayMinus(daysAgo),
    age: 30,
    heightCm: 167,
    sex: 'M',
    weightKg: 75,
    bodyFatPct: 20,
    mmeKg: 33,
  });
}

async function renderApp() {
  render(<App />);
  return screen.findByRole('navigation', { name: /navegación principal/i });
}

async function goTo(user: User, name: RegExp) {
  const nav = screen.getByRole('navigation', { name: /navegación principal/i });
  await user.click(within(nav).getByRole('button', { name }));
}

async function openNotificaciones(user: User) {
  await renderApp();
  await goTo(user, /Notificaciones/i);
  return screen.findByRole('region', { name: 'Pesaje semanal' });
}

describe('Notificaciones · pesajes semanal y mensual', () => {
  it('muestra las tarjetas con los defaults y el día elegido se guarda', async () => {
    const user = userEvent.setup();
    await seedMeasurement(0);
    const weekly = await openNotificaciones(user);

    expect(screen.getByRole('heading', { name: 'Pesaje semanal' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pesaje mensual' })).toBeInTheDocument();
    const monthly = screen.getByRole('region', { name: 'Pesaje mensual' });
    expect(within(monthly).getByLabelText('Día del mes')).toHaveValue(1);
    expect(within(monthly).getByText('Si el mes no tiene ese día, se avisa el último día')).toBeInTheDocument();
    expect(within(monthly).getByLabelText('Hora del aviso')).toHaveValue('06:00');
    expect(within(weekly).getByLabelText('Hora del aviso')).toHaveValue('06:00');

    const chips = within(weekly).getByRole('group', { name: 'Día de la semana' });
    expect(within(chips).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'L', 'M', 'X', 'J', 'V', 'S', 'D',
    ]);
    expect(within(chips).getByRole('button', { name: 'lunes' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(chips).getByRole('button', { name: 'viernes' }));
    expect(within(chips).getByRole('button', { name: 'viernes' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(chips).getByRole('button', { name: 'lunes' })).toHaveAttribute('aria-pressed', 'false');
    await waitFor(async () => {
      expect((await getSettings()).reminders.weightWeekly?.weekday).toBe(5);
    });

    await user.click(within(monthly).getByRole('button', { name: 'Aumentar Día del mes' }));
    await waitFor(async () => {
      expect((await getSettings()).reminders.weightMonthly?.dayOfMonth).toBe(2);
    });
  });

  it('el interruptor y la hora del semanal se guardan', async () => {
    const user = userEvent.setup();
    await seedMeasurement(0);
    const weekly = await openNotificaciones(user);

    await user.click(within(weekly).getByRole('checkbox', { name: 'Activar pesaje semanal' }));
    await waitFor(async () => {
      expect((await getSettings()).reminders.weightWeekly?.enabled).toBe(false);
    });

    fireEvent.change(within(weekly).getByLabelText('Hora del aviso'), { target: { value: '07:45' } });
    await waitFor(async () => {
      expect((await getSettings()).reminders.weightWeekly).toEqual({
        enabled: false,
        weekday: 1,
        time: '07:45',
      });
    });
    // Los demás recordatorios no cambian.
    const r = (await getSettings()).reminders;
    expect(r.weightLog).toEqual({ enabled: true, time: '07:30' });
    expect(r.bioimpedance).toEqual({ enabled: true, intervalWeeks: 4 });
  });

  it('la lista de próximos incluye ambos pesajes en formato español', async () => {
    const user = userEvent.setup();
    await seedMeasurement(0);
    await openNotificaciones(user);
    const list = screen.getByRole('heading', { name: 'Próximos recordatorios' }).closest('section')!;
    const rows = within(list).getAllByRole('listitem');
    const when = (label: string) =>
      rows.find((r) => r.textContent?.startsWith(label))?.textContent?.slice(label.length);
    const re = /^(lunes|martes|miércoles|jueves|viernes|sábado|domingo) \d{1,2} [a-z]{3}, \d{2}:\d{2}$/;
    expect(when('Pesaje semanal')).toMatch(re);
    expect(when('Pesaje semanal')).toMatch(/^lunes .*, 06:00$/);
    expect(when('Pesaje mensual')).toMatch(re);
    expect(when('Pesaje mensual')).toMatch(/ 1 [a-z]{3}, 06:00$/);
    expect(when('Registrar peso')).toBeTruthy(); // el diario sigue presente
  });

  it('ajustes antiguos sin pesajes muestran los defaults sin romper', async () => {
    const user = userEvent.setup();
    await seedMeasurement(0);
    const { weightWeekly: _w, weightMonthly: _m, ...legacy } = DEFAULT_SETTINGS.reminders;
    await saveSettings({ ...DEFAULT_SETTINGS, reminders: legacy } as never);
    const weekly = await openNotificaciones(user);

    expect(within(weekly).getByRole('button', { name: 'lunes' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(weekly).getByRole('checkbox', { name: 'Activar pesaje semanal' })).toBeChecked();
    const monthly = screen.getByRole('region', { name: 'Pesaje mensual' });
    expect(within(monthly).getByLabelText('Día del mes')).toHaveValue(1);
    expect(within(monthly).getByLabelText('Hora del aviso')).toHaveValue('06:00');
  });
});

describe('Banner "Toca pesarte"', () => {
  it('aparece arriba del todo en Perfil si la última medición tiene 8 días', async () => {
    await seedMeasurement(8);
    await renderApp();
    const banner = await screen.findByRole('region', { name: 'Toca pesarte' });
    expect(within(banner).getByText(/han pasado 8 días/)).toBeInTheDocument();
    const calendar = screen.getByRole('heading', { name: 'Calendario de asistencia' });
    expect(banner.compareDocumentPosition(calendar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const screenRoot = banner.parentElement!;
    expect(screenRoot.firstElementChild).toBe(banner);
  });

  it('mensual pendiente si pasó más de un mes', async () => {
    await seedMeasurement(40);
    await renderApp();
    const banner = await screen.findByRole('region', { name: 'Toca pesarte' });
    expect(within(banner).getByText(/Pesaje mensual pendiente/)).toBeInTheDocument();
  });

  it('no aparece si la medición es de hoy', async () => {
    await seedMeasurement(0);
    await renderApp();
    await screen.findByRole('heading', { name: 'Calendario de asistencia' });
    expect(screen.queryByRole('region', { name: 'Toca pesarte' })).toBeNull();
  });

  it('no aparece si ambos pesajes están desactivados', async () => {
    await seedMeasurement(60);
    await saveSettings({
      ...DEFAULT_SETTINGS,
      reminders: {
        ...DEFAULT_SETTINGS.reminders,
        weightWeekly: { enabled: false, weekday: 1, time: '06:00' },
        weightMonthly: { enabled: false, dayOfMonth: 1, time: '06:00' },
      },
    });
    await renderApp();
    await screen.findByRole('heading', { name: 'Calendario de asistencia' });
    expect(screen.queryByRole('region', { name: 'Toca pesarte' })).toBeNull();
  });

  it('también aparece arriba en Notificaciones', async () => {
    const user = userEvent.setup();
    await seedMeasurement(8);
    await openNotificaciones(user);
    expect(screen.getByRole('region', { name: 'Toca pesarte' })).toBeInTheDocument();
  });

  it('el botón lleva a Estadísticas › Cuerpo y desaparece tras registrar una medición', async () => {
    const user = userEvent.setup();
    await seedMeasurement(8);
    await renderApp();
    const banner = await screen.findByRole('region', { name: 'Toca pesarte' });

    await user.click(within(banner).getByRole('button', { name: 'Registrar medición' }));
    expect(await screen.findByRole('region', { name: /Objetivo de peso/i })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: /navegación principal/i });
    expect(within(nav).getByRole('button', { name: /Estadísticas/i })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: /Guardar medición/i }));
    await screen.findByText(/Medición guardada/i);

    await goTo(user, /Perfil/i);
    await screen.findByRole('heading', { name: 'Calendario de asistencia' });
    expect(screen.queryByRole('region', { name: 'Toca pesarte' })).toBeNull();
  });
});

describe('Añadir al calendario del móvil (.ics)', () => {
  it('descarga kiro-pesaje.ics con un Blob text/calendar', async () => {
    const user = userEvent.setup();
    await seedMeasurement(0);
    await openNotificaciones(user);

    const blobs: Blob[] = [];
    const create = vi.fn((b: Blob) => {
      blobs.push(b);
      return 'blob:kiro';
    });
    Object.defineProperty(URL, 'createObjectURL', { value: create, configurable: true, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true, writable: true });
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });

    expect(
      screen.getByText(/Las notificaciones de Kiro solo suenan con la app abierta/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Añadir al calendario del móvil' }));

    expect(create).toHaveBeenCalledTimes(1);
    expect(blobs[0].type).toContain('text/calendar');
    expect(downloads).toEqual(['kiro-pesaje.ics']);
  });

  it('el botón se deshabilita si ambos pesajes están desactivados', async () => {
    const user = userEvent.setup();
    await seedMeasurement(0);
    await saveSettings({
      ...DEFAULT_SETTINGS,
      reminders: {
        ...DEFAULT_SETTINGS.reminders,
        weightWeekly: { enabled: false, weekday: 1, time: '06:00' },
        weightMonthly: { enabled: false, dayOfMonth: 1, time: '06:00' },
      },
    });
    await openNotificaciones(user);
    expect(screen.getByRole('button', { name: 'Añadir al calendario del móvil' })).toBeDisabled();
  });
});
