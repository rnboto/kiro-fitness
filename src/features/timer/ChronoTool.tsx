// Herramienta Cronómetro/Temporizador de doble modo (feature B). SEPARADA del
// RestTimer/SessionClock del gimnasio. Contiene el toggle entre ambos modos.

import { useState } from 'react';
import Stopwatch from './Stopwatch';
import Countdown from './Countdown';
import styles from './ChronoTool.module.css';

type Mode = 'cronometro' | 'temporizador';

export default function ChronoTool() {
  const [mode, setMode] = useState<Mode>('cronometro');

  return (
    <div className={styles.tool}>
      <div className={styles.toggle} role="tablist" aria-label="Modo de la herramienta">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'cronometro'}
          className={`${styles.tab} ${mode === 'cronometro' ? styles.active : ''}`}
          onClick={() => setMode('cronometro')}
        >
          Cronómetro
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'temporizador'}
          className={`${styles.tab} ${mode === 'temporizador' ? styles.active : ''}`}
          onClick={() => setMode('temporizador')}
        >
          Temporizador
        </button>
      </div>

      {mode === 'cronometro' ? <Stopwatch /> : <Countdown />}
    </div>
  );
}
