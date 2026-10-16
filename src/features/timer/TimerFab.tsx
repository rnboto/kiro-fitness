// Botón flotante global (FAB) que abre la herramienta Cronómetro/Temporizador en
// un Modal, accesible desde CUALQUIER pantalla (montado en App.tsx). Independiente
// del RestTimer/SessionClock del gimnasio.

import { useState } from 'react';
import Modal from '../../components/Modal';
import ChronoTool from './ChronoTool';
import styles from './TimerFab.module.css';

export default function TimerFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.fab}
        onClick={() => setOpen(true)}
        aria-label="Abrir cronómetro y temporizador"
        title="Cronómetro / Temporizador"
      >
        <span aria-hidden="true">⏱</span>
      </button>

      <Modal open={open} title="Cronómetro / Temporizador" onClose={() => setOpen(false)}>
        <ChronoTool />
      </Modal>
    </>
  );
}
