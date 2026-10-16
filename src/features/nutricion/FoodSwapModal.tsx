// Modal de intercambio de alimentos: muestra alternativas de la misma categoría
// por el macro dominante, con los gramos en crudo equivalentes (design §7).

import Modal from '../../components/Modal';
import { FOODS, swapEquivalents, toCookedGrams, type Food } from '../../domain/foodDb';
import type { MassMacro } from '../../domain/nutrition';
import styles from './FoodSwapModal.module.css';

interface FoodSwapModalProps {
  open: boolean;
  food: Food | null;
  grams: number;
  macro: MassMacro;
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
  onClose,
}: FoodSwapModalProps) {
  const alternatives = food ? swapEquivalents(food, grams, macro, FOODS) : [];

  return (
    <Modal open={open && !!food} title={food ? `Intercambiar ${food.name}` : ''} onClose={onClose}>
      {food && (
        <>
          <p className={styles.intro}>
            Alternativas por {MACRO_LABEL[macro]} (misma categoría), con los gramos en crudo
            equivalentes.
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
