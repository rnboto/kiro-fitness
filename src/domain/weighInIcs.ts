// Generador PURO de iCalendar (.ics, RFC 5545) para los pesajes semanal y
// mensual. Sin dependencias: devuelve el texto; la descarga vive en la UI.
//
// - Líneas con CRLF, plegado a 75 octetos UTF-8 y escapado de texto.
// - DTSTART en hora local "flotante" (sin TZID ni Z) = próxima ocurrencia.
// - Días 29-31 del mes → BYMONTHDAY=-1 (último día de cada mes).

import type { ReminderSettings } from '../storage';
import { nextMonthlyWeighIn, nextWeeklyWeighIn, readWeighInReminders } from './weighInReminders';

const CRLF = '\r\n';
const MAX_OCTETS = 75;

/** Códigos BYDAY indexados por `Date.getDay()` (0 = domingo). */
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

export const WEEKLY_UID = 'kiro-pesaje-semanal@kiro.app';
export const MONTHLY_UID = 'kiro-pesaje-mensual@kiro.app';
export const WEEKLY_SUMMARY = 'Pesaje semanal Kiro';
export const MONTHLY_SUMMARY = 'Pesaje mensual Kiro';
export const WEEKLY_DESCRIPTION =
  'Hoy toca pesarte (pesaje semanal). Hazlo en ayunas, antes de comer y después de ir al baño. Registra tu peso en Kiro > Estadísticas > Cuerpo.';
export const MONTHLY_DESCRIPTION = 'Pesaje mensual: registra tu peso y tus medidas.';
export const MONTHLY_LAST_DAY_NOTE = ' Se repite el último día de cada mes.';

/** Octetos UTF-8 de un code point. */
function codePointOctets(cp: number): number {
  if (cp < 0x80) return 1;
  if (cp < 0x800) return 2;
  if (cp < 0x10000) return 3;
  return 4;
}

/** Escapa texto iCalendar: \ → \\, ; → \;, , → \,, salto de línea → \n. */
export function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Pliega una línea de contenido a <= 75 octetos por línea física: las
 * continuaciones empiezan por un espacio (+ <= 74 octetos de contenido).
 * Nunca corta un carácter multibyte.
 */
export function foldIcsLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let octets = 0;
  let limit = MAX_OCTETS;
  for (const ch of line) {
    const n = codePointOctets(ch.codePointAt(0) ?? 0);
    if (octets + n > limit) {
      parts.push(current);
      current = '';
      octets = 0;
      limit = MAX_OCTETS - 1; // el espacio inicial cuenta como 1 octeto
    }
    current += ch;
    octets += n;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYYMMDDTHHMMSS en hora local (flotante, sin Z). */
export function formatIcsLocal(d: Date): string {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/** YYYYMMDDTHHMMSSZ en UTC. */
export function formatIcsUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

interface IcsEvent {
  uid: string;
  start: Date;
  rrule: string;
  summary: string;
  description: string;
}

function eventLines(ev: IcsEvent, dtstamp: string): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${ev.uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatIcsLocal(ev.start)}`,
    'DURATION:PT15M',
    `RRULE:${ev.rrule}`,
    `SUMMARY:${escapeIcsText(ev.summary)}`,
    `DESCRIPTION:${escapeIcsText(ev.description)}`,
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(ev.summary)}`,
    'END:VALARM',
    'END:VEVENT',
  ];
}

/**
 * Construye el .ics con un evento recurrente por cada pesaje ACTIVO.
 * Sin pesajes activos devuelve un calendario válido sin eventos.
 */
export function buildWeighInIcs(
  reminders: Partial<ReminderSettings> | null | undefined,
  now: Date,
): string {
  const { weekly, monthly } = readWeighInReminders(reminders);
  const dtstamp = formatIcsUtc(now);
  const events: IcsEvent[] = [];

  if (weekly.enabled) {
    events.push({
      uid: WEEKLY_UID,
      start: nextWeeklyWeighIn(now, weekly.weekday, weekly.time),
      rrule: `FREQ=WEEKLY;BYDAY=${BYDAY[weekly.weekday]}`,
      summary: WEEKLY_SUMMARY,
      description: WEEKLY_DESCRIPTION,
    });
  }

  if (monthly.enabled) {
    const lastDay = monthly.dayOfMonth >= 29;
    events.push({
      uid: MONTHLY_UID,
      // Con BYMONTHDAY=-1 el primer evento debe ser un fin de mes.
      start: nextMonthlyWeighIn(now, lastDay ? 31 : monthly.dayOfMonth, monthly.time),
      rrule: `FREQ=MONTHLY;BYMONTHDAY=${lastDay ? -1 : monthly.dayOfMonth}`,
      summary: MONTHLY_SUMMARY,
      description: MONTHLY_DESCRIPTION + (lastDay ? MONTHLY_LAST_DAY_NOTE : ''),
    });
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kiro//Pesaje//ES',
    'CALSCALE:GREGORIAN',
    ...events.flatMap((ev) => eventLines(ev, dtstamp)),
    'END:VCALENDAR',
  ];
  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}
