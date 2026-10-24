// Historial de mediciones (Estadísticas · Cuerpo): lista de todas las entradas
// (más reciente primero) con acciones Editar y Borrar. Editar abre el mismo
// formulario validado en un Modal; Borrar pide confirmación. Nunca se permite
// borrar la última medición (el onboarding no debe reactivarse por accidente).

import { useState } from 'react';
import Modal from '../../components/Modal';
import { useProfile } from '../../context/ProfileContext';
import {
  canDeleteMeasurement,
  MIN_MEASUREMENTS_MESSAGE,
  profileDayKey,
  sortProfileHistory,
} from '../../domain/profileHistory';
import type { ProfileEntry } from '../../storage';
import MeasurementForm from './MeasurementForm';
import styles from './MeasurementHistory.module.css';
import tabs from './tabs.module.css';

export default function MeasurementHistory() {
  const { history, profile, deleteMeasurement } = useProfile();
  const [editing, setEditing] = useState<ProfileEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProfileEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = sortProfileHistory(history).reverse();
  const canDelete = canDeleteMeasurement(history);

  const closeDelete = () => {
    setPendingDelete(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      const ok = await deleteMeasurement(pendingDelete.id);
      if (ok) closeDelete();
      else setDeleteError(MIN_MEASUREMENTS_MESSAGE);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={tabs.card} aria-labelledby="history-title">
      <h2 id="history-title" className={styles.title}>
        Historial de mediciones
      </h2>

      <ul className={styles.list}>
        {rows.map((e) => {
          const day = profileDayKey(e.date);
          return (
            <li key={e.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.date}>{day}</span>
                {e.id === profile?.id && <span className={styles.badge}>Actual</span>}
              </div>
              <dl className={styles.values}>
                <div>
                  <dt>Peso</dt>
                  <dd>{e.weightKg} kg</dd>
                </div>
                <div>
                  <dt>% grasa</dt>
                  <dd>{e.bodyFatPct} %</dd>
                </div>
                <div>
                  <dt>MME</dt>
                  <dd>{e.mmeKg} kg</dd>
                </div>
                <div>
                  <dt>Altura</dt>
                  <dd>{e.heightCm} cm</dd>
                </div>
                <div>
                  <dt>Edad</dt>
                  <dd>{e.age} años</dd>
                </div>
              </dl>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  aria-label={`Editar medición del ${day} (${e.weightKg} kg)`}
                  onClick={() => setEditing(e)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className={styles.dangerBtn}
                  aria-label={`Borrar medición del ${day} (${e.weightKg} kg)`}
                  aria-describedby={canDelete ? undefined : 'history-min-hint'}
                  disabled={!canDelete}
                  onClick={() => setPendingDelete(e)}
                >
                  Borrar
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {!canDelete && (
        <p id="history-min-hint" className={styles.hint}>
          {MIN_MEASUREMENTS_MESSAGE}
        </p>
      )}

      <Modal open={editing !== null} title="Editar medición" onClose={() => setEditing(null)}>
        {editing && (
          <MeasurementForm key={editing.id} entry={editing} onDone={() => setEditing(null)} />
        )}
      </Modal>

      <Modal open={pendingDelete !== null} title="Borrar medición" onClose={closeDelete}>
        {pendingDelete && (
          <div className={styles.confirmBody}>
            <p>
              ¿Seguro que quieres borrar la medición del {profileDayKey(pendingDelete.date)}? Esta
              acción no se puede deshacer.
            </p>
            {deleteError && (
              <p role="alert" className={styles.errorText}>
                {deleteError}
              </p>
            )}
            <div className={styles.confirmActions}>
              <button type="button" className={styles.secondaryBtn} onClick={closeDelete}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                disabled={busy}
                onClick={confirmDelete}
              >
                Sí, borrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
