// Recordatorios de pesaje semanal y mensual — funciones PURAS (sin React ni
// storage). Todo en hora LOCAL: las fechas se construyen con Y/M/D/H/M locales.
//
// Convención de día de la semana: JS `Date.getDay()` → 0 = domingo … 6 = sábado.

import type {
  MonthlyWeighInSettings,
  ProfileEntry,
  ReminderSettings,
  WeeklyWeighInSettings,
} from '../storage';
import { DEFAULT_WEIGHT_MONTHLY, DEFAULT_WEIGHT_WEEKLY } from '../storage/types';
import { compareProfileEntries, profileDayKey } from './profileHistory';

/** Nombres de los días indexados por `Date.getDay()`. */
export const WEEKDAY_NAMES: readonly string[] = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

/** Chips de día en orden de lunes a domingo (valor = `Date.getDay()`). */
export const WEEKDAY_CHIPS: readonly { value: number; letter: string; name: string }[] = [
  { value: 1, letter: 'L', name: 'lunes' },
  { value: 2, letter: 'M', name: 'martes' },
  { value: 3, letter: 'X', name: 'miércoles' },
  { value: 4, letter: 'J', name: 'jueves' },
  { value: 5, letter: 'V', name: 'viernes' },
  { value: 6, letter: 'S', name: 'sábado' },
  { value: 0, letter: 'D', name: 'domingo' },
];

/** Abreviaturas de mes en español. */
export const MONTH_SHORT: readonly string[] = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const FALLBACK_TIME = '06:00';

/** Ajustes de pesaje ya validados (siempre completos). */
export interface WeighInReminders {
  weekly: WeeklyWeighInSettings;
  monthly: MonthlyWeighInSettings;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isIntInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

function isTime(v: unknown): v is string {
  return typeof v === 'string' && TIME_RE.test(v);
}

/**
 * Lectura defensiva de los pesajes. Cada campo inválido o ausente cae a su
 * default; nunca lanza ni muta la entrada (ajustes/backups antiguos sin claves).
 */
export function readWeighInReminders(
  r: Partial<ReminderSettings> | null | undefined,
): WeighInReminders {
  const w: unknown = isRecord(r) ? r.weightWeekly : undefined;
  const m: unknown = isRecord(r) ? r.weightMonthly : undefined;
  const wr = isRecord(w) ? w : {};
  const mr = isRecord(m) ? m : {};
  return {
    weekly: {
      enabled: typeof wr.enabled === 'boolean' ? wr.enabled : DEFAULT_WEIGHT_WEEKLY.enabled,
      weekday: isIntInRange(wr.weekday, 0, 6) ? wr.weekday : DEFAULT_WEIGHT_WEEKLY.weekday,
      time: isTime(wr.time) ? wr.time : DEFAULT_WEIGHT_WEEKLY.time,
    },
    monthly: {
      enabled: typeof mr.enabled === 'boolean' ? mr.enabled : DEFAULT_WEIGHT_MONTHLY.enabled,
      dayOfMonth: isIntInRange(mr.dayOfMonth, 1, 31)
        ? mr.dayOfMonth
        : DEFAULT_WEIGHT_MONTHLY.dayOfMonth,
      time: isTime(mr.time) ? mr.time : DEFAULT_WEIGHT_MONTHLY.time,
    },
  };
}

/** Días del mes (`monthIndex` 0-11). Gestiona febrero y años bisiestos. */
export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** 'HH:mm' → [h, m]; hora inválida → 06:00. */
function parseTime(time: string): [number, number] {
  const t = isTime(time) ? time : FALLBACK_TIME;
  const [h, m] = t.split(':').map(Number);
  return [h, m];
}

/**
 * Próximo pesaje semanal (>= now). Si el hueco de hoy ya pasó, la semana
 * siguiente. `weekday` en convención `Date.getDay()`.
 */
export function nextWeeklyWeighIn(now: Date, weekday: number, time: string): Date {
  const [hh, mm] = parseTime(time);
  const wd = isIntInRange(weekday, 0, 6) ? weekday : DEFAULT_WEIGHT_WEEKLY.weekday;
  const offset = (wd - now.getDay() + 7) % 7;
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hh, mm, 0, 0);
  if (target.getTime() < now.getTime()) {
    target.setDate(target.getDate() + 7);
  }
  return target;
}

/**
 * Próximo pesaje mensual (>= now). Si el mes tiene menos días que
 * `dayOfMonth`, cae en el último día de ese mes.
 */
export function nextMonthlyWeighIn(now: Date, dayOfMonth: number, time: string): Date {
  const [hh, mm] = parseTime(time);
  const dom = Math.min(31, Math.max(1, Math.round(Number(dayOfMonth) || 1)));
  for (let offset = 0; offset <= 2; offset++) {
    // El constructor normaliza el desbordamiento de mes (dic → ene del año siguiente).
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const y = first.getFullYear();
    const mo = first.getMonth();
    const day = Math.min(dom, daysInMonth(y, mo));
    const candidate = new Date(y, mo, day, hh, mm, 0, 0);
    if (candidate.getTime() >= now.getTime()) return candidate;
  }
  // Inalcanzable: el mes siguiente siempre es futuro.
  return new Date(now.getTime());
}

/** 'lunes 20 oct, 06:00' (sin Intl, para que sea estable en cualquier entorno). */
export function formatWeighInWhen(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${WEEKDAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}, ${hh}:${mm}`;
}

/** Estado "toca pesarte" derivado de los datos. */
export interface WeighInStatus {
  weeklyDue: boolean;
  monthlyDue: boolean;
  /** Días desde la última medición; null sin histórico. */
  daysSinceLast: number | null;
}

/** Número de día (UTC) a partir de Y/M/D, inmune a cambios de horario. */
function dayNumber(y: number, monthIndex: number, d: number): number {
  return Date.UTC(y, monthIndex, d) / 86_400_000;
}

/** 'YYYY-MM-DD' → [y, monthIndex, d]; null si no es válido. */
function parseDayKey(key: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
}

/**
 * ¿Toca pesarse? Funciona aunque nunca se dispare una notificación.
 * - Semanal: la última medición tiene más de 7 días (y el semanal está activo).
 * - Mensual: hoy es posterior a última medición + 1 mes natural (con recorte a
 *   fin de mes: 31 ene → 28/29 feb) y el mensual está activo.
 */
export function weighInStatus(
  history: readonly ProfileEntry[],
  reminders: Partial<ReminderSettings> | null | undefined,
  today: Date,
): WeighInStatus {
  let latest: ProfileEntry | null = null;
  for (const e of history) {
    if (latest === null || compareProfileEntries(e, latest) > 0) latest = e;
  }
  const parsed = latest ? parseDayKey(profileDayKey(latest.date)) : null;
  if (!parsed) return { weeklyDue: false, monthlyDue: false, daysSinceLast: null };

  const [ly, lm, ld] = parsed;
  const todayDay = dayNumber(today.getFullYear(), today.getMonth(), today.getDate());
  const lastDay = dayNumber(ly, lm, ld);
  const daysSinceLast = Math.max(0, todayDay - lastDay);

  // Última medición + 1 mes natural, recortado al último día del mes destino.
  const dueFirst = new Date(ly, lm + 1, 1);
  const dueY = dueFirst.getFullYear();
  const dueM = dueFirst.getMonth();
  const dueDay = dayNumber(dueY, dueM, Math.min(ld, daysInMonth(dueY, dueM)));

  const { weekly, monthly } = readWeighInReminders(reminders);
  return {
    weeklyDue: weekly.enabled && daysSinceLast > 7,
    monthlyDue: monthly.enabled && todayDay > dueDay,
    daysSinceLast,
  };
}
