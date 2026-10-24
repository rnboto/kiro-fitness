// Formulario de medición en Estadísticas · Cuerpo. Por defecto SIEMPRE inserta una
// ProfileEntry nueva datada (nunca sobrescribe). Con la prop `entry` pasa a modo
// edición: actualiza esa entrada en sitio (mismo id). Reutiliza el fieldset y las
// validaciones Evolt compartidas (que viven en features/perfil/).

import { useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { profileDayKey } from '../../domain/profileHistory';
import type { ProfileEntry } from '../../storage';
import EvoltFieldset from '../perfil/EvoltFieldset';
import {
  isValidDateIso,
  todayIso,
  toNewProfileEntry,
  validateEvolt,
  type EvoltErrors,
  type EvoltFields,
} from '../perfil/evoltValidation';
import styles from './MeasurementForm.module.css';

const EMPTY_FIELDS: EvoltFields = {
  age: NaN,
  heightCm: NaN,
  sex: 'M',
  weightKg: NaN,
  bodyFatPct: NaN,
  mmeKg: NaN,
};

interface MeasurementFormProps {
  /** Valores iniciales (p.ej. el perfil actual) para prellenar; opcional. */
  initial?: Partial<EvoltFields>;
  /** Si se pasa, el formulario EDITA esta entrada en sitio (mismo id) en vez de insertar. */
  entry?: ProfileEntry;
  /** Callback tras guardar con éxito (edición: cerrar el modal). */
  onDone?: () => void;
}

export default function MeasurementForm({ initial, entry, onDone }: MeasurementFormProps) {
  const { addMeasurement, updateMeasurement } = useProfile();
  const editing = entry !== undefined;
  const idPrefix = editing ? 'edit-measurement' : 'measurement';
  const [fields, setFields] = useState<EvoltFields>(() =>
    entry
      ? {
          age: entry.age,
          heightCm: entry.heightCm,
          sex: entry.sex,
          weightKg: entry.weightKg,
          bodyFatPct: entry.bodyFatPct,
          mmeKg: entry.mmeKg,
        }
      : { ...EMPTY_FIELDS, ...initial },
  );
  const [date, setDate] = useState<string>(entry ? profileDayKey(entry.date) : todayIso());
  const [errors, setErrors] = useState<EvoltErrors>({});
  const [dateError, setDateError] = useState<string | undefined>();
  const [softWarning, setSoftWarning] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const result = validateEvolt(fields);
    setErrors(result.errors);
    setSoftWarning(result.softWarning);

    const dateOk = isValidDateIso(date);
    setDateError(dateOk ? undefined : 'Introduce una fecha válida (AAAA-MM-DD).');

    if (!result.valid || !dateOk) return;

    setSubmitting(true);
    try {
      if (entry) {
        // Si el día no cambia se conserva la fecha original (con su hora, si la tenía).
        const dateToSave = profileDayKey(entry.date) === date ? entry.date : date;
        await updateMeasurement(entry.id, toNewProfileEntry(fields, dateToSave));
        onDone?.();
      } else {
        await addMeasurement(toNewProfileEntry(fields, date));
        setSaved(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {!editing && <h2 className={styles.heading}>Nueva medición</h2>}

      <div className={styles.dateField}>
        <label htmlFor={`${idPrefix}-date`}>Fecha de la medición</label>
        <input
          id={`${idPrefix}-date`}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={!!dateError}
        />
        {dateError && <span className={styles.error}>{dateError}</span>}
      </div>

      <EvoltFieldset fields={fields} errors={errors} onChange={setFields} idPrefix={idPrefix} />

      {softWarning && <p className={styles.softWarning}>{softWarning}</p>}
      {saved && <p className={styles.saved}>Medición guardada.</p>}

      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar medición'}
      </button>
    </form>
  );
}
