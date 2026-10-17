// Mapa de calor muscular (design §8.6). SVG hecho a mano con dos siluetas
// (frontal y trasera). Cada región es un <path> con id semántico (MuscleId).
// Resalta las regiones de activeMuscles; el resto queda atenuado.
// Front: chest, shoulders, biceps, quads, abs, calves.
// Back:  back, triceps, glutes, hamstrings, calves.

import type { MuscleId } from '../../domain/routine';
import styles from './MuscleHeatMap.module.css';

interface MuscleHeatMapProps {
  activeMuscles: MuscleId[];
}

const MUSCLE_LABEL: Record<MuscleId, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quads: 'Cuádriceps',
  hamstrings: 'Femorales',
  glutes: 'Glúteos',
  calves: 'Gemelos',
  abs: 'Abdomen',
  traps: 'Trapecio',
  forearms: 'Antebrazos',
};

export default function MuscleHeatMap({ activeMuscles }: MuscleHeatMapProps) {
  const active = new Set(activeMuscles);
  const regionClass = (id: MuscleId) =>
    `${styles.region} ${active.has(id) ? styles.active : ''}`;

  return (
    <div className={styles.wrap}>
      {/* Vista frontal */}
      <figure className={styles.figure}>
        <svg
          viewBox="0 0 120 260"
          className={styles.svg}
          role="img"
          aria-label="Músculos trabajados, vista frontal"
        >
          {/* Silueta base */}
          <g className={styles.silhouette} aria-hidden="true">
            <circle cx="60" cy="22" r="13" />
            <rect x="40" y="36" width="40" height="70" rx="12" />
            <rect x="30" y="40" width="16" height="70" rx="8" />
            <rect x="74" y="40" width="16" height="70" rx="8" />
            <rect x="44" y="104" width="14" height="80" rx="7" />
            <rect x="62" y="104" width="14" height="80" rx="7" />
          </g>

          {/* Hombros */}
          <path id="shoulders" className={regionClass('shoulders')}
            d="M32 44 h18 v14 h-18 z M70 44 h18 v14 h-18 z" />
          {/* Pecho */}
          <path id="chest" className={regionClass('chest')}
            d="M42 46 h36 v22 h-36 z" />
          {/* Bíceps */}
          <path id="biceps" className={regionClass('biceps')}
            d="M31 60 h14 v24 h-14 z M75 60 h14 v24 h-14 z" />
          {/* Antebrazos (frontal) */}
          <path id="forearms" className={regionClass('forearms')}
            d="M31 86 h14 v22 h-14 z M75 86 h14 v22 h-14 z" />
          {/* Abdomen */}
          <path id="abs" className={regionClass('abs')}
            d="M46 70 h28 v30 h-28 z" />
          {/* Cuádriceps */}
          <path id="quads" className={regionClass('quads')}
            d="M44 106 h14 v52 h-14 z M62 106 h14 v52 h-14 z" />
          {/* Gemelos (frontal: espinilla/gemelo) */}
          <path id="calves-front" className={regionClass('calves')}
            d="M45 162 h12 v20 h-12 z M63 162 h12 v20 h-12 z" />
        </svg>
        <figcaption className={styles.caption}>Frontal</figcaption>
      </figure>

      {/* Vista trasera */}
      <figure className={styles.figure}>
        <svg
          viewBox="0 0 120 260"
          className={styles.svg}
          role="img"
          aria-label="Músculos trabajados, vista trasera"
        >
          <g className={styles.silhouette} aria-hidden="true">
            <circle cx="60" cy="22" r="13" />
            <rect x="40" y="36" width="40" height="70" rx="12" />
            <rect x="30" y="40" width="16" height="70" rx="8" />
            <rect x="74" y="40" width="16" height="70" rx="8" />
            <rect x="44" y="104" width="14" height="80" rx="7" />
            <rect x="62" y="104" width="14" height="80" rx="7" />
          </g>

          {/* Trapecio (parte alta de la espalda / cuello) */}
          <path id="traps" className={regionClass('traps')}
            d="M46 38 h28 v8 h-28 z" />
          {/* Espalda */}
          <path id="back" className={regionClass('back')}
            d="M42 46 h36 v34 h-36 z" />
          {/* Tríceps */}
          <path id="triceps" className={regionClass('triceps')}
            d="M31 56 h14 v26 h-14 z M75 56 h14 v26 h-14 z" />
          {/* Antebrazos (trasero) */}
          <path id="forearms" className={regionClass('forearms')}
            d="M31 86 h14 v22 h-14 z M75 86 h14 v22 h-14 z" />
          {/* Glúteos */}
          <path id="glutes" className={regionClass('glutes')}
            d="M44 94 h32 v22 h-32 z" />
          {/* Femorales */}
          <path id="hamstrings" className={regionClass('hamstrings')}
            d="M44 118 h14 v42 h-14 z M62 118 h14 v42 h-14 z" />
          {/* Gemelos (trasero) */}
          <path id="calves-back" className={regionClass('calves')}
            d="M45 162 h12 v22 h-12 z M63 162 h12 v22 h-12 z" />
        </svg>
        <figcaption className={styles.caption}>Trasera</figcaption>
      </figure>

      <ul className={styles.legend} aria-label="Grupos musculares del día">
        {activeMuscles.map((m) => (
          <li key={m} className={styles.legendItem}>
            {MUSCLE_LABEL[m]}
          </li>
        ))}
      </ul>
    </div>
  );
}
