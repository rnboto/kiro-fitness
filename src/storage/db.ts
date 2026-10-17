// Wrapper async sobre IndexedDB con fallback automático a localStorage (design §5).
//
// Primario: IndexedDB (mejor para histórico y consultas por índice).
// Plan B: localStorage serializando cada store como un array JSON por clave.
//
// La API expuesta es común a ambos backends. Las claves de autoincrement se
// gestionan en JS cuando el backend es localStorage.

export type StoreName = 'profiles' | 'workoutSets' | 'cardioSessions' | 'settings';

/** Definición de un object store. */
interface StoreDef {
  name: StoreName;
  /** keyPath del store. Para 'settings' la clave es manual (singleton 'app'). */
  keyPath: string;
  autoIncrement: boolean;
  indexes?: Array<{ name: string; keyPath: string; unique?: boolean }>;
}

const DB_NAME = 'kiro-db';
// v2: añade el object store 'cardioSessions' (feature cardio).
const DB_VERSION = 2;

const STORE_DEFS: StoreDef[] = [
  {
    name: 'profiles',
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'date', keyPath: 'date' }],
  },
  { name: 'workoutSets', keyPath: 'id', autoIncrement: true },
  { name: 'cardioSessions', keyPath: 'id', autoIncrement: true },
  { name: 'settings', keyPath: 'key', autoIncrement: false },
];

function storeDef(name: StoreName): StoreDef {
  const def = STORE_DEFS.find((d) => d.name === name);
  if (!def) throw new Error(`Store desconocido: ${name}`);
  return def;
}

// ---------------------------------------------------------------------------
// Backend común
// ---------------------------------------------------------------------------

export interface StorageBackend {
  /** Devuelve un registro por su clave, o null si no existe. */
  get<T>(store: StoreName, key: IDBValidKey): Promise<T | null>;
  /** Inserta/actualiza un registro con clave explícita (upsert). */
  set<T>(store: StoreName, value: T): Promise<void>;
  /** Inserta un registro nuevo; devuelve la clave autogenerada. */
  add<T>(store: StoreName, value: T): Promise<number>;
  /** Devuelve todos los registros del store. */
  getAll<T>(store: StoreName): Promise<T[]>;
  /** Devuelve los registros cuyo índice coincide con value. */
  getByIndex<T>(store: StoreName, indexName: string, value: IDBValidKey): Promise<T[]>;
  /** Elimina un registro por su clave (no falla si no existe). */
  delete(store: StoreName, key: IDBValidKey): Promise<void>;
  /** Vacía por completo un store. */
  clear(store: StoreName): Promise<void>;
  /**
   * Asegura que la próxima clave autogenerada supere `minSeq`. Necesario tras
   * reinsertar registros con ids explícitos (import) para evitar colisiones.
   * No-op en IndexedDB (gestiona su propio contador internamente).
   */
  ensureSeqAtLeast(store: StoreName, minSeq: number): Promise<void>;
}

// ---------------------------------------------------------------------------
// Backend IndexedDB
// ---------------------------------------------------------------------------

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const def of STORE_DEFS) {
        if (!db.objectStoreNames.contains(def.name)) {
          const os = db.createObjectStore(def.name, {
            keyPath: def.keyPath,
            autoIncrement: def.autoIncrement,
          });
          for (const idx of def.indexes ?? []) {
            os.createIndex(idx.name, idx.keyPath, { unique: idx.unique ?? false });
          }
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

class IndexedDbBackend implements StorageBackend {
  constructor(private readonly db: IDBDatabase) {}

  private tx(store: StoreName, mode: IDBTransactionMode): IDBObjectStore {
    return this.db.transaction(store, mode).objectStore(store);
  }

  get<T>(store: StoreName, key: IDBValidKey): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const req = this.tx(store, 'readonly').get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  set<T>(store: StoreName, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = this.tx(store, 'readwrite').put(value as unknown as object);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  add<T>(store: StoreName, value: T): Promise<number> {
    return new Promise((resolve, reject) => {
      const req = this.tx(store, 'readwrite').add(value as unknown as object);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  }

  getAll<T>(store: StoreName): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const req = this.tx(store, 'readonly').getAll();
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  }

  getByIndex<T>(store: StoreName, indexName: string, value: IDBValidKey): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const req = this.tx(store, 'readonly').index(indexName).getAll(value);
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  }

  delete(store: StoreName, key: IDBValidKey): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = this.tx(store, 'readwrite').delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  clear(store: StoreName): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = this.tx(store, 'readwrite').clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async ensureSeqAtLeast(): Promise<void> {
    // IndexedDB actualiza su generador de claves al insertar con clave explícita.
  }
}

// ---------------------------------------------------------------------------
// Backend localStorage (fallback)
// ---------------------------------------------------------------------------

const LS_PREFIX = 'kiro:';
const LS_SEQ_PREFIX = 'kiro:seq:';

class LocalStorageBackend implements StorageBackend {
  private key(store: StoreName): string {
    return `${LS_PREFIX}${store}`;
  }

  private readAll<T>(store: StoreName): T[] {
    const raw = localStorage.getItem(this.key(store));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      // Datos corruptos: se descartan (design §11).
      console.error(`[kiro:storage] JSON inválido en ${store}, se descarta.`);
      return [];
    }
  }

  private writeAll<T>(store: StoreName, rows: T[]): void {
    localStorage.setItem(this.key(store), JSON.stringify(rows));
  }

  private nextSeq(store: StoreName): number {
    const seqKey = `${LS_SEQ_PREFIX}${store}`;
    const current = Number(localStorage.getItem(seqKey) ?? '0');
    const next = current + 1;
    localStorage.setItem(seqKey, String(next));
    return next;
  }

  async get<T>(store: StoreName, key: IDBValidKey): Promise<T | null> {
    const def = storeDef(store);
    const rows = this.readAll<Record<string, unknown>>(store);
    const found = rows.find((r) => r[def.keyPath] === key);
    return (found as T) ?? null;
  }

  async set<T>(store: StoreName, value: T): Promise<void> {
    const def = storeDef(store);
    const rows = this.readAll<Record<string, unknown>>(store);
    const rec = value as unknown as Record<string, unknown>;
    const keyVal = rec[def.keyPath];
    const idx = rows.findIndex((r) => r[def.keyPath] === keyVal);
    if (idx >= 0) rows[idx] = rec;
    else rows.push(rec);
    this.writeAll(store, rows);
  }

  async add<T>(store: StoreName, value: T): Promise<number> {
    const def = storeDef(store);
    const rows = this.readAll<Record<string, unknown>>(store);
    const rec = { ...(value as unknown as Record<string, unknown>) };
    const id = this.nextSeq(store);
    if (def.autoIncrement) rec[def.keyPath] = id;
    rows.push(rec);
    this.writeAll(store, rows);
    return id;
  }

  async getAll<T>(store: StoreName): Promise<T[]> {
    return this.readAll<T>(store);
  }

  async getByIndex<T>(store: StoreName, indexName: string, value: IDBValidKey): Promise<T[]> {
    const rows = this.readAll<Record<string, unknown>>(store);
    return rows.filter((r) => r[indexName] === value) as T[];
  }

  async delete(store: StoreName, key: IDBValidKey): Promise<void> {
    const def = storeDef(store);
    const rows = this.readAll<Record<string, unknown>>(store);
    const next = rows.filter((r) => r[def.keyPath] !== key);
    this.writeAll(store, next);
  }

  async clear(store: StoreName): Promise<void> {
    this.writeAll(store, []);
    localStorage.removeItem(`${LS_SEQ_PREFIX}${store}`);
  }

  async ensureSeqAtLeast(store: StoreName, minSeq: number): Promise<void> {
    const seqKey = `${LS_SEQ_PREFIX}${store}`;
    const current = Number(localStorage.getItem(seqKey) ?? '0');
    if (minSeq > current) localStorage.setItem(seqKey, String(minSeq));
  }
}

// ---------------------------------------------------------------------------
// Selección perezosa del backend
// ---------------------------------------------------------------------------

let backendPromise: Promise<StorageBackend> | null = null;

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

async function selectBackend(): Promise<StorageBackend> {
  if (hasIndexedDb()) {
    try {
      const db = await openDatabase();
      return new IndexedDbBackend(db);
    } catch (err) {
      console.warn('[kiro:storage] IndexedDB no disponible, usando localStorage.', err);
    }
  }
  return new LocalStorageBackend();
}

/** Devuelve el backend de almacenamiento (memoizado). */
export function getBackend(): Promise<StorageBackend> {
  if (!backendPromise) backendPromise = selectBackend();
  return backendPromise;
}

/** Resetea el backend memoizado. Solo para tests. */
export function __resetBackendForTests(): void {
  backendPromise = null;
}
