import { describe, expect, it } from 'vitest';
import {
  MONTHLY_DESCRIPTION,
  WEEKLY_DESCRIPTION,
  buildWeighInIcs,
  escapeIcsText,
  foldIcsLine,
  formatIcsLocal,
  formatIcsUtc,
} from '../weighInIcs';
import { nextMonthlyWeighIn, nextWeeklyWeighIn } from '../weighInReminders';
import { DEFAULT_REMINDERS, type ReminderSettings } from '../../storage';

const NOW = new Date(2024, 9, 16, 12, 0); // miércoles 16 oct 2024, 12:00 local

function withWeighIns(
  weekly: Partial<NonNullable<ReminderSettings['weightWeekly']>> = {},
  monthly: Partial<NonNullable<ReminderSettings['weightMonthly']>> = {},
): ReminderSettings {
  return {
    ...DEFAULT_REMINDERS,
    weightWeekly: { enabled: true, weekday: 1, time: '06:00', ...weekly },
    weightMonthly: { enabled: true, dayOfMonth: 1, time: '06:00', ...monthly },
  };
}

function utf8Len(s: string): number {
  let n = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    n += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }
  return n;
}

const unfold = (ics: string) => ics.replace(/\r\n /g, '');
const count = (s: string, sub: string) => s.split(sub).length - 1;

describe('buildWeighInIcs', () => {
  it('estructura VCALENDAR con CRLF y sin \\n sueltos', () => {
    const ics = buildWeighInIcs(DEFAULT_REMINDERS, NOW);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(/(^|[^\r])\n/.test(ics)).toBe(false);
    expect(ics).toContain('VERSION:2.0\r\n');
    expect(ics).toContain('PRODID:-//Kiro//Pesaje//ES\r\n');
    expect(count(ics, 'BEGIN:VEVENT')).toBe(2);
    expect(count(ics, 'END:VEVENT')).toBe(2);
  });

  it('BYDAY semanal correcto', () => {
    expect(buildWeighInIcs(withWeighIns({ weekday: 1 }), NOW)).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO\r\n');
    expect(buildWeighInIcs(withWeighIns({ weekday: 0 }), NOW)).toContain('RRULE:FREQ=WEEKLY;BYDAY=SU\r\n');
    expect(buildWeighInIcs(withWeighIns({ weekday: 6 }), NOW)).toContain('RRULE:FREQ=WEEKLY;BYDAY=SA\r\n');
  });

  it('BYMONTHDAY mensual: n hasta 28, -1 para 29-31', () => {
    const rule = (d: number) => buildWeighInIcs(withWeighIns({}, { dayOfMonth: d }), NOW);
    expect(rule(15)).toContain('RRULE:FREQ=MONTHLY;BYMONTHDAY=15\r\n');
    expect(rule(28)).toContain('RRULE:FREQ=MONTHLY;BYMONTHDAY=28\r\n');
    for (const d of [29, 30, 31]) {
      const ics = rule(d);
      expect(ics).toContain('RRULE:FREQ=MONTHLY;BYMONTHDAY=-1\r\n');
      expect(unfold(ics)).toContain('Se repite el último día de cada mes.');
      // DTSTART = próximo fin de mes (31 oct 2024).
      expect(ics).toContain('DTSTART:20241031T060000\r\n');
    }
  });

  it('VALARM, DURATION, UID y DTSTAMP por evento', () => {
    const ics = buildWeighInIcs(DEFAULT_REMINDERS, NOW);
    expect(count(ics, 'BEGIN:VALARM\r\n')).toBe(2);
    expect(count(ics, 'TRIGGER:PT0M\r\n')).toBe(2);
    expect(count(ics, 'ACTION:DISPLAY\r\n')).toBe(2);
    expect(count(ics, 'END:VALARM\r\n')).toBe(2);
    expect(count(ics, 'DURATION:PT15M\r\n')).toBe(2);
    expect(ics).toContain('UID:kiro-pesaje-semanal@kiro.app\r\n');
    expect(ics).toContain('UID:kiro-pesaje-mensual@kiro.app\r\n');
    expect(count(ics, `DTSTAMP:${formatIcsUtc(NOW)}\r\n`)).toBe(2);
    expect(formatIcsUtc(NOW)).toMatch(/^\d{8}T\d{6}Z$/);
    expect(ics).toContain('SUMMARY:Pesaje semanal Kiro\r\n');
    expect(ics).toContain('SUMMARY:Pesaje mensual Kiro\r\n');
  });

  it('DTSTART flotante = próxima ocurrencia (sin Z ni TZID)', () => {
    const ics = buildWeighInIcs(DEFAULT_REMINDERS, NOW);
    expect(ics).not.toContain('TZID');
    const starts = ics.match(/DTSTART[^\r]*/g) ?? [];
    expect(starts).toEqual([
      `DTSTART:${formatIcsLocal(nextWeeklyWeighIn(NOW, 1, '06:00'))}`,
      `DTSTART:${formatIcsLocal(nextMonthlyWeighIn(NOW, 1, '06:00'))}`,
    ]);
    expect(starts).toEqual(['DTSTART:20241021T060000', 'DTSTART:20241101T060000']);
  });

  it('solo incluye los recordatorios activos', () => {
    const onlyMonthly = buildWeighInIcs(withWeighIns({ enabled: false }), NOW);
    expect(onlyMonthly).not.toContain('Pesaje semanal Kiro');
    expect(onlyMonthly).toContain('Pesaje mensual Kiro');
    expect(count(onlyMonthly, 'BEGIN:VEVENT')).toBe(1);

    const onlyWeekly = buildWeighInIcs(withWeighIns({}, { enabled: false }), NOW);
    expect(onlyWeekly).toContain('Pesaje semanal Kiro');
    expect(onlyWeekly).not.toContain('Pesaje mensual Kiro');

    const none = buildWeighInIcs(withWeighIns({ enabled: false }, { enabled: false }), NOW);
    expect(none).not.toContain('BEGIN:VEVENT');
    expect(none.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(none.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('recordatorios antiguos sin claves → ambos eventos con defaults', () => {
    const { weightWeekly: _w, weightMonthly: _m, ...legacy } = DEFAULT_REMINDERS;
    const ics = buildWeighInIcs(legacy, NOW);
    expect(ics).toContain('BYDAY=MO');
    expect(ics).toContain('BYMONTHDAY=1\r\n');
  });

  it('escapa comas, punto y coma y barras invertidas', () => {
    expect(escapeIcsText('a,b;c\\d')).toBe('a\\,b\\;c\\\\d');
    expect(escapeIcsText('l1\nl2')).toBe('l1\\nl2');
    const ics = unfold(buildWeighInIcs(DEFAULT_REMINDERS, NOW));
    expect(ics).toContain('DESCRIPTION:Hoy toca pesarte (pesaje semanal). Hazlo en ayunas\\, antes de comer');
  });

  it('pliega líneas a <= 75 octetos y al desplegar recupera el texto', () => {
    const ics = buildWeighInIcs(DEFAULT_REMINDERS, NOW);
    const lines = ics.split('\r\n');
    for (const line of lines) expect(utf8Len(line)).toBeLessThanOrEqual(75);
    expect(lines.some((l) => l.startsWith(' '))).toBe(true);
    const unfolded = unfold(ics);
    expect(unfolded).toContain(`DESCRIPTION:${escapeIcsText(WEEKLY_DESCRIPTION)}\r\n`);
    expect(unfolded).toContain(`DESCRIPTION:${escapeIcsText(MONTHLY_DESCRIPTION)}\r\n`);
  });

  it('el plegado no parte caracteres multibyte', () => {
    const long = `DESCRIPTION:${'é'.repeat(80)}`;
    const folded = foldIcsLine(long);
    const parts = folded.split('\r\n');
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) {
      expect(utf8Len(p)).toBeLessThanOrEqual(75);
      expect(p).not.toContain('\uFFFD');
    }
    expect(folded.replace(/\r\n /g, '')).toBe(long);
    expect(foldIcsLine('CORTA')).toBe('CORTA');
  });
});
