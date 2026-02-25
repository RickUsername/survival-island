// ============================================
// Katzen-System - Ei-Schlüpf, Zuneigung, Verhalten
// ============================================

import homeMap from '../data/homeMap';
import { TILE_SIZE, MAP_COLS, MAP_ROWS, TILE_TYPES } from '../utils/constants';

// --- Konstanten ---
export const EGG_HATCH_TIME = 2 * 24 * 60 * 60 * 1000;   // 2 Echtzeit-Tage (ms)
export const CAT_ADULT_AGE = 365;                           // Tage bis erwachsen
export const CAT_AFFECTION_MAX = 100;
export const CAT_AFFECTION_DRAIN_PER_DAY = 15;
export const CAT_AFFECTION_DRAIN_PER_SEC = 15 / (24 * 60 * 60); // ~0.000174/sec
export const CAT_PET_COOLDOWN = 5 * 60 * 1000;             // 5 Minuten (ms)
export const CAT_PET_AFFECTION_GAIN = 10;

// Füttern → Zuneigungsgewinn pro Item
export const CAT_FEED_AFFECTION = {
  fruit: 15,
  berry: 10,
  hay: 5,
  fish: 20,
  cooked_fish: 25,
};

// --- Katzen-Verhaltenszustände ---
const CAT_MOVE_CONFIG = {
  sleeping:  { speed: 0,    minDuration: 8000,  maxDuration: 20000 },
  idle:      { speed: 0,    minDuration: 3000,  maxDuration: 8000  },
  slow_walk: { speed: 0.15, minDuration: 3000,  maxDuration: 8000  },
  fast_walk: { speed: 0.5,  minDuration: 1000,  maxDuration: 3000  },
};

// Gewichtete Übergänge: Zustand → { nächsterZustand: Wahrscheinlichkeit }
const CAT_STATE_TRANSITIONS = {
  sleeping:  { idle: 0.7, slow_walk: 0.3 },
  idle:      { sleeping: 0.2, slow_walk: 0.5, fast_walk: 0.3 },
  slow_walk: { idle: 0.4, sleeping: 0.1, fast_walk: 0.2, slow_walk: 0.3 },
  fast_walk: { idle: 0.4, slow_walk: 0.5, sleeping: 0.1 },
};

// --- Katze erstellen ---
export function createCat(x, y) {
  return {
    id: `cat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: 'cat',
    x,
    y,
    // Standard-Tier-Felder (für Kompatibilität)
    state: 'idle',
    stateTimer: randomBetween(3000, 8000),
    dirX: 0,
    dirY: 0,
    hunger: 100, // Wird nie verbraucht, bleibt immer 100
    spawnedAt: Date.now(),
    // Katzen-spezifische Felder
    catState: 'sleeping',
    catStateTimer: randomBetween(8000, 20000),
    affection: CAT_AFFECTION_MAX,
    lastPettedAt: null,
  };
}

// --- Katzen-Stadium ---
export function getCatAgeDays(spawnedAt) {
  return (Date.now() - (spawnedAt || Date.now())) / (24 * 60 * 60 * 1000);
}

export function getCatStage(spawnedAt) {
  return getCatAgeDays(spawnedAt) >= CAT_ADULT_AGE ? 'adult' : 'kitten';
}

// --- Verhalten (State-Machine) ---
export function updateCatBehavior(cat, deltaMs) {
  if (cat.type !== 'cat') return cat;

  const c = { ...cat };
  c.catStateTimer = (c.catStateTimer || 0) - deltaMs;

  // Zustandswechsel wenn Timer abgelaufen
  if (c.catStateTimer <= 0) {
    const transitions = CAT_STATE_TRANSITIONS[c.catState || 'idle'];
    if (transitions) {
      c.catState = pickWeightedState(transitions);
    } else {
      c.catState = 'idle';
    }

    const config = CAT_MOVE_CONFIG[c.catState];
    c.catStateTimer = randomBetween(config.minDuration, config.maxDuration);

    // Neue Richtung bei Bewegungszuständen
    if (c.catState === 'slow_walk' || c.catState === 'fast_walk') {
      const angle = Math.random() * Math.PI * 2;
      c.dirX = Math.cos(angle);
      c.dirY = Math.sin(angle);
    } else {
      c.dirX = 0;
      c.dirY = 0;
    }

    // Sync für Kompatibilität
    c.state = c.catState === 'slow_walk' || c.catState === 'fast_walk' ? 'walking' : 'idle';
    c.stateTimer = c.catStateTimer;
  }

  // Bewegung anwenden
  const config = CAT_MOVE_CONFIG[c.catState || 'idle'];
  if (config && config.speed > 0) {
    const speed = config.speed * (deltaMs / 16); // Normalisiert auf ~60fps
    let newX = c.x + c.dirX * speed;
    let newY = c.y + c.dirY * speed;

    const col = Math.floor(newX / TILE_SIZE);
    const row = Math.floor(newY / TILE_SIZE);

    if (col >= 1 && col < MAP_COLS - 1 && row >= 1 && row < MAP_ROWS - 1) {
      const tileType = homeMap[row]?.[col];
      if (tileType === TILE_TYPES.GRASS) {
        c.x = newX;
        c.y = newY;
      } else {
        // Umkehren bei Hindernis
        c.dirX = -c.dirX;
        c.dirY = -c.dirY;
        const angle = Math.random() * 0.5 - 0.25;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = c.dirX;
        const dy = c.dirY;
        c.dirX = dx * cos - dy * sin;
        c.dirY = dx * sin + dy * cos;
      }
    } else {
      c.dirX = -c.dirX;
      c.dirY = -c.dirY;
    }
  }

  return c;
}

// --- Zuneigung ---
export function updateCatAffection(cat, deltaSec) {
  if (cat.type !== 'cat') return cat;
  const newAffection = Math.max(0, (cat.affection ?? CAT_AFFECTION_MAX) - CAT_AFFECTION_DRAIN_PER_SEC * deltaSec);
  return { ...cat, affection: newAffection };
}

export function canPetCat(cat) {
  if (!cat.lastPettedAt) return true;
  return Date.now() - cat.lastPettedAt >= CAT_PET_COOLDOWN;
}

export function getPetCooldownRemaining(cat) {
  if (!cat.lastPettedAt) return 0;
  const remaining = CAT_PET_COOLDOWN - (Date.now() - cat.lastPettedAt);
  return Math.max(0, remaining);
}

export function petCat(cat) {
  if (!canPetCat(cat)) return cat;
  return {
    ...cat,
    affection: Math.min(CAT_AFFECTION_MAX, (cat.affection ?? 0) + CAT_PET_AFFECTION_GAIN),
    lastPettedAt: Date.now(),
  };
}

// --- Füttern (erhöht Zuneigung, nicht Hunger) ---
export function feedCat(cat, foodItemId) {
  const gain = CAT_FEED_AFFECTION[foodItemId];
  if (!gain) return cat;
  return {
    ...cat,
    affection: Math.min(CAT_AFFECTION_MAX, (cat.affection ?? 0) + gain),
  };
}

// --- Ei-Schlüpf-Check ---
// Prüft ob ein Ei im Inventar schlüpfen sollte
// Gibt { shouldHatch, eggAge } zurück
export function checkEggHatch(inventory) {
  if (!inventory?.mysterious_egg) return { shouldHatch: false };
  const egg = inventory.mysterious_egg;
  if (!egg.collectedAt || egg.amount <= 0) return { shouldHatch: false };

  const eggAge = Date.now() - egg.collectedAt;
  return {
    shouldHatch: eggAge >= EGG_HATCH_TIME,
    eggAge,
  };
}

// --- Hilfsfunktionen ---
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function pickWeightedState(transitions) {
  const entries = Object.entries(transitions);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;

  for (const [state, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return state;
  }

  return entries[0][0]; // Fallback
}
