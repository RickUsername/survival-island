// ============================================
// Speicher-System - LocalStorage Persistenz
// ============================================

import { STORAGE_KEY } from '../utils/constants';
import { migrateTools } from './ToolSystem';
import { syncUp, fullSync } from './CloudSaveService';

// Hilfsfunktion: User-spezifischer localStorage-Key
function getStorageKey(userId) {
  return userId ? `${STORAGE_KEY}-${userId}` : STORAGE_KEY;
}

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

// Prüfen ob localStorage verfügbar ist (iOS Private Mode, Quota etc.)
function isLocalStorageAvailable() {
  try {
    const testKey = '__ls_test__';
    localStorage.setItem(testKey, '1');
    const val = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    return val === '1';
  } catch {
    return false;
  }
}

// Spielstand speichern (userId optional für User-spezifischen Key)
export function saveGame(gameState, userId) {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage nicht verfügbar (iOS Private Mode?)');
    return false;
  }

  try {
    const serialized = JSON.stringify(gameState);
    localStorage.setItem(getStorageKey(userId), serialized);
    // Verify: Sicherstellen dass es wirklich geschrieben wurde
    const verify = localStorage.getItem(getStorageKey(userId));
    if (!verify) {
      console.warn('localStorage.setItem hat still fehlgeschlagen');
      return false;
    }
    return true;
  } catch (e) {
    console.error('Fehler beim Speichern:', e);
    return false;
  }
}

// Spielstand laden (userId optional für User-spezifischen Key)
export function loadGame(userId) {
  try {
    const serialized = localStorage.getItem(getStorageKey(userId));
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

    // Migration: Besuchs-Ei-Tracker ergänzen
    if (!gameState.eggReceivedFrom) {
      gameState.eggReceivedFrom = [];
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

    // Migration: Katzen-Felder ergänzen (Zuneigung, Verhalten)
    if (gameState.animals && gameState.animals.length > 0) {
      gameState.animals = gameState.animals.map(a => {
        if (a.type === 'cat') {
          return {
            ...a,
            affection: a.affection ?? 100,
            lastPettedAt: a.lastPettedAt ?? null,
            catState: a.catState ?? 'idle',
            catStateTimer: a.catStateTimer ?? 5000,
          };
        }
        return a;
      });
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

// Spielstand löschen (bei Tod) — userId optional für User-spezifischen Key
export function resetGame(userId) {
  const oldState = loadGame(userId);

  // Tagebuch beibehalten
  const diaryData = oldState?.diary || { topics: [], activeTopicId: null };

  // Errungenschaften beibehalten
  const achievementsData = oldState?.achievements || { unlockedIds: [], lastUnlocked: null, lastUnlockedAt: null };

  // Besuchs-Ei-Tracker beibehalten (überlebt den Tod)
  const eggReceivedFrom = oldState?.eggReceivedFrom || [];

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
  newState.eggReceivedFrom = eggReceivedFrom;

  saveGame(newState, userId);
  return newState;
}


// ============================================
// Cloud-Save Wrapper-Funktionen
// localStorage bleibt primär, Cloud synchronisiert im Hintergrund
// ============================================

// Cloud-erweitertes Speichern: localStorage + Cloud-Upload
export async function saveGameWithCloud(gameState, userId) {
  // Lokal speichern (kann fehlschlagen auf iOS)
  const localSuccess = saveGame(gameState, userId);

  // Cloud-Sync: Immer versuchen wenn eingeloggt
  // Besonders wichtig wenn localStorage nicht funktioniert!
  if (userId) {
    await syncUp(userId, gameState).catch(() => {});
  }

  return localSuccess;
}

// Cloud-erweitertes Laden: localStorage laden, dann mit Cloud abgleichen
export async function loadGameWithCloud(userId) {
  // Immer zuerst lokal laden (user-spezifischer Key)
  const localState = loadGame(userId);

  if (!userId) {
    return localState; // Nicht eingeloggt → nur localStorage
  }

  // Mit Cloud synchronisieren
  const { synced, state: resolvedState, direction } = await fullSync(userId, localState);

  if (synced && direction === 'down' && resolvedState) {
    // Cloud hatte neuere Daten → lokal speichern und mit Migrationen laden
    saveGame(resolvedState, userId);
    const migrated = loadGame(userId);
    // Falls localStorage nicht funktioniert (iOS), Migrationen direkt anwenden
    if (!migrated && resolvedState) {
      return applyMigrations(resolvedState);
    }
    return migrated || resolvedState;
  }

  // Wenn lokal nichts vorhanden → nochmal Cloud direkt versuchen
  if (!localState && synced && resolvedState) {
    return applyMigrations(resolvedState);
  }

  return localState;
}

// Migrationen direkt auf einen State anwenden (ohne localStorage-Roundtrip)
function applyMigrations(gameState) {
  if (!gameState) return null;
  const gs = { ...gameState };

  // Urlaubsjahr prüfen
  const currentYear = new Date().getFullYear();
  if (gs.vacation && gs.vacation.currentYear !== currentYear) {
    gs.vacation.usedHoursThisYear = 0;
    gs.vacation.currentYear = currentYear;
  }

  // Alle Migrations-Felder ergänzen
  if (gs.buildings && gs.buildings.waterCollectorFilledAt === undefined) {
    gs.buildings.waterCollectorFilledAt = null;
  }
  if (gs.tools && gs.tools.length > 0 && typeof gs.tools[0] === 'string') {
    gs.tools = migrateTools(gs.tools);
  }
  if (!gs.placedBuildings) gs.placedBuildings = [];
  if (!gs.animals) gs.animals = [];
  if (!gs.biomeVisits) gs.biomeVisits = {};
  if (gs.treeStage === undefined) gs.treeStage = null;
  if (gs.lastFruitDrop === undefined) gs.lastFruitDrop = null;
  if (!gs.droppedSeeds) gs.droppedSeeds = [];
  if (gs.lastSeedDrop === undefined) gs.lastSeedDrop = null;
  if (!gs.plantedTrees) gs.plantedTrees = [];
  if (!gs.weeds) gs.weeds = [];
  if (gs.lastWeedSpawn === undefined) gs.lastWeedSpawn = null;
  if (!gs.diary) gs.diary = { topics: [], activeTopicId: null };
  if (!gs.achievements) gs.achievements = { unlockedIds: [], lastUnlocked: null, lastUnlockedAt: null };
  if (!gs.eggReceivedFrom) gs.eggReceivedFrom = [];
  if (!gs.stats) gs.stats = { daysAlive: 0, startedAt: Date.now(), totalGatheringTrips: 0, totalItemsCollected: 0, hasMainTreeFelled: false, hasCookedMeal: false };
  if (gs.stats.hasMainTreeFelled === undefined) gs.stats.hasMainTreeFelled = false;
  if (gs.stats.hasCookedMeal === undefined) gs.stats.hasCookedMeal = false;
  if (!gs.vacation) gs.vacation = { isActive: false, activatedAt: null, usedHoursThisYear: 0, currentYear: new Date().getFullYear() };

  // Tier-Migrationen
  if (gs.animals && gs.animals.length > 0) {
    gs.animals = gs.animals.map(a => {
      let animal = a;
      if (animal.hunger === undefined) animal = { ...animal, hunger: 100 };
      if (animal.type === 'cat') {
        animal = {
          ...animal,
          affection: animal.affection ?? 100,
          lastPettedAt: animal.lastPettedAt ?? null,
          catState: animal.catState ?? 'idle',
          catStateTimer: animal.catStateTimer ?? 5000,
        };
      }
      return animal;
    });
  }

  // Gebäude-Migration
  if (gs.buildings) {
    const hasPlaced = (type) => gs.placedBuildings.some(b => b.type === type);
    if (gs.buildings.shelterLevel > 0 && !hasPlaced('shelter')) {
      gs.placedBuildings.push({ type: 'shelter', col: 9, row: 5, level: gs.buildings.shelterLevel });
    }
    for (const b of gs.placedBuildings) {
      if (b.type === 'shelter' && !b.level) b.level = gs.buildings.shelterLevel || 1;
    }
    if (gs.buildings.hasCampfire && !hasPlaced('campfire')) {
      gs.placedBuildings.push({ type: 'campfire', col: 11, row: 7 });
    }
    if (gs.buildings.hasWaterCollector && !hasPlaced('water_collector')) {
      gs.placedBuildings.push({ type: 'water_collector', col: 7, row: 6 });
    }
  }

  return gs;
}

// Cloud-erweiterter Reset: lokal zurücksetzen + Cloud aktualisieren
export async function resetGameWithCloud(userId) {
  const newState = resetGame(userId); // user-spezifischer Key

  if (userId) {
    await syncUp(userId, newState).catch(() => {});
  }

  return newState;
}
