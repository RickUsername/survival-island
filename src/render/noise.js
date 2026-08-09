// ============================================
// Deterministisches Rauschen — Basis der ganzen Landschaft
// ============================================
// Alles hier ist seed-basiert und reproduzierbar: Dieselbe Insel
// sieht bei jedem Laden identisch aus, ohne dass wir etwas speichern.

/** Ganzzahl-Hash (Bit-Mixing, keine linearen Muster) → 0..1 */
export function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Hash für eine einzelne Zahl → 0..1 */
export function hash1(i, seed = 0) {
  return hash2(i, i * 31 + 7, seed);
}

// Smoothstep-Interpolation (weiche Übergänge zwischen Gitterpunkten)
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Value-Noise: weiches, kontinuierliches Rauschen ohne Kachelgrenzen.
 * Genau das, was dem alten Renderer fehlte — dort war jede Kachel
 * eine eigene Zufallswelt, deshalb war das Gitter sichtbar.
 */
export function valueNoise(x, y, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);

  const v00 = hash2(xi, yi, seed);
  const v10 = hash2(xi + 1, yi, seed);
  const v01 = hash2(xi, yi + 1, seed);
  const v11 = hash2(xi + 1, yi + 1, seed);

  return lerp(lerp(v00, v10, xf), lerp(v01, v11, xf), yf);
}

/**
 * Fractal Brownian Motion: mehrere Noise-Oktaven übereinander.
 * Gibt der Wiese großflächige Farbzonen UND feine Textur zugleich.
 */
export function fbm(x, y, octaves = 4, seed = 0, lacunarity = 2.0, gain = 0.5) {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;

  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * freq, y * freq, seed + o * 1013) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Ridged Noise — für Wellenkämme und Wolkenränder */
export function ridge(x, y, seed = 0) {
  return 1 - Math.abs(valueNoise(x, y, seed) * 2 - 1);
}

/**
 * Poisson-artige Streuung: verteilt n Punkte in einem Rechteck so,
 * dass sie natürlich aussehen (nicht gerastert, nicht verklumpt).
 * Jitter-Grid statt echtem Poisson — schnell und optisch gleichwertig.
 */
export function scatter(width, height, spacing, seed = 0, jitter = 0.85) {
  const points = [];
  const cols = Math.ceil(width / spacing);
  const rows = Math.ceil(height / spacing);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hx = hash2(c, r, seed);
      const hy = hash2(c, r, seed + 977);
      points.push({
        x: (c + 0.5 + (hx - 0.5) * jitter) * spacing,
        y: (r + 0.5 + (hy - 0.5) * jitter) * spacing,
        r1: hash2(c, r, seed + 1949),
        r2: hash2(c, r, seed + 3121),
        r3: hash2(c, r, seed + 6271),
      });
    }
  }
  return points;
}

/** Zufallszahlengenerator mit Zustand (für Sequenzen) */
export function makeRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967295;
  };
}

export { lerp, smooth };
