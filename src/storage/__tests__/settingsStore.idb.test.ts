// Prueba settingsStore (plato elegido por comida) contra un backend en memoria
// que emula la semántica de IndexedDB (put por keyPath 'key'). jsdom no trae
// IndexedDB y fake-indexeddb no es una dependencia permitida, así que se simula
// el contrato de StorageBackend (mismo patrón que profileStore.idb.test.ts); la
// suite sobre localStorage vive en storage.test.ts.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageBackend } from '../db';

const mem = vi.hoisted(() => {
  const stores = new Map<string, Map<string, Record<string, unknown>>>();
  const store = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name)!;
  };
  const backend = {
    async get<T>(name: string, key: IDBValidKey) {
      const rec = store(name).get(key as string);
      // structuredClone: IndexedDB guarda copias, no referencias.
      return (rec ? structuredClone(rec) : null) as T | null;
    },
    async set<T>(name: string, value: T) {
      const rec = structuredClone(value) as unknown as Record<string, unknown>;
      store(name).set(rec.key as string, rec); // put: reemplaza por keyPath
    },
  } as unknown as StorageBackend;
  return { backend, reset: () => stores.clear() };
});

vi.mock('../db', () => ({
  getBackend: () => Promise.resolve(mem.backend),
  __resetBackendForTests: () => {},
}));

import { getSettings, saveSettings } from '../settingsStore';
import { DEFAULT_SETTINGS } from '../types';
import { readSelectedPlates, withPlateChoice } from '../../domain/plateSelection';

beforeEach(() => mem.reset());

describe('settingsStore sobre backend con semántica IndexedDB · platos elegidos', () => {
  it('la primera lectura siembra los defaults sin selectedPlates', async () => {
    const s = await getSettings();
    expect(s).toEqual(DEFAULT_SETTINGS);
    expect('selectedPlates' in s).toBe(false);
    expect(readSelectedPlates(s)).toEqual({});
  });

  it('elegir, volver a leer (recarga) y seguir elegido', async () => {
    const first = await getSettings();
    await saveSettings({
      ...first,
      selectedPlates: withPlateChoice(readSelectedPlates(first), 'almuerzo', 'almuerzo_x'),
    });
    // «Recarga»: una lectura nueva desde el backend.
    const reloaded = await getSettings();
    expect(readSelectedPlates(reloaded)).toEqual({ almuerzo: 'almuerzo_x' });
    expect(reloaded.activityFactor).toBe(DEFAULT_SETTINGS.activityFactor);
    expect(reloaded.reminders).toEqual(DEFAULT_SETTINGS.reminders);
  });

  it('quitar la elección también se persiste', async () => {
    const first = await getSettings();
    await saveSettings({ ...first, selectedPlates: { post: 'p1', cena: 'c1' } });
    const mid = await getSettings();
    await saveSettings({
      ...mid,
      selectedPlates: withPlateChoice(readSelectedPlates(mid), 'post', null),
    });
    expect(readSelectedPlates(await getSettings())).toEqual({ cena: 'c1' });
  });

  it('un valor corrupto guardado se lee como {} con la lectura defensiva', async () => {
    const first = await getSettings();
    await saveSettings({ ...first, selectedPlates: 'roto' as never });
    expect(readSelectedPlates(await getSettings())).toEqual({});
    await saveSettings({ ...first, selectedPlates: { post: 7 } as never });
    expect(readSelectedPlates(await getSettings())).toEqual({});
  });
});
