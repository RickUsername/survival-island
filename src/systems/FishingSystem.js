// ============================================
// Angeln am Teich
// ============================================
// Der Tümpel war bisher reine Kulisse. Angeln gibt ihm eine Aufgabe und
// eine Nahrungsquelle, die nicht an Sammelreisen hängt — praktisch, wenn
// man kurz Zeit hat, aber keine ganze Reise starten will.
//
// Ablauf: auswerfen → auf den Biss warten → im richtigen Moment anschlagen
// → Fisch einholen. Die Angel bestimmt, wie großzügig die Zeitfenster sind.

import { hash1 } from '../render/noise';

export const ROD_TIERS = {
  wood_fishing_rod: {
    tier: 'wood', label: 'Holzangel',
    biteWindow: 1100,     // ms zum Anschlagen
    catchZone: 0.30,      // Anteil des Balkens, der zählt
    lootBoost: 0,
  },
  stone_fishing_rod: {
    tier: 'stone', label: 'Steinangel',
    biteWindow: 1400,
    catchZone: 0.38,
    lootBoost: 1,
  },
  crystal_fishing_rod: {
    tier: 'crystal', label: 'Kristallangel',
    biteWindow: 1800,
    catchZone: 0.46,
    lootBoost: 2,
  },
};

// Fangtabelle. `weight` je Angelstufe — bessere Angeln fangen Selteneres.
const CATCH_TABLE = [
  { itemId: 'fish',     name: 'Fisch',            weights: [62, 55, 46], amount: 1 },
  { itemId: 'fish',     name: 'Zwei Fische',      weights: [10, 16, 20], amount: 2 },
  { itemId: 'seaweed',  name: 'Wasserpflanze',    weights: [14, 11, 8],  amount: 1, fallback: 'plant_fiber' },
  { itemId: 'stone',    name: 'Alter Stein',      weights: [8, 6, 4],    amount: 1 },
  { itemId: 'pearl',    name: 'Perle',            weights: [4, 8, 14],   amount: 1, fallback: 'crystal' },
  { itemId: 'tree_seed', name: 'Angeschwemmter Samen', weights: [2, 4, 8], amount: 1 },
];

/** Beste vorhandene Angel im Werkzeuggürtel */
export function getBestRod(tools) {
  const order = ['crystal_fishing_rod', 'stone_fishing_rod', 'wood_fishing_rod'];
  for (const id of order) {
    const t = (tools || []).find(x => x.id === id && (x.durability === undefined || x.durability > 0));
    if (t) return { tool: t, def: ROD_TIERS[id] };
  }
  return null;
}

/** Wartezeit bis zum Biss — bewusst unvorhersehbar, das ist der Reiz */
export function biteDelay() {
  return 1600 + Math.random() * 4200;
}

/**
 * Auslosen, was an der Angel hängt.
 * @param {number} tierIdx 0 Holz, 1 Stein, 2 Kristall
 * @param {object} items   Item-Datenbank, um Fallbacks zu prüfen
 */
export function rollCatch(tierIdx, items) {
  const entries = CATCH_TABLE.map(e => {
    // Nicht existierende Items auf einen vorhandenen Ersatz umbiegen
    let itemId = e.itemId;
    if (!items[itemId]) itemId = e.fallback && items[e.fallback] ? e.fallback : 'fish';
    return { ...e, itemId, weight: e.weights[tierIdx] };
  });

  const total = entries.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) {
      return { itemId: e.itemId, amount: e.amount, name: items[e.itemId]?.name || e.name };
    }
  }
  const last = entries[entries.length - 1];
  return { itemId: last.itemId, amount: last.amount, name: items[last.itemId]?.name || last.name };
}

/** Stimmungsgewinn fürs Angeln — ruhig und entspannend */
export const FISHING_MOOD_GAIN = 3;

/** Wie stark eine Angelrunde die Haltbarkeit kostet */
export const FISHING_DURABILITY_COST = 1;

/** Deterministische Wellenposition für die Schwimmer-Animation */
export function bobberOffset(t, seed = 0) {
  return Math.sin(t * 2.1 + seed) * 1.6 + Math.sin(t * 3.7 + seed * 2) * 0.8;
}

export { hash1 };
