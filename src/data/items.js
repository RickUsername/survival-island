// ============================================
// Item-Definitionen
// ============================================

const items = {
  // --- Grundressourcen ---
  wood: {
    id: 'wood',
    name: 'Holz',
    category: 'resource',
    color: '#8B6914',
    description: 'Ein Stück Holz. Vielseitig einsetzbar.',
  },
  stone: {
    id: 'stone',
    name: 'Stein',
    category: 'resource',
    color: '#808080',
    description: 'Ein runder Stein.',
  },
  vine: {
    id: 'vine',
    name: 'Liane',
    category: 'resource',
    color: '#228B22',
    description: 'Eine biegsame Liane. Gut zum Binden.',
  },
  clay: {
    id: 'clay',
    name: 'Lehm',
    category: 'resource',
    color: '#CD853F',
    description: 'Feuchter Lehm. Formbar und nützlich.',
  },
  iron_ore: {
    id: 'iron_ore',
    name: 'Eisenerz',
    category: 'resource',
    color: '#A0522D',
    description: 'Dunkles Erz mit metallischem Glanz.',
    rarity: 'uncommon',
  },
  crystal: {
    id: 'crystal',
    name: 'Kristall',
    category: 'resource',
    color: '#E0E0FF',
    description: 'Ein seltener, schimmernder Kristall.',
    rarity: 'rare',
  },

  // --- Obst (Tierfutter + Spielernahrung) ---
  fruit: {
    id: 'fruit',
    name: 'Obst',
    category: 'food',
    isRaw: true,
    hungerValue: 5, // roh: 2.5, gekocht: 5
    color: '#FF8C00',
    description: 'Frisches Obst vom Baum. Tiere lieben es!',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
    fruitValue: 1, // Futterwert für Tiere: 1 Obst
  },

  // --- Nahrung (roh) ---
  berry: {
    id: 'berry',
    name: 'Beere',
    category: 'food',
    isRaw: true,
    hungerValue: 3, // roh: 50% = 1.5, gekocht: 3
    color: '#DC143C',
    description: 'Rote Beeren. Essbar, aber besser gekocht.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
    fruitValue: 0.5, // Futterwert für Tiere: halbes Obst
  },
  mushroom: {
    id: 'mushroom',
    name: 'Pilz',
    category: 'food',
    isRaw: true,
    hungerValue: 4, // roh: 2, gekocht: 4
    color: '#DEB887',
    description: 'Ein essbarer Pilz.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
  },
  coconut: {
    id: 'coconut',
    name: 'Kokosnuss',
    category: 'food',
    isRaw: true,
    hungerValue: 6, // roh: 3, gekocht: 6
    thirstValue: 3,
    color: '#8B4513',
    description: 'Kokosnuss - stillt Hunger und etwas Durst.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
  },
  fish: {
    id: 'fish',
    name: 'Fisch',
    category: 'food',
    isRaw: true,
    hungerValue: 10, // roh: 5, gekocht: 10
    color: '#4682B4',
    description: 'Ein frischer Fisch aus dem See.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
  },
  seaweed: {
    id: 'seaweed',
    name: 'Seetang',
    category: 'food',
    isRaw: true,
    hungerValue: 2, // roh: 1, gekocht: n/a
    thirstValue: 1,
    color: '#2E8B57',
    description: 'Salziger Seetang.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
  },

  // --- Nahrung (gekocht) ---
  cooked_berry: {
    id: 'cooked_berry',
    name: 'Gekochte Beeren',
    category: 'food',
    isRaw: false,
    hungerValue: 3,
    color: '#B22222',
    description: 'Warm und lecker. Doppelt so nahrhaft wie roh.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
  },
  cooked_fish: {
    id: 'cooked_fish',
    name: 'Gebratener Fisch',
    category: 'food',
    isRaw: false,
    hungerValue: 10,
    color: '#DAA520',
    description: 'Ein gebratener Fisch. Sehr sättigend.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
  },
  cooked_mushroom: {
    id: 'cooked_mushroom',
    name: 'Gebratene Pilze',
    category: 'food',
    isRaw: false,
    hungerValue: 4,
    color: '#D2691E',
    description: 'Gebratene Pilze mit herrlichem Aroma.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
  },
  fruit_salad: {
    id: 'fruit_salad',
    name: 'Obstsalat',
    category: 'food',
    isRaw: false,
    hungerValue: 7,
    thirstValue: 2,
    color: '#FF6347',
    description: 'Erfrischend und nahrhaft.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
  },

  // --- Wasser ---
  dirty_water: {
    id: 'dirty_water',
    name: 'Schmutziges Wasser',
    category: 'resource',
    color: '#6B8E6B',
    description: 'Trübes Wasser. Muss am Feuer abgekocht werden.',
  },
  fresh_water: {
    id: 'fresh_water',
    name: 'Frischwasser',
    category: 'water',
    thirstValue: 15,
    color: '#87CEEB',
    description: 'Sauberes Trinkwasser.',
  },

  // --- Werkzeuge ---
  // Äxte (3 Stufen)
  wood_axe: {
    id: 'wood_axe',
    name: 'Holzaxt',
    category: 'tool',
    toolType: 'axe',
    tier: 'wood',
    durability: 300, // 300 Minuten
    color: '#A0712B',
    description: 'Eine primitive Holzaxt. Bricht schnell.',
  },
  stone_axe: {
    id: 'stone_axe',
    name: 'Steinaxt',
    category: 'tool',
    toolType: 'axe',
    tier: 'stone',
    durability: 1200, // 1200 Minuten
    color: '#696969',
    description: 'Eine solide Steinaxt zum Holzfällen.',
  },
  crystal_axe: {
    id: 'crystal_axe',
    name: 'Kristallaxt',
    category: 'tool',
    toolType: 'axe',
    tier: 'crystal',
    durability: 2400, // 2400 Minuten
    color: '#B0C4FF',
    description: 'Eine mächtige Kristallaxt. Extrem haltbar.',
  },

  // Angeln (3 Stufen)
  wood_fishing_rod: {
    id: 'wood_fishing_rod',
    name: 'Holzangel',
    category: 'tool',
    toolType: 'fishing_rod',
    tier: 'wood',
    durability: 300,
    color: '#A0822B',
    description: 'Eine provisorische Angel aus Ästen.',
  },
  stone_fishing_rod: {
    id: 'stone_fishing_rod',
    name: 'Angel',
    category: 'tool',
    toolType: 'fishing_rod',
    tier: 'stone',
    durability: 1200,
    color: '#8B7355',
    description: 'Eine stabile Angel mit Steinhaken.',
  },
  crystal_fishing_rod: {
    id: 'crystal_fishing_rod',
    name: 'Kristallangel',
    category: 'tool',
    toolType: 'fishing_rod',
    tier: 'crystal',
    durability: 2400,
    color: '#87CEFF',
    description: 'Eine prächtige Kristallangel. Fängt mehr Fische.',
  },

  // Spitzhacken (3 Stufen)
  wood_pickaxe: {
    id: 'wood_pickaxe',
    name: 'Holzspitzhacke',
    category: 'tool',
    toolType: 'pickaxe',
    tier: 'wood',
    durability: 300,
    color: '#8B6B3F',
    description: 'Eine schwache Spitzhacke aus Holz.',
  },
  stone_pickaxe: {
    id: 'stone_pickaxe',
    name: 'Spitzhacke',
    category: 'tool',
    toolType: 'pickaxe',
    tier: 'stone',
    durability: 1200,
    color: '#5F5F5F',
    description: 'Eine Spitzhacke für härtere Gesteine.',
  },
  crystal_pickaxe: {
    id: 'crystal_pickaxe',
    name: 'Kristallspitzhacke',
    category: 'tool',
    toolType: 'pickaxe',
    tier: 'crystal',
    durability: 2400,
    color: '#C0D0FF',
    description: 'Die beste Spitzhacke. Extrem langlebig.',
  },

  // --- Materialien ---
  hay: {
    id: 'hay',
    name: 'Heu',
    category: 'resource',
    color: '#D4A843',
    description: 'Getrocknetes Gras. Nützlich als Tierfutter oder Material.',
    fruitValue: 0.3, // Futterwert für Tiere: 30% eines Obstes
  },

  // --- Samen ---
  tree_seed: {
    id: 'tree_seed',
    name: 'Baumsamen',
    category: 'special',
    color: '#6B4226',
    description: 'Ein Samen vom Baum. Kann eingepflanzt werden.',
    plantable: true,
  },

  // --- Mysteriöses Ei (Katzen-System) ---
  mysterious_egg: {
    id: 'mysterious_egg',
    name: 'Mysteriöses Ei',
    category: 'special',
    color: '#E8D5B7',
    description: 'Ein seltsames, warmes Ei. Etwas bewegt sich darin...',
  },
};

export default items;
