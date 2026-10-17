// Sub-vista Cardio del Gimnasio (aeróbico, separado de la musculación).
// Formulario para registrar una sesión (correr/bici) y lista de sesiones
// recientes con borrado. Persiste en cardioStore.

import { useCallback, useEffect, useMemo, useState } from 'react';
import NumberStepper from '../../components/NumberStepper';
import {
  formatMmSs,
  formatPace,
  formatSpeed,
  paceSecPerKm,
  sessionDurationSec,
  speedKmH,
} from '../../domain/cardio';
import {
  selectCardioRecords,
  type CardioRecords,
} from '../estadisticas/statsSelectors';
import {
  addCardioSession,
  deleteCardioSession,
  getAllCardioSessions,
  type CardioSession,
} from '../../storage';
import SegmentedControl from '../estadisticas/SegmentedControl';
import CardioRoutinesGuide from './CardioRoutinesGuide';
import styles from './CardioView.module.css';

type CardioType = 'correr' | 'bici';
type CardioViewTab = 'registro' | 'rutinas';

const TYPE_LABEL: Record<CardioType, string> = {
  correr: 'Correr',
  bici: 'Bici',
};

/** 'YYYY-MM-DD' de hoy en zona local (para el input date por defecto). */
function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Construye un ISO a partir de 'YYYY-MM-DD' fijando el mediodía local, para
 * evitar que al truncar a 'YYYY-MM-DD' el valor caiga en el día anterior por
 * la zona horaria.
 */
function dateKeyToIso(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const local = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  return local.toISOString();
}

/** Línea computada de una sesión: distancia · tiempo · ritmo o velocidad. */
function sessionComputedLine(s: CardioSession): string {
  const dur = sessionDurationSec(s);
  const perf =
    s.type === 'correr'
      ? formatPace(paceSecPerKm(dur, s.distanceKm))
      : formatSpeed(speedKmH(dur, s.distanceKm));
  return `${s.distanceKm} km · ${formatMmSs(dur)} · ${perf}`;
}

export default function CardioView() {
  const [view, setView] = useState<CardioViewTab>('registro');
  const [type, setType] = useState<CardioType>('correr');
  const [minutes, setMinutes] = useState(30);
  const [seconds, setSeconds] = useState(0);
  const [distanceKm, setDistanceKm] = useState(5);
  const [calories, setCalories] = useState(0);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(todayKey());
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
    const durationSec = minutes * 60 + seconds;
    setSaving(true);
    try {
      await addCardioSession({
        date: dateKeyToIso(date),
        type,
        durationSec,
        durationMin: Math.round(durationSec / 60),
        distanceKm,
        ...(calories > 0 ? { calories } : {}),
        ...(notes.trim() !== '' ? { notes: notes.trim() } : {}),
      });
      setNotes('');
      await refresh();
    } finally {
      setSaving(false);
    }
  }, [type, minutes, seconds, distanceKm, calories, notes, date, refresh]);

  const remove = useCallback(
    async (id: number) => {
      await deleteCardioSession(id);
      await refresh();
    },
    [refresh],
  );

  // Records globales ('todo') del tipo activo, para el panel de marcas.
  const records: CardioRecords = useMemo(
    () => selectCardioRecords(sessions, type, 'todo'),
    [sessions, type],
  );
  const hasRecords =
    records.longestDistanceKm !== null || records.longestDurationSec !== null;

  return (
    <div className={styles.cardio}>
      <SegmentedControl<CardioViewTab>
        options={[
          { id: 'registro', label: 'Registro' },
          { id: 'rutinas', label: 'Rutinas' },
        ]}
        value={view}
        onChange={setView}
        ariaLabel="Vista de cardio"
      />

      {view === 'rutinas' ? (
        <CardioRoutinesGuide />
      ) : (
        <>
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
          <div className={styles.timeRow} role="group" aria-label="Duración">
            <NumberStepper
              label="Minutos"
              unit="min"
              value={minutes}
              onChange={setMinutes}
              min={0}
              max={600}
              step={1}
              id="cardio-minutes"
            />
            <NumberStepper
              label="Segundos"
              unit="s"
              value={seconds}
              onChange={setSeconds}
              min={0}
              max={59}
              step={5}
              id="cardio-seconds"
            />
          </div>
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

        <label className={styles.dateField} htmlFor="cardio-date">
          <span>Fecha</span>
          <input
            id="cardio-date"
            className={styles.date}
            type="date"
            value={date}
            max={todayKey()}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

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

      {hasRecords && (
        <section className={styles.records}>
          <h2 className={styles.formTitle}>
            Records {type === 'correr' ? '🏃 Correr' : '🚴 Bici'}
          </h2>
          <div className={styles.recordsGrid}>
            {type === 'correr' ? (
              <div className={styles.record}>
                <span className={styles.recordLabel}>Mejor ritmo</span>
                <span className={styles.recordValue}>
                  {formatPace(records.bestPaceSecPerKm)}
                  {records.lastPaceIsPR && (
                    <span className={styles.pr}> ¡Récord!</span>
                  )}
                </span>
              </div>
            ) : (
              <div className={styles.record}>
                <span className={styles.recordLabel}>Mejor velocidad</span>
                <span className={styles.recordValue}>
                  {formatSpeed(records.bestSpeedKmH)}
                  {records.lastSpeedIsPR && (
                    <span className={styles.pr}> ¡Récord!</span>
                  )}
                </span>
              </div>
            )}
            <div className={styles.record}>
              <span className={styles.recordLabel}>Distancia más larga</span>
              <span className={styles.recordValue}>
                {records.longestDistanceKm !== null
                  ? `${Math.round(records.longestDistanceKm * 10) / 10} km`
                  : '—'}
              </span>
            </div>
            <div className={styles.record}>
              <span className={styles.recordLabel}>Sesión más larga</span>
              <span className={styles.recordValue}>
                {records.longestDurationSec !== null
                  ? formatMmSs(records.longestDurationSec)
                  : '—'}
              </span>
            </div>
          </div>
        </section>
      )}

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
                  {sessionComputedLine(s)}
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
        </>
      )}
    </div>
  );
}
