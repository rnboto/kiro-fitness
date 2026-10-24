// Contexto de perfil: carga el perfil actual + histórico desde storage y expone
// la API de alta de mediciones (design §4.2, §4.4, §6.4).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  addEntry,
  deleteEntry,
  getAllEntries,
  updateEntry,
  type NewProfileEntry,
  type ProfileEntry,
  type ProfileEntryPatch,
} from '../storage';
import { selectCurrentProfile } from '../domain/profileHistory';

interface ProfileContextValue {
  /** Perfil actual = entrada con date más reciente; null si no hay ninguna. */
  profile: ProfileEntry | null;
  /** Histórico completo ordenado por date ascendente (para gráficas). */
  history: ProfileEntry[];
  /** true mientras la carga inicial no ha terminado. */
  loading: boolean;
  /** Primer arranque = no hay perfil guardado (design §4.2). */
  firstLaunch: boolean;
  /** Inserta SIEMPRE una entrada nueva datada y refresca el estado. */
  addMeasurement: (entry: NewProfileEntry) => Promise<ProfileEntry>;
  /** Actualiza EN SITIO una medición (mismo id) y refresca el estado; null si no existe. */
  updateMeasurement: (id: number, patch: ProfileEntryPatch) => Promise<ProfileEntry | null>;
  /** Borra una medición (nunca la última) y refresca el estado; false si no se borró. */
  deleteMeasurement: (id: number) => Promise<boolean>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileEntry | null>(null);
  const [history, setHistory] = useState<ProfileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const all = await getAllEntries();
      if (!active) return;
      setProfile(selectCurrentProfile(all));
      setHistory(all);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Refresca desde storage; el perfil actual sale del selector compartido
  // (día más reciente, empate → id mayor).
  const refresh = useCallback(async () => {
    const all = await getAllEntries();
    setHistory(all);
    setProfile(selectCurrentProfile(all));
  }, []);

  const addMeasurement = useCallback(
    async (entry: NewProfileEntry) => {
      const saved = await addEntry(entry);
      await refresh();
      return saved;
    },
    [refresh],
  );

  const updateMeasurement = useCallback(
    async (id: number, patch: ProfileEntryPatch) => {
      const saved = await updateEntry(id, patch);
      await refresh();
      return saved;
    },
    [refresh],
  );

  const deleteMeasurement = useCallback(
    async (id: number) => {
      const ok = await deleteEntry(id);
      await refresh();
      return ok;
    },
    [refresh],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      history,
      loading,
      firstLaunch: !loading && profile === null,
      addMeasurement,
      updateMeasurement,
      deleteMeasurement,
    }),
    [profile, history, loading, addMeasurement, updateMeasurement, deleteMeasurement],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

/** Hook de acceso al contexto de perfil. */
export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile debe usarse dentro de <ProfileProvider>');
  return ctx;
}
