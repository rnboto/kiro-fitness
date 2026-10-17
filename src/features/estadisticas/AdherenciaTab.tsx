// Pestaña Adherencia: entrenos completados y consistencia del registro de peso
// (días con medición) dentro del rango seleccionado, más el calendario mensual
// de asistencia (días entrenados automáticos + marcas manuales) y su resumen.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import {
  addAttendanceMark,
  getAllAttendanceMarks,
  getAllCardioSessions,
  getAllSets,
  removeAttendanceMark,
  type CardioSession,
  type LoggedSet,
} from '../../storage';
import {
  countTrainedInMonth,
  selectCurrentStreak,
  selectTrainedDays,
  selectTrainedDaysWithManual,
} from '../../domain/attendance';
import AttendanceCalendar, { type ViewMonth } from './AttendanceCalendar';
import RangeSelector from './RangeSelector';
import { selectAdherenceStats, type StatsRange } from './statsSelectors';
import styles from './tabs.module.css';

export default function AdherenciaTab() {
  const { history } = useProfile();
  const [range, setRange] = useState<StatsRange>('mes');
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [cardio, setCardio] = useState<CardioSession[]>([]);
  const [manualMarks, setManualMarks] = useState<string[]>([]);
  const now = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState<ViewMonth>(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }));

  useEffect(() => {
    let active = true;
    (async () => {
      const [allSets, allCardio, allMarks] = await Promise.all([
        getAllSets(),
        getAllCardioSessions(),
        getAllAttendanceMarks(),
      ]);
      if (active) {
        setSets(allSets);
        setCardio(allCardio);
        setManualMarks(allMarks ?? []);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(
    () => selectAdherenceStats(sets, history, cardio, range),
    [sets, history, cardio, range],
  );

  // Días automáticos (fuerza/cardio) y días resaltados (auto O manual).
  const autoDays = useMemo(() => selectTrainedDays(sets, cardio), [sets, cardio]);
  const trainedDays = useMemo(
    () => selectTrainedDaysWithManual(sets, cardio, manualMarks),
    [sets, cardio, manualMarks],
  );

  const trainedThisMonth = useMemo(
    () => countTrainedInMonth(trainedDays, viewMonth.year, viewMonth.month),
    [trainedDays, viewMonth],
  );
  const streak = useMemo(
    () => selectCurrentStreak(trainedDays, now),
    [trainedDays, now],
  );

  // Alterna una marca manual (solo días no automáticos; el calendario ya lo
  // garantiza). Actualiza el estado local de forma optimista.
  const handleToggle = useCallback(
    (dateKey: string) => {
      setManualMarks((prev) => {
        if (prev.includes(dateKey)) {
          void removeAttendanceMark(dateKey);
          return prev.filter((d) => d !== dateKey);
        }
        void addAttendanceMark(dateKey);
        return [...prev, dateKey];
      });
    },
    [],
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
        <h3 className={styles.cardTitle}>Calendario de asistencia</h3>
        <p className={styles.rowMeta}>Toca un día para marcar que entrenaste.</p>
        <AttendanceCalendar
          trainedDays={trainedDays}
          autoDays={autoDays}
          onToggle={handleToggle}
          now={now}
          onViewMonthChange={setViewMonth}
        />
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Días entrenados este mes</span>
            <span className={styles.metricValue}>{trainedThisMonth}</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Racha</span>
            <span className={styles.metricValue}>{streak}</span>
          </div>
        </div>
      </section>

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
