import { describe, expect, it } from 'vitest';
import {
  daysInMonth,
  formatWeighInWhen,
  nextMonthlyWeighIn,
  nextWeeklyWeighIn,
  readWeighInReminders,
  weighInStatus,
} from '../weighInReminders';
import { DEFAULT_REMINDERS, type ProfileEntry, type ReminderSettings } from '../../storage';

// Todas las fechas en hora LOCAL: new Date(y, m, d, h, min).
const ymd = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];

const LEGACY: ReminderSettings = {
  weightLog: { enabled: true, time: '07:30' },
  hydration: { enabled: true, intervalMinutes: 90, startTime: '08:00', endTime: '20:00' },
  bioimpedance: { enabled: true, intervalWeeks: 4 },
};

describe('nextWeeklyWeighIn (0 = domingo … 6 = sábado)', () => {
  it('mismo día antes de la hora → hoy', () => {
    const r = nextWeeklyWeighIn(new Date(2024, 0, 15, 5, 0), 1, '06:00'); // lunes
    expect(ymd(r)).toEqual([2024, 1, 15, 6, 0]);
  });

  it('mismo día después de la hora → la semana siguiente', () => {
    const r = nextWeeklyWeighIn(new Date(2024, 0, 15, 7, 0), 1, '06:00');
    expect(ymd(r)).toEqual([2024, 1, 22, 6, 0]);
  });

  it('exactamente a la hora → devuelve now (>= now)', () => {
    const now = new Date(2024, 0, 15, 6, 0);
    expect(nextWeeklyWeighIn(now, 1, '06:00').getTime()).toBe(now.getTime());
  });

  it('vuelta de semana', () => {
    expect(ymd(nextWeeklyWeighIn(new Date(2024, 0, 20, 10, 0), 1, '06:00'))).toEqual([2024, 1, 22, 6, 0]); // sáb → lun
    expect(ymd(nextWeeklyWeighIn(new Date(2024, 0, 20, 10, 0), 0, '06:00'))).toEqual([2024, 1, 21, 6, 0]); // sáb → dom
    expect(ymd(nextWeeklyWeighIn(new Date(2024, 0, 21, 10, 0), 6, '06:00'))).toEqual([2024, 1, 27, 6, 0]); // dom → sáb
  });

  it('cambio de mes y de año', () => {
    const r = nextWeeklyWeighIn(new Date(2023, 11, 31, 22, 0), 1, '06:00'); // domingo
    expect(ymd(r)).toEqual([2024, 1, 1, 6, 0]);
  });

  it('el resultado siempre es >= now y cae en el día pedido', () => {
    const base = new Date(2024, 2, 1, 0, 0);
    for (let h = 0; h < 24 * 14; h += 5) {
      const now = new Date(base.getTime() + h * 3_600_000);
      for (let wd = 0; wd < 7; wd++) {
        const r = nextWeeklyWeighIn(now, wd, '06:00');
        expect(r.getTime()).toBeGreaterThanOrEqual(now.getTime());
        expect(r.getDay()).toBe(wd);
        expect(r.getTime() - now.getTime()).toBeLessThanOrEqual(7 * 86_400_000 + 3_600_000);
      }
    }
  });
});

describe('nextMonthlyWeighIn', () => {
  it('día 15 antes y después del hueco', () => {
    expect(ymd(nextMonthlyWeighIn(new Date(2024, 4, 10, 12, 0), 15, '06:00'))).toEqual([2024, 5, 15, 6, 0]);
    expect(ymd(nextMonthlyWeighIn(new Date(2024, 4, 15, 7, 0), 15, '06:00'))).toEqual([2024, 6, 15, 6, 0]);
  });

  it('día 31 en un mes de 30 días → día 30', () => {
    expect(ymd(nextMonthlyWeighIn(new Date(2024, 3, 10), 31, '06:00'))).toEqual([2024, 4, 30, 6, 0]);
  });

  it('día 31 cuando el 30 de abril ya pasó → 31 de mayo', () => {
    expect(ymd(nextMonthlyWeighIn(new Date(2024, 3, 30, 7, 0), 31, '06:00'))).toEqual([2024, 5, 31, 6, 0]);
  });

  it('febrero no bisiesto (2027) y bisiesto (2028)', () => {
    expect(ymd(nextMonthlyWeighIn(new Date(2027, 1, 3), 31, '06:00'))).toEqual([2027, 2, 28, 6, 0]);
    expect(ymd(nextMonthlyWeighIn(new Date(2027, 1, 3), 30, '06:00'))).toEqual([2027, 2, 28, 6, 0]);
    expect(ymd(nextMonthlyWeighIn(new Date(2027, 1, 3), 29, '06:00'))).toEqual([2027, 2, 28, 6, 0]);
    expect(ymd(nextMonthlyWeighIn(new Date(2028, 1, 3), 31, '06:00'))).toEqual([2028, 2, 29, 6, 0]);
    expect(ymd(nextMonthlyWeighIn(new Date(2028, 1, 3), 29, '06:00'))).toEqual([2028, 2, 29, 6, 0]);
    expect(daysInMonth(2027, 1)).toBe(28);
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(daysInMonth(2100, 1)).toBe(28);
    expect(daysInMonth(2000, 1)).toBe(29);
  });

  it('desde el 29 feb 2024 tras la hora con día 31 → 31 mar', () => {
    expect(ymd(nextMonthlyWeighIn(new Date(2024, 1, 29, 7, 0), 31, '06:00'))).toEqual([2024, 3, 31, 6, 0]);
  });

  it('cambio de año dic → ene', () => {
    expect(ymd(nextMonthlyWeighIn(new Date(2024, 11, 20), 1, '06:00'))).toEqual([2025, 1, 1, 6, 0]);
    expect(ymd(nextMonthlyWeighIn(new Date(2024, 11, 31, 23, 0), 31, '06:00'))).toEqual([2025, 1, 31, 6, 0]);
  });

  it('día 1 el propio día 1 antes y después de la hora', () => {
    expect(ymd(nextMonthlyWeighIn(new Date(2024, 5, 1, 5, 0), 1, '06:00'))).toEqual([2024, 6, 1, 6, 0]);
    expect(ymd(nextMonthlyWeighIn(new Date(2024, 5, 1, 6, 1), 1, '06:00'))).toEqual([2024, 7, 1, 6, 0]);
  });

  it('igualdad exacta → devuelve now', () => {
    const now = new Date(2024, 5, 15, 6, 0);
    expect(nextMonthlyWeighIn(now, 15, '06:00').getTime()).toBe(now.getTime());
  });
});

let nextId = 1;
function entry(date: string, id = nextId++): ProfileEntry {
  return { id, date, age: 30, heightCm: 167, sex: 'M', weightKg: 75, bodyFatPct: 20, mmeKg: 33 };
}

describe('weighInStatus', () => {
  const today = new Date(2024, 2, 20, 10, 0); // 20 mar 2024

  it('sin histórico: nada pendiente y daysSinceLast null', () => {
    expect(weighInStatus([], DEFAULT_REMINDERS, today)).toEqual({
      weeklyDue: false,
      monthlyDue: false,
      daysSinceLast: null,
    });
  });

  it('medición reciente (hoy / hace 7 días) → no toca', () => {
    expect(weighInStatus([entry('2024-03-20')], DEFAULT_REMINDERS, today)).toEqual({
      weeklyDue: false,
      monthlyDue: false,
      daysSinceLast: 0,
    });
    expect(weighInStatus([entry('2024-03-13')], DEFAULT_REMINDERS, today).weeklyDue).toBe(false);
  });

  it('hace 8 días → semanal pendiente', () => {
    const s = weighInStatus([entry('2024-03-12')], DEFAULT_REMINDERS, today);
    expect(s).toEqual({ weeklyDue: true, monthlyDue: false, daysSinceLast: 8 });
  });

  it('un mes natural exacto no es mensual pendiente; un día más sí', () => {
    const h = [entry('2024-01-15')];
    expect(weighInStatus(h, DEFAULT_REMINDERS, new Date(2024, 1, 15)).monthlyDue).toBe(false);
    expect(weighInStatus(h, DEFAULT_REMINDERS, new Date(2024, 1, 16)).monthlyDue).toBe(true);
  });

  it('recorte a fin de mes: 31 ene → 29 feb 2024 no toca, 1 mar sí', () => {
    const h = [entry('2024-01-31')];
    expect(weighInStatus(h, DEFAULT_REMINDERS, new Date(2024, 1, 29)).monthlyDue).toBe(false);
    expect(weighInStatus(h, DEFAULT_REMINDERS, new Date(2024, 2, 1)).monthlyDue).toBe(true);
  });

  it('semanal desactivado: weeklyDue false aunque el mensual sí toque', () => {
    const r: ReminderSettings = {
      ...DEFAULT_REMINDERS,
      weightWeekly: { enabled: false, weekday: 1, time: '06:00' },
    };
    const s = weighInStatus([entry('2024-01-01')], r, today);
    expect(s.weeklyDue).toBe(false);
    expect(s.monthlyDue).toBe(true);
  });

  it('ambos desactivados: nada pendiente pero daysSinceLast se calcula', () => {
    const r: ReminderSettings = {
      ...DEFAULT_REMINDERS,
      weightWeekly: { enabled: false, weekday: 1, time: '06:00' },
      weightMonthly: { enabled: false, dayOfMonth: 1, time: '06:00' },
    };
    expect(weighInStatus([entry('2024-01-01')], r, today)).toEqual({
      weeklyDue: false,
      monthlyDue: false,
      daysSinceLast: 79,
    });
  });

  it('usa la última medición (empate de día → id mayor) y acepta ISO con hora', () => {
    const h = [entry('2024-03-01', 1), entry('2024-03-18T07:00:00.000Z', 2), entry('2024-03-18', 3)];
    expect(weighInStatus(h, DEFAULT_REMINDERS, today).daysSinceLast).toBe(2);
    expect(weighInStatus([entry('2024-03-18', 5), entry('2024-03-01', 4)], DEFAULT_REMINDERS, today).daysSinceLast).toBe(2);
  });

  it('fecha futura → daysSinceLast 0', () => {
    expect(weighInStatus([entry('2024-04-01')], DEFAULT_REMINDERS, today).daysSinceLast).toBe(0);
  });

  it('recordatorios antiguos sin las claves nuevas usan los defaults (activos)', () => {
    const s = weighInStatus([entry('2024-01-01')], LEGACY, today);
    expect(s.weeklyDue).toBe(true);
    expect(s.monthlyDue).toBe(true);
    expect(weighInStatus([entry('2024-01-01')], undefined, today).weeklyDue).toBe(true);
  });
});

describe('readWeighInReminders', () => {
  const defaults = {
    weekly: { enabled: true, weekday: 1, time: '06:00' },
    monthly: { enabled: true, dayOfMonth: 1, time: '06:00' },
  };

  it('defaults para undefined, {} y recordatorios antiguos', () => {
    expect(readWeighInReminders(undefined)).toEqual(defaults);
    expect(readWeighInReminders(null)).toEqual(defaults);
    expect(readWeighInReminders({})).toEqual(defaults);
    expect(readWeighInReminders(LEGACY)).toEqual(defaults);
  });

  it('valores corruptos caen al default campo a campo', () => {
    const r = readWeighInReminders({
      weightWeekly: { enabled: 'yes', weekday: 9, time: '25:99' },
      weightMonthly: { enabled: false, dayOfMonth: 40, time: '6:00' },
    } as never);
    expect(r).toEqual({
      weekly: defaults.weekly,
      monthly: { enabled: false, dayOfMonth: 1, time: '06:00' },
    });
    expect(readWeighInReminders({ weightMonthly: { dayOfMonth: 0 } } as never).monthly.dayOfMonth).toBe(1);
    expect(readWeighInReminders({ weightWeekly: { weekday: 2.5 } } as never).weekly.weekday).toBe(1);
  });

  it('conserva valores válidos y no muta la entrada', () => {
    const input: ReminderSettings = {
      ...LEGACY,
      weightWeekly: { enabled: false, weekday: 0, time: '07:15' },
      weightMonthly: { enabled: true, dayOfMonth: 31, time: '23:59' },
    };
    const copy = JSON.parse(JSON.stringify(input));
    expect(readWeighInReminders(input)).toEqual({
      weekly: { enabled: false, weekday: 0, time: '07:15' },
      monthly: { enabled: true, dayOfMonth: 31, time: '23:59' },
    });
    expect(input).toEqual(copy);
  });
});

describe('formatWeighInWhen', () => {
  it("formato 'lunes 21 oct, 06:00'", () => {
    expect(formatWeighInWhen(new Date(2024, 9, 21, 6, 0))).toBe('lunes 21 oct, 06:00');
    expect(formatWeighInWhen(new Date(2028, 1, 29, 18, 5))).toBe('martes 29 feb, 18:05');
  });
});
