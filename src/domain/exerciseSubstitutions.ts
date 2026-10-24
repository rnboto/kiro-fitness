// Lista de Sustitución de Ejercicios — capa de dominio PURA (sin React ni storage).
// Carga y valida la mini base de datos local (src/data/exerciseSubstitutions.json)
// que agrupa ejercicios por patrón de movimiento, y resuelve qué ejercicio se
// muestra en cada hueco de la rutina según las sustituciones guardadas
// ('hoy' = solo el día local en que se eligió; 'fijo' = hasta restaurar).
// Nunca muta los datos de routine.ts: los sustitutos son objetos nuevos.

import rawDb from '../data/exerciseSubstitutions.json';
import type { ExerciseSwap, ExerciseSwaps, ExerciseSwapScope, Settings } from '../storage';
import {
  defaultEndImageUrl,
  defaultImageUrl,
  type DayId,
  type Exercise,
  type MuscleId,
  type WorkoutDay,
} from './routine';

/** Todos los MuscleId válidos (espejo del tipo de routine.ts). */
export const MUSCLE_IDS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'traps',
  'forearms',
] as const satisfies readonly MuscleId[];

export type Difficulty = 'principiante' | 'intermedio' | 'avanzado';
const DIFFICULTIES: readonly Difficulty[] = ['principiante', 'intermedio', 'avanzado'];

export interface SubstituteExercise {
  key: string; // id estable; para los originales de la rutina coincide con Exercise.id
  name: string; // español
  freeExerciseDbId: string; // carpeta del dataset yuhonas (verificada)
  equipment: string; // etiqueta corta en español
  difficulty?: Difficulty;
  notes?: string;
}

export interface SubstitutionGroup {
  id: string;
  name: string; // español
  primaryMuscles: MuscleId[];
  exercises: SubstituteExercise[];
}

export interface SubstitutionDb {
  version: 1;
  groups: SubstitutionGroup[];
  /** `${dayId}::${exerciseId}` → id de grupo (huecos con un patrón distinto al habitual). */
  slotGroupOverrides: Record<string, string>;
}

export const FREE_EXERCISE_DB_ID_RE = /^[A-Za-z0-9_-]+$/;
export const SWAP_KEY_RE = /^[a-z0-9_]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

/**
 * Valida el JSON crudo de la base de sustituciones. Nunca lanza: descarta las
 * entradas inválidas y reporta cada problema (en español) en `errors`.
 */
export function parseSubstitutionDb(raw: unknown): { db: SubstitutionDb; errors: string[] } {
  const errors: string[] = [];
  const db: SubstitutionDb = { version: 1, groups: [], slotGroupOverrides: {} };
  if (!isObject(raw)) {
    errors.push('La base de sustituciones no es un objeto.');
    return { db, errors };
  }
  if (raw.version !== 1) errors.push('Versión de la base de sustituciones no compatible.');
  if (!Array.isArray(raw.groups)) {
    errors.push('La base de sustituciones no tiene una lista de grupos.');
    return { db, errors };
  }

  const groupIds = new Set<string>();
  const keys = new Set<string>();
  for (const g of raw.groups) {
    if (!isObject(g) || !nonEmptyString(g.id) || !nonEmptyString(g.name)) {
      errors.push('Grupo sin id o nombre válido.');
      continue;
    }
    if (groupIds.has(g.id)) {
      errors.push(`Grupo duplicado: ${g.id}.`);
      continue;
    }
    const muscles = Array.isArray(g.primaryMuscles) ? g.primaryMuscles : [];
    const validMuscles = muscles.filter((m): m is MuscleId =>
      (MUSCLE_IDS as readonly unknown[]).includes(m),
    );
    if (validMuscles.length === 0 || validMuscles.length !== muscles.length) {
      errors.push(`Grupo ${g.id}: músculos principales inválidos.`);
      continue;
    }
    const exercises: SubstituteExercise[] = [];
    for (const e of Array.isArray(g.exercises) ? g.exercises : []) {
      if (
        !isObject(e) ||
        typeof e.key !== 'string' ||
        !SWAP_KEY_RE.test(e.key) ||
        !nonEmptyString(e.name) ||
        typeof e.freeExerciseDbId !== 'string' ||
        !FREE_EXERCISE_DB_ID_RE.test(e.freeExerciseDbId) ||
        !nonEmptyString(e.equipment)
      ) {
        errors.push(`Grupo ${g.id}: ejercicio con campos inválidos.`);
        continue;
      }
      if (keys.has(e.key)) {
        errors.push(`Clave de ejercicio duplicada: ${e.key}.`);
        continue;
      }
      if (e.difficulty !== undefined && !DIFFICULTIES.includes(e.difficulty as Difficulty)) {
        errors.push(`Ejercicio ${e.key}: dificultad inválida.`);
        continue;
      }
      if (e.notes !== undefined && typeof e.notes !== 'string') {
        errors.push(`Ejercicio ${e.key}: notas inválidas.`);
        continue;
      }
      keys.add(e.key);
      const sub: SubstituteExercise = {
        key: e.key,
        name: e.name,
        freeExerciseDbId: e.freeExerciseDbId,
        equipment: e.equipment,
      };
      if (e.difficulty !== undefined) sub.difficulty = e.difficulty as Difficulty;
      if (e.notes !== undefined) sub.notes = e.notes as string;
      exercises.push(sub);
    }
    if (exercises.length === 0) {
      errors.push(`Grupo ${g.id}: sin ejercicios válidos.`);
      continue;
    }
    groupIds.add(g.id);
    db.groups.push({ id: g.id, name: g.name, primaryMuscles: validMuscles, exercises });
  }

  if (raw.slotGroupOverrides !== undefined) {
    if (!isObject(raw.slotGroupOverrides)) {
      errors.push('slotGroupOverrides no es un objeto.');
    } else {
      for (const [slot, groupId] of Object.entries(raw.slotGroupOverrides)) {
        if (typeof groupId === 'string' && groupIds.has(groupId)) {
          db.slotGroupOverrides[slot] = groupId;
        } else {
          errors.push(`slotGroupOverrides: grupo desconocido para ${slot}.`);
        }
      }
    }
  }

  return { db, errors };
}

const PARSED = parseSubstitutionDb(rawDb as unknown);

/** Base de sustituciones validada (cargada del JSON local, empaquetada en el bundle). */
export const SUBSTITUTION_DB: SubstitutionDb = PARSED.db;
/** Errores de validación del JSON (vacío si el archivo es correcto). */
export const SUBSTITUTION_DB_ERRORS: readonly string[] = PARSED.errors;

/** Clave de persistencia de un hueco: `${dayId}::${originalExerciseId}`. */
export function swapKey(dayId: DayId, originalExerciseId: string): string {
  return `${dayId}::${originalExerciseId}`;
}

/** Busca un ejercicio de la base por su key (y su grupo). */
export function findSubstitute(
  key: string,
  db: SubstitutionDb = SUBSTITUTION_DB,
): { group: SubstitutionGroup; exercise: SubstituteExercise } | null {
  for (const group of db.groups) {
    const exercise = group.exercises.find((e) => e.key === key);
    if (exercise) return { group, exercise };
  }
  return null;
}

/** Grupo de un hueco: override por hueco o, si no, el grupo que contiene el ejercicio. */
export function groupForSlot(
  dayId: DayId,
  exerciseId: string,
  db: SubstitutionDb = SUBSTITUTION_DB,
): SubstitutionGroup | null {
  const overrideId = db.slotGroupOverrides[swapKey(dayId, exerciseId)];
  if (overrideId) {
    const g = db.groups.find((x) => x.id === overrideId);
    if (g) return g;
  }
  return findSubstitute(exerciseId, db)?.group ?? null;
}

/**
 * Alternativas equivalentes para un hueco: los ejercicios del grupo salvo el
 * actual (`currentKey`) y los ya presentes en otros huecos del día
 * (`excludeKeys`). Si el hueco está sustituido, el original sigue elegible.
 */
export function alternativesFor(
  dayId: DayId,
  original: Exercise,
  currentKey: string,
  excludeKeys: readonly string[] = [],
  db: SubstitutionDb = SUBSTITUTION_DB,
): SubstituteExercise[] {
  const group = groupForSlot(dayId, original.id, db);
  if (!group) return [];
  return group.exercises.filter((e) => e.key !== currentKey && !excludeKeys.includes(e.key));
}

/** 'fijo' siempre está activa; 'hoy' solo el día local en que se eligió. */
export function isSwapActive(swap: ExerciseSwap, today: string): boolean {
  return swap.scope === 'fijo' || swap.date === today;
}

/**
 * Construye el ejercicio sustituto: hereda la prescripción del hueco
 * (series, reps y descanso) y toma nombre, imágenes y músculos de la base.
 */
export function buildSubstituteExercise(
  original: Exercise,
  sub: SubstituteExercise,
  group: SubstitutionGroup,
): Exercise {
  return {
    id: sub.key,
    name: sub.name,
    sets: original.sets,
    repsRange: original.repsRange,
    restSeconds: original.restSeconds,
    targetMuscles: [...group.primaryMuscles],
    freeExerciseDbId: sub.freeExerciseDbId,
    imageUrl: defaultImageUrl(sub.freeExerciseDbId),
    endImageUrl: defaultEndImageUrl(sub.freeExerciseDbId),
  };
}

export interface EffectiveExercise {
  /** Ejercicio a mostrar/registrar (el original o el sustituto). */
  exercise: Exercise;
  /** Ejercicio original de la rutina (sin mutar). */
  original: Exercise;
  /** Sustitución aplicada; null si se muestra el original. */
  swap: ExerciseSwap | null;
  group: SubstitutionGroup | null;
}

/**
 * PURA: original + sustituciones + hoy + base → ejercicio efectivo. Ignora las
 * sustituciones caducadas ('hoy' de otro día), con toKey desconocido, de otro
 * grupo o iguales al original.
 */
export function resolveEffectiveExercise(
  dayId: DayId,
  original: Exercise,
  swaps: ExerciseSwaps,
  today: string,
  db: SubstitutionDb = SUBSTITUTION_DB,
): EffectiveExercise {
  const group = groupForSlot(dayId, original.id, db);
  const swap = Object.prototype.hasOwnProperty.call(swaps, swapKey(dayId, original.id))
    ? swaps[swapKey(dayId, original.id)]
    : undefined;
  const none: EffectiveExercise = { exercise: original, original, swap: null, group };
  if (!swap || !group || !isSwapActive(swap, today) || swap.toKey === original.id) return none;
  const sub = group.exercises.find((e) => e.key === swap.toKey);
  if (!sub) return none;
  return { exercise: buildSubstituteExercise(original, sub, group), original, swap, group };
}

/**
 * Ejercicios efectivos de un día. Si una sustitución dejaría el mismo ejercicio
 * dos veces en el día, se ignora (se muestra el original de ese hueco).
 */
export function resolveDayExercises(
  day: WorkoutDay,
  swaps: ExerciseSwaps,
  today: string,
  db: SubstitutionDb = SUBSTITUTION_DB,
): EffectiveExercise[] {
  const resolved = day.exercises.map((ex) => resolveEffectiveExercise(day.id, ex, swaps, today, db));
  const used = new Set(resolved.filter((r) => !r.swap).map((r) => r.exercise.id));
  return resolved.map((r) => {
    if (!r.swap) return r;
    if (used.has(r.exercise.id)) {
      return { exercise: r.original, original: r.original, swap: null, group: r.group };
    }
    used.add(r.exercise.id);
    return r;
  });
}

/** Unión de-duplicada (en orden) de los músculos de los ejercicios efectivos. */
export function effectiveDayMuscles(list: readonly EffectiveExercise[]): MuscleId[] {
  const seen = new Set<MuscleId>();
  const out: MuscleId[] = [];
  for (const { exercise } of list) {
    for (const m of exercise.targetMuscles) {
      if (!seen.has(m)) {
        seen.add(m);
        out.push(m);
      }
    }
  }
  return out;
}

/** Aplica (o reemplaza) una sustitución. Devuelve un objeto NUEVO. */
export function applySwap(
  swaps: ExerciseSwaps,
  dayId: DayId,
  originalId: string,
  toKey: string,
  scope: ExerciseSwapScope,
  today: string,
): ExerciseSwaps {
  if (toKey === originalId) return restoreSwap(swaps, dayId, originalId);
  return { ...swaps, [swapKey(dayId, originalId)]: { toKey, scope, date: today } };
}

/** Quita la sustitución de un hueco (vuelve el original). Devuelve un objeto NUEVO. */
export function restoreSwap(swaps: ExerciseSwaps, dayId: DayId, originalId: string): ExerciseSwaps {
  const out = { ...swaps };
  delete out[swapKey(dayId, originalId)];
  return out;
}

/** Elimina las sustituciones 'hoy' caducadas. Devuelve un objeto NUEVO. */
export function pruneExpiredSwaps(swaps: ExerciseSwaps, today: string): ExerciseSwaps {
  const out: ExerciseSwaps = {};
  for (const [k, s] of Object.entries(swaps)) {
    if (isSwapActive(s, today)) out[k] = s;
  }
  return out;
}

function sanitizeSwaps(value: unknown, db: SubstitutionDb): ExerciseSwaps {
  if (!isObject(value)) return {};
  const out: ExerciseSwaps = {};
  for (const [k, s] of Object.entries(value)) {
    if (!k.includes('::') || !isObject(s)) continue;
    const { toKey, scope, date } = s;
    if (typeof toKey !== 'string' || !findSubstitute(toKey, db)) continue;
    if (scope !== 'hoy' && scope !== 'fijo') continue;
    if (typeof date !== 'string' || !DATE_RE.test(date)) continue;
    out[k] = { toKey, scope, date };
  }
  return out;
}

/**
 * Lectura defensiva de las sustituciones desde Settings: ausente o no-objeto
 * → {}; descarta entradas mal formadas, con toKey desconocido, alcance
 * desconocido o fecha inválida.
 */
export function readExerciseSwaps(
  settings: Partial<Settings> | null | undefined,
  db: SubstitutionDb = SUBSTITUTION_DB,
): ExerciseSwaps {
  return sanitizeSwaps(settings?.exerciseSwaps, db);
}

/**
 * Sanea `exerciseSwaps` de unos ajustes crudos (backup importado) SOLO si la
 * clave está presente; si falta, sigue faltando (backups antiguos intactos).
 */
export function sanitizeExerciseSwapsKey(raw: Record<string, unknown>): Record<string, unknown> {
  if (!('exerciseSwaps' in raw)) return raw;
  return { ...raw, exerciseSwaps: sanitizeSwaps(raw.exerciseSwaps, SUBSTITUTION_DB) };
}
