// Store de series registradas en el gimnasio (design §5).
// Store 'workoutSets': keyPath 'id' autoincrement.

import { getBackend } from './db';
import type { LoggedSet } from './types';

const STORE = 'workoutSets' as const;

/** Datos de una serie nueva (sin id; se asigna al insertar). */
export type NewLoggedSet = Omit<LoggedSet, 'id'>;

/** Inserta una serie registrada; devuelve la entrada con su id. */
export async function addSet(set: NewLoggedSet): Promise<LoggedSet> {
  const backend = await getBackend();
  const id = await backend.add<NewLoggedSet>(STORE, set);
  return { ...set, id };
}

/** Todas las series ordenadas por date ascendente (empate: id ascendente). */
export async function getAllSets(): Promise<LoggedSet[]> {
  const backend = await getBackend();
  const rows = await backend.getAll<LoggedSet>(STORE);
  return rows.sort((a, b) => {
    if (a.date === b.date) return a.id - b.id;
    return a.date < b.date ? -1 : 1;
  });
}

/**
 * Última serie registrada para un ejercicio (la más reciente por date; empate: id mayor).
 * Devuelve null si no hay ninguna.
 */
export async function getLastSet(exerciseId: string): Promise<LoggedSet | null> {
  const all = await getAllSets();
  const forExercise = all.filter((s) => s.exerciseId === exerciseId);
  if (forExercise.length === 0) return null;
  return forExercise[forExercise.length - 1];
}
