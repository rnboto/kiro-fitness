// Lógica PURA del cronómetro/temporizador (feature B). Sin React ni DOM.
// Corrección por timestamp (Date.now()): el tiempo mostrado se deriva de la
// diferencia entre dos marcas de tiempo, NUNCA de acumular ticks de setInterval,
// para que no derive si la pestaña se ralentiza o se pausa (design §8.4, key_patterns).

/** Milisegundos por unidad. */
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/**
 * Milisegundos transcurridos de un cronómetro con corrección por timestamp.
 *
 * @param startEpochMs  Date.now() guardado al (re)arrancar la cuenta.
 * @param accumulatedMs Tiempo acumulado de tramos previos (pausas). Default 0.
 * @param running       true si corre ahora mismo (suma now - start).
 * @param nowMs         Marca actual; default Date.now().
 */
export function elapsedMs(
  startEpochMs: number,
  accumulatedMs = 0,
  running = true,
  nowMs: number = Date.now(),
): number {
  const live = running ? Math.max(0, nowMs - startEpochMs) : 0;
  return Math.max(0, accumulatedMs + live);
}

/**
 * Milisegundos restantes de una cuenta atrás con corrección por timestamp.
 * Nunca devuelve negativo; en el borde llega exactamente a 0.
 *
 * @param durationMs    Duración total configurada.
 * @param startEpochMs  Date.now() al (re)arrancar.
 * @param accumulatedMs Tiempo ya consumido en tramos previos. Default 0.
 * @param running       true si corre ahora mismo.
 * @param nowMs         Marca actual; default Date.now().
 */
export function remainingMs(
  durationMs: number,
  startEpochMs: number,
  accumulatedMs = 0,
  running = true,
  nowMs: number = Date.now(),
): number {
  const consumed = elapsedMs(startEpochMs, accumulatedMs, running, nowMs);
  return Math.max(0, durationMs - consumed);
}

/** true cuando la cuenta atrás ha llegado (o pasado) a 0. */
export function isCountdownFinished(
  durationMs: number,
  startEpochMs: number,
  accumulatedMs = 0,
  running = true,
  nowMs: number = Date.now(),
): boolean {
  return remainingMs(durationMs, startEpochMs, accumulatedMs, running, nowMs) === 0;
}

/** Convierte minutos + segundos a milisegundos. */
export function toMs(minutes: number, seconds: number): number {
  return (minutes * SECONDS_PER_MINUTE + seconds) * MS_PER_SECOND;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Formatea milisegundos como mm:ss (o hh:mm:ss si llega a una hora).
 * Redondea hacia abajo al segundo entero.
 */
export function formatClock(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / MS_PER_SECOND);
  const hours = Math.floor(totalSeconds / (MINUTES_PER_HOUR * SECONDS_PER_MINUTE));
  const minutes = Math.floor((totalSeconds % (MINUTES_PER_HOUR * SECONDS_PER_MINUTE)) / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  if (hours > 0) {
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  }
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

/**
 * Formatea mostrando SIEMPRE centésimas (mm:ss.cc), útil para laps del cronómetro.
 */
export function formatClockCentis(ms: number): string {
  const safe = Math.max(0, ms);
  const centis = Math.floor((safe % MS_PER_SECOND) / 10);
  return `${formatClock(safe)}.${pad2(centis)}`;
}
