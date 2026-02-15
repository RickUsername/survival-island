// ============================================
// Haupt-Spielkomponente - Verbindet alle Systeme
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useGameLoop from '../hooks/useGameLoop';
import GameCanvas from './GameCanvas';
import NeedsBar from './NeedsBar';
import WeatherDisplay from './WeatherDisplay';
import VacationButton from './VacationButton';
import InventoryPanel from './InventoryPanel';
import CraftingPanel from './CraftingPanel';
import GatheringScreen from './GatheringScreen';
import LootScreen from './LootScreen';
import DeathScreen from './DeathScreen';
import BiomePrompt from './BiomePrompt';
import CheatConsole from './CheatConsole';
import CheatListDialog from './CheatListDialog';
import DemolishDialog from './DemolishDialog';
import AnimalInfoDialog from './AnimalInfoDialog';
import {
  startGathering,
  pauseGathering,
  resumeGathering,
  finishGathering,
} from '../systems/GatheringSystem';
import { drainToolDurability } from '../systems/ToolSystem';
import { checkAnimalSpawn, createAnimal, getRandomGrassPosition, ANIMAL_TYPES, feedAnimal } from '../systems/AnimalSystem';
import items from '../data/items';
import { PLAYER_SPEED, TILE_SIZE, TILE_TYPES } from '../utils/constants';
import homeMap, { EXIT_ZONES } from '../data/homeMap';
import { COLLISION_TILES, MAP_COLS, MAP_ROWS } from '../utils/constants';

export default function Game() {
  const {
    gameState,
    setGameState,
    isDead,
    deathCause,
    showLoot,
    setShowLoot,
    handleDeath,
    consumeItem,
    manualSave,
  } = useGameLoop();

  const [showInventory, setShowInventory] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);
  const [showCheats, setShowCheats] = useState(false);
  const [showCheatList, setShowCheatList] = useState(false);
  const [biomePrompt, setBiomePrompt] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Platzierungsmodus: { type: 'shelter'|'campfire'|'water_collector', level?: number }
  const [placementMode, setPlacementMode] = useState(null);
  // Ghost-Position für Vorschau: { type, col, row, level? }
  const [placementGhost, setPlacementGhost] = useState(null);
  // Abriss-Dialog: { type, col, row, index }
  const [demolishConfirm, setDemolishConfirm] = useState(null);
  // Tier-Info-Dialog: { id, type, hunger, ... }
  const [animalInfo, setAnimalInfo] = useState(null);

  const keysPressed = useRef(new Set());
  const moveInterval = useRef(null);

  // Canvas-Größe an Fenster anpassen
  useEffect(() => {
    const updateSize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Ausgang prüfen nach Bewegung
  const checkExitAfterMove = useCallback((x, y) => {
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

  // Tastatur-Steuerung + Bewegungs-Loop (WASD + Click-to-Walk)
  useEffect(() => {
    if (!gameState || gameState.gathering || gameState.vacation.isActive) return;
    if (showInventory || showCrafting || showCheats || biomePrompt || isDead || showLoot || demolishConfirm || animalInfo) return;

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();

      // ESC beendet Platzierungsmodus
      if (key === 'escape' && placementMode) {
        handleCancelPlacement();
        return;
      }

      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
        keysPressed.current.add(key);
        // WASD bricht Click-to-Walk ab
        setGameState(prev => {
          if (!prev || !prev.player.targetX) return prev;
          return { ...prev, player: { x: prev.player.x, y: prev.player.y, moving: true } };
        });
      }
      // Shortcuts (nicht im Platzierungsmodus)
      if (!placementMode) {
        if (key === 'i') setShowInventory(v => !v);
        if (key === 'c') setShowCrafting(v => !v);
      }
    };

    const handleKeyUp = (e) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Bewegungs-Loop (WASD + Click-to-Walk in einem Loop)
    if (!placementMode) {
      moveInterval.current = setInterval(() => {
        setGameState(prev => {
          if (!prev || prev.gathering) return prev;

          let dx = 0;
          let dy = 0;
          let isWASD = false;

          // WASD-Eingabe prüfen
          if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) dy -= 1;
          if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) dy += 1;
          if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) dx -= 1;
          if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) dx += 1;

          if (dx !== 0 || dy !== 0) {
            isWASD = true;
            // Diagonal normalisieren (damit schräg nicht schneller ist)
            const len = Math.sqrt(dx * dx + dy * dy);
            dx = (dx / len) * PLAYER_SPEED;
            dy = (dy / len) * PLAYER_SPEED;
          } else if (prev.player.targetX !== undefined && prev.player.targetY !== undefined) {
            // Click-to-Walk: Zum Ziel laufen
            const tdx = prev.player.targetX - prev.player.x;
            const tdy = prev.player.targetY - prev.player.y;
            const dist = Math.sqrt(tdx * tdx + tdy * tdy);

            if (dist < PLAYER_SPEED) {
              // Ziel erreicht
              return {
                ...prev,
                player: { x: prev.player.targetX, y: prev.player.targetY },
              };
            }

            // In Richtung Ziel bewegen
            dx = (tdx / dist) * PLAYER_SPEED;
            dy = (tdy / dist) * PLAYER_SPEED;
          } else {
            // Keine Bewegung → moving = false
            if (prev.player.moving) {
              return { ...prev, player: { x: prev.player.x, y: prev.player.y } };
            }
            return prev;
          }

          const newX = prev.player.x + dx;
          const newY = prev.player.y + dy;
          const col = Math.floor(newX / TILE_SIZE);
          const row = Math.floor(newY / TILE_SIZE);

          // Ausgang-Check
          const exitDir = checkExitAfterMove(newX, newY);
          if (exitDir) {
            setBiomePrompt(exitDir);
            return { ...prev, player: { x: prev.player.x, y: prev.player.y } };
          }

          // Begrenzung und Kollision
          if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) {
            // Bei Click-to-Walk: Ziel abbrechen
            if (!isWASD) return { ...prev, player: { x: prev.player.x, y: prev.player.y } };
            return prev;
          }
          const tileType = homeMap[row]?.[col];
          if (COLLISION_TILES.includes(tileType)) {
            // Bei Click-to-Walk: Ziel abbrechen
            if (!isWASD) return { ...prev, player: { x: prev.player.x, y: prev.player.y } };
            return prev;
          }

          // Position aktualisieren (Ziel beibehalten für Click-to-Walk)
          const newPlayer = { x: newX, y: newY, moving: true };
          if (!isWASD && prev.player.targetX !== undefined) {
            newPlayer.targetX = prev.player.targetX;
            newPlayer.targetY = prev.player.targetY;
          }
          return { ...prev, player: newPlayer };
        });
      }, 1000 / 60);
    }

    const currentKeys = keysPressed.current;
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (moveInterval.current) clearInterval(moveInterval.current);
      currentKeys.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, showInventory, showCrafting, showCheats, biomePrompt, isDead, showLoot, demolishConfirm, animalInfo, placementMode, setGameState, checkExitAfterMove]);

  // Prüfen ob eine Tile für Platzierung gültig ist
  const isTileValidForPlacement = useCallback((col, row) => {
    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return false;
    const tileType = homeMap[row]?.[col];
    if (tileType !== TILE_TYPES.GRASS) return false;
    // Kein Gebäude auf der gleichen Tile
    if (gameState?.placedBuildings?.some(b => b.col === col && b.row === row)) return false;
    return true;
  }, [gameState]);

  // Platzierung abbrechen → Materialien zurückgeben
  const handleCancelPlacement = useCallback(() => {
    // Materialien nicht zurückgeben - stattdessen den Craft rückgängig machen
    // Einfachste Lösung: Einfach den Modus verlassen, Material ist weg
    // Alternativ: Gebäude-Flags zurücksetzen falls nötig
    setPlacementMode(null);
    setPlacementGhost(null);
  }, []);

  // Maus-Bewegung im Platzierungsmodus
  const handleMouseMove = useCallback((col, row) => {
    if (!placementMode) return;
    setPlacementGhost({
      type: placementMode.type,
      col,
      row,
      level: placementMode.level,
    });
  }, [placementMode]);

  // Gebäude platzieren (Klick im Platzierungsmodus)
  const handlePlaceBuilding = useCallback((col, row) => {
    if (!placementMode) return;

    // Prüfen ob auf dieser Tile ein gleichartiges Gebäude steht (Upgrade/Ersetzung)
    const existingOnTile = (gameState?.placedBuildings || []).find(
      b => b.col === col && b.row === row && b.type === placementMode.type
    );

    // Wenn Tile belegt ist mit einem ANDEREN Gebäudetyp → ungültig
    const otherOnTile = (gameState?.placedBuildings || []).find(
      b => b.col === col && b.row === row && b.type !== placementMode.type
    );
    if (otherOnTile) return;

    // Wenn kein bestehendes gleichartiges Gebäude → normale Tile-Prüfung
    if (!existingOnTile && !isTileValidForPlacement(col, row)) return;

    setGameState(prev => {
      let newPlaced = [...(prev.placedBuildings || [])];
      const newBuildings = { ...prev.buildings };

      switch (placementMode.type) {
        case 'shelter': {
          // Wenn auf dieser Tile schon ein Shelter steht → ersetzen
          if (existingOnTile) {
            newPlaced = newPlaced.map(b =>
              (b.col === col && b.row === row && b.type === 'shelter')
                ? { ...b, level: placementMode.level }
                : b
            );
          } else {
            // Neues Shelter hinzufügen (alte an anderen Positionen bleiben)
            newPlaced.push({ type: 'shelter', col, row, level: placementMode.level });
          }
          // shelterLevel = höchstes vorhandenes Level
          const maxLevel = Math.max(
            ...newPlaced.filter(b => b.type === 'shelter').map(b => b.level || 1)
          );
          newBuildings.shelterLevel = maxLevel;
          break;
        }
        case 'campfire':
          if (!existingOnTile) {
            newPlaced.push({ type: 'campfire', col, row });
          }
          newBuildings.hasCampfire = true;
          break;
        case 'water_collector':
          if (!existingOnTile) {
            newPlaced.push({ type: 'water_collector', col, row });
          }
          newBuildings.hasWaterCollector = true;
          newBuildings.waterCollectorFilledAt = null;
          break;
        default:
          break;
      }

      return {
        ...prev,
        placedBuildings: newPlaced,
        buildings: newBuildings,
      };
    });

    setPlacementMode(null);
    setPlacementGhost(null);
    setTimeout(() => manualSave(), 0);
  }, [placementMode, gameState, isTileValidForPlacement, setGameState, manualSave]);

  // Baum pflanzen (Klick im Pflanz-Modus)
  const handlePlantTree = useCallback((col, row) => {
    if (!isTileValidForPlacement(col, row)) return;

    // Prüfen ob dort schon ein gepflanzter Baum steht
    const hasTree = (gameState?.plantedTrees || []).some(t => t.col === col && t.row === row);
    if (hasTree) return;

    // Nicht auf die Hauptbaum-Position pflanzen
    if (col === 3 && row === 3) return;

    setGameState(prev => {
      // Samen aus Inventar verbrauchen
      const newInventory = { ...prev.inventory };
      if (!newInventory.tree_seed || newInventory.tree_seed.amount <= 0) return prev;
      newInventory.tree_seed = {
        ...newInventory.tree_seed,
        amount: newInventory.tree_seed.amount - 1,
      };
      if (newInventory.tree_seed.amount <= 0) {
        delete newInventory.tree_seed;
      }

      // Baum pflanzen
      const newPlantedTrees = [...(prev.plantedTrees || [])];
      newPlantedTrees.push({
        id: `tree_${Date.now()}`,
        col,
        row,
        plantedAt: Date.now(),
      });

      return {
        ...prev,
        inventory: newInventory,
        plantedTrees: newPlantedTrees,
      };
    });

    setPlacementMode(null);
    setPlacementGhost(null);
    setTimeout(() => manualSave(), 0);
  }, [gameState, isTileValidForPlacement, setGameState, manualSave]);

  // Pflanzen-Modus aktivieren (aus Inventar heraus)
  const handleStartPlanting = useCallback(() => {
    setPlacementMode({ type: 'tree_seed' });
    setShowInventory(false);
  }, []);

  // Touch-Steuerung (Klick auf Karte)
  const handleMapClick = useCallback((worldX, worldY) => {
    if (!gameState || gameState.gathering || gameState.vacation.isActive) return;
    if (showInventory || showCrafting || biomePrompt || demolishConfirm || animalInfo) return;

    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);

    // Im Platzierungsmodus: Gebäude oder Baum platzieren
    if (placementMode) {
      if (placementMode.type === 'tree_seed') {
        handlePlantTree(col, row);
      } else {
        handlePlaceBuilding(col, row);
      }
      return;
    }

    // Prüfen ob ein abgeworfener Samen angeklickt wurde
    const droppedSeeds = gameState.droppedSeeds || [];
    const clickedSeedIdx = droppedSeeds.findIndex(s => s.col === col && s.row === row);
    if (clickedSeedIdx >= 0) {
      // Samen aufheben → ins Inventar
      setGameState(prev => {
        const newSeeds = [...(prev.droppedSeeds || [])];
        newSeeds.splice(clickedSeedIdx, 1);
        const newInventory = { ...prev.inventory };
        if (!newInventory.tree_seed) {
          newInventory.tree_seed = { amount: 0, collectedAt: Date.now() };
        }
        newInventory.tree_seed = {
          ...newInventory.tree_seed,
          amount: newInventory.tree_seed.amount + 1,
        };
        return { ...prev, droppedSeeds: newSeeds, inventory: newInventory };
      });
      setTimeout(() => manualSave(), 0);
      return;
    }

    // Prüfen ob ein Tier angeklickt wurde (Klick-Radius)
    const animals = gameState.animals || [];
    const clickedAnimal = animals.find(a => {
      const dist = Math.sqrt((worldX - a.x) ** 2 + (worldY - a.y) ** 2);
      const animalDef = ANIMAL_TYPES[a.type];
      return dist < (animalDef?.size || 20) * 0.8;
    });
    if (clickedAnimal) {
      setAnimalInfo(clickedAnimal);
      return;
    }

    // Prüfen ob ein platziertes Gebäude angeklickt wurde
    const placed = gameState.placedBuildings || [];
    const clickedBuildingIdx = placed.findIndex(b => b.col === col && b.row === row);
    if (clickedBuildingIdx >= 0) {
      const building = placed[clickedBuildingIdx];
      setDemolishConfirm({ ...building, index: clickedBuildingIdx });
      return;
    }

    // Exit-Check
    const exitDir = checkExitAfterMove(worldX, worldY);
    if (exitDir) {
      setBiomePrompt(exitDir);
      return;
    }

    // Click-to-Walk: Ziel setzen (Spielerin läuft dorthin)
    if (col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS) {
      const tileType = homeMap[row]?.[col];
      if (!COLLISION_TILES.includes(tileType)) {
        setGameState(prev => ({
          ...prev,
          player: {
            x: prev.player.x,
            y: prev.player.y,
            targetX: worldX,
            targetY: worldY,
            moving: true,
          },
        }));
      }
    }
  }, [gameState, showInventory, showCrafting, biomePrompt, demolishConfirm, animalInfo, placementMode, setGameState, manualSave, checkExitAfterMove, handlePlaceBuilding, handlePlantTree]);

  // Gebäude abreißen
  const handleDemolish = useCallback(() => {
    if (!demolishConfirm) return;

    setGameState(prev => {
      const newPlaced = [...(prev.placedBuildings || [])];
      const newBuildings = { ...prev.buildings };

      // Gebäude entfernen
      newPlaced.splice(demolishConfirm.index, 1);

      // Building-Flags zurücksetzen
      switch (demolishConfirm.type) {
        case 'shelter': {
          // shelterLevel = höchstes verbleibendes Level (oder 0)
          const remainingShelters = newPlaced.filter(b => b.type === 'shelter');
          newBuildings.shelterLevel = remainingShelters.length > 0
            ? Math.max(...remainingShelters.map(b => b.level || 1))
            : 0;
          break;
        }
        case 'campfire':
          newBuildings.hasCampfire = false;
          break;
        case 'water_collector':
          newBuildings.hasWaterCollector = false;
          newBuildings.waterCollectorFilledAt = null;
          break;
        default:
          break;
      }

      return {
        ...prev,
        placedBuildings: newPlaced,
        buildings: newBuildings,
      };
    });

    setDemolishConfirm(null);
    setTimeout(() => manualSave(), 0);
  }, [demolishConfirm, setGameState, manualSave]);

  // Tier wegschicken
  const handleDismissAnimal = useCallback(() => {
    if (!animalInfo) return;

    setGameState(prev => {
      const newAnimals = (prev.animals || []).filter(a => a.id !== animalInfo.id);
      return { ...prev, animals: newAnimals };
    });

    setAnimalInfo(null);
    setTimeout(() => manualSave(), 0);
  }, [animalInfo, setGameState, manualSave]);

  // Tier füttern (mit Obst oder Beeren)
  const handleFeedAnimal = useCallback((foodItemId) => {
    if (!animalInfo) return;

    const itemDef = items[foodItemId];
    if (!itemDef || !itemDef.fruitValue) return;

    setGameState(prev => {
      // Prüfen ob Item im Inventar
      if (!prev.inventory[foodItemId] || prev.inventory[foodItemId].amount <= 0) return prev;

      // Item verbrauchen
      const newInventory = { ...prev.inventory };
      newInventory[foodItemId] = {
        ...newInventory[foodItemId],
        amount: newInventory[foodItemId].amount - 1,
      };
      if (newInventory[foodItemId].amount <= 0) {
        delete newInventory[foodItemId];
      }

      // Tier füttern
      const newAnimals = (prev.animals || []).map(a => {
        if (a.id === animalInfo.id) {
          return feedAnimal(a, itemDef.fruitValue);
        }
        return a;
      });

      // Dialog-Tier aktualisieren (für sofortige Anzeige)
      const updatedAnimal = newAnimals.find(a => a.id === animalInfo.id);
      if (updatedAnimal) {
        setTimeout(() => setAnimalInfo(updatedAnimal), 0);
      }

      return { ...prev, inventory: newInventory, animals: newAnimals };
    });

    setTimeout(() => manualSave(), 0);
  }, [animalInfo, setGameState, manualSave]);

  // Sammelreise starten
  const handleStartGathering = useCallback((direction) => {
    setGameState(prev => ({
      ...prev,
      gathering: startGathering(direction),
      stats: {
        ...prev.stats,
        totalGatheringTrips: prev.stats.totalGatheringTrips + 1,
      },
    }));
    setBiomePrompt(null);
  }, [setGameState]);

  // Sammelreise pausieren
  const handlePauseGathering = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gathering: pauseGathering(prev.gathering),
    }));
  }, [setGameState]);

  // Sammelreise fortsetzen
  const handleResumeGathering = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gathering: resumeGathering(prev.gathering),
    }));
  }, [setGameState]);

  // Sammelreise beenden (abbrechen oder automatisch)
  const handleFinishGathering = useCallback(() => {
    // Loot-Ergebnis außerhalb des State-Updaters speichern
    let lootResult = null;

    setGameState(prev => {
      if (!prev.gathering) return prev;

      const result = finishGathering(prev.gathering, prev.tools);
      lootResult = result;

      // Items ins Inventar
      const newInventory = { ...prev.inventory };
      for (const item of result.items) {
        if (!newInventory[item.itemId]) {
          newInventory[item.itemId] = { amount: 0, collectedAt: Date.now() };
        }
        newInventory[item.itemId] = {
          ...newInventory[item.itemId],
          amount: newInventory[item.itemId].amount + item.amount,
        };
      }

      // Werkzeug-Haltbarkeit reduzieren
      const newTools = drainToolDurability(
        prev.tools,
        result.duration,
        result.usedToolTypes || []
      );

      // Stimmung durch Sammeln
      const newNeeds = { ...prev.needs };
      newNeeds.mood = Math.min(100, newNeeds.mood + result.moodGain);

      const totalNew = result.items.reduce((sum, i) => sum + i.amount, 0);

      // Kaputte Werkzeuge für Loot-Anzeige merken
      const brokenTools = prev.tools.filter(t =>
        t.durability > 0 && !newTools.find(nt => nt.id === t.id && nt.durability > 0)
      );
      if (brokenTools.length > 0) {
        lootResult = { ...lootResult, brokenTools };
      }

      // Biom-Besuche tracken
      const newBiomeVisits = { ...(prev.biomeVisits || {}) };
      const tripBiome = prev.gathering.biome;
      newBiomeVisits[tripBiome] = (newBiomeVisits[tripBiome] || 0) + 1;

      // Tier-Spawn prüfen
      const existingAnimals = prev.animals || [];
      const newAnimal = checkAnimalSpawn(
        result.duration,
        tripBiome,
        newBiomeVisits,
        existingAnimals
      );
      const newAnimals = newAnimal
        ? [...existingAnimals, newAnimal]
        : existingAnimals;

      // Spawn-Info für Loot-Anzeige
      if (newAnimal) {
        lootResult = { ...lootResult, newAnimal };
      }

      return {
        ...prev,
        gathering: null,
        inventory: newInventory,
        tools: newTools,
        needs: newNeeds,
        animals: newAnimals,
        biomeVisits: newBiomeVisits,
        stats: {
          ...prev.stats,
          totalItemsCollected: prev.stats.totalItemsCollected + totalNew,
        },
      };
    });

    // Loot-Anzeige NACH dem State-Update setzen + sofort speichern
    // setTimeout stellt sicher, dass der Inventar-Update zuerst committed wird
    setTimeout(() => {
      if (lootResult) {
        setShowLoot(lootResult);
      }
      manualSave(); // Sofort speichern nach Loot
    }, 0);
  }, [setGameState, setShowLoot, manualSave]);

  // Urlaub ändern
  const handleVacationChange = useCallback((newVacation) => {
    setGameState(prev => ({
      ...prev,
      vacation: newVacation,
    }));
  }, [setGameState]);

  // Crafting-Ergebnis anwenden
  const handleCraft = useCallback((newState) => {
    // Prüfen ob ein Gebäude-Placement ansteht
    if (newState._pendingPlacement) {
      const pending = newState._pendingPlacement;
      delete newState._pendingPlacement;

      // State setzen (Materialien wurden bereits abgezogen)
      setGameState(newState);

      // Platzierungsmodus aktivieren
      setPlacementMode(pending);
      setShowCrafting(false); // Crafting-Panel schließen

      setTimeout(() => manualSave(), 0);
      return;
    }

    setGameState(newState);
    setTimeout(() => manualSave(), 0); // Sofort speichern nach Crafting
  }, [setGameState, manualSave]);

  // Loot-Screen schließen
  const handleCloseLoot = useCallback(() => {
    setShowLoot(null);
  }, [setShowLoot]);

  // Cheat: Item ins Inventar legen
  const handleCheatAddItem = useCallback((itemId, amount) => {
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
    setTimeout(() => manualSave(), 0); // Sofort speichern nach Cheat
  }, [setGameState, manualSave]);

  // Cheat: Spezial-Befehle (Wetter, Tiere, Baum etc.)
  const handleCheatCommand = useCallback((command) => {
    if (command.type === 'weather') {
      setGameState(prev => ({
        ...prev,
        weather: command.value,
        weatherOverride: true, // Verhindert automatisches Überschreiben
        lastWeatherChange: Date.now(),
      }));
      setTimeout(() => manualSave(), 0);
    } else if (command.type === 'animal') {
      // Tier spawnen
      const pos = getRandomGrassPosition();
      const animal = createAnimal(command.value, pos.x, pos.y);
      setGameState(prev => ({
        ...prev,
        animals: [...(prev.animals || []), animal],
      }));
      setTimeout(() => manualSave(), 0);
    } else if (command.type === 'tree_stage') {
      // Baum-Stufe setzen
      setGameState(prev => ({
        ...prev,
        treeStage: command.value,
      }));
      setTimeout(() => manualSave(), 0);
    } else if (command.type === 'show_list') {
      // Cheat-Liste anzeigen
      setShowCheatList(true);
    }
  }, [setGameState, manualSave]);

  // Lade-Bildschirm
  if (!gameState) {
    return (
      <div style={styles.loading}>
        <h2 style={{ color: '#fff' }}>Survival Island</h2>
        <p style={{ color: '#888' }}>Wird geladen...</p>
      </div>
    );
  }

  return (
    <div style={styles.gameContainer}>
      {/* Spielfeld */}
      {!gameState.gathering && (
        <GameCanvas
          gameState={gameState}
          onMapClick={handleMapClick}
          onMouseMove={placementMode ? handleMouseMove : null}
          placementGhost={placementGhost}
          canvasSize={canvasSize}
        />
      )}

      {/* Sammelreise-Bildschirm */}
      {gameState.gathering && (
        <GatheringScreen
          gathering={gameState.gathering}
          needs={gameState.needs}
          onPause={handlePauseGathering}
          onResume={handleResumeGathering}
          onCancel={handleFinishGathering}
          onAutoReturn={handleFinishGathering}
        />
      )}

      {/* UI-Overlay (nur auf Heimat-Map) */}
      {!gameState.gathering && (
        <>
          {/* Obere Leiste */}
          <div style={styles.topBar}>
            <div style={styles.topLeft}>
              <VacationButton
                vacation={gameState.vacation}
                onVacationChange={handleVacationChange}
              />
            </div>
            <div style={styles.topCenter}>
              <WeatherDisplay weather={gameState.weather} />
            </div>
            <div style={styles.topRight}>
              <NeedsBar needs={gameState.needs} />
            </div>
          </div>

          {/* Platzierungsmodus-Banner */}
          {placementMode && (
            <div style={styles.placementBanner}>
              {placementMode.type === 'tree_seed'
                ? 'Klicke auf eine freie Grasfläche, um den Samen zu pflanzen!'
                : 'Klicke auf eine freie Grasfläche, um das Gebäude zu platzieren!'}
              <button style={styles.placementCancelBtn} onClick={handleCancelPlacement}>
                Abbrechen [ESC]
              </button>
            </div>
          )}

          {/* Untere Leiste (nicht im Platzierungsmodus) */}
          {!placementMode && (
            <div style={styles.bottomBar}>
              <button
                style={styles.actionBtn}
                onClick={() => setShowInventory(true)}
              >
                <span style={styles.btnIcon}>🎒</span>
                <span style={styles.btnLabel}>Inventar</span>
                <span style={styles.btnHint}>[I]</span>
              </button>
              <button
                style={styles.actionBtn}
                onClick={() => setShowCrafting(true)}
              >
                <span style={styles.btnIcon}>🔨</span>
                <span style={styles.btnLabel}>Handwerk</span>
                <span style={styles.btnHint}>[C]</span>
              </button>
              <button
                style={{ ...styles.actionBtn, borderColor: 'rgba(230,126,34,0.4)' }}
                onClick={() => setShowCheats(true)}
              >
                <span style={styles.btnIcon}>🔧</span>
                <span style={styles.btnLabel}>Cheats</span>
              </button>
            </div>
          )}

          {/* Urlaub-Banner */}
          {gameState.vacation.isActive && (
            <div style={styles.vacationBanner}>
              🏖️ URLAUBSMODUS AKTIV - Alle Bedürfnisse pausiert
            </div>
          )}
        </>
      )}

      {/* Biom-Bestätigung */}
      {biomePrompt && (
        <BiomePrompt
          direction={biomePrompt}
          onConfirm={() => handleStartGathering(biomePrompt)}
          onCancel={() => setBiomePrompt(null)}
        />
      )}

      {/* Inventar */}
      {showInventory && (
        <InventoryPanel
          inventory={gameState.inventory}
          tools={gameState.tools}
          onConsume={(itemId) => { consumeItem(itemId); setTimeout(() => manualSave(), 0); }}
          onPlant={handleStartPlanting}
          onClose={() => setShowInventory(false)}
        />
      )}

      {/* Crafting */}
      {showCrafting && (
        <CraftingPanel
          gameState={gameState}
          onCraft={handleCraft}
          onClose={() => setShowCrafting(false)}
        />
      )}

      {/* Cheat-Konsole */}
      {showCheats && (
        <CheatConsole
          onAddItem={handleCheatAddItem}
          onCheatCommand={handleCheatCommand}
          onClose={() => setShowCheats(false)}
        />
      )}

      {/* Cheat-Liste (verschiebbar, bleibt offen) */}
      {showCheatList && (
        <CheatListDialog onClose={() => setShowCheatList(false)} />
      )}

      {/* Loot-Anzeige */}
      {showLoot && (
        <LootScreen
          lootData={showLoot}
          onClose={handleCloseLoot}
        />
      )}

      {/* Abriss-Dialog */}
      {demolishConfirm && (
        <DemolishDialog
          building={demolishConfirm}
          onConfirm={handleDemolish}
          onCancel={() => setDemolishConfirm(null)}
        />
      )}

      {/* Tier-Info-Dialog */}
      {animalInfo && (
        <AnimalInfoDialog
          animal={animalInfo}
          inventory={gameState.inventory}
          onFeed={handleFeedAnimal}
          onDismiss={handleDismissAnimal}
          onClose={() => setAnimalInfo(null)}
        />
      )}

      {/* Tod-Bildschirm */}
      {isDead && (
        <DeathScreen
          cause={deathCause}
          onRestart={handleDeath}
        />
      )}
    </div>
  );
}

const styles = {
  gameContainer: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0a0a1a',
  },
  loading: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a1a',
  },
  topBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '12px',
    pointerEvents: 'none',
    zIndex: 10,
  },
  topLeft: {
    pointerEvents: 'auto',
  },
  topCenter: {
    pointerEvents: 'auto',
  },
  topRight: {
    pointerEvents: 'auto',
  },
  bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    padding: '16px',
    pointerEvents: 'none',
    zIndex: 10,
  },
  actionBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '12px 24px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#fff',
    border: '2px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    cursor: 'pointer',
    pointerEvents: 'auto',
    minWidth: '90px',
  },
  btnIcon: {
    fontSize: '24px',
  },
  btnLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
  },
  btnHint: {
    fontSize: '10px',
    color: '#666',
  },
  placementBanner: {
    position: 'fixed',
    top: '60px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(52, 152, 219, 0.9)',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    zIndex: 15,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  placementCancelBtn: {
    padding: '6px 14px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  vacationBanner: {
    position: 'fixed',
    bottom: '90px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(46, 204, 113, 0.9)',
    color: '#fff',
    padding: '10px 24px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    zIndex: 10,
    textAlign: 'center',
  },
};
