// Selector PURO compartido del histórico de mediciones (sin React ni storage).
// Única fuente de verdad para ordenar el histórico y derivar el "perfil actual":
// gana el día más reciente y, en empate de día, la entrada añadida DESPUÉS (id mayor).

import type { ProfileEntry } from '../storage';

/** Mensaje mostrado cuando no se puede borrar la última medición. */
export const MIN_MEASUREMENTS_MESSAGE = 'Necesitas al menos una medición';

/** Día natural ('YYYY-MM-DD') de una fecha ISO con o sin hora. */
export function profileDayKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Comparador ascendente: primero por día natural y, en empate, por id
 * (la entrada añadida más tarde queda al final = la más reciente).
 */
export function compareProfileEntries(a: ProfileEntry, b: ProfileEntry): number {
  const byDay = profileDayKey(a.date).localeCompare(profileDayKey(b.date));
  return byDay !== 0 ? byDay : a.id - b.id;
}

/** Copia del histórico ordenada ascendente (nunca muta la entrada). */
export function sortProfileHistory(entries: readonly ProfileEntry[]): ProfileEntry[] {
  return entries.slice().sort(compareProfileEntries);
}

/** Perfil actual = máximo según `compareProfileEntries`; null si no hay entradas. */
export function selectCurrentProfile(entries: readonly ProfileEntry[]): ProfileEntry | null {
  let best: ProfileEntry | null = null;
  for (const e of entries) {
    if (best === null || compareProfileEntries(e, best) > 0) best = e;
  }
  return best;
}

/** Solo se puede borrar una medición si queda al menos otra. */
export function canDeleteMeasurement(entries: readonly ProfileEntry[]): boolean {
  return entries.length > 1;
}
