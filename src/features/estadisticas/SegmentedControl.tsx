// Control segmentado premium: indicador activo ANIMADO que se desliza bajo la
// opción seleccionada y transición suave de contenido. Son tabs INTERNAS de la
// pantalla Estadísticas (NO la bottom bar).

import styles from './SegmentedControl.module.css';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Etiqueta accesible del grupo. */
  ariaLabel: string;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.id === value),
  );
  const count = options.length;

  return (
    <div className={styles.segmented} role="tablist" aria-label={ariaLabel}>
      {/* Indicador deslizante: ancho = 1/count del área interior, posición
          animada por translateX en múltiplos de su propio ancho. */}
      <span
        className={styles.indicator}
        aria-hidden="true"
        style={{
          width: `calc((100% - var(--kiro-space-1) * 2) / ${count})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`${styles.segment} ${active ? styles.segmentActive : ''}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
