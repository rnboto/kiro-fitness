// Capa PURA de cardio (sin React ni storage): duración efectiva, ritmo y
// velocidad, con formateo mm:ss. Sigue el patrón pure/testable de src/domain/*
// (igual que nutrition.ts / routine.ts). Toda operación con distancia o
// duración <= 0 devuelve null / "—" (nunca NaN ni Infinity).

import type { CardioSession } from '../storage';

/**
 * Duración efectiva en segundos de una sesión. Prefiere `durationSec` cuando
 * está presente; si no (datos antiguos solo con `durationMin`), la deriva de
 * los minutos: `round(durationMin * 60)`.
 */
export function sessionDurationSec(
  s: Pick<CardioSession, 'durationSec' | 'durationMin'>,
): number {
  return s.durationSec ?? Math.round(s.durationMin * 60);
}

/**
 * Ritmo en segundos por km (correr). Guarda contra distancia <= 0 devolviendo
 * null para evitar NaN/Infinity.
 */
export function paceSecPerKm(durationSec: number, distanceKm: number): number | null {
  if (distanceKm <= 0) return null;
  return durationSec / distanceKm;
}

/**
 * Velocidad en km/h (bici). Guarda contra duración <= 0 devolviendo null para
 * evitar NaN/Infinity.
 */
export function speedKmH(durationSec: number, distanceKm: number): number | null {
  if (durationSec <= 0) return null;
  return distanceKm / (durationSec / 3600);
}

/**
 * Formatea un total de segundos a `mm:ss` con segundos a 2 dígitos (p.ej.
 * 1710 → "28:30"). Admite más de 59:59 (los minutos no se truncan). Valores
 * negativos o no finitos se tratan como 0.
 */
export function formatMmSs(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 0) totalSec = 0;
  const whole = Math.round(totalSec);
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Formatea un ritmo (seg/km) a "mm:ss min/km"; null ⇒ "—". */
export function formatPace(secPerKm: number | null): string {
  if (secPerKm == null) return '—';
  return `${formatMmSs(Math.round(secPerKm))} min/km`;
}

/** Formatea una velocidad (km/h) a "X.X km/h"; null ⇒ "—". */
export function formatSpeed(kmh: number | null): string {
  if (kmh == null) return '—';
  return `${kmh.toFixed(1)} km/h`;
}
