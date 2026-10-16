import { beforeEach, describe, expect, it } from 'vitest';
import { __resetBackendForTests } from '../db';
import { addEntry, getAllEntries, getLatestProfile, type NewProfileEntry } from '../profileStore';
import { addSet, getAllSets, getLastSet } from '../workoutLogStore';
import { getSettings, saveSettings } from '../settingsStore';
import { DEFAULT_SETTINGS } from '../types';

// jsdom no trae IndexedDB; el wrapper cae automáticamente a localStorage.
beforeEach(() => {
  localStorage.clear();
  __resetBackendForTests();
});

const baseEntry: NewProfileEntry = {
  date: '2024-01-01T07:00:00.000Z',
  age: 30,
  heightCm: 178,
  sex: 'M',
  weightKg: 83,
  bodyFatPct: 20,
  mmeKg: 36,
};

describe('profileStore', () => {
  it('se siembra vacío', async () => {
    expect(await getLatestProfile()).toBeNull();
    expect(await getAllEntries()).toEqual([]);
  });

  it('addEntry siempre inserta una entrada nueva datada', async () => {
    const a = await addEntry(baseEntry);
    const b = await addEntry({ ...baseEntry, date: '2024-02-01T07:00:00.000Z', weightKg: 81 });
    expect(a.id).not.toBe(b.id);
    const all = await getAllEntries();
    expect(all).toHaveLength(2);
  });

  it('getLatestProfile devuelve la fecha más reciente', async () => {
    await addEntry(baseEntry);
    const latest = await addEntry({ ...baseEntry, date: '2024-03-01T07:00:00.000Z', weightKg: 79 });
    const got = await getLatestProfile();
    expect(got?.id).toBe(latest.id);
    expect(got?.weightKg).toBe(79);
  });

  it('empate de date se resuelve por id mayor', async () => {
    const sameDate = baseEntry.date;
    await addEntry({ ...baseEntry, date: sameDate, weightKg: 83 });
    const second = await addEntry({ ...baseEntry, date: sameDate, weightKg: 82 });
    const got = await getLatestProfile();
    expect(got?.id).toBe(second.id);
  });
});

describe('workoutLogStore', () => {
  it('addSet / getAllSets / getLastSet', async () => {
    await addSet({
      date: '2024-01-01T07:10:00.000Z',
      dayId: 'torsoA',
      exerciseId: 'bench_press',
      setIndex: 0,
      weightKg: 60,
      reps: 8,
    });
    const last = await addSet({
      date: '2024-01-03T07:10:00.000Z',
      dayId: 'torsoA',
      exerciseId: 'bench_press',
      setIndex: 1,
      weightKg: 62.5,
      reps: 7,
    });
    expect(await getAllSets()).toHaveLength(2);
    const lastBench = await getLastSet('bench_press');
    expect(lastBench?.id).toBe(last.id);
    expect(await getLastSet('inexistente')).toBeNull();
  });
});

describe('settingsStore', () => {
  it('getSettings siembra DEFAULT_SETTINGS la primera vez', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('saveSettings persiste cambios', async () => {
    const next = { ...DEFAULT_SETTINGS, activityFactor: 1.55 };
    await saveSettings(next);
    const got = await getSettings();
    expect(got.activityFactor).toBe(1.55);
  });
});
