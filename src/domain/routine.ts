// Modelo de gimnasio — capa de dominio PURA (design §8).
// Rutina de dos fases: Semana 1 (adaptación, full-body) y Semana 2+ (división),
// 4 días por fase. Cada ejercicio deriva sus imágenes del freeExerciseDbId.

import type { DayId } from '../storage/types';

export type { DayId };

/** Fase de la rutina seleccionable por el usuario. */
export type RoutineWeekPhase = 'semana1' | 'semana2plus';

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
  | 'abs'
  | 'traps'
  | 'forearms';

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

/**
 * Helper para construir un Exercise con URLs derivadas del freeExerciseDbId.
 * `sets` y `restSeconds` son por ejercicio (Semana 1 usa 3 series; Semana 2+ 3-4).
 */
function makeExercise(
  id: string,
  name: string,
  sets: number,
  repsRange: string,
  restSeconds: number,
  targetMuscles: MuscleId[],
  freeExerciseDbId: string,
): Exercise {
  return {
    id,
    name,
    sets,
    repsRange,
    restSeconds,
    targetMuscles,
    freeExerciseDbId,
    imageUrl: defaultImageUrl(freeExerciseDbId),
    endImageUrl: defaultEndImageUrl(freeExerciseDbId),
  };
}

/** Mapeo id interno → freeExerciseDbId (biblioteca verificada de 36 ejercicios). */
const DB_ID = {
  // Pecho
  bench_press: 'Barbell_Bench_Press_-_Medium_Grip',
  incline_bench: 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  cable_crossover: 'Cable_Crossover',
  pec_deck: 'Butterfly',
  // Espalda
  barbell_row: 'Bent_Over_Barbell_Row',
  db_row: 'Bent_Over_Two-Dumbbell_Row',
  chin_up: 'Chin-Up',
  close_pulldown: 'Close-Grip_Front_Lat_Pulldown',
  // Piernas
  back_squat: 'Barbell_Squat',
  full_squat: 'Barbell_Full_Squat',
  leg_press: 'Leg_Press',
  barbell_lunge: 'Barbell_Lunge',
  // Glúteos
  hip_thrust: 'Barbell_Hip_Thrust',
  glute_bridge: 'Barbell_Glute_Bridge',
  glute_kickback: 'Glute_Kickback',
  // Bíceps
  barbell_curl: 'Barbell_Curl',
  hammer_curl: 'Alternate_Hammer_Curl',
  preacher_curl: 'Cable_Preacher_Curl',
  incline_curl: 'Alternate_Incline_Dumbbell_Curl',
  // Tríceps
  bench_dips: 'Bench_Dips',
  cable_tricep_ext: 'Cable_Incline_Triceps_Extension',
  skullcrusher: 'Band_Skull_Crusher',
  // Hombros
  arnold_press: 'Arnold_Dumbbell_Press',
  cable_shoulder_press: 'Alternating_Cable_Shoulder_Press',
  lateral_raise: 'Alternating_Deltoid_Raise',
  rear_delt_fly: 'Back_Flyes_-_With_Bands',
  // Trapecio
  barbell_shrug: 'Barbell_Shrug',
  db_shrug: 'Dumbbell_Shrug',
  // Gemelos
  seated_calf: 'Barbell_Seated_Calf_Raise',
  calf_press: 'Calf_Press',
  // Antebrazos
  wrist_curl: 'Cable_Wrist_Curl',
} as const;

/** De-duplica la unión de músculos de los ejercicios de un día. */
function unionMuscles(exercises: Exercise[]): MuscleId[] {
  const seen = new Set<MuscleId>();
  const out: MuscleId[] = [];
  for (const ex of exercises) {
    for (const m of ex.targetMuscles) {
      if (!seen.has(m)) {
        seen.add(m);
        out.push(m);
      }
    }
  }
  return out;
}

/** Construye un WorkoutDay calculando `muscles` como unión de sus ejercicios. */
function makeDay(id: DayId, name: string, exercises: Exercise[]): WorkoutDay {
  return { id, name, muscles: unionMuscles(exercises), exercises };
}

/** Rutina de dos fases, 4 días cada una (ver enhance-plan.md "Phase day specs"). */
export const routinesByPhase: Record<RoutineWeekPhase, WorkoutDay[]> = {
  semana1: [
    makeDay('s1-d1', 'Semana 1 · Día 1 — Full A', [
      makeExercise('bench_press', 'Press banca con barra', 3, '8-10', 60, ['chest', 'triceps', 'shoulders'], DB_ID.bench_press),
      makeExercise('barbell_row', 'Remo con barra', 3, '8-10', 60, ['back', 'biceps'], DB_ID.barbell_row),
      makeExercise('back_squat', 'Sentadilla con barra', 3, '8-10', 60, ['quads', 'glutes'], DB_ID.back_squat),
      makeExercise('arnold_press', 'Press Arnold con mancuernas', 3, '10-12', 60, ['shoulders'], DB_ID.arnold_press),
      makeExercise('barbell_curl', 'Curl con barra', 3, '10-12', 60, ['biceps'], DB_ID.barbell_curl),
    ]),
    makeDay('s1-d2', 'Semana 1 · Día 2 — Full B', [
      makeExercise('incline_bench', 'Press banca inclinado con barra', 3, '8-10', 60, ['chest', 'shoulders'], DB_ID.incline_bench),
      makeExercise('close_pulldown', 'Jalón al pecho agarre cerrado', 3, '10-12', 60, ['back', 'biceps'], DB_ID.close_pulldown),
      makeExercise('leg_press', 'Prensa de piernas', 3, '10-12', 60, ['quads', 'glutes'], DB_ID.leg_press),
      makeExercise('bench_dips', 'Fondos en banco', 3, '10-12', 60, ['triceps'], DB_ID.bench_dips),
      makeExercise('lateral_raise', 'Elevaciones laterales', 3, '12-15', 45, ['shoulders'], DB_ID.lateral_raise),
    ]),
    makeDay('s1-d3', 'Semana 1 · Día 3 — Pierna/Glúteo', [
      makeExercise('back_squat', 'Sentadilla con barra', 3, '8-10', 60, ['quads', 'glutes'], DB_ID.back_squat),
      makeExercise('hip_thrust', 'Empuje de cadera con barra', 3, '10-12', 60, ['glutes', 'hamstrings'], DB_ID.hip_thrust),
      makeExercise('barbell_lunge', 'Zancadas con barra', 3, '10-12', 60, ['quads', 'glutes'], DB_ID.barbell_lunge),
      makeExercise('seated_calf', 'Elevación de gemelos sentado', 3, '15-20', 45, ['calves'], DB_ID.seated_calf),
      makeExercise('glute_kickback', 'Patada de glúteo', 3, '12-15', 60, ['glutes'], DB_ID.glute_kickback),
    ]),
    makeDay('s1-d4', 'Semana 1 · Día 4 — Full C/Técnica', [
      makeExercise('db_row', 'Remo con mancuernas', 3, '10-12', 60, ['back', 'biceps'], DB_ID.db_row),
      makeExercise('cable_crossover', 'Cruce de poleas', 3, '12-15', 60, ['chest'], DB_ID.cable_crossover),
      makeExercise('preacher_curl', 'Curl predicador en polea', 3, '12-15', 60, ['biceps'], DB_ID.preacher_curl),
      makeExercise('cable_tricep_ext', 'Extensión de tríceps en polea', 3, '12-15', 60, ['triceps'], DB_ID.cable_tricep_ext),
      makeExercise('rear_delt_fly', 'Aperturas posteriores con banda', 3, '15', 45, ['shoulders', 'back'], DB_ID.rear_delt_fly),
    ]),
  ],
  semana2plus: [
    makeDay('s2-d1', 'Semana 2+ · Día 1 — Pecho + Bíceps', [
      makeExercise('bench_press', 'Press banca con barra', 4, '6-8', 60, ['chest', 'triceps', 'shoulders'], DB_ID.bench_press),
      makeExercise('incline_bench', 'Press banca inclinado con barra', 3, '8-10', 60, ['chest', 'shoulders'], DB_ID.incline_bench),
      makeExercise('cable_crossover', 'Cruce de poleas', 3, '12-15', 45, ['chest'], DB_ID.cable_crossover),
      makeExercise('pec_deck', 'Contractora de pecho (peck deck)', 3, '12-15', 45, ['chest'], DB_ID.pec_deck),
      makeExercise('barbell_curl', 'Curl con barra', 3, '8-10', 60, ['biceps'], DB_ID.barbell_curl),
      makeExercise('hammer_curl', 'Curl martillo alterno', 3, '10-12', 45, ['biceps', 'forearms'], DB_ID.hammer_curl),
    ]),
    makeDay('s2-d2', 'Semana 2+ · Día 2 — Espalda + Tríceps', [
      makeExercise('chin_up', 'Dominadas supinas', 4, '6-8', 60, ['back', 'biceps'], DB_ID.chin_up),
      makeExercise('barbell_row', 'Remo con barra', 3, '8-10', 60, ['back', 'biceps'], DB_ID.barbell_row),
      makeExercise('close_pulldown', 'Jalón al pecho agarre cerrado', 3, '10-12', 60, ['back', 'biceps'], DB_ID.close_pulldown),
      makeExercise('db_row', 'Remo con mancuernas', 3, '10-12', 60, ['back', 'biceps'], DB_ID.db_row),
      makeExercise('bench_dips', 'Fondos en banco', 3, '10-12', 45, ['triceps'], DB_ID.bench_dips),
      makeExercise('skullcrusher', 'Press francés con banda', 3, '10-12', 45, ['triceps'], DB_ID.skullcrusher),
    ]),
    makeDay('s2-d3', 'Semana 2+ · Día 3 — Piernas + Glúteo', [
      makeExercise('back_squat', 'Sentadilla con barra', 4, '6-8', 60, ['quads', 'glutes'], DB_ID.back_squat),
      makeExercise('leg_press', 'Prensa de piernas', 3, '10-12', 60, ['quads', 'glutes'], DB_ID.leg_press),
      makeExercise('barbell_lunge', 'Zancadas con barra', 3, '10-12', 60, ['quads', 'glutes'], DB_ID.barbell_lunge),
      makeExercise('hip_thrust', 'Empuje de cadera con barra', 3, '10-12', 60, ['glutes', 'hamstrings'], DB_ID.hip_thrust),
      makeExercise('glute_bridge', 'Puente de glúteo con barra', 3, '12-15', 45, ['glutes', 'hamstrings'], DB_ID.glute_bridge),
      makeExercise('seated_calf', 'Elevación de gemelos sentado', 4, '15-20', 45, ['calves'], DB_ID.seated_calf),
    ]),
    makeDay('s2-d4', 'Semana 2+ · Día 4 — Hombro + Trapecio + Gemelos', [
      makeExercise('arnold_press', 'Press Arnold con mancuernas', 4, '6-8', 60, ['shoulders'], DB_ID.arnold_press),
      makeExercise('cable_shoulder_press', 'Press de hombros en polea alterno', 3, '8-10', 60, ['shoulders'], DB_ID.cable_shoulder_press),
      makeExercise('lateral_raise', 'Elevaciones laterales', 4, '12-15', 45, ['shoulders'], DB_ID.lateral_raise),
      makeExercise('rear_delt_fly', 'Aperturas posteriores con banda', 3, '15', 45, ['shoulders', 'back'], DB_ID.rear_delt_fly),
      makeExercise('barbell_shrug', 'Encogimientos con barra', 3, '10-12', 60, ['traps'], DB_ID.barbell_shrug),
      makeExercise('calf_press', 'Elevación de gemelos en prensa', 4, '15-20', 45, ['calves'], DB_ID.calf_press),
    ]),
  ],
};

/** Alias de compatibilidad: consumidores existentes importan `routine` (Semana 1). */
export const routine = routinesByPhase.semana1;
