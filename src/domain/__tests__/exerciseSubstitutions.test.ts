import { describe, expect, it } from 'vitest';
import rawDb from '../../data/exerciseSubstitutions.json';
import { DEFAULT_SETTINGS } from '../../storage/types';
import type { ExerciseSwaps } from '../../storage';
import { routinesByPhase, type Exercise } from '../routine';
import {
  FREE_EXERCISE_DB_ID_RE,
  MUSCLE_IDS,
  SUBSTITUTION_DB,
  SUBSTITUTION_DB_ERRORS,
  alternativesFor,
  applySwap,
  effectiveDayMuscles,
  findSubstitute,
  groupForSlot,
  parseSubstitutionDb,
  pruneExpiredSwaps,
  readExerciseSwaps,
  resolveDayExercises,
  resolveEffectiveExercise,
  restoreSwap,
  sanitizeExerciseSwapsKey,
} from '../exerciseSubstitutions';

/**
 * Ids verificados: los 31 de routine.test.ts + los nuevos de la base de
 * sustituciones (HEAD 200 en 0.jpg y 1.jpg, exercise-substitution-ids.md).
 */
const VERIFIED_IDS = new Set([
  // routine.test.ts
  'Barbell_Bench_Press_-_Medium_Grip',
  'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'Cable_Crossover',
  'Butterfly',
  'Bent_Over_Barbell_Row',
  'Bent_Over_Two-Dumbbell_Row',
  'Chin-Up',
  'Close-Grip_Front_Lat_Pulldown',
  'Barbell_Squat',
  'Barbell_Full_Squat',
  'Leg_Press',
  'Barbell_Lunge',
  'Barbell_Hip_Thrust',
  'Barbell_Glute_Bridge',
  'Glute_Kickback',
  'Barbell_Curl',
  'Alternate_Hammer_Curl',
  'Cable_Preacher_Curl',
  'Alternate_Incline_Dumbbell_Curl',
  'Bench_Dips',
  'Cable_Incline_Triceps_Extension',
  'Band_Skull_Crusher',
  'Arnold_Dumbbell_Press',
  'Alternating_Cable_Shoulder_Press',
  'Alternating_Deltoid_Raise',
  'Back_Flyes_-_With_Bands',
  'Barbell_Shrug',
  'Dumbbell_Shrug',
  'Barbell_Seated_Calf_Raise',
  'Calf_Press',
  'Cable_Wrist_Curl',
  // nuevos (exercise-substitution-ids.md)
  'Dumbbell_Bench_Press',
  'Incline_Dumbbell_Press',
  'Leverage_Chest_Press',
  'Smith_Machine_Bench_Press',
  'Pushups',
  'Dips_-_Chest_Version',
  'Seated_Cable_Rows',
  'One-Arm_Dumbbell_Row',
  'T-Bar_Row_with_Handle',
  'Leverage_Iso_Row',
  'Inverted_Row',
  'Wide-Grip_Lat_Pulldown',
  'V-Bar_Pulldown',
  'Underhand_Cable_Pulldowns',
  'Pullups',
  'Band_Assisted_Pull-Up',
  'Dumbbell_Shoulder_Press',
  'Seated_Barbell_Military_Press',
  'Machine_Shoulder_Military_Press',
  'Handstand_Push-Ups',
  'Side_Lateral_Raise',
  'Cable_Seated_Lateral_Raise',
  'Reverse_Flyes',
  'Face_Pull',
  'Reverse_Machine_Flyes',
  'Seated_Bent-Over_Rear_Delt_Raise',
  'Goblet_Squat',
  'Dumbbell_Lunges',
  'Split_Squat_with_Dumbbells',
  'Hack_Squat',
  'Smith_Machine_Squat',
  'Dumbbell_Step_Ups',
  'Bodyweight_Squat',
  'Bodyweight_Walking_Lunge',
  'Leg_Extensions',
  'Romanian_Deadlift',
  'Pull_Through',
  'Single_Leg_Glute_Bridge',
  'Butt_Lift_Bridge',
  'Hip_Lift_with_Band',
  'Lying_Leg_Curls',
  'Seated_Leg_Curl',
  'Stiff-Legged_Dumbbell_Deadlift',
  'Ball_Leg_Curl',
  'Glute_Ham_Raise',
  'Natural_Glute_Ham_Raise',
  'Standing_Calf_Raises',
  'Seated_Calf_Raise',
  'Smith_Machine_Calf_Raise',
  'Standing_Dumbbell_Calf_Raise',
  'Calf_Raise_On_A_Dumbbell',
  'Dumbbell_Seated_One-Leg_Calf_Raise',
  'Dumbbell_Bicep_Curl',
  'EZ-Bar_Curl',
  'Hammer_Curls',
  'Cable_Hammer_Curls_-_Rope_Attachment',
  'Concentration_Curls',
  'Triceps_Pushdown',
  'Triceps_Pushdown_-_Rope_Attachment',
  'Close-Grip_Barbell_Bench_Press',
  'Dips_-_Triceps_Version',
  'EZ-Bar_Skullcrusher',
  'Standing_Dumbbell_Triceps_Extension',
  'Tricep_Dumbbell_Kickback',
  'Push-Ups_-_Close_Triceps_Position',
  'Body_Tricep_Press',
]);

const allDays = [...routinesByPhase.semana1, ...routinesByPhase.semana2plus];
const allExercises = SUBSTITUTION_DB.groups.flatMap((g) => g.exercises);
const TODAY = '2024-06-10';
const TOMORROW = '2024-06-11';

const day1 = routinesByPhase.semana1[0]; // f1-sup-a
const bench = day1.exercises[0]; // bench_press

describe('integridad del JSON de sustituciones', () => {
  it('se carga sin errores y tiene 11 grupos', () => {
    expect(SUBSTITUTION_DB_ERRORS).toEqual([]);
    expect(SUBSTITUTION_DB.groups).toHaveLength(11);
    expect(allExercises.length).toBe(91);
  });

  it('cada ejercicio de la rutina (ambas fases) pertenece a un grupo', () => {
    for (const day of allDays) {
      for (const ex of day.exercises) {
        expect(groupForSlot(day.id, ex.id), `${day.id}::${ex.id}`).not.toBeNull();
      }
    }
  });

  it('cada hueco tiene ≥ 2 alternativas (excluyendo los otros ejercicios del día)', () => {
    for (const day of allDays) {
      for (const ex of day.exercises) {
        const others = day.exercises.filter((o) => o.id !== ex.id).map((o) => o.id);
        const alts = alternativesFor(day.id, ex, ex.id, others);
        expect(alts.length, `${day.id}::${ex.id}`).toBeGreaterThanOrEqual(2);
        // nunca se ofrece a sí mismo
        expect(alts.some((a) => a.key === ex.id)).toBe(false);
      }
    }
  });

  it('sin claves ni grupos duplicados; ningún grupo repite un ejercicio', () => {
    const keys = allExercises.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    const ids = SUBSTITUTION_DB.groups.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    // también en el JSON crudo (por si el parser descartara algo en silencio)
    const rawKeys = (rawDb as { groups: { exercises: { key: string }[] }[] }).groups.flatMap((g) =>
      g.exercises.map((e) => e.key),
    );
    expect(new Set(rawKeys).size).toBe(rawKeys.length);
    for (const g of SUBSTITUTION_DB.groups) {
      const dbIds = g.exercises.map((e) => e.freeExerciseDbId);
      expect(new Set(dbIds).size, g.id).toBe(dbIds.length);
    }
  });

  it('cada freeExerciseDbId es sintácticamente válido y está verificado', () => {
    for (const e of allExercises) {
      expect(FREE_EXERCISE_DB_ID_RE.test(e.freeExerciseDbId), e.key).toBe(true);
      expect(VERIFIED_IDS.has(e.freeExerciseDbId), e.freeExerciseDbId).toBe(true);
    }
  });

  it('primaryMuscles de cada grupo ⊆ MuscleId', () => {
    for (const g of SUBSTITUTION_DB.groups) {
      expect(g.primaryMuscles.length).toBeGreaterThan(0);
      for (const m of g.primaryMuscles) expect(MUSCLE_IDS).toContain(m);
    }
  });

  it('los originales de la rutina usan el mismo freeExerciseDbId que routine.ts', () => {
    for (const day of allDays) {
      for (const ex of day.exercises) {
        const found = findSubstitute(ex.id);
        expect(found, ex.id).not.toBeNull();
        expect(found?.exercise.freeExerciseDbId).toBe(ex.freeExerciseDbId);
      }
    }
  });

  it('cada grupo salvo bíceps tiene una opción sin material (peso corporal / banda)', () => {
    for (const g of SUBSTITUTION_DB.groups) {
      if (g.id === 'biceps') continue;
      expect(
        g.exercises.some((e) => /peso corporal|banda/.test(e.equipment)),
        g.id,
      ).toBe(true);
    }
  });

  it('el hueco "Curl femoral / puente" usa Isquios; el puente con barra usa bisagra', () => {
    expect(groupForSlot('f1-inf-a', 'glute_bridge')?.id).toBe('isquios');
    expect(groupForSlot('f2-inf-a', 'glute_bridge')?.id).toBe('isquios');
    expect(groupForSlot('f1-inf-b', 'glute_bridge')?.id).toBe('bisagra_cadera');
  });
});

describe('parseSubstitutionDb', () => {
  it('descarta un id inválido y una clave duplicada, reportando errores', () => {
    const { db, errors } = parseSubstitutionDb({
      version: 1,
      groups: [
        {
          id: 'g',
          name: 'G',
          primaryMuscles: ['chest'],
          exercises: [
            { key: 'a', name: 'A', freeExerciseDbId: 'Ok_Id', equipment: 'barra' },
            { key: 'b', name: 'B', freeExerciseDbId: 'bad id/../x', equipment: 'barra' },
            { key: 'a', name: 'A2', freeExerciseDbId: 'Other', equipment: 'barra' },
          ],
        },
      ],
    });
    expect(db.groups[0].exercises.map((e) => e.key)).toEqual(['a']);
    expect(errors.length).toBe(2);
  });

  it('una entrada no-objeto da una base vacía y un error, sin lanzar', () => {
    const { db, errors } = parseSubstitutionDb('nope');
    expect(db.groups).toEqual([]);
    expect(errors.length).toBe(1);
  });
});

describe('resolución pura de sustituciones', () => {
  const hoy: ExerciseSwaps = {
    'f1-sup-a::bench_press': { toKey: 'db_bench_press', scope: 'hoy', date: TODAY },
  };

  it("'hoy' se aplica hoy y caduca mañana; el sustituto hereda la prescripción", () => {
    const r = resolveEffectiveExercise(day1.id, bench, hoy, TODAY);
    expect(r.swap).not.toBeNull();
    expect(r.exercise.id).toBe('db_bench_press');
    expect(r.exercise.name).toBe('Press de banca con mancuernas');
    expect(r.exercise.sets).toBe(bench.sets);
    expect(r.exercise.repsRange).toBe(bench.repsRange);
    expect(r.exercise.restSeconds).toBe(bench.restSeconds);
    expect(r.exercise.targetMuscles).toEqual(['chest', 'triceps', 'shoulders']);
    expect(r.exercise.imageUrl.endsWith('/Dumbbell_Bench_Press/0.jpg')).toBe(true);
    expect(r.exercise.endImageUrl.endsWith('/Dumbbell_Bench_Press/1.jpg')).toBe(true);
    expect(r.original).toBe(bench);

    const later = resolveEffectiveExercise(day1.id, bench, hoy, TOMORROW);
    expect(later.swap).toBeNull();
    expect(later.exercise).toBe(bench);
  });

  it("'fijo' persiste aunque la fecha sea antigua", () => {
    const fijo: ExerciseSwaps = {
      'f1-sup-a::bench_press': { toKey: 'push_up', scope: 'fijo', date: '2020-01-01' },
    };
    expect(resolveEffectiveExercise(day1.id, bench, fijo, TOMORROW).exercise.id).toBe('push_up');
  });

  it('restoreSwap quita la entrada sin mutar la entrada', () => {
    const snapshot = JSON.parse(JSON.stringify(hoy));
    const out = restoreSwap(hoy, day1.id, 'bench_press');
    expect(out).toEqual({});
    expect(hoy).toEqual(snapshot);
    expect(resolveEffectiveExercise(day1.id, bench, out, TODAY).exercise).toBe(bench);
  });

  it('applySwap crea la entrada y con toKey === original la quita', () => {
    const set = applySwap({}, day1.id, 'bench_press', 'db_bench_press', 'fijo', TODAY);
    expect(set).toEqual({
      'f1-sup-a::bench_press': { toKey: 'db_bench_press', scope: 'fijo', date: TODAY },
    });
    expect(applySwap(set, day1.id, 'bench_press', 'bench_press', 'hoy', TODAY)).toEqual({});
  });

  it('toKey desconocido o de otro grupo se ignora', () => {
    const unknown: ExerciseSwaps = {
      'f1-sup-a::bench_press': { toKey: 'nope', scope: 'fijo', date: TODAY },
    };
    expect(resolveEffectiveExercise(day1.id, bench, unknown, TODAY).exercise).toBe(bench);
    const otherGroup: ExerciseSwaps = {
      'f1-sup-a::bench_press': { toKey: 'db_curl', scope: 'fijo', date: TODAY },
    };
    expect(resolveEffectiveExercise(day1.id, bench, otherGroup, TODAY).exercise).toBe(bench);
  });

  it('un sustituto que ya está en otro hueco del día se ignora (sin duplicados)', () => {
    const lungeDay = routinesByPhase.semana1[3]; // f1-inf-b: barbell_lunge, ..., leg_press
    const dup: ExerciseSwaps = {
      'f1-inf-b::barbell_lunge': { toKey: 'leg_press', scope: 'fijo', date: TODAY },
    };
    const ids = resolveDayExercises(lungeDay, dup, TODAY).map((e) => e.exercise.id);
    expect(ids).toEqual(lungeDay.exercises.map((e) => e.id));
  });

  it('pruneExpiredSwaps conserva fijo y hoy-de-hoy; quita hoy antiguos', () => {
    const swaps: ExerciseSwaps = {
      'a::x': { toKey: 'push_up', scope: 'fijo', date: '2020-01-01' },
      'b::x': { toKey: 'push_up', scope: 'hoy', date: TODAY },
      'c::x': { toKey: 'push_up', scope: 'hoy', date: '2024-06-09' },
    };
    expect(Object.keys(pruneExpiredSwaps(swaps, TODAY))).toEqual(['a::x', 'b::x']);
  });

  it('effectiveDayMuscles sin cambios coincide con day.muscles; con cambio es unión válida', () => {
    for (const day of allDays) {
      const m = effectiveDayMuscles(resolveDayExercises(day, {}, TODAY));
      expect(m).toEqual(day.muscles);
    }
    const supB = routinesByPhase.semana1[2]; // f1-sup-b
    const swaps: ExerciseSwaps = {
      'f1-sup-b::hammer_curl': { toKey: 'db_curl', scope: 'hoy', date: TODAY },
    };
    const list = resolveDayExercises(supB, swaps, TODAY);
    const muscles = effectiveDayMuscles(list);
    expect(new Set(muscles)).toEqual(new Set(list.flatMap((e) => e.exercise.targetMuscles)));
    expect(muscles.length).toBe(new Set(muscles).size);
    // 'forearms' venía solo del curl martillo
    expect(muscles).not.toContain('forearms');
  });

  it('resolver no muta los datos de la rutina', () => {
    const before = JSON.stringify(routinesByPhase);
    const swaps: ExerciseSwaps = {};
    for (const day of allDays) {
      for (const ex of day.exercises) {
        const alt = alternativesFor(day.id, ex, ex.id)[0];
        swaps[`${day.id}::${ex.id}`] = { toKey: alt.key, scope: 'fijo', date: TODAY };
      }
    }
    let swapped = 0;
    for (const day of allDays) {
      for (const e of resolveDayExercises(day, swaps, TODAY)) {
        if (!e.swap) continue;
        swapped += 1;
        const sub: Exercise = e.exercise;
        // objeto nuevo, sin compartir arrays con la base
        expect(sub).not.toBe(e.original);
        expect(sub.targetMuscles).not.toBe(e.group?.primaryMuscles);
      }
    }
    expect(swapped).toBeGreaterThan(0);
    expect(JSON.stringify(routinesByPhase)).toBe(before);
  });
});

describe('compatibilidad de Settings (exerciseSwaps)', () => {
  it('ajustes antiguos sin la clave → {}', () => {
    expect('exerciseSwaps' in DEFAULT_SETTINGS).toBe(false);
    expect(readExerciseSwaps({ ...DEFAULT_SETTINGS })).toEqual({});
    expect(readExerciseSwaps(null)).toEqual({});
    expect(readExerciseSwaps(undefined)).toEqual({});
  });

  it('valores corruptos se descartan y los válidos sobreviven', () => {
    const corrupt = (v: unknown) =>
      readExerciseSwaps({ ...DEFAULT_SETTINGS, exerciseSwaps: v as ExerciseSwaps });
    expect(corrupt([1, 2])).toEqual({});
    expect(corrupt('x')).toEqual({});
    expect(corrupt(42)).toEqual({});
    expect(
      corrupt({
        'f1-sup-a::bench_press': { toKey: 'db_bench_press', scope: 'fijo', date: TODAY },
        'f1-sup-a::barbell_row': { toKey: 'seated_cable_row', scope: 'siempre', date: TODAY },
        'f1-sup-a::arnold_press': { toKey: 'db_shoulder_press', scope: 'hoy', date: 'ayer' },
        'f1-sup-a::close_pulldown': { toKey: 'no_existe', scope: 'hoy', date: TODAY },
        'f1-sup-a::barbell_curl': 'db_curl',
        sinSeparador: { toKey: 'db_curl', scope: 'hoy', date: TODAY },
      }),
    ).toEqual({
      'f1-sup-a::bench_press': { toKey: 'db_bench_press', scope: 'fijo', date: TODAY },
    });
  });

  it('sanitizeExerciseSwapsKey no añade la clave si falta y sanea si viene', () => {
    const raw = { activityFactor: 1.5 };
    const out = sanitizeExerciseSwapsKey(raw);
    expect('exerciseSwaps' in out).toBe(false);
    expect(out).toEqual(raw);
    expect(sanitizeExerciseSwapsKey({ exerciseSwaps: 'mal' })).toEqual({ exerciseSwaps: {} });
  });
});
