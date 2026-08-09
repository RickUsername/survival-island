// ============================================
// Terrain-Backing — die Insel als zusammenhängende Landschaft
// ============================================
// Vorher: jede 64px-Kachel wurde in jedem Frame einzeln gemalt, mit
// eigener Zufallsfarbe. Ergebnis: ein sichtbares Schachbrett und
// ~9000 Pfad-Operationen pro Frame.
//
// Jetzt: die komplette Insel wird EINMAL in ein Offscreen-Canvas
// gerendert — mit durchgehendem Rauschen über Kachelgrenzen hinweg,
// echter Uferzone und organisch geclusterter Vegetation. Im Frame
// bleibt davon ein einziges drawImage übrig.

import { TILE_SIZE, MAP_COLS, MAP_ROWS, MAP_WIDTH, MAP_HEIGHT, TILE_TYPES } from '../utils/constants';
import { fbm, valueNoise, hash2, scatter } from './noise';
import { rgb, mix } from './color';

let SEED = 20240;

// Maße der gerade gebackenen Karte. Die Heimatinsel ist 20×15, die Biome
// haben eigene Größen — deshalb sind das keine Konstanten mehr.
let COLS = MAP_COLS;
let ROWS = MAP_ROWS;
let WIDTH = MAP_WIDTH;
let HEIGHT = MAP_HEIGHT;

// --- Palette der Landschaft (neutrales Tageslicht; Stimmung kommt später) ---
const C_GRASS_DARK = [58, 104, 48];
const C_GRASS_MID = [92, 148, 62];
const C_GRASS_LIGHT = [138, 182, 82];
const C_GRASS_DRY = [156, 172, 88];
const C_EARTH = [104, 82, 54];
const C_SAND = [216, 196, 148];
const C_SAND_WET = [166, 148, 112];
const C_SHALLOW = [92, 168, 178];
const C_DEEP = [38, 96, 140];

/** Bilinear interpolierter Zugriff auf ein Kachel-Rasterfeld */
function sampleField(field, fx, fy) {
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;

  const at = (c, r) => {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return 0;
    return field[r][c];
  };

  const a = at(x0, y0), b = at(x0 + 1, y0);
  const c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

/** Baut aus der Karte binäre Felder für Wasser und Wald */
function buildFields(map) {
  const water = [];
  const forest = [];
  for (let r = 0; r < ROWS; r++) {
    water.push([]);
    forest.push([]);
    for (let c = 0; c < COLS; c++) {
      const t = map[r][c];
      water[r].push(t === TILE_TYPES.WATER ? 1 : 0);
      forest[r].push(t === TILE_TYPES.TREE ? 1 : 0);
    }
  }
  return { water, forest };
}

/**
 * Zeichnet den Untergrund pixelweise in halber Auflösung.
 * Halbe Auflösung reicht: das sind großflächige Farbverläufe, die
 * beim Hochskalieren weich bleiben — spart 75 % der Rechenzeit.
 */
function paintGround(fields) {
  const SS = 2; // Unterabtastung
  const w = Math.ceil(WIDTH / SS);
  const h = Math.ceil(HEIGHT / SS);

  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(w, h);
  const data = img.data;

  for (let py = 0; py < h; py++) {
    const wy = py * SS;
    const fy = wy / TILE_SIZE - 0.5;

    for (let px = 0; px < w; px++) {
      const wx = px * SS;
      const fx = wx / TILE_SIZE - 0.5;

      // Uferlinie organisch aufbrechen, damit sie nicht dem Raster folgt
      const warp = (valueNoise(wx * 0.021, wy * 0.021, SEED + 41) - 0.5) * 0.42
                 + (valueNoise(wx * 0.061, wy * 0.061, SEED + 42) - 0.5) * 0.18;
      const wetness = sampleField(fields.water, fx, fy) + warp;

      let col;

      if (wetness > 0.30) {
        // --- Wasser und Ufer ---
        if (wetness > 0.62) {
          // Tiefes Wasser mit Bodenstruktur
          const depth = Math.min(1, (wetness - 0.62) / 0.38);
          const floor = fbm(wx * 0.018, wy * 0.018, 3, SEED + 7);
          col = mix(C_SHALLOW, C_DEEP, depth * 0.92);
          col = mix(col, [24, 70, 108], floor * 0.3);
        } else if (wetness > 0.46) {
          // Flachwasser — sandiger Grund schimmert durch
          const k = (wetness - 0.46) / 0.16;
          const floor = fbm(wx * 0.03, wy * 0.03, 3, SEED + 8);
          col = mix(mix(C_SAND_WET, C_SHALLOW, 0.55 + floor * 0.2), C_SHALLOW, k);
        } else if (wetness > 0.37) {
          // Nasser Saum
          col = mix(C_SAND, C_SAND_WET, (wetness - 0.37) / 0.09);
        } else {
          // Trockener Sandstrand
          const grain = fbm(wx * 0.09, wy * 0.09, 2, SEED + 9);
          col = mix(C_SAND, [232, 214, 172], grain * 0.7);
          // Weicher Übergang ins Gras
          const toGrass = 1 - Math.min(1, (wetness - 0.30) / 0.07);
          col = mix(col, C_GRASS_MID, toGrass * 0.55);
        }
      } else {
        // --- Wiese ---
        // Vier Frequenzen: Großzonen, Flecken, Struktur, feines Korn.
        // Der Kontrast zwischen den Zonen ist bewusst kräftig — eine
        // gleichmäßig grüne Fläche liest sich sonst wie eine Filzdecke.
        const macro = fbm(wx * 0.0026, wy * 0.0026, 3, SEED);
        const meso = fbm(wx * 0.0115, wy * 0.0115, 3, SEED + 100);
        const detail = fbm(wx * 0.045, wy * 0.045, 2, SEED + 150);
        const micro = valueNoise(wx * 0.14, wy * 0.14, SEED + 200);

        // Feuchte Senken sind dunkler und satter, Kuppen heller und trockener
        const height = macro * 0.62 + meso * 0.28 + detail * 0.10;
        col = mix(C_GRASS_DARK, C_GRASS_LIGHT, Math.max(0, Math.min(1, (height - 0.2) / 0.6)));

        // Trockene Kuppen kippen ins Gelbliche
        col = mix(col, C_GRASS_DRY, Math.max(0, height - 0.68) * 2.1);
        // Schattige Senken kippen ins Blaugrüne
        col = mix(col, [40, 84, 56], Math.max(0, 0.3 - height) * 1.5);

        // Wildwuchs-Inseln: dichteres, dunkleres Gras mit weichen Rändern
        const patch = fbm(wx * 0.0075 + 40, wy * 0.0075, 3, SEED + 250);
        if (patch > 0.6) {
          col = mix(col, [52, 96, 44], Math.min(0.5, (patch - 0.6) * 2.2));
        }

        // Feines Korn — verhindert, dass die Verläufe bandig wirken
        col = mix(col, [col[0] * 1.14, col[1] * 1.1, col[2] * 0.86], micro * 0.26);

        // Vereinzelte kahle Erdstellen
        const bare = fbm(wx * 0.011, wy * 0.011, 2, SEED + 300);
        if (bare > 0.74) {
          col = mix(col, C_EARTH, Math.min(0.72, (bare - 0.74) * 4));
        }

        // Uferzone: Gras läuft weich in den Sand aus
        if (wetness > 0.20) {
          col = mix(col, C_SAND, (wetness - 0.20) / 0.10 * 0.5);
        }
      }

      // Waldsaum: Umgebungsverschattung unter den Randbäumen
      const shade = sampleField(fields.forest, fx, fy);
      if (shade > 0.02) {
        const ao = Math.min(0.62, shade * 0.72);
        col = mix(col, [26, 44, 24], ao);
      }

      const i = (py * w + px) * 4;
      data[i] = col[0];
      data[i + 1] = col[1];
      data[i + 2] = col[2];
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return cv;
}

/** Ein einzelnes Grasbüschel */
function drawTuft(ctx, x, y, size, tint, alpha) {
  const blades = 3 + Math.floor(size * 2);
  ctx.strokeStyle = rgb(tint, alpha);
  ctx.lineWidth = 1 + size * 0.35;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < blades; i++) {
    const spread = (i / (blades - 1 || 1) - 0.5) * size * 3.4;
    const hgt = size * (2.4 + (i % 2) * 1.3);
    ctx.moveTo(x + spread * 0.35, y);
    ctx.quadraticCurveTo(x + spread * 0.75, y - hgt * 0.6, x + spread, y - hgt);
  }
  ctx.stroke();
}

/** Blüten in Gruppen — einzelne Punkte wirken sonst wie Konfetti */
const FLOWER_KINDS = [
  { petal: [242, 240, 228], core: [232, 196, 74], n: 6, r: 2.0 },  // Gänseblümchen
  { petal: [230, 192, 88], core: [198, 148, 44], n: 5, r: 1.8 },   // Butterblume
  { petal: [162, 136, 192], core: [230, 222, 142], n: 5, r: 1.7 },  // Glockenblume
  { petal: [216, 156, 178], core: [238, 224, 226], n: 5, r: 1.8 },  // Lichtnelke
  { petal: [198, 100, 84], core: [62, 46, 40], n: 4, r: 2.2 },      // Mohn
];

function drawBlossom(ctx, x, y, kind, scale) {
  const k = FLOWER_KINDS[kind];

  // Stiel mit Blatt
  ctx.strokeStyle = 'rgba(58,96,42,0.62)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x + 0.8, y + 7 * scale);
  ctx.quadraticCurveTo(x - 0.8, y + 3 * scale, x, y);
  ctx.stroke();

  // Kleiner Schatten, damit die Blüte im Gras sitzt und nicht darüber schwebt
  ctx.fillStyle = 'rgba(28,46,22,0.18)';
  ctx.beginPath();
  ctx.ellipse(x + 1.4, y + 7.5 * scale, k.r * 1.3 * scale, k.r * 0.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = rgb(k.petal, 0.92);
  for (let p = 0; p < k.n; p++) {
    const a = (p / k.n) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * k.r * scale, y + Math.sin(a) * k.r * scale,
      k.r * 0.78 * scale, k.r * 0.5 * scale, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // Untere Blütenblätter leicht abschatten — gibt Volumen
  ctx.fillStyle = 'rgba(40,54,32,0.16)';
  ctx.beginPath();
  ctx.ellipse(x, y + k.r * 0.7 * scale, k.r * 1.25 * scale, k.r * 0.55 * scale, 0, 0, Math.PI);
  ctx.fill();

  ctx.fillStyle = rgb(k.core, 1);
  ctx.beginPath();
  ctx.arc(x, y, k.r * 0.5 * scale, 0, Math.PI * 2);
  ctx.fill();
}

/** Streudetails über die gebackene Grundfläche */
function paintDetail(ctx, fields) {
  const isLand = (x, y) => {
    const fx = x / TILE_SIZE - 0.5;
    const fy = y / TILE_SIZE - 0.5;
    const warp = (valueNoise(x * 0.021, y * 0.021, SEED + 41) - 0.5) * 0.42;
    return sampleField(fields.water, fx, fy) + warp < 0.22
        && sampleField(fields.forest, fx, fy) < 0.35;
  };

  // --- Grasbüschel: dicht, folgen den feuchten Zonen ---
  const tufts = scatter(WIDTH, HEIGHT, 13, SEED + 500);
  for (const p of tufts) {
    if (!isLand(p.x, p.y)) continue;
    const density = fbm(p.x * 0.006, p.y * 0.006, 2, SEED + 600);
    if (p.r1 > 0.28 + density * 0.55) continue;

    const lush = 0.4 + density * 0.6;
    const tint = mix([56, 108, 42], [128, 176, 74], p.r2 * lush);
    drawTuft(ctx, p.x, p.y, 1.1 + p.r3 * 1.5, tint, 0.34 + p.r2 * 0.3);
  }

  // --- Klee-Inseln ---
  const clover = scatter(WIDTH, HEIGHT, 46, SEED + 700);
  for (const p of clover) {
    if (!isLand(p.x, p.y) || p.r1 > 0.42) continue;
    const count = 4 + Math.floor(p.r2 * 7);
    for (let i = 0; i < count; i++) {
      const a = hash2(i, p.x | 0, SEED + 710) * Math.PI * 2;
      const d = hash2(i, p.y | 0, SEED + 711) * 16;
      const cx = p.x + Math.cos(a) * d;
      const cy = p.y + Math.sin(a) * d;
      ctx.fillStyle = `rgba(64,${132 + Math.floor(hash2(i, 3, SEED) * 34)},46,0.5)`;
      for (let l = 0; l < 3; l++) {
        const la = (l / 3) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(la) * 2.1, cy + Math.sin(la) * 2.1, 2.1, 1.5, la, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- Blumenwiesen ---
  // Bewusst sparsam: Blumen sind der Akzent, nicht der Teppich. Zu viele
  // gleichmäßig verteilte Blüten lesen sich als Bildrauschen statt als Wiese.
  // Deshalb wenige, klar getrennte Horste, deren Dichte zum Rand hin abnimmt.
  const meadows = scatter(WIDTH, HEIGHT, 168, SEED + 800);
  for (const m of meadows) {
    if (!isLand(m.x, m.y) || m.r1 > 0.5) continue;

    // Nur dort, wo die Wiese ohnehin saftig ist
    const lushness = fbm(m.x * 0.0045, m.y * 0.0045, 2, SEED + 850);
    if (lushness < 0.42) continue;

    const kind = Math.floor(m.r2 * FLOWER_KINDS.length) % FLOWER_KINDS.length;
    const count = 4 + Math.floor(m.r3 * 9);
    const spread = 14 + m.r1 * 26;

    for (let i = 0; i < count; i++) {
      const a = hash2(i, (m.x + m.y) | 0, SEED + 810) * Math.PI * 2;
      const d = Math.sqrt(hash2(i, (m.x - m.y) | 0, SEED + 811)) * spread;
      const fx = m.x + Math.cos(a) * d;
      const fy = m.y + Math.sin(a) * d;
      if (!isLand(fx, fy)) continue;
      // 90 % der Gruppe in einer Sorte, der Rest gemischt — wirkt echter
      const k = hash2(i, 5, SEED + 812) > 0.9
        ? Math.floor(hash2(i, 9, SEED + 813) * FLOWER_KINDS.length) % FLOWER_KINDS.length
        : kind;
      drawBlossom(ctx, fx, fy, k, 0.85 + hash2(i, 11, SEED + 814) * 0.75);
    }
  }

  // --- Kieselsteine ---
  const stones = scatter(WIDTH, HEIGHT, 96, SEED + 900);
  for (const p of stones) {
    if (!isLand(p.x, p.y) || p.r1 > 0.5) continue;
    const s = 2.2 + p.r2 * 3.4;
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath();
    ctx.ellipse(p.x + 1, p.y + 1.4, s, s * 0.6, p.r3 * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgb(${126 + p.r2 * 30 | 0},${124 + p.r2 * 28 | 0},${112 + p.r2 * 26 | 0})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s, s * 0.62, p.r3 * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.ellipse(p.x - s * 0.25, p.y - s * 0.22, s * 0.5, s * 0.28, p.r3 * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Laub am Waldsaum ---
  const leaves = scatter(WIDTH, HEIGHT, 22, SEED + 1000);
  for (const p of leaves) {
    const fx = p.x / TILE_SIZE - 0.5;
    const fy = p.y / TILE_SIZE - 0.5;
    const nearForest = sampleField(fields.forest, fx, fy);
    if (nearForest < 0.08 || nearForest > 0.75) continue;
    if (p.r1 > 0.55) continue;
    const hue = p.r2;
    ctx.fillStyle = hue > 0.6
      ? `rgba(${152 + p.r3 * 40 | 0},${96 + p.r3 * 30 | 0},44,0.62)`
      : `rgba(${104 + p.r3 * 40 | 0},${112 + p.r3 * 34 | 0},48,0.55)`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 3 + p.r3 * 2.6, 1.7 + p.r3 * 1.2, p.r1 * 6.28, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Schilf am Wasser ---
  const reeds = scatter(WIDTH, HEIGHT, 15, SEED + 1100);
  for (const p of reeds) {
    const fx = p.x / TILE_SIZE - 0.5;
    const fy = p.y / TILE_SIZE - 0.5;
    const warp = (valueNoise(p.x * 0.021, p.y * 0.021, SEED + 41) - 0.5) * 0.42;
    const w = sampleField(fields.water, fx, fy) + warp;
    if (w < 0.26 || w > 0.5 || p.r1 > 0.55) continue;

    const n = 3 + Math.floor(p.r2 * 4);
    for (let i = 0; i < n; i++) {
      const ox = (hash2(i, p.x | 0, SEED + 1110) - 0.5) * 12;
      const hgt = 12 + hash2(i, p.y | 0, SEED + 1111) * 16;
      const lean = (hash2(i, 7, SEED + 1112) - 0.5) * 7;
      ctx.strokeStyle = `rgba(${86 + i * 6},${126 + i * 8},58,0.72)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x + ox, p.y);
      ctx.quadraticCurveTo(p.x + ox + lean * 0.4, p.y - hgt * 0.6, p.x + ox + lean, p.y - hgt);
      ctx.stroke();
      // Kolben
      if (hash2(i, 13, SEED + 1113) > 0.55) {
        ctx.fillStyle = 'rgba(96,66,38,0.85)';
        ctx.beginPath();
        ctx.ellipse(p.x + ox + lean, p.y - hgt - 2, 1.6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// Cache pro Karte: die Heimatinsel und jedes Biom bekommen ein eigenes
// gebackenes Canvas. Der Schlüssel kommt vom Aufrufer.
const terrainCache = new Map();
const waterCache = new Map();

/** Modul-Maßstab auf eine Karte umstellen */
function applyMapDimensions(map, seed) {
  ROWS = map.length;
  COLS = map[0].length;
  WIDTH = COLS * TILE_SIZE;
  HEIGHT = ROWS * TILE_SIZE;
  SEED = seed;
}

/**
 * Liefert das gebackene Terrain-Canvas (baut es beim ersten Aufruf).
 * @param {Array<Array<number>>} map  Kachelraster
 * @param {string} key                Cache-Schlüssel, z. B. 'home' oder 'north'
 * @param {number} seed               eigener Rausch-Seed je Karte
 * @returns {HTMLCanvasElement}
 */
export function getTerrain(map, key = 'home', seed = 20240) {
  const cachedCanvas = terrainCache.get(key);
  if (cachedCanvas) return cachedCanvas;

  applyMapDimensions(map, seed);
  const fields = buildFields(map);

  const cv = document.createElement('canvas');
  cv.width = WIDTH;
  cv.height = HEIGHT;
  const ctx = cv.getContext('2d');

  // Grundfläche in halber Auflösung malen und weich hochskalieren
  const ground = paintGround(fields);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(ground, 0, 0, WIDTH, HEIGHT);

  // Vegetation und Kleinkram in voller Auflösung darüber
  paintDetail(ctx, fields);

  terrainCache.set(key, cv);
  return cv;
}

/** Wassermaske für animierte Effekte (Wellen, Regentropfen, Spiegelung) */
export function getWaterMask(map, key = 'home', seed = 20240) {
  const cachedCells = waterCache.get(key);
  if (cachedCells) return cachedCells;

  applyMapDimensions(map, seed);
  const fields = buildFields(map);
  const cols = COLS * 2;
  const rows = ROWS * 2;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) * (TILE_SIZE / 2);
      const y = (r + 0.5) * (TILE_SIZE / 2);
      const warp = (valueNoise(x * 0.021, y * 0.021, SEED + 41) - 0.5) * 0.42;
      const w = sampleField(fields.water, x / TILE_SIZE - 0.5, y / TILE_SIZE - 0.5) + warp;
      if (w > 0.46) cells.push({ x, y, depth: Math.min(1, (w - 0.46) / 0.4) });
    }
  }
  waterCache.set(key, cells);
  return cells;
}

/** Beim Hot-Reload / Kartenwechsel Cache verwerfen */
export function invalidateTerrain(key) {
  if (key) {
    terrainCache.delete(key);
    waterCache.delete(key);
  } else {
    terrainCache.clear();
    waterCache.clear();
  }
}
