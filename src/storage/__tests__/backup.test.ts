import { beforeEach, describe, expect, it } from 'vitest';
import { __resetBackendForTests } from '../db';
import { addEntry, deleteEntry, getAllEntries, updateEntry } from '../profileStore';
import { readGoal } from '../../domain/goal';
import { readExerciseSwaps } from '../../domain/exerciseSubstitutions';
import { readSelectedPlates } from '../../domain/plateSelection';
import { readShoppingChecked, readShoppingLastReset } from '../../domain/shoppingList';
import { readWeighInReminders } from '../../domain/weighInReminders';
import { parseBackup, serializeBackup } from '../../domain/dataPorting';
import { addSet, getAllSets } from '../workoutLogStore';
import { addCardioSession, getAllCardioSessions } from '../cardioStore';
import { addAttendanceMark, getAllAttendanceMarks } from '../attendanceMarkStore';
import { getSettings, saveSettings } from '../settingsStore';
import { exportAll, importMerge, importReplace } from '../backup';
import { DEFAULT_SETTINGS } from '../types';

beforeEach(() => {
  localStorage.clear();
  __resetBackendForTests();
});

async function seed() {
  await addEntry({
    date: '2024-06-10',
    age: 30,
    heightCm: 178,
    sex: 'M',
    weightKg: 81,
    bodyFatPct: 15,
    mmeKg: 38,
  });
  await addSet({
    date: '2024-06-10T07:00:00.000Z',
    dayId: 'torsoA',
    exerciseId: 'bench_press',
    setIndex: 1,
    weightKg: 60,
    reps: 10,
  });
  await addCardioSession({
    date: '2024-06-11T07:00:00.000Z',
    type: 'correr',
    durationMin: 30,
    distanceKm: 5,
  });
  await saveSettings({ ...DEFAULT_SETTINGS, activityFactor: 1.55 });
  await addAttendanceMark('2024-06-20');
  await addAttendanceMark('2024-06-21');
}

describe('exportAll', () => {
  it('reúne todos los datos sembrados', async () => {
    await seed();
    const backup = await exportAll();
    expect(backup.schemaVersion).toBe(1);
    expect(backup.profiles).toHaveLength(1);
    expect(backup.sets).toHaveLength(1);
    expect(backup.cardio).toHaveLength(1);
    expect(backup.settings.activityFactor).toBe(1.55);
    expect(backup.attendance).toEqual(['2024-06-20', '2024-06-21']);
  });
});

describe('attendance en import', () => {
  it('importReplace restaura exactamente las marcas del backup', async () => {
    await seed();
    const backup = await exportAll();

    __resetBackendForTests();
    localStorage.clear();
    await addAttendanceMark('1999-01-01'); // marca previa que debe desaparecer

    await importReplace(backup);
    expect(await getAllAttendanceMarks()).toEqual(['2024-06-20', '2024-06-21']);
  });

  it('importMerge añade solo las marcas ausentes', async () => {
    await seed(); // marcas 2024-06-20 y 2024-06-21
    const backup = await exportAll();

    __resetBackendForTests();
    localStorage.clear();
    await addAttendanceMark('2024-06-20'); // ya existe
    await addAttendanceMark('2024-06-25'); // se conserva

    await importMerge(backup);
    expect(await getAllAttendanceMarks()).toEqual([
      '2024-06-20',
      '2024-06-21',
      '2024-06-25',
    ]);
  });
});

describe('round-trip export → import', () => {
  it('importReplace deja exactamente los datos del backup', async () => {
    await seed();
    const backup = await exportAll();

    // Datos distintos antes de reemplazar.
    __resetBackendForTests();
    localStorage.clear();
    await addEntry({
      date: '2000-01-01',
      age: 99,
      heightCm: 150,
      sex: 'F',
      weightKg: 50,
      bodyFatPct: 30,
      mmeKg: 20,
    });

    await importReplace(backup);

    const profiles = await getAllEntries();
    const sets = await getAllSets();
    const cardio = await getAllCardioSessions();
    const settings = await getSettings();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].date).toBe('2024-06-10');
    expect(sets).toHaveLength(1);
    expect(cardio).toHaveLength(1);
    expect(settings.activityFactor).toBe(1.55);
  });

  it('round-trip sin pérdida: export → wipe → importReplace → export idéntico', async () => {
    await seed();
    const first = await exportAll();

    __resetBackendForTests();
    localStorage.clear();
    await importReplace(first);
    const second = await exportAll();

    expect(second.profiles).toEqual(first.profiles);
    expect(second.sets).toEqual(first.sets);
    expect(second.cardio).toEqual(first.cardio);
    expect(second.settings).toEqual(first.settings);
  });

  it('importMerge solo añade ids ausentes y no duplica', async () => {
    await seed();
    const backup = await exportAll();

    // Fusiona el mismo backup sobre los datos actuales: no debe duplicar.
    await importMerge(backup);
    expect(await getAllEntries()).toHaveLength(1);
    expect(await getAllSets()).toHaveLength(1);
    expect(await getAllCardioSessions()).toHaveLength(1);

    // Un backup con un id nuevo añade solo esa entrada.
    const extra = {
      ...backup,
      cardio: [
        ...backup.cardio,
        { id: 999, date: '2024-06-12T07:00:00.000Z', type: 'bici' as const, durationMin: 40, distanceKm: 12 },
      ],
    };
    await importMerge(extra);
    const cardio = await getAllCardioSessions();
    expect(cardio).toHaveLength(2);
  });

  it('tras un merge, un nuevo add no colisiona con ids reinsertados', async () => {
    await seed();
    const backup = await exportAll();
    await importMerge(backup);
    // El set ya tenía id 1; un nuevo add debe recibir id > 1.
    const added = await addCardioSession({
      date: '2024-06-20T07:00:00.000Z',
      type: 'correr',
      durationMin: 20,
      distanceKm: 3,
    });
    const ids = (await getAllCardioSessions()).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length); // sin duplicados
    expect(added.id).toBeGreaterThan(1);
  });
});

describe('objetivo de peso y mediciones editadas en el backup', () => {
  it('round-trip con objetivo: export → wipe → importReplace conserva el objetivo', async () => {
    await seed();
    await saveSettings({ ...DEFAULT_SETTINGS, goalWeightKg: 84, goalStartWeightKg: 90 });
    const first = await exportAll();
    expect(readGoal(first.settings)).toEqual({ goalWeightKg: 84, goalStartWeightKg: 90 });

    __resetBackendForTests();
    localStorage.clear();
    await importReplace(parseOk(serializeBackup(first)));

    expect(readGoal(await getSettings())).toEqual({ goalWeightKg: 84, goalStartWeightKg: 90 });
    const second = await exportAll();
    expect(second.settings).toEqual(first.settings);
  });

  it('backup antiguo sin claves de objetivo importa bien y no hay objetivo', async () => {
    await seed();
    const backup = await exportAll();
    const legacy = JSON.parse(serializeBackup(backup));
    delete legacy.settings.goalWeightKg;
    delete legacy.settings.goalStartWeightKg;

    __resetBackendForTests();
    localStorage.clear();
    await importReplace(parseOk(JSON.stringify(legacy)));

    expect(readGoal(await getSettings())).toEqual({ goalWeightKg: null, goalStartWeightKg: null });
    expect(await getAllEntries()).toHaveLength(1);
  });

  it('mediciones editadas y borradas fluyen al backup y vuelven intactas', async () => {
    const a = await addEntry({ date: '2024-06-01', age: 30, heightCm: 178, sex: 'M', weightKg: 85, bodyFatPct: 20, mmeKg: 36 });
    const b = await addEntry({ date: '2024-06-08', age: 30, heightCm: 178, sex: 'M', weightKg: 84, bodyFatPct: 19, mmeKg: 36 });
    await addEntry({ date: '2024-06-15', age: 30, heightCm: 178, sex: 'M', weightKg: 83, bodyFatPct: 19, mmeKg: 36 });
    await updateEntry(a.id, { weightKg: 86 });
    expect(await deleteEntry(b.id)).toBe(true);

    const exported = await exportAll();
    expect(exported.profiles).toHaveLength(2);
    expect(exported.profiles.find((p) => p.id === a.id)?.weightKg).toBe(86);
    expect(exported.profiles.some((p) => p.id === b.id)).toBe(false);

    __resetBackendForTests();
    localStorage.clear();
    await importReplace(parseOk(serializeBackup(exported)));
    expect(await getAllEntries()).toEqual(exported.profiles);
  });
});

describe('sustituciones de ejercicios en el backup', () => {
  const SWAPS = {
    'f1-sup-a::bench_press': { toKey: 'db_bench_press', scope: 'fijo' as const, date: '2024-06-10' },
  };

  it('round-trip con sustituciones: export → wipe → importReplace las conserva', async () => {
    await seed();
    await saveSettings({ ...DEFAULT_SETTINGS, exerciseSwaps: SWAPS });
    const first = await exportAll();
    expect(readExerciseSwaps(first.settings)).toEqual(SWAPS);

    __resetBackendForTests();
    localStorage.clear();
    await importReplace(parseOk(serializeBackup(first)));

    expect(readExerciseSwaps(await getSettings())).toEqual(SWAPS);
    const second = await exportAll();
    expect(second.settings).toEqual(first.settings);
  });

  it('backup antiguo sin exerciseSwaps importa bien y no hay sustituciones', async () => {
    await seed();
    const legacy = JSON.parse(serializeBackup(await exportAll()));
    delete legacy.settings.exerciseSwaps;

    __resetBackendForTests();
    localStorage.clear();
    await importReplace(parseOk(JSON.stringify(legacy)));

    const settings = await getSettings();
    expect('exerciseSwaps' in settings).toBe(false);
    expect(readExerciseSwaps(settings)).toEqual({});
    expect(await getAllSets()).toHaveLength(1);
  });

  it('exerciseSwaps corrupto no rechaza el archivo y queda vacío', async () => {
    await seed();
    const backup = JSON.parse(serializeBackup(await exportAll()));
    backup.settings.exerciseSwaps = {
      x: 5,
      'f1-sup-a::bench_press': { toKey: 'nope', scope: 'hoy', date: 'bad' },
    };
    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.settings.exerciseSwaps).toEqual({});
    await importReplace(result.backup);
    expect(readExerciseSwaps(await getSettings())).toEqual({});
  });
});

describe('platos elegidos en el backup', () => {
  const PICKS = { post: 'post_skyr_muesli_frutos_rojos', cena: 'cena_x' };

  it('round-trip con selectedPlates: export → wipe → importReplace los conserva', async () => {
    await seed();
    await saveSettings({ ...DEFAULT_SETTINGS, selectedPlates: PICKS });
    const first = await exportAll();
    expect(readSelectedPlates(first.settings)).toEqual(PICKS);

    __resetBackendForTests();
    localStorage.clear();
    await importReplace(parseOk(serializeBackup(first)));

    expect(readSelectedPlates(await getSettings())).toEqual(PICKS);
    const second = await exportAll();
    expect(second.settings).toEqual(first.settings);
  });

  it('backup antiguo sin selectedPlates importa bien y no hay elección', async () => {
    await seed();
    const legacy = JSON.parse(serializeBackup(await exportAll()));
    delete legacy.settings.selectedPlates;

    __resetBackendForTests();
    localStorage.clear();
    await importReplace(parseOk(JSON.stringify(legacy)));

    const settings = await getSettings();
    expect('selectedPlates' in settings).toBe(false);
    expect(readSelectedPlates(settings)).toEqual({});
    expect(await getAllSets()).toHaveLength(1);
    expect(await getAllEntries()).toHaveLength(1);
  });

  it('selectedPlates corrupto no rechaza el archivo y se sanea', async () => {
    await seed();
    for (const bad of ['x', { post: 5 }]) {
      const backup = JSON.parse(serializeBackup(await exportAll()));
      backup.settings.selectedPlates = bad;
      const result = parseBackup(JSON.stringify(backup));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.backup.settings.selectedPlates).toEqual({});
      await importReplace(result.backup);
      expect(readSelectedPlates(await getSettings())).toEqual({});
    }
  });
});

describe('lista de la compra en el backup', () => {
  const CHECKED = { platano: true as const, muesli: true as const, 'pantry:sal': true as const };

  it('round-trip con marcas y fecha: export → wipe → importReplace las conserva', async () => {
    await seed();
    await saveSettings({
      ...DEFAULT_SETTINGS,
      shoppingChecked: CHECKED,
      shoppingLastReset: '2026-11-03',
    });
    const first = await exportAll();
    expect(readShoppingChecked(first.settings)).toEqual(CHECKED);

    __resetBackendForTests();
    localStorage.clear();
    await importReplace(parseOk(serializeBackup(first)));

    const settings = await getSettings();
    expect(readShoppingChecked(settings)).toEqual(CHECKED);
    expect(readShoppingLastReset(settings)).toBe('2026-11-03');
    expect((await exportAll()).settings).toEqual(first.settings);
  });

  it('backup antiguo sin claves de la lista importa bien y no hay marcas', async () => {
    await seed();
    const legacy = JSON.parse(serializeBackup(await exportAll()));
    delete legacy.settings.shoppingChecked;
    delete legacy.settings.shoppingLastReset;

    __resetBackendForTests();
    localStorage.clear();
    await importReplace(parseOk(JSON.stringify(legacy)));

    const settings = await getSettings();
    expect('shoppingChecked' in settings).toBe(false);
    expect('shoppingLastReset' in settings).toBe(false);
    expect(readShoppingChecked(settings)).toEqual({});
    expect(readShoppingLastReset(settings)).toBeNull();
    expect(await getAllSets()).toHaveLength(1);
    expect(await getAllEntries()).toHaveLength(1);
  });

  it('claves corruptas no rechazan el archivo y se sanean', async () => {
    await seed();
    const base = JSON.parse(serializeBackup(await exportAll()));

    base.settings.shoppingChecked = 'x';
    base.settings.shoppingLastReset = 'ayer';
    let result = parseBackup(JSON.stringify(base));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.settings.shoppingChecked).toEqual({});
    expect('shoppingLastReset' in result.backup.settings).toBe(false);

    base.settings.shoppingChecked = { foo: true, platano: 1, muesli: true };
    base.settings.shoppingLastReset = '2026-02-30';
    result = parseBackup(JSON.stringify(base));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.settings.shoppingChecked).toEqual({ muesli: true });
    expect('shoppingLastReset' in result.backup.settings).toBe(false);

    await importReplace(result.backup);
    expect(readShoppingChecked(await getSettings())).toEqual({ muesli: true });
  });
});

describe('pesajes semanal/mensual en el backup', () => {
  const WEEKLY = { enabled: false, weekday: 5, time: '07:15' };
  const MONTHLY = { enabled: true, dayOfMonth: 31, time: '08:00' };

  it('round-trip: export → wipe → importReplace conserva los pesajes', async () => {
    await seed();
    await saveSettings({
      ...DEFAULT_SETTINGS,
      reminders: { ...DEFAULT_SETTINGS.reminders, weightWeekly: WEEKLY, weightMonthly: MONTHLY },
    });
    const first = await exportAll();

    __resetBackendForTests();
    localStorage.clear();
    await importReplace(parseOk(serializeBackup(first)));

    const settings = await getSettings();
    expect(settings.reminders.weightWeekly).toEqual(WEEKLY);
    expect(settings.reminders.weightMonthly).toEqual(MONTHLY);
    expect(readWeighInReminders(settings.reminders)).toEqual({ weekly: WEEKLY, monthly: MONTHLY });
    expect((await exportAll()).settings).toEqual(first.settings);
  });

  it('backup antiguo sin claves de pesaje importa bien y aplica los defaults', async () => {
    await seed();
    const legacy = JSON.parse(serializeBackup(await exportAll()));
    delete legacy.settings.reminders.weightWeekly;
    delete legacy.settings.reminders.weightMonthly;

    const result = parseBackup(JSON.stringify(legacy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    __resetBackendForTests();
    localStorage.clear();
    await importReplace(result.backup);

    const settings = await getSettings();
    expect(settings.reminders.weightLog).toEqual(DEFAULT_SETTINGS.reminders.weightLog);
    expect(readWeighInReminders(settings.reminders)).toEqual({
      weekly: { enabled: true, weekday: 1, time: '06:00' },
      monthly: { enabled: true, dayOfMonth: 1, time: '06:00' },
    });
    expect(await getAllEntries()).toHaveLength(1);
  });
});

function parseOk(text: string) {
  const result = parseBackup(text);
  if (!result.ok) throw new Error(result.error);
  return result.backup;
}
