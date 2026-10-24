import { describe, expect, it } from 'vitest';
import type { ProfileEntry } from '../../storage';
import {
  canDeleteMeasurement,
  selectCurrentProfile,
  sortProfileHistory,
} from '../profileHistory';

function entry(id: number, date: string, weightKg = 80): ProfileEntry {
  return { id, date, age: 30, heightCm: 178, sex: 'M', weightKg, bodyFatPct: 15, mmeKg: 38 };
}

describe('selectCurrentProfile', () => {
  it('lista vacía → null', () => {
    expect(selectCurrentProfile([])).toBeNull();
  });

  it('una sola entrada → esa entrada', () => {
    const e = entry(1, '2026-10-17');
    expect(selectCurrentProfile([e])).toBe(e);
  });

  it('fechas distintas: gana la más reciente aunque esté primera en el array', () => {
    const newest = entry(1, '2026-10-20');
    const older = entry(2, '2026-10-10');
    expect(selectCurrentProfile([newest, older])?.id).toBe(1);
    expect(selectCurrentProfile([older, newest])?.id).toBe(1);
  });

  it('mismo día: gana el id mayor sin importar el orden del array', () => {
    const a = entry(3, '2026-10-17');
    const b = entry(7, '2026-10-17');
    expect(selectCurrentProfile([a, b])?.id).toBe(7);
    expect(selectCurrentProfile([b, a])?.id).toBe(7);
  });

  it('formatos mixtos el mismo día: gana el id mayor', () => {
    const withTime = entry(1, '2026-10-17T08:00:00.000Z');
    const dayOnly = entry(2, '2026-10-17');
    expect(selectCurrentProfile([withTime, dayOnly])?.id).toBe(2);
    expect(selectCurrentProfile([dayOnly, withTime])?.id).toBe(2);
  });
});

describe('sortProfileHistory', () => {
  it('ordena ascendente por día y luego id, sin mutar la entrada', () => {
    const input = [
      entry(4, '2026-10-17'),
      entry(2, '2026-10-18'),
      entry(1, '2026-10-17T08:00:00.000Z'),
      entry(3, '2026-10-01'),
    ];
    const snapshot = input.map((e) => e.id);
    const sorted = sortProfileHistory(input);
    expect(sorted.map((e) => e.id)).toEqual([3, 1, 4, 2]);
    expect(input.map((e) => e.id)).toEqual(snapshot);
  });
});

describe('canDeleteMeasurement', () => {
  it('false con 0 o 1 entradas y true con 2', () => {
    expect(canDeleteMeasurement([])).toBe(false);
    expect(canDeleteMeasurement([entry(1, '2026-10-17')])).toBe(false);
    expect(canDeleteMeasurement([entry(1, '2026-10-17'), entry(2, '2026-10-18')])).toBe(true);
  });
});
