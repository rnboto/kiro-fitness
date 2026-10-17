// Pestaña Cardio: métricas aeróbicas (correr/bici) totalmente separadas de la
// fuerza. Total de km y minutos, nº de sesiones, acumulado por semana y
// desglose por tipo, con el selector de rango compartido.

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  formatMmSs,
  formatPace,
  formatSpeed,
} from '../../domain/cardio';
import { getAllCardioSessions, type CardioSession } from '../../storage';
import RangeSelector from './RangeSelector';
import {
  selectCardioProgress,
  selectCardioRecords,
  selectCardioStats,
  type StatsRange,
} from './statsSelectors';
import styles from './tabs.module.css';

export default function CardioTab() {
  const [range, setRange] = useState<StatsRange>('mes');
  const [sessions, setSessions] = useState<CardioSession[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const all = await getAllCardioSessions();
      if (active) setSessions(all);
    })();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => selectCardioStats(sessions, range), [sessions, range]);
  const correrProgress = useMemo(
    () => selectCardioProgress(sessions, 'correr', range),
    [sessions, range],
  );
  const biciProgress = useMemo(
    () => selectCardioProgress(sessions, 'bici', range),
    [sessions, range],
  );
  const correrRecords = useMemo(
    () => selectCardioRecords(sessions, 'correr', range),
    [sessions, range],
  );
  const biciRecords = useMemo(
    () => selectCardioRecords(sessions, 'bici', range),
    [sessions, range],
  );

  const hasData = stats.sessions > 0;

  const weekData = stats.perWeek.map((w) => ({
    label: w.weekStart,
    km: Math.round(w.km * 10) / 10,
  }));

  // value = seg/km → se grafica numérico y el eje/tooltip se formatea a mm:ss.
  const paceData = correrProgress.paceSeries.map((p) => ({
    label: p.date,
    pace: Math.round(p.value),
  }));
  const speedData = biciProgress.speedSeries.map((p) => ({
    label: p.date,
    speed: Math.round(p.value * 10) / 10,
  }));

  return (
    <div className={styles.tab}>
      <div className={styles.tabHead}>
        <h2 className={styles.tabTitle}>Cardio (aeróbico)</h2>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {!hasData ? (
        <p className={styles.empty}>
          Aún no has registrado sesiones de cardio en este rango. Registra tus
          sesiones de correr o bici en Gimnasio › Cardio.
        </p>
      ) : (
        <>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Total km</span>
              <span className={styles.metricValue}>
                {Math.round(stats.totalKm * 10) / 10}
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Total minutos</span>
              <span className={styles.metricValue}>{Math.round(stats.totalMin)}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Sesiones</span>
              <span className={styles.metricValue}>{stats.sessions}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Sesiones / semana</span>
              <span className={styles.metricValue}>
                {stats.perWeek.length > 0
                  ? Math.round((stats.sessions / stats.perWeek.length) * 10) / 10
                  : 0}
              </span>
            </div>
          </div>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Distancia por semana (km)</h3>
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
                    dataKey="km"
                    name="Distancia (km)"
                    fill="#28e0a8"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {stats.byType.correr.sessions > 0 && (
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Records 🏃 Correr</h3>
              <div className={styles.list}>
                <div className={styles.row}>
                  <span className={styles.rowName}>Mejor ritmo</span>
                  <span className={styles.rowMeta}>
                    {formatPace(correrRecords.bestPaceSecPerKm)}
                    {correrRecords.lastPaceIsPR ? ' · ¡Récord!' : ''}
                  </span>
                </div>
                <div className={styles.row}>
                  <span className={styles.rowName}>Distancia más larga</span>
                  <span className={styles.rowMeta}>
                    {correrRecords.longestDistanceKm !== null
                      ? `${Math.round(correrRecords.longestDistanceKm * 10) / 10} km`
                      : '—'}
                  </span>
                </div>
                <div className={styles.row}>
                  <span className={styles.rowName}>Sesión más larga</span>
                  <span className={styles.rowMeta}>
                    {correrRecords.longestDurationSec !== null
                      ? formatMmSs(correrRecords.longestDurationSec)
                      : '—'}
                  </span>
                </div>
              </div>
            </section>
          )}

          {paceData.length > 0 && (
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>
                Ritmo correr (min/km) — más bajo es mejor
              </h3>
              <div className={styles.chartBody}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={paceData}
                    margin={{ top: 8, right: 12, bottom: 4, left: -8 }}
                  >
                    <CartesianGrid stroke="#2c3845" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      stroke="#6c7d8d"
                      fontSize={11}
                      tickMargin={6}
                    />
                    <YAxis
                      stroke="#6c7d8d"
                      fontSize={11}
                      tickFormatter={(v: number) => formatMmSs(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#141b23',
                        border: '1px solid #2c3845',
                        borderRadius: 12,
                        color: '#eef3f8',
                      }}
                      formatter={(v: number) => [`${formatMmSs(v)} min/km`, 'Ritmo']}
                    />
                    <Line
                      type="monotone"
                      dataKey="pace"
                      name="Ritmo (min/km)"
                      stroke="#28e0a8"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {stats.byType.bici.sessions > 0 && (
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Records 🚴 Bici</h3>
              <div className={styles.list}>
                <div className={styles.row}>
                  <span className={styles.rowName}>Mejor velocidad</span>
                  <span className={styles.rowMeta}>
                    {formatSpeed(biciRecords.bestSpeedKmH)}
                    {biciRecords.lastSpeedIsPR ? ' · ¡Récord!' : ''}
                  </span>
                </div>
                <div className={styles.row}>
                  <span className={styles.rowName}>Distancia más larga</span>
                  <span className={styles.rowMeta}>
                    {biciRecords.longestDistanceKm !== null
                      ? `${Math.round(biciRecords.longestDistanceKm * 10) / 10} km`
                      : '—'}
                  </span>
                </div>
                <div className={styles.row}>
                  <span className={styles.rowName}>Sesión más larga</span>
                  <span className={styles.rowMeta}>
                    {biciRecords.longestDurationSec !== null
                      ? formatMmSs(biciRecords.longestDurationSec)
                      : '—'}
                  </span>
                </div>
              </div>
            </section>
          )}

          {speedData.length > 0 && (
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Velocidad bici (km/h)</h3>
              <div className={styles.chartBody}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={speedData}
                    margin={{ top: 8, right: 12, bottom: 4, left: -8 }}
                  >
                    <CartesianGrid stroke="#2c3845" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      stroke="#6c7d8d"
                      fontSize={11}
                      tickMargin={6}
                    />
                    <YAxis stroke="#6c7d8d" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: '#141b23',
                        border: '1px solid #2c3845',
                        borderRadius: 12,
                        color: '#eef3f8',
                      }}
                      formatter={(v: number) => [`${v.toFixed(1)} km/h`, 'Velocidad']}
                    />
                    <Line
                      type="monotone"
                      dataKey="speed"
                      name="Velocidad (km/h)"
                      stroke="#4aa3ff"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Desglose por tipo</h3>
            <div className={styles.list}>
              <div className={styles.row}>
                <span className={styles.rowName}>🏃 Correr</span>
                <span className={styles.rowMeta}>
                  {Math.round(stats.byType.correr.km * 10) / 10} km ·{' '}
                  {Math.round(stats.byType.correr.min)} min ·{' '}
                  {stats.byType.correr.sessions} sesiones
                </span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowName}>🚴 Bici</span>
                <span className={styles.rowMeta}>
                  {Math.round(stats.byType.bici.km * 10) / 10} km ·{' '}
                  {Math.round(stats.byType.bici.min)} min ·{' '}
                  {stats.byType.bici.sessions} sesiones
                </span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
