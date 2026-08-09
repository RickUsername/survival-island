// ============================================
// Hütten-Innenraum — Räume, Möbel, Gemütlichkeit
// ============================================
// Ab Unterstand-Level 2 hat die Hütte einen echten Innenraum, den man
// betreten und einrichten kann. Möbel werden direkt drinnen aus Rohstoffen
// gebaut (kein Umweg über die Werkbank) und zahlen auf einen
// Gemütlichkeits-Wert ein, der die Stimmung langsamer sinken lässt.
//
// Bewusst kein reiner Deko-Modus: Wer die Hütte einrichtet, bekommt einen
// spürbaren, aber nicht überzogenen Vorteil (max. −28 % Stimmungsverlust).

import items from '../data/items';

// Ab dieser Ausbaustufe gibt es überhaupt einen Innenraum.
// Level 1 ist ein offener Windschutz — da gibt es kein „Drinnen".
export const MIN_INTERIOR_LEVEL = 2;

// Raumgröße und Materialien je Ausbaustufe.
// Immer breiter als tief — ein hochkantiger Grundriss liest sich von oben
// wie ein Flur, nicht wie ein Zimmer.
// Größere Häuser wirken erst mit mehr Möbeln gemütlich (siehe cozyTarget).
export const ROOM_LEVELS = {
  2: { cols: 6, rows: 3, name: 'Strohgedeckte Hütte', floor: 'earth', wall: 'thatch', windows: 1 },
  3: { cols: 7, rows: 4, name: 'Blockhaus', floor: 'planks', wall: 'logs', windows: 2 },
  4: { cols: 8, rows: 4, name: 'Steinhaus', floor: 'flagstone', wall: 'stone', windows: 2 },
  5: { cols: 9, rows: 5, name: 'Fachwerkhaus', floor: 'parquet', wall: 'timber', windows: 3 },
};

export function getRoom(shelterLevel) {
  const lvl = Math.min(5, Math.max(0, shelterLevel || 0));
  return ROOM_LEVELS[lvl] || null;
}

export function hasInterior(shelterLevel) {
  return (shelterLevel || 0) >= MIN_INTERIOR_LEVEL;
}

// --- Möbelkatalog -------------------------------------------------------
//
// layer 'floor'  → Teppiche; liegen flach, Möbel dürfen darauf stehen
// layer 'object' → alles andere; blockiert seine Zellen
// light          → Lichtquelle im Raum (wirkt abends sichtbar)
// minLevel       → braucht mindestens diese Ausbaustufe

export const FURNITURE = [
  {
    id: 'rug_straw', name: 'Flechtteppich', layer: 'floor',
    w: 2, h: 2, cozy: 9, minLevel: 2,
    cost: { hay: 10, vine: 6 },
    hint: 'Aus Heu geflochten. Warm unter den Füßen.',
  },
  {
    id: 'rug_woven', name: 'Gemusterter Teppich', layer: 'floor',
    w: 2, h: 2, cozy: 17, minLevel: 3,
    cost: { hay: 14, vine: 10, clay: 4 },
    hint: 'Mit Lehmfarben eingefärbt — das gute Stück.',
  },
  {
    id: 'bed_hay', name: 'Strohlager', layer: 'object',
    w: 2, h: 1, cozy: 8, minLevel: 2,
    cost: { hay: 8, wood: 4 },
    hint: 'Kein Bett, aber besser als der Boden.',
  },
  {
    id: 'bed_frame', name: 'Bettgestell', layer: 'object',
    w: 2, h: 1, cozy: 19, minLevel: 3,
    cost: { wood: 14, hay: 10, vine: 5 },
    hint: 'Richtig schlafen macht einen anderen Menschen aus dir.',
  },
  {
    id: 'table', name: 'Tisch', layer: 'object',
    w: 2, h: 1, cozy: 8, minLevel: 2,
    cost: { wood: 9 },
    hint: 'Ein Platz zum Essen und Ausbreiten.',
  },
  {
    id: 'stool', name: 'Hocker', layer: 'object',
    w: 1, h: 1, cozy: 4, minLevel: 2,
    cost: { wood: 4 },
    hint: 'Drei Beine, wackelt nur ein bisschen.',
  },
  {
    id: 'chest', name: 'Truhe', layer: 'object',
    w: 1, h: 1, cozy: 6, minLevel: 2,
    cost: { wood: 8, iron_ore: 2 },
    hint: 'Beschlagen und abschließbar.',
  },
  {
    id: 'shelf', name: 'Regal', layer: 'object',
    w: 1, h: 1, cozy: 9, minLevel: 2,
    cost: { wood: 10, vine: 2 },
    hint: 'Für Krüge, Körbe und gesammelten Kram.',
  },
  {
    id: 'bookshelf', name: 'Bücherwand', layer: 'object',
    w: 2, h: 1, cozy: 14, minLevel: 4,
    cost: { wood: 16, vine: 4 },
    hint: 'Selbst gebunden, selbst beschrieben.',
  },
  {
    id: 'hearth', name: 'Kaminfeuer', layer: 'object',
    w: 2, h: 1, cozy: 22, minLevel: 3,
    cost: { stone: 16, clay: 8 },
    light: { radius: 215, color: [255, 172, 88], intensity: 1.25 },
    hint: 'Das Herz des Hauses. Knistert den ganzen Abend.',
  },
  {
    id: 'lamp', name: 'Kristalllampe', layer: 'object',
    w: 1, h: 1, cozy: 15, minLevel: 4,
    cost: { crystal: 2, iron_ore: 3 },
    light: { radius: 132, color: [186, 210, 255], intensity: 0.6 },
    hint: 'Der Kristall leuchtet von selbst, wenn es dunkel wird.',
  },
  {
    id: 'candles', name: 'Kerzenschale', layer: 'object',
    w: 1, h: 1, cozy: 7, minLevel: 2,
    cost: { clay: 3, hay: 2 },
    light: { radius: 106, color: [255, 196, 124], intensity: 0.6 },
    hint: 'Drei kleine Flammen in einer Lehmschale.',
  },
  {
    id: 'plant', name: 'Topfpflanze', layer: 'object',
    w: 1, h: 1, cozy: 8, minLevel: 2,
    cost: { clay: 5, hay: 3 },
    hint: 'Etwas Grünes, um das man sich kümmern kann.',
  },
];

const BY_ID = FURNITURE.reduce((acc, f) => { acc[f.id] = f; return acc; }, {});

export function furnitureById(id) {
  return BY_ID[id] || null;
}

// Was auf dieser Ausbaustufe überhaupt baubar ist
export function availableFurniture(shelterLevel) {
  const lvl = shelterLevel || 0;
  return FURNITURE.filter(f => lvl >= f.minLevel);
}

// --- Platzierung --------------------------------------------------------

// Alle Zellen, die ein Möbelstück belegt
export function occupiedCells(def, col, row) {
  const out = [];
  for (let dy = 0; dy < def.h; dy++) {
    for (let dx = 0; dx < def.w; dx++) out.push({ col: col + dx, row: row + dy });
  }
  return out;
}

/**
 * Passt das Möbelstück an diese Stelle?
 * Teppiche (layer 'floor') kollidieren nur mit anderen Teppichen —
 * ein Tisch darf selbstverständlich auf dem Teppich stehen.
 */
export function canPlace(placed, def, col, row, room) {
  if (!room || !def) return false;
  if (col < 0 || row < 0) return false;
  if (col + def.w > room.cols || row + def.h > room.rows) return false;

  const wanted = occupiedCells(def, col, row);
  for (const p of placed) {
    const pDef = furnitureById(p.id);
    if (!pDef) continue;
    if (pDef.layer !== def.layer) continue;   // andere Ebene → kein Konflikt
    const taken = occupiedCells(pDef, p.col, p.row);
    for (const w of wanted) {
      if (taken.some(t => t.col === w.col && t.row === w.row)) return false;
    }
  }
  return true;
}

// Index des obersten Möbelstücks auf dieser Zelle (Objekte vor Teppichen)
export function furnitureAt(placed, col, row) {
  let floorHit = -1;
  for (let i = placed.length - 1; i >= 0; i--) {
    const def = furnitureById(placed[i].id);
    if (!def) continue;
    const hit = occupiedCells(def, placed[i].col, placed[i].row)
      .some(c => c.col === col && c.row === row);
    if (!hit) continue;
    if (def.layer === 'object') return i;
    if (floorHit < 0) floorHit = i;
  }
  return floorHit;
}

// --- Kosten -------------------------------------------------------------

export function canAffordFurniture(def, inventory) {
  if (!def) return false;
  return Object.entries(def.cost).every(
    ([id, amount]) => (inventory?.[id]?.amount || 0) >= amount
  );
}

export function missingFor(def, inventory) {
  if (!def) return [];
  return Object.entries(def.cost)
    .filter(([id, amount]) => (inventory?.[id]?.amount || 0) < amount)
    .map(([id, amount]) => ({
      id,
      name: items[id]?.name || id,
      need: amount,
      have: inventory?.[id]?.amount || 0,
    }));
}

export function costLabel(def) {
  if (!def) return '';
  return Object.entries(def.cost)
    .map(([id, amount]) => `${amount}× ${items[id]?.name || id}`)
    .join(', ');
}

// --- Gemütlichkeit ------------------------------------------------------

// Wie viele Möbelpunkte ein Raum braucht, um als voll eingerichtet zu gelten.
// Skaliert mit der Fläche — im Fachwerkhaus reicht ein Hocker eben nicht.
export function cozyTarget(shelterLevel) {
  const room = getRoom(shelterLevel);
  if (!room) return 0;
  return room.cols * room.rows * 4;
}

/**
 * Rohe Möbelpunkte mit abnehmendem Ertrag pro Sorte:
 * der erste Hocker zählt voll, der zweite zu 60 %, der dritte zu 36 % …
 * So bringt es nichts, den Raum mit dem billigsten Möbelstück zuzustellen.
 */
export function cozyPoints(placed) {
  const seen = {};
  let total = 0;
  for (const p of placed || []) {
    const def = furnitureById(p.id);
    if (!def) continue;
    const n = seen[def.id] || 0;
    total += def.cozy * Math.pow(0.6, n);
    seen[def.id] = n + 1;
  }
  return total;
}

// Gemütlichkeit 0..100
export function cozyScore(gameState) {
  const level = gameState?.buildings?.shelterLevel || 0;
  const target = cozyTarget(level);
  if (!target) return 0;
  const points = cozyPoints(gameState?.interior?.furniture || []);
  return Math.max(0, Math.min(100, Math.round((points / target) * 100)));
}

// Stimmungs-Multiplikator: 0 % → 1.00, 100 % → 0.72
export function cozyMoodFactor(score) {
  const s = Math.max(0, Math.min(100, score || 0));
  return 1 - (s / 100) * 0.28;
}

// Bequemer Einstieg für das Bedürfnis-System
export function getCozyFactor(gameState) {
  if (!hasInterior(gameState?.buildings?.shelterLevel)) return 1;
  return cozyMoodFactor(cozyScore(gameState));
}

export function cozyLabel(score) {
  if (score >= 90) return 'Ein echtes Zuhause';
  if (score >= 75) return 'Heimelig';
  if (score >= 55) return 'Gemütlich';
  if (score >= 35) return 'Wohnlich';
  if (score >= 15) return 'Schlicht';
  return 'Kahl';
}

// Lichtquellen im Raum (für die Beleuchtung im Innenraum-Renderer)
export function interiorLights(placed) {
  const out = [];
  for (const p of placed || []) {
    const def = furnitureById(p.id);
    if (def?.light) out.push({ ...p, def });
  }
  return out;
}
