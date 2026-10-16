// Avisos cortos sin assets externos: pitido vía WebAudio + vibración si existe.
// Degradación silenciosa en entornos sin AudioContext (p.ej. jsdom en tests).

/** Reproduce un pitido breve (default 880 Hz, 180 ms). */
export function beep(frequency = 880, durationMs = 180): void {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {
    // Silencioso: el aviso visual sigue funcionando.
  }
}

/** Vibra el dispositivo si la API está disponible. */
export function vibrate(pattern: number | number[] = [120, 60, 120]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silencioso.
  }
}
