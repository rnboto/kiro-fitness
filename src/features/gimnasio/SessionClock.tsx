// SessionClock (design §8.4): reloj total de la sesión de entrenamiento. Objetivo
// 60:00. Umbrales de color: verde < 50:00, ámbar 50:00–60:00, rojo > 60:00.
// Corrección por timestamp (Date.now()). SEPARADO de la herramienta Cronómetro.

import { useCallback, useRef, useState } from 'react';
import { elapsedMs, formatClock } from '../timer/timerMath';
import { useRafTick } from '../timer/useRafTick';
import styles from './SessionClock.module.css';

const AMBER_MS = 50 * 60 * 1000; // 50:00
const RED_MS = 60 * 60 * 1000; // 60:00

function zoneFor(ms: number): 'green' | 'amber' | 'red' {
  if (ms > RED_MS) return 'red';
  if (ms >= AMBER_MS) return 'amber';
  return 'green';
}

export default function SessionClock() {
  const [running, setRunning] = useState(false);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const startRef = useRef(0);

  useRafTick(running, 250);

  const now = running ? elapsedMs(startRef.current, accumulatedMs, true) : accumulatedMs;
  const zone = zoneFor(now);

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
  }, []);

  const zoneClass =
    zone === 'red' ? styles.red : zone === 'amber' ? styles.amber : styles.green;

  return (
    <section className={styles.clock} aria-label="Reloj de sesión">
      <div className={styles.head}>
        <span className={styles.label}>Sesión</span>
        <span className={styles.target}>objetivo 60:00</span>
      </div>
      <div className={`${styles.value} ${zoneClass}`} aria-live="polite">
        {formatClock(now)}
      </div>
      <div className={styles.controls}>
        {!running ? (
          <button type="button" className={styles.primary} onClick={start}>
            {now > 0 ? 'Reanudar' : 'Empezar'}
          </button>
        ) : (
          <button type="button" className={styles.secondary} onClick={pause}>
            Pausar
          </button>
        )}
        <button
          type="button"
          className={styles.ghost}
          onClick={reset}
          disabled={now === 0}
        >
          Reiniciar
        </button>
      </div>
    </section>
  );
}
