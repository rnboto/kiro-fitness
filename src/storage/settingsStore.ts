// Store de ajustes de la app (design §5).
// Store 'settings': singleton bajo la clave 'app'.
// getSettings() siembra DEFAULT_SETTINGS la primera vez.

import { getBackend } from './db';
import { DEFAULT_SETTINGS, type Settings } from './types';

const STORE = 'settings' as const;
const SINGLETON_KEY = 'app';

/** Envoltorio persistido: el keyPath del store es 'key'. */
interface SettingsRecord {
  key: typeof SINGLETON_KEY;
  value: Settings;
}

/**
 * Devuelve los ajustes. Si no existen, siembra DEFAULT_SETTINGS y los devuelve.
 */
export async function getSettings(): Promise<Settings> {
  const backend = await getBackend();
  const existing = await backend.get<SettingsRecord>(STORE, SINGLETON_KEY);
  if (existing) return existing.value;
  await backend.set<SettingsRecord>(STORE, { key: SINGLETON_KEY, value: DEFAULT_SETTINGS });
  return DEFAULT_SETTINGS;
}

/** Guarda (upsert) el singleton de ajustes. */
export async function saveSettings(settings: Settings): Promise<void> {
  const backend = await getBackend();
  await backend.set<SettingsRecord>(STORE, { key: SINGLETON_KEY, value: settings });
}
