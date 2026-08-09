// ============================================
// Baum- und Buschsprites — einmal gebacken, dann nur noch geblittet
// ============================================
// Vorher war jeder Randbaum exakt derselbe: gleiche Kreise, gleiche
// Position, 60-mal nebeneinander. Hier entstehen stattdessen Varianten
// mit unregelmäßiger Kronensilhouette, geschichtetem Laub und Rinde.

import { hash2, makeRng } from './noise';
import { rgb, mix } from './color';

export const TREE_W = 112;
export const TREE_H = 148;
export const TREE_ANCHOR_X = TREE_W / 2;
export const TREE_ANCHOR_Y = TREE_H - 14; // Stammfuß

export const BUSH_W = 84;
export const BUSH_H = 68;

const VARIANTS = 8;

// Laubfarben je Sorte — von tiefem Nadelgrün bis hin zu hellem Laubgrün
const FOLIAGE = [
  { dark: [22, 62, 30], mid: [42, 104, 44], light: [86, 152, 62], hi: [138, 190, 88] },
  { dark: [28, 58, 26], mid: [54, 112, 42], light: [104, 164, 66], hi: [156, 198, 96] },
  { dark: [18, 54, 34], mid: [36, 96, 52], light: [74, 142, 74], hi: [124, 180, 104] },
  { dark: [34, 62, 24], mid: [66, 116, 40], light: [116, 168, 60], hi: [168, 202, 88] },
];

/**
 * Erzeugt die Wolke aus Laubballen, aus der die Krone besteht.
 * Die Ballen liegen auf einer verrauschten Ellipse — dadurch ist die
 * Silhouette nie kreisrund.
 */
function canopyBlobs(rng, cx, cy, rx, ry, count) {
  const blobs = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng() * 0.4;
    // Wurzel-Verteilung: mehr Ballen außen, damit der Rand dicht wird
    const d = Math.sqrt(rng()) * 0.95;
    const wobble = 0.72 + rng() * 0.5;
    blobs.push({
      x: cx + Math.cos(a) * rx * d,
      y: cy + Math.sin(a) * ry * d,
      r: (rx * 0.34) * wobble * (1 - d * 0.28),
      depth: Math.sin(a) * 0.5 + d * 0.5, // hinten/unten zuerst zeichnen
    });
  }
  // Ein großer Kern, damit keine Löcher entstehen
  blobs.push({ x: cx, y: cy + ry * 0.1, r: rx * 0.6, depth: -1 });
  blobs.sort((a, b) => b.depth - a.depth);
  return blobs;
}

function fillBlobs(ctx, blobs, scale, offX, offY, color, alpha) {
  ctx.fillStyle = rgb(color, alpha);
  ctx.beginPath();
  for (const b of blobs) {
    const r = b.r * scale;
    if (r <= 0.6) continue;
    ctx.moveTo(b.x + offX + r, b.y + offY);
    ctx.arc(b.x + offX, b.y + offY, r, 0, Math.PI * 2);
  }
  ctx.fill();
}

function drawTrunk(ctx, rng, baseX, baseY, topY, width, lean) {
  const topX = baseX + lean;
  const halfB = width / 2;
  const halfT = width * 0.32;

  // Wurzelanläufe
  ctx.fillStyle = '#4a3018';
  for (let i = 0; i < 4; i++) {
    const dir = i < 2 ? -1 : 1;
    const spread = (10 + rng() * 16) * dir;
    ctx.beginPath();
    ctx.moveTo(baseX + dir * halfB * 0.5, baseY - 12);
    ctx.quadraticCurveTo(baseX + spread * 0.7, baseY - 2, baseX + spread, baseY + 2);
    ctx.lineTo(baseX + spread * 0.82, baseY + 4);
    ctx.quadraticCurveTo(baseX + spread * 0.4, baseY - 1, baseX, baseY - 8);
    ctx.closePath();
    ctx.fill();
  }

  // Stamm — leicht geschwungen, unten breiter
  const grad = ctx.createLinearGradient(baseX - halfB, 0, baseX + halfB, 0);
  grad.addColorStop(0, '#3d2611');
  grad.addColorStop(0.32, '#6b452170');
  grad.addColorStop(0.34, '#6b4521');
  grad.addColorStop(0.62, '#8a5c2e');
  grad.addColorStop(1, '#432b13');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(baseX - halfB, baseY);
  ctx.quadraticCurveTo(baseX - halfB * 0.72 + lean * 0.3, (baseY + topY) / 2, topX - halfT, topY);
  ctx.lineTo(topX + halfT, topY);
  ctx.quadraticCurveTo(baseX + halfB * 0.72 + lean * 0.3, (baseY + topY) / 2, baseX + halfB, baseY);
  ctx.closePath();
  ctx.fill();

  // Rindenfurchen
  ctx.strokeStyle = 'rgba(38,22,10,0.5)';
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 5; i++) {
    const off = (rng() - 0.5) * width * 0.7;
    const y0 = baseY - rng() * 10;
    const y1 = topY + rng() * (baseY - topY) * 0.35;
    ctx.beginPath();
    ctx.moveTo(baseX + off, y0);
    ctx.quadraticCurveTo(baseX + off + lean * 0.4 + (rng() - 0.5) * 4, (y0 + y1) / 2, topX + off * 0.55, y1);
    ctx.stroke();
  }
  // Querrunzeln
  ctx.strokeStyle = 'rgba(30,18,8,0.28)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 6; i++) {
    const ty = baseY - (i + 1) * ((baseY - topY) / 7) - rng() * 3;
    const k = (baseY - ty) / (baseY - topY);
    const hw = halfB * (1 - k * 0.62);
    ctx.beginPath();
    ctx.moveTo(baseX + lean * k - hw, ty);
    ctx.quadraticCurveTo(baseX + lean * k, ty + 2.2, baseX + lean * k + hw, ty);
    ctx.stroke();
  }

  return { topX, topY };
}

function drawBranches(ctx, rng, x, y, count, spread, up) {
  ctx.strokeStyle = '#4e3117';
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const dir = i % 2 === 0 ? -1 : 1;
    const len = spread * (0.55 + rng() * 0.65);
    const startY = y + i * 5 - rng() * 6;
    ctx.lineWidth = 4.2 - i * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.quadraticCurveTo(x + dir * len * 0.6, startY - up * 0.35, x + dir * len, startY - up * (0.6 + rng() * 0.4));
    ctx.stroke();
  }
}

/** Ein Baum-Sprite */
function makeTree(variant) {
  const rng = makeRng(9001 + variant * 7717);
  const cv = document.createElement('canvas');
  cv.width = TREE_W;
  cv.height = TREE_H;
  const ctx = cv.getContext('2d');

  const pal = FOLIAGE[variant % FOLIAGE.length];
  const lean = (rng() - 0.5) * 10;
  const trunkW = 13 + rng() * 6;
  const baseY = TREE_ANCHOR_Y;
  const trunkTop = 52 + rng() * 16;

  const { topX } = drawTrunk(ctx, rng, TREE_ANCHOR_X, baseY, trunkTop, trunkW, lean);
  drawBranches(ctx, rng, topX, trunkTop + 4, 4, 26, 20);

  // Krone
  const cx = topX + (rng() - 0.5) * 6;
  const cy = 40 + rng() * 10;
  const rx = 38 + rng() * 8;
  const ry = 31 + rng() * 8;
  const blobs = canopyBlobs(rng, cx, cy, rx, ry, 16 + Math.floor(rng() * 6));

  // Schichten von dunkel/groß nach hell/klein, jeweils zum Licht versetzt
  fillBlobs(ctx, blobs, 1.00, 0, 0, pal.dark, 1);
  fillBlobs(ctx, blobs, 0.88, -3, -4, pal.mid, 1);
  fillBlobs(ctx, blobs, 0.66, -6, -9, pal.light, 0.95);
  fillBlobs(ctx, blobs, 0.38, -9, -14, pal.hi, 0.8);

  // Einzelblätter am Rand brechen die Silhouette auf
  for (const b of blobs) {
    const n = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const lx = b.x + Math.cos(a) * b.r * (0.86 + rng() * 0.3);
      const ly = b.y + Math.sin(a) * b.r * (0.86 + rng() * 0.3);
      const up = (ly - cy) / ry;
      ctx.fillStyle = rgb(mix(pal.light, pal.dark, Math.max(0, up) * 0.9), 0.85);
      ctx.beginPath();
      ctx.ellipse(lx, ly, 3.4 + rng() * 2.4, 2.1 + rng() * 1.4, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Kernschatten unter der Krone
  ctx.globalCompositeOperation = 'multiply';
  const under = ctx.createRadialGradient(cx, cy + ry * 0.55, 2, cx, cy + ry * 0.5, rx * 0.95);
  under.addColorStop(0, 'rgba(40,60,36,0.55)');
  under.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = under;
  ctx.beginPath();
  ctx.ellipse(cx, cy + ry * 0.5, rx, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Vereinzelte Früchte
  if (variant % 3 === 0) {
    for (let i = 0; i < 4 + Math.floor(rng() * 4); i++) {
      const b = blobs[Math.floor(rng() * blobs.length)];
      const fx = b.x + (rng() - 0.5) * b.r * 1.3;
      const fy = b.y + (rng() - 0.5) * b.r * 1.1;
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(fx, fy, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,190,170,0.6)';
      ctx.beginPath();
      ctx.arc(fx - 0.8, fy - 0.9, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return cv;
}

/** Ein Busch-Sprite */
function makeBush(variant) {
  const rng = makeRng(4400 + variant * 3313);
  const cv = document.createElement('canvas');
  cv.width = BUSH_W;
  cv.height = BUSH_H;
  const ctx = cv.getContext('2d');

  const pal = FOLIAGE[(variant + 1) % FOLIAGE.length];
  const cx = BUSH_W / 2;
  const cy = BUSH_H - 22;
  const blobs = canopyBlobs(rng, cx, cy, 26, 17, 10);

  fillBlobs(ctx, blobs, 1.00, 0, 0, pal.dark, 1);
  fillBlobs(ctx, blobs, 0.84, -2, -3, pal.mid, 1);
  fillBlobs(ctx, blobs, 0.58, -4, -6, pal.light, 0.94);
  fillBlobs(ctx, blobs, 0.3, -6, -9, pal.hi, 0.75);

  // Zweigspitzen
  ctx.strokeStyle = 'rgba(52,74,36,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI * (0.15 + rng() * 0.7);
    const len = 8 + rng() * 10;
    const sx = cx + (rng() - 0.5) * 34;
    const sy = cy - rng() * 8;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len);
    ctx.stroke();
  }

  // Beeren
  const berryCol = variant % 2 === 0 ? '#c8304a' : '#3b2a6b';
  for (let i = 0; i < 7 + Math.floor(rng() * 6); i++) {
    const b = blobs[Math.floor(rng() * blobs.length)];
    const bx = b.x + (rng() - 0.5) * b.r * 1.4;
    const by = b.y + (rng() - 0.5) * b.r * 1.1;
    ctx.fillStyle = berryCol;
    ctx.beginPath();
    ctx.arc(bx, by, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.beginPath();
    ctx.arc(bx - 0.7, by - 0.8, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  return cv;
}

let treeCache = null;
let bushCache = null;

export function getTreeSprite(col, row) {
  if (!treeCache) {
    treeCache = [];
    for (let i = 0; i < VARIANTS; i++) treeCache.push(makeTree(i));
  }
  const v = Math.floor(hash2(col, row, 3307) * VARIANTS) % VARIANTS;
  return treeCache[v];
}

export function getBushSprite(col, row) {
  if (!bushCache) {
    bushCache = [];
    for (let i = 0; i < 4; i++) bushCache.push(makeBush(i));
  }
  const v = Math.floor(hash2(col, row, 5501) * 4) % 4;
  return bushCache[v];
}

/** Pro Baum leicht abweichende Größe und Phase — bricht die Wiederholung */
export function treeJitter(col, row) {
  return {
    scale: 0.86 + hash2(col, row, 7717) * 0.34,
    flip: hash2(col, row, 8819) > 0.5,
    phase: hash2(col, row, 9923) * Math.PI * 2,
    dx: (hash2(col, row, 1231) - 0.5) * 14,
    dy: (hash2(col, row, 4567) - 0.5) * 8,
  };
}
