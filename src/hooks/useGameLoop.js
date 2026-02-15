// ============================================
// Haupt-Game-Loop Hook
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadGame, saveGame, getDefaultGameState, resetGame } from '../systems/SaveSystem';
import { updateNeeds, calculateOfflineNeeds, checkDeath, updateWaterCollector } from '../systems/NeedsSystem';
import { checkWeatherUpdate, getCurrentWeather } from '../systems/WeatherSystem';
import { checkVacationExpiry } from '../systems/VacationSystem';
import { SAVE_INTERVAL, TILE_SIZE, COLLISION_TILES, MAP_COLS, MAP_ROWS } from '../utils/constants';
import { updateAnimals, updateAnimalHunger, checkTreeFruitDrop, checkTreeSeedDrop } from '../systems/AnimalSystem';
import homeMap, { EXIT_ZONES, TREE_POSITION } from '../data/homeMap';
import items from '../data/items';
import { FOOD_SPOIL_TIME } from '../utils/constants';

export default function useGameLoop() {
  const [gameState, setGameState] = useState(null);
  const [isDead, setIsDead] = useState(false);
  const [deathCause, setDeathCause] = useState(null);
  const [showLoot, setShowLoot] = useState(null);

  // Ref für aktuellen State (damit Intervals immer den neuesten haben)
  const gameStateRef = useRef(null);
  const lastFrameTime = useRef(Date.now());

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
    let state = loadGame();
    if (!state) {
      state = getDefaultGameState();
    }

    // Offline-Zeit für Bedürfnisse nachrechnen
    if (!state.vacation.isActive) {
      state.needs = calculateOfflineNeeds(state);

      // Tod-Check nach Offline-Berechnung
      if (checkDeath(state.needs)) {
        setIsDead(true);
        if (state.needs.hunger <= 0) setDeathCause('hunger');
        else if (state.needs.thirst <= 0) setDeathCause('thirst');
        else setDeathCause('mood');
      }
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

    // Wetter aktualisieren (Override beibehalten wenn gesetzt)
    if (!state.weatherOverride) {
      state.weather = getCurrentWeather();
    }
    state.lastUpdate = Date.now();

    // Verdorbene Nahrung entfernen
    state = removeSpoiledFood(state);

    // Sofort speichern nach Laden (damit lastUpdate aktuell ist)
    saveGame(state);

    setGameState(state);
    lastFrameTime.current = Date.now();
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
        if (!prev || prev.vacation.isActive) return prev;

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
        saveGame(current);
      }
    }, SAVE_INTERVAL);

    return () => clearInterval(saveInterval);
  }, []); // Läuft einmalig, kein Neustart bei State-Änderung

  // Tier-Bewegungs-Loop (schneller als Game-Loop für flüssige Bewegung)
  useEffect(() => {
    const animalInterval = setInterval(() => {
      const current = gameStateRef.current;
      if (!current || !current.animals || current.animals.length === 0) return;

      setGameState(prev => {
        if (!prev || !prev.animals || prev.animals.length === 0) return prev;
        const updatedAnimals = updateAnimals(prev.animals, 200); // 200ms Tick
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
  const handleDeath = useCallback(() => {
    const newState = resetGame();
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

  // Manueller Save
  const manualSave = useCallback(() => {
    if (gameStateRef.current) {
      saveGame(gameStateRef.current);
    }
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
  };
}
