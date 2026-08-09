// ============================================
// Farb-Werkzeuge für den Renderer
// ============================================

/** Mischt zwei RGB-Arrays linear */
export function mix(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** RGB-Array → CSS-String */
export function rgb(c, alpha) {
  const r = Math.round(Math.max(0, Math.min(255, c[0])));
  const g = Math.round(Math.max(0, Math.min(255, c[1])));
  const b = Math.round(Math.max(0, Math.min(255, c[2])));
  return alpha === undefined ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/** Helligkeit skalieren */
export function shade(c, factor) {
  return [c[0] * factor, c[1] * factor, c[2] * factor];
}

/** HSL → RGB-Array (h in 0..360, s/l in 0..1) */
export function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * Interpoliert in einem Farbverlauf mit Stützstellen.
 * stops: [{ t: 0..1, c: [r,g,b] }, ...] — muss nach t sortiert sein.
 */
export function gradientAt(stops, t) {
  if (t <= stops[0].t) return stops[0].c.slice();
  const last = stops[stops.length - 1];
  if (t >= last.t) return last.c.slice();

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.t && t <= b.t) {
      const local = (t - a.t) / (b.t - a.t || 1);
      return mix(a.c, b.c, local);
    }
  }
  return last.c.slice();
}
