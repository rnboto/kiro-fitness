import { describe, expect, it } from 'vitest';
import type { CardioSession, LoggedSet, ProfileEntry, Settings } from '../../storage';
import { DEFAULT_SETTINGS } from '../../storage/types';
import {
  buildBackup,
  mergeBackup,
  parseBackup,
  serializeBackup,
  toCsv,
  type BackupData,
} from '../dataPorting';

const NOW = new Date('2024-06-15T12:00:00.000Z');

const profiles: ProfileEntry[] = [
  { id: 1, date: '2024-06-10', age: 30, heightCm: 178, sex: 'M', weightKg: 81, bodyFatPct: 15, mmeKg: 38 },
];
const sets: LoggedSet[] = [
  { id: 1, date: '2024-06-10T07:00:00.000Z', dayId: 'torsoA', exerciseId: 'bench_press', setIndex: 1, weightKg: 60, reps: 10 },
];
const cardio: CardioSession[] = [
  { id: 1, date: '2024-06-11T07:00:00.000Z', type: 'correr', durationMin: 35, distanceKm: 6.2, calories: 420, notes: 'tirada, suave' },
];
const settings: Settings = DEFAULT_SETTINGS;

const data: BackupData = { profiles, sets, cardio, settings };

describe('round-trip buildBackup → serialize → parse', () => {
  it('devuelve datos idénticos', () => {
    const backup = buildBackup(data, NOW);
    const text = serializeBackup(backup);
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.profiles).toEqual(profiles);
      expect(result.backup.sets).toEqual(sets);
      expect(result.backup.cardio).toEqual(cardio);
      expect(result.backup.settings).toEqual(settings);
      expect(result.backup.schemaVersion).toBe(1);
      expect(result.backup.exportedAt).toBe(NOW.toISOString());
    }
  });
});

describe('round-trip con el nuevo campo durationSec', () => {
  it('una sesión nueva con durationSec sobrevive idéntica (schemaVersion 1)', () => {
    const newCardio: CardioSession[] = [
      {
        id: 7,
        date: '2024-06-13T07:00:00.000Z',
        type: 'correr',
        durationMin: 29, // round(1710/60)
        durationSec: 1710,
        distanceKm: 6.2,
      },
    ];
    const backup = buildBackup({ ...data, cardio: newCardio }, NOW);
    const result = parseBackup(serializeBackup(backup));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.schemaVersion).toBe(1);
      expect(result.backup.cardio).toEqual(newCardio);
      expect(result.backup.cardio[0].durationSec).toBe(1710);
    }
  });

  it('un archivo antiguo sin durationSec (solo durationMin) importa bien', () => {
    const legacy = {
      schemaVersion: 1,
      exportedAt: NOW.toISOString(),
      profiles: [],
      sets: [],
      cardio: [
        {
          id: 1,
          date: '2024-05-01T07:00:00.000Z',
          type: 'bici',
          durationMin: 45,
          distanceKm: 18,
        },
      ],
      settings,
    };
    const result = parseBackup(JSON.stringify(legacy));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const session = result.backup.cardio[0];
      // Conserva durationMin y NO inventa durationSec en el parseo.
      expect(session.durationMin).toBe(45);
      expect(session.durationSec).toBeUndefined();
    }
  });
});

describe('parseBackup rechaza entradas inválidas sin lanzar', () => {
  it('JSON malformado', () => {
    const r = parseBackup('{ no es json');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/JSON/i);
  });

  it('schemaVersion incorrecto', () => {
    const r = parseBackup(JSON.stringify({ schemaVersion: 99, profiles: [], sets: [], cardio: [], settings: {} }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/esquema/i);
  });

  it('listas ausentes', () => {
    const r = parseBackup(JSON.stringify({ schemaVersion: 1, settings: {} }));
    expect(r.ok).toBe(false);
  });

  it('ajustes no objeto', () => {
    const r = parseBackup(JSON.stringify({ schemaVersion: 1, profiles: [], sets: [], cardio: [], settings: 5 }));
    expect(r.ok).toBe(false);
  });
});

describe('mergeBackup', () => {
  it('no duplica por id y conserva lo existente', () => {
    const incoming = buildBackup(
      {
        profiles: [profiles[0], { ...profiles[0], id: 2, weightKg: 80 }],
        sets: [sets[0]], // id ya existente → no se duplica
        cardio: [{ ...cardio[0], id: 2, type: 'bici' }],
        settings: { ...settings, activityFactor: 1.9 },
      },
      NOW,
    );
    const merged = mergeBackup(data, incoming);
    expect(merged.profiles.map((p) => p.id).sort()).toEqual([1, 2]);
    expect(merged.sets).toHaveLength(1); // no se duplica el id 1
    expect(merged.cardio.map((c) => c.id).sort()).toEqual([1, 2]);
    // settings se conserva (merge no toca ajustes).
    expect(merged.settings.activityFactor).toBe(settings.activityFactor);
  });
});

describe('attendance (marcas manuales) en backup', () => {
  it('un backup antiguo SIN la clave attendance parsea ok con attendance = []', () => {
    const legacy = {
      schemaVersion: 1,
      exportedAt: NOW.toISOString(),
      profiles: [],
      sets: [],
      cardio: [],
      settings,
    };
    const result = parseBackup(JSON.stringify(legacy));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.attendance).toEqual([]);
  });

  it('un backup CON attendance hace round-trip del array', () => {
    const backup = buildBackup({ ...data, attendance: ['2024-06-01', '2024-06-05'] }, NOW);
    const result = parseBackup(serializeBackup(backup));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.attendance).toEqual(['2024-06-01', '2024-06-05']);
    }
  });

  it('attendance no-array se normaliza a [] sin rechazar el archivo', () => {
    const broken = {
      schemaVersion: 1,
      exportedAt: NOW.toISOString(),
      profiles: [],
      sets: [],
      cardio: [],
      settings,
      attendance: 'no-es-array',
    };
    const result = parseBackup(JSON.stringify(broken));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.attendance).toEqual([]);
  });

  it('mergeBackup une las marcas de asistencia sin duplicados', () => {
    const incoming = buildBackup(
      { ...data, attendance: ['2024-06-05', '2024-06-10'] },
      NOW,
    );
    const merged = mergeBackup({ ...data, attendance: ['2024-06-05', '2024-06-01'] }, incoming);
    expect(merged.attendance).toEqual(['2024-06-01', '2024-06-05', '2024-06-10']);
  });
});

describe('toCsv', () => {
  it('emite cabecera con columna tipo y una fila por entrada en rango', () => {
    const csv = toCsv(data, new Date('2024-06-01'), new Date('2024-06-30'));
    const lines = csv.split('\n');
    expect(lines[0].startsWith('tipo,fecha,')).toBe(true);
    expect(lines.some((l) => l.startsWith('medicion,'))).toBe(true);
    expect(lines.some((l) => l.startsWith('fuerza,'))).toBe(true);
    expect(lines.some((l) => l.startsWith('cardio,'))).toBe(true);
    // Texto con coma se escapa entre comillas.
    expect(csv).toContain('"tirada, suave"');
  });

  it('filtra por rango', () => {
    const csv = toCsv(data, new Date('2023-01-01'), new Date('2023-12-31'));
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1); // solo la cabecera
  });
});
