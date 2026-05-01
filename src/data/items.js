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
    hungerValue: 15, // roh: 7.5, gekocht: 15
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
    hungerValue: 9, // roh: 50% = 4.5, gekocht: 9
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
    hungerValue: 12, // roh: 6, gekocht: 12
    color: '#DEB887',
    description: 'Ein essbarer Pilz.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
  },
  coconut: {
    id: 'coconut',
    name: 'Kokosnuss',
    category: 'food',
    isRaw: true,
    hungerValue: 18, // roh: 9, gekocht: 18
    thirstValue: 9,
    color: '#8B4513',
    description: 'Kokosnuss - stillt Hunger und etwas Durst.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
  },
  fish: {
    id: 'fish',
    name: 'Fisch',
    category: 'food',
    isRaw: true,
    hungerValue: 30, // roh: 15, gekocht: 30
    color: '#4682B4',
    description: 'Ein frischer Fisch aus dem See.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
  },
  seaweed: {
    id: 'seaweed',
    name: 'Seetang',
    category: 'food',
    isRaw: true,
    hungerValue: 6, // roh: 3, gekocht: n/a
    thirstValue: 3,
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
    hungerValue: 9,
    color: '#B22222',
    description: 'Warm und lecker. Doppelt so nahrhaft wie roh.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
  },
  cooked_fish: {
    id: 'cooked_fish',
    name: 'Gebratener Fisch',
    category: 'food',
    isRaw: false,
    hungerValue: 30,
    color: '#DAA520',
    description: 'Ein gebratener Fisch. Sehr sättigend.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
  },
  cooked_mushroom: {
    id: 'cooked_mushroom',
    name: 'Gebratene Pilze',
    category: 'food',
    isRaw: false,
    hungerValue: 12,
    color: '#D2691E',
    description: 'Gebratene Pilze mit herrlichem Aroma.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
  },
  fruit_salad: {
    id: 'fruit_salad',
    name: 'Obstsalat',
    category: 'food',
    isRaw: false,
    hungerValue: 21,
    thirstValue: 6,
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
    thirstValue: 45,
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

  // --- Blumensamen (8 Sorten — kaufbar im Shop) ---
  // flowerType: Schlüssel für Render-Logik in GameCanvas + FLOWER_TYPES
  sunflower_seed: {
    id: 'sunflower_seed',
    name: 'Sonnenblumensamen',
    category: 'special',
    color: '#F5C033',
    description: 'Wächst zu einer hohen Sonnenblume — so groß wie eine Person.',
    plantable: true,
    flowerSeed: true,
    flowerType: 'sunflower',
  },
  rose_seed: {
    id: 'rose_seed',
    name: 'Rosensamen',
    category: 'special',
    color: '#C92B4D',
    description: 'Eine duftende rote Rose, halb so hoch wie eine Person.',
    plantable: true,
    flowerSeed: true,
    flowerType: 'rose',
  },
  tulip_seed: {
    id: 'tulip_seed',
    name: 'Tulpensamen',
    category: 'special',
    color: '#E8546C',
    description: 'Bunte Tulpen, halb so hoch wie eine Person.',
    plantable: true,
    flowerSeed: true,
    flowerType: 'tulip',
  },
  daisy_seed: {
    id: 'daisy_seed',
    name: 'Margeritensamen',
    category: 'special',
    color: '#FFFFFF',
    description: 'Weiße Margeriten, halb so hoch wie eine Person.',
    plantable: true,
    flowerSeed: true,
    flowerType: 'daisy',
  },
  lavender_seed: {
    id: 'lavender_seed',
    name: 'Lavendelsamen',
    category: 'special',
    color: '#9b6dd6',
    description: 'Lila Lavendelblüten, halb so hoch wie eine Person.',
    plantable: true,
    flowerSeed: true,
    flowerType: 'lavender',
  },
  poppy_seed: {
    id: 'poppy_seed',
    name: 'Mohnsamen',
    category: 'special',
    color: '#E03030',
    description: 'Leuchtend rote Mohnblumen, halb so hoch wie eine Person.',
    plantable: true,
    flowerSeed: true,
    flowerType: 'poppy',
  },
  marigold_seed: {
    id: 'marigold_seed',
    name: 'Ringelblumensamen',
    category: 'special',
    color: '#F58220',
    description: 'Orange Ringelblumen, halb so hoch wie eine Person.',
    plantable: true,
    flowerSeed: true,
    flowerType: 'marigold',
  },
  lily_seed: {
    id: 'lily_seed',
    name: 'Liliensamen',
    category: 'special',
    color: '#FFE680',
    description: 'Elegante Lilien, halb so hoch wie eine Person.',
    plantable: true,
    flowerSeed: true,
    flowerType: 'lily',
  },

  // --- Brille (verdoppelt Sammelfunde) ---
  goggles: {
    id: 'goggles',
    name: 'Späherbrille',
    category: 'tool',
    toolType: 'goggles',
    tier: 'crystal',
    durability: null, // Keine ablaufende Lebensdauer
    color: '#7AC0E8',
    description: 'Verdoppelt jedes Item, das auf einer Sammelreise gefunden wird. Hält ewig.',
  },

  // --- Hühner-Eier (essbar) ---
  chicken_egg: {
    id: 'chicken_egg',
    name: 'Hühnerei',
    category: 'food',
    isRaw: true,
    hungerValue: 8, // roh: 4, gekocht: voller Balken
    color: '#F8E9C0',
    description: 'Ein frisches Hühnerei. Kann gekocht werden — gekocht füllt es den Hunger komplett auf.',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
  },
  cooked_egg: {
    id: 'cooked_egg',
    name: 'Gekochtes Ei',
    category: 'food',
    isRaw: false,
    hungerValue: 100, // füllt den Hungerbalken komplett auf
    color: '#FFF1B0',
    description: 'Ein gekochtes Ei. Füllt den Hungerbalken komplett auf!',
    spoilTime: 7 * 24 * 60 * 60 * 1000,
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
