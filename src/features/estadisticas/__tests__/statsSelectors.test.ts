// Tests de los selectores PUROS de Estadísticas (design feature A, §12).

import { describe, expect, it } from 'vitest';
import type { LoggedSet, ProfileEntry } from '../../../storage';
import type { NutritionInput } from '../../../domain/nutrition';
import {
  epleyOneRepMax,
  rangeStart,
  selectAdherenceStats,
  selectBodyStats,
  selectNutritionSummary,
  selectStrengthStats,
  toDayKey,
  weekStartKey,
} from '../statsSelectors';

// Fecha de referencia fija para que los rangos sean deterministas.
const NOW = new Date('2024-06-15T12:00:00.000Z');

function profile(date: string, over: Partial<ProfileEntry> = {}): ProfileEntry {
  return {
    id: 0,
    date,
    age: 30,
    heightCm: 178,
    sex: 'M',
    weightKg: 80,
    bodyFatPct: 15,
    mmeKg: 38,
    ...over,
  };
}

function set(date: string, over: Partial<LoggedSet> = {}): LoggedSet {
  return {
    id: 0,
    date,
    dayId: 'torsoA',
    exerciseId: 'bench_press',
    setIndex: 1,
    weightKg: 60,
    reps: 10,
    ...over,
  };
}

describe('epleyOneRepMax', () => {
  it('aplica peso × (1 + reps/30)', () => {
    expect(epleyOneRepMax(100, 0)).toBe(100);
    expect(epleyOneRepMax(100, 30)).toBe(200);
    expect(epleyOneRepMax(60, 10)).toBeCloseTo(80, 5);
  });
});

describe('helpers de fecha', () => {
  it('toDayKey trunca a YYYY-MM-DD', () => {
    expect(toDayKey('2024-06-15T07:30:00.000Z')).toBe('2024-06-15');
  });

  it('weekStartKey devuelve el lunes de la semana', () => {
    // 2024-06-15 es sábado → lunes 2024-06-10.
    expect(weekStartKey('2024-06-15T00:00:00.000Z')).toBe('2024-06-10');
    // 2024-06-10 es lunes → se mantiene.
    expect(weekStartKey('2024-06-10')).toBe('2024-06-10');
  });

  it('rangeStart: semana cubre 7 días (hoy + 6 previos); todo = null', () => {
    const start = rangeStart('semana', NOW);
    expect(start).not.toBeNull();
    // Robusto a zona horaria: medimos el span en días desde el inicio del día
    // local de start hasta el inicio del día local de NOW.
    const startDay = new Date(start!);
    startDay.setHours(0, 0, 0, 0);
    const nowDay = new Date(NOW);
    nowDay.setHours(0, 0, 0, 0);
    const spanDays = Math.round((nowDay.getTime() - startDay.getTime()) / 86_400_000);
    expect(spanDays).toBe(6); // hoy + 6 días previos = ventana de 7 días
    expect(rangeStart('todo', NOW)).toBeNull();
  });
});

describe('selectBodyStats', () => {
  const history = [
    profile('2024-05-01', { weightKg: 85 }),
    profile('2024-06-10', { weightKg: 82 }),
    profile('2024-06-14', { weightKg: 81 }),
  ];

  it('filtra por rango semana (solo últimas entradas)', () => {
    const stats = selectBodyStats(history, 'semana', NOW);
    expect(stats.weight.map((p) => p.value)).toEqual([82, 81]);
  });

  it('rango todo incluye todo el histórico, ordenado por fecha', () => {
    const stats = selectBodyStats(history, 'todo', NOW);
    expect(stats.weight.map((p) => p.date)).toEqual([
      '2024-05-01',
      '2024-06-10',
      '2024-06-14',
    ]);
  });
});

describe('selectStrengthStats', () => {
  const sets: LoggedSet[] = [
    // Sesión del 2024-06-10 (lunes): dos series.
    set('2024-06-10T07:00:00.000Z', { weightKg: 60, reps: 10 }), // vol 600, 1RM 80
    set('2024-06-10T07:05:00.000Z', { weightKg: 60, reps: 8 }), // vol 480, 1RM 76
    // Sesión del 2024-06-14 (viernes misma semana): mejor peso.
    set('2024-06-14T07:00:00.000Z', { weightKg: 70, reps: 6 }), // vol 420, 1RM 84
    // Ejercicio distinto.
    set('2024-06-14T07:10:00.000Z', { exerciseId: 'back_squat', weightKg: 100, reps: 5 }),
  ];

  it('calcula volumen por sesión (Σ peso×reps por día)', () => {
    const stats = selectStrengthStats(sets, 'todo', NOW);
    const session = stats.perSession.find((s) => s.date === '2024-06-10');
    expect(session?.totalKg).toBe(600 + 480);
    expect(session?.sets).toBe(2);
  });

  it('agrega volumen por semana ISO', () => {
    const stats = selectStrengthStats(sets, 'todo', NOW);
    // Ambas sesiones caen en la semana del lunes 2024-06-10.
    const week = stats.perWeek.find((w) => w.weekStart === '2024-06-10');
    expect(week?.totalKg).toBe(600 + 480 + 420 + 500);
  });

  it('progresión por ejercicio: mejor 1RM Epley y mejor peso', () => {
    const stats = selectStrengthStats(sets, 'todo', NOW);
    const bench = stats.progress.find((p) => p.exerciseId === 'bench_press');
    // Mejor 1RM: 70×(1+6/30)=84 supera a 80 y 76.
    expect(bench?.bestOneRepMax).toBeCloseTo(84, 5);
    expect(bench?.bestReps).toBe(6);
    expect(bench?.bestWeightKg).toBe(70);
    expect(bench?.name).toBe('Press banca con barra');
  });

  it('respeta el filtro de rango', () => {
    const old: LoggedSet[] = [set('2024-01-01', { weightKg: 999, reps: 1 })];
    const stats = selectStrengthStats([...sets, ...old], 'mes', NOW);
    // La serie de enero queda fuera del mes.
    expect(stats.progress.every((p) => p.bestWeightKg !== 999)).toBe(true);
  });
});

describe('selectNutritionSummary', () => {
  it('devuelve objetivo, macros y déficit del plan actual', () => {
    const input: NutritionInput = {
      weightKg: 80,
      bodyFatPct: 15,
      mmeKg: 38,
      activityFactor: 1.375,
      proteinGPerKg: 2.0,
      bmrBasis: 'lbm',
      trainingStart: '07:00',
    };
    const summary = selectNutritionSummary(input);
    expect(summary).not.toBeNull();
    // Déficit del plan = 20% (design §6.1).
    expect(summary!.deficitPct).toBeCloseTo(0.2, 5);
    expect(Math.round(summary!.targetKcal)).toBe(2023);
    expect(summary!.proteinG).toBeGreaterThan(0);
  });

  it('devuelve null si no hay input', () => {
    expect(selectNutritionSummary(null)).toBeNull();
  });
});

describe('selectAdherenceStats', () => {
  const sets: LoggedSet[] = [
    set('2024-06-10T07:00:00.000Z'),
    set('2024-06-10T07:05:00.000Z'), // mismo día → cuenta 1 entreno
    set('2024-06-14T07:00:00.000Z'),
  ];
  const history = [profile('2024-06-10'), profile('2024-06-14'), profile('2024-01-01')];

  it('cuenta entrenos (días distintos) y días con registro de peso', () => {
    const stats = selectAdherenceStats(sets, history, 'mes', NOW);
    expect(stats.workoutsCompleted).toBe(2);
    expect(stats.daysWithWeightLog).toBe(2); // la de enero queda fuera del mes
    expect(stats.rangeDays).toBe(30);
  });

  it('rango todo no limita y expone rangeDays null', () => {
    const stats = selectAdherenceStats(sets, history, 'todo', NOW);
    expect(stats.daysWithWeightLog).toBe(3);
    expect(stats.rangeDays).toBeNull();
  });
});
