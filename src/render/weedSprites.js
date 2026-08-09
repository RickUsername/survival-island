// ============================================
// Unkraut-Sprites — gebacken statt Halm für Halm gezeichnet
// ============================================
// Vorher wurde jeder Halm pro Bild neu gepfadet, inklusive eigenem
// Farbverlauf. Bei 14 Unkräutern waren das über 100 Gradienten und
// mehrere hundert Pfad-Operationen — pro Frame. Auf dem Handy hat das
// spürbar geruckelt.
//
// Jetzt wird jede Kombination aus Stufe und Variante einmal gebacken.
// Der Wind kommt als Scherung beim Blitten dazu: die Halme neigen sich
// weiterhin, kosten aber nur noch ein drawImage.

import { hash2 } from './noise';

export const W_W = 96;          // Sprite-Breite
export const W_H = 76;          // Sprite-Höhe
export const W_ANCHOR_X = 48;   // Fußpunkt im Sprite
export const W_ANCHOR_Y = 60;
export const WEED_VARIANTS = 6;

const cache = new Map();

/** Feste Variante je Standort — dasselbe Unkraut sieht immer gleich aus */
export function weedVariant(col, row) {
  return Math.floor(hash2(col, row, 8123) * WEED_VARIANTS) % WEED_VARIANTS;
}

/**
 * Gebackenes Unkraut-Büschel.
 * Die Geometrie ist unverändert gegenüber der früheren Direktzeichnung,
 * nur ohne Wind — der kommt beim Zeichnen als Scherung dazu.
 */
export function getWeedSprite(stage, variant) {
  const s = Math.max(1, Math.min(3, stage || 1));
  const v = ((variant || 0) % WEED_VARIANTS + WEED_VARIANTS) % WEED_VARIANTS;
  const key = `${s}|${v}`;
  if (cache.has(key)) return cache.get(key);

  const cv = document.createElement('canvas');
  cv.width = W_W;
  cv.height = W_H;
  const ctx = cv.getContext('2d');

  const cx = W_ANCHOR_X;
  const cy = W_ANCHOR_Y;
  const seed = v * 131 + 977;

  const blades = s === 1 ? 4 : s === 2 ? 9 : 16;
  const maxH = s === 1 ? 12 : s === 2 ? 22 : 34;
  const spread = s === 1 ? 8 : s === 2 ? 15 : 24;

  for (let i = 0; i < blades; i++) {
    const r1 = hash2(seed, i, 11);
    const r2 = hash2(seed, i, 23);
    const r3 = hash2(seed, i, 37);

    const bx = cx + (r1 - 0.5) * spread * 2;
    const by = cy + (r2 - 0.5) * spread * 0.5;
    const hgt = maxH * (0.55 + r3 * 0.55);
    const tipX = bx + (r1 - 0.5) * 5;

    // Kühles, sattes Grün — deutlich anders als das Wiesengrün
    const g = ctx.createLinearGradient(bx, by, tipX, by - hgt);
    g.addColorStop(0, '#2c4a16');
    g.addColorStop(0.6, `rgb(${58 + r2 * 24 | 0},${104 + r3 * 30 | 0},${34 + r1 * 18 | 0})`);
    g.addColorStop(1, `rgb(${96 + r1 * 40 | 0},${146 + r2 * 34 | 0},${58 + r3 * 24 | 0})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.6 + s * 0.35;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx, by - hgt * 0.55, tipX, by - hgt);
    ctx.stroke();

    // Blattfahnen am Halm
    if (s >= 2 && r3 > 0.45) {
      const ly = by - hgt * 0.5;
      const dir = r1 > 0.5 ? 1 : -1;
      ctx.fillStyle = `rgba(${62 + r2 * 30 | 0},${112 + r3 * 28 | 0},40,0.85)`;
      ctx.beginPath();
      ctx.ellipse(bx + dir * 3.4, ly, 4.4, 1.7, dir * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Stufe 3: Samenstände und Ranken — wucherndes Dickicht
  if (s === 3) {
    for (let i = 0; i < 5; i++) {
      const r1 = hash2(seed, i, 53);
      const r2 = hash2(seed, i, 67);
      const sx = cx + (r1 - 0.5) * spread * 1.8;
      const sy = cy - maxH * (0.75 + r2 * 0.3);
      ctx.fillStyle = 'rgba(150,138,74,0.9)';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 2, 4.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Grannen
      ctx.strokeStyle = 'rgba(174,164,102,0.7)';
      ctx.lineWidth = 0.7;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(sx, sy - 3);
        ctx.lineTo(sx + k * 3.5, sy - 8);
        ctx.stroke();
      }
    }
    // Kriechende Ranke am Boden
    ctx.strokeStyle = 'rgba(64,104,38,0.6)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy + 3);
    ctx.quadraticCurveTo(cx, cy + 8, cx + 20, cy + 2);
    ctx.stroke();
  }

  const out = { canvas: cv, maxH };
  cache.set(key, out);
  return out;
}
