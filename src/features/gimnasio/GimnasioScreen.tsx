// Pantalla Gimnasio (design §8). Selector de día (torsoA/piernaA/torsoB/piernaB),
// MuscleHeatMap del día, SessionClock, lista de ExerciseCard y acceso a la
// herramienta Cronómetro/Temporizador (feature B) embebida en un Modal.
// El RestTimer/SessionClock y la herramienta Cronómetro/Temporizador son SEPARADOS.

import { useMemo, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { routine, type DayId } from '../../domain/routine';
import Modal from '../../components/Modal';
import ChronoTool from '../timer/ChronoTool';
import MuscleHeatMap from './MuscleHeatMap';
import SessionClock from './SessionClock';
import ExerciseCard from './ExerciseCard';
import styles from './GimnasioScreen.module.css';

export default function GimnasioScreen() {
  const { settings } = useSettings();
  const [dayId, setDayId] = useState<DayId>('torsoA');
  const [chronoOpen, setChronoOpen] = useState(false);

  const day = useMemo(() => routine.find((d) => d.id === dayId) ?? routine[0], [dayId]);
  const restSeconds = settings?.restSeconds ?? 60;
  const overrides = settings?.exerciseOverrides ?? {};

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Gimnasio</h1>
        <p className={styles.subtitle}>
          Torso/Pierna · 4 días · pensado para caber en 60 minutos.
        </p>
      </header>

      <nav className={styles.days} aria-label="Día de entrenamiento">
        {routine.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`${styles.dayBtn} ${d.id === dayId ? styles.dayActive : ''}`}
            aria-pressed={d.id === dayId}
            onClick={() => setDayId(d.id)}
          >
            {d.name}
          </button>
        ))}
      </nav>

      <MuscleHeatMap activeMuscles={day.muscles} />

      <SessionClock />

      <button
        type="button"
        className={styles.chronoBtn}
        onClick={() => setChronoOpen(true)}
      >
        ⏱ Cronómetro / Temporizador
      </button>

      <div className={styles.exercises}>
        {day.exercises.map((ex) => (
          <ExerciseCard
            key={`${day.id}-${ex.id}`}
            exercise={ex}
            dayId={day.id}
            overrides={overrides[ex.id]}
            settingsRestSeconds={restSeconds}
          />
        ))}
      </div>

      <Modal
        open={chronoOpen}
        title="Cronómetro / Temporizador"
        onClose={() => setChronoOpen(false)}
      >
        <ChronoTool />
      </Modal>
    </div>
  );
}
