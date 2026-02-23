// ============================================
// Heimat-Map - Zentrale Insel-Karte
// ============================================
// 0 = Gras, 1 = Wasser, 2 = Sand, 3 = Stein, 4 = Baum, 5 = Busch

const T = {
  G: 0, // Gras
  W: 1, // Wasser
  S: 2, // Sand
  R: 3, // Stein
  T: 4, // Baum
  B: 5, // Busch
};

// 20x15 Karte - Heimat-Insel
// Ränder = Ausgänge zu Biomen (N/S/W/O)
const homeMap = [
  // Reihe 0 (Norden - Wald-Ausgang)
  [T.T, T.T, T.T, T.T, T.T, T.T, T.T, T.G, T.G, T.G, T.G, T.G, T.G, T.T, T.T, T.T, T.T, T.T, T.T, T.T],
  // Reihe 1
  [T.T, T.G, T.G, T.G, T.G, T.B, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.B, T.G, T.G, T.G, T.G, T.T],
  // Reihe 2
  [T.T, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.T],
  // Reihe 3 (Baum-Position col 3)
  [T.T, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.T],
  // Reihe 4
  [T.T, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.T],
  // Reihe 5 (Westen - Felder-Ausgang)
  [T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G],
  // Reihe 6
  [T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G],
  // Reihe 7 (Mitte)
  [T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G],
  // Reihe 8
  [T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G],
  // Reihe 9 (Osten - Klippen-Ausgang)
  [T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G],
  // Reihe 10
  [T.T, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.T],
  // Reihe 11
  [T.T, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.W, T.W, T.W, T.W, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.T],
  // Reihe 12
  [T.T, T.G, T.G, T.B, T.G, T.G, T.G, T.G, T.W, T.W, T.W, T.G, T.G, T.G, T.G, T.B, T.G, T.G, T.G, T.T],
  // Reihe 13
  [T.T, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.G, T.T],
  // Reihe 14 (Süden - See-Ausgang)
  [T.T, T.T, T.T, T.T, T.T, T.T, T.T, T.G, T.G, T.G, T.G, T.G, T.G, T.T, T.T, T.T, T.T, T.T, T.T, T.T],
];

// Position des wachsenden Baums (ehemals linker Felsen)
export const TREE_POSITION = { col: 3, row: 3 };

// Ausgangs-Bereiche (welche Kacheln am Rand führen zu welchem Biom)
export const EXIT_ZONES = {
  north: { row: 0, colStart: 7, colEnd: 12 },
  south: { row: 14, colStart: 7, colEnd: 12 },
  west: { col: 0, rowStart: 5, rowEnd: 9 },
  east: { col: 19, rowStart: 5, rowEnd: 9 },
};

export default homeMap;
