// Botón reutilizable "Música" para usar dentro de una pantalla (p. ej. Perfil).
// Lanza Amazon Music a través del handler compartido (sin duplicar la URL ni la
// lógica de apertura).

import { openAmazonMusic } from './amazonMusic';
import styles from './MusicButton.module.css';

export default function MusicButton() {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={openAmazonMusic}
      aria-label="Abrir Amazon Música"
    >
      <span aria-hidden="true">🎵</span>
      <span>Música</span>
    </button>
  );
}
