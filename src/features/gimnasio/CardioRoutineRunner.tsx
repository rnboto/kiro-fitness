// Runner guiado de una rutina de cardio: recorre los pasos expandidos en orden
// reutilizando la lógica por timestamp del cronómetro (timerMath + useRafTick +
// alerts), igual que Countdown.tsx. NO usa setInterval acumulativo.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatMmSs } from '../../domain/cardio';
import {
  expandRoutineSteps,
  routineTotalSec,
  type CardioRoutine,
} from '../../domain/cardioRoutines';
import { beep, vibrate } from '../timer/alerts';
import { formatClock, remainingMs } from '../timer/timerMath';
import { useRafTick } from '../timer/useRafTick';
import styles from './CardioRoutineRunner.module.css';

interface CardioRoutineRunnerProps {
  routine: CardioRoutine;
}

export default function CardioRoutineRunner({ routine }: CardioRoutineRunnerProps) {
  const steps = useMemo(() => expandRoutineSteps(routine), [routine]);
  const totalSec = useMemo(() => routineTotalSec(routine), [routine]);

  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [consumedMs, setConsumedMs] = useState(0); // consumido del paso actual
  const [finished, setFinished] = useState(false);
  // Segundos completos de los pasos ya terminados (para el progreso global).
  const [doneSec, setDoneSec] = useState(0);

  const startRef = useRef(0);

  const current = steps[index];
  const next = steps[index + 1];
  const stepDurationMs = current ? current.durationSec * 1000 : 0;

  useRafTick(running, 50);

  const remaining = running
    ? remainingMs(stepDurationMs, startRef.current, consumedMs, true)
    : Math.max(0, stepDurationMs - consumedMs);

  // Al cruzar 0 el paso actual: avisa y avanza (o finaliza en el último).
  useEffect(() => {
    if (!running || remaining !== 0) return;
    beep();
    vibrate();
    const isLast = index >= steps.length - 1;
    if (isLast) {
      setRunning(false);
      setConsumedMs(stepDurationMs);
      setDoneSec(totalSec);
      setFinished(true);
    } else {
      setDoneSec((s) => s + (current?.durationSec ?? 0));
      setIndex((i) => i + 1);
      setConsumedMs(0);
      startRef.current = Date.now();
    }
  }, [running, remaining, index, steps.length, stepDurationMs, totalSec, current]);

  const start = useCallback(() => {
    if (steps.length === 0) return;
    startRef.current = Date.now();
    setRunning(true);
  }, [steps.length]);

  const pause = useCallback(() => {
    setConsumedMs(stepDurationMs - remainingMs(stepDurationMs, startRef.current, consumedMs, true));
    setRunning(false);
  }, [stepDurationMs, consumedMs]);

  const stop = useCallback(() => {
    setRunning(false);
    setIndex(0);
    setConsumedMs(0);
    setDoneSec(0);
    setFinished(false);
  }, []);

  const started = running || consumedMs > 0 || index > 0 || finished;

  // Elapsed global: pasos terminados + lo consumido del paso actual.
  const currentConsumedMs = running
    ? stepDurationMs - remaining
    : consumedMs;
  const elapsedSec = finished
    ? totalSec
    : Math.min(totalSec, doneSec + Math.floor(currentConsumedMs / 1000));
  const progressPct = totalSec > 0 ? Math.min(100, (elapsedSec / totalSec) * 100) : 0;

  return (
    <div className={styles.runner}>
      <p className={styles.routineName}>{routine.name}</p>

      <div
        className={styles.stepCard}
        aria-live="polite"
      >
        {finished ? (
          <>
            <span className={styles.stepLabel}>¡Sesión completada!</span>
            <span className={styles.display}>{formatClock(0)}</span>
          </>
        ) : (
          <>
            <span className={styles.stepLabel}>
              {current?.label ?? '—'}
              {current?.intensity && (
                <span className={styles.rpe}> · {current.intensity}</span>
              )}
            </span>
            <span
              className={`${styles.display} ${remaining === 0 && running ? styles.displayDone : ''}`}
              aria-label="Tiempo restante del paso"
            >
              {formatClock(remaining)}
            </span>
          </>
        )}
      </div>

      {!finished && (
        <p className={styles.nextStep}>
          {next ? (
            <>
              Siguiente: <strong>{next.label}</strong> · {formatMmSs(next.durationSec)}
            </>
          ) : (
            <>Último paso</>
          )}
        </p>
      )}

      <div className={styles.progressRow}>
        <span>
          Paso {Math.min(index + 1, steps.length)}/{steps.length}
        </span>
        <span>
          {formatMmSs(elapsedSec)} / {formatMmSs(totalSec)}
        </span>
      </div>
      <div className={styles.progressTrack} aria-hidden="true">
        <span className={styles.progressFill} style={{ width: `${progressPct}%` }} />
      </div>

      <div className={styles.controls}>
        {!running ? (
          <button type="button" className={styles.primary} onClick={start} disabled={finished}>
            {started && !finished ? 'Reanudar' : 'Iniciar'}
          </button>
        ) : (
          <button type="button" className={styles.primary} onClick={pause}>
            Pausa
          </button>
        )}
        <button
          type="button"
          className={styles.ghost}
          onClick={stop}
          disabled={!started}
        >
          Detener
        </button>
      </div>
    </div>
  );
}
