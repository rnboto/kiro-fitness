// Pantalla Gimnasio (design §8). Selector de día Superior/Inferior
// (Superior A/Inferior A/Superior B/Inferior B),
// MuscleHeatMap del día, SessionClock, lista de ExerciseCard y acceso a la
// herramienta Cronómetro/Temporizador (feature B) embebida en un Modal.
// El RestTimer/SessionClock y la herramienta Cronómetro/Temporizador son SEPARADOS.

import { useMemo, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import {
  routinesByPhase,
  type DayId,
  type RoutineWeekPhase,
} from '../../domain/routine';
import Modal from '../../components/Modal';
import SegmentedControl, {
  type SegmentOption,
} from '../estadisticas/SegmentedControl';
import ChronoTool from '../timer/ChronoTool';
import MuscleHeatMap from './MuscleHeatMap';
import SessionClock from './SessionClock';
import ExerciseCard from './ExerciseCard';
import CardioView from './CardioView';
import styles from './GimnasioScreen.module.css';

type GymMode = 'musculacion' | 'cardio';

const MODE_SEGMENTS: SegmentOption<GymMode>[] = [
  { id: 'musculacion', label: 'Musculación' },
  { id: 'cardio', label: 'Cardio' },
];

const PHASE_SEGMENTS: SegmentOption<RoutineWeekPhase>[] = [
  { id: 'semana1', label: 'Fase 1' },
  { id: 'semana2plus', label: 'Fase 2' },
];

export default function GimnasioScreen() {
  const { settings, updateSettings } = useSettings();
  const [mode, setMode] = useState<GymMode>('musculacion');
  const [dayId, setDayId] = useState<DayId>(routinesByPhase.semana1[0].id);
  const [chronoOpen, setChronoOpen] = useState(false);

  const phase = settings?.routineWeekPhase ?? 'semana1';
  const days = routinesByPhase[phase];
  // Clamp: si el dayId actual no existe en la fase activa, cae al primer día
  // para que un id obsoleto nunca produzca una vista vacía.
  const day = useMemo(
    () => days.find((d) => d.id === dayId) ?? days[0],
    [days, dayId],
  );
  const restSeconds = settings?.restSeconds ?? 60;
  const overrides = settings?.exerciseOverrides ?? {};

  const handlePhaseChange = (next: RoutineWeekPhase) => {
    if (settings) updateSettings({ ...settings, routineWeekPhase: next });
    setDayId(routinesByPhase[next][0].id);
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Gimnasio</h1>
        <p className={styles.subtitle}>
          División Superior/Inferior · 2 fases de 4 días · cada músculo
          ~2×/semana para quemar grasa y tonificar · ~60 min por sesión.
        </p>
      </header>

      <SegmentedControl
        options={MODE_SEGMENTS}
        value={mode}
        onChange={setMode}
        ariaLabel="Tipo de entrenamiento"
      />

      {mode === 'cardio' ? (
        <CardioView />
      ) : (
        <>
          <SegmentedControl
            options={PHASE_SEGMENTS}
            value={phase}
            onChange={handlePhaseChange}
            ariaLabel="Fase de la rutina"
          />

          <nav className={styles.days} aria-label="Día de entrenamiento">
        {days.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`${styles.dayBtn} ${d.id === dayId ? styles.dayActive : ''}`}
            aria-pressed={d.id === dayId}
            onClick={() => setDayId(d.id)}
          >
            {d.shortName ?? d.name}
          </button>
        ))}
      </nav>

      <h2 className={styles.dayTitle}>{day.name}</h2>

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
        </>
      )}
    </div>
  );
}
