// Host global de los pesajes semanal/mensual. Montado en App (fuera de las
// pantallas) para que los timers corran con cualquier pestaña abierta. Si no
// hay permiso del sistema, muestra un aviso in-app con botón "Ver".

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { readWeighInReminders } from '../../domain/weighInReminders';
import { scheduleWeighInReminders } from './reminderScheduler';
import styles from './WeighInReminderHost.module.css';

interface WeighInReminderHostProps {
  /** Navega a Estadísticas › Cuerpo (Registrar medición). */
  onGoToCuerpo?: () => void;
}

export default function WeighInReminderHost({ onGoToCuerpo }: WeighInReminderHostProps) {
  const { settings } = useSettings();
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);
  // La identidad del callback cambia en cada render de App: se guarda en un ref
  // para no reprogramar los timers por ello.
  const goRef = useRef(onGoToCuerpo);
  goRef.current = onGoToCuerpo;

  const loaded = settings !== null;
  const { weekly, monthly } = readWeighInReminders(settings?.reminders);

  useEffect(() => {
    if (!loaded) return;
    const handle = scheduleWeighInReminders(
      { weightWeekly: weekly, weightMonthly: monthly },
      {
        onInApp: (title, body) => setToast({ title, body }),
        onClick: () => goRef.current?.(),
      },
    );
    return () => handle.cancel();
    // Solo se reprograma si cambian los valores resueltos de los pesajes.
  }, [
    loaded,
    weekly.enabled,
    weekly.weekday,
    weekly.time,
    monthly.enabled,
    monthly.dayOfMonth,
    monthly.time,
  ]);

  if (!toast) return null;

  return (
    <div className={styles.toast} role="status">
      <div className={styles.text}>
        <strong className={styles.title}>{toast.title}</strong>
        <span className={styles.body}>{toast.body}</span>
      </div>
      <div className={styles.actions}>
        {onGoToCuerpo && (
          <button
            type="button"
            className={styles.go}
            onClick={() => {
              onGoToCuerpo();
              setToast(null);
            }}
          >
            Ver
          </button>
        )}
        <button
          type="button"
          className={styles.close}
          aria-label="Descartar aviso"
          onClick={() => setToast(null)}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
