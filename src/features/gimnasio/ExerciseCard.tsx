// Tarjeta de un ejercicio (design §8.2, §8.3, §8.4, §8.5).
// Muestra imagen de inicio (0.jpg) y fin (1.jpg) resueltas con
// resolveImageUrl(exercise, settings.exerciseOverrides); ante error de carga
// (onError) sustituye por un placeholder SVG limpio (silueta neutra + nombre).
// Incluye TempoIndicator, RestTimer y un SetLogger por serie.

import { useId, useState } from 'react';
import { resolveImageUrl, type Exercise } from '../../domain/routine';
import type { DayId, ExerciseSwapScope } from '../../storage';
import TempoIndicator from './TempoIndicator';
import RestTimer from './RestTimer';
import SetLogger from './SetLogger';
import styles from './ExerciseCard.module.css';

interface ExerciseCardProps {
  exercise: Exercise;
  dayId: DayId;
  overrides?: { imageUrl?: string; endImageUrl?: string };
  settingsRestSeconds: number;
  /** Ejercicio original de la rutina; solo presente si el hueco está sustituido. */
  original?: Exercise;
  /** Alcance de la sustitución; solo presente si el hueco está sustituido. */
  swapScope?: ExerciseSwapScope;
  /** Abre la hoja "Cambiar ejercicio". */
  onChangeExercise?: () => void;
  /** Quita la sustitución y vuelve al original. */
  onRestore?: () => void;
}

/**
 * Placeholder SVG limpio: silueta neutra + nombre del ejercicio. Con `compact`
 * (miniaturas) solo muestra la silueta y aplica `className` extra.
 */
export function Placeholder({
  name,
  phase,
  compact = false,
  className,
}: {
  name: string;
  phase: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${styles.placeholder}${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={`${name} (${phase})`}
    >
      <svg viewBox="0 0 80 80" className={styles.placeholderSvg} aria-hidden="true">
        <circle cx="40" cy="24" r="11" />
        <rect x="26" y="38" width="28" height="30" rx="8" />
        <rect x="16" y="40" width="10" height="24" rx="5" />
        <rect x="54" y="40" width="10" height="24" rx="5" />
      </svg>
      {!compact && (
        <>
          <span className={styles.placeholderName}>{name}</span>
          <span className={styles.placeholderPhase}>{phase}</span>
        </>
      )}
    </div>
  );
}

function Figure({
  src,
  name,
  phase,
}: {
  src: string;
  name: string;
  phase: string;
}) {
  const [failed, setFailed] = useState(false);
  // Un src vacío o solo con espacios se trata como fallo: mostramos el
  // placeholder en lugar de un <img> roto.
  const blank = src.trim() === '';
  return (
    <figure className={styles.figure}>
      {failed || blank ? (
        <Placeholder name={name} phase={phase} />
      ) : (
        <img
          className={styles.image}
          src={src}
          alt={`${name} — ${phase}`}
          width={320}
          height={320}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      <figcaption className={styles.phaseCaption}>{phase}</figcaption>
    </figure>
  );
}

export default function ExerciseCard({
  exercise,
  dayId,
  overrides,
  settingsRestSeconds,
  original,
  swapScope,
  onChangeExercise,
  onRestore,
}: ExerciseCardProps) {
  const { imageUrl, endImageUrl } = resolveImageUrl(exercise, overrides);
  const setIndexes = Array.from({ length: exercise.sets }, (_, i) => i + 1);
  const headingId = useId();

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <header className={styles.header}>
        <h3 id={headingId} className={styles.name}>
          {exercise.name}
        </h3>
        <span className={styles.scheme}>
          {exercise.sets}×{exercise.repsRange}
        </span>
      </header>

      {original && (
        <div className={styles.swapInfo}>
          <span className={styles.swapBadge}>Sustituido</span>
          {swapScope && (
            <span className={styles.scopeChip}>{swapScope === 'fijo' ? 'Fijo' : 'Solo hoy'}</span>
          )}
          <p className={styles.originalName}>Original: {original.name}</p>
        </div>
      )}

      {(onChangeExercise || (original && onRestore)) && (
        <div className={styles.swapActions}>
          {onChangeExercise && (
            <button
              type="button"
              className={styles.swapBtn}
              aria-label={`Cambiar ejercicio: ${exercise.name}`}
              onClick={onChangeExercise}
            >
              <span aria-hidden="true">⇄</span> Cambiar ejercicio
            </button>
          )}
          {original && onRestore && (
            <button
              type="button"
              className={styles.restoreBtn}
              aria-label={`Restaurar original: ${original.name}`}
              onClick={onRestore}
            >
              Restaurar original
            </button>
          )}
        </div>
      )}

      <div className={styles.images}>
        <Figure key={`i-${imageUrl}`} src={imageUrl} name={exercise.name} phase="Inicio" />
        <Figure key={`f-${endImageUrl}`} src={endImageUrl} name={exercise.name} phase="Final" />
      </div>

      <TempoIndicator />

      <RestTimer
        exerciseRestSeconds={exercise.restSeconds}
        settingsRestSeconds={settingsRestSeconds}
      />

      <div className={styles.sets}>
        {setIndexes.map((idx) => (
          <SetLogger
            key={`${exercise.id}-${idx}`}
            dayId={dayId}
            exerciseId={exercise.id}
            setIndex={idx}
          />
        ))}
      </div>
    </article>
  );
}
