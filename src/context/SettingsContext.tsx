// Contexto de ajustes: carga/siembra el singleton Settings y expone updateSettings
// (design §5, §6.4).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await getSettings();
      if (!active) return;
      setSettings(loaded);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const updateSettings = useCallback(async (next: Settings) => {
    await saveSettings(next);
    setSettings(next);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loading, updateSettings }),
    [settings, loading, updateSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** Hook de acceso al contexto de ajustes. */
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings debe usarse dentro de <SettingsProvider>');
  return ctx;
}
