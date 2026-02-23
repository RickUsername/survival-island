// ============================================
// Haupt-Game-Loop Hook
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadGame, saveGame, getDefaultGameState, resetGame, saveGameWithCloud, loadGameWithCloud, resetGameWithCloud } from '../systems/SaveSystem';
import { syncDown } from '../systems/CloudSaveService';
import { useAuth } from '../contexts/AuthContext';
import { updateNeeds, calculateOfflineNeeds, checkDeath, updateWaterCollector } from '../systems/NeedsSystem';
import { checkWeatherUpdate, getCurrentWeather } from '../systems/WeatherSystem';
import { checkVacationExpiry } from '../systems/VacationSystem';
import { SAVE_INTERVAL, TILE_SIZE, COLLISION_TILES, MAP_COLS, MAP_ROWS, FOOD_SPOIL_TIME, TILE_TYPES, HUNGER_DRAIN_PER_SEC, THIRST_DRAIN_PER_SEC, MOOD_DRAIN_PER_SEC, SHELTER_MOOD_MODIFIERS, WEATHER_TYPES } from '../utils/constants';
import { updateAnimals, updateAnimalHunger, checkTreeFruitDrop, checkTreeSeedDrop, checkAnimalSpawn, getRandomGrassPosition } from '../systems/AnimalSystem';
import { checkEggHatch, createCat, updateCatBehavior, updateCatAffection } from '../systems/CatSystem';
import { finishGathering, getElapsedGatheringTime, isGatheringComplete } from '../systems/GatheringSystem';
import { drainToolDurability } from '../systems/ToolSystem';
import { isWaterCollectorActive } from '../systems/NeedsSystem';
import homeMap, { EXIT_ZONES, TREE_POSITION } from '../data/homeMap';
import items from '../data/items';

// --- Unkraut-Konstanten ---
const WEED_SPAWN_INTERVAL = 8 * 60 * 60 * 1000; // Alle 8 Stunden
const WEED_SPAWN_COUNT = 2; // 2 neue Unkräuter pro Spawn
const WEED_GROWTH_TIME = 8 * 60 * 60 * 1000; // 8 Stunden pro Wachstumsstufe

// Hilfsfunktion: Freie Gras-Tiles finden
function getFreeTiles(placedBuildings, plantedTrees) {
  const freeTiles = [];
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      if (homeMap[row][col] !== TILE_TYPES.GRASS) continue;
      if (placedBuildings?.some(b => b.col === col && b.row === row)) continue;
      if (plantedTrees?.some(t => t.col === col && t.row === row)) continue;
      if (col === TREE_POSITION.col && row === TREE_POSITION.row) continue;
      freeTiles.push({ col, row });
    }
  }
  return freeTiles;
}

// Unkraut spawnen: Bevorzugt neben bestehendem Unkraut
function spawnWeeds(existingWeeds, placedBuildings, plantedTrees) {
  const newWeeds = [...existingWeeds];
  let spawned = 0;

  const freeTiles = getFreeTiles(placedBuildings, plantedTrees);

  while (spawned < WEED_SPAWN_COUNT && freeTiles.length > 0) {
    let chosenIdx;

    // 70% Chance: Neben bestehendem Unkraut spawnen (wenn vorhanden)
    if (newWeeds.length > 0 && Math.random() < 0.7) {
      // Zufaelliges bestehendes Unkraut waehlen
      const sourceWeed = newWeeds[Math.floor(Math.random() * newWeeds.length)];
      // Nachbar-Tiles finden (8 Richtungen)
      const neighborIdxs = [];
      for (let i = 0; i < freeTiles.length; i++) {
        const t = freeTiles[i];
        const dc = Math.abs(t.col - sourceWeed.col);
        const dr = Math.abs(t.row - sourceWeed.row);
        if (dc <= 1 && dr <= 1 && (dc + dr > 0)) {
          neighborIdxs.push(i);
        }
      }
      if (neighborIdxs.length > 0) {
        chosenIdx = neighborIdxs[Math.floor(Math.random() * neighborIdxs.length)];
      } else {
        // Kein freier Nachbar, zufaellig waehlen
        chosenIdx = Math.floor(Math.random() * freeTiles.length);
      }
    } else {
      chosenIdx = Math.floor(Math.random() * freeTiles.length);
    }

    const tile = freeTiles[chosenIdx];
    const existingIdx = newWeeds.findIndex(w => w.col === tile.col && w.row === tile.row);
    if (existingIdx >= 0) {
      if (newWeeds[existingIdx].stage < 3) {
        newWeeds[existingIdx] = { ...newWeeds[existingIdx], stage: newWeeds[existingIdx].stage + 1 };
      }
    } else {
      newWeeds.push({
        col: tile.col,
        row: tile.row,
        stage: 1,
        spawnedAt: Date.now(),
      });
    }
    freeTiles.splice(chosenIdx, 1);
    spawned++;
  }

  return newWeeds;
}

// Unkraut wachsen lassen (natürliches Wachstum über Zeit)
function growWeeds(weeds) {
  const now = Date.now();
  return weeds.map(w => {
    if (w.stage >= 3) return w;
    const elapsed = now - w.spawnedAt;
    const newStage = Math.min(3, 1 + Math.floor(elapsed / WEED_GROWTH_TIME));
    if (newStage !== w.stage) {
      return { ...w, stage: newStage };
    }
    return w;
  });
}

export default function useGameLoop() {
  const [gameState, setGameState] = useState(null);
  const [isDead, setIsDead] = useState(false);
  const [deathCause, setDeathCause] = useState(null);
  const [showLoot, setShowLoot] = useState(null);

  // Auth-Kontext für Cloud-Sync
  const { user } = useAuth();
  const userId = user?.id || null;
  const userIdRef = useRef(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Ref für aktuellen State (damit Intervals immer den neuesten haben)
  const gameStateRef = useRef(null);
  const lastFrameTime = useRef(Date.now());
  // Multiplayer: Besucher-Modus (pausiert Beduerfnisse wie Urlaub)
  const isVisitingRef = useRef(false);

  // Ref synchron halten
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Verdorbene Nahrung entfernen (als normale Funktion, nicht Hook)
  const removeSpoiledFood = (state) => {
    const now = Date.now();
    const newInventory = { ...state.inventory };
    let changed = false;

    for (const [itemId, data] of Object.entries(newInventory)) {
      const itemDef = items[itemId];
      if (itemDef?.spoilTime && data.collectedAt) {
        if (now - data.collectedAt > FOOD_SPOIL_TIME) {
          delete newInventory[itemId];
          changed = true;
        }
      }
    }

    if (changed) {
      return { ...state, inventory: newInventory };
    }
    return state;
  };

  // Spielstand laden oder neu erstellen
  useEffect(() => {
    const initGame = async () => {
    let state;

    // Versuch 1: Cloud + localStorage Sync (mit verbessertem iOS-Fallback)
    try {
      state = await loadGameWithCloud(userId);
    } catch (err) {
      console.warn('Cloud-Load fehlgeschlagen:', err);
    }

    // Versuch 2: Nur localStorage
    if (!state) {
      state = loadGame(userId);
    }

    // Versuch 3 (bei eingeloggten Nutzern): Direkter Cloud-Download
    // Fängt Fälle ab wo localStorage kaputt ist (iOS Private Mode etc.)
    if (!state && userId) {
      try {
        const { success, data: cloudState } = await syncDown(userId);
        if (success && cloudState) {
          state = cloudState;
          console.log('Spielstand direkt aus Cloud geladen (localStorage unavailable)');
        }
      } catch (err2) {
        console.warn('Direkter Cloud-Load fehlgeschlagen:', err2);
      }
    }

    if (!state) {
      state = getDefaultGameState();
    }

    // Offline-Zeit für Bedürfnisse nachrechnen
    if (!state.vacation.isActive) {
      if (state.gathering) {
        // Wanderung war aktiv: Mood-Drain nur für die Zeit NACH der Wanderung berechnen
        // Während der Wanderung kein Mood-Drain (Charakter ist beschäftigt & aktiv)
        const gatheringElapsed = getElapsedGatheringTime(state.gathering); // ms
        const totalOfflineSec = (Date.now() - state.lastUpdate) / 1000;
        const gatheringSec = Math.min(gatheringElapsed / 1000, totalOfflineSec);
        const afterGatheringSec = Math.max(0, totalOfflineSec - gatheringSec);

        // Hunger/Durst laufen die gesamte Offline-Zeit
        const needs = { ...state.needs };
        needs.hunger = Math.max(0, needs.hunger - HUNGER_DRAIN_PER_SEC * totalOfflineSec);
        if (isWaterCollectorActive(state.buildings)) {
          needs.thirst = Math.min(100, needs.thirst + (5 / 3600) * totalOfflineSec);
        } else {
          needs.thirst = Math.max(0, needs.thirst - THIRST_DRAIN_PER_SEC * totalOfflineSec);
        }
        // Mood-Drain nur für die Zeit nach der Wanderung
        const shelterMod = SHELTER_MOOD_MODIFIERS[state.buildings.shelterLevel] || SHELTER_MOOD_MODIFIERS[0];
        const moodModifier = state.weather === WEATHER_TYPES.RAINY ? shelterMod.rain : shelterMod.sun;
        needs.mood = Math.max(0, needs.mood - MOOD_DRAIN_PER_SEC * moodModifier * afterGatheringSec);
        state.needs = needs;
      } else {
        state.needs = calculateOfflineNeeds(state);
      }

      // Tod-Check nach Offline-Berechnung
      if (checkDeath(state.needs)) {
        setIsDead(true);
        if (state.needs.hunger <= 0) setDeathCause('hunger');
        else if (state.needs.thirst <= 0) setDeathCause('thirst');
        else setDeathCause('mood');
      }
    }

    // Offline Sammelreise abschließen (wenn Timer-Modus und Reise abgelaufen)
    if (!state.vacation.isActive && state.gathering) {
      if (isGatheringComplete(state.gathering)) {
        // Reise war voll abgelaufen → Loot berechnen und anzeigen
        const result = finishGathering(state.gathering, state.tools || []);

        // Items ins Inventar
        const newInventory = { ...state.inventory };
        for (const item of result.items) {
          if (!newInventory[item.itemId]) {
            newInventory[item.itemId] = { amount: 0, collectedAt: Date.now() };
          }
          newInventory[item.itemId] = {
            ...newInventory[item.itemId],
            amount: newInventory[item.itemId].amount + item.amount,
          };
        }
        state.inventory = newInventory;

        // Werkzeug-Haltbarkeit
        state.tools = drainToolDurability(state.tools || [], result.duration, result.usedToolTypes || []);

        // Stimmung
        const newNeeds = { ...state.needs };
        newNeeds.mood = Math.min(100, newNeeds.mood + result.moodGain);
        state.needs = newNeeds;

        // Tagebuch: Reisezeit dem aktiven Thema gutschreiben
        if (result.topicId && state.diary?.topics) {
          state.diary = {
            ...state.diary,
            activeTopicId: null,
            topics: state.diary.topics.map(t =>
              t.id === result.topicId
                ? { ...t, totalTimeMs: t.totalTimeMs + result.duration }
                : t
            ),
          };
        }

        // Biom-Besuche
        const newBiomeVisits = { ...(state.biomeVisits || {}) };
        const tripBiome = state.gathering.biome;
        newBiomeVisits[tripBiome] = (newBiomeVisits[tripBiome] || 0) + 1;
        state.biomeVisits = newBiomeVisits;

        // Tier-Spawn prüfen
        const existingAnimals = state.animals || [];
        const newAnimal = checkAnimalSpawn(result.duration, tripBiome, newBiomeVisits, existingAnimals);
        if (newAnimal) {
          state.animals = [...existingAnimals, newAnimal];
          result.newAnimal = newAnimal;
        }

        // Reise beenden
        state.gathering = null;

        // Loot-Screen nach dem Laden anzeigen (via setTimeout damit State gesetzt ist)
        setTimeout(() => setShowLoot(result), 100);
      }
      // Stoppuhr-Modus: Sammelreise läuft weiter bis manueller Stopp
    }

    // Offline Tier-Hunger nachrechnen (nicht im Urlaub)
    if (!state.vacation.isActive && state.animals && state.animals.length > 0 && state.lastUpdate) {
      const offlineSecs = (Date.now() - state.lastUpdate) / 1000;
      if (offlineSecs > 0) {
        const { updatedAnimals } = updateAnimalHunger(state.animals, offlineSecs);
        state.animals = updatedAnimals;
      }
    }

    // Offline Baum-Obstabwurf nachholen
    if (!state.vacation.isActive) {
      const treeStage = state.treeStage !== null && state.treeStage !== undefined
        ? state.treeStage
        : Math.max(1, Math.min(10, Math.floor(((Date.now() - (state.stats?.startedAt || Date.now())) / (365 * 24 * 60 * 60 * 1000)) * 10) + 1));
      const fruitDrop = checkTreeFruitDrop(state.lastFruitDrop, treeStage);
      if (fruitDrop > 0) {
        if (!state.inventory) state.inventory = {};
        if (!state.inventory.fruit) {
          state.inventory.fruit = { amount: 0, collectedAt: Date.now() };
        }
        state.inventory.fruit = {
          ...state.inventory.fruit,
          amount: state.inventory.fruit.amount + fruitDrop,
        };
        state.lastFruitDrop = Date.now();
      }
    }

    // Offline Unkraut-Spawn nachholen
    if (!state.vacation.isActive) {
      const lastWeedSpawn = state.lastWeedSpawn || state.stats?.startedAt || Date.now();
      const weedMissed = Math.floor((Date.now() - lastWeedSpawn) / WEED_SPAWN_INTERVAL);
      if (weedMissed > 0) {
        let weeds = state.weeds || [];
        for (let i = 0; i < Math.min(weedMissed, 20); i++) { // max 20 Spawns nachholen
          weeds = spawnWeeds(weeds, state.placedBuildings, state.plantedTrees);
        }
        state.weeds = weeds;
        state.lastWeedSpawn = Date.now();
      }
      // Unkraut wachsen lassen
      if (state.weeds && state.weeds.length > 0) {
        state.weeds = growWeeds(state.weeds);
      }
    }

    // Offline Katzen-Zuneigung nachrechnen
    if (!state.vacation.isActive && state.animals && state.animals.length > 0 && state.lastUpdate) {
      const offlineSecs = (Date.now() - state.lastUpdate) / 1000;
      if (offlineSecs > 0) {
        state.animals = state.animals.map(a => {
          if (a.type === 'cat') return updateCatAffection(a, offlineSecs);
          return a;
        });
      }
    }

    // Offline Ei-Schlüpf-Check
    if (!state.vacation.isActive) {
      const eggCheck = checkEggHatch(state.inventory);
      if (eggCheck.shouldHatch) {
        const newInventory = { ...state.inventory };
        newInventory.mysterious_egg = {
          ...newInventory.mysterious_egg,
          amount: newInventory.mysterious_egg.amount - 1,
        };
        if (newInventory.mysterious_egg.amount <= 0) {
          delete newInventory.mysterious_egg;
        }
        state.inventory = newInventory;

        const pos = getRandomGrassPosition();
        const newCat = createCat(pos.x, pos.y);
        state.animals = [...(state.animals || []), newCat];
        state._catHatched = true;
      }
    }

    // Wetter aktualisieren (Override beibehalten wenn gesetzt)
    if (!state.weatherOverride) {
      state.weather = getCurrentWeather();
    }
    state.lastUpdate = Date.now();

    // Verdorbene Nahrung entfernen
    state = removeSpoiledFood(state);

    // Sofort speichern nach Laden (damit lastUpdate aktuell ist)
    saveGame(state, userId);

    setGameState(state);
    lastFrameTime.current = Date.now();

    // App ist geladen — SW-Reload erlauben
    window.__appReady = true;
    }; // Ende initGame

    initGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Game Loop – läuft einmalig, liest State über Ref
  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameStateRef.current || isDead) return;

      const now = Date.now();
      const delta = (now - lastFrameTime.current) / 1000;
      lastFrameTime.current = now;

      // Schutz: Delta darf nicht negativ oder unrealistisch groß sein
      if (delta <= 0 || delta > 5) return;

      setGameState(prev => {
        if (!prev || prev.vacation.isActive || isVisitingRef.current) return prev;

        // Bedürfnisse aktualisieren
        const newNeeds = updateNeeds(prev, delta);

        // Tod prüfen
        if (checkDeath(newNeeds)) {
          setIsDead(true);
          if (newNeeds.hunger <= 0) setDeathCause('hunger');
          else if (newNeeds.thirst <= 0) setDeathCause('thirst');
          else setDeathCause('mood');
        }

        // Wetter prüfen
        let updated = { ...prev, needs: newNeeds, lastUpdate: now };
        updated = checkWeatherUpdate(updated);
        updated.vacation = checkVacationExpiry(updated.vacation);

        // Regenfänger bei Regen füllen
        updated.buildings = updateWaterCollector(updated.buildings, updated.weather);

        // Tier-Hunger aktualisieren (nicht im Urlaub)
        if (updated.animals && updated.animals.length > 0) {
          const { updatedAnimals } = updateAnimalHunger(updated.animals, delta);
          updated.animals = updatedAnimals;
          // Tote Tiere werden einfach entfernt
        }

        // Baum-Obstabwurf prüfen (Stufe berechnen)
        const treeStage = updated.treeStage !== null && updated.treeStage !== undefined
          ? updated.treeStage
          : Math.max(1, Math.min(10, Math.floor(((now - (updated.stats?.startedAt || now)) / (365 * 24 * 60 * 60 * 1000)) * 10) + 1));
        const fruitDrop = checkTreeFruitDrop(updated.lastFruitDrop, treeStage);
        if (fruitDrop > 0) {
          const newInventory = { ...updated.inventory };
          if (!newInventory.fruit) {
            newInventory.fruit = { amount: 0, collectedAt: Date.now() };
          }
          newInventory.fruit = {
            ...newInventory.fruit,
            amount: newInventory.fruit.amount + fruitDrop,
          };
          updated.inventory = newInventory;
          updated.lastFruitDrop = now;
        }

        // Baum-Samen-Abwurf prüfen (ab Stufe 7, alle 28 Tage)
        const seedDrop = checkTreeSeedDrop(
          updated.lastSeedDrop,
          treeStage,
          TREE_POSITION.col,
          TREE_POSITION.row,
          updated.droppedSeeds
        );
        if (seedDrop) {
          updated.droppedSeeds = [...(updated.droppedSeeds || []), seedDrop];
          updated.lastSeedDrop = now;
        }

        // Unkraut-Spawning prüfen (alle 8 Stunden)
        const lastWeedSpawn = updated.lastWeedSpawn || updated.stats?.startedAt || now;
        if (now - lastWeedSpawn >= WEED_SPAWN_INTERVAL) {
          // Anzahl verpasster Spawns berechnen
          const missedSpawns = Math.floor((now - lastWeedSpawn) / WEED_SPAWN_INTERVAL);
          let weeds = updated.weeds || [];
          for (let i = 0; i < missedSpawns; i++) {
            weeds = spawnWeeds(weeds, updated.placedBuildings, updated.plantedTrees);
          }
          updated.weeds = weeds;
          updated.lastWeedSpawn = now;
        }

        // Unkraut natürlich wachsen lassen
        if (updated.weeds && updated.weeds.length > 0) {
          updated.weeds = growWeeds(updated.weeds);
        }

        // Katzen-Zuneigung drain
        if (updated.animals && updated.animals.length > 0) {
          updated.animals = updated.animals.map(a => {
            if (a.type === 'cat') return updateCatAffection(a, delta);
            return a;
          });
        }

        // Ei-Schlüpf-Check
        const eggCheck = checkEggHatch(updated.inventory);
        if (eggCheck.shouldHatch) {
          const newInventory = { ...updated.inventory };
          newInventory.mysterious_egg = {
            ...newInventory.mysterious_egg,
            amount: newInventory.mysterious_egg.amount - 1,
          };
          if (newInventory.mysterious_egg.amount <= 0) {
            delete newInventory.mysterious_egg;
          }
          updated.inventory = newInventory;

          // Katze spawnen
          const pos = getRandomGrassPosition();
          const newCat = createCat(pos.x, pos.y);
          updated.animals = [...(updated.animals || []), newCat];
          updated._catHatched = true;
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isDead]); // Nur isDead als Dependency, NICHT gameState

  // Auto-Save – separater Timer, liest State über Ref
  useEffect(() => {
    const saveInterval = setInterval(() => {
      const current = gameStateRef.current;
      if (current) {
        const saved = saveGame(current, userIdRef.current);
        // Wenn localStorage nicht funktioniert UND eingeloggt → Cloud als Fallback
        if (!saved && userIdRef.current) {
          saveGameWithCloud(current, userIdRef.current).catch(() => {});
        }
      }
    }, SAVE_INTERVAL);

    return () => clearInterval(saveInterval);
  }, []); // Läuft einmalig, kein Neustart bei State-Änderung

  // Cloud-Save – alle 30 Sekunden (häufiger für iOS-Stabilität)
  useEffect(() => {
    if (!userId) return; // Nicht eingeloggt → kein Cloud-Sync

    const cloudSaveInterval = setInterval(() => {
      const current = gameStateRef.current;
      if (current) {
        saveGameWithCloud(current, userIdRef.current).catch(() => {});
      }
    }, 30 * 1000); // Alle 30 Sekunden

    return () => clearInterval(cloudSaveInterval);
  }, [userId]);

  // localStorage speichern bei Seite-Schließen (Cloud holt beim nächsten Start nach)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const current = gameStateRef.current;
      if (current) {
        saveGame(current, userIdRef.current); // localStorage ist synchron und zuverlässig
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Tier-Bewegungs-Loop (schneller als Game-Loop für flüssige Bewegung)
  useEffect(() => {
    const animalInterval = setInterval(() => {
      const current = gameStateRef.current;
      if (!current || !current.animals || current.animals.length === 0) return;

      setGameState(prev => {
        if (!prev || !prev.animals || prev.animals.length === 0) return prev;
        let updatedAnimals = updateAnimals(prev.animals, 200); // 200ms Tick (überspringt Katzen)
        // Katzen-Bewegung separat updaten
        updatedAnimals = updatedAnimals.map(a => {
          if (a.type === 'cat') return updateCatBehavior(a, 200);
          return a;
        });
        return { ...prev, animals: updatedAnimals };
      });
    }, 200);

    return () => clearInterval(animalInterval);
  }, []); // Läuft einmalig

  // Spieler bewegen
  const movePlayer = useCallback((dx, dy) => {
    setGameState(prev => {
      if (!prev || prev.gathering || prev.vacation.isActive) return prev;

      const newX = prev.player.x + dx;
      const newY = prev.player.y + dy;

      const col = Math.floor(newX / TILE_SIZE);
      const row = Math.floor(newY / TILE_SIZE);

      // Begrenzung
      if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return prev;

      // Kollisionsprüfung
      const tileType = homeMap[row]?.[col];
      if (COLLISION_TILES.includes(tileType)) return prev;

      return {
        ...prev,
        player: { x: newX, y: newY },
      };
    });
  }, []);

  // Klick-Bewegung (Punkt-und-Klick)
  const movePlayerTo = useCallback((targetX, targetY) => {
    setGameState(prev => {
      if (!prev || prev.gathering || prev.vacation.isActive) return prev;

      const col = Math.floor(targetX / TILE_SIZE);
      const row = Math.floor(targetY / TILE_SIZE);

      if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return prev;

      const tileType = homeMap[row]?.[col];
      if (COLLISION_TILES.includes(tileType)) return prev;

      return {
        ...prev,
        player: { x: targetX, y: targetY },
      };
    });
  }, []);

  // Ausgang prüfen
  const checkExit = useCallback((x, y) => {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);

    for (const [direction, zone] of Object.entries(EXIT_ZONES)) {
      if (zone.row !== undefined) {
        if (row === zone.row && col >= zone.colStart && col <= zone.colEnd) {
          return direction;
        }
      } else if (zone.col !== undefined) {
        if (col === zone.col && row >= zone.rowStart && row <= zone.rowEnd) {
          return direction;
        }
      }
    }
    return null;
  }, []);

  // Ausgang betreten (Sammelreise starten)
  const getExitDirection = useCallback(() => {
    if (!gameState) return null;
    return checkExit(gameState.player.x, gameState.player.y);
  }, [gameState, checkExit]);

  // Spieler-Tod behandeln
  const handleDeath = useCallback(async () => {
    let newState;
    if (userIdRef.current) {
      newState = await resetGameWithCloud(userIdRef.current);
    } else {
      newState = resetGame(null); // Gast: Standard-Key
    }
    setGameState(newState);
    setIsDead(false);
    setDeathCause(null);
    lastFrameTime.current = Date.now();
  }, []);

  // Item zum Inventar hinzufügen
  const addToInventory = useCallback((itemId, amount = 1) => {
    setGameState(prev => {
      const newInventory = { ...prev.inventory };
      if (!newInventory[itemId]) {
        newInventory[itemId] = { amount: 0, collectedAt: Date.now() };
      }
      newInventory[itemId] = {
        ...newInventory[itemId],
        amount: newInventory[itemId].amount + amount,
      };
      return { ...prev, inventory: newInventory };
    });
  }, []);

  // Item aus Inventar entfernen
  const removeFromInventory = useCallback((itemId, amount = 1) => {
    setGameState(prev => {
      const newInventory = { ...prev.inventory };
      if (!newInventory[itemId]) return prev;

      newInventory[itemId] = {
        ...newInventory[itemId],
        amount: newInventory[itemId].amount - amount,
      };

      if (newInventory[itemId].amount <= 0) {
        delete newInventory[itemId];
      }

      return { ...prev, inventory: newInventory };
    });
  }, []);

  // Nahrung/Wasser konsumieren
  const consumeItem = useCallback((itemId) => {
    setGameState(prev => {
      const itemDef = items[itemId];
      if (!itemDef) return prev;
      if (!prev.inventory[itemId] || prev.inventory[itemId].amount <= 0) return prev;

      const isRaw = itemDef.isRaw;
      const efficiency = isRaw ? 0.5 : 1.0;

      const newNeeds = { ...prev.needs };
      if (itemDef.hungerValue) {
        newNeeds.hunger = Math.min(100, newNeeds.hunger + itemDef.hungerValue * efficiency);
      }
      if (itemDef.thirstValue) {
        newNeeds.thirst = Math.min(100, newNeeds.thirst + itemDef.thirstValue * efficiency);
      }

      const newInventory = { ...prev.inventory };
      newInventory[itemId] = {
        ...newInventory[itemId],
        amount: newInventory[itemId].amount - 1,
      };
      if (newInventory[itemId].amount <= 0) {
        delete newInventory[itemId];
      }

      return { ...prev, needs: newNeeds, inventory: newInventory };
    });
  }, []);

  // Manueller Save (lokal + Cloud bei wichtigen Aktionen)
  const manualSave = useCallback(() => {
    if (gameStateRef.current) {
      saveGame(gameStateRef.current, userIdRef.current); // Immer lokal zuerst (user-spezifisch)
      if (userIdRef.current) {
        saveGameWithCloud(gameStateRef.current, userIdRef.current).catch(() => {});
      }
    }
  }, []);

  // Multiplayer: Besucher-Modus setzen (pausiert Beduerfnisse)
  const setIsVisiting = useCallback((visiting) => {
    isVisitingRef.current = visiting;
  }, []);

  return {
    gameState,
    setGameState,
    isDead,
    deathCause,
    showLoot,
    setShowLoot,
    movePlayer,
    movePlayerTo,
    getExitDirection,
    handleDeath,
    addToInventory,
    removeFromInventory,
    consumeItem,
    manualSave,
    setIsVisiting,
  };
}
