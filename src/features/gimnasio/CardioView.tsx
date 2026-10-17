// Sub-vista Cardio del Gimnasio (aeróbico, separado de la musculación).
// Formulario para registrar una sesión (correr/bici) y lista de sesiones
// recientes con borrado. Persiste en cardioStore.

import { useCallback, useEffect, useState } from 'react';
import NumberStepper from '../../components/NumberStepper';
import {
  addCardioSession,
  deleteCardioSession,
  getAllCardioSessions,
  type CardioSession,
} from '../../storage';
import styles from './CardioView.module.css';

type CardioType = 'correr' | 'bici';

const TYPE_LABEL: Record<CardioType, string> = {
  correr: 'Correr',
  bici: 'Bici',
};

export default function CardioView() {
  const [type, setType] = useState<CardioType>('correr');
  const [durationMin, setDurationMin] = useState(30);
  const [distanceKm, setDistanceKm] = useState(5);
  const [calories, setCalories] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<CardioSession[]>([]);

  const refresh = useCallback(async () => {
    const all = await getAllCardioSessions();
    // Más reciente primero.
    setSessions(all.slice().reverse());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const confirm = useCallback(async () => {
    setSaving(true);
    try {
      await addCardioSession({
        date: new Date().toISOString(),
        type,
        durationMin,
        distanceKm,
        ...(calories > 0 ? { calories } : {}),
        ...(notes.trim() !== '' ? { notes: notes.trim() } : {}),
      });
      setNotes('');
      await refresh();
    } finally {
      setSaving(false);
    }
  }, [type, durationMin, distanceKm, calories, notes, refresh]);

  const remove = useCallback(
    async (id: number) => {
      await deleteCardioSession(id);
      await refresh();
    },
    [refresh],
  );

  return (
    <div className={styles.cardio}>
      <section className={styles.form}>
        <h2 className={styles.formTitle}>Registrar sesión de cardio</h2>

        <div className={styles.typeRow} role="group" aria-label="Tipo de cardio">
          {(Object.keys(TYPE_LABEL) as CardioType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`${styles.typeBtn} ${t === type ? styles.typeActive : ''}`}
              aria-pressed={t === type}
              onClick={() => setType(t)}
            >
              {t === 'correr' ? '🏃 ' : '🚴 '}
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <div className={styles.steppers}>
          <NumberStepper
            label="Duración"
            unit="min"
            value={durationMin}
            onChange={setDurationMin}
            min={0}
            max={600}
            step={1}
            id="cardio-duration"
          />
          <NumberStepper
            label="Distancia"
            unit="km"
            value={distanceKm}
            onChange={setDistanceKm}
            min={0}
            max={300}
            step={0.1}
            decimals={1}
            id="cardio-distance"
          />
          <NumberStepper
            label="Calorías (opcional)"
            unit="kcal"
            value={calories}
            onChange={setCalories}
            min={0}
            max={5000}
            step={10}
            id="cardio-calories"
          />
        </div>

        <label className={styles.notesField} htmlFor="cardio-notes">
          <span>Notas (opcional)</span>
          <textarea
            id="cardio-notes"
            className={styles.notes}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ritmo, sensaciones, ruta…"
            rows={2}
          />
        </label>

        <button
          type="button"
          className={styles.confirm}
          onClick={confirm}
          disabled={saving}
        >
          {saving ? 'Guardando…' : 'Registrar sesión'}
        </button>
      </section>

      <section className={styles.history}>
        <h2 className={styles.formTitle}>Sesiones recientes</h2>
        {sessions.length === 0 ? (
          <p className={styles.empty}>
            Aún no has registrado ninguna sesión de cardio.
          </p>
        ) : (
          <ul className={styles.list}>
            {sessions.map((s) => (
              <li key={s.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.itemType}>
                    {s.type === 'correr' ? '🏃 Correr' : '🚴 Bici'}
                  </span>
                  <span className={styles.itemDate}>{s.date.slice(0, 10)}</span>
                </div>
                <div className={styles.itemMeta}>
                  {s.distanceKm} km · {s.durationMin} min
                  {s.calories !== undefined ? ` · ${s.calories} kcal` : ''}
                  {s.notes ? ` · ${s.notes}` : ''}
                </div>
                <button
                  type="button"
                  className={styles.delete}
                  onClick={() => remove(s.id)}
                  aria-label={`Eliminar sesión de ${s.type} del ${s.date.slice(0, 10)}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
