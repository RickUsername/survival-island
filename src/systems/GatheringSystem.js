// ============================================
// Sammelreisen-System (Timer + Stoppuhr-Modus)
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
// targetDuration: ms für Timer-Modus, null für Stoppuhr-Modus (endlos)
export function startGathering(biome, topicId = null, targetDuration = undefined) {
  return {
    biome,
    startTime: Date.now(),
    pausedAt: null,         // Zeitpunkt der Pause (null = läuft)
    totalPausedMs: 0,       // Gesamte Pausenzeit
    status: 'active',       // active | paused | returning
    topicId,                // Aktives Lernthema (null = keins)
    targetDuration: targetDuration === undefined ? MAX_GATHERING_DURATION : targetDuration,
  };
}

// Zieldauer einer Sammelreise ermitteln (null = Stoppuhr/endlos)
export function getTargetDuration(gathering) {
  return gathering?.targetDuration;
}

// Ist dies eine Stoppuhr-Reise (kein Zeitlimit)?
export function isStopwatchMode(gathering) {
  return gathering?.targetDuration === null || gathering?.targetDuration === undefined;
}

// Verstrichene aktive Sammelzeit berechnen
export function getElapsedGatheringTime(gathering) {
  if (!gathering) return 0;

  const maxDuration = getTargetDuration(gathering);
  let elapsed;

  if (gathering.pausedAt) {
    // Während Pause: Zeit bis Pausenbeginn
    elapsed = gathering.pausedAt - gathering.startTime - gathering.totalPausedMs;
  } else {
    // Während Aktivität: Zeit bis jetzt
    elapsed = Date.now() - gathering.startTime - gathering.totalPausedMs;
  }

  // Im Stoppuhr-Modus kein Cap, im Timer-Modus auf Zieldauer begrenzen
  if (maxDuration != null) {
    return Math.min(elapsed, maxDuration);
  }
  return elapsed;
}

// Verbleibende Zeit berechnen (nur für Timer-Modus)
export function getRemainingGatheringTime(gathering) {
  if (!gathering || isStopwatchMode(gathering)) return null;
  const target = getTargetDuration(gathering);
  const elapsed = getElapsedGatheringTime(gathering);
  return Math.max(0, target - elapsed);
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

// Prüfen ob Sammelzeit erreicht (nur für Timer-Modus)
export function isGatheringComplete(gathering) {
  if (!gathering) return false;
  // Stoppuhr-Modus endet nie automatisch
  if (isStopwatchMode(gathering)) return false;
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
