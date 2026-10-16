// Modo 1 'Cronómetro': cuenta HACIA ARRIBA con Start/Pausa/Reset y vueltas (laps).
// Corrección por timestamp: el tiempo mostrado = elapsedMs(start, acumulado, running).

import { useCallback, useRef, useState } from 'react';
import { elapsedMs, formatClock, formatClockCentis } from './timerMath';
import { useRafTick } from './useRafTick';
import styles from './Stopwatch.module.css';

interface Lap {
  index: number;
  total: number; // ms totales en el momento de la vuelta
  split: number; // ms desde la vuelta anterior
}

export default function Stopwatch() {
  const [running, setRunning] = useState(false);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [laps, setLaps] = useState<Lap[]>([]);
  const startRef = useRef(0);

  // Re-render continuo mientras corre para refrescar el valor derivado.
  useRafTick(running, 50);

  const now = running ? elapsedMs(startRef.current, accumulatedMs, true) : accumulatedMs;

  const start = useCallback(() => {
    startRef.current = Date.now();
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    setAccumulatedMs((acc) => elapsedMs(startRef.current, acc, true));
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setAccumulatedMs(0);
    setLaps([]);
  }, []);

  const addLap = useCallback(() => {
    const total = running ? elapsedMs(startRef.current, accumulatedMs, true) : accumulatedMs;
    setLaps((prev) => {
      const prevTotal = prev.length > 0 ? prev[prev.length - 1].total : 0;
      return [...prev, { index: prev.length + 1, total, split: total - prevTotal }];
    });
  }, [running, accumulatedMs]);

  const hasTime = now > 0;

  return (
    <div className={styles.stopwatch}>
      <div className={styles.display} aria-live="polite" aria-label="Tiempo del cronómetro">
        {formatClock(now)}
      </div>

      <div className={styles.controls}>
        {!running ? (
          <button type="button" className={styles.primary} onClick={start}>
            {hasTime ? 'Reanudar' : 'Iniciar'}
          </button>
        ) : (
          <button type="button" className={styles.primary} onClick={pause}>
            Pausa
          </button>
        )}
        <button
          type="button"
          className={styles.secondary}
          onClick={addLap}
          disabled={!running}
        >
          Vuelta
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={reset}
          disabled={!hasTime && laps.length === 0}
        >
          Reiniciar
        </button>
      </div>

      {laps.length > 0 && (
        <ol className={styles.laps} aria-label="Vueltas registradas">
          {[...laps].reverse().map((lap) => (
            <li key={lap.index} className={styles.lap}>
              <span className={styles.lapLabel}>Vuelta {lap.index}</span>
              <span className={styles.lapSplit}>+{formatClockCentis(lap.split)}</span>
              <span className={styles.lapTotal}>{formatClockCentis(lap.total)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
