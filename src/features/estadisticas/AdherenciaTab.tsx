// Pestaña Adherencia: entrenos completados y consistencia del registro de peso
// (días con medición) dentro del rango seleccionado.

import { useEffect, useMemo, useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { getAllSets, type LoggedSet } from '../../storage';
import RangeSelector from './RangeSelector';
import { selectAdherenceStats, type StatsRange } from './statsSelectors';
import styles from './tabs.module.css';

export default function AdherenciaTab() {
  const { history } = useProfile();
  const [range, setRange] = useState<StatsRange>('mes');
  const [sets, setSets] = useState<LoggedSet[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const all = await getAllSets();
      if (active) setSets(all);
    })();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(
    () => selectAdherenceStats(sets, history, range),
    [sets, history, range],
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
          <span className={styles.metricLabel}>Entrenos completados</span>
          <span className={styles.metricValue}>{stats.workoutsCompleted}</span>
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
            Aún no hay entrenos registrados en este rango. Registra tus series en
            Gimnasio para medir tu constancia.
          </p>
        ) : (
          <div className={styles.list}>
            {stats.perDayWorkouts.map((d) => (
              <div key={d.date} className={styles.row}>
                <span className={styles.rowName}>{d.date}</span>
                <span className={styles.rowMeta}>Entreno registrado</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
