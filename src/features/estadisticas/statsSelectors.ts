// Selectores de estadísticas — capa PURA, testeable (sin React, sin storage).
// Derivan series y resúmenes a partir del histórico de ProfileEntry y los
// LoggedSet, filtrando por un rango temporal (design: feature A, Estadísticas).

import type { LoggedSet, ProfileEntry } from '../../storage';
import {
  buildDailyPlan,
  type DailyPlan,
  type NutritionInput,
} from '../../domain/nutrition';
import { routine } from '../../domain/routine';

/** Rango temporal del selector Semana/Mes/Todo. */
export type StatsRange = 'semana' | 'mes' | 'todo';

/** Días naturales cubiertos por cada rango ('todo' = sin límite). */
export const RANGE_DAYS: Record<Exclude<StatsRange, 'todo'>, number> = {
  semana: 7,
  mes: 30,
};

/** Punto de una serie temporal (fecha ISO corta + valor). */
export interface SeriesPoint {
  date: string; // 'YYYY-MM-DD'
  value: number;
}

/** Series de composición corporal para la pestaña Cuerpo. */
export interface BodyStats {
  weight: SeriesPoint[];
  bodyFat: SeriesPoint[];
  mme: SeriesPoint[];
}

/** Volumen por sesión (un día concreto de entrenamiento registrado). */
export interface SessionVolume {
  date: string; // 'YYYY-MM-DD'
  totalKg: number; // Σ peso×reps de todas las series de ese día
  sets: number; // nº de series registradas
}

/** Volumen agregado por semana ISO. */
export interface WeeklyVolume {
  weekStart: string; // 'YYYY-MM-DD' del lunes de esa semana
  totalKg: number;
}

/** Progresión de fuerza de un ejercicio. */
export interface StrengthProgress {
  exerciseId: string;
  name: string;
  bestWeightKg: number; // mejor peso levantado en el rango
  bestReps: number; // reps en el set de mejor 1RM estimado
  bestOneRepMax: number; // 1RM estimado (Epley) máximo en el rango
}

/** Estadísticas de la pestaña Fuerza. */
export interface StrengthStats {
  perSession: SessionVolume[];
  perWeek: WeeklyVolume[];
  progress: StrengthProgress[];
}

/** Resumen nutricional vs objetivo del plan actual (pestaña Nutrición). */
export interface NutritionSummary {
  targetKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  deficitPct: number; // déficit aplicado sobre el TDEE (20% fijo del plan)
  tdee: number;
  warning?: DailyPlan['warning'];
}

/** Estadísticas de adherencia (pestaña Adherencia). */
export interface AdherenceStats {
  workoutsCompleted: number; // nº de sesiones distintas con sets registrados
  daysWithWeightLog: number; // nº de días distintos con medición de peso
  rangeDays: number | null; // días del rango ('todo' => null)
  perDayWorkouts: SeriesPoint[]; // sesiones por día (0/1) en el rango
}

// --- Helpers de fecha (puros) ---

/** Trunca una fecha ISO (con o sin hora) a 'YYYY-MM-DD'. */
export function toDayKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Fecha de inicio (inclusive) de un rango respecto a `now`. Para 'semana'/'mes'
 * resta los días correspondientes; para 'todo' devuelve null (sin límite).
 */
export function rangeStart(range: StatsRange, now: Date): Date | null {
  if (range === 'todo') return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  // Incluye el día de hoy: 'semana' = hoy + 6 días previos.
  start.setDate(start.getDate() - (RANGE_DAYS[range] - 1));
  return start;
}

/** True si `iso` cae dentro del rango [start, now] (start null => sin límite). */
function inRange(iso: string, start: Date | null, now: Date): boolean {
  if (!start) return true;
  const t = new Date(toDayKey(iso)).getTime();
  const startDay = new Date(toDayKey(start.toISOString())).getTime();
  const nowDay = new Date(toDayKey(now.toISOString())).getTime();
  return t >= startDay && t <= nowDay;
}

/** Lunes (00:00) de la semana ISO que contiene `iso`, como 'YYYY-MM-DD'. */
export function weekStartKey(iso: string): string {
  const d = new Date(toDayKey(iso));
  const day = d.getUTCDay(); // 0=domingo … 6=sábado
  const diff = (day + 6) % 7; // días desde el lunes
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/** 1RM estimado por la fórmula de Epley: peso × (1 + reps/30). */
export function epleyOneRepMax(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

// --- Selectores ---

/** Series de peso/%grasa/MME filtradas por rango (pestaña Cuerpo). */
export function selectBodyStats(
  history: ProfileEntry[],
  range: StatsRange,
  now: Date = new Date(),
): BodyStats {
  const start = rangeStart(range, now);
  const entries = history
    .filter((e) => inRange(e.date, start, now))
    .slice()
    .sort((a, b) => toDayKey(a.date).localeCompare(toDayKey(b.date)));

  return {
    weight: entries.map((e) => ({ date: toDayKey(e.date), value: e.weightKg })),
    bodyFat: entries.map((e) => ({ date: toDayKey(e.date), value: e.bodyFatPct })),
    mme: entries.map((e) => ({ date: toDayKey(e.date), value: e.mmeKg })),
  };
}

/**
 * Volumen de entrenamiento y progresión de fuerza (pestaña Fuerza).
 * - Volumen por sesión = Σ peso×reps de todas las series de un mismo día.
 * - Volumen por semana = Σ de los volúmenes de sesión de esa semana ISO.
 * - Progresión por ejercicio = mejor 1RM estimado (Epley) y el mejor peso.
 */
export function selectStrengthStats(
  sets: LoggedSet[],
  range: StatsRange,
  now: Date = new Date(),
): StrengthStats {
  const start = rangeStart(range, now);
  const filtered = sets.filter((s) => inRange(s.date, start, now));

  // Volumen por sesión (día natural).
  const byDay = new Map<string, SessionVolume>();
  for (const s of filtered) {
    const key = toDayKey(s.date);
    const acc = byDay.get(key) ?? { date: key, totalKg: 0, sets: 0 };
    acc.totalKg += s.weightKg * s.reps;
    acc.sets += 1;
    byDay.set(key, acc);
  }
  const perSession = Array.from(byDay.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  // Volumen por semana ISO.
  const byWeek = new Map<string, number>();
  for (const session of perSession) {
    const wk = weekStartKey(session.date);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + session.totalKg);
  }
  const perWeek: WeeklyVolume[] = Array.from(byWeek.entries())
    .map(([weekStart, totalKg]) => ({ weekStart, totalKg }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  // Nombre legible por ejercicio (desde la rutina).
  const nameById = new Map<string, string>();
  for (const day of routine) {
    for (const ex of day.exercises) nameById.set(ex.id, ex.name);
  }

  // Progresión por ejercicio: mejor 1RM estimado (y mejor peso absoluto).
  const byExercise = new Map<string, StrengthProgress>();
  for (const s of filtered) {
    const orm = epleyOneRepMax(s.weightKg, s.reps);
    const current = byExercise.get(s.exerciseId);
    if (!current) {
      byExercise.set(s.exerciseId, {
        exerciseId: s.exerciseId,
        name: nameById.get(s.exerciseId) ?? s.exerciseId,
        bestWeightKg: s.weightKg,
        bestReps: s.reps,
        bestOneRepMax: orm,
      });
      continue;
    }
    if (orm > current.bestOneRepMax) {
      current.bestOneRepMax = orm;
      current.bestReps = s.reps;
    }
    if (s.weightKg > current.bestWeightKg) {
      current.bestWeightKg = s.weightKg;
    }
  }
  const progress = Array.from(byExercise.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return { perSession, perWeek, progress };
}

/**
 * Resumen nutricional vs objetivo del plan actual (pestaña Nutrición).
 * El rango no filtra: el plan es siempre el derivado del perfil más reciente
 * (design §6.4, el plan nunca se persiste). Devuelve null si falta el input.
 */
export function selectNutritionSummary(
  input: NutritionInput | null,
): NutritionSummary | null {
  if (!input) return null;
  const plan = buildDailyPlan(input);
  return {
    targetKcal: plan.targetKcal,
    proteinG: plan.totals.proteinG,
    carbsG: plan.totals.carbsG,
    fatG: plan.totals.fatG,
    deficitPct: plan.tdee > 0 ? 1 - plan.targetKcal / plan.tdee : 0,
    tdee: plan.tdee,
    warning: plan.warning,
  };
}

/**
 * Adherencia (pestaña Adherencia): entrenos completados (sesiones distintas con
 * sets registrados) y días con registro de peso (mediciones Evolt distintas),
 * ambos dentro del rango.
 */
export function selectAdherenceStats(
  sets: LoggedSet[],
  history: ProfileEntry[],
  range: StatsRange,
  now: Date = new Date(),
): AdherenceStats {
  const start = rangeStart(range, now);

  const workoutDays = new Set<string>();
  for (const s of sets) {
    if (inRange(s.date, start, now)) workoutDays.add(toDayKey(s.date));
  }

  const weightDays = new Set<string>();
  for (const e of history) {
    if (inRange(e.date, start, now)) weightDays.add(toDayKey(e.date));
  }

  const perDayWorkouts: SeriesPoint[] = Array.from(workoutDays)
    .sort((a, b) => a.localeCompare(b))
    .map((date) => ({ date, value: 1 }));

  return {
    workoutsCompleted: workoutDays.size,
    daysWithWeightLog: weightDays.size,
    rangeDays: range === 'todo' ? null : RANGE_DAYS[range],
    perDayWorkouts,
  };
}
