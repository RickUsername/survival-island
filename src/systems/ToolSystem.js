// ============================================
// Werkzeug-System - Haltbarkeit & Stufen
// ============================================
// Werkzeuge haben 3 Stufen: Holz (60 Min), Stein (240 Min), Kristall (480 Min)
// tools-Array: [{ id: 'stone_axe', toolType: 'axe', tier: 'stone', durability: 240 }]

import items from '../data/items';

// Tier-Reihenfolge (höher = besser)
const TIER_ORDER = ['wood', 'stone', 'crystal'];

// Haltbarkeits-Bonus: Holzwerkzeuge haben geringeren Loot-Bonus
export const TIER_LOOT_MULTIPLIER = {
  wood: 0.5,    // Halber Bonus
  stone: 1.0,   // Normaler Bonus
  crystal: 1.5,  // 50% mehr Bonus
};

// Prüfen ob Spieler ein Werkzeug eines bestimmten Typs hat
export function hasTool(tools, toolType) {
  return tools.some(t => t.toolType === toolType && t.durability > 0);
}

// Bestes Werkzeug eines Typs finden
export function getBestTool(tools, toolType) {
  const matching = tools.filter(t => t.toolType === toolType && t.durability > 0);
  if (matching.length === 0) return null;

  // Nach Tier sortieren (bestes zuerst)
  matching.sort((a, b) => TIER_ORDER.indexOf(b.tier) - TIER_ORDER.indexOf(a.tier));
  return matching[0];
}

// Prüfen ob Spieler ein Werkzeug eines bestimmten Typs UND mindestens einer bestimmten Stufe hat
export function hasToolOfTier(tools, toolType, minTier) {
  const minTierIndex = TIER_ORDER.indexOf(minTier);
  return tools.some(t =>
    t.toolType === toolType &&
    t.durability > 0 &&
    TIER_ORDER.indexOf(t.tier) >= minTierIndex
  );
}

// Alle Tool-Typen die der Spieler hat (für Loot-Berechnung)
export function getActiveToolTypes(tools) {
  const types = new Set();
  for (const tool of tools) {
    if (tool.durability > 0) {
      types.add(tool.toolType);
    }
  }
  return Array.from(types);
}

// Haltbarkeit von Werkzeugen reduzieren nach Sammelreise
// Nur das BENUTZTE Werkzeug verliert Haltbarkeit (das beste pro Typ)
export function drainToolDurability(tools, durationMs, biomeToolTypes) {
  const durationMin = durationMs / (60 * 1000);
  const newTools = tools.map(t => ({ ...t }));

  for (const toolType of biomeToolTypes) {
    // Finde das beste Werkzeug dieses Typs (das wird benutzt)
    const bestIdx = findBestToolIndex(newTools, toolType);
    if (bestIdx === -1) continue;

    // Haltbarkeit reduzieren (1 Minute pro Minute Reise)
    newTools[bestIdx].durability = Math.max(0, newTools[bestIdx].durability - durationMin);
  }

  // Kaputte Werkzeuge entfernen (durability <= 0)
  return newTools.filter(t => t.durability > 0);
}

// Index des besten Werkzeugs eines Typs finden
function findBestToolIndex(tools, toolType) {
  let bestIdx = -1;
  let bestTier = -1;

  for (let i = 0; i < tools.length; i++) {
    if (tools[i].toolType === toolType && tools[i].durability > 0) {
      const tierIdx = TIER_ORDER.indexOf(tools[i].tier);
      if (tierIdx > bestTier) {
        bestTier = tierIdx;
        bestIdx = i;
      }
    }
  }

  return bestIdx;
}

// Neues Werkzeug erstellen aus Item-Definition
export function createTool(itemId) {
  const itemDef = items[itemId];
  if (!itemDef || itemDef.category !== 'tool') return null;

  return {
    id: itemDef.id,
    toolType: itemDef.toolType,
    tier: itemDef.tier,
    durability: itemDef.durability,
  };
}

// Altes Tools-Format (string[]) auf neues Format migrieren
export function migrateTools(tools) {
  if (!Array.isArray(tools)) return [];
  if (tools.length === 0) return [];

  // Prüfen ob schon neues Format
  if (typeof tools[0] === 'object' && tools[0].toolType) {
    return tools;
  }

  // Altes Format: ['axe', 'fishing_rod'] → neues Format
  const OLD_TO_NEW = {
    'axe': 'stone_axe',
    'fishing_rod': 'stone_fishing_rod',
    'pickaxe': 'stone_pickaxe',
  };

  return tools
    .map(oldId => {
      const newId = OLD_TO_NEW[oldId];
      if (!newId) return null;
      return createTool(newId);
    })
    .filter(Boolean);
}

// Loot-Multiplikator für ein Werkzeug-Typ bekommen
export function getToolLootMultiplier(tools, toolType) {
  const best = getBestTool(tools, toolType);
  if (!best) return 0;
  return TIER_LOOT_MULTIPLIER[best.tier] || 1.0;
}
