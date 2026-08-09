// ============================================
// Inventar-Hilfen — zentrales Stapeln mit korrekter Frische
// ============================================
// Verderbliche Waren tragen einen Zeitstempel `collectedAt`. Beim Stapeln
// wurde dieser Stempel bisher nie angefasst: Wer eine sechs Tage alte
// Frucht im Rucksack hatte und zwanzig frische dazulegte, verlor am
// nächsten Tag alle einundzwanzig.
//
// Deshalb wird der Stempel hier mengengewichtet fortgeschrieben. Eine
// große frische Lieferung setzt die Uhr fast zurück, eine einzelne
// zusätzliche Frucht kaum. Das entspricht dem, was Spielerinnen
// intuitiv erwarten, ohne Verderb ganz auszuhebeln.

import items from '../data/items';

/**
 * Legt eine Menge eines Gegenstands ins Inventar (unveränderlich).
 * @param {object} inventory  bisheriges Inventar
 * @param {string} itemId
 * @param {number} amount     positive Stückzahl
 * @param {number} now        Zeitstempel der neuen Ware
 * @returns {object} neues Inventar
 */
export function addItem(inventory, itemId, amount, now = Date.now()) {
  if (!itemId || !amount || amount <= 0) return inventory;

  const next = { ...inventory };
  const existing = next[itemId];
  const perishable = !!items[itemId]?.spoilTime;

  if (!existing) {
    next[itemId] = { amount, collectedAt: now };
    return next;
  }

  const oldAmount = existing.amount || 0;
  let collectedAt = existing.collectedAt ?? now;

  if (perishable && oldAmount > 0) {
    // Mengengewichtetes Mittel der Sammelzeitpunkte
    const total = oldAmount + amount;
    collectedAt = Math.round((collectedAt * oldAmount + now * amount) / total);
  } else if (!existing.collectedAt) {
    collectedAt = now;
  }

  next[itemId] = { ...existing, amount: oldAmount + amount, collectedAt };
  return next;
}

/** Mehrere Positionen auf einmal einbuchen: [{ itemId, amount }] */
export function addItems(inventory, list, now = Date.now()) {
  let inv = inventory;
  for (const entry of list || []) {
    inv = addItem(inv, entry.itemId, entry.amount, now);
  }
  return inv;
}

/** Entfernt eine Menge; leere Stapel verschwinden. */
export function removeItem(inventory, itemId, amount = 1) {
  const existing = inventory[itemId];
  if (!existing) return inventory;

  const next = { ...inventory };
  const rest = (existing.amount || 0) - amount;
  if (rest <= 0) {
    delete next[itemId];
  } else {
    next[itemId] = { ...existing, amount: rest };
  }
  return next;
}
