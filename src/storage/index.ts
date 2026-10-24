// Barrel de la capa de persistencia.
export type {
  DayId,
  ProfileEntry,
  LoggedSet,
  CardioSession,
  Settings,
  ReminderSettings,
  ExerciseSwap,
  ExerciseSwaps,
  ExerciseSwapScope,
} from './types';
export { DEFAULT_SETTINGS, DEFAULT_REMINDERS } from './types';

export { getBackend, type StorageBackend, type StoreName } from './db';

export {
  addEntry,
  getAllEntries,
  getLatestProfile,
  updateEntry,
  deleteEntry,
  type NewProfileEntry,
  type ProfileEntryPatch,
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

export {
  addAttendanceMark,
  removeAttendanceMark,
  getAllAttendanceMarks,
  type AttendanceMark,
} from './attendanceMarkStore';

export { exportAll, importReplace, importMerge } from './backup';
