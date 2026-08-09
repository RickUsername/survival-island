// ============================================
// Wachsende Bäume — Hauptbaum und gepflanzte Bäume
// ============================================
// Vorher waren das zwei grüne Kreise auf einem braunen Rechteck. Hier
// entsteht dieselbe geschichtete Krone wie bei den Randbäumen, aber
// abhängig von der Wachstumsstufe: Stufe 1 ist ein Keimling mit zwei
// Blättern, Stufe 10 ein mächtiger Baum mit Astwerk und Früchten.
//
// Jede Stufe wird einmal gebacken und danach nur noch geblittet.

import { makeRng, hash2 } from './noise';
import { rgb, mix } from './color';

const PAL = { dark: [24, 66, 30], mid: [46, 108, 46], light: [92, 156, 66], hi: [146, 194, 92] };
const PAL_YOUNG = { dark: [46, 96, 40], mid: [74, 132, 52], light: [122, 174, 74], hi: [168, 206, 104] };

/** Maße eines Sprites für eine Stufe */
function metrics(stage, big) {
  const t = (stage - 1) / 9;                    // 0 … 1
  const maxH = big ? 300 : 190;                 // Höhe bei Stufe 10
  const h = Math.round(34 + t * t * (maxH - 34)); // quadratisch: spät wird's schnell groß
  const w = Math.round(h * 0.92);
  return { w, h, t };
}

function canopyBlobs(rng, cx, cy, rx, ry, count) {
  const blobs = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng() * 0.45;
    const d = Math.sqrt(rng()) * 0.95;
    blobs.push({
      x: cx + Math.cos(a) * rx * d,
      y: cy + Math.sin(a) * ry * d,
      r: rx * 0.34 * (0.7 + rng() * 0.55) * (1 - d * 0.26),
      depth: Math.sin(a) * 0.5 + d * 0.5,
    });
  }
  blobs.push({ x: cx, y: cy + ry * 0.1, r: rx * 0.58, depth: -1 });
  blobs.sort((a, b) => b.depth - a.depth);
  return blobs;
}

function fillBlobs(ctx, blobs, scale, offX, offY, color, alpha) {
  ctx.fillStyle = rgb(color, alpha);
  ctx.beginPath();
  for (const b of blobs) {
    const r = b.r * scale;
    if (r <= 0.5) continue;
    ctx.moveTo(b.x + offX + r, b.y + offY);
    ctx.arc(b.x + offX, b.y + offY, r, 0, Math.PI * 2);
  }
  ctx.fill();
}

/** Keimling: dünner Stiel mit ein bis zwei Keimblättern */
function drawSeedling(ctx, w, h, stage, rng) {
  const cx = w / 2;
  const base = h - 2;
  const top = base - h * 0.55;

  ctx.strokeStyle = '#79A44A';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, base);
  ctx.quadraticCurveTo(cx - 1.5, (base + top) / 2, cx, top);
  ctx.stroke();

  const leaf = (dir, size, yOff) => {
    const g = ctx.createLinearGradient(cx, top + yOff, cx + dir * size, top + yOff - size * 0.4);
    g.addColorStop(0, rgb(PAL_YOUNG.mid));
    g.addColorStop(1, rgb(PAL_YOUNG.hi));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx + dir * size * 0.62, top + yOff - size * 0.2, size, size * 0.52, dir * -0.45, 0, Math.PI * 2);
    ctx.fill();
    // Mittelrippe
    ctx.strokeStyle = 'rgba(46,92,38,0.45)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, top + yOff);
    ctx.lineTo(cx + dir * size * 1.2, top + yOff - size * 0.42);
    ctx.stroke();
  };

  leaf(-1, h * 0.3, 2);
  if (stage >= 2) leaf(1, h * 0.26, h * 0.1);
  // Erdhügel am Fuß
  ctx.fillStyle = 'rgba(94,72,46,0.55)';
  ctx.beginPath();
  ctx.ellipse(cx, base, h * 0.16, h * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
}

function bakeTree(stage, variant, big) {
  const { w, h, t } = metrics(stage, big);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  const rng = makeRng(5000 + stage * 131 + variant * 977);

  if (stage <= 2) {
    drawSeedling(ctx, w, h, stage, rng);
    return cv;
  }

  const cx = w / 2;
  const base = h - 2;
  // Junge Bäume sind fast nur Krone, alte haben einen langen freien Stamm
  const trunkH = h * (0.28 + t * 0.24);
  const trunkTop = base - trunkH;
  const trunkW = Math.max(3, h * (0.05 + t * 0.045));
  const pal = stage <= 5 ? PAL_YOUNG : PAL;

  // Wurzelanläufe erst bei größeren Bäumen
  if (t > 0.35) {
    ctx.fillStyle = '#4a3018';
    for (let i = 0; i < 4; i++) {
      const dir = i < 2 ? -1 : 1;
      const spread = (trunkW * 0.9 + rng() * trunkW * 1.6) * dir;
      ctx.beginPath();
      ctx.moveTo(cx + dir * trunkW * 0.4, base - trunkW * 0.9);
      ctx.quadraticCurveTo(cx + spread * 0.7, base - 1, cx + spread, base + 1);
      ctx.lineTo(cx + spread * 0.8, base + 2);
      ctx.quadraticCurveTo(cx + spread * 0.35, base, cx, base - trunkW * 0.6);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Stamm mit Rundung
  const g = ctx.createLinearGradient(cx - trunkW, 0, cx + trunkW, 0);
  g.addColorStop(0, '#3d2611');
  g.addColorStop(0.34, '#6b4521');
  g.addColorStop(0.62, '#8a5c2e');
  g.addColorStop(1, '#432b13');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - trunkW, base);
  ctx.quadraticCurveTo(cx - trunkW * 0.72, (base + trunkTop) / 2, cx - trunkW * 0.4, trunkTop);
  ctx.lineTo(cx + trunkW * 0.4, trunkTop);
  ctx.quadraticCurveTo(cx + trunkW * 0.72, (base + trunkTop) / 2, cx + trunkW, base);
  ctx.closePath();
  ctx.fill();

  // Rindenfurchen
  ctx.strokeStyle = 'rgba(38,22,10,0.45)';
  ctx.lineWidth = Math.max(0.6, trunkW * 0.09);
  for (let i = 0; i < 4; i++) {
    const off = (rng() - 0.5) * trunkW * 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + off, base - rng() * trunkH * 0.2);
    ctx.quadraticCurveTo(cx + off * 0.8, (base + trunkTop) / 2, cx + off * 0.5, trunkTop + rng() * trunkH * 0.3);
    ctx.stroke();
  }

  // Äste — je älter, desto mehr
  const branchCount = Math.floor(1 + t * 5);
  ctx.strokeStyle = '#4e3117';
  ctx.lineCap = 'round';
  for (let i = 0; i < branchCount; i++) {
    const dir = i % 2 === 0 ? -1 : 1;
    const len = trunkW * (2.2 + rng() * 2.6);
    const sy = trunkTop + i * (trunkH * 0.12) + rng() * 4;
    ctx.lineWidth = Math.max(1, trunkW * (0.5 - i * 0.05));
    ctx.beginPath();
    ctx.moveTo(cx, sy);
    ctx.quadraticCurveTo(cx + dir * len * 0.6, sy - len * 0.3, cx + dir * len, sy - len * 0.55);
    ctx.stroke();
  }

  // Krone
  const crownCY = trunkTop - (h - trunkH) * 0.26;
  const rx = w * 0.42;
  const ry = (h - trunkH) * 0.44;
  const blobs = canopyBlobs(rng, cx, crownCY, rx, ry, 8 + Math.floor(t * 12));

  fillBlobs(ctx, blobs, 1.00, 0, 0, pal.dark, 1);
  fillBlobs(ctx, blobs, 0.87, -rx * 0.06, -ry * 0.1, pal.mid, 1);
  fillBlobs(ctx, blobs, 0.64, -rx * 0.13, -ry * 0.24, pal.light, 0.95);
  fillBlobs(ctx, blobs, 0.36, -rx * 0.2, -ry * 0.36, pal.hi, 0.8);

  // Einzelblätter am Rand
  for (const b of blobs) {
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const lx = b.x + Math.cos(a) * b.r * (0.85 + rng() * 0.3);
      const ly = b.y + Math.sin(a) * b.r * (0.85 + rng() * 0.3);
      const up = (ly - crownCY) / (ry || 1);
      ctx.fillStyle = rgb(mix(pal.light, pal.dark, Math.max(0, up) * 0.9), 0.85);
      const ls = Math.max(1.4, rx * 0.075);
      ctx.beginPath();
      ctx.ellipse(lx, ly, ls, ls * 0.62, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Kernschatten unter der Krone
  ctx.globalCompositeOperation = 'multiply';
  const under = ctx.createRadialGradient(cx, crownCY + ry * 0.55, 2, cx, crownCY + ry * 0.5, rx);
  under.addColorStop(0, 'rgba(40,60,36,0.5)');
  under.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = under;
  ctx.beginPath();
  ctx.ellipse(cx, crownCY + ry * 0.5, rx, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Früchte ab Stufe 7 — passend dazu, dass der Baum dann Obst abwirft
  if (stage >= 7) {
    const count = 4 + Math.floor((stage - 7) * 3);
    for (let i = 0; i < count; i++) {
      const b = blobs[Math.floor(rng() * blobs.length)];
      const fx = b.x + (rng() - 0.5) * b.r * 1.3;
      const fy = b.y + (rng() - 0.5) * b.r * 1.1;
      const fr = Math.max(1.8, rx * 0.05);
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,196,180,0.65)';
      ctx.beginPath();
      ctx.arc(fx - fr * 0.3, fy - fr * 0.34, fr * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return cv;
}

const cache = new Map();

/**
 * Liefert Sprite und Maße für einen Baum.
 * @param {number} stage 1..10
 * @param {number} variant Aussehen (z. B. aus der Kachelposition)
 * @param {boolean} big true = Hauptbaum (größer)
 */
export function getGrowthTree(stage, variant = 0, big = false) {
  const s = Math.max(1, Math.min(10, Math.round(stage)));
  const v = ((variant % 4) + 4) % 4;
  const key = `${s}|${v}|${big ? 1 : 0}`;
  let entry = cache.get(key);
  if (!entry) {
    entry = { canvas: bakeTree(s, v, big), ...metrics(s, big) };
    cache.set(key, entry);
  }
  return entry;
}

/** Variantenwahl aus der Kachelposition, damit gepflanzte Bäume sich unterscheiden */
export function treeVariant(col, row) {
  return Math.floor(hash2(col, row, 2411) * 4);
}
