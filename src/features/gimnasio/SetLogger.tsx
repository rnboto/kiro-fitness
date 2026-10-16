// Registro fluido de una serie (design §8.5). Peso y reps con NumberStepper (+/-)
// y Slider; al confirmar persiste un LoggedSet en workoutLogStore. Prellena con el
// último valor registrado del mismo ejercicio (getLastSet) para minimizar toques.

import { useCallback, useEffect, useState } from 'react';
import NumberStepper from '../../components/NumberStepper';
import Slider from '../../components/Slider';
import { addSet, getLastSet, type DayId } from '../../storage';
import styles from './SetLogger.module.css';

interface SetLoggerProps {
  dayId: DayId;
  exerciseId: string;
  setIndex: number; // 1-based
}

export default function SetLogger({ dayId, exerciseId, setIndex }: SetLoggerProps) {
  const [weightKg, setWeightKg] = useState(20);
  const [reps, setReps] = useState(10);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<{ weightKg: number; reps: number } | null>(null);

  // Prellenado con el último valor registrado del mismo ejercicio.
  useEffect(() => {
    let active = true;
    (async () => {
      const last = await getLastSet(exerciseId);
      if (!active || !last) return;
      setWeightKg(last.weightKg);
      setReps(last.reps);
    })();
    return () => {
      active = false;
    };
  }, [exerciseId]);

  const confirm = useCallback(async () => {
    setSaving(true);
    try {
      await addSet({
        date: new Date().toISOString(),
        dayId,
        exerciseId,
        setIndex,
        weightKg,
        reps,
      });
      setSavedAt({ weightKg, reps });
    } finally {
      setSaving(false);
    }
  }, [dayId, exerciseId, setIndex, weightKg, reps]);

  return (
    <div className={styles.logger}>
      <div className={styles.row}>
        <NumberStepper
          label={`Serie ${setIndex} · peso`}
          value={weightKg}
          onChange={setWeightKg}
          min={0}
          max={500}
          step={2.5}
          decimals={1}
          unit="kg"
          id={`w-${exerciseId}-${setIndex}`}
        />
        <NumberStepper
          label="Reps"
          value={reps}
          onChange={setReps}
          min={1}
          max={50}
          step={1}
          unit="reps"
          id={`r-${exerciseId}-${setIndex}`}
        />
      </div>
      <Slider
        label="Ajuste rápido de peso"
        value={weightKg}
        onChange={setWeightKg}
        min={0}
        max={200}
        step={2.5}
        unit="kg"
        id={`ws-${exerciseId}-${setIndex}`}
      />
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.confirm}
          onClick={confirm}
          disabled={saving}
        >
          {saving ? 'Guardando…' : 'Registrar serie'}
        </button>
        {savedAt && (
          <span className={styles.saved} role="status">
            ✓ {savedAt.weightKg} kg × {savedAt.reps}
          </span>
        )}
      </div>
    </div>
  );
}
