// Pantalla Perfil: ficha actual (incluye age/sex, mostrados pero no usados en el
// cálculo energético), formulario de nueva medición y gráficas de progreso.

import { useProfile } from '../../context/ProfileContext';
import MeasurementForm from './MeasurementForm';
import ProgressCharts from './ProgressCharts';
import styles from './PerfilScreen.module.css';

export default function PerfilScreen() {
  const { profile, history } = useProfile();

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Perfil & Evolt</h1>
        <p className={styles.subtitle}>Tu estudio de bioimpedancia y tu progreso.</p>
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

      <MeasurementForm
        initial={
          profile
            ? {
                age: profile.age,
                heightCm: profile.heightCm,
                sex: profile.sex,
                weightKg: profile.weightKg,
                bodyFatPct: profile.bodyFatPct,
                mmeKg: profile.mmeKg,
              }
            : undefined
        }
      />

      <section>
        <h2 className={styles.sectionTitle}>Progreso</h2>
        <ProgressCharts history={history} />
      </section>
    </div>
  );
}
