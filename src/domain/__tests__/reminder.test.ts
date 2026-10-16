import { describe, it, expect } from 'vitest';
import {
  nextHydrationFire,
  nextBioimpedanceDate,
} from '../../features/notificaciones/reminderScheduler';

/** Helper: construye un Date en hora local con HH:mm de hoy. */
function at(hhmm: string, base = new Date(2024, 0, 15)): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

describe('nextBioimpedanceDate', () => {
  it('= lastEntryDate + weeks × 7 días', () => {
    const last = new Date(2024, 0, 1);
    const next = nextBioimpedanceDate(last, 4);
    expect(next.getTime()).toBe(new Date(2024, 0, 29).getTime());
  });

  it('puede devolver una fecha ya pasada', () => {
    const last = new Date(2020, 0, 1);
    const next = nextBioimpedanceDate(last, 4);
    expect(next.getTime()).toBe(new Date(2020, 0, 29).getTime());
    expect(next.getTime()).toBeLessThan(Date.now());
  });
});

describe('nextHydrationFire — ventana 08:00-20:00, intervalo 90 (defaults design §9)', () => {
  it('app abierta a las 10:17 => próximo aviso 11:00', () => {
    const result = nextHydrationFire(at('10:17'), '08:00', '20:00', 90);
    expect(result.getHours()).toBe(11);
    expect(result.getMinutes()).toBe(0);
    expect(result.getDate()).toBe(15); // mismo día
  });

  it('now antes del inicio de ventana => dispara en startTime', () => {
    const result = nextHydrationFire(at('06:00'), '08:00', '20:00', 90);
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(0);
    expect(result.getDate()).toBe(15);
  });

  it('borde exacto: marca que cae en endTime NO dispara, pasa al día siguiente', () => {
    // Ventana 08:00-18:30, intervalo 90 => marcas 08:00,09:30,...,18:30.
    // A las 17:40 la siguiente marca sería 18:30 == endTime => no dispara.
    const result = nextHydrationFire(at('17:40'), '08:00', '18:30', 90);
    expect(result.getDate()).toBe(16); // día siguiente
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(0);
  });

  it('now >= endTime => startTime del día siguiente', () => {
    const result = nextHydrationFire(at('20:00'), '08:00', '20:00', 90);
    expect(result.getDate()).toBe(16);
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(0);
  });

  it('última marca válida antes de endTime sí dispara', () => {
    // A las 18:00, marcas 08:00,09:30,...,18:30. Siguiente estricta > 18:00 = 18:30 < 20:00 => dispara.
    const result = nextHydrationFire(at('18:00'), '08:00', '20:00', 90);
    expect(result.getHours()).toBe(18);
    expect(result.getMinutes()).toBe(30);
    expect(result.getDate()).toBe(15);
  });
});
