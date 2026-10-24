// Tests de los selectores PUROS de Estadísticas (design feature A, §12).

import { describe, expect, it } from 'vitest';
import type { CardioSession, LoggedSet, ProfileEntry } from '../../../storage';
import type { NutritionInput } from '../../../domain/nutrition';
import {
  epleyOneRepMax,
  rangeStart,
  selectAdherenceStats,
  selectBodyStats,
  selectCardioProgress,
  selectCardioRecords,
  selectCardioStats,
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

let cardioId = 0;
function cardio(date: string, over: Partial<CardioSession> = {}): CardioSession {
  return {
    id: ++cardioId,
    date,
    type: 'correr',
    durationMin: 30,
    distanceKm: 5,
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

describe('selectBodyStats · empate de día', () => {
  it('dos entradas del mismo día conservan ambos puntos, ordenados por id', () => {
    const history = [
      profile('2026-10-17', { id: 5, weightKg: 75 }),
      profile('2026-10-17T08:00:00.000Z', { id: 2, weightKg: 72 }),
      profile('2026-10-10', { id: 1, weightKg: 76 }),
    ];
    const stats = selectBodyStats(history, 'todo', new Date('2026-10-18T12:00:00.000Z'));
    expect(stats.weight.map((p) => p.value)).toEqual([76, 72, 75]);
    expect(stats.weight.map((p) => p.date)).toEqual(['2026-10-10', '2026-10-17', '2026-10-17']);
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

  it('nombra los ejercicios sustitutos desde la base de sustituciones', () => {
    const stats = selectStrengthStats(
      [set('2024-06-12T07:00:00.000Z', { exerciseId: 'db_bench_press' })],
      'todo',
      NOW,
    );
    expect(stats.progress[0].name).toBe('Press de banca con mancuernas');
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

describe('selectCardioStats', () => {
  const sessions: CardioSession[] = [
    // Semana del lunes 2024-06-10.
    cardio('2024-06-10T07:00:00.000Z', { type: 'correr', durationMin: 30, distanceKm: 5 }),
    cardio('2024-06-12T07:00:00.000Z', { type: 'bici', durationMin: 60, distanceKm: 20 }),
    cardio('2024-06-14T07:00:00.000Z', { type: 'correr', durationMin: 25, distanceKm: 4 }),
    // Fuera del rango mes.
    cardio('2024-01-01T07:00:00.000Z', { type: 'bici', durationMin: 90, distanceKm: 30 }),
  ];

  it('suma total de km/min y nº de sesiones en el rango', () => {
    const stats = selectCardioStats(sessions, 'mes', NOW);
    expect(stats.sessions).toBe(3);
    expect(stats.totalKm).toBeCloseTo(29, 5);
    expect(stats.totalMin).toBe(115);
  });

  it('desglosa por tipo correr vs bici', () => {
    const stats = selectCardioStats(sessions, 'mes', NOW);
    expect(stats.byType.correr.sessions).toBe(2);
    expect(stats.byType.correr.km).toBeCloseTo(9, 5);
    expect(stats.byType.bici.sessions).toBe(1);
    expect(stats.byType.bici.km).toBeCloseTo(20, 5);
  });

  it('agrupa por semana ISO y respeta el filtro de rango', () => {
    const stats = selectCardioStats(sessions, 'mes', NOW);
    // Las 3 sesiones del rango caen en la semana del lunes 2024-06-10.
    expect(stats.perWeek).toHaveLength(1);
    expect(stats.perWeek[0].weekStart).toBe('2024-06-10');
    expect(stats.perWeek[0].km).toBeCloseTo(29, 5);
    // La de enero queda fuera del rango 'mes'.
    const todo = selectCardioStats(sessions, 'todo', NOW);
    expect(todo.sessions).toBe(4);
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
    const stats = selectAdherenceStats(sets, history, [], 'mes', NOW);
    expect(stats.workoutsCompleted).toBe(2);
    expect(stats.daysWithWeightLog).toBe(2); // la de enero queda fuera del mes
    expect(stats.rangeDays).toBe(30);
  });

  it('rango todo no limita y expone rangeDays null', () => {
    const stats = selectAdherenceStats(sets, history, [], 'todo', NOW);
    expect(stats.daysWithWeightLog).toBe(3);
    expect(stats.rangeDays).toBeNull();
  });

  it('cuenta cardio y hace la unión de días de fuerza y cardio', () => {
    const cardioSessions: CardioSession[] = [
      // Mismo día que un entreno de fuerza → la unión no lo cuenta dos veces.
      cardio('2024-06-10T18:00:00.000Z'),
      // Día de solo cardio.
      cardio('2024-06-12T18:00:00.000Z'),
    ];
    const stats = selectAdherenceStats(sets, history, cardioSessions, 'mes', NOW);
    expect(stats.workoutsCompleted).toBe(2); // fuerza: 06-10 y 06-14
    expect(stats.cardioDays).toBe(2); // cardio: 06-10 y 06-12
    // Unión de {06-10, 06-14} ∪ {06-10, 06-12} = {06-10, 06-12, 06-14} = 3.
    expect(stats.trainingDays).toBe(3);
  });
});

describe('selectCardioRecords', () => {
  const sessions: CardioSession[] = [
    // Correr: tres sesiones; la segunda es la más rápida (menor ritmo).
    cardio('2024-06-10T07:00:00.000Z', {
      type: 'correr',
      durationSec: 1800,
      durationMin: 30,
      distanceKm: 5,
    }), // 360 s/km
    cardio('2024-06-12T07:00:00.000Z', {
      type: 'correr',
      durationSec: 1500,
      durationMin: 25,
      distanceKm: 5,
    }), // 300 s/km (más rápido)
    cardio('2024-06-14T07:00:00.000Z', {
      type: 'correr',
      durationSec: 1680,
      durationMin: 28,
      distanceKm: 6,
    }), // 280 s/km (aún más rápido, es la última)
    // Bici: no debe contaminar los records de correr.
    cardio('2024-06-13T07:00:00.000Z', {
      type: 'bici',
      durationSec: 3600,
      durationMin: 60,
      distanceKm: 25,
    }),
  ];

  it('detecta el mejor (menor) ritmo y la distancia más larga en correr', () => {
    const r = selectCardioRecords(sessions, 'correr', 'todo', NOW);
    expect(r.bestPaceSecPerKm).toBeCloseTo(280, 5); // 1680/6
    expect(r.longestDistanceKm).toBe(6);
    expect(r.longestDurationSec).toBe(1800);
    // Solo entran sesiones de correr: la mejor velocidad se calcula sobre
    // esas mismas sesiones (la bici no contamina). 1680 s para 6 km ⇒ ~12.86 km/h.
    expect(r.bestSpeedKmH).toBeCloseTo((6 / 1680) * 3600, 5);
  });

  it('lastPaceIsPR true cuando la última sesión del rango es la más rápida', () => {
    const r = selectCardioRecords(sessions, 'correr', 'todo', NOW);
    // La última (06-14, 280 s/km) es la más rápida ⇒ PR.
    expect(r.lastPaceIsPR).toBe(true);
  });

  it('lastPaceIsPR false cuando la última no mejora el mejor ritmo', () => {
    const withSlowLast: CardioSession[] = [
      ...sessions,
      cardio('2024-06-15T07:00:00.000Z', {
        type: 'correr',
        durationSec: 2000,
        durationMin: 33,
        distanceKm: 5,
      }), // 400 s/km, lento
    ];
    const r = selectCardioRecords(withSlowLast, 'correr', 'todo', NOW);
    expect(r.lastPaceIsPR).toBe(false);
  });

  it('calcula la mejor velocidad en bici sin mezclarse con correr', () => {
    const r = selectCardioRecords(sessions, 'bici', 'todo', NOW);
    expect(r.bestSpeedKmH).toBeCloseTo(25, 5); // 25 km en 3600 s
    expect(r.bestPaceSecPerKm).toBeCloseTo(144, 5); // 3600/25
    expect(r.longestDistanceKm).toBe(25);
  });

  it('ignora sesiones con distancia <= 0 para ritmo/velocidad', () => {
    const bad: CardioSession[] = [
      cardio('2024-06-11T07:00:00.000Z', {
        type: 'correr',
        durationSec: 1200,
        durationMin: 20,
        distanceKm: 0,
      }),
    ];
    const r = selectCardioRecords(bad, 'correr', 'todo', NOW);
    expect(r.bestPaceSecPerKm).toBeNull();
    // La duración/distancia siguen contando como "más larga" aunque km sea 0.
    expect(r.longestDistanceKm).toBe(0);
    expect(r.longestDurationSec).toBe(1200);
  });

  it('deriva la duración de datos antiguos (solo durationMin)', () => {
    const legacy: CardioSession[] = [
      cardio('2024-06-10T07:00:00.000Z', {
        type: 'correr',
        durationMin: 30,
        distanceKm: 6,
        durationSec: undefined,
      }),
    ];
    const r = selectCardioRecords(legacy, 'correr', 'todo', NOW);
    // 30 min → 1800 s; ritmo 1800/6 = 300 s/km.
    expect(r.longestDurationSec).toBe(1800);
    expect(r.bestPaceSecPerKm).toBeCloseTo(300, 5);
  });
});

describe('selectCardioProgress', () => {
  const sessions: CardioSession[] = [
    cardio('2024-06-14T07:00:00.000Z', {
      type: 'correr',
      durationSec: 1680,
      durationMin: 28,
      distanceKm: 6,
    }),
    cardio('2024-06-10T07:00:00.000Z', {
      type: 'correr',
      durationSec: 1800,
      durationMin: 30,
      distanceKm: 5,
    }),
    cardio('2024-06-12T07:00:00.000Z', {
      type: 'bici',
      durationSec: 3600,
      durationMin: 60,
      distanceKm: 25,
    }),
    // Distancia 0 ⇒ no entra en la serie.
    cardio('2024-06-11T07:00:00.000Z', {
      type: 'correr',
      durationSec: 1200,
      durationMin: 20,
      distanceKm: 0,
    }),
  ];

  it('ordena por fecha ascendente y mapea pace a seg/km', () => {
    const p = selectCardioProgress(sessions, 'correr', 'todo', NOW);
    expect(p.paceSeries.map((s) => s.date)).toEqual(['2024-06-10', '2024-06-14']);
    expect(p.paceSeries[0].value).toBeCloseTo(360, 5); // 1800/5
    expect(p.paceSeries[1].value).toBeCloseTo(280, 5); // 1680/6
  });

  it('mapea la serie de velocidad de bici a km/h', () => {
    const p = selectCardioProgress(sessions, 'bici', 'todo', NOW);
    expect(p.speedSeries).toHaveLength(1);
    expect(p.speedSeries[0].value).toBeCloseTo(25, 5);
  });
});
