// ============================================
// Renderauflösung — was sich das Gerät leisten kann
// ============================================
// Die Beleuchtung legt mehrere Vollbild-Durchgänge übereinander
// (Multiply-Lichtkarte, Sättigung, Jahreszeit, Vignette). Deren Kosten
// hängen nur an der Pixelzahl, nicht an der Szene. Auf dem Desktop ist
// das egal, auf dem Handy ist es der Löwenanteil der Bildzeit:
// devicePixelRatio 3 bedeutet neunmal so viele Pixel wie bei 1.
//
// Deshalb wird auf Telefonen niedriger gerendert. Die Grafik ist weich
// gemalt, keine Pixelkunst — 1.5 statt 2 fällt kaum auf, spart aber 44 %
// der Füllrate. Die Bedienoberfläche ist HTML und bleibt gestochen scharf.

const DESKTOP_MAX = 2;
const HANDHELD_MAX = 1.5;

let cachedIsHandheld = null;

function isHandheld() {
  if (cachedIsHandheld !== null) return cachedIsHandheld;
  if (typeof window === 'undefined') return false;

  // Grober Zeiger = Finger. Zusammen mit der kurzen Bildschirmseite
  // trennt das Telefone von Notebooks mit Touchscreen.
  const coarse = typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
  const shortSide = Math.min(window.screen?.width || 9999, window.screen?.height || 9999);

  cachedIsHandheld = coarse && shortSide < 820;
  return cachedIsHandheld;
}

/** Auflösungsfaktor für ein Canvas — nie über dem echten devicePixelRatio */
export function canvasDpr() {
  const real = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  return Math.min(real, isHandheld() ? HANDHELD_MAX : DESKTOP_MAX);
}
