import { describe, expect, it } from 'vitest';
import type { ProfileEntry } from '../../storage';
import {
  computeGoalProgress,
  computeWeightPace,
  estimateWeeksRemaining,
  quickGoalOptions,
  readGoal,
  sanitizeGoalKeys,
  validateGoalTarget,
} from '../goal';

// Pesos sintéticos (90 → 84…): nunca los números personales del usuario.
// Fecha de referencia local; el ritmo se ancla a "hoy" local.
const NOW = new Date(2026, 9, 17, 12, 0, 0); // 2026-10-17 local

function dayKey(daysAgo: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

let nextId = 1;
function entry(daysAgo: number, weightKg: number, id = nextId++): ProfileEntry {
  return {
    id,
    date: dayKey(daysAgo),
    age: 30,
    heightCm: 178,
    sex: 'M',
    weightKg,
    bodyFatPct: 20,
    mmeKg: 35,
  };
}

describe('readGoal', () => {
  it('ajustes antiguos o ausentes → nulls', () => {
    expect(readGoal(undefined)).toEqual({ goalWeightKg: null, goalStartWeightKg: null });
    expect(readGoal(null)).toEqual({ goalWeightKg: null, goalStartWeightKg: null });
    expect(readGoal({})).toEqual({ goalWeightKg: null, goalStartWeightKg: null });
  });

  it('valores basura → null', () => {
    for (const bad of ['abc', NaN, -5, 1000, 10, undefined]) {
      expect(readGoal({ goalWeightKg: bad as never, goalStartWeightKg: 90 })).toEqual({
        goalWeightKg: null,
        goalStartWeightKg: null,
      });
    }
    expect(readGoal({ goalWeightKg: 84, goalStartWeightKg: 'x' as never })).toEqual({
      goalWeightKg: 84,
      goalStartWeightKg: null,
    });
  });

  it('valores válidos se conservan', () => {
    expect(readGoal({ goalWeightKg: 84, goalStartWeightKg: 90 })).toEqual({
      goalWeightKg: 84,
      goalStartWeightKg: 90,
    });
  });

  it('sin objetivo (null) el inicio también es null', () => {
    expect(readGoal({ goalWeightKg: null, goalStartWeightKg: 90 })).toEqual({
      goalWeightKg: null,
      goalStartWeightKg: null,
    });
  });
});

describe('sanitizeGoalKeys', () => {
  it('no añade claves ausentes', () => {
    const out = sanitizeGoalKeys({ a: 1 });
    expect('goalWeightKg' in out).toBe(false);
    expect(out).toEqual({ a: 1 });
  });
  it('sanea solo las presentes', () => {
    expect(sanitizeGoalKeys({ goalWeightKg: 'x', goalStartWeightKg: 90 })).toEqual({
      goalWeightKg: null,
      goalStartWeightKg: 90,
    });
  });
});

describe('computeGoalProgress', () => {
  it('a mitad de camino → 50 %', () => {
    const p = computeGoalProgress({ startKg: 90, currentKg: 87, goalKg: 84 });
    expect(p).toMatchObject({
      direction: 'loss',
      totalKg: 6,
      changedKg: 3,
      remainingKg: 3,
      progressPct: 50,
      reached: false,
    });
  });

  it('actual == inicio → 0 %', () => {
    const p = computeGoalProgress({ startKg: 90, currentKg: 90, goalKg: 84 });
    expect(p.progressPct).toBe(0);
    expect(p.remainingKg).toBe(6);
  });

  it('pasado el objetivo → 100 % y alcanzado, sin restante', () => {
    const p = computeGoalProgress({ startKg: 90, currentKg: 83, goalKg: 84 });
    expect(p.progressPct).toBe(100);
    expect(p.reached).toBe(true);
    expect(p.remainingKg).toBe(0);
  });

  it('alejándose del objetivo → 0 % (acotado) y changed negativo', () => {
    const p = computeGoalProgress({ startKg: 90, currentKg: 92, goalKg: 84 });
    expect(p.progressPct).toBe(0);
    expect(p.changedKg).toBe(-2);
    expect(p.remainingKg).toBe(8);
    expect(p.reached).toBe(false);
  });

  it('objetivo por encima del inicio → dirección gain', () => {
    const p = computeGoalProgress({ startKg: 70, currentKg: 72, goalKg: 76 });
    expect(p).toMatchObject({ direction: 'gain', changedKg: 2, remainingKg: 4, progressPct: 33.3, reached: false });
    expect(computeGoalProgress({ startKg: 70, currentKg: 76, goalKg: 76 }).reached).toBe(true);
  });

  it('inicio == objetivo: 100 % solo si ya está alcanzado', () => {
    expect(computeGoalProgress({ startKg: 80, currentKg: 80, goalKg: 80 }).progressPct).toBe(100);
    expect(computeGoalProgress({ startKg: 80, currentKg: 82, goalKg: 80 }).progressPct).toBe(0);
  });

  it('no arrastra ruido de coma flotante', () => {
    const p = computeGoalProgress({ startKg: 90.3, currentKg: 85.1, goalKg: 84.2 });
    expect(p.changedKg).toBe(5.2);
    expect(p.remainingKg).toBe(0.9);
  });
});

describe('computeWeightPace', () => {
  it('una sola medición → insufficient', () => {
    expect(computeWeightPace([entry(0, 90)], NOW)).toEqual({ status: 'insufficient' });
  });

  it('dos mediciones el mismo día → insufficient', () => {
    expect(computeWeightPace([entry(0, 90), entry(0, 89)], NOW)).toEqual({ status: 'insufficient' });
  });

  it('dos mediciones con 6 días de diferencia → insufficient', () => {
    expect(computeWeightPace([entry(6, 90), entry(0, 89)], NOW)).toEqual({ status: 'insufficient' });
  });

  it('dos mediciones con 7 días de diferencia → ok', () => {
    const pace = computeWeightPace([entry(7, 90), entry(0, 89.5)], NOW);
    expect(pace.status).toBe('ok');
    if (pace.status === 'ok') expect(pace.kgPerWeek).toBeCloseTo(-0.5, 2);
  });

  it('ignora mediciones de hace más de 28 días', () => {
    expect(computeWeightPace([entry(40, 95), entry(0, 89)], NOW)).toEqual({ status: 'insufficient' });
  });

  it('tendencia lineal de −0,5 kg/semana durante 21 días', () => {
    const history = [entry(21, 90), entry(14, 89.5), entry(7, 89), entry(0, 88.5)];
    const pace = computeWeightPace(history, NOW);
    expect(pace.status).toBe('ok');
    if (pace.status === 'ok') {
      expect(pace.kgPerWeek).toBeCloseTo(-0.5, 2);
      expect(pace.points).toBe(4);
      expect(pace.spanDays).toBe(21);
    }
  });

  it('mismo día: gana el id mayor y no distorsiona la pendiente', () => {
    const history = [
      entry(14, 90, 1),
      entry(0, 72, 2), // medición de prueba
      entry(0, 89, 3), // medición real posterior
    ];
    const pace = computeWeightPace(history, NOW);
    expect(pace.status).toBe('ok');
    if (pace.status === 'ok') expect(pace.kgPerWeek).toBeCloseTo(-0.5, 2);
  });

  it('ignora mediciones con fecha futura', () => {
    const future = { ...entry(0, 60), date: '2026-12-31' };
    expect(computeWeightPace([entry(0, 90), future], NOW)).toEqual({ status: 'insufficient' });
  });

  it('formatos con hora se interpretan por día', () => {
    const withTime = { ...entry(0, 89), date: `${dayKey(0)}T08:00:00.000Z` };
    const pace = computeWeightPace([entry(14, 90), withTime], NOW);
    expect(pace.status).toBe('ok');
  });
});

describe('estimateWeeksRemaining', () => {
  const progress = computeGoalProgress({ startKg: 90, currentKg: 87, goalKg: 84 }); // quedan 3 kg

  it('ritmo hacia el objetivo → semanas = restante / ritmo', () => {
    const eta = estimateWeeksRemaining(progress, { status: 'ok', kgPerWeek: -0.5, points: 4, spanDays: 21 });
    expect(eta).toEqual({ status: 'ok', kgPerWeek: -0.5, weeks: 6 });
  });

  it('ritmo plano → flat', () => {
    for (const k of [0.02, -0.02, 0]) {
      expect(
        estimateWeeksRemaining(progress, { status: 'ok', kgPerWeek: k, points: 3, spanDays: 14 }).status,
      ).toBe('flat');
    }
  });

  it('sube cuando el objetivo es bajar → wrongDirection', () => {
    expect(
      estimateWeeksRemaining(progress, { status: 'ok', kgPerWeek: 0.4, points: 3, spanDays: 14 }),
    ).toEqual({ status: 'wrongDirection', kgPerWeek: 0.4 });
  });

  it('objetivo de subida con ritmo negativo → wrongDirection', () => {
    const gain = computeGoalProgress({ startKg: 70, currentKg: 72, goalKg: 76 });
    expect(
      estimateWeeksRemaining(gain, { status: 'ok', kgPerWeek: -0.3, points: 3, spanDays: 14 }).status,
    ).toBe('wrongDirection');
  });

  it('alcanzado gana a todo', () => {
    const reached = computeGoalProgress({ startKg: 90, currentKg: 83, goalKg: 84 });
    expect(estimateWeeksRemaining(reached, { status: 'insufficient' })).toEqual({ status: 'reached' });
  });

  it('datos insuficientes → insufficient (sin inventar número)', () => {
    expect(estimateWeeksRemaining(progress, { status: 'insufficient' })).toEqual({ status: 'insufficient' });
  });
});

describe('quickGoalOptions', () => {
  it('4 opciones derivadas del peso actual dado', () => {
    expect(quickGoalOptions(80).map((o) => [o.label, o.targetKg])).toEqual([
      ['Bajar 5 kg', 75],
      ['Bajar 6 kg', 74],
      ['Bajar 7 kg', 73],
      ['Bajar 10 kg', 70],
    ]);
    expect(quickGoalOptions(95.5)[0].targetKg).toBe(90.5);
  });

  it('descarta objetivos por debajo de 30 kg', () => {
    expect(quickGoalOptions(37).map((o) => o.deltaKg)).toEqual([5, 6, 7]);
    expect(quickGoalOptions(32)).toEqual([]);
  });
});

describe('validateGoalTarget', () => {
  it('no válido / ≤ 0', () => {
    expect(validateGoalTarget(NaN, 80).error).toMatch(/válido/);
    expect(validateGoalTarget(0, 80).error).toMatch(/válido/);
    expect(validateGoalTarget(-3, 80).error).toMatch(/válido/);
  });
  it('fuera de 30–300', () => {
    expect(validateGoalTarget(20, 80).error).toMatch(/entre 30 y 300/);
    expect(validateGoalTarget(301, 80).error).toMatch(/entre 30 y 300/);
  });
  it('igual al peso actual', () => {
    expect(validateGoalTarget(80, 80).error).toMatch(/distinto/);
  });
  it('por encima del actual → aviso, no error', () => {
    const r = validateGoalTarget(85, 80);
    expect(r.error).toBeUndefined();
    expect(r.warning).toMatch(/por encima/);
  });
  it('por debajo → válido sin aviso', () => {
    expect(validateGoalTarget(75, 80)).toEqual({});
  });
});
