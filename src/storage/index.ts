// Barrel de la capa de persistencia.
export type {
  DayId,
  ProfileEntry,
  LoggedSet,
  CardioSession,
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

export {
  addCardioSession,
  getAllCardioSessions,
  deleteCardioSession,
  type NewCardioSession,
} from './cardioStore';

export { getSettings, saveSettings } from './settingsStore';

export { exportAll, importReplace, importMerge } from './backup';
