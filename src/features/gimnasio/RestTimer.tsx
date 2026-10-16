// RestTimer (design §8.4): cuenta atrás de descanso entre series. SEPARADO de la
// herramienta Cronómetro/Temporizador (feature B).
// PRECEDENCIA de duración: exercise.restSeconds ?? settings.restSeconds
// (el valor del ejercicio manda, p.ej. 45s en lateral_raise/calf_raise; el ajuste
// global es solo fallback). Corrección por timestamp con Date.now().

import { useCallback, useEffect, useRef, useState } from 'react';
import { beep } from '../timer/alerts';
import { formatClock, remainingMs } from '../timer/timerMath';
import { useRafTick } from '../timer/useRafTick';
import styles from './RestTimer.module.css';

interface RestTimerProps {
  /** restSeconds propio del ejercicio (prevalece). */
  exerciseRestSeconds?: number;
  /** restSeconds global de settings (fallback). */
  settingsRestSeconds: number;
}

export default function RestTimer({
  exerciseRestSeconds,
  settingsRestSeconds,
}: RestTimerProps) {
  // Precedencia explícita: el valor del ejercicio manda; settings es fallback.
  const restSeconds = exerciseRestSeconds ?? settingsRestSeconds;
  const durationMs = restSeconds * 1000;

  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const startRef = useRef(0);

  useRafTick(running, 100);

  const remaining = running ? remainingMs(durationMs, startRef.current, 0, true) : durationMs;

  useEffect(() => {
    if (running && remaining === 0) {
      setRunning(false);
      setDone(true);
      beep();
    }
  }, [running, remaining]);

  const start = useCallback(() => {
    startRef.current = Date.now();
    setDone(false);
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    setDone(false);
  }, []);

  return (
    <div className={`${styles.rest} ${done ? styles.restDone : ''}`}>
      <div className={styles.info}>
        <span className={styles.label}>Descanso</span>
        <span className={styles.value} aria-live="polite">
          {done ? '¡Listo!' : formatClock(running ? remaining : durationMs)}
        </span>
        <span className={styles.hint}>{restSeconds}s</span>
      </div>
      {!running ? (
        <button type="button" className={styles.btn} onClick={start}>
          {done ? 'Repetir' : 'Iniciar'}
        </button>
      ) : (
        <button type="button" className={styles.btnGhost} onClick={stop}>
          Saltar
        </button>
      )}
    </div>
  );
}
