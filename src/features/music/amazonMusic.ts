// Fuente única de verdad para el acceso rápido a Amazon Music (feature pequeña,
// aditiva). Kiro solo LANZA la app/web player externa de Amazon Music; no
// embebe ni reproduce audio dentro de la app. La reproducción en segundo plano
// la gestiona la suscripción de pago del usuario.

export const AMAZON_MUSIC_URL = 'https://music.amazon.com';

// Abre Amazon Music en una nueva pestaña/ventana (en móvil hace deep-link a la
// app nativa si está instalada; si no, al reproductor web). `noopener,noreferrer`
// aporta la misma seguridad que `rel="noopener noreferrer"` en un enlace.
export function openAmazonMusic(): void {
  window.open(AMAZON_MUSIC_URL, '_blank', 'noopener,noreferrer');
}
