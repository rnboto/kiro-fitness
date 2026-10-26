// Router de estado + gating + layout (design §4). Monta los providers de
// contexto y conmuta entre pantallas según la pestaña activa.

import { useState } from 'react';
import TabBar from './router/TabBar';
import { GATED_TABS, type Tab } from './router/routes';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { SettingsProvider } from './context/SettingsContext';
import LockedScreen from './components/LockedScreen';
import Modal from './components/Modal';
import WelcomeScreen from './features/onboarding/WelcomeScreen';
import PerfilScreen from './features/perfil/PerfilScreen';
import NutricionScreen from './features/nutricion/NutricionScreen';
import GimnasioScreen from './features/gimnasio/GimnasioScreen';
import EstadisticasScreen from './features/estadisticas/EstadisticasScreen';
import NotificacionesScreen from './features/notificaciones/NotificacionesScreen';
import WeighInReminderHost from './features/notificaciones/WeighInReminderHost';
import SettingsPanel from './features/ajustes/SettingsPanel';
import TimerFab from './features/timer/TimerFab';
import MusicFab from './features/music/MusicFab';
import styles from './App.module.css';

function AppContent() {
  const { loading, firstLaunch, profile } = useProfile();
  const [tab, setTab] = useState<Tab>('perfil');
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (loading) {
    return (
      <main className="app-shell">
        <p>Cargando…</p>
      </main>
    );
  }

  // Primer arranque: onboarding obligatorio a pantalla completa, sin TabBar.
  if (firstLaunch) {
    return <WelcomeScreen />;
  }

  // Gating: secciones bloqueadas si no hay perfil (caso de datos borrados).
  const locked = GATED_TABS.includes(tab) && profile === null;

  // Estadísticas abre siempre en su pestaña interna Cuerpo (Registrar medición).
  const goToCuerpo = () => setTab('estadisticas');

  let screen: React.ReactNode;
  if (locked) {
    screen = <LockedScreen onGoToPerfil={() => setTab('perfil')} />;
  } else {
    switch (tab) {
      case 'perfil':
        screen = <PerfilScreen onGoToCuerpo={goToCuerpo} />;
        break;
      case 'nutricion':
        screen = <NutricionScreen />;
        break;
      case 'gimnasio':
        screen = <GimnasioScreen />;
        break;
      case 'estadisticas':
        screen = <EstadisticasScreen />;
        break;
      case 'notificaciones':
        screen = (
          <NotificacionesScreen
            onOpenSettings={() => setSettingsOpen(true)}
            onGoToCuerpo={goToCuerpo}
          />
        );
        break;
    }
  }

  return (
    <div className={styles.layout}>
      {/* Acceso a Ajustes/Acerca de desde cualquier pantalla (design §13). */}
      <button
        type="button"
        className={styles.settingsBtn}
        aria-label="Ajustes"
        onClick={() => setSettingsOpen(true)}
      >
        ⚙
      </button>
      <main className={styles.content}>
        <div className="app-shell">{screen}</div>
      </main>
      {/* FAB global del cronómetro/temporizador (feature B): accesible desde
          cualquier pantalla. Independiente del RestTimer/SessionClock. */}
      <TimerFab />
      {/* FAB global de Música: lanza Amazon Music desde cualquier pantalla,
          apilado encima del FAB del cronómetro para no solaparse. */}
      <MusicFab />
      {/* Pesajes semanal/mensual: timers globales con cualquier pestaña abierta. */}
      <WeighInReminderHost onGoToCuerpo={goToCuerpo} />
      <TabBar active={tab} onChange={setTab} />

      <Modal open={settingsOpen} title="Ajustes" onClose={() => setSettingsOpen(false)}>
        <SettingsPanel />
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <ProfileProvider>
        <AppContent />
      </ProfileProvider>
    </SettingsProvider>
  );
}
