// Capa PURA de exportación/importación de datos (sin React ni storage).
// Define el formato de backup JSON versionado, su (de)serialización, validación
// segura (nunca lanza) y la fusión por id, además del volcado a CSV por rango.

import type { CardioSession, LoggedSet, ProfileEntry, Settings } from '../storage';
import { sanitizeGoalKeys } from './goal';
import { sanitizeExerciseSwapsKey } from './exerciseSubstitutions';
import { sanitizeSelectedPlatesKey } from './plateSelection';

/** Versión actual del esquema del backup JSON. */
export const SCHEMA_VERSION = 1 as const;

/** Backup completo de los datos on-device. */
export interface KiroBackup {
  schemaVersion: typeof SCHEMA_VERSION;
  exportedAt: string; // ISO 8601
  profiles: ProfileEntry[];
  sets: LoggedSet[];
  cardio: CardioSession[];
  /**
   * Ajustes. Incluye, opcionalmente, el objetivo de peso (goalWeightKg/goalStartWeightKg)
   * las sustituciones de ejercicios (exerciseSwaps) y los platos elegidos (selectedPlates).
   */
  settings: Settings;
  /** Marcas manuales de asistencia ('YYYY-MM-DD'). Opcional por compatibilidad. */
  attendance?: string[];
}

/** Datos crudos a empaquetar en un backup. */
export interface BackupData {
  profiles: ProfileEntry[];
  sets: LoggedSet[];
  cardio: CardioSession[];
  settings: Settings;
  /** Marcas manuales de asistencia ('YYYY-MM-DD'). Opcional por compatibilidad. */
  attendance?: string[];
}

/** Resultado de parsear un backup: éxito con datos o error en español. */
export type ParseResult =
  | { ok: true; backup: KiroBackup }
  | { ok: false; error: string };

/** Construye un backup con marca de tiempo. */
export function buildBackup(data: BackupData, now: Date = new Date()): KiroBackup {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    profiles: data.profiles,
    sets: data.sets,
    cardio: data.cardio,
    settings: data.settings,
    attendance: data.attendance ?? [],
  };
}

/** Serializa un backup a JSON indentado. */
export function serializeBackup(backup: KiroBackup): string {
  return JSON.stringify(backup, null, 2);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Parsea y valida un backup desde texto. Nunca lanza: ante cualquier problema
 * devuelve { ok: false, error } con un mensaje EN ESPAÑOL.
 */
export function parseBackup(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' };
  }
  if (!isObject(parsed)) {
    return { ok: false, error: 'El contenido del archivo no tiene el formato esperado.' };
  }
  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Versión de esquema no compatible (se esperaba ${SCHEMA_VERSION}).`,
    };
  }
  if (
    !Array.isArray(parsed.profiles) ||
    !Array.isArray(parsed.sets) ||
    !Array.isArray(parsed.cardio)
  ) {
    return {
      ok: false,
      error: 'El archivo no contiene las listas de datos esperadas (perfil, fuerza, cardio).',
    };
  }
  if (!isObject(parsed.settings)) {
    return { ok: false, error: 'El archivo no contiene unos ajustes válidos.' };
  }
  // `attendance` es opcional: los backups antiguos no lo traen. Solo se acepta
  // cuando es un array de strings; si no, se usa [] (sin rechazar el archivo).
  const attendance =
    Array.isArray(parsed.attendance) &&
    parsed.attendance.every((v) => typeof v === 'string')
      ? (parsed.attendance as string[])
      : [];
  return {
    ok: true,
    backup: {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
      profiles: parsed.profiles as ProfileEntry[],
      sets: parsed.sets as LoggedSet[],
      cardio: parsed.cardio as CardioSession[],
      // Las claves de objetivo (goalWeightKg/goalStartWeightKg) son opcionales:
      // se sanean solo si vienen; los backups antiguos quedan idénticos.
      // Igual con las sustituciones de ejercicios (exerciseSwaps): opcional.
      // Y con los platos elegidos por comida (selectedPlates): opcional.
      settings: sanitizeSelectedPlatesKey(
        sanitizeExerciseSwapsKey(sanitizeGoalKeys(parsed.settings)),
      ) as unknown as Settings,
      attendance,
    },
  };
}

/** Fusiona dos listas con clave `id`, sin duplicar ni borrar los existentes. */
function mergeById<T extends { id: number }>(current: T[], incoming: T[]): T[] {
  const seen = new Set(current.map((r) => r.id));
  const merged = current.slice();
  for (const row of incoming) {
    if (!seen.has(row.id)) {
      merged.push(row);
      seen.add(row.id);
    }
  }
  return merged;
}

/**
 * Fusiona un backup entrante con los datos actuales: añade por id lo que no
 * exista (profiles/sets/cardio) sin borrar nada. Los ajustes actuales se
 * conservan (la fusión no toca settings; eso incluye el objetivo de peso).
 */
export function mergeBackup(current: BackupData, incoming: KiroBackup): BackupData {
  const attendance = Array.from(
    new Set([...(current.attendance ?? []), ...(incoming.attendance ?? [])]),
  ).sort((a, b) => a.localeCompare(b));
  return {
    profiles: mergeById(current.profiles, incoming.profiles),
    sets: mergeById(current.sets, incoming.sets),
    cardio: mergeById(current.cardio, incoming.cardio),
    settings: current.settings,
    attendance,
  };
}

/** Escapa un campo CSV (comillas dobles si contiene coma, comilla o salto). */
function csvCell(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** True si la fecha ISO cae dentro del rango [from, to] (ambos inclusive por día). */
function withinRange(iso: string, from: Date, to: Date): boolean {
  const day = iso.slice(0, 10);
  const fromDay = from.toISOString().slice(0, 10);
  const toDay = to.toISOString().slice(0, 10);
  return day >= fromDay && day <= toDay;
}

const CSV_HEADER = [
  'tipo',
  'fecha',
  'peso_kg',
  'grasa_pct',
  'mme_kg',
  'ejercicio',
  'serie',
  'peso_serie_kg',
  'reps',
  'cardio_tipo',
  'duracion_min',
  'distancia_km',
  'calorias',
  'notas',
];

/**
 * Vuelca mediciones, series de fuerza y sesiones de cardio del rango [from,to]
 * a una única tabla CSV con columna `tipo` por fila (medicion/fuerza/cardio).
 * Pensado para lectura/compartir, no para re-import.
 */
export function toCsv(data: BackupData, from: Date, to: Date): string {
  const rows: string[][] = [CSV_HEADER];

  for (const p of data.profiles) {
    if (!withinRange(p.date, from, to)) continue;
    rows.push([
      'medicion',
      p.date.slice(0, 10),
      String(p.weightKg),
      String(p.bodyFatPct),
      String(p.mmeKg),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  }

  for (const s of data.sets) {
    if (!withinRange(s.date, from, to)) continue;
    rows.push([
      'fuerza',
      s.date.slice(0, 10),
      '',
      '',
      '',
      s.exerciseId,
      String(s.setIndex),
      String(s.weightKg),
      String(s.reps),
      '',
      '',
      '',
      '',
      '',
    ]);
  }

  for (const c of data.cardio) {
    if (!withinRange(c.date, from, to)) continue;
    rows.push([
      'cardio',
      c.date.slice(0, 10),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      c.type,
      String(c.durationMin),
      String(c.distanceKm),
      c.calories !== undefined ? String(c.calories) : '',
      c.notes ?? '',
    ]);
  }

  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}
