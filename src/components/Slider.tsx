// Deslizador reutilizable (design §8.5).

import styles from './Slider.module.css';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label?: string;
  unit?: string;
  id?: string;
}

export default function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit,
  id,
}: SliderProps) {
  return (
    <div className={styles.slider}>
      {label && (
        <label className={styles.header} htmlFor={id}>
          <span className={styles.label}>{label}</span>
          <span className={styles.value}>
            {value}
            {unit ? ` ${unit}` : ''}
          </span>
        </label>
      )}
      <input
        id={id}
        className={styles.range}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
