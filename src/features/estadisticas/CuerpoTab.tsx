// Pestaña Cuerpo: hogar único del progreso corporal. Incluye la tarjeta de objetivo
// de peso, el formulario para registrar nuevas mediciones, las series de peso,
// % de grasa y MME del histórico Evolt (filtradas por el rango, recharts; el peso
// muestra el objetivo como línea de referencia) y el historial de mediciones con
// editar/borrar. Al cambiar el histórico, el contexto se actualiza y todo se refresca.

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useProfile } from '../../context/ProfileContext';
import { useSettings } from '../../context/SettingsContext';
import { readGoal } from '../../domain/goal';
import MeasurementForm from './MeasurementForm';
import MeasurementHistory from './MeasurementHistory';
import RangeSelector from './RangeSelector';
import { selectBodyStats, type SeriesPoint, type StatsRange } from './statsSelectors';
import WeightGoalCard from './WeightGoalCard';
import styles from './tabs.module.css';

interface SeriesDef {
  key: 'weight' | 'bodyFat' | 'mme';
  label: string;
  unit: string;
  color: string;
}

const SERIES: SeriesDef[] = [
  { key: 'weight', label: 'Peso', unit: 'kg', color: '#28e0a8' },
  { key: 'bodyFat', label: '% de grasa', unit: '%', color: '#f2b84b' },
  { key: 'mme', label: 'Masa muscular (MME)', unit: 'kg', color: '#5aa9ff' },
];

export default function CuerpoTab() {
  const { history, profile } = useProfile();
  const { settings } = useSettings();
  const goal = readGoal(settings);
  const [range, setRange] = useState<StatsRange>('todo');

  const stats = useMemo(() => selectBodyStats(history, range), [history, range]);

  const hasData = stats.weight.length > 0;

  return (
    <div className={styles.tab}>
      <WeightGoalCard />

      <section className={styles.formSection}>
        <h2 className={styles.tabTitle}>Registrar medición</h2>
        <MeasurementForm
          initial={
            profile
              ? {
                  age: profile.age,
                  heightCm: profile.heightCm,
                  sex: profile.sex,
                  weightKg: profile.weightKg,
                  bodyFatPct: profile.bodyFatPct,
                  mmeKg: profile.mmeKg,
                }
              : undefined
          }
        />
      </section>

      <div className={styles.tabHead}>
        <h2 className={styles.tabTitle}>Composición corporal</h2>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {!hasData ? (
        <p className={styles.empty}>
          Aún no hay mediciones en este rango. Registra tu primera medición aquí arriba.
        </p>
      ) : (
        SERIES.map((s) => {
          const data: SeriesPoint[] = stats[s.key];
          return (
            <section key={s.key} className={styles.card}>
              <h3 className={styles.cardTitle}>
                {s.label} ({s.unit})
              </h3>
              <div className={styles.chartBody}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={data}
                    margin={{ top: 8, right: 12, bottom: 4, left: -12 }}
                  >
                    <CartesianGrid stroke="#2c3845" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#6c7d8d" fontSize={11} tickMargin={6} />
                    <YAxis stroke="#6c7d8d" fontSize={11} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        background: '#141b23',
                        border: '1px solid #2c3845',
                        borderRadius: 12,
                        color: '#eef3f8',
                      }}
                    />
                    {s.key === 'weight' && goal.goalWeightKg !== null && (
                      <ReferenceLine
                        y={goal.goalWeightKg}
                        stroke="#28e0a8"
                        strokeDasharray="6 4"
                        strokeOpacity={0.7}
                        ifOverflow="extendDomain"
                        label={{
                          value: `Objetivo ${goal.goalWeightKg} kg`,
                          position: 'insideTopRight',
                          fill: '#9fb0c0',
                          fontSize: 11,
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          );
        })
      )}

      {history.length > 0 && <MeasurementHistory />}
    </div>
  );
}
