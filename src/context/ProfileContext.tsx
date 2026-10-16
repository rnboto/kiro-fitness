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
  getAllEntries,
  getLatestProfile,
  type NewProfileEntry,
  type ProfileEntry,
} from '../storage';

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
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileEntry | null>(null);
  const [history, setHistory] = useState<ProfileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [latest, all] = await Promise.all([getLatestProfile(), getAllEntries()]);
      if (!active) return;
      setProfile(latest);
      setHistory(all);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const addMeasurement = useCallback(async (entry: NewProfileEntry) => {
    const saved = await addEntry(entry);
    // Refresca desde storage para respetar el orden/tie-break de getAllEntries.
    const [latest, all] = await Promise.all([getLatestProfile(), getAllEntries()]);
    setProfile(latest);
    setHistory(all);
    return saved;
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      history,
      loading,
      firstLaunch: !loading && profile === null,
      addMeasurement,
    }),
    [profile, history, loading, addMeasurement],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

/** Hook de acceso al contexto de perfil. */
export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile debe usarse dentro de <ProfileProvider>');
  return ctx;
}
