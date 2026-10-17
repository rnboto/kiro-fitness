import { beforeEach, describe, expect, it } from 'vitest';
import { __resetBackendForTests } from '../db';
import {
  addCardioSession,
  deleteCardioSession,
  getAllCardioSessions,
} from '../cardioStore';

// jsdom no trae IndexedDB; el wrapper cae automáticamente a localStorage.
beforeEach(() => {
  localStorage.clear();
  __resetBackendForTests();
});

describe('cardioStore', () => {
  it('se siembra vacío', async () => {
    expect(await getAllCardioSessions()).toEqual([]);
  });

  it('addCardioSession asigna id y getAll ordena por fecha ascendente', async () => {
    const b = await addCardioSession({
      date: '2024-06-14T07:00:00.000Z',
      type: 'bici',
      durationMin: 60,
      distanceKm: 20,
    });
    const a = await addCardioSession({
      date: '2024-06-10T07:00:00.000Z',
      type: 'correr',
      durationMin: 30,
      distanceKm: 5,
      calories: 300,
      notes: 'suave',
    });
    expect(a.id).not.toBe(b.id);
    const all = await getAllCardioSessions();
    expect(all.map((s) => s.date)).toEqual([
      '2024-06-10T07:00:00.000Z',
      '2024-06-14T07:00:00.000Z',
    ]);
    expect(all[0].calories).toBe(300);
    expect(all[0].notes).toBe('suave');
  });

  it('deleteCardioSession elimina la entrada correcta', async () => {
    const a = await addCardioSession({
      date: '2024-06-10T07:00:00.000Z',
      type: 'correr',
      durationMin: 30,
      distanceKm: 5,
    });
    const b = await addCardioSession({
      date: '2024-06-11T07:00:00.000Z',
      type: 'bici',
      durationMin: 45,
      distanceKm: 15,
    });
    await deleteCardioSession(a.id);
    const all = await getAllCardioSessions();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(b.id);
  });
});
