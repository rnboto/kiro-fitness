// Control numérico reutilizable con botones +/- (design §8.5).

import styles from './NumberStepper.module.css';

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Decimales a mostrar (y a los que redondear). Default 0. */
  decimals?: number;
  label?: string;
  unit?: string;
  id?: string;
}

/** Redondea evitando errores de coma flotante acumulados. */
function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export default function NumberStepper({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  decimals = 0,
  label,
  unit,
  id,
}: NumberStepperProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, roundTo(v, decimals)));

  const dec = () => onChange(clamp(value - step));
  const inc = () => onChange(clamp(value + step));

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    if (!Number.isFinite(raw)) return;
    onChange(clamp(raw));
  };

  return (
    <div className={styles.stepper}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.btn}
          onClick={dec}
          aria-label={`Disminuir ${label ?? 'valor'}`}
          disabled={value <= min}
        >
          −
        </button>
        <input
          id={id}
          className={styles.input}
          type="number"
          inputMode="decimal"
          value={value}
          min={min === -Infinity ? undefined : min}
          max={max === Infinity ? undefined : max}
          step={step}
          onChange={handleInput}
        />
        {unit && <span className={styles.unit}>{unit}</span>}
        <button
          type="button"
          className={styles.btn}
          onClick={inc}
          aria-label={`Aumentar ${label ?? 'valor'}`}
          disabled={value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}
