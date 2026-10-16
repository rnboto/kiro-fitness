import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/theme.css';
import './styles/global.css';

// Registro del service worker (autoUpdate). Si el navegador no lo soporta,
// la app sigue funcionando sin instalación/offline.
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
