// Capa PURA del circuito de abdominales / core (sin React ni storage). Define
// el "Circuito Core (~30 min)" como datos estáticos tipados y reutiliza los
// helpers de expansión y suma de duración de cardioRoutines (que operan sobre
// cualquier objeto con `elements`). Sigue el patrón pure/testable de
// src/domain/* (igual que cardioRoutines.ts), separado de musculación y cardio.

import {
  expandRoutineSteps,
  routineTotalSec,
  type RoutineElement,
} from './cardioRoutines';

/** Rutina genérica cronometrada: la forma mínima que consumen los helpers de
 *  expansión/suma y el runner guiado (title/steps/totalSec), sin depender de
 *  los enums de máquina del cardio ('cinta'|'bici'). */
export interface TimedRoutine {
  id: string;
  name: string;
  /** Minutos de la sesión, DERIVADO de la suma real de pasos (no a mano). */
  totalMinutes: number;
  description: string;
  elements: RoutineElement[];
}

/** Un ejercicio del circuito: etiqueta en español + imagen de free-exercise-db. */
export interface AbsExercise {
  label: string;
  freeExerciseDbId: string;
}

/** Los 7 ejercicios del circuito, en orden fijo. Cada `freeExerciseDbId` está
 *  VERIFICADO en free-exercise-db (0.jpg y 1.jpg existen). No inventar otros. */
export const ABS_EXERCISES: AbsExercise[] = [
  { label: 'Crunch abdominal', freeExerciseDbId: 'Crunches' },
  { label: 'Bicicleta en el aire', freeExerciseDbId: 'Air_Bike' },
  { label: 'Crunch cruzado (oblicuos)', freeExerciseDbId: 'Cross-Body_Crunch' },
  { label: 'Elevación de piernas tumbado', freeExerciseDbId: 'Flat_Bench_Lying_Leg_Raise' },
  { label: 'Elevación de cadera (rodillas flexionadas)', freeExerciseDbId: 'Bent-Knee_Hip_Raise' },
  { label: 'Dead bug (core profundo)', freeExerciseDbId: 'Dead_Bug' },
  { label: 'Toques de talón alternos (oblicuos)', freeExerciseDbId: 'Alternate_Heel_Touchers' },
];

const WORK_SEC = 40;
const REST_SEC = 20;
const ROUND_REST_SEC = 60;
const WARMUP_SEC = 180;
const COOLDOWN_SEC = 180;
const ROUNDS = 3;

/**
 * Construye los `elements` del circuito de forma programática (no 3 bloques
 * copy-paste): calentamiento + 3 rondas idénticas de los 7 ejercicios (40 s
 * trabajo + 20 s descanso; el 7º lleva 60 s de descanso entre rondas) +
 * enfriamiento. PURA. Una sola definición de los 7 ejercicios evita drift.
 */
export function buildCircuitElements(): RoutineElement[] {
  const elements: RoutineElement[] = [
    {
      kind: 'step',
      step: { label: 'Calentamiento — movilidad de tronco', durationSec: WARMUP_SEC },
    },
  ];

  for (let round = 1; round <= ROUNDS; round += 1) {
    ABS_EXERCISES.forEach((ex, i) => {
      const isLast = i === ABS_EXERCISES.length - 1;
      elements.push({
        kind: 'step',
        step: {
          label: `${ex.label} · Ronda ${round}`,
          durationSec: WORK_SEC,
          intensity: '40s',
          freeExerciseDbId: ex.freeExerciseDbId,
        },
      });
      elements.push({
        kind: 'step',
        step: isLast
          ? { label: 'Descanso entre rondas', durationSec: ROUND_REST_SEC }
          : { label: 'Descanso', durationSec: REST_SEC },
      });
    });
  }

  elements.push({
    kind: 'step',
    step: { label: 'Enfriamiento — estiramiento abdominal', durationSec: COOLDOWN_SEC },
  });

  return elements;
}

/** Circuito Core de ~30 min, con `totalMinutes` derivado de la suma real. */
export const ABS_CIRCUIT: TimedRoutine = {
  id: 'abs-core',
  name: 'Circuito Core (~30 min)',
  totalMinutes: 0, // derivado abajo
  description:
    'Circuito de core en 3 rondas; trabaja abdomen superior, inferior, oblicuos y core profundo. Ideal como complemento, no todos los días.',
  elements: buildCircuitElements(),
};

// `totalMinutes` es DERIVADO de la suma real de los pasos (no una cifra a mano),
// igual que CARDIO_ROUTINES: así el badge de la UI nunca se desincroniza.
ABS_CIRCUIT.totalMinutes = routineTotalSec(ABS_CIRCUIT) / 60;

/** Reexport de conveniencia para la UI (evita importar de dos módulos). */
export { expandRoutineSteps, routineTotalSec };
