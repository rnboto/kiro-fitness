// Banner "Toca pesarte": derivado de los datos (última medición + ajustes),
// independiente de timers y permisos. Se oculta sin histórico o si no toca.

import { useMemo } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { useSettings } from '../../context/SettingsContext';
import { weighInStatus } from '../../domain/weighInReminders';
import styles from './WeighInBanner.module.css';

interface WeighInBannerProps {
  /** Navega a Estadísticas › Cuerpo (Registrar medición). */
  onGoToCuerpo?: () => void;
}

export default function WeighInBanner({ onGoToCuerpo }: WeighInBannerProps) {
  const { history } = useProfile();
  const { settings } = useSettings();
  const reminders = settings?.reminders;

  const status = useMemo(
    () => weighInStatus(history, reminders, new Date()),
    [history, reminders],
  );

  if (history.length === 0 || (!status.weeklyDue && !status.monthlyDue)) return null;

  const days = status.daysSinceLast ?? 0;
  const message = status.monthlyDue
    ? `Pesaje mensual pendiente: llevas ${days} días sin registrar tu peso y tus medidas.`
    : `Pesaje semanal pendiente: han pasado ${days} días desde tu última medición.`;

  return (
    <section className={styles.banner} aria-label="Toca pesarte">
      <div className={styles.text}>
        <h2 className={styles.title}>Toca pesarte</h2>
        <p className={styles.message}>{message}</p>
      </div>
      {onGoToCuerpo && (
        <button type="button" className={styles.action} onClick={onGoToCuerpo}>
          Registrar medición
        </button>
      )}
    </section>
  );
}
