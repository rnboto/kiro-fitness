// Router de estado (sin react-router): tipo de pestaña y metadatos (design §4.1).

/**
 * Pestañas de la app. Orden fijo en la TabBar:
 * Perfil, Nutrición, Gimnasio, Estadísticas, Notificaciones.
 * Nota: Estadísticas va ENTRE Gimnasio y Notificaciones.
 */
export type Tab = 'perfil' | 'nutricion' | 'gimnasio' | 'estadisticas' | 'notificaciones';

/** Definición de una pestaña para la TabBar. */
export interface TabDef {
  id: Tab;
  label: string;
  /** Pequeño glifo/emoji neutro usado como icono simple en la barra. */
  icon: string;
}

/** Orden autoritativo de las 5 pestañas (máximo 5). */
export const TABS: TabDef[] = [
  { id: 'perfil', label: 'Perfil', icon: '👤' },
  { id: 'nutricion', label: 'Nutrición', icon: '🥗' },
  { id: 'gimnasio', label: 'Gimnasio', icon: '🏋️' },
  { id: 'estadisticas', label: 'Estadísticas', icon: '📈' },
  { id: 'notificaciones', label: 'Notificaciones', icon: '🔔' },
];

/** Pestañas que requieren perfil para desbloquearse (gating, design §4.4). */
export const GATED_TABS: Tab[] = ['nutricion', 'gimnasio', 'estadisticas'];
