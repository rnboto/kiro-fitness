// Objetivo de peso: matemáticas PURAS (sin React ni storage). Progreso, ritmo
// real por tendencia lineal (mínimos cuadrados, últimos 28 días) y estimación
// honesta de semanas restantes. Nunca inventa un número si faltan datos.

import type { ProfileEntry, Settings } from '../storage';
import { profileDayKey } from './profileHistory';

export const GOAL_MIN_KG = 30;
export const GOAL_MAX_KG = 300;
/** Ventana (días) para calcular el ritmo real. */
export const PACE_WINDOW_DAYS = 28;
/** Separación mínima (días) entre la primera y la última medición de la ventana. */
export const PACE_MIN_SPAN_DAYS = 7;
/** Por debajo de este ritmo absoluto (kg/semana) la tendencia se considera plana. */
export const PACE_FLAT_KG_PER_WEEK = 0.05;
/** Atajos "Bajar N kg" (siempre relativos al peso actual). */
export const QUICK_GOAL_DELTAS = [5, 6, 7, 10] as const;

const MS_PER_DAY = 86_400_000;

/** Redondea a 1 decimal (evita ruido de coma flotante). */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isValidGoalKg(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= GOAL_MIN_KG && v <= GOAL_MAX_KG;
}

export interface StoredGoal {
  goalWeightKg: number | null;
  goalStartWeightKg: number | null;
}

/**
 * Lectura defensiva del objetivo desde Settings: valores ausentes, corruptos o
 * fuera de rango → null. Sin objetivo (goalWeightKg null) el inicio también es null.
 */
export function readGoal(settings: Partial<Settings> | null | undefined): StoredGoal {
  const goal = settings?.goalWeightKg;
  if (!isValidGoalKg(goal)) return { goalWeightKg: null, goalStartWeightKg: null };
  const start = settings?.goalStartWeightKg;
  return { goalWeightKg: goal, goalStartWeightKg: isValidGoalKg(start) ? start : null };
}

/**
 * Sanea las claves de objetivo de un objeto de ajustes crudo (backup importado)
 * SOLO si están presentes; las ausentes siguen ausentes (backups antiguos intactos).
 */
export function sanitizeGoalKeys(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };
  for (const key of ['goalWeightKg', 'goalStartWeightKg'] as const) {
    if (key in raw) out[key] = isValidGoalKg(raw[key]) ? raw[key] : null;
  }
  return out;
}

export type GoalDirection = 'loss' | 'gain';

/** Dirección del objetivo respecto al peso de partida. */
export function goalDirection(startKg: number, goalKg: number): GoalDirection {
  return goalKg > startKg ? 'gain' : 'loss';
}

export interface GoalProgress {
  direction: GoalDirection;
  /** Distancia total inicio → objetivo (kg, ≥ 0). */
  totalKg: number;
  /** Kg avanzados hacia el objetivo (negativo si se ha ido en sentido contrario). */
  changedKg: number;
  /** Kg que faltan (≥ 0). */
  remainingKg: number;
  /** Progreso 0-100 (acotado). */
  progressPct: number;
  reached: boolean;
}

export function computeGoalProgress(input: {
  startKg: number;
  currentKg: number;
  goalKg: number;
}): GoalProgress {
  const { startKg, currentKg, goalKg } = input;
  const direction = goalDirection(startKg, goalKg);
  const totalKg = Math.abs(goalKg - startKg);
  const changedKg = direction === 'loss' ? startKg - currentKg : currentKg - startKg;
  const remainingKg =
    direction === 'loss' ? Math.max(0, currentKg - goalKg) : Math.max(0, goalKg - currentKg);
  const reached = direction === 'loss' ? currentKg <= goalKg : currentKg >= goalKg;
  let progressPct: number;
  if (reached) progressPct = 100;
  else if (totalKg > 0) progressPct = Math.min(100, Math.max(0, (changedKg / totalKg) * 100));
  else progressPct = 0;
  return {
    direction,
    totalKg: round1(totalKg),
    changedKg: round1(changedKg),
    remainingKg: round1(remainingKg),
    progressPct: round1(progressPct),
    reached,
  };
}

export type WeightPace =
  | { status: 'insufficient' }
  | { status: 'ok'; kgPerWeek: number; points: number; spanDays: number };

/** Nº de día (UTC) de un 'YYYY-MM-DD'. */
function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

function todayDayNumber(now: Date): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / MS_PER_DAY;
}

/**
 * Ritmo real (kg/semana) por regresión lineal por mínimos cuadrados sobre las
 * mediciones de los últimos 28 días (ventana anclada a `now`). Las mediciones
 * del mismo día se colapsan en la de id mayor. Hacen falta ≥ 2 días distintos
 * que abarquen ≥ 7 días; si no, 'insufficient'.
 */
export function computeWeightPace(
  history: readonly ProfileEntry[],
  now: Date = new Date(),
): WeightPace {
  const today = todayDayNumber(now);
  const byDay = new Map<number, ProfileEntry>();
  for (const e of history) {
    const day = dayNumber(profileDayKey(e.date));
    if (!Number.isFinite(day)) continue;
    const age = today - day;
    if (age < 0 || age > PACE_WINDOW_DAYS) continue;
    const prev = byDay.get(day);
    if (!prev || e.id > prev.id) byDay.set(day, e);
  }
  const xs = Array.from(byDay.keys()).sort((a, b) => a - b);
  if (xs.length < 2) return { status: 'insufficient' };
  const spanDays = xs[xs.length - 1] - xs[0];
  if (spanDays < PACE_MIN_SPAN_DAYS) return { status: 'insufficient' };
  const ys = xs.map((x) => (byDay.get(x) as ProfileEntry).weightKg);
  const n = xs.length;
  const meanX = xs.reduce((s, x) => s + x, 0) / n;
  const meanY = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slopePerDay = num / den;
  return { status: 'ok', kgPerWeek: round2(slopePerDay * 7), points: n, spanDays };
}

export type WeeksEstimate =
  | { status: 'reached' }
  | { status: 'insufficient' }
  | { status: 'flat'; kgPerWeek: number }
  | { status: 'wrongDirection'; kgPerWeek: number }
  | { status: 'ok'; kgPerWeek: number; weeks: number };

/** Semanas restantes según el ritmo real; honesto si es plano o va al revés. */
export function estimateWeeksRemaining(progress: GoalProgress, pace: WeightPace): WeeksEstimate {
  if (progress.reached) return { status: 'reached' };
  if (pace.status === 'insufficient') return { status: 'insufficient' };
  const { kgPerWeek } = pace;
  if (Math.abs(kgPerWeek) < PACE_FLAT_KG_PER_WEEK) return { status: 'flat', kgPerWeek };
  const wrong =
    (progress.direction === 'loss' && kgPerWeek > 0) ||
    (progress.direction === 'gain' && kgPerWeek < 0);
  if (wrong) return { status: 'wrongDirection', kgPerWeek };
  return { status: 'ok', kgPerWeek, weeks: progress.remainingKg / Math.abs(kgPerWeek) };
}

export interface QuickGoalOption {
  deltaKg: number;
  label: string;
  targetKg: number;
}

/** Atajos "Bajar N kg" calculados desde el peso actual (nunca fijos). */
export function quickGoalOptions(currentKg: number): QuickGoalOption[] {
  return QUICK_GOAL_DELTAS.map((d) => ({
    deltaKg: d,
    label: `Bajar ${d} kg`,
    targetKg: round1(currentKg - d),
  })).filter((o) => o.targetKg >= GOAL_MIN_KG);
}

/** Valida un peso objetivo manual: errores bloquean, el aviso no. */
export function validateGoalTarget(
  value: number,
  currentKg: number,
): { error?: string; warning?: string } {
  if (!Number.isFinite(value) || value <= 0) {
    return { error: 'Introduce un peso objetivo válido.' };
  }
  if (value < GOAL_MIN_KG || value > GOAL_MAX_KG) {
    return { error: `El objetivo debe estar entre ${GOAL_MIN_KG} y ${GOAL_MAX_KG} kg.` };
  }
  if (round1(value) === round1(currentKg)) {
    return { error: 'El objetivo debe ser distinto de tu peso actual.' };
  }
  if (value > currentKg) {
    return {
      warning: 'Tu objetivo está por encima de tu peso actual: se contará como objetivo de subida.',
    };
  }
  return {};
}
