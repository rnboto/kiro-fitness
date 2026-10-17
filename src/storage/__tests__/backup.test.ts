import { beforeEach, describe, expect, it } from 'vitest';
import { __resetBackendForTests } from '../db';
import { addEntry, getAllEntries } from '../profileStore';
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
