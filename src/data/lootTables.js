// ============================================
// Loot-Tabellen für Sammelreisen
// ============================================
//
// MECHANIK:
// - Jede Minute Reisedauer = 1 Runde
// - Pro Runde: DROP_CHANCE (5%) ob überhaupt ein Item droppt
// - Wenn Drop → gewichtete Auswahl welches Item (biom-spezifisch)
// - Erwartungswert: 120 Runden × 0.05 = ~6 Items bei voller 2h-Reise
//
// GEWICHTUNG (Ziel-Kategorien pro Biom):
// - Nahrung/Wasser: ~40%
// - Holz:           ~30%
// - Stein:          ~20%
// - Seltenes:       ~10% (Lianen, Lehm, Erz, Kristall)
//
// SELTENHEITS-BOOST:
// Items mit rarity: 'uncommon' oder 'rare' bekommen pro vergangene
// Minute einen kleinen Gewichts-Bonus (+0.5% uncommon, +1% rare),
// sodass sich längere Reisen mehr lohnen für seltene Funde.
//
// minTime = ab welcher Reise-Minute dieses Item im Loot-Pool ist

import { getToolLootMultiplier, getActiveToolTypes } from '../systems/ToolSystem';

// --- Tuning-Konstanten ---
export const DROP_CHANCE = 0.05;            // 5% pro Runde (Minute)
export const TOOL_BONUS_DROP_CHANCE = 0.03; // 3% extra pro Runde mit Werkzeug

// Seltenheits-Boost: Gewicht steigt pro Minute um diesen Faktor
// Formel: effektivWeight = baseWeight * (1 + boost * vergangeneMinuten)
export const RARITY_BOOST = {
  common: 0,        // kein Boost
  uncommon: 0.005,  // +0.5% pro Minute → nach 60 Min: +30%, nach 120 Min: +60%
  rare: 0.01,       // +1.0% pro Minute → nach 60 Min: +60%, nach 120 Min: +120%
};

const lootTables = {
  // =============================================
  // WALD (Norden)
  // =============================================
  // Thema: Dichter Wald mit Unterholz, Bäche
  // Primär: Holz & Waldfrüchte
  // Sekundär: Lianen, Pilze, Bachwasser
  north: {
    name: 'Wald',
    drops: [
      // Nahrung (~35%)
      { itemId: 'berry',       weight: 15, minTime: 0,  rarity: 'common' },
      { itemId: 'mushroom',    weight: 8,  minTime: 5,  rarity: 'common' },
      { itemId: 'fruit',       weight: 12, minTime: 5,  rarity: 'common' },
      // Wasser (~10%): Kleine Bäche im Wald
      { itemId: 'dirty_water', weight: 10, minTime: 0,  rarity: 'common' },
      // Holz (~30%) – Wald ist DIE Holzquelle
      { itemId: 'wood',        weight: 30, minTime: 0,  rarity: 'common' },
      // Seltenes (~25%): Lianen überall im Dschungel
      { itemId: 'vine',        weight: 17, minTime: 10, rarity: 'common' },
      { itemId: 'coconut',     weight: 8,  minTime: 20, rarity: 'uncommon' },
    ],
    toolBonus: {
      axe: [
        { itemId: 'wood', weight: 100, minTime: 0, rarity: 'common' },
      ],
    },
  },

  // =============================================
  // SEE (Süden)
  // =============================================
  // Thema: Süßwassersee mit Ufer
  // Primär: Wasser (höchster Anteil!) & Fisch (mit Angel)
  // Sekundär: Seetang, Lehm, Treibholz
  south: {
    name: 'See',
    drops: [
      // Wasser (~45%) – DAS Wasser-Biom, höchster Anteil
      { itemId: 'dirty_water', weight: 45, minTime: 0,  rarity: 'common' },
      // Nahrung (~15%): Seetang am Ufer
      { itemId: 'seaweed',     weight: 15, minTime: 0,  rarity: 'common' },
      // Holz (~15%): Treibholz am Ufer
      { itemId: 'wood',        weight: 15, minTime: 5,  rarity: 'common' },
      // Stein (~10%): Kiesel am Ufer
      { itemId: 'stone',       weight: 10, minTime: 5,  rarity: 'common' },
      // Seltenes (~15%): Lehm & Lianen am Ufer
      { itemId: 'clay',        weight: 10, minTime: 10, rarity: 'uncommon' },
      { itemId: 'vine',        weight: 5,  minTime: 15, rarity: 'common' },
    ],
    toolBonus: {
      fishing_rod: [
        { itemId: 'fish', weight: 100, minTime: 0, rarity: 'common' },
      ],
    },
  },

  // =============================================
  // FELDER (Westen)
  // =============================================
  // Thema: Offene Grasflächen, Büsche, vereinzelte Bäume
  // Primär: Beeren, Kokosnüsse, Pilze – Nahrungsparadies
  // Sekundär: Lianen, etwas Holz
  west: {
    name: 'Felder',
    drops: [
      // Nahrung (~50%) – Felder sind DAS Nahrungsbiom
      { itemId: 'berry',    weight: 25, minTime: 0,  rarity: 'common' },
      { itemId: 'coconut',  weight: 15, minTime: 5,  rarity: 'common' },
      { itemId: 'mushroom', weight: 10, minTime: 10, rarity: 'common' },
      // Holz (~20%): Vereinzelte Bäume
      { itemId: 'wood',     weight: 20, minTime: 5,  rarity: 'common' },
      // Seltenes (~30%): Viele Lianen, etwas Seetang
      { itemId: 'vine',     weight: 20, minTime: 0,  rarity: 'common' },
      { itemId: 'dirty_water', weight: 10, minTime: 10, rarity: 'common' },
    ],
    toolBonus: {},
  },

  // =============================================
  // KLIPPEN (Osten)
  // =============================================
  // Thema: Felsige Steilküste, Höhlen
  // Primär: Stein, Erz, Kristalle – DAS Bergbau-Biom
  // Sekundär: Lehm, etwas Wasser aus Quellen
  // Kaum Nahrung/Holz – gefährliches Biom für lange Trips
  east: {
    name: 'Klippen',
    drops: [
      // Wasser (~15%): Quellwasser aus Felsspalten
      { itemId: 'dirty_water', weight: 15, minTime: 0,  rarity: 'common' },
      // Holz (~5%): Fast kein Holz an den Klippen
      { itemId: 'wood',        weight: 5,  minTime: 15, rarity: 'common' },
      // Stein (~40%): Hauptressource
      { itemId: 'stone',       weight: 40, minTime: 0,  rarity: 'common' },
      // Seltenes (~40%): Lehm, Eisenerz, Kristalle
      { itemId: 'clay',        weight: 15, minTime: 5,  rarity: 'common' },
      { itemId: 'iron_ore',    weight: 15, minTime: 30, rarity: 'uncommon' },
      { itemId: 'crystal',     weight: 10, minTime: 60, rarity: 'rare' },
    ],
    toolBonus: {
      pickaxe: [
        { itemId: 'stone',    weight: 40, minTime: 0,  rarity: 'common' },
        { itemId: 'iron_ore', weight: 40, minTime: 15, rarity: 'uncommon' },
        { itemId: 'crystal',  weight: 20, minTime: 30, rarity: 'rare' },
      ],
    },
  },
};

// ============================================
// Loot-Berechnung
// ============================================

// Effektives Gewicht mit Seltenheits-Boost berechnen
function getEffectiveWeight(drop, elapsedMinutes) {
  const boost = RARITY_BOOST[drop.rarity] || 0;
  return drop.weight * (1 + boost * elapsedMinutes);
}

export function calculateLoot(biomeKey, durationMs, tools = []) {
  const biome = lootTables[biomeKey];
  if (!biome) return [];

  const durationMin = durationMs / (60 * 1000);
  const rounds = Math.floor(durationMin); // 1 Runde pro Minute
  const loot = {};

  // --- Basis-Drops ---
  for (let minute = 1; minute <= rounds; minute++) {
    // Schritt 1: Fällt überhaupt ein Item? (5% Chance)
    if (Math.random() > DROP_CHANCE) continue;

    // Verfügbare Drops für diese Minute (minTime-Filter)
    const availableDrops = biome.drops.filter(d => minute >= d.minTime);
    if (availableDrops.length === 0) continue;

    // Schritt 2: Gewichte mit Seltenheits-Boost berechnen
    const weights = availableDrops.map(d => getEffectiveWeight(d, minute));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // Schritt 3: Gewichteter Zufall
    const roll = Math.random() * totalWeight;
    let cumulative = 0;

    for (let i = 0; i < availableDrops.length; i++) {
      cumulative += weights[i];
      if (roll <= cumulative) {
        const drop = availableDrops[i];
        loot[drop.itemId] = (loot[drop.itemId] || 0) + 1;
        break;
      }
    }
  }

  // --- Werkzeug-Bonus-Drops ---
  // tools ist jetzt ein Array von Objekten mit { toolType, tier, durability }
  const activeToolTypes = getActiveToolTypes(tools);

  for (const toolType of activeToolTypes) {
    const bonusDrops = biome.toolBonus?.[toolType];
    if (!bonusDrops || bonusDrops.length === 0) continue;

    // Tier-Multiplikator: Holz = halber Bonus, Stein = normal, Kristall = 1.5x
    const tierMult = getToolLootMultiplier(tools, toolType);

    for (let minute = 1; minute <= rounds; minute++) {
      // Drop-Chance mit Tier-Multiplikator
      if (Math.random() > TOOL_BONUS_DROP_CHANCE * tierMult) continue;

      const availableBonus = bonusDrops.filter(d => minute >= d.minTime);
      if (availableBonus.length === 0) continue;

      const weights = availableBonus.map(d => getEffectiveWeight(d, minute));
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);

      const roll = Math.random() * totalWeight;
      let cumulative = 0;

      for (let i = 0; i < availableBonus.length; i++) {
        cumulative += weights[i];
        if (roll <= cumulative) {
          const drop = availableBonus[i];
          loot[drop.itemId] = (loot[drop.itemId] || 0) + 1;
          break;
        }
      }
    }
  }

  // In Array umwandeln und alphabetisch sortieren
  return Object.entries(loot)
    .map(([itemId, amount]) => ({ itemId, amount }))
    .sort((a, b) => a.itemId.localeCompare(b.itemId));
}

export default lootTables;
