// Tests de los helpers PUROS de cardio (ritmo, velocidad, formateo mm:ss y
// duración efectiva con compatibilidad hacia atrás durationMin → durationSec).

import { describe, expect, it } from 'vitest';
import {
  formatMmSs,
  formatPace,
  formatSpeed,
  paceSecPerKm,
  sessionDurationSec,
  speedKmH,
} from '../cardio';

describe('sessionDurationSec', () => {
  it('prefiere durationSec cuando está presente', () => {
    expect(sessionDurationSec({ durationSec: 1710, durationMin: 28 })).toBe(1710);
  });

  it('deriva de durationMin cuando no hay durationSec (dato antiguo)', () => {
    expect(sessionDurationSec({ durationMin: 35 })).toBe(2100);
    expect(sessionDurationSec({ durationMin: 0 })).toBe(0);
  });
});

describe('paceSecPerKm / formatPace', () => {
  it('calcula seg/km y lo formatea a mm:ss min/km', () => {
    // 1710 s en 6.2 km ≈ 275.8 s/km → 4:36 min/km.
    const pace = paceSecPerKm(1710, 6.2);
    expect(pace).not.toBeNull();
    expect(formatPace(pace)).toBe('4:36 min/km');
  });

  it('ritmo exacto 5:29 para 28:30 en 5.2 km', () => {
    const pace = paceSecPerKm(28 * 60 + 30, 5.2);
    expect(formatPace(pace)).toBe('5:29 min/km');
  });

  it('distancia <= 0 ⇒ null / "—" (sin NaN ni Infinity)', () => {
    expect(paceSecPerKm(1710, 0)).toBeNull();
    expect(paceSecPerKm(1710, -3)).toBeNull();
    expect(formatPace(null)).toBe('—');
  });
});

describe('speedKmH / formatSpeed', () => {
  it('calcula km/h y lo formatea con un decimal', () => {
    // 20 km en 3600 s = 20 km/h.
    expect(speedKmH(3600, 20)).toBeCloseTo(20, 5);
    expect(formatSpeed(speedKmH(3600, 20))).toBe('20.0 km/h');
  });

  it('duración <= 0 ⇒ null / "—" (sin NaN ni Infinity)', () => {
    expect(speedKmH(0, 10)).toBeNull();
    expect(speedKmH(-5, 10)).toBeNull();
    expect(formatSpeed(null)).toBe('—');
  });
});

describe('formatMmSs', () => {
  it('rellena segundos a 2 dígitos', () => {
    expect(formatMmSs(1710)).toBe('28:30');
    expect(formatMmSs(65)).toBe('1:05');
    expect(formatMmSs(0)).toBe('0:00');
  });

  it('admite más de 59:59 sin truncar los minutos', () => {
    expect(formatMmSs(3600)).toBe('60:00');
    expect(formatMmSs(3661)).toBe('61:01');
  });

  it('valores negativos o no finitos se tratan como 0', () => {
    expect(formatMmSs(-10)).toBe('0:00');
    expect(formatMmSs(Number.NaN)).toBe('0:00');
  });
});
