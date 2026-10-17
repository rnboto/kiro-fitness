import { describe, it, expect } from 'vitest';
import {
  CARDIO_ROUTINES,
  expandRoutineSteps,
  routineTotalSec,
  type CardioRoutine,
} from '../cardioRoutines';

const byId = (id: string): CardioRoutine => {
  const r = CARDIO_ROUTINES.find((x) => x.id === id);
  if (!r) throw new Error(`rutina no encontrada: ${id}`);
  return r;
};

describe('CARDIO_ROUTINES — estructura', () => {
  it('tiene exactamente 6 rutinas', () => {
    expect(CARDIO_ROUTINES).toHaveLength(6);
  });

  it('se reparte 3 cinta / 3 bici', () => {
    const cinta = CARDIO_ROUTINES.filter((r) => r.machine === 'cinta');
    const bici = CARDIO_ROUTINES.filter((r) => r.machine === 'bici');
    expect(cinta).toHaveLength(3);
    expect(bici).toHaveLength(3);
  });

  it('tiene ids únicos', () => {
    const ids = CARDIO_ROUTINES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('routineTotalSec — suma real de pasos expandidos', () => {
  // Valores reales derivados del detalle de rondas/pirámide del brief.
  const expected: Record<string, number> = {
    c1: 2100, // 300 + 1500 + 300
    c2: 1560, // 300 + 8·(30+90) + 300
    c3: 1800, // 300 + 1200 + 300
    b1: 2400, // 300 + 1800 + 300
    b2: 2040, // 300 + 6·(120+120) + 300
    b3: 1680, // 300 + 9·120 + 300
  };

  for (const [id, sec] of Object.entries(expected)) {
    it(`${id} suma ${sec} s`, () => {
      expect(routineTotalSec(byId(id))).toBe(sec);
    });
  }

  it('las 6 sesiones cuadran con totalMinutes·60', () => {
    for (const r of CARDIO_ROUTINES) {
      expect(r.totalMinutes * 60).toBe(routineTotalSec(r));
    }
  });
});

describe('expandRoutineSteps — expansión de rondas', () => {
  it('C2 (8 rondas) produce 1 + 16 + 1 = 18 pasos', () => {
    expect(expandRoutineSteps(byId('c2'))).toHaveLength(18);
  });

  it('B2 (6 rondas) produce 1 + 12 + 1 = 14 pasos', () => {
    expect(expandRoutineSteps(byId('b2'))).toHaveLength(14);
  });

  it('B3 (pirámide 9 escalones) produce 1 + 9 + 1 = 11 pasos', () => {
    expect(expandRoutineSteps(byId('b3'))).toHaveLength(11);
  });

  it('las continuas producen 3 pasos', () => {
    for (const id of ['c1', 'c3', 'b1']) {
      expect(expandRoutineSteps(byId(id))).toHaveLength(3);
    }
  });

  it('la expansión alterna work y rest en cada ronda HIIT', () => {
    const steps = expandRoutineSteps(byId('c2'));
    // Índices 1..16 son las 8 rondas (par = work, impar = rest).
    expect(steps[1].label).toBe('Fuerte (RPE 8-9)');
    expect(steps[1].intensity).toBe('RPE 8-9');
    expect(steps[2].label).toBe('Suave — caminar/trote');
    expect(steps[15].label).toBe('Fuerte (RPE 8-9)');
    expect(steps[16].label).toBe('Suave — caminar/trote');
  });

  it('cada HIIT empieza en calentamiento y termina en enfriamiento', () => {
    for (const id of ['c2', 'b2']) {
      const steps = expandRoutineSteps(byId(id));
      expect(steps[0].label.toLowerCase()).toContain('calentamiento');
      expect(steps[steps.length - 1].label.toLowerCase()).toContain('enfriamiento');
    }
  });
});
