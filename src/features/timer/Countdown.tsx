// Modo 2 'Temporizador': cuenta HACIA ABAJO configurable en minutos/segundos.
// Al llegar a 0: alerta visual + sonido + vibración. Corrección por timestamp.

import { useCallback, useEffect, useRef, useState } from 'react';
import NumberStepper from '../../components/NumberStepper';
import { beep, vibrate } from './alerts';
import { formatClock, remainingMs, toMs } from './timerMath';
import { useRafTick } from './useRafTick';
import styles from './Countdown.module.css';

export default function Countdown() {
  const [minutes, setMinutes] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [consumedMs, setConsumedMs] = useState(0);
  const [finished, setFinished] = useState(false);

  const startRef = useRef(0);
  const durationMs = toMs(minutes, seconds);

  useRafTick(running, 50);

  const remaining = running
    ? remainingMs(durationMs, startRef.current, consumedMs, true)
    : Math.max(0, durationMs - consumedMs);

  // Dispara la alerta exactamente una vez al cruzar 0.
  useEffect(() => {
    if (running && remaining === 0) {
      setRunning(false);
      setConsumedMs(durationMs);
      setFinished(true);
      beep();
      vibrate();
    }
  }, [running, remaining, durationMs]);

  const start = useCallback(() => {
    if (durationMs <= 0) return;
    setFinished(false);
    startRef.current = Date.now();
    setRunning(true);
  }, [durationMs]);

  const pause = useCallback(() => {
    setConsumedMs(durationMs - remainingMs(durationMs, startRef.current, consumedMs, true));
    setRunning(false);
  }, [durationMs, consumedMs]);

  const reset = useCallback(() => {
    setRunning(false);
    setConsumedMs(0);
    setFinished(false);
  }, []);

  const started = consumedMs > 0 || running;

  return (
    <div className={styles.countdown}>
      {!started && !finished && (
        <div className={styles.config}>
          <NumberStepper
            label="Minutos"
            value={minutes}
            onChange={setMinutes}
            min={0}
            max={180}
            unit="min"
            id="cd-min"
          />
          <NumberStepper
            label="Segundos"
            value={seconds}
            onChange={setSeconds}
            min={0}
            max={59}
            unit="s"
            id="cd-sec"
          />
        </div>
      )}

      <div
        className={`${styles.display} ${finished ? styles.displayDone : ''}`}
        aria-live="polite"
        aria-label="Tiempo restante"
      >
        {finished ? '00:00' : formatClock(remaining)}
      </div>

      {finished && <p className={styles.alert}>¡Tiempo cumplido!</p>}

      <div className={styles.controls}>
        {!running ? (
          <button
            type="button"
            className={styles.primary}
            onClick={start}
            disabled={durationMs <= 0 && !started}
          >
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
          onClick={reset}
          disabled={!started && !finished}
        >
          Reiniciar
        </button>
      </div>
    </div>
  );
}
