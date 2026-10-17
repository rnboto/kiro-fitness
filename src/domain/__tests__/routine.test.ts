import { describe, it, expect } from 'vitest';
import {
  routine,
  routinesByPhase,
  defaultImageUrl,
  defaultEndImageUrl,
  resolveImageUrl,
} from '../routine';

const PREFIX = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

/** Conjunto verificado de 36 freeExerciseDbId (enhance-plan.md). */
const VERIFIED_IDS = new Set([
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
]);

const allDays = [...routinesByPhase.semana1, ...routinesByPhase.semana2plus];

describe('URLs de imagen por defecto', () => {
  it('defaultImageUrl deriva /0.jpg desde el freeExerciseDbId', () => {
    expect(defaultImageUrl('Barbell_Squat')).toBe(`${PREFIX}Barbell_Squat/0.jpg`);
  });

  it('defaultEndImageUrl deriva /1.jpg', () => {
    expect(defaultEndImageUrl('Barbell_Squat')).toBe(`${PREFIX}Barbell_Squat/1.jpg`);
  });

  it('cada ejercicio de ambas fases tiene imageUrl/endImageUrl bien formadas', () => {
    for (const day of allDays) {
      for (const ex of day.exercises) {
        expect(ex.imageUrl).toBe(`${PREFIX}${ex.freeExerciseDbId}/0.jpg`);
        expect(ex.endImageUrl).toBe(`${PREFIX}${ex.freeExerciseDbId}/1.jpg`);
      }
    }
  });
});

describe('resolveImageUrl', () => {
  const ex = routinesByPhase.semana1[0].exercises[0];

  it('el override prevalece sobre el default', () => {
    const resolved = resolveImageUrl(ex, { imageUrl: 'https://x/custom.gif' });
    expect(resolved.imageUrl).toBe('https://x/custom.gif');
    // endImageUrl sin override cae al default del ejercicio.
    expect(resolved.endImageUrl).toBe(ex.endImageUrl);
  });

  it('sin override devuelve los defaults del ejercicio', () => {
    const resolved = resolveImageUrl(ex);
    expect(resolved.imageUrl).toBe(ex.imageUrl);
    expect(resolved.endImageUrl).toBe(ex.endImageUrl);
  });
});

describe('estructura de la rutina (dos fases)', () => {
  it('routinesByPhase tiene las claves semana1 y semana2plus', () => {
    expect(Object.keys(routinesByPhase).sort()).toEqual(['semana1', 'semana2plus']);
  });

  it('cada fase tiene exactamente 4 días', () => {
    expect(routinesByPhase.semana1).toHaveLength(4);
    expect(routinesByPhase.semana2plus).toHaveLength(4);
  });

  it('ids de día Superior/Inferior con prefijo de fase', () => {
    expect(routinesByPhase.semana1.map((d) => d.id)).toEqual(['f1-sup-a', 'f1-inf-a', 'f1-sup-b', 'f1-inf-b']);
    expect(routinesByPhase.semana2plus.map((d) => d.id)).toEqual(['f2-sup-a', 'f2-inf-a', 'f2-sup-b', 'f2-inf-b']);
  });

  it('los 8 ids de día son únicos entre fases', () => {
    const ids = allDays.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(8);
  });

  it('cada día tiene 5 o 6 ejercicios y la fase suma 22', () => {
    for (const phase of [routinesByPhase.semana1, routinesByPhase.semana2plus]) {
      for (const day of phase) {
        expect(day.exercises.length).toBeGreaterThanOrEqual(5);
        expect(day.exercises.length).toBeLessThanOrEqual(6);
      }
      const total = phase.reduce((sum, d) => sum + d.exercises.length, 0);
      expect(total).toBe(22);
    }
  });

  it('cada día expone shortName; los de una fase son Superior/Inferior A/B', () => {
    const expected = ['Superior A', 'Inferior A', 'Superior B', 'Inferior B'];
    expect(routinesByPhase.semana1.map((d) => d.shortName)).toEqual(expected);
    expect(routinesByPhase.semana2plus.map((d) => d.shortName)).toEqual(expected);
  });

  it('frecuencia 2×/semana: cada grupo principal aparece en 2 días por fase', () => {
    const principales: Array<(typeof allDays)[number]['muscles'][number]> = [
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'glutes', 'hamstrings', 'calves',
    ];
    for (const phase of [routinesByPhase.semana1, routinesByPhase.semana2plus]) {
      const count = new Map<string, number>();
      for (const day of phase) {
        for (const m of day.muscles) {
          count.set(m, (count.get(m) ?? 0) + 1);
        }
      }
      for (const muscle of principales) {
        expect(count.get(muscle)).toBe(2);
      }
    }
  });

  it('cada WorkoutDay.muscles es la unión de-duplicada de sus ejercicios', () => {
    for (const day of allDays) {
      const expected = new Set(day.exercises.flatMap((ex) => ex.targetMuscles));
      expect(new Set(day.muscles)).toEqual(expected);
      // sin duplicados
      expect(day.muscles.length).toBe(new Set(day.muscles).size);
    }
  });

  it('todo freeExerciseDbId usado está en el set verificado', () => {
    const used = new Set<string>();
    for (const day of allDays) {
      for (const ex of day.exercises) {
        expect(VERIFIED_IDS.has(ex.freeExerciseDbId)).toBe(true);
        used.add(ex.freeExerciseDbId);
      }
    }
    // y cada id verificado usado es alcanzable (se refleja a sí mismo).
    for (const id of used) {
      expect(VERIFIED_IDS.has(id)).toBe(true);
    }
  });
});

describe('alias de compatibilidad', () => {
  it('routine es la fase semana1', () => {
    expect(routine).toBe(routinesByPhase.semana1);
  });
});
