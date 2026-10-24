// Pantalla Gimnasio (design §8). Selector de día Superior/Inferior
// (Superior A/Inferior A/Superior B/Inferior B),
// MuscleHeatMap del día, SessionClock, lista de ExerciseCard y acceso a la
// herramienta Cronómetro/Temporizador (feature B) embebida en un Modal.
// El RestTimer/SessionClock y la herramienta Cronómetro/Temporizador son SEPARADOS.
// Lista de Sustitución: cada tarjeta puede cambiarse por un equivalente del
// mismo patrón ("Solo hoy" / "Dejar fijo"); tarjetas y heat map usan los
// ejercicios EFECTIVOS resueltos de forma pura (domain/exerciseSubstitutions).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { toLocalDayKey } from '../../domain/attendance';
import {
  alternativesFor,
  applySwap,
  effectiveDayMuscles,
  pruneExpiredSwaps,
  readExerciseSwaps,
  resolveDayExercises,
  restoreSwap,
} from '../../domain/exerciseSubstitutions';
import type { ExerciseSwapScope } from '../../storage';
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
import ExerciseSwapSheet from './ExerciseSwapSheet';
import CardioView from './CardioView';
import AbsView from './AbsView';
import styles from './GimnasioScreen.module.css';

type GymMode = 'musculacion' | 'cardio' | 'abdominales';

const MODE_SEGMENTS: SegmentOption<GymMode>[] = [
  { id: 'musculacion', label: 'Musculación' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'abdominales', label: 'Abdominales' },
];

const PHASE_SEGMENTS: SegmentOption<RoutineWeekPhase>[] = [
  { id: 'semana1', label: 'Semanas 1-4' },
  { id: 'semana2plus', label: 'Semanas 5-8' },
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

  // Sustituciones: 'hoy' vale solo para el día LOCAL actual (se recalcula en
  // cada render, así que tras medianoche vuelve el original); 'fijo' persiste.
  const today = toLocalDayKey(new Date().toISOString());
  const swaps = useMemo(() => readExerciseSwaps(settings), [settings]);
  const effective = useMemo(
    () => resolveDayExercises(day, swaps, today),
    [day, swaps, today],
  );
  // El mapa de calor deriva de los ejercicios EFECTIVOS del día.
  const activeMuscles = useMemo(() => effectiveDayMuscles(effective), [effective]);

  const [swapSlotId, setSwapSlotId] = useState<string | null>(null);
  const openSlot = useMemo(
    () => (swapSlotId ? effective.find((e) => e.original.id === swapSlotId) ?? null : null),
    [effective, swapSlotId],
  );
  const swapAlternatives = useMemo(() => {
    if (!openSlot) return [];
    const others = effective
      .filter((e) => e.original.id !== openSlot.original.id)
      .map((e) => e.exercise.id);
    return alternativesFor(day.id, openSlot.original, openSlot.exercise.id, others);
  }, [day.id, effective, openSlot]);
  const closeSwapSheet = useCallback(() => setSwapSlotId(null), []);

  // La hoja se cierra al cambiar de día, de fase o de modo.
  useEffect(() => {
    setSwapSlotId(null);
  }, [day.id, mode]);

  const handlePick = (key: string, scope: ExerciseSwapScope) => {
    if (settings && openSlot) {
      updateSettings({
        ...settings,
        exerciseSwaps: applySwap(
          pruneExpiredSwaps(swaps, today),
          day.id,
          openSlot.original.id,
          key,
          scope,
          today,
        ),
      });
    }
    setSwapSlotId(null);
  };

  const handleRestore = (originalId: string) => {
    if (!settings) return;
    updateSettings({
      ...settings,
      exerciseSwaps: restoreSwap(pruneExpiredSwaps(swaps, today), day.id, originalId),
    });
  };

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

      {mode === 'abdominales' ? (
        <AbsView />
      ) : mode === 'cardio' ? (
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

      <MuscleHeatMap activeMuscles={activeMuscles} />

      <SessionClock />

      <button
        type="button"
        className={styles.chronoBtn}
        onClick={() => setChronoOpen(true)}
      >
        ⏱ Cronómetro / Temporizador
      </button>

      <div className={styles.exercises}>
        {effective.map((e) => (
          <ExerciseCard
            key={`${day.id}-${e.original.id}`}
            exercise={e.exercise}
            dayId={day.id}
            overrides={overrides[e.exercise.id]}
            settingsRestSeconds={restSeconds}
            original={e.swap ? e.original : undefined}
            swapScope={e.swap?.scope}
            onChangeExercise={e.group ? () => setSwapSlotId(e.original.id) : undefined}
            onRestore={() => handleRestore(e.original.id)}
          />
        ))}
      </div>

          <ExerciseSwapSheet
            open={openSlot !== null}
            group={openSlot?.group ?? null}
            currentName={openSlot?.exercise.name ?? ''}
            alternatives={swapAlternatives}
            onPick={handlePick}
            onClose={closeSwapSheet}
          />

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
