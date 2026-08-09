// ============================================
// Wetter-System - Täglicher Wechsel um 18:00
// ============================================
// Das Wetter ist deterministisch aus dem Datum abgeleitet: derselbe Tag
// ergibt überall dasselbe Wetter, ohne dass etwas gespeichert werden muss.
// Seit dem Ausbau hängt es zusätzlich an der Jahreszeit — Hitzewellen gibt
// es nur im Sommer, Schnee nur im Winter.

import { WEATHER_TYPES, WET_WEATHER } from '../utils/constants';

// Nächsten 18:00-Zeitpunkt berechnen
export function getNext1800() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(18, 0, 0, 0);

  // Wenn 18:00 heute schon vorbei, dann morgen
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime();
}

// Deterministischer Hash aus einem Datum, mit Avalanche-Mixing.
// Ohne das Mixing erzeugt "2026-1-20" → "2026-1-21" nur +1 im Hash,
// was zu langen Regen-/Sonnensträhnen führt.
function dayHash(date, salt = 0) {
  const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${salt}`;
  let hash = 0;
  for (let i = 0; i < dayKey.length; i++) {
    hash = ((hash << 5) - hash) + dayKey.charCodeAt(i);
    hash |= 0;
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x45d9f3b);
  hash ^= hash >>> 16;
  return Math.abs(hash);
}

/** Jahreszeit-Faktor: 1 = Hochsommer, -1 = Hochwinter */
export function getSeason(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);
  return Math.cos(((dayOfYear - 172) / 365) * Math.PI * 2);
}

/** Name der Jahreszeit für die Anzeige */
export function getSeasonName(date = new Date()) {
  const m = date.getMonth();
  if (m <= 1 || m === 11) return 'Winter';
  if (m <= 4) return 'Frühling';
  if (m <= 7) return 'Sommer';
  return 'Herbst';
}

// Wetter basierend auf dem Datum bestimmen
export function getWeatherForDate(date = new Date()) {
  const roll = dayHash(date) % 100;
  const season = getSeason(date);

  // Im Winter fällt Niederschlag als Schnee
  const cold = season < -0.35;
  // Hitzewellen nur im Hochsommer
  const hot = season > 0.55;

  if (roll < 30) {
    // Niederschlag — ein Viertel davon als Gewitter (im Winter nicht)
    if (cold) return WEATHER_TYPES.SNOW;
    return (dayHash(date, 7) % 100) < 25 ? WEATHER_TYPES.STORM : WEATHER_TYPES.RAINY;
  }

  if (hot && roll < 45) {
    return WEATHER_TYPES.HEAT;
  }

  return WEATHER_TYPES.SUNNY;
}

/**
 * Nebelmorgen: unabhängig vom Tageswetter, gilt nur bis in den Vormittag.
 * Häufiger im Herbst, praktisch nie im Hochsommer.
 */
export function isFoggyMorning(date = new Date()) {
  const season = getSeason(date);
  const chance = 26 - season * 16; // Herbst/Winter ~40 %, Sommer ~10 %
  return (dayHash(date, 31) % 100) < chance;
}

// Aktuelles Wetter nach der 18:00-Regel bestimmen
// Wetterwechsel passiert um 18:00 - das Wetter gilt bis zum nächsten 18:00
export function getCurrentWeather() {
  const now = new Date();
  const hour = now.getHours();

  // Nach 18:00 gilt bereits das Wetter des Folgetages
  const keyDate = new Date(now);
  if (hour >= 18) {
    keyDate.setDate(keyDate.getDate() + 1);
  }

  const base = getWeatherForDate(keyDate);

  // Nebel überlagert einen sonst trockenen Morgen
  if (base === WEATHER_TYPES.SUNNY && hour < 10 && hour >= 4 && isFoggyMorning(now)) {
    return WEATHER_TYPES.FOG;
  }

  return base;
}

/** Regnet/schneit es gerade? (Regenfänger, nasser Boden) */
export function isWet(weather) {
  return WET_WEATHER.includes(weather);
}

// Wetter-Update prüfen
export function checkWeatherUpdate(gameState) {
  const now = Date.now();

  // Wenn Wetter per Cheat überschrieben wurde:
  // Override bleibt bis zum nächsten 18:00-Event aktiv
  if (gameState.weatherOverride) {
    const lastChange = gameState.lastWeatherChange || 0;
    const lastChangeDate = new Date(lastChange);
    const nowDate = new Date(now);

    let eventOccurred = false;
    if (lastChangeDate.toDateString() === nowDate.toDateString()) {
      if (lastChangeDate.getHours() < 18 && nowDate.getHours() >= 18) {
        eventOccurred = true;
      }
    } else {
      eventOccurred = true;
    }

    if (eventOccurred) {
      return {
        ...gameState,
        weather: getCurrentWeather(),
        weatherOverride: false,
        lastWeatherChange: now,
      };
    }

    return gameState;
  }

  const currentWeather = getCurrentWeather();

  if (currentWeather !== gameState.weather) {
    return {
      ...gameState,
      weather: currentWeather,
      lastWeatherChange: now,
    };
  }

  return gameState;
}
