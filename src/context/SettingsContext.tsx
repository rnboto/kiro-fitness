// Contexto de ajustes: carga/siembra el singleton Settings y expone updateSettings
// y patchSettings (design §5, §6.4).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getSettings, saveSettings, type Settings } from '../storage';

interface SettingsContextValue {
  /** Ajustes actuales; null mientras no ha cargado. */
  settings: Settings | null;
  loading: boolean;
  /** Persiste nuevos ajustes y actualiza el estado en memoria. */
  updateSettings: (settings: Settings) => Promise<void>;
  /**
   * Aplica un cambio funcional sobre los ajustes MÁS RECIENTES (no sobre una
   * copia de un render anterior): dos llamadas seguidas no se pisan. El estado
   * se actualiza al instante y los guardados se encadenan en orden.
   */
  patchSettings: (updater: (current: Settings) => Settings) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  // Últimos ajustes conocidos (sincrónico), para los cambios funcionales.
  const latestRef = useRef<Settings | null>(null);
  // Cola de guardados: se persisten en el orden en que se piden.
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await getSettings();
      if (!active) return;
      latestRef.current = loaded;
      setSettings(loaded);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const updateSettings = useCallback(async (next: Settings) => {
    await saveSettings(next);
    latestRef.current = next;
    setSettings(next);
  }, []);

  const patchSettings = useCallback((updater: (current: Settings) => Settings): Promise<void> => {
    const current = latestRef.current;
    if (!current) return Promise.resolve();
    const next = updater(current);
    latestRef.current = next;
    setSettings(next);
    queueRef.current = queueRef.current.catch(() => {}).then(() => saveSettings(next));
    return queueRef.current;
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loading, updateSettings, patchSettings }),
    [settings, loading, updateSettings, patchSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** Hook de acceso al contexto de ajustes. */
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings debe usarse dentro de <SettingsProvider>');
  return ctx;
}
