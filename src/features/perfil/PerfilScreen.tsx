// Pantalla Perfil: calendario de asistencia (arriba del todo) + ficha actual de
// solo lectura (incluye age/sex, mostrados pero no usados en el cálculo
// energético). El registro de mediciones y las gráficas de progreso viven ahora
// en Estadísticas · Cuerpo.

import { useProfile } from '../../context/ProfileContext';
import { useAttendanceCalendar } from '../../domain/useAttendanceCalendar';
import AttendanceCalendar from '../estadisticas/AttendanceCalendar';
import MusicButton from '../music/MusicButton';
import styles from './PerfilScreen.module.css';

export default function PerfilScreen() {
  const { profile } = useProfile();
  const {
    now,
    trainedDays,
    autoDays,
    trainedThisMonth,
    streak,
    handleToggle,
    setViewMonth,
  } = useAttendanceCalendar();

  return (
    <div className={styles.screen}>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Calendario de asistencia</h2>
        <p className={styles.calHelper}>Toca un día para marcar que entrenaste.</p>
        <AttendanceCalendar
          trainedDays={trainedDays}
          autoDays={autoDays}
          onToggle={handleToggle}
          now={now}
          onViewMonthChange={setViewMonth}
        />
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Días entrenados este mes</span>
            <span className={styles.metricValue}>{trainedThisMonth}</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Racha</span>
            <span className={styles.metricValue}>{streak}</span>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Música</h2>
        <p className={styles.calHelper}>
          Abre Amazon Music para escuchar mientras entrenas.
        </p>
        <MusicButton />
      </section>

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
