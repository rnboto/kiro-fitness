// Pantalla de bloqueo reutilizable para secciones gated (design §4.4).

import styles from './LockedScreen.module.css';

interface LockedScreenProps {
  /** Lleva al usuario a Perfil para completar el estudio Evolt. */
  onGoToPerfil: () => void;
}

export default function LockedScreen({ onGoToPerfil }: LockedScreenProps) {
  return (
    <div className={styles.locked}>
      <div className={styles.icon} aria-hidden="true">
        🔒
      </div>
      <p className={styles.message}>
        Completa tu estudio de bioimpedancia en Perfil para desbloquear esta sección.
      </p>
      <button type="button" className={styles.cta} onClick={onGoToPerfil}>
        Ir a Perfil
      </button>
    </div>
  );
}
