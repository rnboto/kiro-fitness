// Sello de autoría discreto (design §13): "Kiro · diseñado por rnboto".

import styles from './AboutFooter.module.css';

export default function AboutFooter() {
  return (
    <footer className={styles.footer}>
      <span className={styles.brand}>Kiro</span>
      <span className={styles.sep}>·</span>
      <span className={styles.credit}>diseñado por rnboto</span>
    </footer>
  );
}
