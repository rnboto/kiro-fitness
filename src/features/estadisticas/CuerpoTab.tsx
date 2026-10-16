// Pestaña Cuerpo: series de peso, % de grasa y MME del histórico Evolt,
// filtradas por el rango seleccionado (recharts).

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useProfile } from '../../context/ProfileContext';
import RangeSelector from './RangeSelector';
import { selectBodyStats, type SeriesPoint, type StatsRange } from './statsSelectors';
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
  const { history } = useProfile();
  const [range, setRange] = useState<StatsRange>('todo');

  const stats = useMemo(() => selectBodyStats(history, range), [history, range]);

  const hasData = stats.weight.length > 0;

  return (
    <div className={styles.tab}>
      <div className={styles.tabHead}>
        <h2 className={styles.tabTitle}>Composición corporal</h2>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {!hasData ? (
        <p className={styles.empty}>
          Aún no hay mediciones en este rango. Registra tu peso en Perfil.
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
    </div>
  );
}
