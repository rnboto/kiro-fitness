// Guía "Rutinas de cardio sugeridas": nota introductoria del método + fórmula
// de FC máxima, y las 6 tarjetas (3 cinta, 3 bici) con pasos y botón "Iniciar"
// que abre el runner guiado en un Modal. Datos puros de domain/cardioRoutines.

import { useState } from 'react';
import Modal from '../../components/Modal';
import { formatMmSs } from '../../domain/cardio';
import {
  CARDIO_ROUTINES,
  type CardioMachine,
  type CardioRoutine,
  type RoutineElement,
} from '../../domain/cardioRoutines';
import CardioRoutineRunner from './CardioRoutineRunner';
import styles from './CardioRoutinesGuide.module.css';

const MACHINE_LABEL: Record<CardioMachine, string> = {
  cinta: '🏃 Cinta',
  bici: '🚴 Bici',
};

/** Describe un elemento de forma legible (los bloques de rondas en una línea). */
function describeElement(el: RoutineElement): { text: string; intensity?: string } {
  if (el.kind === 'step') {
    return { text: `${el.step.label} · ${formatMmSs(el.step.durationSec)}`, intensity: el.step.intensity };
  }
  const { rounds, work, rest } = el.round;
  return {
    text: `${rounds}× ${work.label} ${formatMmSs(work.durationSec)} / ${rest.label} ${formatMmSs(rest.durationSec)}`,
    intensity: work.intensity,
  };
}

function RoutineCard({ routine, onStart }: { routine: CardioRoutine; onStart: () => void }) {
  return (
    <article className={styles.card}>
      <header className={styles.cardHead}>
        <h3 className={styles.cardName}>{routine.name}</h3>
        <div className={styles.badges}>
          <span className={styles.badge}>{MACHINE_LABEL[routine.machine]}</span>
          <span className={styles.badgeMin}>{routine.totalMinutes} min</span>
        </div>
      </header>

      <p className={styles.cardDesc}>{routine.description}</p>

      <ul className={styles.steps}>
        {routine.elements.map((el, i) => {
          const { text, intensity } = describeElement(el);
          return (
            <li key={i} className={styles.step}>
              <span>{text}</span>
              {intensity && <span className={styles.rpe}>{intensity}</span>}
            </li>
          );
        })}
      </ul>

      <button type="button" className={styles.startBtn} onClick={onStart}>
        ▶ Iniciar
      </button>
    </article>
  );
}

export default function CardioRoutinesGuide() {
  const [active, setActive] = useState<CardioRoutine | null>(null);

  const cinta = CARDIO_ROUTINES.filter((r) => r.machine === 'cinta');
  const bici = CARDIO_ROUTINES.filter((r) => r.machine === 'bici');

  return (
    <div className={styles.guide}>
      <section className={styles.intro}>
        <p className={styles.introText}>
          <strong>Zona 2</strong> (~60-70% de la frecuencia cardíaca máxima, RPE 6 y aún puedes
          hablar) usa la grasa como combustible principal. El <strong>HIIT</strong> alterna
          esfuerzos duros (RPE 8-9) con recuperación y mantiene el gasto elevado un rato tras la
          sesión. Alternar cinta y bici reparte el impacto en las articulaciones.
        </p>
        <p className={styles.formula}>
          FC máxima aproximada = 220 − tu edad; Zona 2 ~ 60-70% de ese valor.
        </p>
      </section>

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>🏃 Cinta (correr)</h2>
        <div className={styles.cards}>
          {cinta.map((r) => (
            <RoutineCard key={r.id} routine={r} onStart={() => setActive(r)} />
          ))}
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>🚴 Bici (bici fija)</h2>
        <div className={styles.cards}>
          {bici.map((r) => (
            <RoutineCard key={r.id} routine={r} onStart={() => setActive(r)} />
          ))}
        </div>
      </section>

      <Modal
        open={active !== null}
        title={active ? active.name : 'Rutina'}
        onClose={() => setActive(null)}
      >
        {active && <CardioRoutineRunner routine={active} />}
      </Modal>
    </div>
  );
}
