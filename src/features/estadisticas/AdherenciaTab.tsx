// Pestaña Adherencia: entrenos completados y consistencia del registro de peso
// (días con medición) dentro del rango seleccionado. El calendario mensual de
// asistencia vive ahora en la pantalla Perfil; aquí quedan los contadores.

import { useMemo, useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { useAttendanceCalendar } from '../../domain/useAttendanceCalendar';
import RangeSelector from './RangeSelector';
import { selectAdherenceStats, type StatsRange } from './statsSelectors';
import styles from './tabs.module.css';

export default function AdherenciaTab() {
  const { history } = useProfile();
  const [range, setRange] = useState<StatsRange>('mes');
  const { sets, cardio } = useAttendanceCalendar();

  const stats = useMemo(
    () => selectAdherenceStats(sets, history, cardio, range),
    [sets, history, cardio, range],
  );

  const rangeLabel = stats.rangeDays ? `últimos ${stats.rangeDays} días` : 'todo el histórico';

  return (
    <div className={styles.tab}>
      <div className={styles.tabHead}>
        <h2 className={styles.tabTitle}>Adherencia</h2>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Días entrenados (fuerza o cardio)</span>
          <span className={styles.metricValue}>{stats.trainingDays}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Entrenos de fuerza</span>
          <span className={styles.metricValue}>{stats.workoutsCompleted}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Sesiones de cardio</span>
          <span className={styles.metricValue}>{stats.cardioDays}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Días con registro de peso</span>
          <span className={styles.metricValue}>{stats.daysWithWeightLog}</span>
        </div>
      </div>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Resumen ({rangeLabel})</h3>
        {stats.perDayWorkouts.length === 0 ? (
          <p className={styles.empty}>
            Aún no hay días entrenados en este rango. Registra fuerza o cardio en
            Gimnasio para medir tu constancia.
          </p>
        ) : (
          <div className={styles.list}>
            {stats.perDayWorkouts.map((d) => (
              <div key={d.date} className={styles.row}>
                <span className={styles.rowName}>{d.date}</span>
                <span className={styles.rowMeta}>Día entrenado</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
