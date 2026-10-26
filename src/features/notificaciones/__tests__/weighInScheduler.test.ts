import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MONTHLY_WEIGHIN_BODY,
  WEEKLY_WEIGHIN_BODY,
  notify,
  scheduleReminders,
  scheduleWeighInReminders,
} from '../reminderScheduler';
import { DEFAULT_REMINDERS, type ReminderSettings } from '../../../storage';

const DAY = 86_400_000;
const now = () => new Date(Date.now());

function reminders(
  weekly: Partial<NonNullable<ReminderSettings['weightWeekly']>> = {},
  monthly: Partial<NonNullable<ReminderSettings['weightMonthly']>> = {},
): ReminderSettings {
  return {
    ...DEFAULT_REMINDERS,
    weightWeekly: { enabled: true, weekday: 1, time: '06:00', ...weekly },
    weightMonthly: { enabled: true, dayOfMonth: 1, time: '06:00', ...monthly },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('scheduleWeighInReminders', () => {
  it('semanal: dispara a la hora (fallback in-app) y se reprograma para la semana siguiente', () => {
    vi.setSystemTime(new Date(2024, 0, 15, 5, 0)); // lunes 05:00
    const onInApp = vi.fn();
    const h = scheduleWeighInReminders(reminders({}, { enabled: false }), { onInApp, now });

    vi.advanceTimersByTime(59 * 60_000);
    expect(onInApp).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000); // 06:00
    expect(onInApp).toHaveBeenCalledTimes(1);
    expect(onInApp).toHaveBeenLastCalledWith('Pesaje semanal', WEEKLY_WEIGHIN_BODY);

    vi.advanceTimersByTime(7 * DAY - 60_000);
    expect(onInApp).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000); // lunes siguiente 06:00
    expect(onInApp).toHaveBeenCalledTimes(2);
    expect(new Date(Date.now()).getDate()).toBe(22);
    h.cancel();
  });

  it('mensual: una espera > 24.8 días no dispara antes de tiempo y luego se reprograma', () => {
    vi.setSystemTime(new Date(2024, 0, 1, 7, 0)); // 1 ene 07:00 → próximo 1 feb 06:00 (~31 días)
    const onInApp = vi.fn();
    const h = scheduleWeighInReminders(reminders({ enabled: false }), { onInApp, now });

    vi.advanceTimersByTime(30 * DAY); // 31 ene 07:00
    expect(onInApp).not.toHaveBeenCalled();
    vi.advanceTimersByTime(22 * 3_600_000); // 1 feb 05:00
    expect(onInApp).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3_600_000); // 1 feb 06:00
    expect(onInApp).toHaveBeenCalledTimes(1);
    expect(onInApp).toHaveBeenLastCalledWith('Pesaje mensual', MONTHLY_WEIGHIN_BODY);
    const fired = new Date(Date.now());
    expect([fired.getMonth(), fired.getDate(), fired.getHours()]).toEqual([1, 1, 6]);

    vi.advanceTimersByTime(29 * DAY); // 1 mar 06:00 (2024 bisiesto: feb tiene 29)
    expect(onInApp).toHaveBeenCalledTimes(2);
    h.cancel();
  });

  it('cancel() detiene todos los disparos', () => {
    vi.setSystemTime(new Date(2024, 0, 15, 5, 0));
    const onInApp = vi.fn();
    const h = scheduleWeighInReminders(reminders(), { onInApp, now });
    expect(vi.getTimerCount()).toBe(2);
    h.cancel();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60 * DAY);
    expect(onInApp).not.toHaveBeenCalled();
  });

  it('desactivados no arman timers', () => {
    vi.setSystemTime(new Date(2024, 0, 15, 5, 0));
    scheduleWeighInReminders(reminders({ enabled: false }, { enabled: false }), { now });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ajustes antiguos sin claves → ambos pesajes programados con defaults', () => {
    vi.setSystemTime(new Date(2024, 0, 15, 5, 0));
    const { weightWeekly: _w, weightMonthly: _m, ...legacy } = DEFAULT_REMINDERS;
    const h = scheduleWeighInReminders(legacy, { now });
    expect(vi.getTimerCount()).toBe(2);
    h.cancel();
  });

  it('con permiso concedido crea la Notification y su click invoca onClick', () => {
    vi.setSystemTime(new Date(2024, 0, 15, 5, 0));
    const created: { title: string; body?: string; onclick: (() => void) | null; close: () => void }[] = [];
    class FakeNotification {
      static permission = 'granted';
      onclick: (() => void) | null = null;
      close = vi.fn();
      constructor(public title: string, opts?: { body?: string }) {
        created.push(Object.assign(this, { body: opts?.body }));
      }
    }
    vi.stubGlobal('Notification', FakeNotification);
    const focus = vi.spyOn(window, 'focus').mockImplementation(() => {});
    const onClick = vi.fn();
    const onInApp = vi.fn();
    const h = scheduleWeighInReminders(reminders({}, { enabled: false }), { onInApp, onClick, now });

    vi.advanceTimersByTime(60 * 60_000);
    expect(created).toHaveLength(1);
    expect(created[0].title).toBe('Pesaje semanal');
    expect(created[0].body).toBe(WEEKLY_WEIGHIN_BODY);
    expect(onInApp).not.toHaveBeenCalled();

    created[0].onclick?.();
    expect(focus).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(created[0].close).toHaveBeenCalled();
    h.cancel();
    focus.mockRestore();
  });

  it('notify sin onClick conserva el comportamiento anterior (sin onclick)', () => {
    const created: { onclick: unknown }[] = [];
    class FakeNotification {
      static permission = 'granted';
      onclick: unknown = null;
      constructor() {
        created.push(this);
      }
    }
    vi.stubGlobal('Notification', FakeNotification);
    notify('Registra tu peso', 'x');
    expect(created).toHaveLength(1);
    expect(created[0].onclick).toBeNull();
  });
});

describe('scheduleReminders (peso diario + hidratación) sin cambios', () => {
  it('peso diario dispara a su hora y no avisa de pesajes semanal/mensual', () => {
    vi.setSystemTime(new Date(2024, 0, 15, 7, 0)); // lunes 07:00
    const onInApp = vi.fn();
    const h = scheduleReminders(
      { ...reminders(), hydration: { ...DEFAULT_REMINDERS.hydration, enabled: false } },
      { onInApp, now },
    );
    expect(vi.getTimerCount()).toBe(1); // solo el peso diario

    vi.advanceTimersByTime(30 * 60_000); // 07:30
    expect(onInApp).toHaveBeenCalledTimes(1);
    expect(onInApp).toHaveBeenLastCalledWith('Registra tu peso', 'Es momento de anotar tu peso de hoy.');

    vi.advanceTimersByTime(DAY);
    expect(onInApp).toHaveBeenCalledTimes(2);
    for (const [title] of onInApp.mock.calls) expect(title).not.toMatch(/Pesaje/);
    h.cancel();
  });

  it('hidratación sigue avisando en su ventana', () => {
    vi.setSystemTime(new Date(2024, 0, 15, 10, 17));
    const onInApp = vi.fn();
    const h = scheduleReminders(
      { ...DEFAULT_REMINDERS, weightLog: { enabled: false, time: '07:30' } },
      { onInApp, now },
    );
    vi.advanceTimersByTime(43 * 60_000); // 11:00
    expect(onInApp).toHaveBeenCalledTimes(1);
    expect(onInApp).toHaveBeenLastCalledWith('Hidrátate', 'Bebe agua para mantener tu rendimiento.');
    h.cancel();
  });
});
