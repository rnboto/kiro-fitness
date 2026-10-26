// Tarjeta de una comida: nombre, hora sugerida, "Ideas de comida" (platos
// típicos de ese momento del día con gramos exactos) y, plegado, el cálculo
// básico por macros. Al tocar un plato queda ELEGIDO para esa comida (se
// persiste por id); al tocar un alimento abre el swap modal.

import { useMemo, useState } from 'react';
import { toCookedGrams, type Food } from '../../domain/foodDb';
import { platesForMeal } from '../../domain/mealPlates';
import type { MassMacro, MealPlan } from '../../domain/nutrition';
import { computePlate } from '../../domain/plateSizing';
import { isPlateChosen, resolveChosenPlate } from '../../domain/plateSelection';
import { mealTitle } from './mealLabels';
import { mealFoodItems } from './mealFoods';
import PlateDetail from './PlateDetail';
import styles from './MealCard.module.css';

interface MealCardProps {
  meal: MealPlan;
  /** Id del plato elegido para esta comida (persistido); si no es válido se usa el primero. */
  selectedPlateId?: string;
  onSelectPlate: (plateId: string) => void;
  /** Quita la elección y vuelve al plato sugerido. */
  onClearPlate: () => void;
  onSwap: (food: Food, grams: number, macro: MassMacro) => void;
}

const MEAL_HELP: Partial<Record<MealPlan['id'], string>> = {
  post: 'Tu desayuno: elige un plato portátil si lo tomas en el trabajo.',
};

export default function MealCard({
  meal,
  selectedPlateId,
  onSelectPlate,
  onClearPlate,
  onSwap,
}: MealCardProps) {
  const [onlyPortable, setOnlyPortable] = useState(false);

  const items = mealFoodItems(meal.macros);
  const allPlates = platesForMeal(meal.id);
  const hasPortable = allPlates.some((p) => p.portable);
  const visiblePlates = onlyPortable ? allPlates.filter((p) => p.portable) : allPlates;

  // El plato mostrado es SIEMPRE el resuelto (elegido o sugerido); el filtro
  // «Solo para llevar» solo cambia qué opciones se listan, nunca la elección.
  const selection = selectedPlateId ? { [meal.id]: selectedPlateId } : undefined;
  const plate = allPlates.length > 0 ? resolveChosenPlate(meal.id, selection) : null;
  const chosen = isPlateChosen(meal.id, selection);
  const hiddenByFilter = !!plate && !visiblePlates.some((p) => p.id === plate.id);

  const result = useMemo(
    () => (plate ? computePlate(plate, meal.macros) : null),
    [plate, meal.macros],
  );

  const title = mealTitle(meal.id, meal.name);
  const help = MEAL_HELP[meal.id];
  const titleId = `comida-${meal.id}-titulo`;

  return (
    <article id={`comida-${meal.id}`} className={styles.card} aria-labelledby={titleId}>
      <header className={styles.header}>
        <h3 id={titleId} className={styles.name}>
          {title}
        </h3>
        <span className={styles.time}>{meal.time}</span>
      </header>

      <p className={styles.macros}>
        {Math.round(meal.macros.kcal)} kcal · P {Math.round(meal.macros.proteinG)} g · C{' '}
        {Math.round(meal.macros.carbsG)} g · G {Math.round(meal.macros.fatG)} g
      </p>
      {help && <p className={styles.help}>{help}</p>}

      {allPlates.length > 0 && (
        <section className={styles.ideas} aria-label="Ideas de comida">
          <h4 className={styles.ideasTitle}>Ideas de comida</h4>
          <div className={styles.chips} role="group" aria-label="Ideas de comida">
            {hasPortable && (
              <button
                type="button"
                className={`${styles.chip} ${styles.filterChip} ${
                  onlyPortable ? styles.chipActive : ''
                }`}
                aria-pressed={onlyPortable}
                onClick={() => setOnlyPortable((v) => !v)}
              >
                Solo para llevar
              </button>
            )}
            {visiblePlates.map((p) => {
              const active = p.id === plate?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                  aria-pressed={active}
                  onClick={() => onSelectPlate(p.id)}
                >
                  {p.name}
                  {p.portable && <span className={styles.chipTag}>Portátil</span>}
                  {active && (
                    <span className={styles.chipStatus}>{chosen ? 'Elegido' : 'Sugerido'}</span>
                  )}
                </button>
              );
            })}
          </div>

          {chosen && (
            <button type="button" className={styles.resetChoice} onClick={onClearPlate}>
              Volver al sugerido
            </button>
          )}
          {hiddenByFilter && plate && (
            <p className={styles.hiddenChoice}>
              Tu elección ({plate.name}) no es para llevar; sigue elegida.
            </p>
          )}

          {result && <PlateDetail result={result} onSwap={onSwap} />}
        </section>
      )}

      <details className={styles.basic}>
        <summary className={styles.basicSummary}>Cálculo básico por macros</summary>
        <ul className={styles.foods}>
          {items.map((item) => (
            <li key={item.food.id}>
              <button
                type="button"
                className={styles.food}
                onClick={() => onSwap(item.food, item.rawGrams, item.macro)}
              >
                <span className={styles.foodName}>{item.food.name}</span>
                <span className={styles.foodGrams}>
                  {Math.round(item.rawGrams)} g crudo
                  {item.food.cookedFactor
                    ? ` · ${Math.round(toCookedGrams(item.food, item.rawGrams))} g cocido`
                    : ''}
                </span>
                {item.food.note && <span className={styles.foodNote}>{item.food.note}</span>}
              </button>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
