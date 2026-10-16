// Pestaña Fuerza: volumen de entrenamiento (por sesión y por semana) y
// progresión de fuerza por ejercicio (mejor peso×reps y 1RM estimado Epley).

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAllSets, type LoggedSet } from '../../storage';
import RangeSelector from './RangeSelector';
import { selectStrengthStats, type StatsRange } from './statsSelectors';
import styles from './tabs.module.css';

export default function FuerzaTab() {
  const [range, setRange] = useState<StatsRange>('mes');
  const [sets, setSets] = useState<LoggedSet[]>([]);

  // Los sets registrados viven en storage (workoutLogStore). Se cargan una vez
  // y se recalcula el resumen en memoria al cambiar el rango.
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

  const stats = useMemo(() => selectStrengthStats(sets, range), [sets, range]);

  const hasData = stats.perSession.length > 0;

  const weekData = stats.perWeek.map((w) => ({
    label: w.weekStart,
    totalKg: Math.round(w.totalKg),
  }));

  return (
    <div className={styles.tab}>
      <div className={styles.tabHead}>
        <h2 className={styles.tabTitle}>Fuerza y volumen</h2>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {!hasData ? (
        <p className={styles.empty}>
          Aún no has registrado series en este rango. Entrena y registra tus
          series en Gimnasio.
        </p>
      ) : (
        <>
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Volumen por semana (kg movidos)</h3>
            <div className={styles.chartBody}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={weekData}
                  margin={{ top: 8, right: 12, bottom: 4, left: -8 }}
                >
                  <CartesianGrid stroke="#2c3845" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#6c7d8d" fontSize={11} tickMargin={6} />
                  <YAxis stroke="#6c7d8d" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: '#141b23',
                      border: '1px solid #2c3845',
                      borderRadius: 12,
                      color: '#eef3f8',
                    }}
                  />
                  <Bar
                    dataKey="totalKg"
                    name="Volumen (kg)"
                    fill="#28e0a8"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Progresión por ejercicio (1RM estimado)</h3>
            <div className={styles.list}>
              {stats.progress.map((p) => (
                <div key={p.exerciseId} className={styles.row}>
                  <span className={styles.rowName}>{p.name}</span>
                  <span className={styles.rowMeta}>
                    1RM ≈ {Math.round(p.bestOneRepMax)} kg · mejor {p.bestWeightKg} kg
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
