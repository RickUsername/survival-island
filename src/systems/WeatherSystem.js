// ============================================
// Wetter-System - Täglicher Wechsel um 18:00
// ============================================

import { WEATHER_TYPES } from '../utils/constants';

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

// Wetter basierend auf aktuellem Datum bestimmen
// Deterministisch: gleicher Tag = gleiches Wetter
export function getWeatherForDate(date = new Date()) {
  // Einfacher Hash aus dem Datum
  const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dayKey.length; i++) {
    hash = ((hash << 5) - hash) + dayKey.charCodeAt(i);
    hash |= 0;
  }

  // Avalanche-Mixing: Kleine Änderungen im Input → große Änderungen im Output
  // Ohne dieses Mixing erzeugt z.B. "2026-1-20" → "2026-1-21" nur +1 im Hash,
  // was zu langen Regen-/Sonnensträhnen führt.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x45d9f3b);
  hash ^= hash >>> 16;

  // 30% Chance auf Regen (hält dann bis 18:00 nächsten Tag)
  return Math.abs(hash) % 100 < 30 ? WEATHER_TYPES.RAINY : WEATHER_TYPES.SUNNY;
}

// Aktuelles Wetter nach der 18:00-Regel bestimmen
// Wetterwechsel passiert um 18:00 - das Wetter gilt bis zum nächsten 18:00
export function getCurrentWeather() {
  const now = new Date();
  const hour = now.getHours();

  // Vor 18:00 → Wetter von gestern 18:00 (= heutiger Tag-Key)
  // Nach 18:00 → Wetter ab heute 18:00 (= morgen Tag-Key)
  if (hour >= 18) {
    // Wetter wechselt, benutze morgen als Key
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getWeatherForDate(tomorrow);
  }

  return getWeatherForDate(now);
}

// Wetter-Update prüfen
export function checkWeatherUpdate(gameState) {
  const now = Date.now();

  // Wenn Wetter per Cheat überschrieben wurde:
  // Override bleibt bis zum nächsten 18:00-Event aktiv
  if (gameState.weatherOverride) {
    // Prüfen ob seit dem letzten Wetterwechsel ein 18:00-Event stattgefunden hat
    const lastChange = gameState.lastWeatherChange || 0;
    const lastChangeDate = new Date(lastChange);
    const nowDate = new Date(now);

    // Hat um 18:00 ein Wetterwechsel-Event stattgefunden seit dem Override?
    let eventOccurred = false;

    // Gleicher Tag: Wenn Override vor 18:00 und jetzt nach 18:00
    if (lastChangeDate.toDateString() === nowDate.toDateString()) {
      if (lastChangeDate.getHours() < 18 && nowDate.getHours() >= 18) {
        eventOccurred = true;
      }
    } else {
      // Anderer Tag: definitiv mindestens ein 18:00-Event vergangen
      eventOccurred = true;
    }

    if (eventOccurred) {
      // Override aufheben, neues Wetter würfeln
      const currentWeather = getCurrentWeather();
      return {
        ...gameState,
        weather: currentWeather,
        weatherOverride: false,
        lastWeatherChange: now,
      };
    }

    // Noch kein 18:00-Event → Override bleibt
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
