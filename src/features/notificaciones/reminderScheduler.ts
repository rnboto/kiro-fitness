// Scheduler de recordatorios — funciones PURAS (design §9) + wiring de permisos
// y timers (FEAT-005). Las funciones puras no dependen de React ni de storage.

import type { ReminderSettings } from '../../storage';
import {
  nextMonthlyWeighIn,
  nextWeeklyWeighIn,
  readWeighInReminders,
} from '../../domain/weighInReminders';

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

// ---------------------------------------------------------------------------
// Wiring de permisos y scheduling (design §9). Sin cron de background fiable en
// PWA: Notifications API para el permiso/mostrar avisos y setTimeout recalculado
// por disparo mientras la pestaña está viva. Degrada a banners in-app si se
// deniega el permiso (la UI muestra siempre la lista de "próximos" calculada).
// ---------------------------------------------------------------------------

/** Estado del permiso de notificaciones del sistema. */
export type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/** Lee el estado actual del permiso de notificaciones. */
export function getPermissionState(): PermissionState {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as PermissionState;
}

/**
 * Solicita permiso de notificaciones (design §9). Si no hay soporte o el usuario
 * deniega, se degrada a banners in-app (la pantalla sigue mostrando la lista de
 * próximos recordatorios calculada).
 */
export async function requestPermission(): Promise<PermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result as PermissionState;
  } catch {
    return 'denied';
  }
}

/**
 * Muestra una notificación del sistema si hay permiso; si no, invoca el fallback
 * in-app (banner). Nunca lanza.
 */
export function notify(
  title: string,
  body: string,
  onInApp?: (title: string, body: string) => void,
  options?: { onClick?: () => void },
): void {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      const n = new Notification(title, { body });
      if (options?.onClick) {
        const onClick = options.onClick;
        n.onclick = () => {
          try {
            window.focus();
          } catch {
            // sin foco disponible: seguimos navegando igualmente
          }
          onClick();
          n.close();
        };
      }
      return;
    } catch {
      // cae al fallback in-app
    }
  }
  onInApp?.(title, body);
}

/** Milisegundos desde `now` hasta la próxima aparición diaria de 'HH:mm'. */
export function msUntilNextDaily(now: Date, hhmm: string): number {
  const target = new Date(now);
  const [h, m] = hhmm.split(':').map((n) => Number(n));
  target.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

/** Clamp defensivo de delays de setTimeout (evita valores inválidos/enormes). */
function safeDelay(ms: number): number {
  // Máximo seguro de setTimeout (~24.8 días) y mínimo 0.
  return Math.min(Math.max(0, ms), 2_147_483_647);
}

/** Handle de un conjunto de timers activos (para poder cancelarlos). */
export interface SchedulerHandle {
  cancel: () => void;
}

interface ScheduleDeps {
  /** Fallback in-app cuando no hay permiso del sistema. */
  onInApp?: (title: string, body: string) => void;
  /** Inyectable en tests; por defecto Date.now vía new Date(). */
  now?: () => Date;
}

/**
 * Programa los timers activos a partir de `reminders` (design §9). Devuelve un
 * handle con `cancel()` para limpiarlos (p.ej. al reprogramar o desmontar).
 *
 * - Peso: diario a `weightLog.time`; al disparar, avisa y reprograma +24h.
 * - Hidratación: setTimeout recalculado por disparo usando `nextHydrationFire`
 *   (ventana semiabierta alineada a startTime).
 * - Bioimpedancia: no se programa aquí (es un aviso de calendario basado en la
 *   última medición); la UI lo muestra en la lista de próximos.
 */
export function scheduleReminders(
  reminders: ReminderSettings,
  deps: ScheduleDeps = {},
): SchedulerHandle {
  const now = deps.now ?? (() => new Date());
  const timers: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;

  const arm = (ms: number, fn: () => void) => {
    if (cancelled) return;
    timers.push(setTimeout(fn, safeDelay(ms)));
  };

  // Recordatorio de peso: diario, reprograma +24h al disparar.
  if (reminders.weightLog.enabled) {
    const scheduleWeight = () => {
      const delay = msUntilNextDaily(now(), reminders.weightLog.time);
      arm(delay, () => {
        notify('Registra tu peso', 'Es momento de anotar tu peso de hoy.', deps.onInApp);
        scheduleWeight();
      });
    };
    scheduleWeight();
  }

  // Hidratación: setTimeout recalculado por disparo (no setInterval fijo).
  if (reminders.hydration.enabled) {
    const scheduleHydration = () => {
      const current = now();
      const next = nextHydrationFire(
        current,
        reminders.hydration.startTime,
        reminders.hydration.endTime,
        reminders.hydration.intervalMinutes,
      );
      arm(next.getTime() - current.getTime(), () => {
        notify('Hidrátate', 'Bebe agua para mantener tu rendimiento.', deps.onInApp);
        scheduleHydration();
      });
    };
    scheduleHydration();
  }

  return {
    cancel: () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
      timers.length = 0;
    },
  };
}

// ---------------------------------------------------------------------------
// Pesajes semanal y mensual. Scheduler propio (montado globalmente en App) para
// que funcione con cualquier pestaña abierta. Mismo patrón: timers por marca de
// tiempo, Notifications API si hay permiso y fallback in-app si no.
// ---------------------------------------------------------------------------

/** Máximo delay de setTimeout (~24.8 días). */
const MAX_TIMEOUT_MS = 2_147_483_647;

export const WEEKLY_WEIGHIN_TITLE = 'Pesaje semanal';
export const MONTHLY_WEIGHIN_TITLE = 'Pesaje mensual';
export const WEEKLY_WEIGHIN_BODY = 'Hoy toca pesarte (pesaje semanal). Hazlo en ayunas.';
export const MONTHLY_WEIGHIN_BODY = 'Pesaje mensual: registra tu peso y tus medidas.';

export interface WeighInScheduleDeps {
  /** Fallback in-app cuando no hay permiso del sistema. */
  onInApp?: (title: string, body: string) => void;
  /** Click en la notificación del sistema (ir a Estadísticas › Cuerpo). */
  onClick?: () => void;
  /** Inyectable en tests; por defecto new Date(). */
  now?: () => Date;
}

/**
 * Programa los pesajes semanal/mensual activos. Las esperas largas (> 24.8
 * días, posible en el mensual) se trocean y se re-arman sin disparar antes de
 * tiempo. Tras cada disparo se calcula la siguiente ocurrencia a partir de
 * (marca disparada + 1 min) para no volver a disparar la misma.
 */
export function scheduleWeighInReminders(
  reminders: Partial<ReminderSettings> | null | undefined,
  deps: WeighInScheduleDeps = {},
): SchedulerHandle {
  const now = deps.now ?? (() => new Date());
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let cancelled = false;
  const { weekly, monthly } = readWeighInReminders(reminders);

  const startLoop = (next: (from: Date) => Date, title: string, body: string) => {
    const armAt = (target: Date) => {
      if (cancelled) return;
      const delay = target.getTime() - now().getTime();
      if (delay > MAX_TIMEOUT_MS) {
        const t = setTimeout(() => {
          timers.delete(t);
          armAt(target);
        }, MAX_TIMEOUT_MS);
        timers.add(t);
        return;
      }
      const t = setTimeout(() => {
        timers.delete(t);
        if (cancelled) return;
        notify(title, body, deps.onInApp, { onClick: deps.onClick });
        armAt(next(new Date(target.getTime() + 60_000)));
      }, Math.max(0, delay));
      timers.add(t);
    };
    armAt(next(now()));
  };

  if (weekly.enabled) {
    startLoop(
      (from) => nextWeeklyWeighIn(from, weekly.weekday, weekly.time),
      WEEKLY_WEIGHIN_TITLE,
      WEEKLY_WEIGHIN_BODY,
    );
  }
  if (monthly.enabled) {
    startLoop(
      (from) => nextMonthlyWeighIn(from, monthly.dayOfMonth, monthly.time),
      MONTHLY_WEIGHIN_TITLE,
      MONTHLY_WEIGHIN_BODY,
    );
  }

  return {
    cancel: () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
      timers.clear();
    },
  };
}
