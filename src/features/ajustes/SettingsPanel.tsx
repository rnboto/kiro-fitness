// Panel de Ajustes (design §5, §6.1, §8.2). Edita el factor de actividad, los
// g/kg de proteína, el modo avanzado de base BMR (lbm|mme, default lbm), la hora
// de entreno (clamp 05:00–10:00), el descanso por defecto (45–60 s) y los
// overrides de imágenes por ejercicio. Persiste vía SettingsContext.

import { useMemo, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import type { Settings } from '../../storage';
import { routine } from '../../domain/routine';
import NumberStepper from '../../components/NumberStepper';
import Slider from '../../components/Slider';
import AboutFooter from './AboutFooter';
import styles from './SettingsPanel.module.css';

/** Clampa 'HH:mm' al rango matutino 05:00–10:00 (design §6.2). */
function clampTrainingStart(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return '07:00';
  let minutes = Number(match[1]) * 60 + Number(match[2]);
  minutes = Math.min(10 * 60, Math.max(5 * 60, minutes));
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export default function SettingsPanel() {
  const { settings, updateSettings } = useSettings();
  // Lista de ejercicios únicos de la rutina (para los overrides de imágenes).
  const exercises = useMemo(() => {
    const seen = new Map<string, string>();
    for (const day of routine) {
      for (const ex of day.exercises) if (!seen.has(ex.id)) seen.set(ex.id, ex.name);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, []);
  const [openOverride, setOpenOverride] = useState<string | null>(null);

  if (!settings) {
    return <p className={styles.loading}>Cargando ajustes…</p>;
  }

  const patch = (next: Partial<Settings>) => {
    void updateSettings({ ...settings, ...next });
  };

  const setOverride = (
    exerciseId: string,
    field: 'imageUrl' | 'endImageUrl',
    value: string,
  ) => {
    const existing = settings.exerciseOverrides[exerciseId] ?? {};
    const trimmed = value.trim();
    const nextEntry = { ...existing, [field]: trimmed === '' ? undefined : trimmed };
    const nextOverrides = { ...settings.exerciseOverrides };
    if (!nextEntry.imageUrl && !nextEntry.endImageUrl) {
      delete nextOverrides[exerciseId];
    } else {
      nextOverrides[exerciseId] = nextEntry;
    }
    patch({ exerciseOverrides: nextOverrides });
  };

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ajustes</h1>
        <p className={styles.subtitle}>Afina tu cálculo y tus entrenamientos.</p>
      </header>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Nutrición</h2>
        <NumberStepper
          label="Factor de actividad"
          value={settings.activityFactor}
          onChange={(v) => patch({ activityFactor: v })}
          min={1.2}
          max={1.9}
          step={0.025}
          decimals={3}
          id="activityFactor"
        />
        <NumberStepper
          label="Proteína"
          unit="g/kg"
          value={settings.proteinGPerKg}
          onChange={(v) => patch({ proteinGPerKg: v })}
          min={1.2}
          max={3.0}
          step={0.1}
          decimals={1}
          id="proteinGPerKg"
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Avanzado</h2>
        <label className={styles.toggleRow} htmlFor="bmrBasis">
          <span>
            Base del cálculo BMR
            <span className={styles.hint}>
              {settings.bmrBasis === 'lbm'
                ? 'Masa magra total (recomendado)'
                : 'Masa muscular esquelética (MME)'}
            </span>
          </span>
          <select
            id="bmrBasis"
            className={styles.select}
            value={settings.bmrBasis}
            onChange={(e) => patch({ bmrBasis: e.target.value as 'lbm' | 'mme' })}
          >
            <option value="lbm">Masa magra (LBM)</option>
            <option value="mme">MME</option>
          </select>
        </label>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Entrenamiento</h2>
        <label className={styles.field} htmlFor="trainingStart">
          <span>Hora de inicio (05:00–10:00)</span>
          <input
            id="trainingStart"
            type="time"
            min="05:00"
            max="10:00"
            value={settings.trainingStart}
            onChange={(e) => patch({ trainingStart: e.target.value })}
            onBlur={(e) => patch({ trainingStart: clampTrainingStart(e.target.value) })}
          />
        </label>
        <Slider
          label="Descanso por defecto"
          unit="s"
          value={settings.restSeconds}
          onChange={(v) => patch({ restSeconds: v })}
          min={45}
          max={60}
          step={1}
          id="restSeconds"
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Imágenes de ejercicios</h2>
        <p className={styles.hint}>
          Pega la URL de un GIF o imagen propia para sustituir la ilustración por
          defecto de cualquier ejercicio.
        </p>
        <ul className={styles.overrideList}>
          {exercises.map((ex) => {
            const ov = settings.exerciseOverrides[ex.id];
            const custom = Boolean(ov?.imageUrl || ov?.endImageUrl);
            const open = openOverride === ex.id;
            return (
              <li key={ex.id} className={styles.overrideItem}>
                <button
                  type="button"
                  className={styles.overrideHead}
                  aria-expanded={open}
                  onClick={() => setOpenOverride(open ? null : ex.id)}
                >
                  <span>{ex.name}</span>
                  <span className={styles.badge}>
                    {custom ? 'Personalizada' : 'Por defecto'}
                  </span>
                </button>
                {open && (
                  <div className={styles.overrideFields}>
                    <label className={styles.field}>
                      <span>Imagen inicio (URL)</span>
                      <input
                        type="url"
                        placeholder="https://…/0.jpg"
                        defaultValue={ov?.imageUrl ?? ''}
                        onBlur={(e) => setOverride(ex.id, 'imageUrl', e.target.value)}
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Imagen fin (URL)</span>
                      <input
                        type="url"
                        placeholder="https://…/1.jpg"
                        defaultValue={ov?.endImageUrl ?? ''}
                        onBlur={(e) => setOverride(ex.id, 'endImageUrl', e.target.value)}
                      />
                    </label>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <AboutFooter />
    </div>
  );
}
