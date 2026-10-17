import { describe, it, expect } from 'vitest';
import {
  ABS_CIRCUIT,
  ABS_EXERCISES,
  expandRoutineSteps,
  routineTotalSec,
} from '../absCircuit';

const VERIFIED_IDS = new Set([
  'Crunches',
  'Air_Bike',
  'Cross-Body_Crunch',
  'Flat_Bench_Lying_Leg_Raise',
  'Bent-Knee_Hip_Raise',
  'Dead_Bug',
  'Alternate_Heel_Touchers',
]);

describe('ABS_CIRCUIT — duración derivada (sin drift)', () => {
  it('suma 1740 s = 29 min exactos', () => {
    expect(routineTotalSec(ABS_CIRCUIT)).toBe(1740);
  });

  it('totalMinutes es 29 y deriva de la suma real', () => {
    expect(ABS_CIRCUIT.totalMinutes).toBe(29);
    expect(ABS_CIRCUIT.totalMinutes * 60).toBe(routineTotalSec(ABS_CIRCUIT));
  });
});

describe('ABS_CIRCUIT — expansión de las 3 rondas', () => {
  const steps = expandRoutineSteps(ABS_CIRCUIT);

  it('produce 44 pasos (1 calentamiento + 3×14 + 1 enfriamiento)', () => {
    expect(steps).toHaveLength(44);
  });

  it('empieza en calentamiento (180 s) y termina en enfriamiento (180 s)', () => {
    expect(steps[0].label.toLowerCase()).toContain('calentamiento');
    expect(steps[0].durationSec).toBe(180);
    expect(steps[steps.length - 1].label.toLowerCase()).toContain('enfriamiento');
    expect(steps[steps.length - 1].durationSec).toBe(180);
  });

  it('tiene 21 pasos de trabajo (40 s) y 21 de descanso', () => {
    const inner = steps.slice(1, steps.length - 1); // sin calentamiento/enfriamiento
    const work = inner.filter((s) => s.durationSec === 40);
    const rest = inner.filter((s) => s.label.toLowerCase().startsWith('descanso'));
    expect(work).toHaveLength(21);
    expect(rest).toHaveLength(21);
  });

  it('de los descansos, 18 son de 20 s y 3 de 60 s (descanso entre rondas)', () => {
    const rest20 = steps.filter((s) => s.label === 'Descanso' && s.durationSec === 20);
    const rest60 = steps.filter((s) => s.label === 'Descanso entre rondas' && s.durationSec === 60);
    expect(rest20).toHaveLength(18);
    expect(rest60).toHaveLength(3);
  });

  it('solo los pasos de trabajo llevan freeExerciseDbId', () => {
    const work = steps.filter((s) => s.durationSec === 40);
    const rest = steps.filter((s) => s.label.toLowerCase().startsWith('descanso'));
    expect(work.every((s) => typeof s.freeExerciseDbId === 'string')).toBe(true);
    expect(rest.every((s) => s.freeExerciseDbId === undefined)).toBe(true);
  });
});

describe('ABS_EXERCISES — ids verificados', () => {
  it('tiene exactamente 7 ejercicios', () => {
    expect(ABS_EXERCISES).toHaveLength(7);
  });

  it('cada freeExerciseDbId pertenece al set verificado', () => {
    for (const ex of ABS_EXERCISES) {
      expect(VERIFIED_IDS.has(ex.freeExerciseDbId)).toBe(true);
    }
  });

  it('todo id usado en los pasos expandidos pertenece al set verificado', () => {
    const steps = expandRoutineSteps(ABS_CIRCUIT);
    for (const s of steps) {
      if (s.freeExerciseDbId !== undefined) {
        expect(VERIFIED_IDS.has(s.freeExerciseDbId)).toBe(true);
      }
    }
  });
});
