// Pantalla Nutrición: recálculo EN VIVO del plan diario a partir del perfil
// (último) y los ajustes (design §6.4). El plan nunca se persiste: es derivado.

import { useMemo, useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { useSettings } from '../../context/SettingsContext';
import {
  buildDailyPlan,
  type MassMacro,
  type MealPlan,
  type NutritionInput,
} from '../../domain/nutrition';
import type { Food } from '../../domain/foodDb';
import type { MealId } from '../../domain/mealPlates';
import { readSelectedPlates, withPlateChoice } from '../../domain/plateSelection';
import { buildDaySummary } from '../../domain/daySummary';
import SegmentedControl from '../estadisticas/SegmentedControl';
import MealCard from './MealCard';
import MiDiaSummary from './MiDiaSummary';
import FoodSwapModal from './FoodSwapModal';
import ShoppingList from './ShoppingList';
import styles from './NutricionScreen.module.css';

type NutricionView = 'comidas' | 'compra';

const VIEW_OPTIONS: { id: NutricionView; label: string }[] = [
  { id: 'comidas', label: 'Comidas' },
  { id: 'compra', label: 'Lista de la compra' },
];

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
  mealId: MealPlan['id'];
}

export default function NutricionScreen() {
  const { profile } = useProfile();
  const { settings, updateSettings } = useSettings();
  const [swap, setSwap] = useState<SwapState | null>(null);
  // Vista local (no se persiste): al volver a Nutrición se abre en «Comidas».
  const [view, setView] = useState<NutricionView>('comidas');

  // El plan solo depende del perfil y de estos 4 ajustes: marcar productos de
  // la lista de la compra (que cambia `settings`) no lo recalcula.
  const activityFactor = settings?.activityFactor;
  const proteinGPerKg = settings?.proteinGPerKg;
  const bmrBasis = settings?.bmrBasis;
  const trainingStart = settings?.trainingStart;
  const plan = useMemo(() => {
    if (
      !profile ||
      activityFactor === undefined ||
      proteinGPerKg === undefined ||
      bmrBasis === undefined ||
      trainingStart === undefined
    ) {
      return null;
    }
    const input: NutritionInput = {
      weightKg: profile.weightKg,
      bodyFatPct: profile.bodyFatPct,
      mmeKg: profile.mmeKg,
      activityFactor,
      proteinGPerKg,
      bmrBasis,
      trainingStart,
    };
    return buildDailyPlan(input);
  }, [profile, activityFactor, proteinGPerKg, bmrBasis, trainingStart]);

  // Platos elegidos por comida (lectura defensiva; solo ids, nunca gramos).
  const rawSelectedPlates = settings?.selectedPlates;
  const selectedPlates = useMemo(
    () => readSelectedPlates({ selectedPlates: rawSelectedPlates }),
    [rawSelectedPlates],
  );
  const daySummary = useMemo(
    () => (plan ? buildDaySummary(plan, selectedPlates) : null),
    [plan, selectedPlates],
  );

  if (!settings) {
    return <p className={styles.loading}>Cargando tu plan…</p>;
  }

  const choosePlate = (mealId: MealId, plateId: string | null) => {
    void updateSettings({
      ...settings,
      selectedPlates: withPlateChoice(selectedPlates, mealId, plateId),
    });
  };

  // jsdom no implementa scrollIntoView: llamada opcional.
  const scrollToMeal = (mealId: MealId) => {
    document.getElementById(`comida-${mealId}`)?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const comidas =
    plan && daySummary ? (
      <>
        <p className={styles.subtitle}>
          Plan diario calculado a partir de tu último estudio. Post-entreno es tu desayuno.
        </p>

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

        <MiDiaSummary summary={daySummary} onSelectMeal={scrollToMeal} />

        <div className={styles.meals}>
          {plan.meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              selectedPlateId={selectedPlates[meal.id]}
              onSelectPlate={(plateId) => choosePlate(meal.id, plateId)}
              onClearPlate={() => choosePlate(meal.id, null)}
              onSwap={(food, grams, macro) => setSwap({ food, grams, macro, mealId: meal.id })}
            />
          ))}
        </div>

        <FoodSwapModal
          open={swap !== null}
          food={swap?.food ?? null}
          grams={swap?.grams ?? 0}
          macro={swap?.macro ?? 'proteinG'}
          mealId={swap?.mealId}
          onClose={() => setSwap(null)}
        />
      </>
    ) : (
      <p className={styles.loading}>Cargando tu plan…</p>
    );

  return (
    <div className={styles.screen}>
      <header className={styles.header} data-print-hide>
        <h1 className={styles.title}>Nutrición</h1>
      </header>

      <div data-print-hide>
        <SegmentedControl<NutricionView>
          ariaLabel="Secciones de Nutrición"
          options={VIEW_OPTIONS}
          value={view}
          onChange={setView}
        />
      </div>

      <div role="tabpanel" className={styles.panel}>
        {view === 'comidas' ? (
          comidas
        ) : (
          <ShoppingList plan={plan} selectedPlates={selectedPlates} />
        )}
      </div>
    </div>
  );
}
