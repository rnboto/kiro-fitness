// Modelo de gimnasio — capa de dominio PURA (design §8).
// Rutina Torso/Pierna, 4 días/semana, 5 ejercicios × 3 series por día.

import type { DayId } from '../storage/types';

export type { DayId };

/** Grupos musculares para el mapa de calor (design §8.6). */
export type MuscleId =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs';

export interface Exercise {
  id: string; // id interno estable, p.ej. 'bench_press'
  name: string; // español
  sets: number;
  repsRange: string; // '6-8', '8-12', ...
  restSeconds: number; // 45-60
  targetMuscles: MuscleId[]; // para el heat map
  freeExerciseDbId: string; // carpeta del dataset yuhonas
  imageUrl: string; // EDITABLE por el usuario; default derivado del dataset
  endImageUrl: string; // fase final (/1.jpg)
}

export interface WorkoutDay {
  id: DayId;
  name: string;
  muscles: MuscleId[];
  exercises: Exercise[];
}

const IMG_PREFIX = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

/** URL por defecto de la fase inicial (/0.jpg) a partir del freeExerciseDbId. */
export function defaultImageUrl(freeExerciseDbId: string): string {
  return `${IMG_PREFIX}${freeExerciseDbId}/0.jpg`;
}

/** URL por defecto de la fase final (/1.jpg) a partir del freeExerciseDbId. */
export function defaultEndImageUrl(freeExerciseDbId: string): string {
  return `${IMG_PREFIX}${freeExerciseDbId}/1.jpg`;
}

/**
 * Resuelve la URL de imagen a mostrar: el override del usuario prevalece sobre
 * el default derivado del freeExerciseDbId (design §8.2).
 */
export function resolveImageUrl(
  exercise: Exercise,
  overrides?: { imageUrl?: string; endImageUrl?: string },
): { imageUrl: string; endImageUrl: string } {
  return {
    imageUrl: overrides?.imageUrl ?? exercise.imageUrl,
    endImageUrl: overrides?.endImageUrl ?? exercise.endImageUrl,
  };
}

/** Helper para construir un Exercise con URLs derivadas del freeExerciseDbId. */
function makeExercise(
  id: string,
  name: string,
  repsRange: string,
  restSeconds: number,
  targetMuscles: MuscleId[],
  freeExerciseDbId: string,
): Exercise {
  return {
    id,
    name,
    sets: 3,
    repsRange,
    restSeconds,
    targetMuscles,
    freeExerciseDbId,
    imageUrl: defaultImageUrl(freeExerciseDbId),
    endImageUrl: defaultEndImageUrl(freeExerciseDbId),
  };
}

/** Mapeo id interno → freeExerciseDbId (design §8.2, 11 ids). */
const DB_ID = {
  bench_press: 'Barbell_Bench_Press_-_Medium_Grip',
  back_squat: 'Barbell_Squat',
  deadlift: 'Barbell_Deadlift',
  overhead_press: 'Standing_Military_Press',
  barbell_row: 'Bent_Over_Barbell_Row',
  lat_pulldown: 'Wide-Grip_Lat_Pulldown',
  dumbbell_lunges: 'Dumbbell_Lunges',
  leg_press: 'Leg_Press',
  lying_leg_curl: 'Lying_Leg_Curls',
  lateral_raise: 'Side_Lateral_Raise',
  calf_raise: 'Standing_Calf_Raises',
} as const;

/** Los 4 días de la rutina Torso/Pierna (design §8.1). */
export const routine: WorkoutDay[] = [
  {
    id: 'torsoA',
    name: 'Torso A',
    muscles: ['chest', 'back', 'shoulders', 'triceps', 'biceps'],
    exercises: [
      makeExercise('bench_press', 'Press banca con barra', '6-8', 60, ['chest', 'triceps', 'shoulders'], DB_ID.bench_press),
      makeExercise('barbell_row', 'Remo con barra', '8-10', 60, ['back', 'biceps'], DB_ID.barbell_row),
      makeExercise('overhead_press', 'Press militar de pie', '8-10', 60, ['shoulders', 'triceps'], DB_ID.overhead_press),
      makeExercise('lat_pulldown', 'Jalón al pecho agarre ancho', '10-12', 60, ['back', 'biceps'], DB_ID.lat_pulldown),
      makeExercise('lateral_raise', 'Elevaciones laterales', '12-15', 45, ['shoulders'], DB_ID.lateral_raise),
    ],
  },
  {
    id: 'piernaA',
    name: 'Pierna A',
    muscles: ['quads', 'glutes', 'hamstrings', 'calves'],
    exercises: [
      makeExercise('back_squat', 'Sentadilla con barra', '6-8', 60, ['quads', 'glutes'], DB_ID.back_squat),
      makeExercise('leg_press', 'Prensa de piernas', '10-12', 60, ['quads', 'glutes'], DB_ID.leg_press),
      makeExercise('lying_leg_curl', 'Curl femoral tumbado', '10-12', 60, ['hamstrings'], DB_ID.lying_leg_curl),
      makeExercise('dumbbell_lunges', 'Zancadas con mancuernas', '10-12', 60, ['quads', 'glutes'], DB_ID.dumbbell_lunges),
      makeExercise('calf_raise', 'Elevación de gemelos', '15-20', 45, ['calves'], DB_ID.calf_raise),
    ],
  },
  {
    id: 'torsoB',
    name: 'Torso B',
    muscles: ['chest', 'back', 'shoulders', 'triceps', 'biceps'],
    exercises: [
      makeExercise('overhead_press', 'Press militar de pie', '6-8', 60, ['shoulders', 'triceps'], DB_ID.overhead_press),
      makeExercise('lat_pulldown', 'Jalón al pecho agarre ancho', '8-10', 60, ['back', 'biceps'], DB_ID.lat_pulldown),
      makeExercise('bench_press', 'Press banca con barra', '8-10', 60, ['chest', 'triceps'], DB_ID.bench_press),
      makeExercise('barbell_row', 'Remo con barra', '10-12', 60, ['back', 'biceps'], DB_ID.barbell_row),
      makeExercise('lateral_raise', 'Elevaciones laterales', '12-15', 45, ['shoulders'], DB_ID.lateral_raise),
    ],
  },
  {
    id: 'piernaB',
    name: 'Pierna B',
    muscles: ['hamstrings', 'glutes', 'quads', 'calves'],
    exercises: [
      makeExercise('deadlift', 'Peso muerto con barra', '5-6', 60, ['hamstrings', 'glutes', 'back'], DB_ID.deadlift),
      makeExercise('back_squat', 'Sentadilla con barra', '8-10', 60, ['quads', 'glutes'], DB_ID.back_squat),
      makeExercise('lying_leg_curl', 'Curl femoral tumbado', '10-12', 60, ['hamstrings'], DB_ID.lying_leg_curl),
      makeExercise('leg_press', 'Prensa de piernas', '12-15', 60, ['quads', 'glutes'], DB_ID.leg_press),
      makeExercise('calf_raise', 'Elevación de gemelos', '15-20', 45, ['calves'], DB_ID.calf_raise),
    ],
  },
];
