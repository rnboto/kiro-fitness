// Mapa de calor muscular (design §8.6). SVG hecho a mano con dos siluetas
// anatómicas estilizadas (frontal y trasera), estilo carta de culturismo.
// Cada grupo muscular es un <path>/<g> con data-muscle="<MuscleId>" y la clase
// regionClass para resaltarse cuando está en activeMuscles. Las regiones
// bilaterales (izq+der) resaltan juntas con el mismo MuscleId.
// Front: traps(cuello), shoulders, chest, biceps, forearms, abs, quads, calves.
// Back:  traps, back(dorsales), shoulders(deltoide post.), triceps, forearms,
//        glutes, hamstrings, calves.

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
      {/* ---------------- Vista frontal ---------------- */}
      <figure className={styles.figure}>
        <svg
          viewBox="0 0 200 440"
          className={styles.svg}
          role="img"
          aria-label="Músculos trabajados, vista frontal"
        >
          {/* Silueta base del cuerpo (contorno) */}
          <g className={styles.silhouette} aria-hidden="true">
            {/* Cabeza */}
            <ellipse cx="100" cy="34" rx="20" ry="24" />
            {/* Cuello */}
            <path d="M89 54 h22 v16 h-22 z" />
            {/* Torso */}
            <path d="M60 72
                     C58 86 56 118 58 150
                     C60 182 66 196 70 206
                     L130 206
                     C134 196 140 182 142 150
                     C144 118 142 86 140 72
                     C128 64 72 64 60 72 Z" />
            {/* Brazo izquierdo */}
            <path d="M60 74 C44 82 36 110 34 140 C33 168 36 190 42 206
                     L54 206 C50 184 50 150 56 118 C59 100 62 86 64 78 Z" />
            {/* Brazo derecho */}
            <path d="M140 74 C156 82 164 110 166 140 C167 168 164 190 158 206
                     L146 206 C150 184 150 150 144 118 C141 100 138 86 136 78 Z" />
            {/* Pierna izquierda */}
            <path d="M72 206 C70 250 72 300 76 348 C78 384 80 408 82 424
                     L96 424 C97 388 98 300 98 254 C98 232 96 216 94 206 Z" />
            {/* Pierna derecha */}
            <path d="M128 206 C130 250 128 300 124 348 C122 384 120 408 118 424
                     L104 424 C103 388 102 300 102 254 C102 232 104 216 106 206 Z" />
          </g>

          {/* Trapecio (pendiente del cuello, visible de frente) */}
          <path data-muscle="traps" className={regionClass('traps')}
            d="M82 66 C90 60 110 60 118 66 C112 72 104 74 100 74
               C96 74 88 72 82 66 Z" />

          {/* Deltoides (hombros) L+R */}
          <path data-muscle="shoulders" className={regionClass('shoulders')}
            d="M60 74 C50 76 44 86 42 100 C50 96 58 90 66 86 C64 80 62 76 60 74 Z
               M140 74 C150 76 156 86 158 100 C150 96 142 90 134 86 C136 80 138 76 140 74 Z" />

          {/* Pectorales (pecho) L+R */}
          <path data-muscle="chest" className={regionClass('chest')}
            d="M68 80 C78 76 94 76 98 82 L98 108 C88 112 76 110 68 102
               C64 94 64 86 68 80 Z
               M132 80 C122 76 106 76 102 82 L102 108 C112 112 124 110 132 102
               C136 94 136 86 132 80 Z" />

          {/* Bíceps L+R */}
          <path data-muscle="biceps" className={regionClass('biceps')}
            d="M44 102 C40 116 40 132 44 146 C50 144 54 140 56 132
               C56 120 54 110 52 104 C50 102 46 101 44 102 Z
               M156 102 C160 116 160 132 156 146 C150 144 146 140 144 132
               C144 120 146 110 148 104 C150 102 154 101 156 102 Z" />

          {/* Antebrazos L+R */}
          <path data-muscle="forearms" className={regionClass('forearms')}
            d="M43 150 C40 166 40 184 44 200 L52 200 C54 184 54 166 52 150
               C49 148 46 148 43 150 Z
               M157 150 C160 166 160 184 156 200 L148 200 C146 184 146 166 148 150
               C151 148 154 148 157 150 Z" />

          {/* Recto abdominal (abs) segmentado */}
          <g data-muscle="abs" className={regionClass('abs')}>
            <path d="M90 112 h20 v12 h-20 z" />
            <path d="M90 128 h20 v12 h-20 z" />
            <path d="M90 144 h20 v12 h-20 z" />
            <path d="M90 160 C90 172 94 182 100 188 C106 182 110 172 110 160 Z" />
          </g>

          {/* Cuádriceps L+R */}
          <path data-muscle="quads" className={regionClass('quads')}
            d="M76 212 C72 250 74 290 82 322 C88 316 92 304 94 288
               C96 262 94 236 92 214 C87 211 81 211 76 212 Z
               M124 212 C128 250 126 290 118 322 C112 316 108 304 106 288
               C104 262 106 236 108 214 C113 211 119 211 124 212 Z" />

          {/* Gemelos / espinilla (calves) frontal L+R */}
          <path data-muscle="calves" className={regionClass('calves')}
            d="M82 332 C80 358 82 384 86 406 C90 400 92 388 93 374
               C93 358 91 344 89 334 C87 332 84 331 82 332 Z
               M118 332 C120 358 118 384 114 406 C110 400 108 388 107 374
               C107 358 109 344 111 334 C113 332 116 331 118 332 Z" />
        </svg>
        <figcaption className={styles.caption}>Frontal</figcaption>
      </figure>

      {/* ---------------- Vista trasera ---------------- */}
      <figure className={styles.figure}>
        <svg
          viewBox="0 0 200 440"
          className={styles.svg}
          role="img"
          aria-label="Músculos trabajados, vista trasera"
        >
          {/* Silueta base del cuerpo (contorno), misma forma que frontal */}
          <g className={styles.silhouette} aria-hidden="true">
            <ellipse cx="100" cy="34" rx="20" ry="24" />
            <path d="M89 54 h22 v16 h-22 z" />
            <path d="M60 72
                     C58 86 56 118 58 150
                     C60 182 66 196 70 206
                     L130 206
                     C134 196 140 182 142 150
                     C144 118 142 86 140 72
                     C128 64 72 64 60 72 Z" />
            <path d="M60 74 C44 82 36 110 34 140 C33 168 36 190 42 206
                     L54 206 C50 184 50 150 56 118 C59 100 62 86 64 78 Z" />
            <path d="M140 74 C156 82 164 110 166 140 C167 168 164 190 158 206
                     L146 206 C150 184 150 150 144 118 C141 100 138 86 136 78 Z" />
            <path d="M72 206 C70 250 72 300 76 348 C78 384 80 408 82 424
                     L96 424 C97 388 98 300 98 254 C98 232 96 216 94 206 Z" />
            <path d="M128 206 C130 250 128 300 124 348 C122 384 120 408 118 424
                     L104 424 C103 388 102 300 102 254 C102 232 104 216 106 206 Z" />
          </g>

          {/* Trapecio (parte alta de la espalda / cuello) */}
          <path data-muscle="traps" className={regionClass('traps')}
            d="M78 64 C88 58 112 58 122 64 C118 82 110 92 100 94
               C90 92 82 82 78 64 Z" />

          {/* Deltoides posterior (shoulders) L+R */}
          <path data-muscle="shoulders" className={regionClass('shoulders')}
            d="M58 76 C48 80 44 90 42 102 C50 98 58 92 66 88 C64 82 61 78 58 76 Z
               M142 76 C152 80 156 90 158 102 C150 98 142 92 134 88 C136 82 139 78 142 76 Z" />

          {/* Dorsales / espalda media (back) */}
          <path data-muscle="back" className={regionClass('back')}
            d="M72 92 C82 88 92 88 98 90 L98 158 C90 164 80 158 74 146
               C70 128 69 108 72 92 Z
               M128 92 C118 88 108 88 102 90 L102 158 C110 164 120 158 126 146
               C130 128 131 108 128 92 Z" />

          {/* Tríceps L+R */}
          <path data-muscle="triceps" className={regionClass('triceps')}
            d="M44 100 C40 116 40 134 44 148 C50 146 54 140 56 132
               C56 120 54 110 52 102 C50 100 46 99 44 100 Z
               M156 100 C160 116 160 134 156 148 C150 146 146 140 144 132
               C144 120 146 110 148 102 C150 100 154 99 156 100 Z" />

          {/* Antebrazos L+R */}
          <path data-muscle="forearms" className={regionClass('forearms')}
            d="M43 152 C40 168 40 186 44 202 L52 202 C54 186 54 168 52 152
               C49 150 46 150 43 152 Z
               M157 152 C160 168 160 186 156 202 L148 202 C146 186 146 168 148 152
               C151 150 154 150 157 152 Z" />

          {/* Glúteos L+R */}
          <path data-muscle="glutes" className={regionClass('glutes')}
            d="M74 210 C70 226 72 244 84 250 C94 254 98 246 99 234
               L99 212 C90 208 80 208 74 210 Z
               M126 210 C130 226 128 244 116 250 C106 254 102 246 101 234
               L101 212 C110 208 120 208 126 210 Z" />

          {/* Femorales / hamstrings L+R */}
          <path data-muscle="hamstrings" className={regionClass('hamstrings')}
            d="M78 254 C74 288 76 318 84 334 C90 328 93 314 94 298
               C95 278 94 264 93 256 C88 253 83 253 78 254 Z
               M122 254 C126 288 124 318 116 334 C110 328 107 314 106 298
               C105 278 106 264 107 256 C112 253 117 253 122 254 Z" />

          {/* Gemelos (calves) trasero L+R */}
          <path data-muscle="calves" className={regionClass('calves')}
            d="M80 344 C77 368 80 392 86 410 C91 402 93 388 94 372
               C94 358 92 350 90 346 C87 344 83 343 80 344 Z
               M120 344 C123 368 120 392 114 410 C109 402 107 388 106 372
               C106 358 108 350 110 346 C113 344 117 343 120 344 Z" />
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
