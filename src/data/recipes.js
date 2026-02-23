// ============================================
// Crafting-Rezepte
// ============================================
// Unterstand Lv.2-5: Kosten verdoppelt gegenüber Ursprung
// Lv.1 bleibt als Einstieg günstig

const recipes = [
  // --- Unterstand ---
  {
    id: 'shelter_1',
    name: 'Unterstand Lv.1',
    category: 'building',
    result: { type: 'shelter', level: 1 },
    ingredients: [
      { itemId: 'wood', amount: 5 },
      { itemId: 'stone', amount: 3 },
    ],
    requiresTool: null,
    description: 'Ein einfacher Unterstand aus Ästen und Steinen.',
  },
  {
    id: 'shelter_2',
    name: 'Unterstand Lv.2',
    category: 'building',
    result: { type: 'shelter', level: 2 },
    ingredients: [
      { itemId: 'wood', amount: 30 },
      { itemId: 'stone', amount: 16 },
      { itemId: 'vine', amount: 10 },
    ],
    requiresTool: null,
    requiresShelter: 1,
    description: 'Ein verbesserter Unterstand mit dichterem Dach.',
  },
  {
    id: 'shelter_3',
    name: 'Unterstand Lv.3',
    category: 'building',
    result: { type: 'shelter', level: 3 },
    ingredients: [
      { itemId: 'wood', amount: 60 },
      { itemId: 'stone', amount: 30 },
      { itemId: 'vine', amount: 20 },
      { itemId: 'clay', amount: 10 },
    ],
    requiresToolType: 'axe',
    requiresShelter: 2,
    description: 'Eine stabile Hütte mit Lehmwänden.',
  },
  {
    id: 'shelter_4',
    name: 'Unterstand Lv.4',
    category: 'building',
    result: { type: 'shelter', level: 4 },
    ingredients: [
      { itemId: 'wood', amount: 100 },
      { itemId: 'stone', amount: 50 },
      { itemId: 'clay', amount: 30 },
      { itemId: 'iron_ore', amount: 10 },
    ],
    requiresToolType: 'axe',
    requiresShelter: 3,
    description: 'Ein solides Haus mit Steinmauern.',
  },
  {
    id: 'shelter_5',
    name: 'Unterstand Lv.5',
    category: 'building',
    result: { type: 'shelter', level: 5 },
    ingredients: [
      { itemId: 'wood', amount: 160 },
      { itemId: 'stone', amount: 80 },
      { itemId: 'iron_ore', amount: 30 },
      { itemId: 'crystal', amount: 6 },
    ],
    requiresToolType: 'axe',
    requiresShelter: 4,
    description: 'Eine prächtige Behausung - das Beste der Insel.',
  },

  // --- Werkzeuge: Holz-Stufe (Einstieg, nur Holz + Lianen) ---
  {
    id: 'wood_axe',
    name: 'Holzaxt',
    category: 'tool',
    result: { type: 'tool', itemId: 'wood_axe' },
    ingredients: [
      { itemId: 'wood', amount: 3 },
      { itemId: 'vine', amount: 2 },
    ],
    requiresTool: null,
    description: 'Eine primitive Holzaxt. Hält 300 Min.',
  },
  {
    id: 'wood_fishing_rod',
    name: 'Holzangel',
    category: 'tool',
    result: { type: 'tool', itemId: 'wood_fishing_rod' },
    ingredients: [
      { itemId: 'wood', amount: 2 },
      { itemId: 'vine', amount: 3 },
    ],
    requiresTool: null,
    description: 'Eine einfache Angel aus Ästen. Hält 300 Min.',
  },
  {
    id: 'wood_pickaxe',
    name: 'Holzspitzhacke',
    category: 'tool',
    result: { type: 'tool', itemId: 'wood_pickaxe' },
    ingredients: [
      { itemId: 'wood', amount: 3 },
      { itemId: 'vine', amount: 2 },
    ],
    requiresTool: null,
    description: 'Eine schwache Spitzhacke. Hält 300 Min.',
  },

  // --- Werkzeuge: Stein-Stufe ---
  {
    id: 'stone_axe',
    name: 'Steinaxt',
    category: 'tool',
    result: { type: 'tool', itemId: 'stone_axe' },
    ingredients: [
      { itemId: 'wood', amount: 3 },
      { itemId: 'stone', amount: 2 },
      { itemId: 'vine', amount: 1 },
    ],
    requiresTool: null,
    description: 'Eine solide Steinaxt. Hält 1200 Min.',
  },
  {
    id: 'stone_fishing_rod',
    name: 'Angel',
    category: 'tool',
    result: { type: 'tool', itemId: 'stone_fishing_rod' },
    ingredients: [
      { itemId: 'wood', amount: 2 },
      { itemId: 'stone', amount: 2 },
      { itemId: 'vine', amount: 3 },
    ],
    requiresTool: null,
    description: 'Eine stabile Angel mit Steinhaken. Hält 1200 Min.',
  },
  {
    id: 'stone_pickaxe',
    name: 'Spitzhacke',
    category: 'tool',
    result: { type: 'tool', itemId: 'stone_pickaxe' },
    ingredients: [
      { itemId: 'wood', amount: 3 },
      { itemId: 'stone', amount: 5 },
      { itemId: 'vine', amount: 2 },
    ],
    requiresTool: null,
    description: 'Eine Spitzhacke für härtere Gesteine. Hält 1200 Min.',
  },

  // --- Werkzeuge: Kristall-Stufe ---
  {
    id: 'crystal_axe',
    name: 'Kristallaxt',
    category: 'tool',
    result: { type: 'tool', itemId: 'crystal_axe' },
    ingredients: [
      { itemId: 'wood', amount: 5 },
      { itemId: 'crystal', amount: 2 },
      { itemId: 'iron_ore', amount: 3 },
    ],
    requiresTool: null,
    description: 'Die beste Axt. Hält 2400 Min.',
  },
  {
    id: 'crystal_fishing_rod',
    name: 'Kristallangel',
    category: 'tool',
    result: { type: 'tool', itemId: 'crystal_fishing_rod' },
    ingredients: [
      { itemId: 'wood', amount: 3 },
      { itemId: 'crystal', amount: 2 },
      { itemId: 'vine', amount: 3 },
    ],
    requiresTool: null,
    description: 'Die beste Angel. Hält 2400 Min.',
  },
  {
    id: 'crystal_pickaxe',
    name: 'Kristallspitzhacke',
    category: 'tool',
    result: { type: 'tool', itemId: 'crystal_pickaxe' },
    ingredients: [
      { itemId: 'wood', amount: 5 },
      { itemId: 'crystal', amount: 3 },
      { itemId: 'iron_ore', amount: 5 },
    ],
    requiresTool: null,
    description: 'Die beste Spitzhacke. Hält 2400 Min.',
  },

  // --- Lagerfeuer ---
  {
    id: 'campfire',
    name: 'Lagerfeuer',
    category: 'building',
    result: { type: 'campfire' },
    ingredients: [
      { itemId: 'wood', amount: 2 },
      { itemId: 'stone', amount: 2 },
    ],
    requiresTool: null,
    description: 'Ein Lagerfeuer zum Kochen von Nahrung.',
  },

  // --- Gekochte Nahrung ---
  {
    id: 'cooked_berry',
    name: 'Gekochte Beeren',
    category: 'food',
    result: { type: 'food', itemId: 'cooked_berry' },
    ingredients: [
      { itemId: 'berry', amount: 1 },
    ],
    requiresBuilding: 'campfire',
    description: 'Warme Beeren - doppelt so nahrhaft.',
  },
  {
    id: 'cooked_fish',
    name: 'Gebratener Fisch',
    category: 'food',
    result: { type: 'food', itemId: 'cooked_fish' },
    ingredients: [
      { itemId: 'fish', amount: 1 },
    ],
    requiresBuilding: 'campfire',
    description: 'Ein gebratener Fisch - sehr sättigend.',
  },
  {
    id: 'cooked_mushroom',
    name: 'Gebratene Pilze',
    category: 'food',
    result: { type: 'food', itemId: 'cooked_mushroom' },
    ingredients: [
      { itemId: 'mushroom', amount: 1 },
    ],
    requiresBuilding: 'campfire',
    description: 'Gebratene Pilze - lecker und nahrhaft.',
  },
  {
    id: 'fruit_salad',
    name: 'Obstsalat',
    category: 'food',
    result: { type: 'food', itemId: 'fruit_salad' },
    ingredients: [
      { itemId: 'berry', amount: 2 },
      { itemId: 'coconut', amount: 1 },
    ],
    requiresBuilding: 'campfire',
    description: 'Ein erfrischender Obstsalat.',
  },

  // --- Wasser abkochen ---
  {
    id: 'boiled_water',
    name: 'Wasser abkochen',
    category: 'food',
    result: { type: 'food', itemId: 'fresh_water' },
    ingredients: [
      { itemId: 'dirty_water', amount: 1 },
    ],
    requiresBuilding: 'campfire',
    description: 'Schmutziges Wasser am Feuer abkochen.',
  },

  // --- Wasserversorgung ---
  {
    id: 'water_collector',
    name: 'Regenfänger',
    category: 'building',
    result: { type: 'water_collector' },
    ingredients: [
      { itemId: 'wood', amount: 8 },
      { itemId: 'vine', amount: 4 },
      { itemId: 'clay', amount: 3 },
    ],
    requiresTool: null,
    description: 'Sammelt Regenwasser. Liefert bei Regen automatisch Wasser.',
  },
];

export default recipes;
