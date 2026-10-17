// Store de sesiones de cardio (correr/bici), separado del registro de fuerza.
// Store 'cardioSessions': keyPath 'id' autoincrement. Mismo patrón que
// workoutLogStore (getBackend + fallback localStorage).

import { getBackend } from './db';
import type { CardioSession } from './types';

const STORE = 'cardioSessions' as const;

/** Datos de una sesión nueva (sin id; se asigna al insertar). */
export type NewCardioSession = Omit<CardioSession, 'id'>;

/** Inserta una sesión de cardio; devuelve la entrada con su id. */
export async function addCardioSession(session: NewCardioSession): Promise<CardioSession> {
  const backend = await getBackend();
  const id = await backend.add<NewCardioSession>(STORE, session);
  return { ...session, id };
}

/** Todas las sesiones ordenadas por date ascendente (empate: id ascendente). */
export async function getAllCardioSessions(): Promise<CardioSession[]> {
  const backend = await getBackend();
  const rows = await backend.getAll<CardioSession>(STORE);
  return rows.sort((a, b) => {
    if (a.date === b.date) return a.id - b.id;
    return a.date < b.date ? -1 : 1;
  });
}

/** Elimina una sesión de cardio por su id. */
export async function deleteCardioSession(id: number): Promise<void> {
  const backend = await getBackend();
  await backend.delete(STORE, id);
}
