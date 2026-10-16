// Pantalla Notificaciones (design §9). Lista de próximos recordatorios
// (calculada), toggles on/off por tipo (peso/hidratación/bioimpedancia) y campos
// de horas/intervalos. Persiste en settings.reminders y reprograma los timers.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { useSettings } from '../../context/SettingsContext';
import type { ReminderSettings, Settings } from '../../storage';
import {
  getPermissionState,
  nextBioimpedanceDate,
  nextHydrationFire,
  msUntilNextDaily,
  requestPermission,
  scheduleReminders,
  type PermissionState,
  type SchedulerHandle,
} from './reminderScheduler';
import styles from './NotificacionesScreen.module.css';

/** Formatea una fecha a texto corto en español. */
function formatDateTime(d: Date): string {
  return d.toLocaleString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface UpcomingItem {
  key: string;
  label: string;
  when: string;
  pending?: boolean;
}

interface NotificacionesScreenProps {
  /** Abre el panel de Ajustes/Acerca de (design §13). */
  onOpenSettings?: () => void;
}

export default function NotificacionesScreen({ onOpenSettings }: NotificacionesScreenProps) {
  const { settings, updateSettings } = useSettings();
  const { profile } = useProfile();
  const [permission, setPermission] = useState<PermissionState>(() => getPermissionState());
  const [banner, setBanner] = useState<string | null>(null);
  const handleRef = useRef<SchedulerHandle | null>(null);

  const reminders = settings?.reminders ?? null;

  // (Re)programa los timers cuando cambian los recordatorios.
  useEffect(() => {
    if (!reminders) return;
    handleRef.current?.cancel();
    handleRef.current = scheduleReminders(reminders, {
      onInApp: (title, body) => setBanner(`${title}: ${body}`),
    });
    return () => {
      handleRef.current?.cancel();
      handleRef.current = null;
    };
  }, [reminders]);

  const upcoming = useMemo<UpcomingItem[]>(() => {
    if (!reminders) return [];
    const now = new Date();
    const items: UpcomingItem[] = [];

    if (reminders.weightLog.enabled) {
      const next = new Date(now.getTime() + msUntilNextDaily(now, reminders.weightLog.time));
      items.push({ key: 'weight', label: 'Registrar peso', when: formatDateTime(next) });
    }
    if (reminders.hydration.enabled) {
      const next = nextHydrationFire(
        now,
        reminders.hydration.startTime,
        reminders.hydration.endTime,
        reminders.hydration.intervalMinutes,
      );
      items.push({ key: 'hydration', label: 'Hidratación', when: formatDateTime(next) });
    }
    if (reminders.bioimpedance.enabled && profile) {
      const next = nextBioimpedanceDate(
        new Date(profile.date),
        reminders.bioimpedance.intervalWeeks,
      );
      const pending = next.getTime() < now.getTime();
      items.push({
        key: 'bio',
        label: 'Test de bioimpedancia',
        when: pending ? `${formatDate(next)} (pendiente)` : formatDate(next),
        pending,
      });
    }
    return items;
  }, [reminders, profile]);

  if (!settings || !reminders) {
    return <p className={styles.loading}>Cargando recordatorios…</p>;
  }

  const patch = (next: ReminderSettings) => {
    const updated: Settings = { ...settings, reminders: next };
    void updateSettings(updated);
  };

  const askPermission = async () => {
    const result = await requestPermission();
    setPermission(result);
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Notificaciones</h1>
        <p className={styles.subtitle}>
          Recordatorios de peso, hidratación y tu próximo test de bioimpedancia.
        </p>
      </header>

      {permission !== 'granted' && (
        <section className={styles.permission}>
          <p>
            {permission === 'denied' || permission === 'unsupported'
              ? 'Sin permiso del sistema: verás los avisos como banners dentro de la app.'
              : 'Activa las notificaciones del sistema para recibir avisos aunque no mires la pantalla.'}
          </p>
          {permission === 'default' && (
            <button type="button" className={styles.primaryBtn} onClick={askPermission}>
              Permitir notificaciones
            </button>
          )}
        </section>
      )}

      {banner && (
        <div className={styles.banner} role="status">
          {banner}
          <button
            type="button"
            className={styles.bannerClose}
            aria-label="Descartar aviso"
            onClick={() => setBanner(null)}
          >
            ✕
          </button>
        </div>
      )}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Próximos recordatorios</h2>
        {upcoming.length === 0 ? (
          <p className={styles.empty}>No hay recordatorios activos.</p>
        ) : (
          <ul className={styles.upcoming}>
            {upcoming.map((item) => (
              <li key={item.key} className={styles.upcomingRow}>
                <span className={styles.upcomingLabel}>{item.label}</span>
                <span
                  className={`${styles.upcomingWhen} ${item.pending ? styles.pending : ''}`}
                >
                  {item.when}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Peso */}
      <section className={styles.card}>
        <div className={styles.rowHead}>
          <h2 className={styles.cardTitle}>Registro de peso</h2>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={reminders.weightLog.enabled}
              onChange={(e) =>
                patch({
                  ...reminders,
                  weightLog: { ...reminders.weightLog, enabled: e.target.checked },
                })
              }
            />
            <span className={styles.switchLabel}>
              {reminders.weightLog.enabled ? 'Activo' : 'Inactivo'}
            </span>
          </label>
        </div>
        <label className={styles.field}>
          <span>Hora del aviso</span>
          <input
            type="time"
            value={reminders.weightLog.time}
            onChange={(e) =>
              patch({
                ...reminders,
                weightLog: { ...reminders.weightLog, time: e.target.value },
              })
            }
          />
        </label>
      </section>

      {/* Hidratación */}
      <section className={styles.card}>
        <div className={styles.rowHead}>
          <h2 className={styles.cardTitle}>Hidratación</h2>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={reminders.hydration.enabled}
              onChange={(e) =>
                patch({
                  ...reminders,
                  hydration: { ...reminders.hydration, enabled: e.target.checked },
                })
              }
            />
            <span className={styles.switchLabel}>
              {reminders.hydration.enabled ? 'Activo' : 'Inactivo'}
            </span>
          </label>
        </div>
        <div className={styles.fields}>
          <label className={styles.field}>
            <span>Desde</span>
            <input
              type="time"
              value={reminders.hydration.startTime}
              onChange={(e) =>
                patch({
                  ...reminders,
                  hydration: { ...reminders.hydration, startTime: e.target.value },
                })
              }
            />
          </label>
          <label className={styles.field}>
            <span>Hasta</span>
            <input
              type="time"
              value={reminders.hydration.endTime}
              onChange={(e) =>
                patch({
                  ...reminders,
                  hydration: { ...reminders.hydration, endTime: e.target.value },
                })
              }
            />
          </label>
          <label className={styles.field}>
            <span>Cada (min)</span>
            <input
              type="number"
              min={15}
              max={240}
              step={15}
              value={reminders.hydration.intervalMinutes}
              onChange={(e) =>
                patch({
                  ...reminders,
                  hydration: {
                    ...reminders.hydration,
                    intervalMinutes: Math.max(15, Number(e.target.value) || 15),
                  },
                })
              }
            />
          </label>
        </div>
      </section>

      {/* Bioimpedancia */}
      <section className={styles.card}>
        <div className={styles.rowHead}>
          <h2 className={styles.cardTitle}>Test de bioimpedancia</h2>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={reminders.bioimpedance.enabled}
              onChange={(e) =>
                patch({
                  ...reminders,
                  bioimpedance: { ...reminders.bioimpedance, enabled: e.target.checked },
                })
              }
            />
            <span className={styles.switchLabel}>
              {reminders.bioimpedance.enabled ? 'Activo' : 'Inactivo'}
            </span>
          </label>
        </div>
        <label className={styles.field}>
          <span>Cada (semanas)</span>
          <input
            type="number"
            min={1}
            max={26}
            step={1}
            value={reminders.bioimpedance.intervalWeeks}
            onChange={(e) =>
              patch({
                ...reminders,
                bioimpedance: {
                  ...reminders.bioimpedance,
                  intervalWeeks: Math.max(1, Number(e.target.value) || 1),
                },
              })
            }
          />
        </label>
        {!profile && (
          <p className={styles.hint}>
            Registra tu primer estudio en Perfil para calcular la fecha del
            próximo test.
          </p>
        )}
      </section>

      {onOpenSettings && (
        <button type="button" className={styles.settingsLink} onClick={onOpenSettings}>
          ⚙ Ajustes y Acerca de
        </button>
      )}
    </div>
  );
}
