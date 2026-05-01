// ============================================
// Blumen-System - Pflanzen, Wachsen, Blühen
// ============================================
// Blumen wachsen 5 echte Tage und stehen dann in voller Blüte.
// Sonnenblumen ragen so hoch wie eine Person, alle anderen halb so hoch.

export const FLOWER_GROWTH_DURATION = 5 * 24 * 60 * 60 * 1000; // 5 Tage in ms

// Blumendefinitionen — Höhe relativ zum Spieler (1.0 = volle Spielergröße)
export const FLOWER_TYPES = {
  sunflower: {
    name: 'Sonnenblume',
    petalColor: '#F5C033',
    petalEdge: '#D49018',
    centerColor: '#5C3A1E',
    stemColor: '#3a8a2e',
    heightRatio: 1.0, // so hoch wie die Person
    petalCount: 18,
  },
  rose: {
    name: 'Rose',
    petalColor: '#C92B4D',
    petalEdge: '#7A1530',
    centerColor: '#7A1530',
    stemColor: '#2d6a1e',
    heightRatio: 0.5,
    petalCount: 10,
  },
  tulip: {
    name: 'Tulpe',
    petalColor: '#E8546C',
    petalEdge: '#A82E48',
    centerColor: '#FFE680',
    stemColor: '#3a8a2e',
    heightRatio: 0.5,
    petalCount: 5,
  },
  daisy: {
    name: 'Margerite',
    petalColor: '#FFFFFF',
    petalEdge: '#E0E0E0',
    centerColor: '#F0C020',
    stemColor: '#3a8a2e',
    heightRatio: 0.5,
    petalCount: 12,
  },
  lavender: {
    name: 'Lavendel',
    petalColor: '#9b6dd6',
    petalEdge: '#6a4290',
    centerColor: '#6a4290',
    stemColor: '#3a8a2e',
    heightRatio: 0.5,
    petalCount: 8,
  },
  poppy: {
    name: 'Mohn',
    petalColor: '#E03030',
    petalEdge: '#9a1010',
    centerColor: '#1a1a1a',
    stemColor: '#3a8a2e',
    heightRatio: 0.5,
    petalCount: 6,
  },
  marigold: {
    name: 'Ringelblume',
    petalColor: '#F58220',
    petalEdge: '#C04E0A',
    centerColor: '#7C2A00',
    stemColor: '#3a8a2e',
    heightRatio: 0.5,
    petalCount: 14,
  },
  lily: {
    name: 'Lilie',
    petalColor: '#FFE680',
    petalEdge: '#E8B040',
    centerColor: '#C04A20',
    stemColor: '#3a8a2e',
    heightRatio: 0.5,
    petalCount: 6,
  },
};

// Wachstums-Phase berechnen (0..1)
export function getFlowerGrowth(plantedAt) {
  const elapsed = Date.now() - plantedAt;
  return Math.max(0, Math.min(1, elapsed / FLOWER_GROWTH_DURATION));
}

// Stage-Index (0=Samen, 1=Trieb, 2=Knospe, 3=Halbblüte, 4=Vollblüte)
export function getFlowerStage(plantedAt) {
  const g = getFlowerGrowth(plantedAt);
  if (g >= 1.0) return 4;
  if (g >= 0.7) return 3;
  if (g >= 0.4) return 2;
  if (g >= 0.15) return 1;
  return 0;
}

export function isFlowerBlooming(plantedAt) {
  return getFlowerGrowth(plantedAt) >= 1.0;
}
