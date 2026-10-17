// Botón flotante global (FAB) que lanza Amazon Música, accesible desde CUALQUIER
// pantalla (montado en App.tsx junto al FAB del cronómetro). Se apila por encima
// del FAB del cronómetro para no solaparse. Usa el handler compartido.

import { openAmazonMusic } from './amazonMusic';
import styles from './MusicFab.module.css';

export default function MusicFab() {
  return (
    <button
      type="button"
      className={styles.fab}
      onClick={openAmazonMusic}
      aria-label="Abrir Amazon Música"
      title="Música"
    >
      <span aria-hidden="true">🎵</span>
    </button>
  );
}
