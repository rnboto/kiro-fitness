// Sub-vista "Abdominales / Core" del Gimnasio: tarjeta del Circuito Core (~30 min)
// con intro, badge de minutos (DERIVADO de la suma de pasos), estructura del
// circuito, lista de los 7 ejercicios con miniatura de free-exercise-db
// (placeholder SVG ante error, igual que ExerciseCard) y botón "Iniciar" que
// abre el runner guiado genérico en un Modal. Separada de musculación y cardio.

import { useState } from 'react';
import Modal from '../../components/Modal';
import { formatMmSs } from '../../domain/cardio';
import {
  ABS_CIRCUIT,
  ABS_EXERCISES,
  expandRoutineSteps,
  routineTotalSec,
} from '../../domain/absCircuit';
import { defaultImageUrl } from '../../domain/routine';
import GuidedStepRunner from './GuidedStepRunner';
import styles from './AbsView.module.css';

/** Placeholder SVG limpio (silueta neutra + nombre), espejo de ExerciseCard. */
function Placeholder({ name }: { name: string }) {
  return (
    <div className={styles.placeholder} role="img" aria-label={name}>
      <svg viewBox="0 0 80 80" className={styles.placeholderSvg} aria-hidden="true">
        <circle cx="40" cy="24" r="11" />
        <rect x="26" y="38" width="28" height="30" rx="8" />
        <rect x="16" y="40" width="10" height="24" rx="5" />
        <rect x="54" y="40" width="10" height="24" rx="5" />
      </svg>
    </div>
  );
}

/** Miniatura del ejercicio: imagen 0.jpg con fallback a placeholder ante error. */
function Thumb({ id, name }: { id: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Placeholder name={name} />;
  return (
    <img
      className={styles.thumb}
      src={defaultImageUrl(id)}
      alt={name}
      width={64}
      height={64}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function AbsView() {
  const [open, setOpen] = useState(false);
  const steps = expandRoutineSteps(ABS_CIRCUIT);
  const totalSec = routineTotalSec(ABS_CIRCUIT);

  return (
    <div className={styles.view}>
      <article className={styles.card}>
        <header className={styles.cardHead}>
          <h2 className={styles.cardName}>{ABS_CIRCUIT.name}</h2>
          <span className={styles.badgeMin}>{ABS_CIRCUIT.totalMinutes} min</span>
        </header>

        <p className={styles.cardDesc}>{ABS_CIRCUIT.description}</p>

        <ul className={styles.structure}>
          <li className={styles.structureStep}>
            <span>Calentamiento — movilidad de tronco</span>
            <span className={styles.dur}>{formatMmSs(180)}</span>
          </li>
          <li className={styles.structureStep}>
            <span>3 rondas × 7 ejercicios (40 s trabajo / 20 s descanso, 60 s entre rondas)</span>
          </li>
          <li className={styles.structureStep}>
            <span>Enfriamiento — estiramiento abdominal</span>
            <span className={styles.dur}>{formatMmSs(180)}</span>
          </li>
        </ul>

        <ol className={styles.exercises}>
          {ABS_EXERCISES.map((ex) => (
            <li key={ex.freeExerciseDbId} className={styles.exercise}>
              <Thumb id={ex.freeExerciseDbId} name={ex.label} />
              <span className={styles.exName}>{ex.label}</span>
              <span className={styles.rpe}>40s</span>
            </li>
          ))}
        </ol>

        <button type="button" className={styles.startBtn} onClick={() => setOpen(true)}>
          ▶ Iniciar
        </button>
      </article>

      <Modal open={open} title={ABS_CIRCUIT.name} onClose={() => setOpen(false)}>
        <GuidedStepRunner title={ABS_CIRCUIT.name} steps={steps} totalSec={totalSec} />
      </Modal>
    </div>
  );
}
