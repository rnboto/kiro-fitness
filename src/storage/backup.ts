// Puente entre la capa pura de export/import (domain/dataPorting) y los stores.
// Lee todo el estado on-device y aplica un backup en modo reemplazar o fusionar.

import { getBackend } from './db';
import { getAllEntries } from './profileStore';
import { getAllSets } from './workoutLogStore';
import { getAllCardioSessions } from './cardioStore';
import { getSettings, saveSettings } from './settingsStore';
import {
  buildBackup,
  mergeBackup,
  type BackupData,
  type KiroBackup,
} from '../domain/dataPorting';
import type { CardioSession, LoggedSet, ProfileEntry } from './types';

/** Lee todos los datos actuales en un objeto plano. */
async function readAllData(): Promise<BackupData> {
  const [profiles, sets, cardio, settings] = await Promise.all([
    getAllEntries(),
    getAllSets(),
    getAllCardioSessions(),
    getSettings(),
  ]);
  return { profiles, sets, cardio, settings };
}

/** Construye un backup completo con todos los datos on-device. */
export async function exportAll(now: Date = new Date()): Promise<KiroBackup> {
  const data = await readAllData();
  return buildBackup(data, now);
}

/** Reinserta en bloque una colección autoincrement respetando sus ids. */
async function replaceStore<T extends { id: number }>(
  store: 'profiles' | 'workoutSets' | 'cardioSessions',
  rows: T[],
): Promise<void> {
  const backend = await getBackend();
  await backend.clear(store);
  let maxId = 0;
  for (const row of rows) {
    await backend.set<T>(store, row);
    if (row.id > maxId) maxId = row.id;
  }
  // Evita que un futuro autoincrement colisione con ids reinsertados.
  await backend.ensureSeqAtLeast(store, maxId);
}

/**
 * Reemplaza TODOS los datos por los del backup: vacía profiles/workoutSets/
 * cardioSessions y reinserta los del backup, luego guarda los ajustes.
 */
export async function importReplace(backup: KiroBackup): Promise<void> {
  await replaceStore<ProfileEntry>('profiles', backup.profiles);
  await replaceStore<LoggedSet>('workoutSets', backup.sets);
  await replaceStore<CardioSession>('cardioSessions', backup.cardio);
  await saveSettings(backup.settings);
}

/**
 * Fusiona el backup con lo existente: añade por id lo que falte, sin borrar ni
 * tocar los ajustes actuales.
 */
export async function importMerge(backup: KiroBackup): Promise<void> {
  const current = await readAllData();
  const merged = mergeBackup(current, backup);
  await replaceStore<ProfileEntry>('profiles', merged.profiles);
  await replaceStore<LoggedSet>('workoutSets', merged.sets);
  await replaceStore<CardioSession>('cardioSessions', merged.cardio);
  // settings se conserva (mergeBackup no lo cambia); no se reescribe.
}
