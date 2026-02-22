// ============================================
// Loot-Tabellen für Sammelreisen
// ============================================
//
// DREI-LOTTERIEN-SYSTEM:
//
// 1) BASIS-LOTTERIE (5% pro Minute):
//    Feste Verteilung: 25% Essen, 25% Holz, 25% Stein, 25% Rest (biomspezifisch)
//    → Erwartung: ~6 Items bei 2h
//
// 2) WERKZEUG-LOTTERIE (2%/4%/6% pro Minute je nach Tier):
//    Nur wenn passendes Werkzeug vorhanden. Droppt das werkzeugspezifische Item.
//    Holz-Werkzeug: 2%, Stein: 4%, Kristall: 6%
//    → Erwartung: ~2.4-7.2 extra Items bei 2h
//
// 3) SELTENHEITS-LOTTERIE (2% pro Minute, erst ab Minute 60):
//    Seltene Items (Eisenerz, Kristall, Lehm). Kristall am seltensten.
//    → Erwartung: ~1.2 seltene Items bei 2h
//
// GESAMT bei 2h ohne Tool: ~6 + 1.2 = ~7.2 Items
// GESAMT bei 2h mit Stein-Tool: ~6 + 4.8 + 1.2 = ~12 Items

import { getActiveToolTypes } from '../systems/ToolSystem';

// --- Tuning-Konstanten ---
export const BASE_DROP_CHANCE = 0.05;    // 5% pro Minute — Basis-Lotterie
export const RARE_DROP_CHANCE = 0.02;    // 2% pro Minute — Seltenheits-Lotterie (ab Min 60)
export const RARE_START_MINUTE = 60;     // Ab wann die Seltenheits-Lotterie startet

// Werkzeug-Lotterie: Chance pro Tier
export const TOOL_DROP_CHANCE = {
  wood: 0.02,     // 2% pro Minute
  stone: 0.04,    // 4% pro Minute
  crystal: 0.06,  // 6% pro Minute
};

// --- Basis-Kategorien (gleich für alle Biome) ---
// 25% Essen, 25% Holz, 25% Stein, 25% biomspezifisches "Rest"
const BASE_CATEGORIES = {
  food: 0.25,
  wood: 0.25,
  stone: 0.25,
  special: 0.25,
};

// Essen-Pool pro Biom (welches Essen in welchem Biom droppt)
const FOOD_POOLS = {
  north: ['berry', 'mushroom', 'fruit', 'coconut'],
  south: ['seaweed', 'fish', 'berry'],
  west:  ['berry', 'coconut', 'mushroom', 'fruit'],
  east:  ['berry', 'mushroom'],
};

// "Rest"-Pool pro Biom (das 25% biomspezifische Segment)
const SPECIAL_POOLS = {
  north: ['vine', 'dirty_water', 'clay'],
  south: ['dirty_water', 'vine', 'clay'],
  west:  ['vine', 'dirty_water', 'tree_seed'],
  east:  ['dirty_water', 'clay', 'vine'],
};

// Werkzeug-Item-Zuordnung (was droppt die Werkzeug-Lotterie)
const TOOL_DROPS = {
  axe:         'wood',
  fishing_rod: 'fish',
  pickaxe:     'stone',
};

// Welches Biom hat welches Werkzeug
const BIOME_TOOL = {
  north: 'axe',
  south: 'fishing_rod',
  west:  null,
  east:  'pickaxe',
};

// Seltenheits-Pool pro Biom (Kristall immer am seltensten)
const RARE_POOLS = {
  north: [
    { itemId: 'vine',     weight: 40 },
    { itemId: 'clay',     weight: 35 },
    { itemId: 'iron_ore', weight: 20 },
    { itemId: 'crystal',  weight: 5 },
  ],
  south: [
    { itemId: 'clay',     weight: 40 },
    { itemId: 'vine',     weight: 30 },
    { itemId: 'iron_ore', weight: 20 },
    { itemId: 'crystal',  weight: 10 },
  ],
  west: [
    { itemId: 'vine',     weight: 40 },
    { itemId: 'clay',     weight: 30 },
    { itemId: 'iron_ore', weight: 20 },
    { itemId: 'crystal',  weight: 10 },
  ],
  east: [
    { itemId: 'clay',     weight: 30 },
    { itemId: 'iron_ore', weight: 40 },
    { itemId: 'crystal',  weight: 15 },
    { itemId: 'vine',     weight: 15 },
  ],
};

// Biom-Namen (für UI)
const BIOME_NAMES = {
  north: 'Wald',
  south: 'See',
  west: 'Felder',
  east: 'Klippen',
};

// ============================================
// Loot-Berechnung: 3 unabhängige Lotterien
// ============================================

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function pickWeighted(pool) {
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) return item.itemId;
  }
  return pool[pool.length - 1].itemId;
}

export function calculateLoot(biomeKey, durationMs, tools = []) {
  if (!BIOME_NAMES[biomeKey]) return [];

  const durationMin = durationMs / (60 * 1000);
  const rounds = Math.floor(durationMin);
  const loot = {};

  const addLoot = (itemId) => {
    loot[itemId] = (loot[itemId] || 0) + 1;
  };

  // ========================================
  // LOTTERIE 1: Basis-Drops (5% pro Minute)
  // 25% Essen, 25% Holz, 25% Stein, 25% Rest
  // ========================================
  for (let minute = 1; minute <= rounds; minute++) {
    if (Math.random() > BASE_DROP_CHANCE) continue;

    // Kategorie auswürfeln
    const catRoll = Math.random();
    if (catRoll < BASE_CATEGORIES.food) {
      // Essen
      const pool = FOOD_POOLS[biomeKey];
      addLoot(pickRandom(pool));
    } else if (catRoll < BASE_CATEGORIES.food + BASE_CATEGORIES.wood) {
      // Holz
      addLoot('wood');
    } else if (catRoll < BASE_CATEGORIES.food + BASE_CATEGORIES.wood + BASE_CATEGORIES.stone) {
      // Stein
      addLoot('stone');
    } else {
      // Biomspezifisches Rest-Item
      const pool = SPECIAL_POOLS[biomeKey];
      addLoot(pickRandom(pool));
    }
  }

  // ========================================
  // LOTTERIE 2: Werkzeug-Drops (2/4/6% pro Minute)
  // Nur wenn passendes Werkzeug vorhanden
  // ========================================
  const biomeToolType = BIOME_TOOL[biomeKey];
  if (biomeToolType) {
    const activeTypes = getActiveToolTypes(tools);
    if (activeTypes.includes(biomeToolType)) {
      // Tier des besten Werkzeugs bestimmen
      const bestTool = tools
        .filter(t => t.toolType === biomeToolType && t.durability > 0)
        .sort((a, b) => {
          const tierOrder = ['wood', 'stone', 'crystal'];
          return tierOrder.indexOf(b.tier) - tierOrder.indexOf(a.tier);
        })[0];

      if (bestTool) {
        const toolChance = TOOL_DROP_CHANCE[bestTool.tier] || 0.02;
        const toolItem = TOOL_DROPS[biomeToolType];

        for (let minute = 1; minute <= rounds; minute++) {
          if (Math.random() <= toolChance) {
            addLoot(toolItem);
          }
        }
      }
    }
  }

  // ========================================
  // LOTTERIE 3: Seltenheits-Drops (2% pro Minute, ab Minute 60)
  // Kristall am seltensten
  // ========================================
  const rarePool = RARE_POOLS[biomeKey];
  if (rarePool) {
    for (let minute = RARE_START_MINUTE + 1; minute <= rounds; minute++) {
      if (Math.random() > RARE_DROP_CHANCE) continue;
      addLoot(pickWeighted(rarePool));
    }
  }

  // In Array umwandeln und alphabetisch sortieren
  return Object.entries(loot)
    .map(([itemId, amount]) => ({ itemId, amount }))
    .sort((a, b) => a.itemId.localeCompare(b.itemId));
}

// Legacy-kompatibel: lootTables-Objekt mit Biom-Namen exportieren
const lootTables = Object.fromEntries(
  Object.entries(BIOME_NAMES).map(([key, name]) => [key, { name }])
);

export default lootTables;
