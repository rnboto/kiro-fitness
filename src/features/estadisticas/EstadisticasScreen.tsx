// Pantalla Estadísticas (feature A). Control segmentado premium con 4 tabs
// INTERNAS (Cuerpo/Fuerza/Nutrición/Adherencia), cada una con su propio selector
// Semana/Mes/Todo. Gateada igual que Nutrición/Gimnasio (bloqueada con
// LockedScreen hasta que exista perfil) — el gating se aplica en App.tsx.

import { useState } from 'react';
import SegmentedControl, { type SegmentOption } from './SegmentedControl';
import CuerpoTab from './CuerpoTab';
import FuerzaTab from './FuerzaTab';
import CardioTab from './CardioTab';
import NutricionTab from './NutricionTab';
import AdherenciaTab from './AdherenciaTab';
import styles from './EstadisticasScreen.module.css';

type InnerTab = 'cuerpo' | 'fuerza' | 'cardio' | 'nutricion' | 'adherencia';

const SEGMENTS: SegmentOption<InnerTab>[] = [
  { id: 'cuerpo', label: 'Cuerpo' },
  { id: 'fuerza', label: 'Fuerza' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'nutricion', label: 'Nutrición' },
  { id: 'adherencia', label: 'Adherencia' },
];

export default function EstadisticasScreen() {
  const [tab, setTab] = useState<InnerTab>('cuerpo');

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Estadísticas</h1>
        <p className={styles.subtitle}>Tu progreso real, medido y actualizado.</p>
      </header>

      <SegmentedControl
        options={SEGMENTS}
        value={tab}
        onChange={setTab}
        ariaLabel="Sección de estadísticas"
      />

      {/* Transición suave de contenido: la key reinicia la animación de entrada
          al cambiar de tab. */}
      <div key={tab} className={styles.panel}>
        {tab === 'cuerpo' && <CuerpoTab />}
        {tab === 'fuerza' && <FuerzaTab />}
        {tab === 'cardio' && <CardioTab />}
        {tab === 'nutricion' && <NutricionTab />}
        {tab === 'adherencia' && <AdherenciaTab />}
      </div>
    </div>
  );
}
