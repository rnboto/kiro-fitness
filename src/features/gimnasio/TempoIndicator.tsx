// Indicador de ritmo visual (TUT, design §8.3). Círculo que crece durante la fase
// excéntrica (2 s, "Baja…") y se contrae en la concéntrica (1 s, "¡Sube!").
// Animado vía requestAnimationFrame con corrección por timestamp; pausa/reanuda.

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './TempoIndicator.module.css';

const ECCENTRIC_MS = 2000; // bajada controlada (el círculo crece)
const CONCENTRIC_MS = 1000; // subida explosiva (el círculo se contrae)
const CYCLE_MS = ECCENTRIC_MS + CONCENTRIC_MS;

const MIN_SCALE = 0.5;
const MAX_SCALE = 1;

type Phase = 'eccentric' | 'concentric';

interface PhaseState {
  phase: Phase;
  scale: number;
}

/** Deriva fase y escala a partir del tiempo transcurrido dentro del ciclo. */
function phaseFor(cycleMs: number): PhaseState {
  const t = ((cycleMs % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
  if (t < ECCENTRIC_MS) {
    const p = t / ECCENTRIC_MS; // 0 → 1
    return { phase: 'eccentric', scale: MIN_SCALE + (MAX_SCALE - MIN_SCALE) * p };
  }
  const p = (t - ECCENTRIC_MS) / CONCENTRIC_MS; // 0 → 1
  return { phase: 'concentric', scale: MAX_SCALE - (MAX_SCALE - MIN_SCALE) * p };
}

export default function TempoIndicator() {
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<PhaseState>({ phase: 'eccentric', scale: MIN_SCALE });

  // Corrección por timestamp: guardamos el inicio y el tiempo ya consumido en pausas.
  const startRef = useRef(0);
  const consumedRef = useRef(0);
  const rafRef = useRef(0);

  const tick = useCallback(() => {
    const cycleMs = consumedRef.current + (Date.now() - startRef.current);
    setState(phaseFor(cycleMs));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, tick]);

  const toggle = useCallback(() => {
    setRunning((prev) => {
      if (prev) {
        // Pausar: acumula el tiempo recorrido en este tramo.
        consumedRef.current += Date.now() - startRef.current;
      }
      return !prev;
    });
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    consumedRef.current = 0;
    setState({ phase: 'eccentric', scale: MIN_SCALE });
  }, []);

  const label = state.phase === 'eccentric' ? 'Baja…' : '¡Sube!';

  return (
    <div className={styles.tempo}>
      <div className={styles.ring} aria-hidden="true">
        <div
          className={`${styles.circle} ${
            state.phase === 'eccentric' ? styles.eccentric : styles.concentric
          }`}
          style={{ transform: `scale(${state.scale.toFixed(3)})` }}
        />
      </div>
      <div className={styles.meta}>
        <span
          className={`${styles.phase} ${
            state.phase === 'eccentric' ? styles.phaseEcc : styles.phaseCon
          }`}
          aria-live="polite"
        >
          {running ? label : 'Ritmo 2–1'}
        </span>
        <div className={styles.controls}>
          <button type="button" className={styles.btn} onClick={toggle}>
            {running ? 'Pausa' : 'Marcar ritmo'}
          </button>
          <button type="button" className={styles.btnGhost} onClick={reset}>
            Reiniciar
          </button>
        </div>
      </div>
    </div>
  );
}
