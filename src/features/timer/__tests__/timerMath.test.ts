import { describe, it, expect } from 'vitest';
import {
  elapsedMs,
  remainingMs,
  isCountdownFinished,
  toMs,
  formatClock,
  formatClockCentis,
} from '../timerMath';

describe('elapsedMs (corrección por timestamp)', () => {
  it('calcula el transcurrido como now - start', () => {
    expect(elapsedMs(1000, 0, true, 4000)).toBe(3000);
  });

  it('suma el acumulado de tramos previos (pausa/reanuda)', () => {
    // 5s acumulados + (now 10000 - start 8000 = 2000) => 7000
    expect(elapsedMs(8000, 5000, true, 10000)).toBe(7000);
  });

  it('en pausa no suma tiempo vivo, solo el acumulado', () => {
    expect(elapsedMs(8000, 5000, false, 999999)).toBe(5000);
  });

  it('nunca devuelve negativo si el reloj retrocede', () => {
    expect(elapsedMs(5000, 0, true, 4000)).toBe(0);
  });
});

describe('remainingMs (cuenta atrás)', () => {
  it('resta el transcurrido a la duración', () => {
    const dur = toMs(1, 0); // 60000
    expect(remainingMs(dur, 1000, 0, true, 11000)).toBe(50000); // 10s consumidos
  });

  it('llega exactamente a 0 en el borde', () => {
    const dur = toMs(0, 30); // 30000
    expect(remainingMs(dur, 1000, 0, true, 31000)).toBe(0);
  });

  it('no baja de 0 aunque se pase del tiempo', () => {
    const dur = toMs(0, 30);
    expect(remainingMs(dur, 1000, 0, true, 999999)).toBe(0);
  });

  it('respeta el acumulado previo', () => {
    const dur = toMs(1, 0); // 60000
    // 20s acumulados + (now 6000 - start 1000 = 5000) = 25s consumidos => 35s
    expect(remainingMs(dur, 1000, 20000, true, 6000)).toBe(35000);
  });
});

describe('isCountdownFinished (borde 0)', () => {
  it('false mientras queda tiempo', () => {
    expect(isCountdownFinished(30000, 0, 0, true, 29000)).toBe(false);
  });

  it('true justo al llegar a 0', () => {
    expect(isCountdownFinished(30000, 0, 0, true, 30000)).toBe(true);
  });

  it('true si se pasa', () => {
    expect(isCountdownFinished(30000, 0, 0, true, 45000)).toBe(true);
  });
});

describe('toMs', () => {
  it('convierte minutos y segundos a ms', () => {
    expect(toMs(1, 30)).toBe(90000);
    expect(toMs(0, 45)).toBe(45000);
    expect(toMs(2, 0)).toBe(120000);
  });
});

describe('formatClock', () => {
  it('formatea mm:ss por debajo de una hora', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(5000)).toBe('00:05');
    expect(formatClock(65000)).toBe('01:05');
    expect(formatClock(toMs(50, 0))).toBe('50:00');
  });

  it('formatea hh:mm:ss a partir de una hora', () => {
    expect(formatClock(toMs(60, 0))).toBe('01:00:00');
    expect(formatClock(toMs(125, 9))).toBe('02:05:09');
  });

  it('redondea hacia abajo al segundo y no muestra negativos', () => {
    expect(formatClock(5999)).toBe('00:05');
    expect(formatClock(-1000)).toBe('00:00');
  });
});

describe('formatClockCentis', () => {
  it('añade centésimas', () => {
    expect(formatClockCentis(1230)).toBe('00:01.23');
    expect(formatClockCentis(0)).toBe('00:00.00');
  });
});
