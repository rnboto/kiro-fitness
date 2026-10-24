// Hoja "Cambiar ejercicio" (Lista de Sustitución de Ejercicios). Reutiliza el
// Modal: título = patrón de movimiento, alcance "Solo hoy" (default) / "Dejar
// fijo" con radios nativos, y la lista de equivalentes con miniatura (0.jpg,
// lazy, placeholder ante error), nombre y material. Un toque en un equivalente
// aplica el cambio y cierra.

import { useEffect, useId, useState } from 'react';
import Modal from '../../components/Modal';
import { defaultImageUrl } from '../../domain/routine';
import type { SubstituteExercise, SubstitutionGroup } from '../../domain/exerciseSubstitutions';
import type { ExerciseSwapScope } from '../../storage';
import { Placeholder } from './ExerciseCard';
import styles from './ExerciseSwapSheet.module.css';

interface ExerciseSwapSheetProps {
  open: boolean;
  group: SubstitutionGroup | null;
  currentName: string;
  alternatives: SubstituteExercise[];
  onPick: (key: string, scope: ExerciseSwapScope) => void;
  onClose: () => void;
}

const DIFFICULTY_LABEL: Record<NonNullable<SubstituteExercise['difficulty']>, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

function Thumb({ ex }: { ex: SubstituteExercise }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <Placeholder name={ex.name} phase="Inicio" compact className={styles.thumb} />;
  }
  return (
    <img
      className={styles.thumb}
      src={defaultImageUrl(ex.freeExerciseDbId)}
      alt=""
      width={64}
      height={64}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function ExerciseSwapSheet({
  open,
  group,
  currentName,
  alternatives,
  onPick,
  onClose,
}: ExerciseSwapSheetProps) {
  const [scope, setScope] = useState<ExerciseSwapScope>('hoy');
  const radioName = useId();

  // Cada apertura empieza en "Solo hoy".
  useEffect(() => {
    if (open) setScope('hoy');
  }, [open]);

  return (
    <Modal open={open} title={group?.name ?? 'Cambiar ejercicio'} onClose={onClose}>
      <p className={styles.hint}>Elige uno si el original está ocupado</p>
      <p className={styles.current}>Ahora: {currentName}</p>

      <fieldset className={styles.scope}>
        <legend className={styles.legend}>¿Cuánto tiempo?</legend>
        <div className={styles.scopeOptions}>
          <label className={`${styles.scopeOption} ${scope === 'hoy' ? styles.scopeActive : ''}`}>
            <input
              type="radio"
              name={radioName}
              value="hoy"
              checked={scope === 'hoy'}
              onChange={() => setScope('hoy')}
            />
            Solo hoy
          </label>
          <label className={`${styles.scopeOption} ${scope === 'fijo' ? styles.scopeActive : ''}`}>
            <input
              type="radio"
              name={radioName}
              value="fijo"
              checked={scope === 'fijo'}
              onChange={() => setScope('fijo')}
            />
            Dejar fijo
          </label>
        </div>
      </fieldset>

      {alternatives.length === 0 ? (
        <p className={styles.empty}>No hay alternativas disponibles para este ejercicio.</p>
      ) : (
        <ul className={styles.list}>
          {alternatives.map((ex) => (
            <li key={ex.key}>
              <button
                type="button"
                className={styles.option}
                aria-label={`Elegir ${ex.name}`}
                onClick={() => onPick(ex.key, scope)}
              >
                <Thumb ex={ex} />
                <span className={styles.info}>
                  <span className={styles.name}>{ex.name}</span>
                  <span className={styles.badges}>
                    <span className={styles.equipment}>{ex.equipment}</span>
                    {ex.difficulty && (
                      <span className={styles.difficulty}>{DIFFICULTY_LABEL[ex.difficulty]}</span>
                    )}
                  </span>
                  {ex.notes && <span className={styles.notes}>{ex.notes}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
