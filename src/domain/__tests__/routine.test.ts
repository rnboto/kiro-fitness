import { describe, it, expect } from 'vitest';
import {
  routine,
  defaultImageUrl,
  defaultEndImageUrl,
  resolveImageUrl,
  type Exercise,
} from '../routine';

const PREFIX = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

describe('URLs de imagen por defecto', () => {
  it('defaultImageUrl deriva /0.jpg desde el freeExerciseDbId', () => {
    expect(defaultImageUrl('Barbell_Squat')).toBe(`${PREFIX}Barbell_Squat/0.jpg`);
  });

  it('defaultEndImageUrl deriva /1.jpg', () => {
    expect(defaultEndImageUrl('Barbell_Squat')).toBe(`${PREFIX}Barbell_Squat/1.jpg`);
  });

  it('cada ejercicio tiene imageUrl/endImageUrl bien formadas', () => {
    for (const day of routine) {
      for (const ex of day.exercises) {
        expect(ex.imageUrl).toBe(`${PREFIX}${ex.freeExerciseDbId}/0.jpg`);
        expect(ex.endImageUrl).toBe(`${PREFIX}${ex.freeExerciseDbId}/1.jpg`);
      }
    }
  });
});

describe('resolveImageUrl', () => {
  const ex = routine[0].exercises[0];

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

describe('estructura de la rutina', () => {
  it('exactamente 4 días', () => {
    expect(routine).toHaveLength(4);
    expect(routine.map((d) => d.id)).toEqual(['torsoA', 'piernaA', 'torsoB', 'piernaB']);
  });

  it('cada día tiene 5 ejercicios × 3 series', () => {
    for (const day of routine) {
      expect(day.exercises).toHaveLength(5);
      for (const ex of day.exercises) {
        expect(ex.sets).toBe(3);
      }
    }
  });

  it('mapea los 11 freeExerciseDbId del design §8.2', () => {
    const expected = new Set([
      'Barbell_Bench_Press_-_Medium_Grip',
      'Barbell_Squat',
      'Barbell_Deadlift',
      'Standing_Military_Press',
      'Bent_Over_Barbell_Row',
      'Wide-Grip_Lat_Pulldown',
      'Dumbbell_Lunges',
      'Leg_Press',
      'Lying_Leg_Curls',
      'Side_Lateral_Raise',
      'Standing_Calf_Raises',
    ]);
    const used = new Set<string>();
    for (const day of routine) {
      for (const ex of day.exercises) used.add(ex.freeExerciseDbId);
    }
    expect(used).toEqual(expected);
    expect(used.size).toBe(11);
  });

  it('descansos: 45s en lateral_raise y calf_raise, 60s en el resto', () => {
    const all: Exercise[] = routine.flatMap((d) => d.exercises);
    for (const ex of all) {
      if (ex.id === 'lateral_raise' || ex.id === 'calf_raise') {
        expect(ex.restSeconds).toBe(45);
      } else {
        expect(ex.restSeconds).toBe(60);
      }
    }
  });
});
