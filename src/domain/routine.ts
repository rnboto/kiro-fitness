// Modelo de gimnasio — capa de dominio PURA (design §8).
// Rutina Superior/Inferior (upper/lower) de dos fases para pérdida de grasa y
// tonificación: Fase 1 · Base (reps moderadas) y Fase 2 · Intensidad (el
// compuesto principal sube de serie y baja de reps). 4 días por fase
// (2 Superior + 2 Inferior → cada músculo ~2×/semana). Cada ejercicio deriva
// sus imágenes del freeExerciseDbId. Adaptada de una estructura de programa
// 4-day upper/lower para quemar grasa y tonificar.

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
  name: string; // nombre largo para el header del día ('Día 1 — Superior (Fuerza)')
  shortName?: string; // etiqueta corta para la nav de días ('Día 1')
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
 * `sets` y `restSeconds` son por ejercicio (Fase 1 Base vs Fase 2 Intensidad).
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
function makeDay(id: DayId, name: string, shortName: string, exercises: Exercise[]): WorkoutDay {
  return { id, name, shortName, muscles: unionMuscles(exercises), exercises };
}

/**
 * Rutina Superior/Inferior de dos fases, 4 días cada una (2 Superior + 2
 * Inferior → cada grupo muscular ~2×/semana). Las claves `semana1`/`semana2plus`
 * se mantienen por compatibilidad de persistencia; el display es "Semanas 1-4"/"Semanas 5-8".
 */
export const routinesByPhase: Record<RoutineWeekPhase, WorkoutDay[]> = {
  semana1: [
    makeDay('f1-sup-a', 'Día 1 — Superior (Fuerza)', 'Día 1', [
      makeExercise('bench_press', 'Press banca con barra', 4, '6-8', 90, ['chest', 'triceps', 'shoulders'], DB_ID.bench_press),
      makeExercise('barbell_row', 'Remo con barra', 4, '8-10', 90, ['back', 'biceps'], DB_ID.barbell_row),
      makeExercise('arnold_press', 'Press hombro (Arnold) con mancuernas', 3, '8-10', 75, ['shoulders', 'triceps'], DB_ID.arnold_press),
      makeExercise('close_pulldown', 'Jalón al pecho agarre cerrado', 3, '10-12', 60, ['back', 'biceps'], DB_ID.close_pulldown),
      makeExercise('cable_tricep_ext', 'Extensión de tríceps en polea', 3, '10-12', 45, ['triceps'], DB_ID.cable_tricep_ext),
      makeExercise('barbell_curl', 'Curl con barra', 3, '10-12', 45, ['biceps'], DB_ID.barbell_curl),
    ]),
    makeDay('f1-inf-a', 'Día 2 — Inferior (Fuerza)', 'Día 2', [
      makeExercise('back_squat', 'Sentadilla con barra', 4, '6-8', 120, ['quads', 'glutes'], DB_ID.back_squat),
      makeExercise('leg_press', 'Prensa de piernas', 3, '10-12', 90, ['quads', 'glutes'], DB_ID.leg_press),
      makeExercise('hip_thrust', 'Empuje de cadera con barra', 3, '8-10', 90, ['glutes', 'hamstrings'], DB_ID.hip_thrust),
      makeExercise('glute_bridge', 'Curl femoral / puente de glúteo', 3, '10-12', 60, ['hamstrings', 'glutes'], DB_ID.glute_bridge),
      makeExercise('seated_calf', 'Elevación de gemelos sentado', 4, '15-20', 45, ['calves'], DB_ID.seated_calf),
    ]),
    makeDay('f1-sup-b', 'Día 3 — Superior (Volumen)', 'Día 3', [
      makeExercise('incline_bench', 'Press banca inclinado con barra', 3, '8-10', 75, ['chest', 'shoulders'], DB_ID.incline_bench),
      makeExercise('db_row', 'Remo con mancuernas', 3, '10-12', 75, ['back', 'biceps'], DB_ID.db_row),
      makeExercise('lateral_raise', 'Elevaciones laterales', 4, '12-15', 45, ['shoulders'], DB_ID.lateral_raise),
      makeExercise('rear_delt_fly', 'Aperturas posteriores con banda', 3, '15', 45, ['shoulders', 'back'], DB_ID.rear_delt_fly),
      makeExercise('hammer_curl', 'Curl martillo alterno', 3, '10-12', 45, ['biceps', 'forearms'], DB_ID.hammer_curl),
      makeExercise('bench_dips', 'Fondos en banco', 3, '10-12', 45, ['triceps'], DB_ID.bench_dips),
    ]),
    makeDay('f1-inf-b', 'Día 4 — Inferior (Volumen)', 'Día 4', [
      makeExercise('barbell_lunge', 'Zancadas con barra', 3, '10-12', 75, ['quads', 'glutes'], DB_ID.barbell_lunge),
      makeExercise('glute_bridge', 'Puente de glúteo con barra', 3, '12-15', 60, ['glutes', 'hamstrings'], DB_ID.glute_bridge),
      makeExercise('leg_press', 'Prensa de piernas', 3, '12-15', 60, ['quads', 'glutes'], DB_ID.leg_press),
      makeExercise('glute_kickback', 'Patada de glúteo', 3, '12-15', 45, ['glutes'], DB_ID.glute_kickback),
      makeExercise('calf_press', 'Elevación de gemelos en prensa', 4, '15-20', 45, ['calves'], DB_ID.calf_press),
    ]),
  ],
  semana2plus: [
    makeDay('f2-sup-a', 'Día 1 — Superior (Fuerza)', 'Día 1', [
      makeExercise('bench_press', 'Press banca con barra', 5, '4-6', 120, ['chest', 'triceps', 'shoulders'], DB_ID.bench_press),
      makeExercise('barbell_row', 'Remo con barra', 4, '6-8', 90, ['back', 'biceps'], DB_ID.barbell_row),
      makeExercise('arnold_press', 'Press hombro (Arnold) con mancuernas', 3, '8-10', 75, ['shoulders', 'triceps'], DB_ID.arnold_press),
      makeExercise('close_pulldown', 'Jalón al pecho agarre cerrado', 3, '10-12', 60, ['back', 'biceps'], DB_ID.close_pulldown),
      makeExercise('cable_tricep_ext', 'Extensión de tríceps en polea', 3, '10-12', 45, ['triceps'], DB_ID.cable_tricep_ext),
      makeExercise('barbell_curl', 'Curl con barra', 3, '10-12', 45, ['biceps'], DB_ID.barbell_curl),
    ]),
    makeDay('f2-inf-a', 'Día 2 — Inferior (Fuerza)', 'Día 2', [
      makeExercise('back_squat', 'Sentadilla con barra', 5, '4-6', 150, ['quads', 'glutes'], DB_ID.back_squat),
      makeExercise('leg_press', 'Prensa de piernas', 4, '8-10', 90, ['quads', 'glutes'], DB_ID.leg_press),
      makeExercise('hip_thrust', 'Empuje de cadera con barra', 3, '8-10', 90, ['glutes', 'hamstrings'], DB_ID.hip_thrust),
      makeExercise('glute_bridge', 'Curl femoral / puente de glúteo', 3, '10-12', 60, ['hamstrings', 'glutes'], DB_ID.glute_bridge),
      makeExercise('seated_calf', 'Elevación de gemelos sentado', 4, '15-20', 45, ['calves'], DB_ID.seated_calf),
    ]),
    makeDay('f2-sup-b', 'Día 3 — Superior (Volumen)', 'Día 3', [
      makeExercise('incline_bench', 'Press banca inclinado con barra', 4, '6-8', 90, ['chest', 'shoulders'], DB_ID.incline_bench),
      makeExercise('db_row', 'Remo con mancuernas', 3, '10-12', 75, ['back', 'biceps'], DB_ID.db_row),
      makeExercise('lateral_raise', 'Elevaciones laterales', 4, '12-15', 45, ['shoulders'], DB_ID.lateral_raise),
      makeExercise('rear_delt_fly', 'Aperturas posteriores con banda', 3, '15', 45, ['shoulders', 'back'], DB_ID.rear_delt_fly),
      makeExercise('hammer_curl', 'Curl martillo alterno', 3, '10-12', 45, ['biceps', 'forearms'], DB_ID.hammer_curl),
      makeExercise('bench_dips', 'Fondos en banco', 3, '10-12', 45, ['triceps'], DB_ID.bench_dips),
    ]),
    makeDay('f2-inf-b', 'Día 4 — Inferior (Volumen)', 'Día 4', [
      makeExercise('barbell_lunge', 'Zancadas con barra', 4, '8-10', 90, ['quads', 'glutes'], DB_ID.barbell_lunge),
      makeExercise('glute_bridge', 'Puente de glúteo con barra', 3, '12-15', 60, ['glutes', 'hamstrings'], DB_ID.glute_bridge),
      makeExercise('leg_press', 'Prensa de piernas', 3, '12-15', 60, ['quads', 'glutes'], DB_ID.leg_press),
      makeExercise('glute_kickback', 'Patada de glúteo', 3, '12-15', 45, ['glutes'], DB_ID.glute_kickback),
      makeExercise('calf_press', 'Elevación de gemelos en prensa', 4, '15-20', 45, ['calves'], DB_ID.calf_press),
    ]),
  ],
};

/** Alias de compatibilidad: consumidores existentes importan `routine` (Semana 1). */
export const routine = routinesByPhase.semana1;
