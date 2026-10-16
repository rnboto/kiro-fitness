// Tarjeta de un ejercicio (design §8.2, §8.3, §8.4, §8.5).
// Muestra imagen de inicio (0.jpg) y fin (1.jpg) resueltas con
// resolveImageUrl(exercise, settings.exerciseOverrides); ante error de carga
// (onError) sustituye por un placeholder SVG limpio (silueta neutra + nombre).
// Incluye TempoIndicator, RestTimer y un SetLogger por serie.

import { useState } from 'react';
import { resolveImageUrl, type Exercise } from '../../domain/routine';
import type { DayId } from '../../storage';
import TempoIndicator from './TempoIndicator';
import RestTimer from './RestTimer';
import SetLogger from './SetLogger';
import styles from './ExerciseCard.module.css';

interface ExerciseCardProps {
  exercise: Exercise;
  dayId: DayId;
  overrides?: { imageUrl?: string; endImageUrl?: string };
  settingsRestSeconds: number;
}

/** Placeholder SVG limpio: silueta neutra + nombre del ejercicio. */
function Placeholder({ name, phase }: { name: string; phase: string }) {
  return (
    <div className={styles.placeholder} role="img" aria-label={`${name} (${phase})`}>
      <svg viewBox="0 0 80 80" className={styles.placeholderSvg} aria-hidden="true">
        <circle cx="40" cy="24" r="11" />
        <rect x="26" y="38" width="28" height="30" rx="8" />
        <rect x="16" y="40" width="10" height="24" rx="5" />
        <rect x="54" y="40" width="10" height="24" rx="5" />
      </svg>
      <span className={styles.placeholderName}>{name}</span>
      <span className={styles.placeholderPhase}>{phase}</span>
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
  return (
    <figure className={styles.figure}>
      {failed ? (
        <Placeholder name={name} phase={phase} />
      ) : (
        <img
          className={styles.image}
          src={src}
          alt={`${name} — ${phase}`}
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
}: ExerciseCardProps) {
  const { imageUrl, endImageUrl } = resolveImageUrl(exercise, overrides);
  const setIndexes = Array.from({ length: exercise.sets }, (_, i) => i + 1);

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <h3 className={styles.name}>{exercise.name}</h3>
        <span className={styles.scheme}>
          {exercise.sets}×{exercise.repsRange}
        </span>
      </header>

      <div className={styles.images}>
        <Figure src={imageUrl} name={exercise.name} phase="Inicio" />
        <Figure src={endImageUrl} name={exercise.name} phase="Final" />
      </div>

      <TempoIndicator />

      <RestTimer
        exerciseRestSeconds={exercise.restSeconds}
        settingsRestSeconds={settingsRestSeconds}
      />

      <div className={styles.sets}>
        {setIndexes.map((idx) => (
          <SetLogger
            key={idx}
            dayId={dayId}
            exerciseId={exercise.id}
            setIndex={idx}
          />
        ))}
      </div>
    </article>
  );
}
