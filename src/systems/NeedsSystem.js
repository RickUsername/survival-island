// ============================================
// Bedürfnis-System - Echtzeit Hunger/Durst/Stimmung
// ============================================

import {
  HUNGER_DRAIN_PER_SEC,
  THIRST_DRAIN_PER_SEC,
  MOOD_DRAIN_PER_SEC,
  SHELTER_MOOD_MODIFIERS,
  WEATHER_TYPES,
  MOOD_GAIN_PER_HOUR,
  RAW_FOOD_EFFICIENCY,
  COOKED_FOOD_EFFICIENCY,
  WATER_COLLECTOR_DURATION,
} from '../utils/constants';
import items from '../data/items';

// Prüfen ob der Regenfänger-Tank noch aktiv ist
export function isWaterCollectorActive(buildings) {
  if (!buildings.hasWaterCollector) return false;
  if (!buildings.waterCollectorFilledAt) return false;
  const elapsed = Date.now() - buildings.waterCollectorFilledAt;
  return elapsed < WATER_COLLECTOR_DURATION;
}

// Regenfänger-Tank aktualisieren (bei Regen füllen)
// Gibt updated buildings zurück
export function updateWaterCollector(buildings, weather) {
  if (!buildings.hasWaterCollector) return buildings;

  // Bei Regen: Tank füllen (Zeitstempel auf jetzt setzen)
  if (weather === WEATHER_TYPES.RAINY) {
    return {
      ...buildings,
      waterCollectorFilledAt: Date.now(),
    };
  }

  return buildings;
}

// Bedürfnisse aktualisieren (wird jeden Frame aufgerufen)
export function updateNeeds(gameState, deltaSeconds) {
  // Im Urlaub keine Veränderung
  if (gameState.vacation.isActive) return gameState.needs;

  const needs = { ...gameState.needs };
  const shelterLevel = gameState.buildings.shelterLevel;
  const weather = gameState.weather;

  // Stimmungs-Modifikator berechnen
  const shelterMod = SHELTER_MOOD_MODIFIERS[shelterLevel] || SHELTER_MOOD_MODIFIERS[0];
  const moodModifier = weather === WEATHER_TYPES.RAINY ? shelterMod.rain : shelterMod.sun;

  // Bedürfnisse reduzieren
  needs.hunger = Math.max(0, needs.hunger - HUNGER_DRAIN_PER_SEC * deltaSeconds);

  // Regenfänger: Tank aktiv → kein Durst-Verlust + leichter Anstieg (+5%/Stunde)
  if (isWaterCollectorActive(gameState.buildings)) {
    needs.thirst = Math.min(100, needs.thirst + (5 / 3600) * deltaSeconds);
  } else {
    needs.thirst = Math.max(0, needs.thirst - THIRST_DRAIN_PER_SEC * deltaSeconds);
  }

  needs.mood = Math.max(0, needs.mood - MOOD_DRAIN_PER_SEC * moodModifier * deltaSeconds);

  return needs;
}

// Offline-Zeit nachberechnen (beim Laden des Spielstands)
export function calculateOfflineNeeds(gameState) {
  const now = Date.now();
  const elapsed = (now - gameState.lastUpdate) / 1000; // in Sekunden

  if (elapsed <= 0) return gameState.needs;

  return updateNeeds(gameState, elapsed);
}

// Prüfen ob eine Bedürfnis-Anzeige kritisch ist (<10%)
export function isNeedCritical(value) {
  return value < 10;
}

// Bedürfnis-Wert formatieren
export function formatNeedValue(value) {
  if (value < 10) {
    return value.toFixed(1);
  }
  return Math.floor(value).toString();
}

// Prüfen ob die Figur stirbt (ein Bedürfnis = 0)
export function checkDeath(needs) {
  return needs.hunger <= 0 || needs.thirst <= 0 || needs.mood <= 0;
}

// Nahrung konsumieren
export function consumeFood(gameState, itemId) {
  const itemDef = items[itemId];
  if (!itemDef || itemDef.category !== 'food') return null;

  const inv = gameState.inventory[itemId];
  if (!inv || inv.amount <= 0) return null;

  // Effizienz berechnen
  const efficiency = itemDef.isRaw ? RAW_FOOD_EFFICIENCY : COOKED_FOOD_EFFICIENCY;

  const result = {
    hungerGain: (itemDef.hungerValue || 0) * efficiency,
    thirstGain: (itemDef.thirstValue || 0) * efficiency,
  };

  return result;
}

// Wasser trinken
export function consumeWater(gameState, itemId) {
  const itemDef = items[itemId];
  if (!itemDef || !itemDef.thirstValue) return null;

  const inv = gameState.inventory[itemId];
  if (!inv || inv.amount <= 0) return null;

  return {
    thirstGain: itemDef.thirstValue,
    hungerGain: itemDef.hungerValue || 0,
  };
}

// Stimmung durch Sammeln erhöhen
export function calculateMoodFromGathering(durationMs) {
  const hours = durationMs / (60 * 60 * 1000);
  return hours * MOOD_GAIN_PER_HOUR;
}
