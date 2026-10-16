// Scheduler de recordatorios — funciones PURAS testeables (design §9).
// El wiring de permisos/setTimeout va en FEAT-005; aquí solo las funciones puras.

/** Parsea 'HH:mm' a minutos desde medianoche. */
function parseTimeToMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Próximo disparo de hidratación (design §9).
 *
 * Calcula el menor múltiplo de `intervalMinutes` a partir de `startTime` que sea
 * estrictamente > `now`, dentro de la ventana SEMIABIERTA `[startTime, endTime)`.
 * Una marca que caiga justo en `endTime` NO dispara. Si `nextMark >= endTime` o
 * `now >= endTime`, devuelve el `startTime` del día siguiente.
 *
 * @param now Momento actual.
 * @param startTime 'HH:mm' inicio de la ventana.
 * @param endTime 'HH:mm' fin de la ventana (exclusivo).
 * @param intervalMinutes Intervalo entre avisos.
 * @returns Date del próximo disparo.
 */
export function nextHydrationFire(
  now: Date,
  startTime: string,
  endTime: string,
  intervalMinutes: number,
): Date {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);

  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  startToday.setMinutes(startMin);

  const endToday = new Date(now);
  endToday.setHours(0, 0, 0, 0);
  endToday.setMinutes(endMin);

  const nextDayStart = new Date(startToday);
  nextDayStart.setDate(nextDayStart.getDate() + 1);

  // Fuera de ventana por la hora actual → mañana.
  if (now.getTime() >= endToday.getTime()) {
    return nextDayStart;
  }

  // Minutos transcurridos desde startTime hasta now (puede ser negativo si now < start).
  const minutesSinceStart = (now.getTime() - startToday.getTime()) / 60000;

  let nextMark: Date;
  if (minutesSinceStart < 0) {
    // now anterior al inicio de la ventana → la primera marca es startTime.
    nextMark = startToday;
  } else {
    // Menor múltiplo del intervalo estrictamente > now.
    const steps = Math.floor(minutesSinceStart / intervalMinutes) + 1;
    nextMark = new Date(startToday.getTime() + steps * intervalMinutes * 60000);
  }

  // Ventana semiabierta: marca >= endTime no dispara → día siguiente.
  if (nextMark.getTime() >= endToday.getTime()) {
    return nextDayStart;
  }
  return nextMark;
}

/**
 * Fecha del próximo test de bioimpedancia (design §9).
 * = lastEntryDate + weeks × 7 días. Puede devolver una fecha ya pasada
 * (la UI la marca como "pendiente").
 */
export function nextBioimpedanceDate(lastEntryDate: Date, weeks: number): Date {
  const next = new Date(lastEntryDate);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}
