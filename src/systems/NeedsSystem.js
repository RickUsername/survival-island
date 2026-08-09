// ============================================
// Bedürfnis-System - Echtzeit Hunger/Durst/Stimmung
// ============================================

import {
  HUNGER_DRAIN_PER_SEC,
  THIRST_DRAIN_PER_SEC,
  MOOD_DRAIN_PER_SEC,
  SHELTER_MOOD_MODIFIERS,
  SHELTER_HUNGER_MODIFIERS,
  SHELTER_THIRST_MODIFIERS,
  WEATHER_TYPES,
  WET_WEATHER,
  MOOD_GAIN_PER_HOUR,
  RAW_FOOD_EFFICIENCY,
  COOKED_FOOD_EFFICIENCY,
  WATER_COLLECTOR_DURATION,
} from '../utils/constants';
import items from '../data/items';
import { getCozyFactor } from './InteriorSystem';

/**
 * Wie stark das Wetter an den drei Bedürfnissen zieht — abhängig davon,
 * was für ein Dach über dem Kopf ist.
 *
 * Nass und kalt: die Stimmung leidet stark, der Körper verbraucht mehr
 * Energie. Ein Steinhaus (Level 5) macht das Wetter praktisch bedeutungslos.
 * Hitze: der Durst schnellt hoch, Schatten hilft.
 */
export function getWeatherModifiers(weather, shelterLevel) {
  const lvl = Math.max(0, Math.min(5, shelterLevel || 0));
  const shelterMod = SHELTER_MOOD_MODIFIERS[lvl] || SHELTER_MOOD_MODIFIERS[0];

  const wet = WET_WEATHER.includes(weather);
  const snowy = weather === WEATHER_TYPES.SNOW;
  const hot = weather === WEATHER_TYPES.HEAT;
  const foggy = weather === WEATHER_TYPES.FOG;

  let mood = wet || snowy ? shelterMod.rain : shelterMod.sun;
  let hunger = 1;
  let thirst = 1;

  if (wet || snowy) {
    hunger = SHELTER_HUNGER_MODIFIERS[lvl];
    // Schnee ist noch zehrender als Regen
    if (snowy) {
      hunger = 1 + (hunger - 1) * 1.3;
      mood = 1 + (mood - 1) * 1.15;
    }
    // Gewitter drückt zusätzlich aufs Gemüt
    if (weather === WEATHER_TYPES.STORM) {
      mood = 1 + (mood - 1) * 1.25;
    }
  } else if (hot) {
    thirst = SHELTER_THIRST_MODIFIERS[lvl];
    mood = shelterMod.sun * 1.1;
  } else if (foggy) {
    // Nebel ist nur trüb, kein echter Malus
    mood = shelterMod.sun * 1.08;
  }

  return { mood, hunger, thirst };
}

// Prüfen ob der Regenfänger-Tank noch aktiv ist
export function isWaterCollectorActive(buildings) {
  if (!buildings.hasWaterCollector) return false;
  if (!buildings.waterCollectorFilledAt) return false;
  const elapsed = Date.now() - buildings.waterCollectorFilledAt;
  return elapsed < WATER_COLLECTOR_DURATION;
}

// Regenfänger-Tank aktualisieren (bei Niederschlag füllen)
// Gibt updated buildings zurück
export function updateWaterCollector(buildings, weather) {
  if (!buildings.hasWaterCollector) return buildings;

  // Bei Regen, Gewitter oder Schnee: Tank füllen
  if (WET_WEATHER.includes(weather) || weather === WEATHER_TYPES.SNOW) {
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

  const mod = getWeatherModifiers(weather, shelterLevel);
  // Eine eingerichtete Hütte hebt die Laune — bis zu 28 % langsamerer Verlust
  const cozy = getCozyFactor(gameState);

  // Bedürfnisse reduzieren — Wetter und Unterstand wirken auf alle drei
  needs.hunger = Math.max(0, needs.hunger - HUNGER_DRAIN_PER_SEC * mod.hunger * deltaSeconds);

  // Regenfänger: Tank aktiv → kein Durst-Verlust + leichter Anstieg (+5%/Stunde)
  if (isWaterCollectorActive(gameState.buildings)) {
    needs.thirst = Math.min(100, needs.thirst + (5 / 3600) * deltaSeconds);
  } else {
    needs.thirst = Math.max(0, needs.thirst - THIRST_DRAIN_PER_SEC * mod.thirst * deltaSeconds);
  }

  // Während aktivem Hobby: Stimmung sinkt nicht (Belohnung kommt am Ende)
  if (!gameState.hobby) {
    needs.mood = Math.max(0, needs.mood - MOOD_DRAIN_PER_SEC * mod.mood * cozy * deltaSeconds);
  }

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
