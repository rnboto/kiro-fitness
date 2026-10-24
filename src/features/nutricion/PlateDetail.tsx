// Detalle de un plato: alimentos con gramos exactos en crudo (+ cocinado donde
// aplica), equivalencia en unidades y macros resultantes frente al objetivo.

import { approxUnits, type Food } from '../../domain/foodDb';
import type { MassMacro } from '../../domain/nutrition';
import type { PlateResult } from '../../domain/plateSizing';
import styles from './PlateDetail.module.css';

interface PlateDetailProps {
  result: PlateResult;
  onSwap: (food: Food, grams: number, macro: MassMacro) => void;
}

function macroLine(m: { kcal: number; proteinG: number; carbsG: number; fatG: number }): string {
  return `${Math.round(m.kcal)} kcal · P ${Math.round(m.proteinG)} g · C ${Math.round(
    m.carbsG,
  )} g · G ${Math.round(m.fatG)} g`;
}

export default function PlateDetail({ result, onSwap }: PlateDetailProps) {
  const { plate, items, totals, target } = result;
  const visible = items.filter((i) => i.rawGrams > 0);

  return (
    <div className={styles.detail}>
      <div className={styles.titleRow}>
        <h4 className={styles.plateName}>{plate.name}</h4>
        {plate.portable && <span className={styles.badge}>Para llevar al trabajo</span>}
      </div>
      <p className={styles.description}>{plate.description}</p>

      <ul className={styles.items}>
        {visible.map((item) => {
          const units = approxUnits(item.food, item.rawGrams);
          const body = (
            <>
              <span className={styles.itemName}>{item.food.name}</span>
              <span className={styles.itemGrams}>
                {item.rawGrams} g crudo
                {item.cookedGrams !== null ? ` · ${item.cookedGrams} g cocinado` : ''}
                {units ? ` · ${units}` : ''}
              </span>
            </>
          );
          return (
            <li key={item.component.foodId}>
              {item.sizedBy ? (
                <button
                  type="button"
                  className={styles.itemButton}
                  onClick={() => onSwap(item.food, item.rawGrams, item.sizedBy!)}
                >
                  {body}
                </button>
              ) : (
                <div className={styles.itemFixed}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      {plate.tip && <p className={styles.tip}>{plate.tip}</p>}

      <p className={styles.totals}>Este plato: {macroLine(totals)}</p>
      <p className={styles.target}>Objetivo: {macroLine(target)}</p>
      <p className={styles.rawNote}>Cantidades en crudo salvo que ponga «cocinado».</p>
    </div>
  );
}
