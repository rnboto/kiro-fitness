// Prueba profileStore (updateEntry/deleteEntry/desempate) contra un backend en
// memoria que emula la semántica de IndexedDB (put por keyPath 'id', add con
// autoincrement, delete por clave, getAll en orden de clave).
// jsdom no trae IndexedDB y fake-indexeddb NO es una dependencia permitida, así
// que se simula el contrato de StorageBackend; la suite real sobre localStorage
// vive en storage.test.ts. El IndexedDbBackend real (get/set=put/delete) no cambia.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageBackend } from '../db';

const mem = vi.hoisted(() => {
  const stores = new Map<string, Map<number, Record<string, unknown>>>();
  let seq = 0;
  const store = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name)!;
  };
  const backend: StorageBackend = {
    async get<T>(name: string, key: IDBValidKey) {
      return ((store(name).get(key as number) as T | undefined) ?? null) as T | null;
    },
    async set<T>(name: string, value: T) {
      const rec = value as unknown as Record<string, unknown>;
      store(name).set(rec.id as number, { ...rec }); // put: reemplaza por keyPath
    },
    async add<T>(name: string, value: T) {
      const id = ++seq;
      store(name).set(id, { ...(value as unknown as Record<string, unknown>), id });
      return id;
    },
    async getAll<T>(name: string) {
      return Array.from(store(name).entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, v]) => ({ ...v })) as unknown as T[];
    },
    async getByIndex() {
      return [];
    },
    async delete(name: string, key: IDBValidKey) {
      store(name).delete(key as number);
    },
    async clear(name: string) {
      store(name).clear();
    },
    async ensureSeqAtLeast() {},
  } as unknown as StorageBackend;
  return {
    backend,
    reset: () => {
      stores.clear();
      seq = 0;
    },
  };
});

vi.mock('../db', () => ({
  getBackend: () => Promise.resolve(mem.backend),
  __resetBackendForTests: () => {},
}));

import {
  addEntry,
  deleteEntry,
  getAllEntries,
  getLatestProfile,
  updateEntry,
  type NewProfileEntry,
} from '../profileStore';

const base: NewProfileEntry = {
  date: '2026-10-10',
  age: 30,
  heightCm: 178,
  sex: 'M',
  weightKg: 85,
  bodyFatPct: 20,
  mmeKg: 36,
};

beforeEach(() => mem.reset());

describe('profileStore sobre backend con semántica IndexedDB', () => {
  it('updateEntry actualiza en sitio, conserva el id y no toca las demás', async () => {
    const a = await addEntry(base);
    const b = await addEntry({ ...base, date: '2026-10-11', weightKg: 84 });
    const saved = await updateEntry(a.id, { weightKg: 83 });
    expect(saved).toEqual({ ...a, weightKg: 83 });
    const all = await getAllEntries();
    expect(all).toHaveLength(2);
    expect(all.find((e) => e.id === b.id)).toEqual(b);
  });

  it('updateEntry ignora un id en el patch y devuelve null si no existe', async () => {
    const a = await addEntry(base);
    expect((await updateEntry(a.id, { id: 99, weightKg: 70 } as never))?.id).toBe(a.id);
    expect(await updateEntry(99, { weightKg: 70 })).toBeNull();
    expect(await getAllEntries()).toHaveLength(1);
  });

  it('deleteEntry borra la indicada, rechaza la última y los ids inexistentes', async () => {
    const a = await addEntry(base);
    const b = await addEntry({ ...base, date: '2026-10-11' });
    expect(await deleteEntry(999)).toBe(false);
    expect(await deleteEntry(a.id)).toBe(true);
    expect((await getAllEntries()).map((e) => e.id)).toEqual([b.id]);
    expect(await deleteEntry(b.id)).toBe(false);
    expect(await getAllEntries()).toHaveLength(1);
  });

  it('desempate: el mismo día gana el id mayor (formatos mixtos)', async () => {
    await addEntry({ ...base, date: '2026-10-17T08:00:00.000Z', weightKg: 72 });
    const later = await addEntry({ ...base, date: '2026-10-17', weightKg: 75 });
    expect((await getLatestProfile())?.id).toBe(later.id);
  });

  it('tras editar la fecha de una entrada, el perfil actual se recalcula', async () => {
    const a = await addEntry({ ...base, date: '2026-10-01' });
    const b = await addEntry({ ...base, date: '2026-10-05' });
    expect((await getLatestProfile())?.id).toBe(b.id);
    await updateEntry(a.id, { date: '2026-10-20' });
    expect((await getLatestProfile())?.id).toBe(a.id);
  });
});
