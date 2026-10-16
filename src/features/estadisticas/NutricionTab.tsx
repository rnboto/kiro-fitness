// Pestaña Nutrición: resumen vs objetivo del plan actual (derivado del perfil
// más reciente). El plan nunca se persiste (design §6.4); el selector de rango
// se muestra por coherencia, pero el objetivo es siempre el del perfil vigente.

import { useMemo, useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { useSettings } from '../../context/SettingsContext';
import type { NutritionInput } from '../../domain/nutrition';
import RangeSelector from './RangeSelector';
import { selectNutritionSummary, type StatsRange } from './statsSelectors';
import styles from './tabs.module.css';

const WARNING_TEXT: Record<'FAT_REDUCED_TO_FLOOR' | 'CARBS_CLAMPED_TO_ZERO', string> = {
  FAT_REDUCED_TO_FLOOR:
    'Perfil exigente: la grasa se bajó al mínimo saludable (0,6 g/kg) para dejar sitio a los carbohidratos.',
  CARBS_CLAMPED_TO_ZERO:
    'Perfil extremo: los carbohidratos quedaron en 0 y las kcal pueden superar el objetivo (prevalece la proteína mínima).',
};

export default function NutricionTab() {
  const { profile } = useProfile();
  const { settings } = useSettings();
  const [range, setRange] = useState<StatsRange>('todo');

  const summary = useMemo(() => {
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
    return selectNutritionSummary(input);
  }, [profile, settings]);

  return (
    <div className={styles.tab}>
      <div className={styles.tabHead}>
        <h2 className={styles.tabTitle}>Objetivo nutricional</h2>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {!summary ? (
        <p className={styles.empty}>Cargando tu objetivo…</p>
      ) : (
        <>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Objetivo diario</span>
              <span className={styles.metricValue}>{Math.round(summary.targetKcal)} kcal</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Gasto (TDEE)</span>
              <span className={styles.metricValue}>{Math.round(summary.tdee)} kcal</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Déficit</span>
              <span className={styles.metricValue}>{Math.round(summary.deficitPct * 100)} %</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Proteína</span>
              <span className={styles.metricValue}>{Math.round(summary.proteinG)} g</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Carbohidratos</span>
              <span className={styles.metricValue}>{Math.round(summary.carbsG)} g</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Grasa</span>
              <span className={styles.metricValue}>{Math.round(summary.fatG)} g</span>
            </div>
          </div>

          {summary.warning && (
            <p className={styles.warning}>{WARNING_TEXT[summary.warning]}</p>
          )}
        </>
      )}
    </div>
  );
}
