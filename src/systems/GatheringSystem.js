// ============================================
// Sammelreisen-System
// ============================================

import { MAX_GATHERING_DURATION } from '../utils/constants';
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

// Neue Sammelreise starten
export function startGathering(biome, topicId = null, targetDuration = null) {
  return {
    biome,
    startTime: Date.now(),
    pausedAt: null,         // Zeitpunkt der Pause (null = läuft)
    totalPausedMs: 0,       // Gesamte Pausenzeit
    status: 'active',       // active | paused | returning
    topicId,                // Aktives Lernthema (null = keins)
    targetDuration,         // Gewählte Zieldauer in ms (null = MAX_GATHERING_DURATION)
  };
}

// Zieldauer einer Sammelreise ermitteln
export function getTargetDuration(gathering) {
  return gathering?.targetDuration || MAX_GATHERING_DURATION;
}

// Verstrichene aktive Sammelzeit berechnen
export function getElapsedGatheringTime(gathering) {
  if (!gathering) return 0;

  const maxDuration = getTargetDuration(gathering);
  const now = Date.now();
  let elapsed;

  if (gathering.pausedAt) {
    // Während Pause: Zeit bis Pausenbeginn
    elapsed = gathering.pausedAt - gathering.startTime - gathering.totalPausedMs;
  } else {
    // Während Aktivität: Zeit bis jetzt
    elapsed = now - gathering.startTime - gathering.totalPausedMs;
  }

  return Math.min(elapsed, maxDuration);
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

// Prüfen ob Sammelzeit erreicht (Zieldauer oder Maximum)
export function isGatheringComplete(gathering) {
  if (!gathering) return false;
  const maxDuration = getTargetDuration(gathering);
  return getElapsedGatheringTime(gathering) >= maxDuration;
}

// Zeit formatieren (ms → hh:mm:ss)
export function formatGatheringTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
