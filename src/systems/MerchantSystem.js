// ============================================
// Wandernder Händler
// ============================================
// Alle paar Tage legt ein Händler auf der Insel an, bleibt einen Tag und
// zieht weiter. Sein Angebot ist an das Datum gekoppelt und damit für alle
// gleich — es muss nichts gespeichert werden außer dem, was gekauft wurde.
//
// Er bringt zwei Dinge ins Spiel, die sonst fehlen: einen Grund, Vorräte
// aufzuheben, und seltene Waren, die man nicht erwandern kann.

import items from '../data/items';

const DAY = 24 * 60 * 60 * 1000;
// Er kommt im Schnitt alle vier Tage
const VISIT_CYCLE = 4;

function dayNumber(ts = Date.now()) {
  const d = new Date(ts);
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY);
}

function hashDay(n, salt = 0) {
  let h = (n * 2654435761 + salt * 40503) | 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13;
  return Math.abs(h);
}

/** Ist der Händler heute da? */
export function isMerchantHere(ts = Date.now()) {
  return hashDay(dayNumber(ts)) % VISIT_CYCLE === 0;
}

/** Tagesschlüssel für „heute schon eingekauft" */
export function merchantDayKey(ts = Date.now()) {
  return `m${dayNumber(ts)}`;
}

/** Wann kommt er das nächste Mal? (Tage ab heute) */
export function daysUntilMerchant(ts = Date.now()) {
  const today = dayNumber(ts);
  for (let i = 0; i <= 14; i++) {
    if (hashDay(today + i) % VISIT_CYCLE === 0) return i;
  }
  return null;
}

// Waren, die er führen kann. `price` in Muscheln (Tauschwährung des Shops
// existiert nicht — deshalb tauscht er Ware gegen Ware).
const STOCK_POOL = [
  { give: [{ id: 'wood', amount: 12 }], get: { id: 'crystal', amount: 1 }, label: 'Kristall' },
  { give: [{ id: 'stone', amount: 10 }], get: { id: 'tree_seed', amount: 2 }, label: 'Baumsamen' },
  { give: [{ id: 'fish', amount: 4 }], get: { id: 'mysterious_egg', amount: 1 }, label: 'Mysteriöses Ei' },
  { give: [{ id: 'berry', amount: 8 }], get: { id: 'rope', amount: 3 }, label: 'Seil' },
  { give: [{ id: 'mushroom', amount: 6 }], get: { id: 'stone', amount: 12 }, label: 'Steine' },
  { give: [{ id: 'plant_fiber', amount: 10 }], get: { id: 'wood', amount: 14 }, label: 'Holz' },
  { give: [{ id: 'fruit', amount: 6 }], get: { id: 'chicken_egg', amount: 3 }, label: 'Hühnereier' },
  { give: [{ id: 'crystal', amount: 1 }], get: { id: 'cooked_fish', amount: 4 }, label: 'Gebratener Fisch' },
];

/** Drei Angebote für heute — deterministisch aus dem Datum */
export function getMerchantStock(ts = Date.now()) {
  const n = dayNumber(ts);
  const pool = STOCK_POOL.filter(o =>
    items[o.get.id] && o.give.every(g => items[g.id])
  );
  if (pool.length === 0) return [];

  const picked = [];
  const used = new Set();
  for (let i = 0; picked.length < 3 && i < 30; i++) {
    const idx = hashDay(n, i + 1) % pool.length;
    if (used.has(idx)) continue;
    used.add(idx);
    const offer = pool[idx];
    picked.push({
      ...offer,
      id: `${merchantDayKey(ts)}_${idx}`,
      getName: items[offer.get.id]?.name || offer.label,
    });
  }
  return picked;
}

/** Kann der Spieler dieses Angebot bezahlen? */
export function canAfford(offer, inventory) {
  return offer.give.every(g => (inventory?.[g.id]?.amount || 0) >= g.amount);
}

/** Name eines Items für die Anzeige */
export function itemName(id) {
  return items[id]?.name || id;
}

/** Begrüßungstexte — wechseln je Besuch */
const GREETINGS = [
  'Schön, wieder hier zu sein. Die Überfahrt war ruhig.',
  'Ich habe Neues im Gepäck. Nur heute, morgen bin ich weiter.',
  'Deine Insel wird von Mal zu Mal hübscher.',
  'Kalte Nächte da draußen. Ein warmes Feuer wäre was.',
  'Ich tausche lieber, als Münzen zu zählen. Was hast du?',
];

export function getGreeting(ts = Date.now()) {
  return GREETINGS[hashDay(dayNumber(ts), 99) % GREETINGS.length];
}

/** Standort auf der Karte (feste Ecke am Süd-Ausgang, nah am Wasser) */
export const MERCHANT_TILE = { col: 15, row: 12 };
