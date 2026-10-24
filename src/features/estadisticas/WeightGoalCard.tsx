// Tarjeta "Objetivo de peso" (Estadísticas · Cuerpo): fija un objetivo desde el
// peso actual (atajos o valor propio), muestra el progreso, el ritmo real
// (tendencia lineal de 28 días) y una estimación honesta de semanas restantes.
// Las matemáticas viven en domain/goal.ts; el objetivo se guarda en Settings.

import { useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import { useProfile } from '../../context/ProfileContext';
import { useSettings } from '../../context/SettingsContext';
import {
  computeGoalProgress,
  computeWeightPace,
  estimateWeeksRemaining,
  quickGoalOptions,
  readGoal,
  round1,
  validateGoalTarget,
  type WeeksEstimate,
} from '../../domain/goal';
import styles from './WeightGoalCard.module.css';

/** kg/semana con signo y hasta 2 decimales (es-ES). */
function formatPace(kgPerWeek: number): string {
  const abs = Math.abs(kgPerWeek).toLocaleString('es-ES', { maximumFractionDigits: 2 });
  const sign = kgPerWeek > 0 ? '+' : kgPerWeek < 0 ? '−' : '';
  return `${sign}${abs}`;
}

function paceText(eta: WeeksEstimate): string {
  switch (eta.status) {
    case 'insufficient':
      return 'Registra al menos dos mediciones con 7 días de diferencia para estimar el ritmo.';
    case 'flat':
      return `Tu ritmo de las últimas 4 semanas es prácticamente plano (${formatPace(eta.kgPerWeek)} kg/semana). Aún no se puede estimar cuándo llegarás.`;
    case 'wrongDirection':
      return `En las últimas 4 semanas vas en sentido contrario al objetivo (${formatPace(eta.kgPerWeek)} kg/semana). Revisa dieta y constancia.`;
    case 'ok':
      return `Ritmo: ${formatPace(eta.kgPerWeek)} kg/semana · Tiempo estimado: ≈ ${Math.ceil(eta.weeks)} semanas.`;
    default:
      return '';
  }
}

export default function WeightGoalCard() {
  const { profile, history } = useProfile();
  const { settings, updateSettings } = useSettings();
  const [changing, setChanging] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customError, setCustomError] = useState<string | undefined>();
  const [confirmRemove, setConfirmRemove] = useState(false);

  const goal = readGoal(settings);
  const currentKg = profile?.weightKg ?? 0;

  const progress = useMemo(() => {
    if (!profile || goal.goalWeightKg === null) return null;
    return computeGoalProgress({
      startKg: goal.goalStartWeightKg ?? profile.weightKg,
      currentKg: profile.weightKg,
      goalKg: goal.goalWeightKg,
    });
  }, [profile, goal.goalWeightKg, goal.goalStartWeightKg]);

  const eta = useMemo(
    () => (progress ? estimateWeeksRemaining(progress, computeWeightPace(history)) : null),
    [progress, history],
  );

  if (!profile || !settings) return null;

  const saveGoal = async (targetKg: number) => {
    await updateSettings({
      ...settings,
      goalWeightKg: round1(targetKg),
      goalStartWeightKg: currentKg,
    });
    setChanging(false);
    setCustomText('');
    setCustomError(undefined);
  };

  const removeGoal = async () => {
    await updateSettings({ ...settings, goalWeightKg: null, goalStartWeightKg: null });
    setConfirmRemove(false);
    setChanging(false);
  };

  const customValue = customText.trim() === '' ? NaN : Number(customText);
  const customCheck =
    customText.trim() === '' ? {} : validateGoalTarget(customValue, currentKg);

  const submitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateGoalTarget(customValue, currentKg);
    if (check.error) {
      setCustomError(check.error);
      return;
    }
    void saveGoal(customValue);
  };

  const showSetter = goal.goalWeightKg === null || changing;

  return (
    <section className={styles.card} aria-labelledby="goal-title">
      <h2 id="goal-title" className={styles.title}>
        Objetivo de peso
      </h2>

      {showSetter ? (
        <>
          <p className={styles.helper}>
            Tu peso actual: {currentKg} kg. Elige cuánto quieres bajar o escribe tu peso objetivo.
          </p>

          <div className={styles.chips} role="group" aria-label="Objetivos rápidos">
            {quickGoalOptions(currentKg).map((o) => (
              <button
                key={o.deltaKg}
                type="button"
                className={styles.chip}
                onClick={() => void saveGoal(o.targetKg)}
              >
                <span>{o.label}</span>
                <span className={styles.chipSub} aria-hidden="true">
                  → {o.targetKg} kg
                </span>
              </button>
            ))}
          </div>

          <form className={styles.custom} onSubmit={submitCustom} noValidate>
            <label htmlFor="goal-target">Peso objetivo (kg)</label>
            <div className={styles.customRow}>
              <input
                id="goal-target"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={customText}
                onChange={(e) => {
                  setCustomText(e.target.value);
                  setCustomError(undefined);
                }}
                aria-invalid={!!customError}
              />
              <button type="submit" className={styles.primaryBtn}>
                Fijar objetivo
              </button>
            </div>
            {customError && (
              <p role="alert" className={styles.error}>
                {customError}
              </p>
            )}
            {!customError && customCheck.warning && (
              <p className={styles.warning}>{customCheck.warning}</p>
            )}
          </form>

          {changing && (
            <button type="button" className={styles.secondaryBtn} onClick={() => setChanging(false)}>
              Cancelar
            </button>
          )}
        </>
      ) : (
        progress &&
        eta &&
        goal.goalWeightKg !== null && (
          <>
            <dl className={styles.metrics}>
              <div className={styles.metric}>
                <dt>Inicio</dt>
                <dd>{goal.goalStartWeightKg ?? currentKg} kg</dd>
              </div>
              <div className={styles.metric}>
                <dt>Actual</dt>
                <dd>{currentKg} kg</dd>
              </div>
              <div className={styles.metric}>
                <dt>Objetivo</dt>
                <dd>{goal.goalWeightKg} kg</dd>
              </div>
              <div className={styles.metric}>
                <dt>{progress.direction === 'loss' ? 'Perdido' : 'Ganado'}</dt>
                <dd>{progress.changedKg} kg</dd>
              </div>
              <div className={styles.metric}>
                <dt>Restante</dt>
                <dd>{progress.remainingKg} kg</dd>
              </div>
            </dl>

            <div className={styles.progressRow}>
              <div
                className={styles.track}
                role="progressbar"
                aria-label="Progreso del objetivo"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress.progressPct)}
              >
                <div className={styles.fill} style={{ width: `${progress.progressPct}%` }} />
              </div>
              <span className={styles.pct}>{Math.round(progress.progressPct)} %</span>
            </div>

            {progress.reached ? (
              <p className={styles.reached}>
                Objetivo alcanzado. Has llegado a {goal.goalWeightKg} kg: buen trabajo. Mantén la
                constancia o fija un nuevo objetivo.
              </p>
            ) : (
              <p className={styles.pace}>{paceText(eta)}</p>
            )}

            <div className={styles.actions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setChanging(true)}>
                Cambiar objetivo
              </button>
              <button type="button" className={styles.dangerBtn} onClick={() => setConfirmRemove(true)}>
                Quitar objetivo
              </button>
            </div>
          </>
        )
      )}

      <Modal open={confirmRemove} title="Quitar objetivo" onClose={() => setConfirmRemove(false)}>
        <div className={styles.confirmBody}>
          <p>¿Quieres quitar tu objetivo de peso? Podrás fijar otro cuando quieras.</p>
          <div className={styles.confirmActions}>
            <button type="button" className={styles.secondaryBtn} onClick={() => setConfirmRemove(false)}>
              Cancelar
            </button>
            <button type="button" className={styles.dangerBtn} onClick={() => void removeGoal()}>
              Sí, quitar
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
