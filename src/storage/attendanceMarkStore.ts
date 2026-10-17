// Store de marcas manuales de asistencia (calendario de Adherencia).
// Store 'attendanceMarks': keyPath 'date' (clave 'YYYY-MM-DD', no autoincrement),
// de modo que una marca es idempotente y alternar = set/delete por clave.
// Mismo patrón que cardioStore (getBackend + fallback localStorage).

import { getBackend } from './db';

const STORE = 'attendanceMarks' as const;

/** Registro persistido: una fecha local 'YYYY-MM-DD' marcada manualmente. */
export interface AttendanceMark {
  date: string; // 'YYYY-MM-DD' (fecha local)
}

/** Añade (upsert) una marca manual para una fecha. Idempotente. */
export async function addAttendanceMark(date: string): Promise<void> {
  const backend = await getBackend();
  await backend.set<AttendanceMark>(STORE, { date });
}

/** Elimina la marca manual de una fecha (no falla si no existe). */
export async function removeAttendanceMark(date: string): Promise<void> {
  const backend = await getBackend();
  await backend.delete(STORE, date);
}

/** Todas las fechas marcadas manualmente, ordenadas ascendente. */
export async function getAllAttendanceMarks(): Promise<string[]> {
  const backend = await getBackend();
  const rows = await backend.getAll<AttendanceMark>(STORE);
  return rows.map((r) => r.date).sort((a, b) => a.localeCompare(b));
}
