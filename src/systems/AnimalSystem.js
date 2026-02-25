// ============================================
// Tier-System - Spawning, Bewegung & Hunger
// ============================================

import homeMap from '../data/homeMap';
import { TILE_SIZE, MAP_COLS, MAP_ROWS, TILE_TYPES } from '../utils/constants';

// Tier-Definitionen
export const ANIMAL_TYPES = {
  heron:  { id: 'heron',  name: 'Reiher', biome: 'south', color: '#B0C4DE', size: 28 },
  goat:   { id: 'goat',   name: 'Ziege',  biome: 'east',  color: '#C4A882', size: 26 },
  deer:   { id: 'deer',   name: 'Reh',    biome: 'north', color: '#A0522D', size: 28 },
  rabbit: { id: 'rabbit', name: 'Hase',   biome: 'west',  color: '#D2B48C', size: 18 },
  cat:    { id: 'cat',    name: 'Katze',  biome: null,    color: '#F5A623', size: 20 },
};

// Hunger-Konfiguration
export const ANIMAL_HUNGER_MAX = 100;
// 1 Obst pro 2 Tage = 100 Hunger pro 48h = ~0.00058 pro Sekunde
const ANIMAL_HUNGER_DRAIN_PER_SEC = 100 / (48 * 60 * 60);

// Baum-Obst-Abwurf Konfiguration
const FRUIT_DROP_INTERVAL = 3 * 24 * 60 * 60 * 1000; // alle 3 echte Tage (ms)

// Baum-Samen-Abwurf Konfiguration
export const SEED_DROP_INTERVAL = 28 * 24 * 60 * 60 * 1000; // alle 28 echte Tage (ms)
const SEED_MIN_STAGE = 7; // Ab Stufe 7 wirft der Baum Samen

// Biom → Tier-Zuordnung
const BIOME_ANIMAL = {
  south: 'heron',
  east:  'goat',
  north: 'deer',
  west:  'rabbit',
};

// Minimale Trip-Dauer für Spawn-Chance (1 Stunde in ms)
const MIN_TRIP_DURATION = 60 * 60 * 1000;

// Spawn-Wahrscheinlichkeit pro qualifiziertem Trip
const SPAWN_CHANCE = 0.05; // 5%

// Bewegungs-Konfiguration
const MOVE_SPEED = 0.3;           // Pixel pro Frame
const IDLE_MIN = 3000;            // Min. Stehzeit (ms)
const IDLE_MAX = 12000;           // Max. Stehzeit (ms)
const WALK_MIN = 2000;            // Min. Laufzeit (ms)
const WALK_MAX = 6000;            // Max. Laufzeit (ms)

// Freie Gras-Tiles auf der Karte finden (für Spawn-Positionen)
function getGrassTiles() {
  const tiles = [];
  for (let row = 1; row < MAP_ROWS - 1; row++) {
    for (let col = 1; col < MAP_COLS - 1; col++) {
      if (homeMap[row][col] === TILE_TYPES.GRASS) {
        tiles.push({ col, row });
      }
    }
  }
  return tiles;
}

// Zufällige Gras-Position für Tier-Spawn
export function getRandomGrassPosition() {
  const tiles = getGrassTiles();
  if (tiles.length === 0) return { x: 5 * TILE_SIZE + 32, y: 5 * TILE_SIZE + 32 };

  const tile = tiles[Math.floor(Math.random() * tiles.length)];
  return {
    x: tile.col * TILE_SIZE + TILE_SIZE / 2,
    y: tile.row * TILE_SIZE + TILE_SIZE / 2,
  };
}

// Prüfen ob Tier-Spawn nach einer Sammelreise stattfindet
// Gibt ein neues Tier-Objekt zurück oder null
export function checkAnimalSpawn(tripDuration, tripBiome, biomeVisits, existingAnimals) {
  // Trip muss mindestens 1 Stunde gedauert haben (aktive Zeit, Pausen nicht mitgezählt)
  if (tripDuration < MIN_TRIP_DURATION) return null;

  // Würfeln: 5% Chance
  if (Math.random() > SPAWN_CHANCE) return null;

  // Tier-Typ bestimmen: gewichtet nach Biom-Besuchen
  const animalType = selectAnimalType(biomeVisits);
  if (!animalType) return null;

  // Kein Maximum – beliebig viele Tiere erlaubt

  // Tier erstellen
  const pos = getRandomGrassPosition();
  return createAnimal(animalType, pos.x, pos.y);
}

// Tier-Typ gewichtet nach Biom-Besuchen auswählen
function selectAnimalType(biomeVisits) {
  const visits = biomeVisits || {};
  const totalVisits = Object.values(visits).reduce((sum, v) => sum + v, 0);

  if (totalVisits === 0) {
    // Keine Besuche → zufällig
    const types = Object.keys(BIOME_ANIMAL);
    const biome = types[Math.floor(Math.random() * types.length)];
    return BIOME_ANIMAL[biome];
  }

  // Gewichtete Auswahl
  const roll = Math.random() * totalVisits;
  let cumulative = 0;
  for (const [biome, count] of Object.entries(visits)) {
    cumulative += count;
    if (roll < cumulative) {
      return BIOME_ANIMAL[biome] || null;
    }
  }

  // Fallback
  return BIOME_ANIMAL[Object.keys(visits)[0]];
}

// Neues Tier-Objekt erstellen
export function createAnimal(typeId, x, y) {
  return {
    id: `${typeId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: typeId,
    x,
    y,
    // Bewegungs-State
    state: 'idle',          // 'idle' | 'walking'
    stateTimer: randomBetween(IDLE_MIN, IDLE_MAX),
    dirX: 0,
    dirY: 0,
    // Hunger (0-100, 0 = verhungert)
    hunger: ANIMAL_HUNGER_MAX,
    // Zeitstempel
    spawnedAt: Date.now(),
  };
}

// Tier-Bewegung updaten (wird pro Frame aufgerufen)
// Katzen werden übersprungen — sie nutzen CatSystem.updateCatBehavior()
export function updateAnimals(animals, deltaMs) {
  if (!animals || animals.length === 0) return animals;

  return animals.map(animal => {
    if (animal.type === 'cat') return animal; // Katzen haben eigene State-Machine
    const a = { ...animal };
    a.stateTimer -= deltaMs;

    if (a.stateTimer <= 0) {
      // Zustandswechsel
      if (a.state === 'idle') {
        // Anfangen zu laufen
        a.state = 'walking';
        a.stateTimer = randomBetween(WALK_MIN, WALK_MAX);
        // Zufällige Richtung
        const angle = Math.random() * Math.PI * 2;
        a.dirX = Math.cos(angle);
        a.dirY = Math.sin(angle);
      } else {
        // Stehenbleiben
        a.state = 'idle';
        a.stateTimer = randomBetween(IDLE_MIN, IDLE_MAX);
        a.dirX = 0;
        a.dirY = 0;
      }
    }

    // Bewegen wenn walking
    if (a.state === 'walking') {
      const speed = MOVE_SPEED * (deltaMs / 16); // Normalisiert auf ~60fps
      let newX = a.x + a.dirX * speed;
      let newY = a.y + a.dirY * speed;

      // Tile-Check: Nur auf Gras laufen
      const col = Math.floor(newX / TILE_SIZE);
      const row = Math.floor(newY / TILE_SIZE);

      if (col >= 1 && col < MAP_COLS - 1 && row >= 1 && row < MAP_ROWS - 1) {
        const tileType = homeMap[row]?.[col];
        if (tileType === TILE_TYPES.GRASS) {
          a.x = newX;
          a.y = newY;
        } else {
          // Richtung umkehren bei Hindernis
          a.dirX = -a.dirX;
          a.dirY = -a.dirY;
          // Leichte Drehung dazu
          const angle = Math.random() * 0.5 - 0.25;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const dx = a.dirX;
          const dy = a.dirY;
          a.dirX = dx * cos - dy * sin;
          a.dirY = dx * sin + dy * cos;
        }
      } else {
        // Am Kartenrand umdrehen
        a.dirX = -a.dirX;
        a.dirY = -a.dirY;
      }
    }

    return a;
  });
}

// Tier füttern (fruitValue: 1.0 für Obst, 0.5 für Beeren)
export function feedAnimal(animal, fruitValue) {
  // 1 Obst (fruitValue=1) = 100 Hunger (vollen Tagesbedarf)
  const hungerRestore = fruitValue * ANIMAL_HUNGER_MAX;
  return {
    ...animal,
    hunger: Math.min(ANIMAL_HUNGER_MAX, (animal.hunger || 0) + hungerRestore),
  };
}

// Hunger aller Tiere aktualisieren (pro Game-Loop-Tick)
// Gibt { updatedAnimals, diedAnimals } zurück
export function updateAnimalHunger(animals, deltaSec) {
  if (!animals || animals.length === 0) return { updatedAnimals: animals, diedAnimals: [] };

  const updatedAnimals = [];
  const diedAnimals = [];

  for (const animal of animals) {
    // Katzen nutzen Zuneigung statt Hunger (CatSystem)
    if (animal.type === 'cat') {
      updatedAnimals.push(animal);
      continue;
    }

    const hunger = (animal.hunger ?? ANIMAL_HUNGER_MAX) - ANIMAL_HUNGER_DRAIN_PER_SEC * deltaSec;

    if (hunger <= 0) {
      // Tier ist verhungert
      diedAnimals.push(animal);
    } else {
      updatedAnimals.push({ ...animal, hunger });
    }
  }

  return { updatedAnimals, diedAnimals };
}

// Berechnen wie viel Obst der Baum pro Abwurf liefert (stufen-abhängig)
// Stufe 3 → 2, Stufe 4 → 3, ..., Stufe 10 → 9
export function calculateTreeFruitAmount(treeStage) {
  if (!treeStage || treeStage < 3) return 0;
  return treeStage - 1;
}

// Prüfen ob Obstabwurf fällig ist (alle 3 echte Tage)
// Gibt Anzahl abgeworfener Obst zurück (0 wenn nicht fällig)
export function checkTreeFruitDrop(lastFruitDrop, treeStage) {
  if (!treeStage || treeStage < 3) return 0;

  const now = Date.now();
  const last = lastFruitDrop || 0;

  if (now - last >= FRUIT_DROP_INTERVAL) {
    return calculateTreeFruitAmount(treeStage);
  }
  return 0;
}

// Prüfen ob der Baum einen Samen abwerfen soll (alle 28 Tage, ab Stufe 7)
// Gibt { x, y } Position zurück oder null
export function checkTreeSeedDrop(lastSeedDrop, treeStage, treeCol, treeRow, existingSeeds) {
  if (!treeStage || treeStage < SEED_MIN_STAGE) return null;

  const now = Date.now();
  const last = lastSeedDrop || 0;

  if (now - last < SEED_DROP_INTERVAL) return null;

  // Freie Grasposition in der Nähe des Baums finden (Radius 2 Tiles)
  const candidates = [];
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = treeRow + dr;
      const c = treeCol + dc;
      if (r >= 1 && r < MAP_ROWS - 1 && c >= 1 && c < MAP_COLS - 1) {
        if (homeMap[r]?.[c] === TILE_TYPES.GRASS) {
          // Kein Samen dort bereits
          const hasSeed = (existingSeeds || []).some(s => s.col === c && s.row === r);
          if (!hasSeed) {
            candidates.push({ col: c, row: r });
          }
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    id: `seed_${Date.now()}`,
    col: picked.col,
    row: picked.row,
    droppedAt: now,
  };
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
