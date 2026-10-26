// Descarga de un .ics sin dependencias (Blob + <a download>).

/** Descarga `content` como archivo iCalendar. Nunca lanza. */
export function downloadIcs(content: string, filename = 'kiro-pesaje.ics'): void {
  try {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revocar tras el click (diferido para que el navegador inicie la descarga).
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // Entorno sin Blob/URL: no hay nada más que hacer.
  }
}
