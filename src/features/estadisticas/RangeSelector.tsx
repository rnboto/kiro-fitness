// Selector de rango temporal Semana/Mes/Todo para las pestañas de Estadísticas.

import type { StatsRange } from './statsSelectors';
import styles from './RangeSelector.module.css';

interface RangeSelectorProps {
  value: StatsRange;
  onChange: (range: StatsRange) => void;
}

const OPTIONS: { id: StatsRange; label: string }[] = [
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'todo', label: 'Todo' },
];

export default function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div className={styles.range} role="group" aria-label="Rango temporal">
      {OPTIONS.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            className={`${styles.chip} ${active ? styles.chipActive : ''}`}
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
