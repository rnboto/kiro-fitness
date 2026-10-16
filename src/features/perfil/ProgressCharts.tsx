// Gráficas de progreso del histórico Evolt (peso, % grasa y MME) con recharts.

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ProfileEntry } from '../../storage';
import styles from './ProgressCharts.module.css';

interface ProgressChartsProps {
  history: ProfileEntry[];
}

interface SeriesDef {
  key: 'weightKg' | 'bodyFatPct' | 'mmeKg';
  label: string;
  unit: string;
  color: string;
}

const SERIES: SeriesDef[] = [
  { key: 'weightKg', label: 'Peso', unit: 'kg', color: '#28e0a8' },
  { key: 'bodyFatPct', label: '% de grasa', unit: '%', color: '#f2b84b' },
  { key: 'mmeKg', label: 'Masa muscular (MME)', unit: 'kg', color: '#5aa9ff' },
];

export default function ProgressCharts({ history }: ProgressChartsProps) {
  if (history.length === 0) {
    return (
      <p className={styles.empty}>
        Aún no hay mediciones. Registra tu primera para ver tu progreso.
      </p>
    );
  }

  const data = history.map((entry) => ({
    date: entry.date,
    weightKg: entry.weightKg,
    bodyFatPct: entry.bodyFatPct,
    mmeKg: entry.mmeKg,
  }));

  return (
    <div className={styles.charts}>
      {SERIES.map((s) => (
        <section key={s.key} className={styles.chart}>
          <h3 className={styles.chartTitle}>
            {s.label} <span className={styles.unit}>({s.unit})</span>
          </h3>
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
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
                <Line
                  type="monotone"
                  dataKey={s.key}
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
      ))}
    </div>
  );
}
