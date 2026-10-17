// Formulario de nueva medición en Estadísticas · Cuerpo. SIEMPRE inserta una
// ProfileEntry nueva datada (nunca sobrescribe). Reutiliza el fieldset y las
// validaciones Evolt compartidas (que viven en features/perfil/).

import { useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
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
}

export default function MeasurementForm({ initial }: MeasurementFormProps) {
  const { addMeasurement } = useProfile();
  const [fields, setFields] = useState<EvoltFields>({ ...EMPTY_FIELDS, ...initial });
  const [date, setDate] = useState<string>(todayIso());
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
      await addMeasurement(toNewProfileEntry(fields, date));
      setSaved(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.heading}>Nueva medición</h2>

      <div className={styles.dateField}>
        <label htmlFor="measurement-date">Fecha de la medición</label>
        <input
          id="measurement-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={!!dateError}
        />
        {dateError && <span className={styles.error}>{dateError}</span>}
      </div>

      <EvoltFieldset fields={fields} errors={errors} onChange={setFields} idPrefix="measurement" />

      {softWarning && <p className={styles.softWarning}>{softWarning}</p>}
      {saved && <p className={styles.saved}>Medición guardada.</p>}

      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? 'Guardando…' : 'Guardar medición'}
      </button>
    </form>
  );
}
