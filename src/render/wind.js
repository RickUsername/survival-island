// ============================================
// Windfeld — lässt die ganze Insel atmen
// ============================================
// Ein einziges kohärentes Feld für Gras, Blumen, Bäume und Partikel.
// Dadurch wehen alle Pflanzen in dieselbe Richtung statt jede für sich.

import { valueNoise } from './noise';

/** Grundstärke des Windes inkl. Böen, 0..1 */
export function windStrength(timeSec, rainy = false) {
  const base = 0.32
    + valueNoise(timeSec * 0.055, 0, 771) * 0.4
    + valueNoise(timeSec * 0.21, 13, 772) * 0.16;
  return Math.min(1.35, base * (rainy ? 1.7 : 1));
}

/**
 * Auslenkung an einer Weltposition.
 * Die Phasenverschiebung über x/y lässt Böen sichtbar über die
 * Wiese laufen, statt alles synchron wackeln zu lassen.
 */
export function sway(x, y, timeSec, strength, stiffness = 1) {
  const phase = timeSec * 1.7 - x * 0.008 - y * 0.004;
  const gust = valueNoise(x * 0.004 - timeSec * 0.18, y * 0.004, 881);
  const amp = strength * (0.45 + gust * 0.9) / stiffness;
  return (Math.sin(phase) * 0.7 + Math.sin(phase * 2.3 + 1.1) * 0.3) * amp;
}
