// ============================================
// Speicher-System - LocalStorage Persistenz
// ============================================

import { STORAGE_KEY } from '../utils/constants';
import { migrateTools } from './ToolSystem';
import { syncUp, fullSync } from './CloudSaveService';

// Standard-Spielstand für neues Spiel
export function getDefaultGameState() {
  return {
    // Spieler-Position (Mitte der Map)
    player: {
      x: 10 * 64 + 32,
      y: 7 * 64 + 32,
    },

    // Bedürfnisse (0-100)
    needs: {
      hunger: 100,
      thirst: 100,
      mood: 100,
    },

    // Letzter Update-Zeitpunkt (für Offline-Berechnung)
    lastUpdate: Date.now(),

    // Inventar: { itemId: { amount, collectedAt? } }
    inventory: {},

    // Gebaute Strukturen
    buildings: {
      shelterLevel: 0,
      hasCampfire: false,
      hasWaterCollector: false,
      waterCollectorFilledAt: null, // Zeitstempel wann der Tank gefüllt wurde
    },

    // Werkzeuge im Besitz
    tools: [],

    // Wetter
    weather: 'sunny',
    lastWeatherChange: Date.now(),

    // Sammelreise
    gathering: null, // { biome, startTime, pausedAt, totalPausedMs, accumulated items }

    // Urlaub
    vacation: {
      isActive: false,
      activatedAt: null,
      usedHoursThisYear: 0,
      currentYear: new Date().getFullYear(),
    },

    // Karten-Zustand (platzierte Gebäude auf der Karte)
    placedBuildings: [],

    // Tiere auf der Heimat-Karte
    animals: [],

    // Biom-Besuche (für Tier-Spawn-Gewichtung)
    biomeVisits: {},

    // Wachsender Baum (null = automatisch nach Tagen berechnen, 1-10 = manuell gesetzt)
    treeStage: null,

    // Letzter Obstabwurf vom Baum
    lastFruitDrop: null,

    // Samen auf der Karte (noch nicht eingesammelt): [{ id, col, row, droppedAt }]
    droppedSeeds: [],
    // Letzter Samenabwurf
    lastSeedDrop: null,
    // Gepflanzte Bäume: [{ id, col, row, plantedAt }]
    plantedTrees: [],

    // Unkraut auf der Karte: [{ col, row, stage: 1-3, spawnedAt }]
    weeds: [],
    // Letzter Unkraut-Spawn
    lastWeedSpawn: null,

    // Tagebuch (Lernfach-Tracking) - überlebt den Tod
    diary: {
      topics: [],        // [{ id, name, totalTimeMs, createdAt }]
      activeTopicId: null,
    },

    // Statistiken
    stats: {
      daysAlive: 0,
      startedAt: Date.now(),
      totalGatheringTrips: 0,
      totalItemsCollected: 0,
      hasMainTreeFelled: false,
      hasCookedMeal: false,
    },

    // Errungenschaften - überleben den Tod
    achievements: {
      unlockedIds: [],
      lastUnlocked: null,
      lastUnlockedAt: null,
    },
  };
}

// Spielstand speichern
export function saveGame(gameState) {
  try {
    const serialized = JSON.stringify(gameState);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (e) {
    console.error('Fehler beim Speichern:', e);
    return false;
  }
}

// Spielstand laden
export function loadGame() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;

    const gameState = JSON.parse(serialized);

    // Urlaubsjahr prüfen und ggf. zurücksetzen
    const currentYear = new Date().getFullYear();
    if (gameState.vacation && gameState.vacation.currentYear !== currentYear) {
      gameState.vacation.usedHoursThisYear = 0;
      gameState.vacation.currentYear = currentYear;
    }

    // Migration: Neue Felder für alte Spielstände ergänzen
    if (gameState.buildings && gameState.buildings.waterCollectorFilledAt === undefined) {
      gameState.buildings.waterCollectorFilledAt = null;
    }

    // Migration: Altes Tools-Format (string[]) auf neues Format (Objekte mit Haltbarkeit)
    if (gameState.tools && gameState.tools.length > 0 && typeof gameState.tools[0] === 'string') {
      gameState.tools = migrateTools(gameState.tools);
    }

    // Migration: placedBuildings-Array ergänzen falls nicht vorhanden
    if (!gameState.placedBuildings) {
      gameState.placedBuildings = [];
    }

    // Migration: Tiere und Biom-Besuche ergänzen
    if (!gameState.animals) {
      gameState.animals = [];
    }
    if (!gameState.biomeVisits) {
      gameState.biomeVisits = {};
    }

    // Migration: treeStage ergänzen
    if (gameState.treeStage === undefined) {
      gameState.treeStage = null;
    }

    // Migration: lastFruitDrop ergänzen
    if (gameState.lastFruitDrop === undefined) {
      gameState.lastFruitDrop = null;
    }
    // Migration: Samen-System ergänzen
    if (!gameState.droppedSeeds) gameState.droppedSeeds = [];
    if (gameState.lastSeedDrop === undefined) gameState.lastSeedDrop = null;
    if (!gameState.plantedTrees) gameState.plantedTrees = [];

    // Migration: Unkraut-System ergänzen
    if (!gameState.weeds) gameState.weeds = [];
    if (gameState.lastWeedSpawn === undefined) gameState.lastWeedSpawn = null;

    // Migration: Tagebuch ergänzen
    if (!gameState.diary) {
      gameState.diary = { topics: [], activeTopicId: null };
    }

    // Migration: Errungenschaften ergänzen
    if (!gameState.achievements) {
      gameState.achievements = { unlockedIds: [], lastUnlocked: null, lastUnlockedAt: null };
    }

    // Migration: Neue Stats-Flags
    if (gameState.stats.hasMainTreeFelled === undefined) {
      gameState.stats.hasMainTreeFelled = false;
    }
    if (gameState.stats.hasCookedMeal === undefined) {
      gameState.stats.hasCookedMeal = false;
    }

    // Migration: Tier-Hunger ergänzen (alte Tiere ohne hunger-Feld)
    if (gameState.animals && gameState.animals.length > 0) {
      let hungerMigrated = false;
      gameState.animals = gameState.animals.map(a => {
        if (a.hunger === undefined) {
          hungerMigrated = true;
          return { ...a, hunger: 100 }; // Satt starten
        }
        return a;
      });
      // Wenn Migration stattfand: lastUpdate auf jetzt setzen,
      // damit Offline-Hunger-Berechnung nicht alten Zeitraum nachrechnet
      if (hungerMigrated) {
        gameState.lastUpdate = Date.now();
      }
    }

    // Migration: Bestehende Gebäude in placedBuildings übertragen
    if (gameState.buildings) {
      const hasPlaced = (type) => gameState.placedBuildings.some(b => b.type === type);

      if (gameState.buildings.shelterLevel > 0 && !hasPlaced('shelter')) {
        gameState.placedBuildings.push({ type: 'shelter', col: 9, row: 5, level: gameState.buildings.shelterLevel });
      }
      // Migration: Bestehende Shelter ohne level-Feld ergänzen
      for (const b of gameState.placedBuildings) {
        if (b.type === 'shelter' && !b.level) {
          b.level = gameState.buildings.shelterLevel || 1;
        }
      }
      if (gameState.buildings.hasCampfire && !hasPlaced('campfire')) {
        gameState.placedBuildings.push({ type: 'campfire', col: 11, row: 7 });
      }
      if (gameState.buildings.hasWaterCollector && !hasPlaced('water_collector')) {
        gameState.placedBuildings.push({ type: 'water_collector', col: 7, row: 6 });
      }
    }

    return gameState;
  } catch (e) {
    console.error('Fehler beim Laden:', e);
    return null;
  }
}

// Spielstand löschen (bei Tod)
export function resetGame() {
  const oldState = loadGame();

  // Tagebuch beibehalten
  const diaryData = oldState?.diary || { topics: [], activeTopicId: null };

  // Errungenschaften beibehalten
  const achievementsData = oldState?.achievements || { unlockedIds: [], lastUnlocked: null, lastUnlockedAt: null };

  const newState = getDefaultGameState();

  // Urlaubstage nach Tod komplett zurücksetzen (volle 30 Tage)
  newState.vacation = {
    isActive: false,
    activatedAt: null,
    usedHoursThisYear: 0,
    currentYear: new Date().getFullYear(),
  };
  newState.diary = {
    ...diaryData,
    activeTopicId: null,
  };
  newState.achievements = achievementsData;

  saveGame(newState);
  return newState;
}


// ============================================
// Cloud-Save Wrapper-Funktionen
// localStorage bleibt primär, Cloud synchronisiert im Hintergrund
// ============================================

// Cloud-erweitertes Speichern: localStorage + Cloud-Upload
export async function saveGameWithCloud(gameState, userId) {
  // Immer zuerst lokal speichern (bestehende Logik, schlägt nie fehl)
  saveGame(gameState);

  // Dann Cloud-Sync versuchen (fire-and-forget, Fehler sind still)
  if (userId) {
    await syncUp(userId, gameState).catch(() => {});
  }
}

// Cloud-erweitertes Laden: localStorage laden, dann mit Cloud abgleichen
export async function loadGameWithCloud(userId) {
  // Immer zuerst lokal laden (bestehende Logik)
  const localState = loadGame();

  if (!userId) {
    return localState; // Nicht eingeloggt → nur localStorage
  }

  // Mit Cloud synchronisieren
  const { synced, state: resolvedState, direction } = await fullSync(userId, localState);

  if (synced && direction === 'down' && resolvedState) {
    // Cloud hatte neuere Daten → lokal speichern und mit Migrationen laden
    saveGame(resolvedState);
    return loadGame(); // Lädt erneut mit allen Migrationen
  }

  return localState;
}

// Cloud-erweiterter Reset: lokal zurücksetzen + Cloud aktualisieren
export async function resetGameWithCloud(userId) {
  const newState = resetGame(); // bestehende Logik

  if (userId) {
    await syncUp(userId, newState).catch(() => {});
  }

  return newState;
}
