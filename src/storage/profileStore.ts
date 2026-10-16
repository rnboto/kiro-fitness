// Store de perfil / histórico Evolt (design §5).
// Store 'profiles': keyPath 'id' autoincrement, índice 'date'.
// Se siembra VACÍO (sin datos personales).

import { getBackend } from './db';
import type { ProfileEntry } from './types';

const STORE = 'profiles' as const;

/** Datos de una medición nueva (sin id; se asigna al insertar). */
export type NewProfileEntry = Omit<ProfileEntry, 'id'>;

/**
 * Inserta SIEMPRE una entrada nueva datada; nunca sobrescribe una existente.
 * Devuelve la entrada ya persistida con su id.
 */
export async function addEntry(entry: NewProfileEntry): Promise<ProfileEntry> {
  const backend = await getBackend();
  const id = await backend.add<NewProfileEntry>(STORE, entry);
  return { ...entry, id };
}

/** Todas las entradas ordenadas por date ascendente (empate: id ascendente). */
export async function getAllEntries(): Promise<ProfileEntry[]> {
  const backend = await getBackend();
  const rows = await backend.getAll<ProfileEntry>(STORE);
  return rows.sort((a, b) => {
    if (a.date === b.date) return a.id - b.id;
    return a.date < b.date ? -1 : 1;
  });
}

/**
 * Perfil actual = entrada con date más reciente; en empate de date, el id mayor.
 * Devuelve null si no hay ninguna entrada (primer arranque).
 */
export async function getLatestProfile(): Promise<ProfileEntry | null> {
  const entries = await getAllEntries();
  if (entries.length === 0) return null;
  // getAllEntries está ordenado ascendente por (date, id); el último es el más reciente.
  return entries[entries.length - 1];
}
