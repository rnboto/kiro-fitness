import { beforeEach, describe, expect, it } from 'vitest';
import { __resetBackendForTests } from '../db';
import {
  addAttendanceMark,
  getAllAttendanceMarks,
  removeAttendanceMark,
} from '../attendanceMarkStore';

// jsdom no trae IndexedDB; el wrapper cae automáticamente a localStorage.
beforeEach(() => {
  localStorage.clear();
  __resetBackendForTests();
});

describe('attendanceMarkStore', () => {
  it('se siembra vacío', async () => {
    expect(await getAllAttendanceMarks()).toEqual([]);
  });

  it('addAttendanceMark es idempotente (misma fecha dos veces = una entrada)', async () => {
    await addAttendanceMark('2024-06-10');
    await addAttendanceMark('2024-06-10');
    expect(await getAllAttendanceMarks()).toEqual(['2024-06-10']);
  });

  it('removeAttendanceMark borra solo esa fecha', async () => {
    await addAttendanceMark('2024-06-10');
    await addAttendanceMark('2024-06-11');
    await removeAttendanceMark('2024-06-10');
    expect(await getAllAttendanceMarks()).toEqual(['2024-06-11']);
  });

  it('getAllAttendanceMarks devuelve las fechas ordenadas ascendente', async () => {
    await addAttendanceMark('2024-06-14');
    await addAttendanceMark('2024-06-10');
    await addAttendanceMark('2024-06-12');
    expect(await getAllAttendanceMarks()).toEqual([
      '2024-06-10',
      '2024-06-12',
      '2024-06-14',
    ]);
  });

  it('las marcas persisten tras resetear el backend (round-trip)', async () => {
    await addAttendanceMark('2024-06-10');
    __resetBackendForTests();
    expect(await getAllAttendanceMarks()).toEqual(['2024-06-10']);
  });
});
