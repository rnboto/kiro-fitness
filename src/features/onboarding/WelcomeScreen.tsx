// Pantalla de bienvenida/onboarding OBLIGATORIO (design §4.3). Saluda como Kiro
// y pide los datos del estudio Evolt. No hay botón de "saltar".

import { useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import EvoltFieldset from '../perfil/EvoltFieldset';
import {
  todayIso,
  toNewProfileEntry,
  validateEvolt,
  type EvoltErrors,
  type EvoltFields,
} from '../perfil/evoltValidation';
import styles from './WelcomeScreen.module.css';

const EMPTY_FIELDS: EvoltFields = {
  age: NaN,
  heightCm: NaN,
  sex: 'M',
  weightKg: NaN,
  bodyFatPct: NaN,
  mmeKg: NaN,
};

export default function WelcomeScreen() {
  const { addMeasurement } = useProfile();
  const [fields, setFields] = useState<EvoltFields>(EMPTY_FIELDS);
  const [errors, setErrors] = useState<EvoltErrors>({});
  const [softWarning, setSoftWarning] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateEvolt(fields);
    setErrors(result.errors);
    setSoftWarning(result.softWarning);
    if (!result.valid) return;

    setSubmitting(true);
    try {
      await addMeasurement(toNewProfileEntry(fields, todayIso()));
      // firstLaunch pasa a false automáticamente al refrescarse el perfil.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.welcome}>
      <div className={styles.hero}>
        <p className={styles.brand}>Kiro</p>
        <h1 className={styles.title}>Bienvenido a tu nuevo estilo de vida</h1>
        <p className={styles.lead}>
          Soy Kiro, tu asistente de nutrición deportiva y fuerza. Para diseñar tu dieta y tu
          entrenamiento a medida necesito los datos de tu estudio de bioimpedancia (Evolt).
          Introdúcelos para desbloquear la app.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <EvoltFieldset
          fields={fields}
          errors={errors}
          onChange={setFields}
          idPrefix="welcome"
        />

        {softWarning && <p className={styles.softWarning}>{softWarning}</p>}

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Guardando…' : 'Desbloquear mi plan'}
        </button>
      </form>
    </main>
  );
}
