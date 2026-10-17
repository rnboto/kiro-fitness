// Pantalla Perfil: ficha actual de solo lectura (incluye age/sex, mostrados pero
// no usados en el cálculo energético). El registro de mediciones y las gráficas de
// progreso viven ahora en Estadísticas · Cuerpo.

import { useProfile } from '../../context/ProfileContext';
import styles from './PerfilScreen.module.css';

export default function PerfilScreen() {
  const { profile } = useProfile();

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Perfil & Evolt</h1>
        <p className={styles.subtitle}>Tu estudio de bioimpedancia más reciente.</p>
      </header>

      {profile && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Ficha actual</h2>
          <p className={styles.cardDate}>Medición del {profile.date}</p>
          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>Peso total</dt>
              <dd>{profile.weightKg} kg</dd>
            </div>
            <div className={styles.stat}>
              <dt>% de grasa</dt>
              <dd>{profile.bodyFatPct} %</dd>
            </div>
            <div className={styles.stat}>
              <dt>MME</dt>
              <dd>{profile.mmeKg} kg</dd>
            </div>
            <div className={styles.stat}>
              <dt>Altura</dt>
              <dd>{profile.heightCm} cm</dd>
            </div>
            <div className={styles.stat}>
              <dt>Edad</dt>
              <dd>{profile.age} años</dd>
            </div>
            <div className={styles.stat}>
              <dt>Sexo</dt>
              <dd>{profile.sex === 'M' ? 'Masculino' : 'Femenino'}</dd>
            </div>
          </dl>
        </section>
      )}

      <p className={styles.hint}>
        Consulta tu evolución y registra nuevas mediciones en Estadísticas &gt; Cuerpo.
      </p>
    </div>
  );
}
