// Store de perfil / histórico Evolt (design §5).
// Store 'profiles': keyPath 'id' autoincrement, índice 'date'.
// Se siembra VACÍO (sin datos personales).

import { getBackend } from './db';
import type { ProfileEntry } from './types';
import {
  canDeleteMeasurement,
  selectCurrentProfile,
  sortProfileHistory,
} from '../domain/profileHistory';

const STORE = 'profiles' as const;

/** Datos de una medición nueva (sin id; se asigna al insertar). */
export type NewProfileEntry = Omit<ProfileEntry, 'id'>;

/** Patch editable de una medición (todo menos el id). */
export type ProfileEntryPatch = Partial<NewProfileEntry>;

/**
 * Inserta SIEMPRE una entrada nueva datada; nunca sobrescribe una existente.
 * Devuelve la entrada ya persistida con su id.
 */
export async function addEntry(entry: NewProfileEntry): Promise<ProfileEntry> {
  const backend = await getBackend();
  const id = await backend.add<NewProfileEntry>(STORE, entry);
  return { ...entry, id };
}

/**
 * Actualiza EN SITIO la entrada `id` conservando su id (upsert por keyPath en
 * ambos backends). Devuelve la entrada guardada o null si no existe.
 */
export async function updateEntry(
  id: number,
  patch: ProfileEntryPatch,
): Promise<ProfileEntry | null> {
  const backend = await getBackend();
  const existing = await backend.get<ProfileEntry>(STORE, id);
  if (!existing) return null;
  // Un `id` dentro del patch se ignora: el id original manda siempre.
  const { id: _ignored, ...safe } = patch as ProfileEntryPatch & { id?: number };
  const next: ProfileEntry = { ...existing, ...safe, id };
  await backend.set<ProfileEntry>(STORE, next);
  return next;
}

/**
 * Borra la entrada `id`. Nunca borra la ÚLTIMA medición restante (devuelve
 * false sin tocar nada) para no reactivar el onboarding por accidente.
 */
export async function deleteEntry(id: number): Promise<boolean> {
  const backend = await getBackend();
  const rows = await backend.getAll<ProfileEntry>(STORE);
  if (!rows.some((r) => r.id === id)) return false;
  if (!canDeleteMeasurement(rows)) return false;
  await backend.delete(STORE, id);
  return true;
}

/** Todas las entradas ordenadas por día ascendente (empate: id ascendente). */
export async function getAllEntries(): Promise<ProfileEntry[]> {
  const backend = await getBackend();
  const rows = await backend.getAll<ProfileEntry>(STORE);
  return sortProfileHistory(rows);
}

/**
 * Perfil actual = entrada con día más reciente; en empate de día, el id mayor.
 * Devuelve null si no hay ninguna entrada (primer arranque).
 */
export async function getLatestProfile(): Promise<ProfileEntry | null> {
  const backend = await getBackend();
  return selectCurrentProfile(await backend.getAll<ProfileEntry>(STORE));
}
