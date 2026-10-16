// Hook que fuerza un re-render periódico mientras `active` sea true, para que los
// componentes de tiempo relean su estado derivado por timestamp (timerMath).
// NO acumula tiempo: solo dispara renders; el valor real se calcula con Date.now().

import { useEffect, useState } from 'react';

/**
 * @param active       si true, programa ticks continuos vía requestAnimationFrame.
 * @param intervalMs   mínimo entre ticks (default ~1 render cada 100ms).
 */
export function useRafTick(active: boolean, intervalMs = 100): void {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      if (now - last >= intervalMs) {
        last = now;
        setTick((t) => (t + 1) % 1_000_000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, intervalMs]);
}
