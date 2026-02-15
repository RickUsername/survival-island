// ============================================
// Crafting-System
// ============================================

import recipes from '../data/recipes';
import { hasTool, hasToolOfTier, createTool } from './ToolSystem';

// Tier-Reihenfolge für Vergleich
const TIER_ORDER = ['wood', 'stone', 'crystal'];

// Prüfen ob ein Rezept herstellbar ist
export function canCraft(recipe, inventory, tools, buildings) {
  // Neues Format: requiresToolType → prüfe ob Spieler diesen Tool-Typ hat
  if (recipe.requiresToolType) {
    if (recipe.requiresToolTier) {
      // Braucht mindestens eine bestimmte Stufe
      if (!hasToolOfTier(tools, recipe.requiresToolType, recipe.requiresToolTier)) {
        const tierNames = { wood: 'Holz', stone: 'Stein', crystal: 'Kristall' };
        const typeNames = { axe: 'Axt', fishing_rod: 'Angel', pickaxe: 'Spitzhacke' };
        return {
          possible: false,
          reason: `Benötigt: ${tierNames[recipe.requiresToolTier]}${typeNames[recipe.requiresToolType] || recipe.requiresToolType}`,
        };
      }
    } else {
      // Braucht irgendeinen Tool dieses Typs
      if (!hasTool(tools, recipe.requiresToolType)) {
        const typeNames = { axe: 'Axt', fishing_rod: 'Angel', pickaxe: 'Spitzhacke' };
        return {
          possible: false,
          reason: `Benötigt: ${typeNames[recipe.requiresToolType] || recipe.requiresToolType}`,
        };
      }
    }
  }

  // Unterstand-Level prüfen
  if (recipe.requiresShelter && buildings.shelterLevel < recipe.requiresShelter) {
    return { possible: false, reason: `Benötigt Unterstand Lv.${recipe.requiresShelter}` };
  }

  // Gebäude-Anforderung prüfen (z.B. Lagerfeuer zum Kochen)
  if (recipe.requiresBuilding === 'campfire' && !buildings.hasCampfire) {
    return { possible: false, reason: 'Benötigt Lagerfeuer' };
  }

  // Zutaten prüfen
  for (const ingredient of recipe.ingredients) {
    const owned = inventory[ingredient.itemId]?.amount || 0;
    if (owned < ingredient.amount) {
      return {
        possible: false,
        reason: `Fehlt: ${ingredient.itemId} (${owned}/${ingredient.amount})`,
      };
    }
  }

  return { possible: true };
}

// Rezept herstellen
export function craft(recipe, gameState) {
  const check = canCraft(recipe, gameState.inventory, gameState.tools, gameState.buildings);
  if (!check.possible) return null;

  // Neuen State erstellen
  const newState = {
    ...gameState,
    inventory: { ...gameState.inventory },
    buildings: { ...gameState.buildings },
    tools: gameState.tools.map(t => ({ ...t })), // Deep copy der Tool-Objekte
  };

  // Zutaten abziehen
  for (const ingredient of recipe.ingredients) {
    const item = { ...newState.inventory[ingredient.itemId] };
    item.amount -= ingredient.amount;
    if (item.amount <= 0) {
      delete newState.inventory[ingredient.itemId];
    } else {
      newState.inventory[ingredient.itemId] = item;
    }
  }

  // Ergebnis anwenden
  switch (recipe.result.type) {
    case 'shelter':
      // Gebäude-Flags NICHT direkt setzen → Platzierungsmodus aktivieren
      newState._pendingPlacement = { type: 'shelter', level: recipe.result.level };
      break;

    case 'campfire':
      newState._pendingPlacement = { type: 'campfire' };
      break;

    case 'water_collector':
      newState._pendingPlacement = { type: 'water_collector' };
      break;

    case 'tool': {
      const newTool = createTool(recipe.result.itemId);
      if (newTool) {
        // Vorhandenes Werkzeug gleichen Typs und gleicher/niedrigerer Stufe ersetzen
        const existingIdx = newState.tools.findIndex(t =>
          t.toolType === newTool.toolType &&
          TIER_ORDER.indexOf(t.tier) <= TIER_ORDER.indexOf(newTool.tier)
        );

        if (existingIdx >= 0) {
          newState.tools[existingIdx] = newTool;
        } else {
          newState.tools.push(newTool);
        }
      }
      break;
    }

    case 'food': {
      const foodId = recipe.result.itemId;
      if (!newState.inventory[foodId]) {
        newState.inventory[foodId] = { amount: 0, collectedAt: Date.now() };
      }
      newState.inventory[foodId] = {
        ...newState.inventory[foodId],
        amount: newState.inventory[foodId].amount + 1,
      };
      break;
    }

    default:
      break;
  }

  return newState;
}

// Alle Rezepte mit Herstellbarkeits-Status holen
export function getRecipesWithStatus(gameState) {
  return recipes.map(recipe => ({
    ...recipe,
    craftable: canCraft(recipe, gameState.inventory, gameState.tools, gameState.buildings),
  }));
}

// Rezepte nach Kategorie filtern
export function getRecipesByCategory(category) {
  return recipes.filter(r => r.category === category);
}
