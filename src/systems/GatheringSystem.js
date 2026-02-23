// ============================================
// Sammelreisen-System (Stoppuhr-Modus)
// ============================================

import { calculateLoot } from '../data/lootTables';
import { calculateMoodFromGathering } from './NeedsSystem';
import { getActiveToolTypes } from './ToolSystem';

// Biom → Werkzeug-Typ Zuordnung (für Haltbarkeits-Abzug)
const BIOME_TOOL_MAP = {
  north: ['axe'],
  south: ['fishing_rod'],
  west:  [],
  east:  ['pickaxe'],
};

// Neue Sammelreise starten (kein Zeitlimit – Stoppuhr-Modus)
export function startGathering(biome, topicId = null) {
  return {
    biome,
    startTime: Date.now(),
    pausedAt: null,         // Zeitpunkt der Pause (null = läuft)
    totalPausedMs: 0,       // Gesamte Pausenzeit
    status: 'active',       // active | paused | returning
    topicId,                // Aktives Lernthema (null = keins)
  };
}

// Verstrichene aktive Sammelzeit berechnen (kein Cap mehr)
export function getElapsedGatheringTime(gathering) {
  if (!gathering) return 0;

  if (gathering.pausedAt) {
    // Während Pause: Zeit bis Pausenbeginn
    return gathering.pausedAt - gathering.startTime - gathering.totalPausedMs;
  } else {
    // Während Aktivität: Zeit bis jetzt
    return Date.now() - gathering.startTime - gathering.totalPausedMs;
  }
}

// Sammelreise pausieren
export function pauseGathering(gathering) {
  if (!gathering || gathering.pausedAt) return gathering;

  return {
    ...gathering,
    pausedAt: Date.now(),
    status: 'paused',
  };
}

// Sammelreise fortsetzen
export function resumeGathering(gathering) {
  if (!gathering || !gathering.pausedAt) return gathering;

  const pausedDuration = Date.now() - gathering.pausedAt;

  return {
    ...gathering,
    pausedAt: null,
    totalPausedMs: gathering.totalPausedMs + pausedDuration,
    status: 'active',
  };
}

// Sammelreise abschließen (Rückkehr)
export function finishGathering(gathering, tools = []) {
  if (!gathering) return { items: [], moodGain: 0 };

  const elapsed = getElapsedGatheringTime(gathering);
  const items = calculateLoot(gathering.biome, elapsed, tools);
  const moodGain = calculateMoodFromGathering(elapsed);

  // Welche Tool-Typen wurden in diesem Biom benutzt?
  const biomeToolTypes = BIOME_TOOL_MAP[gathering.biome] || [];
  const activeTypes = getActiveToolTypes(tools);
  // Nur Tool-Typen, die sowohl aktiv als auch im Biom relevant sind
  const usedToolTypes = biomeToolTypes.filter(t => activeTypes.includes(t));

  return {
    items,
    moodGain,
    duration: elapsed,
    biome: gathering.biome,
    topicId: gathering.topicId,
    usedToolTypes, // Für Haltbarkeits-Abzug
  };
}

// Zeit formatieren (ms → hh:mm:ss)
export function formatGatheringTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
