// Pantalla Nutrición: recálculo EN VIVO del plan diario a partir del perfil
// (último) y los ajustes (design §6.4). El plan nunca se persiste: es derivado.

import { useMemo, useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { useSettings } from '../../context/SettingsContext';
import { buildDailyPlan, type MassMacro, type NutritionInput } from '../../domain/nutrition';
import type { Food } from '../../domain/foodDb';
import MealCard from './MealCard';
import FoodSwapModal from './FoodSwapModal';
import styles from './NutricionScreen.module.css';

const WARNING_TEXT: Record<NonNullable<ReturnType<typeof buildDailyPlan>['warning']>, string> = {
  FAT_REDUCED_TO_FLOOR:
    'Perfil exigente: se redujo la grasa al mínimo saludable (0,6 g/kg) para dejar sitio a los carbohidratos.',
  CARBS_CLAMPED_TO_ZERO:
    'Perfil extremo: los carbohidratos quedaron en 0 y las kcal del plan pueden superar el objetivo (prevalece la proteína mínima).',
};

interface SwapState {
  food: Food;
  grams: number;
  macro: MassMacro;
}

export default function NutricionScreen() {
  const { profile } = useProfile();
  const { settings } = useSettings();
  const [swap, setSwap] = useState<SwapState | null>(null);

  const plan = useMemo(() => {
    if (!profile || !settings) return null;
    const input: NutritionInput = {
      weightKg: profile.weightKg,
      bodyFatPct: profile.bodyFatPct,
      mmeKg: profile.mmeKg,
      activityFactor: settings.activityFactor,
      proteinGPerKg: settings.proteinGPerKg,
      bmrBasis: settings.bmrBasis,
      trainingStart: settings.trainingStart,
    };
    return buildDailyPlan(input);
  }, [profile, settings]);

  if (!plan) {
    return <p className={styles.loading}>Cargando tu plan…</p>;
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Nutrición</h1>
        <p className={styles.subtitle}>Plan diario calculado a partir de tu último estudio.</p>
      </header>

      <section className={styles.summary} aria-label="Resumen diario">
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Objetivo</span>
          <span className={styles.metricValue} data-testid="target-kcal">
            {Math.round(plan.targetKcal)} kcal
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Proteína</span>
          <span className={styles.metricValue} data-testid="total-protein">
            {Math.round(plan.totals.proteinG)} g
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Carbos</span>
          <span className={styles.metricValue}>{Math.round(plan.totals.carbsG)} g</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Grasa</span>
          <span className={styles.metricValue}>{Math.round(plan.totals.fatG)} g</span>
        </div>
      </section>

      {plan.warning && <p className={styles.warning}>{WARNING_TEXT[plan.warning]}</p>}

      <div className={styles.meals}>
        {plan.meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            onSwap={(food, grams, macro) => setSwap({ food, grams, macro })}
          />
        ))}
      </div>

      <FoodSwapModal
        open={swap !== null}
        food={swap?.food ?? null}
        grams={swap?.grams ?? 0}
        macro={swap?.macro ?? 'proteinG'}
        onClose={() => setSwap(null)}
      />
    </div>
  );
}
