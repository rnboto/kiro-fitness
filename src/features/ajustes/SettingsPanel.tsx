// Panel de Ajustes (design §5, §6.1, §8.2). Edita el factor de actividad, los
// g/kg de proteína, el modo avanzado de base BMR (lbm|mme, default lbm), la hora
// de entreno (clamp 05:00–10:00), el descanso por defecto (45–60 s) y los
// overrides de imágenes por ejercicio. Persiste vía SettingsContext.

import { useMemo, useRef, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import type { Settings } from '../../storage';
import { exportAll, importMerge, importReplace } from '../../storage';
import {
  parseBackup,
  serializeBackup,
  toCsv,
  type KiroBackup,
} from '../../domain/dataPorting';
import { routine } from '../../domain/routine';
import NumberStepper from '../../components/NumberStepper';
import Slider from '../../components/Slider';
import Modal from '../../components/Modal';
import AboutFooter from './AboutFooter';
import styles from './SettingsPanel.module.css';

/** Descarga un Blob con nombre de archivo (sin librerías externas). */
function downloadBlob(filename: string, mime: string, text: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 'YYYY-MM-DD' de una fecha local (para nombres de archivo). */
function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Inicio del rango por preset Semana/Mes a partir de hoy. */
function presetFrom(preset: 'semana' | 'mes'): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (preset === 'semana' ? 6 : 29));
  return d.toISOString().slice(0, 10);
}

type CsvRange = 'semana' | 'mes' | 'personalizado';

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

  // --- Export / Import ---
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvRange, setCsvRange] = useState<CsvRange>('mes');
  const [csvFrom, setCsvFrom] = useState<string>(presetFrom('mes'));
  const [csvTo, setCsvTo] = useState<string>(todayStamp());
  const [pendingBackup, setPendingBackup] = useState<KiroBackup | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExportJson = async () => {
    setBusy(true);
    try {
      const backup = await exportAll();
      downloadBlob(
        `kiro-backup-${todayStamp()}.json`,
        'application/json',
        serializeBackup(backup),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleExportCsv = async () => {
    setBusy(true);
    try {
      const from =
        csvRange === 'personalizado' ? new Date(csvFrom) : new Date(presetFrom(csvRange));
      const to = csvRange === 'personalizado' ? new Date(csvTo) : new Date();
      const backup = await exportAll();
      const csv = toCsv(
        {
          profiles: backup.profiles,
          sets: backup.sets,
          cardio: backup.cardio,
          settings: backup.settings,
        },
        from,
        to,
      );
      downloadBlob(`kiro-datos-${todayStamp()}.csv`, 'text/csv;charset=utf-8', csv);
    } finally {
      setBusy(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reseleccionar el mismo archivo
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseBackup(String(reader.result ?? ''));
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      setPendingBackup(result.backup);
    };
    reader.onerror = () => setImportError('No se pudo leer el archivo.');
    reader.readAsText(file);
  };

  const applyImport = async (mode: 'merge' | 'replace') => {
    if (!pendingBackup) return;
    setBusy(true);
    try {
      if (mode === 'merge') await importMerge(pendingBackup);
      else await importReplace(pendingBackup);
      setPendingBackup(null);
      // Recarga para que contexts y listas reflejen los datos importados.
      window.location.reload();
    } catch {
      setImportError('No se pudieron importar los datos. No se ha modificado nada.');
      setBusy(false);
    }
  };

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

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Datos y copias de seguridad</h2>
        <p className={styles.hint}>
          Exporta tus datos para compartirlos o guardarlos, o impórtalos en este
          dispositivo. Todo se procesa en local.
        </p>

        <button
          type="button"
          className={styles.dataBtn}
          onClick={handleExportJson}
          disabled={busy}
        >
          Exportar todo (JSON)
        </button>

        <div className={styles.dataGroup}>
          <span className={styles.dataGroupTitle}>Exportar por rango (CSV)</span>
          <div className={styles.rangeChips} role="group" aria-label="Rango del CSV">
            {(['semana', 'mes', 'personalizado'] as CsvRange[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`${styles.chip} ${csvRange === r ? styles.chipActive : ''}`}
                aria-pressed={csvRange === r}
                onClick={() => setCsvRange(r)}
              >
                {r === 'semana' ? 'Semana' : r === 'mes' ? 'Mes' : 'Personalizado'}
              </button>
            ))}
          </div>
          {csvRange === 'personalizado' && (
            <div className={styles.dateRow}>
              <label className={styles.field}>
                <span>Desde</span>
                <input
                  type="date"
                  value={csvFrom}
                  max={csvTo}
                  onChange={(e) => setCsvFrom(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Hasta</span>
                <input
                  type="date"
                  value={csvTo}
                  min={csvFrom}
                  onChange={(e) => setCsvTo(e.target.value)}
                />
              </label>
            </div>
          )}
          <button
            type="button"
            className={styles.dataBtn}
            onClick={handleExportCsv}
            disabled={busy}
          >
            Descargar CSV
          </button>
        </div>

        <div className={styles.dataGroup}>
          <span className={styles.dataGroupTitle}>Importar datos (JSON)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className={styles.fileInput}
            onChange={handleFile}
          />
          <button
            type="button"
            className={styles.dataBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            Elegir archivo…
          </button>
          {importError && (
            <p className={styles.importError} role="alert">
              {importError}
            </p>
          )}
        </div>
      </section>

      <Modal
        open={pendingBackup !== null}
        title="Importar datos"
        onClose={() => setPendingBackup(null)}
      >
        <div className={styles.confirmBody}>
          <p>
            ¿Cómo quieres importar los datos del archivo? <strong>Fusionar</strong>{' '}
            añade lo que falte sin borrar nada. <strong>Reemplazar</strong> borra
            todos tus datos actuales y carga solo los del archivo.
          </p>
          <div className={styles.confirmActions}>
            <button
              type="button"
              className={styles.dataBtn}
              onClick={() => void applyImport('merge')}
              disabled={busy}
            >
              Fusionar
            </button>
            <button
              type="button"
              className={styles.dangerBtn}
              onClick={() => void applyImport('replace')}
              disabled={busy}
            >
              Reemplazar (borra lo actual)
            </button>
          </div>
        </div>
      </Modal>

      <AboutFooter />
    </div>
  );
}
