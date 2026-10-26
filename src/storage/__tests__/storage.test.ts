import { beforeEach, describe, expect, it } from 'vitest';
import { __resetBackendForTests } from '../db';
import {
  addEntry,
  deleteEntry,
  getAllEntries,
  getLatestProfile,
  updateEntry,
  type NewProfileEntry,
} from '../profileStore';
import { readGoal } from '../../domain/goal';
import { readWeighInReminders } from '../../domain/weighInReminders';
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

  it('empate de día con formatos mixtos: gana el id mayor', async () => {
    await addEntry({ ...baseEntry, date: '2026-10-17T08:00:00.000Z', weightKg: 72 });
    const second = await addEntry({ ...baseEntry, date: '2026-10-17', weightKg: 75 });
    expect((await getLatestProfile())?.id).toBe(second.id);
    const all = await getAllEntries();
    expect(all[all.length - 1].id).toBe(second.id);
  });

  describe('updateEntry', () => {
    it('cambia solo la entrada objetivo, conserva su id y no toca las demás', async () => {
      const a = await addEntry({ ...baseEntry, weightKg: 83 });
      const b = await addEntry({ ...baseEntry, date: '2024-02-01', weightKg: 81 });
      const c = await addEntry({ ...baseEntry, date: '2024-03-01', weightKg: 79 });
      const before = await getAllEntries();

      const saved = await updateEntry(b.id, { weightKg: 80.5, bodyFatPct: 18 });
      expect(saved).toEqual({ ...b, weightKg: 80.5, bodyFatPct: 18 });

      const after = await getAllEntries();
      expect(after).toHaveLength(3);
      expect(after.find((e) => e.id === b.id)?.weightKg).toBe(80.5);
      expect(after.find((e) => e.id === a.id)).toEqual(before.find((e) => e.id === a.id));
      expect(after.find((e) => e.id === c.id)).toEqual(before.find((e) => e.id === c.id));
    });

    it('devuelve null si el id no existe y no crea nada', async () => {
      await addEntry(baseEntry);
      expect(await updateEntry(999, { weightKg: 70 })).toBeNull();
      expect(await getAllEntries()).toHaveLength(1);
    });

    it('ignora un id dentro del patch', async () => {
      const a = await addEntry(baseEntry);
      const saved = await updateEntry(a.id, { weightKg: 70, id: 999 } as never);
      expect(saved?.id).toBe(a.id);
      expect((await getAllEntries()).map((e) => e.id)).toEqual([a.id]);
    });

    it('cambiar la fecha reordena el histórico', async () => {
      const a = await addEntry({ ...baseEntry, date: '2024-01-01' });
      const b = await addEntry({ ...baseEntry, date: '2024-02-01' });
      await updateEntry(a.id, { date: '2024-05-01' });
      expect((await getLatestProfile())?.id).toBe(a.id);
      expect((await getAllEntries()).map((e) => e.id)).toEqual([b.id, a.id]);
    });
  });

  describe('deleteEntry', () => {
    it('borra solo la entrada indicada y devuelve true', async () => {
      const a = await addEntry(baseEntry);
      const b = await addEntry({ ...baseEntry, date: '2024-02-01' });
      expect(await deleteEntry(a.id)).toBe(true);
      expect((await getAllEntries()).map((e) => e.id)).toEqual([b.id]);
    });

    it('nunca borra la última medición restante', async () => {
      const a = await addEntry(baseEntry);
      expect(await deleteEntry(a.id)).toBe(false);
      expect(await getAllEntries()).toHaveLength(1);
    });

    it('id inexistente → false', async () => {
      await addEntry(baseEntry);
      await addEntry({ ...baseEntry, date: '2024-02-01' });
      expect(await deleteEntry(999)).toBe(false);
      expect(await getAllEntries()).toHaveLength(2);
    });

    it('tras borrar, un addEntry nuevo recibe un id mayor que todos los anteriores', async () => {
      await addEntry(baseEntry);
      const b = await addEntry({ ...baseEntry, date: '2024-02-01' });
      await deleteEntry(b.id);
      const c = await addEntry({ ...baseEntry, date: '2024-03-01' });
      expect(c.id).toBeGreaterThan(b.id);
    });
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

  it("DEFAULT_SETTINGS.routineWeekPhase es 'semana1'", () => {
    expect(DEFAULT_SETTINGS.routineWeekPhase).toBe('semana1');
  });

  it('saveSettings persiste cambios', async () => {
    const next = { ...DEFAULT_SETTINGS, activityFactor: 1.55 };
    await saveSettings(next);
    const got = await getSettings();
    expect(got.activityFactor).toBe(1.55);
  });

  it('selectedPlates es opcional: no está en los defaults y se persiste si se guarda', async () => {
    expect(DEFAULT_SETTINGS.selectedPlates).toBeUndefined();
    expect((await getSettings()).selectedPlates).toBeUndefined();
    await saveSettings({
      ...DEFAULT_SETTINGS,
      selectedPlates: { post: 'post_skyr_muesli_frutos_rojos' },
    });
    const got = await getSettings();
    expect(got.selectedPlates?.post).toBe('post_skyr_muesli_frutos_rojos');
  });

  it('los campos de objetivo son opcionales y no están en los defaults', async () => {
    expect(DEFAULT_SETTINGS.goalWeightKg).toBeUndefined();
    expect(DEFAULT_SETTINGS.goalStartWeightKg).toBeUndefined();
    expect(readGoal(await getSettings())).toEqual({ goalWeightKg: null, goalStartWeightKg: null });
  });

  it('ajustes antiguos sin objetivo cargan correctamente', async () => {
    const { routineWeekPhase: _p, ...legacy } = DEFAULT_SETTINGS;
    await saveSettings(legacy as never);
    const got = await getSettings();
    expect(got.activityFactor).toBe(DEFAULT_SETTINGS.activityFactor);
    expect(readGoal(got)).toEqual({ goalWeightKg: null, goalStartWeightKg: null });
  });

  it('el objetivo se persiste y se puede quitar con null', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, goalWeightKg: 84, goalStartWeightKg: 90 });
    expect(readGoal(await getSettings())).toEqual({ goalWeightKg: 84, goalStartWeightKg: 90 });
    await saveSettings({ ...DEFAULT_SETTINGS, goalWeightKg: null, goalStartWeightKg: null });
    expect(readGoal(await getSettings())).toEqual({ goalWeightKg: null, goalStartWeightKg: null });
  });

  it('defaults de pesaje semanal/mensual sin tocar los demás recordatorios', () => {
    expect(DEFAULT_SETTINGS.reminders.weightWeekly).toEqual({ enabled: true, weekday: 1, time: '06:00' });
    expect(DEFAULT_SETTINGS.reminders.weightMonthly).toEqual({ enabled: true, dayOfMonth: 1, time: '06:00' });
    expect(DEFAULT_SETTINGS.reminders.weightLog).toEqual({ enabled: true, time: '07:30' });
    expect(DEFAULT_SETTINGS.reminders.hydration).toEqual({
      enabled: true,
      intervalMinutes: 90,
      startTime: '08:00',
      endTime: '20:00',
    });
    expect(DEFAULT_SETTINGS.reminders.bioimpedance).toEqual({ enabled: true, intervalWeeks: 4 });
  });

  it('ajustes antiguos sin pesajes cargan y se leen con los defaults', async () => {
    const { weightWeekly: _w, weightMonthly: _m, ...oldReminders } = DEFAULT_SETTINGS.reminders;
    await saveSettings({ ...DEFAULT_SETTINGS, reminders: oldReminders } as never);
    const got = await getSettings();
    expect('weightWeekly' in got.reminders).toBe(false);
    expect(got.reminders.weightLog).toEqual({ enabled: true, time: '07:30' });
    expect(readWeighInReminders(got.reminders)).toEqual({
      weekly: { enabled: true, weekday: 1, time: '06:00' },
      monthly: { enabled: true, dayOfMonth: 1, time: '06:00' },
    });
  });

  it('valores corruptos de objetivo se leen como null', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, goalWeightKg: 'x', goalStartWeightKg: 90 } as never);
    expect(readGoal(await getSettings())).toEqual({ goalWeightKg: null, goalStartWeightKg: null });
  });
});
