// Capa PURA del calendario de asistencia (sin React ni storage).
// Deriva el conjunto de días entrenados (fuerza O cardio) por fecha LOCAL y
// calcula la racha y el conteo mensual. `now` es inyectable para los tests.

import type { CardioSession, LoggedSet } from '../storage';

/**
 * Convierte una fecha ISO a su clave de día LOCAL 'YYYY-MM-DD'.
 *
 * A diferencia de `toDayKey` (statsSelectors) que corta el ISO en crudo (UTC si
 * termina en 'Z'), aquí se usa la fecha de calendario LOCAL del usuario: el
 * calendario es una vista visual de "qué días reales entrené", por lo que la
 * fecha local es la correcta. Formatea los componentes locales con padding, sin
 * depender de ninguna librería ni del locale.
 */
export function toLocalDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y.toString().padStart(4, '0')}-${m
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/** Clave de día local 'YYYY-MM-DD' para un objeto Date. */
function dateToLocalKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y.toString().padStart(4, '0')}-${m
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/**
 * Conjunto de días entrenados AUTOMÁTICAMENTE: un día cuenta si tiene al menos
 * un LoggedSet de fuerza O al menos una CardioSession, por su fecha LOCAL. Un
 * día que combina fuerza y cardio aparece una sola vez.
 */
export function selectTrainedDays(
  sets: LoggedSet[],
  cardio: CardioSession[],
): Set<string> {
  const days = new Set<string>();
  for (const s of sets) days.add(toLocalDayKey(s.date));
  for (const c of cardio) days.add(toLocalDayKey(c.date));
  return days;
}

/**
 * Conjunto de días entrenados = auto (fuerza/cardio) UNIÓN marcas manuales.
 * Las marcas manuales ya vienen como claves locales 'YYYY-MM-DD'.
 */
export function selectTrainedDaysWithManual(
  sets: LoggedSet[],
  cardio: CardioSession[],
  manualMarks: string[],
): Set<string> {
  const days = selectTrainedDays(sets, cardio);
  for (const m of manualMarks) days.add(m);
  return days;
}

/**
 * Racha = nº de días consecutivos entrenados que terminan HOY si hoy está
 * entrenado; si no, que terminan AYER (así un hoy aún sin entrenar no pone la
 * racha a cero). Si ni hoy ni ayer están entrenados, la racha es 0.
 */
export function selectCurrentStreak(
  trained: Set<string>,
  now: Date = new Date(),
): number {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Punto de partida: hoy si está entrenado, si no ayer.
  const cursor = new Date(today);
  if (!trained.has(dateToLocalKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!trained.has(dateToLocalKey(cursor))) return 0;
  }

  let streak = 0;
  while (trained.has(dateToLocalKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Nº de días entrenados dentro de un mes concreto (año + mes base 0), contando
 * las claves 'YYYY-MM-DD' del conjunto que caen en ese mes.
 */
export function countTrainedInMonth(
  trained: Set<string>,
  year: number,
  monthIndex0: number,
): number {
  const prefix = `${year.toString().padStart(4, '0')}-${(monthIndex0 + 1)
    .toString()
    .padStart(2, '0')}-`;
  let count = 0;
  for (const key of trained) {
    if (key.startsWith(prefix)) count += 1;
  }
  return count;
}
