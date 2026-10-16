// Tarjeta de una comida: nombre, hora sugerida y lista de alimentos con gramos
// exactos en crudo + nota raw/cooked. Al tocar un alimento abre el swap modal.

import { toCookedGrams, type Food } from '../../domain/foodDb';
import type { MassMacro, MealPlan } from '../../domain/nutrition';
import { mealFoodItems } from './mealFoods';
import styles from './MealCard.module.css';

interface MealCardProps {
  meal: MealPlan;
  onSwap: (food: Food, grams: number, macro: MassMacro) => void;
}

export default function MealCard({ meal, onSwap }: MealCardProps) {
  const items = mealFoodItems(meal.macros);

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <h3 className={styles.name}>{meal.name}</h3>
        <span className={styles.time}>{meal.time}</span>
      </header>

      <p className={styles.macros}>
        {Math.round(meal.macros.kcal)} kcal · P {Math.round(meal.macros.proteinG)} g · C{' '}
        {Math.round(meal.macros.carbsG)} g · G {Math.round(meal.macros.fatG)} g
      </p>

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
    </article>
  );
}
