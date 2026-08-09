// ============================================
// Innenraum-Sprites — Raumhülle und Möbel
// ============================================
// Gleiche Bauweise wie draußen: alles wird einmal in Offscreen-Canvases
// gebacken und danach nur noch geblittet. Der Raum ist eine flache
// Draufsicht mit Rückwand — Möbel sind höher als ihre Standfläche und
// werden nach Reihe sortiert gezeichnet, genau wie die Bäume auf der Insel.

import { hash2, fbm, makeRng, scatter } from './noise';
import { rgb, mix, shade } from './color';
import { furnitureById, getRoom } from '../systems/InteriorSystem';

export const CELL = 72;          // Kantenlänge einer Bodenzelle
export const WALL_H = 138;       // Höhe der Rückwand über dem Boden
export const FLOOR_PAD = 18;     // Sockelleiste/Kante unten

// roundRect fehlt in älteren Safari-/Firefox-Versionen. Der Innenraum lebt
// von abgerundeten Kanten — lieber einmal nachrüsten als überall abfragen.
if (typeof CanvasRenderingContext2D !== 'undefined'
    && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, w, h, r) {
    const rad = Math.min(typeof r === 'number' ? r : 0, Math.abs(w) / 2, Math.abs(h) / 2);
    this.moveTo(x + rad, y);
    this.lineTo(x + w - rad, y);
    this.quadraticCurveTo(x + w, y, x + w, y + rad);
    this.lineTo(x + w, y + h - rad);
    this.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    this.lineTo(x + rad, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - rad);
    this.lineTo(x, y + rad);
    this.quadraticCurveTo(x, y, x + rad, y);
    return this;
  };
}

const shellCache = new Map();
const trimCache = new Map();
const furnCache = new Map();

function make(w, h) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w));
  cv.height = Math.max(1, Math.round(h));
  return { cv, ctx: cv.getContext('2d') };
}

// --- Wand- und Bodenmaterialien ----------------------------------------

// Bretterwand aus waagerechten Stämmen (Blockhaus)
function wallLogs(ctx, w, h, seed) {
  const base = [122, 88, 58];
  const rows = Math.max(4, Math.round(h / 30));
  const rh = h / rows;
  for (let i = 0; i < rows; i++) {
    const y = i * rh;
    const t = hash2(i, 7, seed);
    const c = mix(base, [158, 118, 78], t * 0.8);
    const g = ctx.createLinearGradient(0, y, 0, y + rh);
    g.addColorStop(0, rgb(shade(c, 0.78)));
    g.addColorStop(0.34, rgb(c));
    g.addColorStop(0.72, rgb(shade(c, 1.08)));
    g.addColorStop(1, rgb(shade(c, 0.62)));
    ctx.fillStyle = g;
    ctx.fillRect(0, y, w, rh + 0.6);

    // Maserung
    ctx.strokeStyle = 'rgba(70,46,26,0.16)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      const yy = y + rh * (0.25 + k * 0.25) + (hash2(i, k, seed) - 0.5) * 3;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      for (let x = 0; x <= w; x += 24) {
        ctx.lineTo(x, yy + Math.sin(x * 0.03 + i) * 1.4);
      }
      ctx.stroke();
    }
  }
  // Moos/Lehm in den Fugen
  ctx.fillStyle = 'rgba(96,78,54,0.35)';
  for (let i = 1; i < rows; i++) ctx.fillRect(0, i * rh - 1, w, 2);
}

// Reetwand (Hütte) — senkrechte Halme
function wallThatch(ctx, w, h, seed) {
  ctx.fillStyle = '#8d7443';
  ctx.fillRect(0, 0, w, h);
  const rng = makeRng(seed + 11);
  for (let x = 0; x < w; x += 2) {
    const t = rng();
    const c = mix([116, 94, 52], [186, 158, 96], t);
    ctx.strokeStyle = rgb(c, 0.85);
    ctx.lineWidth = 1.6 + t;
    ctx.beginPath();
    ctx.moveTo(x + (t - 0.5) * 2, -2);
    ctx.lineTo(x + (t - 0.5) * 6, h + 2);
    ctx.stroke();
  }
  // Querbalken, die das Reet halten
  for (const fy of [0.28, 0.68]) {
    const y = h * fy;
    const g = ctx.createLinearGradient(0, y - 7, 0, y + 7);
    g.addColorStop(0, '#6d5233');
    g.addColorStop(0.5, '#8a6942');
    g.addColorStop(1, '#553f27');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 6, w, 12);
  }
  // Abdunkeln nach oben (Dachschatten)
  const sh = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  sh.addColorStop(0, 'rgba(30,20,10,0.42)');
  sh.addColorStop(1, 'rgba(30,20,10,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, 0, w, h * 0.55);
}

// Bruchsteinwand (Steinhaus)
function wallStone(ctx, w, h, seed) {
  ctx.fillStyle = '#5f5c58';
  ctx.fillRect(0, 0, w, h);
  const rows = Math.max(4, Math.round(h / 34));
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    const off = (r % 2) * 26;
    let x = -off;
    while (x < w) {
      const bw = 44 + hash2(r, x, seed) * 34;
      const t = hash2(x | 0, r, seed + 3);
      const c = mix([126, 122, 116], [166, 162, 154], t);
      ctx.fillStyle = rgb(c);
      const rr = 4;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, bw - 4, rh - 4, rr);
      ctx.fill();
      // Licht oben, Schatten unten
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 3, bw - 8, rh * 0.34, rr);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.beginPath();
      ctx.roundRect(x + 4, y + rh * 0.68, bw - 8, rh * 0.26, rr);
      ctx.fill();
      x += bw;
    }
  }
  // Kalkfugen leicht aufhellen
  ctx.fillStyle = 'rgba(214,208,196,0.12)';
  for (let r = 1; r < rows; r++) ctx.fillRect(0, r * rh - 1, w, 2);
}

// Fachwerk: heller Putz mit dunklen Balken
function wallTimber(ctx, w, h, seed) {
  // Putz
  ctx.fillStyle = '#e3d8c2';
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) {
    for (let x = 0; x < w; x += 3) {
      const n = fbm(x * 0.05, y * 0.05, 3, seed);
      ctx.fillStyle = `rgba(${n > 0.5 ? '255,255,255' : '120,104,80'},${Math.abs(n - 0.5) * 0.28})`;
      ctx.fillRect(x, y, 3, 3);
    }
  }
  // Balken
  const beam = (x, y, bw, bh) => {
    const g = ctx.createLinearGradient(x, y, x, y + bh);
    g.addColorStop(0, '#59402c');
    g.addColorStop(0.4, '#6f5238');
    g.addColorStop(1, '#432e1e');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
  };
  beam(0, 0, w, 15);
  beam(0, h - 17, w, 17);
  const posts = Math.max(2, Math.round(w / 150));
  for (let i = 0; i <= posts; i++) beam((w / posts) * i - 7, 0, 14, h);
  // Andreaskreuze zwischen den Pfosten
  ctx.save();
  ctx.strokeStyle = '#5b422d';
  ctx.lineWidth = 12;
  ctx.lineCap = 'butt';
  for (let i = 0; i < posts; i++) {
    const x0 = (w / posts) * i + 10;
    const x1 = (w / posts) * (i + 1) - 10;
    if (x1 - x0 < 60) continue;
    ctx.beginPath();
    ctx.moveTo(x0, h - 20);
    ctx.lineTo((x0 + x1) / 2, 20);
    ctx.lineTo(x1, h - 20);
    ctx.stroke();
  }
  ctx.restore();
}

// Böden
function floorEarth(ctx, w, h, seed) {
  // Heller Lehm statt dunkler Erde: der Raum ist ohnehin der dunkelste
  // von allen, ein brauner Boden dazu macht ihn unlesbar.
  for (let y = 0; y < h; y += 4) {
    for (let x = 0; x < w; x += 4) {
      const n = fbm(x * 0.018, y * 0.018, 4, seed);
      const c = mix([146, 122, 90], [196, 172, 132], n);
      ctx.fillStyle = rgb(c);
      ctx.fillRect(x, y, 4, 4);
    }
  }
  // festgetretene Strohreste
  const rng = makeRng(seed + 5);
  ctx.lineWidth = 1.4;
  for (let i = 0; i < w * h / 900; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const a = rng() * Math.PI;
    const l = 6 + rng() * 12;
    ctx.strokeStyle = `rgba(222,196,140,${0.2 + rng() * 0.24})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  // ausgetretene Mulden — Lehm wird da hell, wo man oft geht
  for (const p of scatter(w, h, 90, seed + 31, 0.9)) {
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 34 + p.r1 * 22);
    g.addColorStop(0, `rgba(214,192,152,${0.14 + p.r2 * 0.12})`);
    g.addColorStop(1, 'rgba(214,192,152,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 34 + p.r1 * 22, 0, Math.PI * 2);
    ctx.fill();
  }
}

function floorPlanks(ctx, w, h, seed, tone = 0) {
  const base = tone ? [150, 112, 70] : [128, 96, 62];
  const pw = 58;
  for (let i = 0; i * pw < w; i++) {
    const x = i * pw;
    const t = hash2(i, 3, seed);
    const c = mix(base, shade(base, 1.32), t);
    const g = ctx.createLinearGradient(x, 0, x + pw, 0);
    g.addColorStop(0, rgb(shade(c, 0.86)));
    g.addColorStop(0.2, rgb(c));
    g.addColorStop(0.85, rgb(shade(c, 1.06)));
    g.addColorStop(1, rgb(shade(c, 0.7)));
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, pw, h);

    // Maserung
    ctx.strokeStyle = 'rgba(66,42,22,0.14)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 5; k++) {
      const xx = x + pw * (0.12 + k * 0.19);
      ctx.beginPath();
      ctx.moveTo(xx, 0);
      for (let y = 0; y <= h; y += 26) ctx.lineTo(xx + Math.sin(y * 0.05 + i) * 2.2, y);
      ctx.stroke();
    }
    // Astloch
    if (t > 0.72) {
      const ky = (hash2(i, 9, seed)) * h;
      ctx.fillStyle = 'rgba(72,46,24,0.4)';
      ctx.beginPath();
      ctx.ellipse(x + pw * 0.5, ky, 4.2, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Stoßfuge
    ctx.fillStyle = 'rgba(48,30,16,0.4)';
    ctx.fillRect(x + pw - 1.5, 0, 1.8, h);
  }
  // Querfugen
  ctx.fillStyle = 'rgba(48,30,16,0.22)';
  for (let y = CELL * 2; y < h; y += CELL * 2) ctx.fillRect(0, y, w, 1.6);
}

function floorFlagstone(ctx, w, h, seed) {
  ctx.fillStyle = '#5a5652';
  ctx.fillRect(0, 0, w, h);
  const s = 46;
  for (let r = 0; r * s < h; r++) {
    for (let c = 0; c * s < w; c++) {
      const t = hash2(c, r, seed);
      const col = mix([132, 128, 121], [178, 174, 165], t);
      const x = c * s + 2;
      const y = r * s + 2;
      ctx.fillStyle = rgb(col);
      ctx.beginPath();
      ctx.roundRect(x, y, s - 4, s - 4, 3);
      ctx.fill();
      // abgelaufener Glanz
      const g = ctx.createLinearGradient(x, y, x, y + s);
      g.addColorStop(0, 'rgba(255,255,255,0.14)');
      g.addColorStop(0.6, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.14)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x, y, s - 4, s - 4, 3);
      ctx.fill();
      // Sprenkel
      if (t > 0.6) {
        ctx.fillStyle = 'rgba(70,66,60,0.3)';
        ctx.beginPath();
        ctx.arc(x + s * 0.3, y + s * 0.6, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function floorParquet(ctx, w, h, seed) {
  const b = 34;
  for (let r = 0; r * b < h; r++) {
    for (let c = 0; c * b < w; c++) {
      const t = hash2(c, r, seed);
      const horiz = (c + r) % 2 === 0;
      const col = mix([148, 106, 62], [190, 146, 92], t);
      ctx.fillStyle = rgb(col);
      ctx.fillRect(c * b, r * b, b, b);
      ctx.strokeStyle = 'rgba(80,50,24,0.3)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        if (horiz) {
          const y = r * b + (k + 0.5) * (b / 4);
          ctx.moveTo(c * b, y); ctx.lineTo(c * b + b, y);
        } else {
          const x = c * b + (k + 0.5) * (b / 4);
          ctx.moveTo(x, r * b); ctx.lineTo(x, r * b + b);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(60,36,16,0.35)';
      ctx.strokeRect(c * b + 0.5, r * b + 0.5, b - 1, b - 1);
    }
  }
  // Wachsglanz
  const g = ctx.createLinearGradient(0, 0, w * 0.6, h);
  g.addColorStop(0, 'rgba(255,240,210,0.16)');
  g.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// --- Wandschmuck --------------------------------------------------------
// Fest eingebacken, nicht platzierbar: eine leere Wand über dem halben
// Bildschirm wirkt tot, egal wie gut die Textur ist.

function hangingHerbs(ctx, x, y) {
  ctx.strokeStyle = '#6b5535';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 9);
  ctx.stroke();
  const rng = makeRng(1301 + (x | 0));
  for (let i = 0; i < 13; i++) {
    const a = Math.PI / 2 + (rng() - 0.5) * 1.5;
    const len = 22 + rng() * 16;
    const c = rng() > 0.5 ? '#6d7f4a' : '#8a7a3e';
    ctx.strokeStyle = c;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y + 9);
    ctx.quadraticCurveTo(
      x + Math.cos(a) * len * 0.5, y + 9 + Math.sin(a) * len * 0.5,
      x + Math.cos(a) * len * 0.5, y + 9 + Math.sin(a) * len
    );
    ctx.stroke();
  }
  // Bindung
  ctx.fillStyle = '#a8874c';
  ctx.beginPath();
  ctx.roundRect(x - 5, y + 7, 10, 6, 2);
  ctx.fill();
}

function wallPicture(ctx, x, y) {
  const w = 46, h = 36;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.roundRect(x - w / 2 + 3, y + 3, w, h, 3);
  ctx.fill();
  // Rahmen
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#8d6a3f');
  g.addColorStop(1, '#5a4126');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y, w, h, 3);
  ctx.fill();
  // Bild: kleine Insel bei Sonnenuntergang
  const iy = y + 5;
  const ih = h - 10;
  const sky = ctx.createLinearGradient(0, iy, 0, iy + ih);
  sky.addColorStop(0, '#f0a45e');
  sky.addColorStop(0.6, '#e6d3a0');
  sky.addColorStop(1, '#5f89a8');
  ctx.fillStyle = sky;
  ctx.fillRect(x - w / 2 + 5, iy, w - 10, ih);
  ctx.fillStyle = '#c98a4c';
  ctx.beginPath();
  ctx.arc(x + 6, iy + ih * 0.42, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f6b48';
  ctx.beginPath();
  ctx.ellipse(x - 3, iy + ih * 0.78, 12, 5, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x - w / 2 + 5, iy, w - 10, 2);
  // Nagel
  ctx.fillStyle = '#4a453e';
  ctx.beginPath();
  ctx.arc(x, y - 4, 2, 0, Math.PI * 2);
  ctx.fill();
}

function wallRope(ctx, x, y) {
  ctx.strokeStyle = '#a58a58';
  ctx.lineWidth = 4;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x, y + 18 + i * 3, 15 - i * 3, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,240,200,0.2)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y + 17, 15, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = '#4a453e';
  ctx.beginPath();
  ctx.arc(x, y + 2, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function wallWreath(ctx, x, y) {
  const r = 20;
  ctx.strokeStyle = '#5c6f42';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(x, y + r, r, 0, Math.PI * 2);
  ctx.stroke();
  const rng = makeRng(4409);
  for (let i = 0; i < 30; i++) {
    const a = rng() * Math.PI * 2;
    const rr = r + (rng() - 0.5) * 8;
    ctx.fillStyle = rng() > 0.72 ? '#c8748a' : (rng() > 0.4 ? '#728a4e' : '#93a85e');
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * rr, y + r + Math.sin(a) * rr, 3.4, 2.2, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // Schleife
  ctx.fillStyle = '#b06a62';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 2 - 2);
    ctx.quadraticCurveTo(x + s * 12, y + r * 2 + 2, x + s * 9, y + r * 2 + 11);
    ctx.quadraticCurveTo(x + s * 3, y + r * 2 + 6, x, y + r * 2 - 2);
    ctx.fill();
  }
}

function wallDecor(ctx, w, room, wins) {
  // Freie Plätze suchen: alles, was weit genug von einem Fenster weg ist
  const slots = [];
  for (let i = 1; i <= 7; i++) {
    const x = (w / 8) * i;
    if (wins.some(win => x > win.x - 58 && x < win.x + win.w + 58)) continue;
    slots.push(x);
  }
  if (!slots.length) return;

  const pick = (n) => slots[Math.min(slots.length - 1, Math.round((slots.length - 1) * n))];

  ctx.save();
  switch (room.wall) {
    case 'thatch':
      hangingHerbs(ctx, pick(0.1), 24);
      if (slots.length > 1) hangingHerbs(ctx, pick(0.9), 30);
      break;
    case 'logs':
      wallRope(ctx, pick(0.08), 30);
      if (slots.length > 1) wallPicture(ctx, pick(0.95), 34);
      break;
    case 'stone':
      wallPicture(ctx, pick(0.06), 40);
      if (slots.length > 1) hangingHerbs(ctx, pick(0.94), 28);
      break;
    default:
      wallWreath(ctx, pick(0.06), 32);
      if (slots.length > 1) wallPicture(ctx, pick(0.95), 38);
      break;
  }
  ctx.restore();
}

// --- Raumhülle ----------------------------------------------------------

function windowLayout(room, w) {
  const n = room.windows;
  const ww = 84;
  const wh = 72;
  const y = 26;
  const out = [];
  for (let i = 0; i < n; i++) {
    const cx = (w / (n + 1)) * (i + 1);
    out.push({ x: Math.round(cx - ww / 2), y, w: ww, h: wh });
  }
  return out;
}

/**
 * Rückwand + Boden in einem Sprite. Die Fensteröffnungen bleiben
 * transparent — dahinter malt der Renderer den aktuellen Himmel.
 */
export function getRoomShell(level) {
  const key = `shell${level}`;
  if (shellCache.has(key)) return shellCache.get(key);

  const room = getRoom(level);
  if (!room) return null;

  const w = room.cols * CELL;
  const floorH = room.rows * CELL;
  const h = WALL_H + floorH + FLOOR_PAD;
  const { cv, ctx } = make(w, h);
  const seed = 4100 + level * 97;

  // --- Wand ---
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, WALL_H);
  ctx.clip();
  if (room.wall === 'thatch') wallThatch(ctx, w, WALL_H, seed);
  else if (room.wall === 'logs') wallLogs(ctx, w, WALL_H, seed);
  else if (room.wall === 'stone') wallStone(ctx, w, WALL_H, seed);
  else wallTimber(ctx, w, WALL_H, seed);
  ctx.restore();

  // Deckenschatten oben, Aufhellung Richtung Boden
  const wg = ctx.createLinearGradient(0, 0, 0, WALL_H);
  wg.addColorStop(0, 'rgba(24,16,10,0.45)');
  wg.addColorStop(0.45, 'rgba(24,16,10,0.06)');
  wg.addColorStop(1, 'rgba(24,16,10,0.2)');
  ctx.fillStyle = wg;
  ctx.fillRect(0, 0, w, WALL_H);

  const wins = windowLayout(room, w);
  wallDecor(ctx, w, room, wins);

  // --- Boden ---
  ctx.save();
  ctx.translate(0, WALL_H);
  ctx.beginPath();
  ctx.rect(0, 0, w, floorH + FLOOR_PAD);
  ctx.clip();
  if (room.floor === 'earth') floorEarth(ctx, w, floorH + FLOOR_PAD, seed);
  else if (room.floor === 'planks') floorPlanks(ctx, w, floorH + FLOOR_PAD, seed, 0);
  else if (room.floor === 'flagstone') floorFlagstone(ctx, w, floorH + FLOOR_PAD, seed);
  else floorParquet(ctx, w, floorH + FLOOR_PAD, seed);
  ctx.restore();

  // Der Boden liegt grundsätzlich im Halbschatten — sonst ist er heller
  // als die Wand und das Bild kippt. Die Lichtbahnen aus den Fenstern
  // heben ihn danach wieder gezielt an.
  ctx.fillStyle = 'rgba(52,30,12,0.14)';
  ctx.fillRect(0, WALL_H, w, floorH + FLOOR_PAD);

  // Schatten der Wand auf den Boden
  const fg = ctx.createLinearGradient(0, WALL_H, 0, WALL_H + 76);
  fg.addColorStop(0, 'rgba(20,12,6,0.55)');
  fg.addColorStop(1, 'rgba(20,12,6,0)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, WALL_H, w, 76);

  // Seitliche Wände nur angedeutet: ein Schattenkeil links und rechts.
  // Das reicht, damit der Boden als Raum gelesen wird und nicht als Fläche.
  for (const side of [0, 1]) {
    const sg = ctx.createLinearGradient(side ? w : 0, 0, side ? w - 74 : 74, 0);
    sg.addColorStop(0, 'rgba(14,9,5,0.5)');
    sg.addColorStop(1, 'rgba(14,9,5,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(side ? w - 74 : 0, WALL_H, 74, floorH + FLOOR_PAD);
  }

  // Vordere Kante: der Raum hört auf, dahinter ist nichts
  const eg = ctx.createLinearGradient(0, h, 0, h - 46);
  eg.addColorStop(0, 'rgba(10,6,3,0.6)');
  eg.addColorStop(1, 'rgba(10,6,3,0)');
  ctx.fillStyle = eg;
  ctx.fillRect(0, h - 46, w, 46);

  // Ecken abdunkeln, damit der Raum Tiefe bekommt
  const vign = ctx.createRadialGradient(w / 2, WALL_H + floorH * 0.42, w * 0.14,
    w / 2, WALL_H + floorH * 0.42, w * 0.76);
  vign.addColorStop(0, 'rgba(0,0,0,0)');
  vign.addColorStop(1, 'rgba(12,8,4,0.4)');
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, w, h);

  // Sockelleiste als Trennung Wand/Boden
  ctx.fillStyle = 'rgba(58,40,24,0.9)';
  ctx.fillRect(0, WALL_H - 7, w, 9);
  ctx.fillStyle = 'rgba(255,225,180,0.14)';
  ctx.fillRect(0, WALL_H - 7, w, 2);

  // --- Fensteröffnungen ausstanzen ---
  ctx.globalCompositeOperation = 'destination-out';
  for (const win of wins) {
    ctx.beginPath();
    ctx.roundRect(win.x, win.y, win.w, win.h, 8);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  const out = { canvas: cv, w, h, floorY: WALL_H, windows: wins, room };
  shellCache.set(key, out);
  return out;
}

/** Fensterrahmen, Sprossen und Vorhänge — kommen NACH dem Himmel */
export function getRoomTrim(level) {
  const key = `trim${level}`;
  if (trimCache.has(key)) return trimCache.get(key);

  const shell = getRoomShell(level);
  if (!shell) return null;
  const { cv, ctx } = make(shell.w, shell.h);
  const room = shell.room;

  for (const win of shell.windows) {
    // Laibung innen
    const inner = ctx.createLinearGradient(win.x, win.y, win.x, win.y + win.h);
    inner.addColorStop(0, 'rgba(0,0,0,0.35)');
    inner.addColorStop(0.4, 'rgba(0,0,0,0)');
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.roundRect(win.x, win.y, win.w, win.h, 8);
    ctx.fill();

    // Sprossen
    ctx.strokeStyle = room.wall === 'stone' ? '#6b6560' : '#5a4028';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(win.x + win.w / 2, win.y);
    ctx.lineTo(win.x + win.w / 2, win.y + win.h);
    ctx.moveTo(win.x, win.y + win.h * 0.5);
    ctx.lineTo(win.x + win.w, win.y + win.h * 0.5);
    ctx.stroke();

    // Rahmen
    ctx.lineWidth = 8;
    ctx.strokeStyle = room.wall === 'stone' ? '#77716a' : '#68492c';
    ctx.beginPath();
    ctx.roundRect(win.x, win.y, win.w, win.h, 8);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,230,190,0.28)';
    ctx.beginPath();
    ctx.roundRect(win.x - 2, win.y - 2, win.w + 4, win.h + 4, 9);
    ctx.stroke();

    // Fensterbank
    const sy = win.y + win.h + 1;
    const g = ctx.createLinearGradient(0, sy, 0, sy + 11);
    g.addColorStop(0, '#8a6a45');
    g.addColorStop(1, '#4f381f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(win.x - 9, sy, win.w + 18, 11, 3);
    ctx.fill();

    // Vorhang links/rechts, leicht gerafft
    for (const side of [-1, 1]) {
      const cxw = side < 0 ? win.x - 6 : win.x + win.w - 16;
      const grd = ctx.createLinearGradient(cxw, 0, cxw + 22, 0);
      grd.addColorStop(0, side < 0 ? 'rgba(178,96,86,0.92)' : 'rgba(150,74,66,0.92)');
      grd.addColorStop(0.5, 'rgba(206,124,110,0.9)');
      grd.addColorStop(1, side < 0 ? 'rgba(146,72,64,0.9)' : 'rgba(178,96,86,0.92)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(cxw, win.y - 10);
      ctx.lineTo(cxw + 22, win.y - 10);
      ctx.quadraticCurveTo(cxw + 14, win.y + win.h * 0.5, cxw + 20, win.y + win.h * 0.86);
      ctx.quadraticCurveTo(cxw + 10, win.y + win.h * 0.6, cxw, win.y + win.h * 0.3);
      ctx.closePath();
      ctx.fill();
      // Falten
      ctx.strokeStyle = 'rgba(90,36,32,0.3)';
      ctx.lineWidth = 1.4;
      for (let k = 1; k < 3; k++) {
        const xx = cxw + k * 7;
        ctx.beginPath();
        ctx.moveTo(xx, win.y - 8);
        ctx.quadraticCurveTo(xx - 3, win.y + win.h * 0.4, xx + 2, win.y + win.h * 0.7);
        ctx.stroke();
      }
    }
    // Gardinenstange
    ctx.fillStyle = '#4a3722';
    ctx.beginPath();
    ctx.roundRect(win.x - 14, win.y - 14, win.w + 28, 6, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,224,180,0.3)';
    ctx.fillRect(win.x - 14, win.y - 14, win.w + 28, 1.6);
  }

  const out = { canvas: cv, w: shell.w, h: shell.h };
  trimCache.set(key, out);
  return out;
}

// --- Möbel --------------------------------------------------------------

// Kleine Helfer, damit alle Möbel dieselbe Bildsprache haben
function woodBoard(ctx, x, y, w, h, tone = 1, r = 3) {
  const base = shade([146, 106, 66], tone);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, rgb(shade(base, 1.16)));
  g.addColorStop(0.5, rgb(base));
  g.addColorStop(1, rgb(shade(base, 0.72)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,38,18,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Maserung
  ctx.strokeStyle = 'rgba(70,44,22,0.16)';
  const lines = Math.max(1, Math.round(h / 7));
  for (let i = 1; i < lines; i++) {
    const yy = y + (h / lines) * i;
    ctx.beginPath();
    ctx.moveTo(x + 2, yy);
    for (let xx = x + 2; xx <= x + w - 2; xx += 12) ctx.lineTo(xx, yy + Math.sin(xx * 0.2) * 0.8);
    ctx.stroke();
  }
}

function softShadow(ctx, cx, cy, rx, ry, a = 0.3) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, `rgba(20,12,6,${a})`);
  g.addColorStop(1, 'rgba(20,12,6,0)');
  ctx.fillStyle = g;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / Math.max(rx, ry));
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Wie hoch ein Möbelstück über seine Standfläche hinausragt
const LIFT = {
  rug_straw: 0, rug_woven: 0,
  bed_hay: 26, bed_frame: 46, table: 44, stool: 34,
  chest: 40, shelf: 84, bookshelf: 96, hearth: 104,
  lamp: 74, candles: 34, plant: 62,
};

const PAINTERS = {
  // --- Teppiche (flach) ---
  rug_straw(ctx, w, h) {
    const cx = w / 2, cy = h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    // Rund geflochten statt rechteckig — sieht handgemacht aus und
    // konkurriert nicht mit dem Fliesenraster darunter.
    const rw = w * 0.42, rh = h * 0.38;
    ctx.fillStyle = '#a68d5c';
    ctx.beginPath();
    ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spiralgeflecht
    ctx.lineCap = 'round';
    for (let k = 1; k <= 7; k++) {
      const f = k / 7;
      ctx.strokeStyle = k % 2
        ? `rgba(206,182,130,${0.5 - f * 0.12})`
        : `rgba(146,120,72,${0.42 - f * 0.1})`;
      ctx.lineWidth = rw / 8.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, rw * f, rh * f, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Halmstruktur quer über die Spirale
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 150; i++) {
      const a = hash2(i, 1, 88) * Math.PI * 2;
      const r = Math.sqrt(hash2(i, 2, 88));
      const x = Math.cos(a) * rw * r;
      const y = Math.sin(a) * rh * r;
      ctx.strokeStyle = `rgba(236,214,164,${hash2(i, 3, 88) * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a + 1.57) * 6, y + Math.sin(a + 1.57) * 5);
      ctx.stroke();
    }
    // Weicher Rand statt harter Kontur
    ctx.strokeStyle = 'rgba(122,100,58,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },

  rug_woven(ctx, w, h) {
    const cx = w / 2, cy = h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    // Bewusst weiche Kanten und gedeckte Farben: ein kräftig umrandetes
    // Rechteck sieht von oben aus wie ein Bild am Boden, nicht wie ein Teppich.
    const rw = w * 0.45, rh = h * 0.40;
    ctx.fillStyle = '#9a6156';
    ctx.beginPath();
    ctx.roundRect(-rw, -rh, rw * 2, rh * 2, 14);
    ctx.fill();

    // Innenfeld etwas dunkler, ohne harte Linie
    const inner = ctx.createRadialGradient(0, 0, 4, 0, 0, rw);
    inner.addColorStop(0, 'rgba(120,72,64,0.55)');
    inner.addColorStop(1, 'rgba(120,72,64,0)');
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.roundRect(-rw, -rh, rw * 2, rh * 2, 14);
    ctx.fill();

    // Bordüre: gewebt statt gemalt — zwei feine Linien in Wollfarben
    ctx.strokeStyle = 'rgba(216,190,146,0.7)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(-rw + 11, -rh + 11, rw * 2 - 22, rh * 2 - 22, 9);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(122,88,78,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-rw + 17, -rh + 17, rw * 2 - 34, rh * 2 - 34, 7);
    ctx.stroke();

    // Rautenmuster, abwechselnd sandfarben und moosgrün — deutlich blasser
    const dw = (rw * 2 - 48) / 3;
    for (let i = 0; i < 3; i++) {
      const dx = -rw + 24 + dw * (i + 0.5);
      ctx.fillStyle = i % 2 ? 'rgba(126,148,120,0.42)' : 'rgba(222,198,150,0.46)';
      ctx.beginPath();
      ctx.moveTo(dx, -rh * 0.36);
      ctx.lineTo(dx + dw * 0.3, 0);
      ctx.lineTo(dx, rh * 0.36);
      ctx.lineTo(dx - dw * 0.3, 0);
      ctx.closePath();
      ctx.fill();
    }

    // Flor-Textur — feine Wollstruktur in beide Richtungen
    for (let i = 0; i < 420; i++) {
      const x = (hash2(i, 1, 71) - 0.5) * rw * 2;
      const y = (hash2(i, 2, 71) - 0.5) * rh * 2;
      const v = hash2(i, 3, 71);
      ctx.fillStyle = v > 0.5
        ? `rgba(255,238,214,${(v - 0.5) * 0.16})`
        : `rgba(74,42,36,${(0.5 - v) * 0.16})`;
      ctx.fillRect(x, y, 2, 2.6);
    }

    // Fransen an den Schmalseiten
    ctx.strokeStyle = 'rgba(214,190,152,0.7)';
    ctx.lineWidth = 1.6;
    for (let x = -rw + 8; x < rw - 4; x += 7) {
      ctx.beginPath(); ctx.moveTo(x, -rh + 1); ctx.lineTo(x + 1, -rh - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, rh - 1); ctx.lineTo(x - 1, rh + 6); ctx.stroke();
    }
    ctx.restore();
  },

  // --- Betten ---
  bed_hay(ctx, w, h) {
    const cx = w / 2, base = h - 10;
    softShadow(ctx, cx, base, w * 0.38, 13, 0.34);

    const bw = w * 0.74, left = cx - bw / 2, top = base - 34, bh = 32;
    ctx.save();

    // Umrandung aus vier Ästen — hält das Stroh zusammen
    for (const [x, y, ww, hh] of [
      [left - 4, top - 4, bw + 8, 7],
      [left - 4, base - 6, bw + 8, 7],
      [left - 5, top - 4, 7, bh + 10],
      [left + bw - 2, top - 4, 7, bh + 10],
    ]) woodBoard(ctx, x, y, ww, hh, 0.7, 3);

    // Strohbett innerhalb der Umrandung
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(left, top, bw, bh, 5);
    ctx.clip();
    const g = ctx.createLinearGradient(0, top, 0, top + bh);
    g.addColorStop(0, '#dcc079');
    g.addColorStop(1, '#a68740');
    ctx.fillStyle = g;
    ctx.fillRect(left, top, bw, bh);

    // Halme kreuz und quer
    const rng = makeRng(31);
    for (let i = 0; i < 220; i++) {
      const x = left + rng() * bw;
      const y = top + rng() * bh;
      const ang = (rng() - 0.5) * 1.1;
      const l = 7 + rng() * 13;
      ctx.strokeStyle = `rgba(${208 + rng() * 36},${176 + rng() * 34},${96 + rng() * 46},0.72)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l);
      ctx.stroke();
    }
    // Kuhle in der Mitte — da liegt jemand regelmäßig
    const hollow = ctx.createRadialGradient(cx + bw * 0.05, top + bh * 0.5, 3,
      cx + bw * 0.05, top + bh * 0.5, bw * 0.3);
    hollow.addColorStop(0, 'rgba(110,86,40,0.3)');
    hollow.addColorStop(1, 'rgba(110,86,40,0)');
    ctx.fillStyle = hollow;
    ctx.fillRect(left, top, bw, bh);
    ctx.restore();

    // Wolldecke, quer über das Fußende gelegt
    const dw = bw * 0.42;
    const dx = left + bw - dw - 4;
    const dg = ctx.createLinearGradient(0, top + 2, 0, base - 8);
    dg.addColorStop(0, '#7c7488');
    dg.addColorStop(1, '#544d63');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.roundRect(dx, top + 3, dw, bh - 8, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.lineWidth = 1.2;
    for (let i = 1; i < 4; i++) {
      const xx = dx + (dw / 4) * i;
      ctx.beginPath();
      ctx.moveTo(xx, top + 4);
      ctx.lineTo(xx - 2, base - 10);
      ctx.stroke();
    }
    // umgeschlagene Kante
    ctx.fillStyle = 'rgba(158,150,176,0.85)';
    ctx.beginPath();
    ctx.roundRect(dx - 3, top + 3, 9, bh - 8, 3);
    ctx.fill();

    // Kissen aus Sackleinen am Kopfende
    ctx.fillStyle = '#cbbfa3';
    ctx.beginPath();
    ctx.roundRect(left + 5, top + 5, bw * 0.26, bh - 12, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(146,130,100,0.4)';
    ctx.beginPath();
    ctx.roundRect(left + 8, top + bh * 0.52, bw * 0.2, 5, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,250,232,0.3)';
    ctx.beginPath();
    ctx.roundRect(left + 7, top + 6, bw * 0.22, 4, 2);
    ctx.fill();
    ctx.restore();
  },

  bed_frame(ctx, w, h) {
    const cx = w / 2, base = h - 8;
    softShadow(ctx, cx, base, w * 0.38, 13, 0.36);
    const bw = w * 0.76, left = cx - bw / 2;
    // Beine
    woodBoard(ctx, left + 4, base - 22, 9, 22, 0.8);
    woodBoard(ctx, left + bw - 13, base - 22, 9, 22, 0.8);
    // Kopfteil
    woodBoard(ctx, left, base - 66, 11, 52, 1.05, 4);
    woodBoard(ctx, left, base - 68, bw * 0.22, 12, 1.1, 4);
    // Rahmen
    woodBoard(ctx, left, base - 30, bw, 14, 1.0, 4);
    // Matratze
    const mg = ctx.createLinearGradient(0, base - 44, 0, base - 26);
    mg.addColorStop(0, '#efe6d2');
    mg.addColorStop(1, '#cbbfa4');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.roundRect(left + 8, base - 44, bw - 16, 18, 6);
    ctx.fill();
    // Decke
    const dg = ctx.createLinearGradient(0, base - 42, 0, base - 24);
    dg.addColorStop(0, '#6f8f7a');
    dg.addColorStop(1, '#4e6b59');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.roundRect(left + bw * 0.34, base - 42, bw * 0.6, 18, 5);
    ctx.fill();
    // Karomuster
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1.4;
    for (let i = 1; i < 5; i++) {
      const xx = left + bw * 0.34 + (bw * 0.6 / 5) * i;
      ctx.beginPath(); ctx.moveTo(xx, base - 42); ctx.lineTo(xx, base - 24); ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(left + bw * 0.34, base - 34); ctx.lineTo(left + bw * 0.94, base - 34);
    ctx.stroke();
    // Kissen
    ctx.fillStyle = '#fbf6e9';
    ctx.beginPath();
    ctx.roundRect(left + 12, base - 50, bw * 0.26, 15, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(190,175,150,0.5)';
    ctx.beginPath();
    ctx.roundRect(left + 14, base - 40, bw * 0.24, 4, 2);
    ctx.fill();
  },

  table(ctx, w, h) {
    const cx = w / 2, base = h - 8;
    softShadow(ctx, cx, base, w * 0.34, 12, 0.34);
    const tw = w * 0.72, left = cx - tw / 2;
    // Beine
    woodBoard(ctx, left + 8, base - 34, 10, 34, 0.78);
    woodBoard(ctx, left + tw - 18, base - 34, 10, 34, 0.78);
    // Zarge
    woodBoard(ctx, left + 10, base - 34, tw - 20, 7, 0.85, 2);
    // Platte
    woodBoard(ctx, left, base - 44, tw, 13, 1.1, 4);
    ctx.fillStyle = 'rgba(255,238,200,0.22)';
    ctx.beginPath();
    ctx.roundRect(left + 3, base - 43, tw - 6, 4, 2);
    ctx.fill();
    // Krug und Schale drauf
    ctx.fillStyle = '#a8724a';
    ctx.beginPath();
    ctx.moveTo(cx - 22, base - 44);
    ctx.quadraticCurveTo(cx - 26, base - 58, cx - 20, base - 62);
    ctx.lineTo(cx - 10, base - 62);
    ctx.quadraticCurveTo(cx - 4, base - 58, cx - 8, base - 44);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7c5133';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx - 6, base - 55, 5, -1.2, 1.2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,235,200,0.24)';
    ctx.beginPath();
    ctx.ellipse(cx - 19, base - 56, 2.4, 6, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Obstschale
    ctx.fillStyle = '#c9b48e';
    ctx.beginPath();
    ctx.ellipse(cx + 16, base - 46, 13, 5, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 16, base - 46, 13, 4, 0, 0, Math.PI);
    ctx.fillStyle = '#a8926c';
    ctx.fill();
    for (const [dx, c] of [[-5, '#c8483c'], [1, '#d8843a'], [6, '#b2543e']]) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(cx + 16 + dx, base - 50, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(cx + 15 + dx, base - 51.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  stool(ctx, w, h) {
    const cx = w / 2, base = h - 8;
    softShadow(ctx, cx, base, 20, 8, 0.32);
    // Drei Beine
    for (const dx of [-13, 0, 13]) {
      ctx.save();
      ctx.translate(cx + dx, base - 24);
      ctx.rotate(dx * 0.006);
      woodBoard(ctx, -3.5, 0, 7, 24, 0.74, 2);
      ctx.restore();
    }
    // Sitzfläche rund
    const g = ctx.createLinearGradient(0, base - 32, 0, base - 22);
    g.addColorStop(0, '#b08050');
    g.addColorStop(1, '#7d5734');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, base - 27, 21, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,236,200,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx - 3, base - 29, 14, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,38,18,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, base - 27, 21, 8.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  },

  chest(ctx, w, h) {
    const cx = w / 2, base = h - 8;
    softShadow(ctx, cx, base, 26, 10, 0.34);
    const bw = 48, left = cx - bw / 2;
    woodBoard(ctx, left, base - 26, bw, 26, 0.95, 3);
    // Deckel gewölbt
    const g = ctx.createLinearGradient(0, base - 44, 0, base - 26);
    g.addColorStop(0, '#b98a58');
    g.addColorStop(1, '#8a6238');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(left, base - 26);
    ctx.quadraticCurveTo(cx, base - 48, left + bw, base - 26);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,38,18,0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Eisenbänder
    ctx.fillStyle = '#54504b';
    for (const fx of [0.22, 0.78]) {
      const x = left + bw * fx - 3;
      ctx.fillRect(x, base - 26, 6, 26);
      ctx.beginPath();
      ctx.moveTo(x, base - 26);
      ctx.quadraticCurveTo(cx, base - 46, x + 6, base - 26);
      ctx.lineTo(x, base - 26);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (const fx of [0.22, 0.78]) ctx.fillRect(left + bw * fx - 3, base - 26, 2, 26);
    // Schloss
    ctx.fillStyle = '#c8a24c';
    ctx.beginPath();
    ctx.roundRect(cx - 6, base - 25, 12, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#3a3530';
    ctx.beginPath();
    ctx.arc(cx, base - 19, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,244,200,0.4)';
    ctx.fillRect(cx - 6, base - 25, 12, 2);
  },

  shelf(ctx, w, h) {
    const cx = w / 2, base = h - 8;
    softShadow(ctx, cx, base, 24, 8, 0.3);
    const bw = 52, left = cx - bw / 2, top = base - 78;
    // Seitenwangen
    woodBoard(ctx, left, top, 7, 78, 0.85, 2);
    woodBoard(ctx, left + bw - 7, top, 7, 78, 0.85, 2);
    // Böden
    for (const fy of [0, 0.36, 0.72, 1]) {
      woodBoard(ctx, left, top + 74 * fy, bw, 6, 1.0, 2);
    }
    // Krüge und Körbe
    const put = (x, y, type) => {
      if (type === 0) {
        ctx.fillStyle = '#a8724a';
        ctx.beginPath();
        ctx.ellipse(x, y - 8, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a5a38';
        ctx.fillRect(x - 3, y - 19, 6, 6);
        ctx.fillStyle = 'rgba(255,235,200,0.26)';
        ctx.beginPath();
        ctx.ellipse(x - 2.5, y - 10, 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 1) {
        ctx.fillStyle = '#b99a5e';
        ctx.beginPath();
        ctx.moveTo(x - 9, y);
        ctx.lineTo(x - 7, y - 13);
        ctx.lineTo(x + 7, y - 13);
        ctx.lineTo(x + 9, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,96,50,0.6)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x - 9 + i, y - (13 / 3) * i);
          ctx.lineTo(x + 9 - i, y - (13 / 3) * i);
          ctx.stroke();
        }
      } else {
        // Bücherstapel
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = ['#8a5250', '#4f6b7a', '#6b7a4f'][i];
          ctx.fillRect(x - 10 + i, y - 5 - i * 5, 20 - i * 2, 5);
        }
      }
    };
    put(cx - 11, top + 74 * 0.36, 0);
    put(cx + 12, top + 74 * 0.36, 2);
    put(cx, top + 74 * 0.72, 1);
    put(cx + 10, top + 74, 0);
  },

  bookshelf(ctx, w, h) {
    const cx = w / 2, base = h - 8;
    softShadow(ctx, cx, base, w * 0.34, 10, 0.34);
    const bw = w * 0.7, left = cx - bw / 2, top = base - 92;
    // Korpus
    woodBoard(ctx, left - 4, top - 6, bw + 8, 10, 1.05, 3);
    woodBoard(ctx, left, top, 8, 92, 0.8, 2);
    woodBoard(ctx, left + bw - 8, top, 8, 92, 0.8, 2);
    ctx.fillStyle = 'rgba(52,34,18,0.55)';
    ctx.fillRect(left + 8, top, bw - 16, 92);
    const rows = 4;
    for (let r = 0; r <= rows; r++) {
      woodBoard(ctx, left, top + (92 / rows) * r - 3, bw, 6, 0.95, 2);
    }
    // Bücher
    const rng = makeRng(917);
    const palette = ['#8d4b46', '#456578', '#6a7a48', '#8a6c3e', '#5b4a72', '#a5713f'];
    for (let r = 0; r < rows; r++) {
      const shelfY = top + (92 / rows) * (r + 1) - 3;
      let x = left + 11;
      const lean = rng() > 0.6;
      while (x < left + bw - 14) {
        const bwd = 4 + rng() * 5;
        const bh = 12 + rng() * 6;
        const c = palette[(rng() * palette.length) | 0];
        ctx.save();
        if (lean && x > left + bw - 34) {
          ctx.translate(x, shelfY);
          ctx.rotate(0.28);
          ctx.fillStyle = c;
          ctx.fillRect(0, -bh, bwd, bh);
          ctx.restore();
        } else {
          ctx.fillStyle = c;
          ctx.fillRect(x, shelfY - bh, bwd, bh);
          ctx.fillStyle = 'rgba(255,255,255,0.14)';
          ctx.fillRect(x, shelfY - bh, 1.2, bh);
          ctx.fillStyle = 'rgba(226,196,120,0.5)';
          ctx.fillRect(x + 1, shelfY - bh + 3, bwd - 2, 1.2);
          ctx.restore();
        }
        x += bwd + 1.2;
      }
    }
    // Kleine Vase oben
    ctx.fillStyle = '#7d95a8';
    ctx.beginPath();
    ctx.ellipse(cx + bw * 0.26, top - 12, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4d6a3d';
    ctx.lineWidth = 1.6;
    for (const a of [-0.5, 0, 0.45]) {
      ctx.beginPath();
      ctx.moveTo(cx + bw * 0.26, top - 18);
      ctx.quadraticCurveTo(cx + bw * 0.26 + a * 14, top - 28, cx + bw * 0.26 + a * 20, top - 34);
      ctx.stroke();
    }
    for (const a of [-0.5, 0, 0.45]) {
      ctx.fillStyle = ['#d8848c', '#e8c26a', '#c98ac0'][([-0.5, 0, 0.45].indexOf(a))];
      ctx.beginPath();
      ctx.arc(cx + bw * 0.26 + a * 20, top - 35, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  hearth(ctx, w, h) {
    const cx = w / 2, base = h - 6;
    softShadow(ctx, cx, base, w * 0.4, 13, 0.4);
    const bw = w * 0.8, left = cx - bw / 2, top = base - 100;

    // Kaminkörper aus Bruchstein
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left, base);
    ctx.lineTo(left, top + 16);
    ctx.quadraticCurveTo(left, top, left + 18, top);
    ctx.lineTo(left + bw - 18, top);
    ctx.quadraticCurveTo(left + bw, top, left + bw, top + 16);
    ctx.lineTo(left + bw, base);
    ctx.closePath();
    ctx.clip();
    wallStone(ctx, w, h, 771);
    ctx.restore();

    // Feuerraum
    const fx = cx, fyTop = base - 62, fw = bw * 0.52, fh = 58;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(fx - fw / 2, base - 4);
    ctx.lineTo(fx - fw / 2, fyTop + 12);
    ctx.quadraticCurveTo(fx, fyTop - 12, fx + fw / 2, fyTop + 12);
    ctx.lineTo(fx + fw / 2, base - 4);
    ctx.closePath();
    ctx.fillStyle = '#1a1310';
    ctx.fill();
    ctx.clip();
    // Rußwand
    const sg = ctx.createLinearGradient(0, fyTop, 0, base);
    sg.addColorStop(0, '#0d0a08');
    sg.addColorStop(1, '#241a14');
    ctx.fillStyle = sg;
    ctx.fillRect(fx - fw, fyTop - 20, fw * 2, fh + 40);
    // Scheite
    for (const [dx, dy, a] of [[-11, -4, 0.2], [8, -2, -0.35], [-2, -11, 0.05]]) {
      ctx.save();
      ctx.translate(fx + dx, base - 10 + dy);
      ctx.rotate(a);
      woodBoard(ctx, -16, -5, 32, 10, 0.55, 5);
      ctx.restore();
    }
    // Glut
    for (let i = 0; i < 22; i++) {
      const gx = fx + (hash2(i, 1, 5) - 0.5) * fw * 0.8;
      const gy = base - 8 - hash2(i, 2, 5) * 9;
      ctx.fillStyle = `rgba(${230 + hash2(i, 3, 5) * 25},${90 + hash2(i, 4, 5) * 70},40,${0.4 + hash2(i, 5, 5) * 0.5})`;
      ctx.beginPath();
      ctx.arc(gx, gy, 1.6 + hash2(i, 6, 5) * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Flammen
    const flame = (ox, scale, c1, c2) => {
      const g = ctx.createLinearGradient(0, base - 12, 0, base - 12 - 40 * scale);
      g.addColorStop(0, c1);
      g.addColorStop(0.55, c2);
      g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(fx + ox - 13 * scale, base - 10);
      ctx.quadraticCurveTo(fx + ox - 15 * scale, base - 28 * scale, fx + ox - 3 * scale, base - 34 * scale);
      ctx.quadraticCurveTo(fx + ox + 2 * scale, base - 44 * scale, fx + ox, base - 52 * scale);
      ctx.quadraticCurveTo(fx + ox + 10 * scale, base - 40 * scale, fx + ox + 11 * scale, base - 28 * scale);
      ctx.quadraticCurveTo(fx + ox + 15 * scale, base - 18 * scale, fx + ox + 13 * scale, base - 10);
      ctx.closePath();
      ctx.fill();
    };
    flame(0, 1, 'rgba(226,86,26,0.92)', 'rgba(255,168,52,0.85)');
    flame(-2, 0.62, 'rgba(255,190,70,0.95)', 'rgba(255,236,170,0.9)');
    flame(3, 0.34, 'rgba(255,244,206,0.95)', 'rgba(255,255,240,0.8)');
    ctx.restore();

    // Kaminsims
    ctx.save();
    const mg = ctx.createLinearGradient(0, top - 4, 0, top + 12);
    mg.addColorStop(0, '#9c8f7c');
    mg.addColorStop(1, '#5e5449');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.roundRect(left - 8, top - 4, bw + 16, 15, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,238,206,0.24)';
    ctx.fillRect(left - 8, top - 4, bw + 16, 3);
    ctx.restore();

    // Deko auf dem Sims: Kerze + Muschel
    ctx.fillStyle = '#e8e0cc';
    ctx.fillRect(cx - bw * 0.3, top - 20, 6, 17);
    ctx.fillStyle = '#ffcf70';
    ctx.beginPath();
    ctx.ellipse(cx - bw * 0.3 + 3, top - 24, 3, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d7b48e';
    ctx.beginPath();
    ctx.ellipse(cx + bw * 0.28, top - 9, 9, 6, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,110,70,0.6)';
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + bw * 0.28, top - 3);
      ctx.lineTo(cx + bw * 0.28 + i * 3.6, top - 14);
      ctx.stroke();
    }

    // Warmer Lichtabfall auf den Boden davor
    const fl = ctx.createRadialGradient(cx, base + 4, 4, cx, base + 4, w * 0.55);
    fl.addColorStop(0, 'rgba(255,170,80,0.32)');
    fl.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = fl;
    ctx.beginPath();
    ctx.ellipse(cx, base + 4, w * 0.55, 24, 0, 0, Math.PI * 2);
    ctx.fill();
  },

  lamp(ctx, w, h) {
    const cx = w / 2, base = h - 8;
    softShadow(ctx, cx, base, 22, 8, 0.3);
    // Fuß
    ctx.fillStyle = '#4b4741';
    ctx.beginPath();
    ctx.ellipse(cx, base - 4, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.ellipse(cx - 2, base - 6, 10, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ständer
    ctx.strokeStyle = '#5a544c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, base - 6);
    ctx.quadraticCurveTo(cx + 4, base - 30, cx, base - 44);
    ctx.stroke();
    // Halteringe
    ctx.strokeStyle = '#6d655a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, base - 52, 11, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    // Kristall
    const g = ctx.createLinearGradient(cx - 10, base - 66, cx + 10, base - 42);
    g.addColorStop(0, 'rgba(228,240,255,0.98)');
    g.addColorStop(0.5, 'rgba(150,186,246,0.95)');
    g.addColorStop(1, 'rgba(96,132,208,0.95)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, base - 68);
    ctx.lineTo(cx + 10, base - 56);
    ctx.lineTo(cx + 6, base - 42);
    ctx.lineTo(cx - 6, base - 42);
    ctx.lineTo(cx - 10, base - 56);
    ctx.closePath();
    ctx.fill();
    // Facetten
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, base - 68); ctx.lineTo(cx, base - 42);
    ctx.moveTo(cx - 10, base - 56); ctx.lineTo(cx + 10, base - 56);
    ctx.stroke();
    // Schein
    const gl = ctx.createRadialGradient(cx, base - 55, 2, cx, base - 55, 34);
    gl.addColorStop(0, 'rgba(200,224,255,0.5)');
    gl.addColorStop(1, 'rgba(200,224,255,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(cx, base - 55, 34, 0, Math.PI * 2);
    ctx.fill();
  },

  candles(ctx, w, h) {
    const cx = w / 2, base = h - 8;
    softShadow(ctx, cx, base, 18, 7, 0.28);
    // Lehmschale
    const g = ctx.createLinearGradient(0, base - 12, 0, base);
    g.addColorStop(0, '#c98f5e');
    g.addColorStop(1, '#8d5f3a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, base - 5, 18, 7, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, base - 5, 18, 6, 0, 0, Math.PI);
    ctx.fillStyle = '#6f4a2c';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,235,200,0.28)';
    ctx.beginPath();
    ctx.ellipse(cx - 5, base - 8, 8, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Drei Kerzen
    const cs = [[-8, 18], [1, 24], [9, 15]];
    for (const [dx, ch] of cs) {
      ctx.fillStyle = '#f2e9d2';
      ctx.fillRect(cx + dx - 3, base - 8 - ch, 6, ch);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(cx + dx - 3, base - 8 - ch, 1.6, ch);
      ctx.fillStyle = 'rgba(160,132,90,0.4)';
      ctx.fillRect(cx + dx - 3, base - 9 - ch, 6, 2);
      // Flamme
      const fg = ctx.createLinearGradient(0, base - 8 - ch - 10, 0, base - 8 - ch);
      fg.addColorStop(0, 'rgba(255,250,220,0.95)');
      fg.addColorStop(0.6, 'rgba(255,190,90,0.9)');
      fg.addColorStop(1, 'rgba(255,140,50,0.55)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(cx + dx, base - 12 - ch, 2.8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      const gl = ctx.createRadialGradient(cx + dx, base - 12 - ch, 1, cx + dx, base - 12 - ch, 16);
      gl.addColorStop(0, 'rgba(255,200,110,0.42)');
      gl.addColorStop(1, 'rgba(255,200,110,0)');
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(cx + dx, base - 12 - ch, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  plant(ctx, w, h) {
    const cx = w / 2, base = h - 8;
    softShadow(ctx, cx, base, 20, 8, 0.3);
    // Topf
    const g = ctx.createLinearGradient(0, base - 26, 0, base);
    g.addColorStop(0, '#c9834e');
    g.addColorStop(1, '#8d5730');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - 16, base - 26);
    ctx.lineTo(cx + 16, base - 26);
    ctx.lineTo(cx + 12, base - 2);
    ctx.quadraticCurveTo(cx, base + 2, cx - 12, base - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a86a3e';
    ctx.beginPath();
    ctx.roundRect(cx - 18, base - 30, 36, 8, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,235,200,0.22)';
    ctx.fillRect(cx - 18, base - 30, 36, 2.4);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, base - 26, 15, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Erde
    ctx.fillStyle = '#4b3826';
    ctx.beginPath();
    ctx.ellipse(cx, base - 27, 13, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Blätter
    const rng = makeRng(613);
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI / 2 + (rng() - 0.5) * 2.3;
      const len = 20 + rng() * 20;
      const ex = cx + Math.cos(a) * len;
      const ey = base - 28 + Math.sin(a) * len;
      const dark = rng() > 0.5;
      ctx.fillStyle = dark ? '#3f6b38' : '#5a9247';
      ctx.beginPath();
      ctx.moveTo(cx, base - 28);
      ctx.quadraticCurveTo(
        cx + Math.cos(a) * len * 0.5 - Math.sin(a) * 9,
        base - 28 + Math.sin(a) * len * 0.5 + Math.cos(a) * 9,
        ex, ey
      );
      ctx.quadraticCurveTo(
        cx + Math.cos(a) * len * 0.5 + Math.sin(a) * 9,
        base - 28 + Math.sin(a) * len * 0.5 - Math.cos(a) * 9,
        cx, base - 28
      );
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, base - 28);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    // Ein paar Blüten
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.7;
      const len = 34 + i * 3;
      ctx.fillStyle = ['#e8a2b8', '#f0d07a', '#c9a2e0'][i];
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * len, base - 28 + Math.sin(a) * len, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * len - 1, base - 29 + Math.sin(a) * len, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};

/**
 * Gebackenes Möbel-Sprite.
 * Breite = Standfläche, Höhe = Standfläche + LIFT (ragt nach oben heraus).
 * Anker ist immer die UNTERE Kante der Standfläche.
 */
export function getFurnitureSprite(id) {
  if (furnCache.has(id)) return furnCache.get(id);
  const def = furnitureById(id);
  if (!def) return null;

  const lift = LIFT[id] || 0;
  const w = def.w * CELL;
  const h = def.h * CELL + lift;
  const { cv, ctx } = make(w, h);

  const painter = PAINTERS[id];
  if (painter) painter(ctx, w, h);

  const out = { canvas: cv, w, h, lift, def };
  furnCache.set(id, out);
  return out;
}

/** Nur für das Möbel-Menü: kleines Vorschaubild auf transparentem Grund */
export function getFurnitureThumb(id, size = 64) {
  const key = `thumb${id}${size}`;
  if (furnCache.has(key)) return furnCache.get(key);
  const sprite = getFurnitureSprite(id);
  if (!sprite) return null;

  const { cv, ctx } = make(size, size);
  const scale = Math.min(size / sprite.w, size / sprite.h) * 0.94;
  const dw = sprite.w * scale;
  const dh = sprite.h * scale;
  ctx.drawImage(sprite.canvas, (size - dw) / 2, size - dh - 1, dw, dh);
  const out = cv;
  furnCache.set(key, out);
  return out;
}

// Anzeigedaten für das Fenster-Rendering
export function roomMetrics(level) {
  const shell = getRoomShell(level);
  if (!shell) return null;
  return { w: shell.w, h: shell.h, floorY: shell.floorY, windows: shell.windows };
}
