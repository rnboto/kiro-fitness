// Modal de intercambio de alimentos: muestra alternativas de la misma categoría
// por el macro dominante, con los gramos en crudo equivalentes (design §7).

import Modal from '../../components/Modal';
import {
  FOODS,
  MAX_SWAP_RAW_G,
  prioritizeForMeal,
  swapEquivalents,
  toCookedGrams,
  type Food,
} from '../../domain/foodDb';
import type { MassMacro, MealPlan } from '../../domain/nutrition';
import styles from './FoodSwapModal.module.css';

interface FoodSwapModalProps {
  open: boolean;
  food: Food | null;
  grams: number;
  macro: MassMacro;
  /** Comida desde la que se abrió: sus alimentos típicos aparecen primero. */
  mealId?: MealPlan['id'];
  onClose: () => void;
}

const MACRO_LABEL: Record<MassMacro, string> = {
  proteinG: 'proteína',
  carbsG: 'carbohidratos',
  fatG: 'grasa',
};

export default function FoodSwapModal({
  open,
  food,
  grams,
  macro,
  mealId,
  onClose,
}: FoodSwapModalProps) {
  const reasonable = food
    ? swapEquivalents(food, grams, macro, FOODS).filter((a) => a.grams <= MAX_SWAP_RAW_G)
    : [];
  const alternatives = mealId ? prioritizeForMeal(reasonable, mealId) : reasonable;

  return (
    <Modal open={open && !!food} title={food ? `Intercambiar ${food.name}` : ''} onClose={onClose}>
      {food && (
        <>
          <p className={styles.intro}>
            Alternativas por {MACRO_LABEL[macro]} (misma categoría), con los gramos en crudo
            equivalentes.{mealId ? ' Los de esta comida aparecen primero.' : ''}
          </p>
          {alternatives.length === 0 ? (
            <p className={styles.empty}>No hay alternativas en esta categoría.</p>
          ) : (
            <ul className={styles.list}>
              {alternatives.map(({ food: alt, grams: altGrams }) => (
                <li key={alt.id} className={styles.item}>
                  <span className={styles.name}>{alt.name}</span>
                  <span className={styles.grams}>
                    {Math.round(altGrams)} g crudo
                    {alt.cookedFactor
                      ? ` · ${Math.round(toCookedGrams(alt, altGrams))} g cocido`
                      : ''}
                  </span>
                  {alt.note && <span className={styles.note}>{alt.note}</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}
