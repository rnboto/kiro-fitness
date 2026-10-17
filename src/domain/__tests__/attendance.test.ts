import { describe, expect, it } from 'vitest';
import type { CardioSession, LoggedSet } from '../../storage';
import {
  countTrainedInMonth,
  selectCurrentStreak,
  selectTrainedDays,
  selectTrainedDaysWithManual,
  toLocalDayKey,
} from '../attendance';

/** Construye una clave local 'YYYY-MM-DD' desplazando días desde `base`. */
function localKey(base: Date, offsetDays = 0): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** LoggedSet mínimo con la fecha ISO dada. */
function makeSet(date: string, id = 1): LoggedSet {
  return { id, date, dayId: 's1-d1', exerciseId: 'bench_press', setIndex: 1, weightKg: 60, reps: 10 };
}

/** CardioSession mínima con la fecha ISO dada. */
function makeCardio(date: string, id = 1): CardioSession {
  return { id, date, type: 'correr', durationMin: 30, distanceKm: 5 };
}

describe('toLocalDayKey', () => {
  it('devuelve una clave YYYY-MM-DD a partir de una fecha LOCAL conocida', () => {
    // Fecha construida en hora local: su clave local es la misma siempre.
    const d = new Date(2024, 5, 14, 23, 30); // 14 de junio local, 23:30
    expect(toLocalDayKey(d.toISOString())).toBe('2024-06-14');
  });

  it('tiene formato YYYY-MM-DD con ceros a la izquierda', () => {
    const d = new Date(2024, 0, 5, 9, 0); // 5 de enero local
    expect(toLocalDayKey(d.toISOString())).toBe('2024-01-05');
  });
});

describe('selectTrainedDays', () => {
  it('un día con una serie de fuerza cuenta', () => {
    const iso = new Date(2024, 5, 10, 8, 0).toISOString();
    const days = selectTrainedDays([makeSet(iso)], []);
    expect(days.has('2024-06-10')).toBe(true);
  });

  it('un día con una sesión de cardio cuenta', () => {
    const iso = new Date(2024, 5, 11, 8, 0).toISOString();
    const days = selectTrainedDays([], [makeCardio(iso)]);
    expect(days.has('2024-06-11')).toBe(true);
  });

  it('un día sin fuerza ni cardio NO cuenta', () => {
    const iso = new Date(2024, 5, 10, 8, 0).toISOString();
    const days = selectTrainedDays([makeSet(iso)], []);
    expect(days.has('2024-06-12')).toBe(false);
    expect(days.size).toBe(1);
  });

  it('un día con fuerza Y cardio aparece una sola vez (unión)', () => {
    const iso = new Date(2024, 5, 10, 8, 0).toISOString();
    const days = selectTrainedDays([makeSet(iso)], [makeCardio(iso)]);
    expect(days.size).toBe(1);
    expect(days.has('2024-06-10')).toBe(true);
  });
});

describe('selectTrainedDaysWithManual', () => {
  it('añade los días marcados manualmente que no son automáticos', () => {
    const iso = new Date(2024, 5, 10, 8, 0).toISOString();
    const days = selectTrainedDaysWithManual([makeSet(iso)], [], ['2024-06-15']);
    expect(days.has('2024-06-10')).toBe(true);
    expect(days.has('2024-06-15')).toBe(true);
    expect(days.size).toBe(2);
  });
});

describe('countTrainedInMonth', () => {
  it('cuenta solo los días del mes objetivo', () => {
    const trained = new Set(['2024-06-01', '2024-06-15', '2024-07-02']);
    expect(countTrainedInMonth(trained, 2024, 5)).toBe(2); // junio (índice 5)
    expect(countTrainedInMonth(trained, 2024, 6)).toBe(1); // julio
    expect(countTrainedInMonth(trained, 2024, 4)).toBe(0); // mayo
  });
});

describe('selectCurrentStreak', () => {
  const now = new Date(2024, 5, 15, 10, 0); // 15 de junio local

  it('cuenta la racha incluyendo HOY si hoy está entrenado', () => {
    const trained = new Set([localKey(now, 0), localKey(now, -1), localKey(now, -2)]);
    expect(selectCurrentStreak(trained, now)).toBe(3);
  });

  it('un solo día entrenado hoy = racha 1', () => {
    const trained = new Set([localKey(now, 0)]);
    expect(selectCurrentStreak(trained, now)).toBe(1);
  });

  it('si hoy NO está entrenado pero ayer sí, cuenta terminando en ayer', () => {
    const trained = new Set([localKey(now, -1), localKey(now, -2)]);
    expect(selectCurrentStreak(trained, now)).toBe(2);
  });

  it('ni hoy ni ayer entrenados = racha 0', () => {
    const trained = new Set([localKey(now, -3), localKey(now, -4)]);
    expect(selectCurrentStreak(trained, now)).toBe(0);
  });

  it('un hueco rompe la racha', () => {
    // hoy, ayer, (hueco en -2), antier -3
    const trained = new Set([localKey(now, 0), localKey(now, -1), localKey(now, -3)]);
    expect(selectCurrentStreak(trained, now)).toBe(2);
  });

  it('sin datos la racha es 0', () => {
    expect(selectCurrentStreak(new Set(), now)).toBe(0);
  });
});
