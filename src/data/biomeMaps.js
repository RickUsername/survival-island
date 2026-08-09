// ============================================
// Die vier Biome als begehbare Karten
// ============================================
// Bisher waren Wald, See, Felder und Klippen reine Abstraktionen:
// rauslaufen, Timer, Loot. Jetzt sind es echte kleine Landschaften,
// durch die man während der Sammelreise streift.
//
// Die Karten werden vom selben Terrain-Baker gerendert wie die Heimatinsel,
// bekommen aber eigene Seeds — dadurch sieht jede Landschaft anders aus,
// obwohl derselbe Code dahintersteckt.

import { TILE_TYPES } from '../utils/constants';

const G = TILE_TYPES.GRASS;
const W = TILE_TYPES.WATER;
const T = TILE_TYPES.TREE;
const B = TILE_TYPES.BUSH;

/** Baut ein Raster aus einer Zeichenfunktion (spart lange Literale) */
function build(cols, rows, fn) {
  const map = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) row.push(fn(c, r, cols, rows));
    map.push(row);
  }
  return map;
}

// Deterministisches Streumuster
function spread(c, r, salt) {
  let h = (c * 73856093) ^ (r * 19349663) ^ (salt * 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// --- Wald: dichter Baumbestand mit Lichtungen ---
const forest = build(26, 20, (c, r, cols, rows) => {
  const edge = c < 1 || r < 1 || c >= cols - 1 || r >= rows - 1;
  if (edge) return T;
  // Zwei Lichtungen freihalten
  const inClearing =
    Math.hypot(c - 7, r - 7) < 3.6 ||
    Math.hypot(c - 18, r - 13) < 4.2;
  if (inClearing) return spread(c, r, 5) > 0.9 ? B : G;
  const n = spread(c, r, 1);
  if (n > 0.62) return T;
  if (n > 0.52) return B;
  return G;
});

// --- See: großes Gewässer mit Schilfufer und einer Insel ---
const lake = build(24, 20, (c, r, cols, rows) => {
  const edge = c < 1 || r < 1 || c >= cols - 1 || r >= rows - 1;
  if (edge) return spread(c, r, 7) > 0.45 ? T : G;

  const cx = cols / 2 + 0.5;
  const cy = rows / 2 + 1;
  // Elliptischer See, am Rand ausgefranst
  const d = Math.hypot((c - cx) / 8.4, (r - cy) / 6.2) + (spread(c, r, 2) - 0.5) * 0.22;
  if (d < 0.98) {
    // Kleine Insel in der Mitte
    if (Math.hypot((c - cx - 2) / 1.8, (r - cy + 1) / 1.4) < 1) {
      return spread(c, r, 9) > 0.6 ? T : G;
    }
    return W;
  }
  if (d < 1.18) return spread(c, r, 3) > 0.7 ? B : G;
  return spread(c, r, 4) > 0.85 ? T : G;
});

// --- Felder: offene Weite, Hecken, vereinzelte Baumgruppen ---
const fields = build(28, 18, (c, r, cols, rows) => {
  const edge = c < 1 || r < 1 || c >= cols - 1 || r >= rows - 1;
  if (edge) return spread(c, r, 11) > 0.6 ? T : G;
  // Hecken als Feldgrenzen
  if (r % 6 === 0 && c % 9 !== 0) return spread(c, r, 12) > 0.35 ? B : G;
  // Baumgruppen an den Kreuzungen
  if (r % 6 === 0 && c % 9 === 0) return T;
  // Ein Bachlauf quer durchs Bild
  const brook = Math.abs(r - (4 + Math.sin(c * 0.45) * 3.2));
  if (brook < 0.75) return W;
  if (brook < 1.4) return spread(c, r, 13) > 0.8 ? B : G;
  return spread(c, r, 14) > 0.965 ? B : G;
});

// --- Klippen: schmaler Grat über dem Meer ---
const cliffs = build(26, 20, (c, r, cols, rows) => {
  // Unteres Drittel ist offenes Meer
  const shoreline = 11 + Math.sin(c * 0.38) * 2.2 + (spread(c, r, 21) - 0.5) * 0.9;
  if (r > shoreline + 1.4) return W;
  if (r > shoreline) return spread(c, r, 22) > 0.75 ? B : G;

  const edge = c < 1 || r < 1 || c >= cols - 1;
  if (edge) return T;
  // Windzerzauste Kiefern nur im oberen Bereich
  const n = spread(c, r, 23);
  if (r < 4 && n > 0.6) return T;
  if (n > 0.93) return B;
  return G;
});

export const BIOME_MAPS = {
  north: { map: forest, key: 'biome-north', seed: 51001, name: 'Wald',    ambient: 'forest' },
  south: { map: lake,   key: 'biome-south', seed: 51002, name: 'See',     ambient: 'lake' },
  west:  { map: fields, key: 'biome-west',  seed: 51003, name: 'Felder',  ambient: 'fields' },
  east:  { map: cliffs, key: 'biome-east',  seed: 51004, name: 'Klippen', ambient: 'cliffs' },
};

/** Startposition der Figur beim Betreten eines Bioms (Weltkoordinaten) */
export function biomeStart(direction) {
  const b = BIOME_MAPS[direction];
  if (!b) return { x: 200, y: 200 };
  const cols = b.map[0].length;
  const rows = b.map.length;
  // Grob mittig, dann die nächste begehbare Kachel suchen
  for (let radius = 0; radius < Math.max(cols, rows); radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const c = Math.floor(cols / 2) + dc;
        const r = Math.floor(rows / 2) + dr;
        if (c < 1 || r < 1 || c >= cols - 1 || r >= rows - 1) continue;
        if (b.map[r][c] === G) return { x: c * 64 + 32, y: r * 64 + 32 };
      }
    }
  }
  return { x: 200, y: 200 };
}

export default BIOME_MAPS;
