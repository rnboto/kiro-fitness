// Resumen «Mi día»: los 4 platos elegidos (o sugeridos) en orden horario con
// sus macros, y el total del día frente al objetivo diario. Los totales vienen
// de buildDaySummary (mismos resultados de computePlate; sin matemática nueva).

import type { MealId } from '../../domain/mealPlates';
import type { MacroSet } from '../../domain/nutrition';
import { formatSignedDiff, type DaySummary } from '../../domain/daySummary';
import { mealTitle } from './mealLabels';
import styles from './MiDiaSummary.module.css';

interface MiDiaSummaryProps {
  summary: DaySummary;
  /** Al pulsar una comida (p. ej. para llevar a su tarjeta). */
  onSelectMeal?: (mealId: MealId) => void;
}

const DIFF_ITEMS: { key: keyof MacroSet; label: string; unit: 'kcal' | 'g' }[] = [
  { key: 'kcal', label: 'kcal', unit: 'kcal' },
  { key: 'proteinG', label: 'Proteína', unit: 'g' },
  { key: 'carbsG', label: 'Carbos', unit: 'g' },
  { key: 'fatG', label: 'Grasa', unit: 'g' },
];

function line(m: MacroSet): string {
  return `${Math.round(m.kcal)} kcal · P ${Math.round(m.proteinG)} g · C ${Math.round(
    m.carbsG,
  )} g · G ${Math.round(m.fatG)} g`;
}

export default function MiDiaSummary({ summary, onSelectMeal }: MiDiaSummaryProps) {
  return (
    <section className={styles.card} aria-label="Mi día">
      <details open>
        <summary className={styles.summary}>Mi día</summary>

        <ul className={styles.rows}>
          {summary.rows.map((row) => (
            <li key={row.mealId}>
              <button
                type="button"
                className={styles.row}
                onClick={() => onSelectMeal?.(row.mealId)}
                data-testid={`mi-dia-fila-${row.mealId}`}
              >
                <span className={styles.rowHead}>
                  <span className={styles.time}>{row.time}</span>
                  <span className={styles.meal}>{mealTitle(row.mealId, row.mealName)}</span>
                </span>
                <span className={styles.plate}>
                  <span className={styles.plateName}>{row.plate.name}</span>
                  {!row.isChosen && <span className={styles.tag}>Sugerido</span>}
                </span>
                <span className={styles.macros}>{line(row.totals)}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className={styles.totals}>
          <p className={styles.totalLine} data-testid="mi-dia-total">
            <span className={styles.totalLabel}>Total del día</span>
            <span>{line(summary.total)}</span>
          </p>
          <p className={styles.targetLine} data-testid="mi-dia-objetivo">
            <span className={styles.totalLabel}>Objetivo</span>
            <span>{line(summary.target)}</span>
          </p>
          <ul className={styles.diffs} aria-label="Diferencia con el objetivo">
            {DIFF_ITEMS.map(({ key, label, unit }) => (
              <li key={key} className={styles.diffItem}>
                <span className={styles.diffLabel}>{label}</span>
                <span
                  className={summary.status[key] === 'ok' ? styles.ok : styles.off}
                  data-testid={`mi-dia-diff-${key}`}
                  data-status={summary.status[key]}
                >
                  {formatSignedDiff(summary.diff[key], unit)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.note}>
          Los platos se ajustan a cada comida con una desviación de hasta ~14 %; el total del día
          puede diferir un poco del objetivo.
        </p>
      </details>
    </section>
  );
}
