// ============================================
// Spielkonstanten - Zentrale Konfiguration
// ============================================

// --- Kachel- und Kartengröße ---
export const TILE_SIZE = 64;
export const MAP_COLS = 20;
export const MAP_ROWS = 15;
export const MAP_WIDTH = MAP_COLS * TILE_SIZE;
export const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;

// --- Spieler ---
export const PLAYER_SIZE = 40;
export const PLAYER_SPEED = 3;

// --- Bedürfnisse (Zeiten in Millisekunden) ---
export const HUNGER_DRAIN_TIME = 72 * 60 * 60 * 1000;   // 3 Tage bis 0%
export const THIRST_DRAIN_TIME = 48 * 60 * 60 * 1000;   // 2 Tage bis 0%
export const MOOD_DRAIN_TIME = 48 * 60 * 60 * 1000;     // 2 Tage bis 0%

// Bedürfnis-Abnahme pro Sekunde (Prozentpunkte)
export const HUNGER_DRAIN_PER_SEC = 100 / (HUNGER_DRAIN_TIME / 1000);
export const THIRST_DRAIN_PER_SEC = 100 / (THIRST_DRAIN_TIME / 1000);
export const MOOD_DRAIN_PER_SEC = 100 / (MOOD_DRAIN_TIME / 1000);

// --- Stimmung durch Sammeln ---
export const MOOD_GAIN_PER_HOUR = 30; // +30 Stimmung pro Stunde sammeln (120 Min = 60)

// --- Wetter ---
export const WEATHER_TYPES = {
  SUNNY: 'sunny',
  RAINY: 'rainy',
};

// Stimmungs-Malus je Unterstand-Level (Index = Level)
// Format: { rain: Multiplikator, sun: Multiplikator }
export const SHELTER_MOOD_MODIFIERS = [
  { rain: 1.25, sun: 1.25 },  // Kein Unterstand
  { rain: 1.10, sun: 1.10 },  // Level 1
  { rain: 1.08, sun: 1.08 },  // Level 2
  { rain: 1.06, sun: 1.06 },  // Level 3
  { rain: 1.04, sun: 1.04 },  // Level 4
  { rain: 1.02, sun: 1.02 },  // Level 5
];

// --- Sammelreisen ---
export const MAX_GATHERING_DURATION = 2 * 60 * 60 * 1000; // 2 Stunden max

// Einstellbare Reisedauer-Optionen (15-Minuten-Schritte)
export const GATHERING_DURATION_OPTIONS = [
  { label: '15 Min', value: 15 * 60 * 1000 },
  { label: '30 Min', value: 30 * 60 * 1000 },
  { label: '45 Min', value: 45 * 60 * 1000 },
  { label: '1 Std',  value: 60 * 60 * 1000 },
  { label: '1:15',   value: 75 * 60 * 1000 },
  { label: '1:30',   value: 90 * 60 * 1000 },
  { label: '1:45',   value: 105 * 60 * 1000 },
  { label: '2 Std',  value: 120 * 60 * 1000 },
];

// Biome je Himmelsrichtung
export const BIOMES = {
  NORTH: { name: 'Wald', direction: 'north' },
  SOUTH: { name: 'See', direction: 'south' },
  WEST: { name: 'Felder', direction: 'west' },
  EAST: { name: 'Klippen', direction: 'east' },
};

// --- Regenfänger ---
export const WATER_COLLECTOR_DURATION = 2 * 24 * 60 * 60 * 1000; // 2 Tage Tank-Dauer

// --- Nahrung ---
export const FOOD_SPOIL_TIME = 7 * 24 * 60 * 60 * 1000; // 7 Tage Echtzeit
export const RAW_FOOD_EFFICIENCY = 0.5;
export const COOKED_FOOD_EFFICIENCY = 1.0;

// --- Urlaub ---
export const VACATION_DAYS_PER_YEAR = 30;
export const VACATION_HOURS_PER_YEAR = VACATION_DAYS_PER_YEAR * 24;

// --- Speicherung ---
export const SAVE_INTERVAL = 2 * 1000; // Alle 2 Sekunden
export const STORAGE_KEY = 'survival-island-save';

// --- Kacheltypen ---
export const TILE_TYPES = {
  GRASS: 0,
  WATER: 1,
  SAND: 2,
  ROCK: 3,
  TREE: 4,
  BUSH: 5,
  SHELTER: 6,
  CAMPFIRE: 7,
  STORAGE: 8,
};

// Kollisions-Kacheln (blockieren Bewegung)
export const COLLISION_TILES = [
  TILE_TYPES.WATER,
  TILE_TYPES.ROCK,
  TILE_TYPES.TREE,
];

// --- Farben für Platzhalter-Grafiken ---
export const TILE_COLORS = {
  [TILE_TYPES.GRASS]: '#4a8c3f',
  [TILE_TYPES.WATER]: '#3a7bd5',
  [TILE_TYPES.SAND]: '#e8d68c',
  [TILE_TYPES.ROCK]: '#808080',
  [TILE_TYPES.TREE]: '#2d5a1e',
  [TILE_TYPES.BUSH]: '#5a9a3f',
  [TILE_TYPES.SHELTER]: '#8B7355',
  [TILE_TYPES.CAMPFIRE]: '#cc5500',
  [TILE_TYPES.STORAGE]: '#A0522D',
};

export const PLAYER_COLOR = '#e74c3c';
export const PLAYER_OUTLINE_COLOR = '#c0392b';
