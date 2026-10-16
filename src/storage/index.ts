// Barrel de la capa de persistencia.
export type {
  DayId,
  ProfileEntry,
  LoggedSet,
  Settings,
  ReminderSettings,
} from './types';
export { DEFAULT_SETTINGS, DEFAULT_REMINDERS } from './types';

export { getBackend, type StorageBackend, type StoreName } from './db';

export {
  addEntry,
  getAllEntries,
  getLatestProfile,
  type NewProfileEntry,
} from './profileStore';

export {
  addSet,
  getAllSets,
  getLastSet,
  type NewLoggedSet,
} from './workoutLogStore';

export { getSettings, saveSettings } from './settingsStore';
