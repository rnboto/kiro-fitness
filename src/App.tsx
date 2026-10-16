// Router de estado + gating + layout (design §4). Monta los providers de
// contexto y conmuta entre pantallas según la pestaña activa.

import { useState } from 'react';
import TabBar from './router/TabBar';
import { GATED_TABS, type Tab } from './router/routes';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { SettingsProvider } from './context/SettingsContext';
import LockedScreen from './components/LockedScreen';
import WelcomeScreen from './features/onboarding/WelcomeScreen';
import PerfilScreen from './features/perfil/PerfilScreen';
import NutricionScreen from './features/nutricion/NutricionScreen';
import styles from './App.module.css';

/** Placeholder para pantallas que llegan en features posteriores. */
function ComingSoon({ title }: { title: string }) {
  return (
    <div className={styles.comingSoon}>
      <h1 className={styles.title}>{title}</h1>
      <p>Esta sección estará disponible muy pronto.</p>
    </div>
  );
}

function AppContent() {
  const { loading, firstLaunch, profile } = useProfile();
  const [tab, setTab] = useState<Tab>('perfil');

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

  let screen: React.ReactNode;
  if (locked) {
    screen = <LockedScreen onGoToPerfil={() => setTab('perfil')} />;
  } else {
    switch (tab) {
      case 'perfil':
        screen = <PerfilScreen />;
        break;
      case 'nutricion':
        screen = <NutricionScreen />;
        break;
      case 'gimnasio':
        screen = <ComingSoon title="Gimnasio" />;
        break;
      case 'estadisticas':
        screen = <ComingSoon title="Estadísticas" />;
        break;
      case 'notificaciones':
        screen = <ComingSoon title="Notificaciones" />;
        break;
    }
  }

  return (
    <div className={styles.layout}>
      <main className={styles.content}>
        <div className="app-shell">{screen}</div>
      </main>
      <TabBar active={tab} onChange={setTab} />
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
