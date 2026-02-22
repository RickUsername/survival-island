// ============================================
// Achievement-System - Errungenschaften
// ============================================

export const ACHIEVEMENTS = [
  {
    id: 'erste_schritte',
    name: 'Erste Schritte',
    description: 'Erste Sammelreise abgeschlossen',
    emoji: '👣',
    check: (gs) => gs.stats.totalGatheringTrips >= 1,
  },
  {
    id: 'entdecker',
    name: 'Entdecker',
    description: 'Alle 4 Biome besucht',
    emoji: '🧭',
    check: (gs) => {
      const bv = gs.biomeVisits || {};
      return ['north', 'south', 'east', 'west'].every(b => (bv[b] || 0) >= 1);
    },
  },
  {
    id: 'fleissig',
    name: 'Fleißig',
    description: '10 Stunden Lernzeit im Tagebuch',
    emoji: '📚',
    check: (gs) => {
      const total = (gs.diary?.topics || []).reduce((s, t) => s + t.totalTimeMs, 0);
      return total >= 10 * 60 * 60 * 1000;
    },
  },
  {
    id: 'buecherwurm',
    name: 'Bücherwurm',
    description: '50 Stunden Lernzeit im Tagebuch',
    emoji: '🐛',
    check: (gs) => {
      const total = (gs.diary?.topics || []).reduce((s, t) => s + t.totalTimeMs, 0);
      return total >= 50 * 60 * 60 * 1000;
    },
  },
  {
    id: 'handwerker',
    name: 'Handwerker',
    description: 'Erstes Werkzeug hergestellt',
    emoji: '🔨',
    check: (gs) => (gs.tools || []).length >= 1,
  },
  {
    id: 'meisterschmied',
    name: 'Meisterschmied',
    description: 'Ein Kristall-Werkzeug hergestellt',
    emoji: '💎',
    check: (gs) => (gs.tools || []).some(t => t.tier === 'crystal'),
  },
  {
    id: 'baumeister',
    name: 'Baumeister',
    description: 'Unterstand auf Stufe 5 ausgebaut',
    emoji: '🏠',
    check: (gs) => gs.buildings?.shelterLevel >= 5,
  },
  {
    id: 'koch',
    name: 'Koch',
    description: 'Erstes Gericht am Lagerfeuer zubereitet',
    emoji: '🍳',
    check: (gs) => gs.stats?.hasCookedMeal === true,
  },
  {
    id: 'tierfreund',
    name: 'Tierfreund',
    description: 'Erstes Tier auf der Insel',
    emoji: '🐾',
    check: (gs) => (gs.animals || []).length >= 1,
  },
  {
    id: 'arche_noah',
    name: 'Arche Noah',
    description: 'Alle 4 Tierarten auf der Insel',
    emoji: '🚢',
    check: (gs) => {
      const types = new Set((gs.animals || []).map(a => a.type));
      return ['heron', 'goat', 'deer', 'rabbit'].every(t => types.has(t));
    },
  },
  {
    id: 'sammler',
    name: 'Sammler',
    description: '100 Gegenstände insgesamt gesammelt',
    emoji: '🎒',
    check: (gs) => gs.stats.totalItemsCollected >= 100,
  },
  {
    id: 'hoarder',
    name: 'Hoarder',
    description: '500 Gegenstände insgesamt gesammelt',
    emoji: '🏦',
    check: (gs) => gs.stats.totalItemsCollected >= 500,
  },
  {
    id: 'ueberlebenskuenstler',
    name: 'Überlebenskünstler',
    description: '7 Tage überlebt',
    emoji: '⭐',
    check: (gs) => gs.stats.daysAlive >= 7,
  },
  {
    id: 'alter_hase',
    name: 'Alter Hase',
    description: '30 Tage überlebt',
    emoji: '🏆',
    check: (gs) => gs.stats.daysAlive >= 30,
  },
  {
    id: 'fischer',
    name: 'Fischer',
    description: 'Fisch gefangen',
    emoji: '🐟',
    check: (gs) => {
      const inv = gs.inventory || {};
      return !!(inv.fish || inv.cooked_fish);
    },
  },
  {
    id: 'gaertner',
    name: 'Gärtner',
    description: 'Einen Baum aus einem Samen gepflanzt',
    emoji: '🌱',
    check: (gs) => (gs.plantedTrees || []).length >= 1,
  },
  {
    id: 'holzfaeller',
    name: 'Holzfäller',
    description: 'Den Hauptbaum gefällt',
    emoji: '🪓',
    check: (gs) => gs.stats?.hasMainTreeFelled === true,
  },
  {
    id: 'kristallsucher',
    name: 'Kristallsucher',
    description: 'Einen Kristall gesammelt',
    emoji: '✨',
    check: (gs) => {
      const inv = gs.inventory || {};
      return !!(inv.crystal && inv.crystal.amount > 0);
    },
  },
  {
    id: 'regensammler',
    name: 'Regensammler',
    description: 'Einen Regenfänger gebaut',
    emoji: '🌧️',
    check: (gs) => gs.buildings?.hasWaterCollector === true,
  },
];

// Prüft alle Achievements und gibt neu freigeschaltete IDs zurück
export function checkAchievements(gameState) {
  const unlockedIds = gameState.achievements?.unlockedIds || [];
  const newlyUnlocked = [];

  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.includes(achievement.id)) continue;
    try {
      if (achievement.check(gameState)) {
        newlyUnlocked.push(achievement.id);
      }
    } catch (e) {
      // Fehlerhafte Checks überspringen
    }
  }

  return newlyUnlocked;
}

// Wendet neu freigeschaltete Achievements auf den State an
export function applyAchievements(gameState, newIds) {
  if (newIds.length === 0) return gameState;

  return {
    ...gameState,
    achievements: {
      ...gameState.achievements,
      unlockedIds: [
        ...(gameState.achievements?.unlockedIds || []),
        ...newIds,
      ],
      lastUnlocked: newIds[newIds.length - 1],
      lastUnlockedAt: Date.now(),
    },
  };
}

// Achievement-Definition per ID abrufen
export function getAchievementById(id) {
  return ACHIEVEMENTS.find(a => a.id === id);
}
