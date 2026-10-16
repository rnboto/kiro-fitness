// Conjunto de campos Evolt reutilizable (edad, altura, sexo, peso, %grasa, MME).
// Usado por WelcomeScreen (onboarding) y MeasurementForm (Perfil).

import type { EvoltErrors, EvoltFields } from './evoltValidation';
import styles from './EvoltFieldset.module.css';

interface EvoltFieldsetProps {
  fields: EvoltFields;
  errors: EvoltErrors;
  onChange: (fields: EvoltFields) => void;
  /** Prefijo para los id de los inputs (evita colisiones si hay 2 formularios). */
  idPrefix: string;
}

export default function EvoltFieldset({ fields, errors, onChange, idPrefix }: EvoltFieldsetProps) {
  const update = <K extends keyof EvoltFields>(key: K, value: EvoltFields[K]) =>
    onChange({ ...fields, [key]: value });

  const num = (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value);

  return (
    <div className={styles.grid}>
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-age`}>Edad (años)</label>
        <input
          id={`${idPrefix}-age`}
          type="number"
          inputMode="numeric"
          value={Number.isNaN(fields.age) ? '' : fields.age}
          onChange={(e) => update('age', num(e))}
          aria-invalid={!!errors.age}
        />
        {errors.age && <span className={styles.error}>{errors.age}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-height`}>Altura (cm)</label>
        <input
          id={`${idPrefix}-height`}
          type="number"
          inputMode="numeric"
          value={Number.isNaN(fields.heightCm) ? '' : fields.heightCm}
          onChange={(e) => update('heightCm', num(e))}
          aria-invalid={!!errors.heightCm}
        />
        {errors.heightCm && <span className={styles.error}>{errors.heightCm}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-sex`}>Sexo</label>
        <select
          id={`${idPrefix}-sex`}
          value={fields.sex}
          onChange={(e) => update('sex', e.target.value as 'M' | 'F')}
          aria-invalid={!!errors.sex}
        >
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>
        {errors.sex && <span className={styles.error}>{errors.sex}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-weight`}>Peso total (kg)</label>
        <input
          id={`${idPrefix}-weight`}
          type="number"
          inputMode="decimal"
          step="0.1"
          value={Number.isNaN(fields.weightKg) ? '' : fields.weightKg}
          onChange={(e) => update('weightKg', num(e))}
          aria-invalid={!!errors.weightKg}
        />
        {errors.weightKg && <span className={styles.error}>{errors.weightKg}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-bodyfat`}>% de grasa</label>
        <input
          id={`${idPrefix}-bodyfat`}
          type="number"
          inputMode="decimal"
          step="0.1"
          value={Number.isNaN(fields.bodyFatPct) ? '' : fields.bodyFatPct}
          onChange={(e) => update('bodyFatPct', num(e))}
          aria-invalid={!!errors.bodyFatPct}
        />
        {errors.bodyFatPct && <span className={styles.error}>{errors.bodyFatPct}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-mme`}>Masa muscular esquelética (kg)</label>
        <input
          id={`${idPrefix}-mme`}
          type="number"
          inputMode="decimal"
          step="0.1"
          value={Number.isNaN(fields.mmeKg) ? '' : fields.mmeKg}
          onChange={(e) => update('mmeKg', num(e))}
          aria-invalid={!!errors.mmeKg}
        />
        {errors.mmeKg && <span className={styles.error}>{errors.mmeKg}</span>}
      </div>
    </div>
  );
}
