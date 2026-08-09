// ============================================
// Tier-Sprites — Reh, Hase, Ziege, Reiher, Huhn, Katze
// ============================================
// Vorher waren die Tiere aus überlappenden Kreisen und geraden Strichen
// gebaut und wirkten wie Klekse. Hier bekommen sie Fellverlauf, Zeichnung,
// Ohren, Augen und eine erkennbare Silhouette.
//
// Alle Sprites zeigen nach rechts; die Blickrichtung wird beim Zeichnen
// gespiegelt. Jedes Sprite wird einmal gebacken.

import { makeRng } from './noise';

// Sprite-Fläche. Großzügig, damit Geweih, Beine und Schwanz Platz haben.
export const A_W = 96;
export const A_H = 80;
export const A_GROUND = A_H - 8;   // Standlinie im Sprite

/** Weicher Fellverlauf: oben heller (Licht), unten dunkler */
function furGradient(ctx, y0, y1, light, mid, dark) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, light);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, dark);
  return g;
}

/** Ein Auge mit Glanzpunkt */
function eye(ctx, x, y, r, dark = '#20180f') {
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
}

/** Bein als leicht geknicktes Segment */
function leg(ctx, x, yTop, yBot, w, color, bend = 0) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, yTop);
  ctx.quadraticCurveTo(x + bend, (yTop + yBot) / 2, x + bend * 0.4, yBot);
  ctx.stroke();
}

function bakeDeer() {
  const cv = document.createElement('canvas');
  cv.width = A_W; cv.height = A_H;
  const ctx = cv.getContext('2d');
  const rng = makeRng(101);
  const cx = A_W / 2 - 4;
  const bodyY = A_GROUND - 20;

  // Hinterbeine
  leg(ctx, cx - 11, bodyY + 3, A_GROUND, 3.4, '#7a4a24', -1.5);
  leg(ctx, cx + 9, bodyY + 3, A_GROUND, 3.4, '#7a4a24', 1);

  // Rumpf
  ctx.fillStyle = furGradient(ctx, bodyY - 12, bodyY + 10, '#c07b40', '#a2612e', '#77441f');
  ctx.beginPath();
  ctx.ellipse(cx, bodyY, 18, 11.5, -0.06, 0, Math.PI * 2);
  ctx.fill();
  // Bauchpartie heller
  ctx.fillStyle = 'rgba(238,214,180,0.55)';
  ctx.beginPath();
  ctx.ellipse(cx - 1, bodyY + 6, 13, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Weiße Tupfen
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = 'rgba(252,242,224,0.6)';
    ctx.beginPath();
    ctx.arc(cx - 10 + rng() * 22, bodyY - 6 + rng() * 9, 1.1 + rng() * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vorderbeine
  leg(ctx, cx - 7, bodyY + 4, A_GROUND, 3.6, '#8b5228', -0.8);
  leg(ctx, cx + 13, bodyY + 4, A_GROUND, 3.6, '#8b5228', 1.4);

  // Hals
  ctx.fillStyle = furGradient(ctx, bodyY - 22, bodyY, '#c07b40', '#a2612e', '#8a5027');
  ctx.beginPath();
  ctx.moveTo(cx + 11, bodyY - 6);
  ctx.quadraticCurveTo(cx + 20, bodyY - 18, cx + 22, bodyY - 24);
  ctx.lineTo(cx + 28, bodyY - 22);
  ctx.quadraticCurveTo(cx + 24, bodyY - 12, cx + 18, bodyY - 1);
  ctx.closePath();
  ctx.fill();

  // Kopf
  const hx = cx + 26, hy = bodyY - 26;
  ctx.fillStyle = furGradient(ctx, hy - 6, hy + 7, '#c98548', '#a86832', '#8a5027');
  ctx.beginPath();
  ctx.ellipse(hx, hy, 8.5, 6, 0.22, 0, Math.PI * 2);
  ctx.fill();
  // Schnauze
  ctx.fillStyle = '#8a5027';
  ctx.beginPath();
  ctx.ellipse(hx + 6.5, hy + 2.6, 4, 3, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2a1c';
  ctx.beginPath();
  ctx.ellipse(hx + 9.4, hy + 3.2, 1.5, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ohren
  ctx.fillStyle = '#96592a';
  ctx.beginPath();
  ctx.ellipse(hx - 4, hy - 6, 3.4, 5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(226,178,150,0.8)';
  ctx.beginPath();
  ctx.ellipse(hx - 4, hy - 6, 1.7, 3, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Geweih
  ctx.strokeStyle = '#7a5c34';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const antler = (baseX, dir) => {
    ctx.beginPath();
    ctx.moveTo(baseX, hy - 5);
    ctx.quadraticCurveTo(baseX + dir * 3, hy - 13, baseX + dir * 5, hy - 19);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(baseX + dir * 3.4, hy - 13);
    ctx.lineTo(baseX + dir * 8, hy - 16);
    ctx.moveTo(baseX + dir * 4.4, hy - 16.5);
    ctx.lineTo(baseX + dir * 0.5, hy - 21);
    ctx.stroke();
    ctx.lineWidth = 2;
  };
  antler(hx + 1, 1);
  antler(hx - 2, -0.4);

  eye(ctx, hx + 2.6, hy - 0.6, 1.5);

  // Wedel
  ctx.fillStyle = '#f2e4cc';
  ctx.beginPath();
  ctx.ellipse(cx - 18, bodyY - 3, 3.2, 4.4, 0.4, 0, Math.PI * 2);
  ctx.fill();

  return cv;
}

function bakeRabbit() {
  const cv = document.createElement('canvas');
  cv.width = A_W; cv.height = A_H;
  const ctx = cv.getContext('2d');
  const rng = makeRng(202);
  const cx = A_W / 2;
  const bodyY = A_GROUND - 9;

  // Hinterläufe
  ctx.fillStyle = '#b99a72';
  ctx.beginPath();
  ctx.ellipse(cx - 9, bodyY + 3, 7, 5, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Rumpf
  ctx.fillStyle = furGradient(ctx, bodyY - 10, bodyY + 8, '#e2cbaa', '#c9ab84', '#a3855f');
  ctx.beginPath();
  ctx.ellipse(cx, bodyY, 13, 9, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // Fellstruktur
  ctx.strokeStyle = 'rgba(140,112,80,0.28)';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 16; i++) {
    const sx = cx - 10 + rng() * 20;
    const sy = bodyY - 6 + rng() * 11;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - 2.5, sy + 1.6);
    ctx.stroke();
  }

  // Vorderpfoten
  ctx.fillStyle = '#d6bd98';
  ctx.beginPath();
  ctx.ellipse(cx + 9, bodyY + 6.5, 4, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Kopf
  const hx = cx + 10, hy = bodyY - 7;
  ctx.fillStyle = furGradient(ctx, hy - 6, hy + 6, '#e8d3b4', '#d2b68e', '#ac8f68');
  ctx.beginPath();
  ctx.ellipse(hx, hy, 7.5, 6.4, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Löffel
  const ear = (ox, rot) => {
    ctx.fillStyle = '#c9ab84';
    ctx.beginPath();
    ctx.ellipse(hx + ox, hy - 11, 3, 9, rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(232,178,168,0.85)';
    ctx.beginPath();
    ctx.ellipse(hx + ox, hy - 11, 1.4, 6.4, rot, 0, Math.PI * 2);
    ctx.fill();
  };
  ear(-3.5, -0.18);
  ear(1.5, 0.1);

  // Schnauze
  ctx.fillStyle = '#f2e2c8';
  ctx.beginPath();
  ctx.ellipse(hx + 5, hy + 2, 3.6, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d8888c';
  ctx.beginPath();
  ctx.ellipse(hx + 7.4, hy + 1.2, 1.2, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Schnurrhaare
  ctx.strokeStyle = 'rgba(120,100,76,0.6)';
  ctx.lineWidth = 0.6;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(hx + 7, hy + 1.6);
    ctx.lineTo(hx + 14, hy + 1.6 + i * 2.4);
    ctx.stroke();
  }

  eye(ctx, hx + 2.4, hy - 1, 1.6);

  // Blume
  ctx.fillStyle = '#f6f2e6';
  ctx.beginPath();
  ctx.arc(cx - 13, bodyY - 3, 4, 0, Math.PI * 2);
  ctx.fill();

  return cv;
}

function bakeGoat() {
  const cv = document.createElement('canvas');
  cv.width = A_W; cv.height = A_H;
  const ctx = cv.getContext('2d');
  const rng = makeRng(303);
  const cx = A_W / 2 - 3;
  const bodyY = A_GROUND - 17;

  leg(ctx, cx - 10, bodyY + 3, A_GROUND, 3.2, '#8e7a58', -1);
  leg(ctx, cx + 8, bodyY + 3, A_GROUND, 3.2, '#8e7a58', 0.8);

  // Rumpf
  ctx.fillStyle = furGradient(ctx, bodyY - 11, bodyY + 9, '#ddd0b4', '#c3b393', '#9c8c6e');
  ctx.beginPath();
  ctx.ellipse(cx, bodyY, 16, 10.5, -0.04, 0, Math.PI * 2);
  ctx.fill();
  // Zottiges Fell an der Unterseite
  ctx.strokeStyle = 'rgba(150,136,108,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    const sx = cx - 13 + i * 2;
    ctx.beginPath();
    ctx.moveTo(sx, bodyY + 7);
    ctx.lineTo(sx - 1, bodyY + 11 + rng() * 2.5);
    ctx.stroke();
  }

  leg(ctx, cx - 6, bodyY + 4, A_GROUND, 3.4, '#a08c68', -0.6);
  leg(ctx, cx + 12, bodyY + 4, A_GROUND, 3.4, '#a08c68', 1.2);

  // Hals und Kopf
  ctx.fillStyle = '#cdbd9c';
  ctx.beginPath();
  ctx.moveTo(cx + 10, bodyY - 5);
  ctx.quadraticCurveTo(cx + 19, bodyY - 14, cx + 21, bodyY - 19);
  ctx.lineTo(cx + 27, bodyY - 17);
  ctx.quadraticCurveTo(cx + 23, bodyY - 9, cx + 17, bodyY);
  ctx.closePath();
  ctx.fill();

  const hx = cx + 25, hy = bodyY - 21;
  ctx.fillStyle = furGradient(ctx, hy - 6, hy + 6, '#e4d8be', '#cabb9b', '#a89873');
  ctx.beginPath();
  ctx.ellipse(hx, hy, 8, 5.6, 0.24, 0, Math.PI * 2);
  ctx.fill();
  // Schnauze
  ctx.fillStyle = '#b8a884';
  ctx.beginPath();
  ctx.ellipse(hx + 6.5, hy + 2.8, 3.6, 2.7, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Hörner, nach hinten geschwungen
  ctx.strokeStyle = '#6e5c40';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  for (const off of [-1.5, 1.5]) {
    ctx.beginPath();
    ctx.moveTo(hx + off, hy - 4.5);
    ctx.quadraticCurveTo(hx + off - 7, hy - 12, hx + off - 13, hy - 9);
    ctx.stroke();
  }
  // Ohr
  ctx.fillStyle = '#b8a884';
  ctx.beginPath();
  ctx.ellipse(hx - 4, hy + 0.5, 5, 2.4, 0.55, 0, Math.PI * 2);
  ctx.fill();

  eye(ctx, hx + 2.6, hy - 0.4, 1.5);

  // Ziegenbart
  ctx.strokeStyle = '#b0a07c';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(hx + 5, hy + 5.5);
  ctx.quadraticCurveTo(hx + 4, hy + 10, hx + 2.5, hy + 13);
  ctx.stroke();

  return cv;
}

function bakeHeron() {
  const cv = document.createElement('canvas');
  cv.width = A_W; cv.height = A_H;
  const ctx = cv.getContext('2d');
  const cx = A_W / 2 - 2;
  const bodyY = A_GROUND - 26;

  // Stelzenbeine
  ctx.strokeStyle = '#c8a23c';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const ox of [-4, 4]) {
    ctx.beginPath();
    ctx.moveTo(cx + ox, bodyY + 7);
    ctx.lineTo(cx + ox - 1, bodyY + 18);
    ctx.lineTo(cx + ox + 1.5, A_GROUND);
    ctx.stroke();
    // Zehen
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx + ox + 1.5, A_GROUND);
    ctx.lineTo(cx + ox + 6, A_GROUND);
    ctx.moveTo(cx + ox + 1.5, A_GROUND);
    ctx.lineTo(cx + ox - 3, A_GROUND);
    ctx.stroke();
    ctx.lineWidth = 2;
  }

  // Rumpf
  ctx.fillStyle = furGradient(ctx, bodyY - 10, bodyY + 9, '#e6ecf4', '#c3cfdd', '#96a5b8');
  ctx.beginPath();
  ctx.ellipse(cx, bodyY, 15, 9.5, -0.12, 0, Math.PI * 2);
  ctx.fill();

  // Flügeldecke
  ctx.fillStyle = 'rgba(126,142,164,0.85)';
  ctx.beginPath();
  ctx.moveTo(cx - 12, bodyY - 3);
  ctx.quadraticCurveTo(cx + 2, bodyY - 9, cx + 11, bodyY - 1);
  ctx.quadraticCurveTo(cx + 1, bodyY + 6, cx - 12, bodyY - 3);
  ctx.fill();
  // Schwungfedern
  ctx.strokeStyle = 'rgba(88,102,124,0.7)';
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - 10 + i * 4, bodyY - 3);
    ctx.lineTo(cx - 13 + i * 4, bodyY + 4);
    ctx.stroke();
  }

  // S-förmiger Hals
  ctx.strokeStyle = '#d4dce8';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx + 9, bodyY - 5);
  ctx.quadraticCurveTo(cx + 20, bodyY - 12, cx + 14, bodyY - 22);
  ctx.stroke();

  // Kopf
  const hx = cx + 15, hy = bodyY - 26;
  ctx.fillStyle = '#eef2f8';
  ctx.beginPath();
  ctx.ellipse(hx, hy, 5.4, 4.4, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Schnabel
  ctx.fillStyle = '#e0b23c';
  ctx.beginPath();
  ctx.moveTo(hx + 4, hy - 0.5);
  ctx.lineTo(hx + 18, hy + 1.6);
  ctx.lineTo(hx + 4, hy + 3);
  ctx.closePath();
  ctx.fill();
  // Nackenschopf
  ctx.strokeStyle = '#3c4658';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(hx - 3, hy - 2.5);
  ctx.quadraticCurveTo(hx - 10, hy - 4, hx - 14, hy + 1);
  ctx.stroke();

  eye(ctx, hx + 1.8, hy - 0.8, 1.4, '#2b2620');

  return cv;
}

function bakeChicken() {
  const cv = document.createElement('canvas');
  cv.width = A_W; cv.height = A_H;
  const ctx = cv.getContext('2d');
  const cx = A_W / 2;
  const bodyY = A_GROUND - 12;

  // Ständer
  ctx.strokeStyle = '#e0a03c';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (const ox of [-3.5, 3.5]) {
    ctx.beginPath();
    ctx.moveTo(cx + ox, bodyY + 7);
    ctx.lineTo(cx + ox, A_GROUND);
    ctx.moveTo(cx + ox, A_GROUND);
    ctx.lineTo(cx + ox + 4, A_GROUND);
    ctx.moveTo(cx + ox, A_GROUND);
    ctx.lineTo(cx + ox - 3, A_GROUND);
    ctx.stroke();
  }

  // Rumpf
  ctx.fillStyle = furGradient(ctx, bodyY - 10, bodyY + 8, '#fdf6de', '#f2e2ac', '#d4be83');
  ctx.beginPath();
  ctx.ellipse(cx, bodyY, 12, 10, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // Flügel
  ctx.fillStyle = 'rgba(214,190,140,0.9)';
  ctx.beginPath();
  ctx.ellipse(cx - 1, bodyY + 1, 7.5, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(168,142,94,0.7)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(cx - 1, bodyY + 1, 3 + i * 1.8, 0.2, 1.5);
    ctx.stroke();
  }

  // Schwanzfedern
  ctx.fillStyle = '#e8d29a';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(cx - 13 - i, bodyY - 4 - i * 2.5, 6.5, 2.4, -0.6 - i * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  // Kopf
  const hx = cx + 9, hy = bodyY - 11;
  ctx.fillStyle = '#fdf6de';
  ctx.beginPath();
  ctx.ellipse(hx, hy, 6, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Kamm
  ctx.fillStyle = '#d8443c';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(hx - 2 + i * 2.4, hy - 5.5, 2.1, Math.PI, 0);
    ctx.fill();
  }
  // Kehllappen
  ctx.beginPath();
  ctx.ellipse(hx + 3, hy + 5, 1.8, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Schnabel
  ctx.fillStyle = '#e8a83c';
  ctx.beginPath();
  ctx.moveTo(hx + 5, hy);
  ctx.lineTo(hx + 11, hy + 1.6);
  ctx.lineTo(hx + 5, hy + 3);
  ctx.closePath();
  ctx.fill();

  eye(ctx, hx + 2, hy - 1, 1.4);

  return cv;
}

/** Katze in drei Lebensphasen: Kitten, jung, ausgewachsen */
function bakeCat(stageIdx) {
  const cv = document.createElement('canvas');
  cv.width = A_W; cv.height = A_H;
  const ctx = cv.getContext('2d');
  const rng = makeRng(404 + stageIdx * 71);
  const k = [0.62, 0.82, 1][stageIdx];          // Größenfaktor
  const cx = A_W / 2;
  const bodyY = A_GROUND - 10 * k;

  const orange = ['#f0b45c', '#e09a3c', '#b8742a'];

  // Schwanz, aufgestellt
  ctx.strokeStyle = orange[1];
  ctx.lineWidth = 4 * k;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 11 * k, bodyY + 1 * k);
  ctx.quadraticCurveTo(cx - 22 * k, bodyY - 2 * k, cx - 20 * k, bodyY - 16 * k);
  ctx.stroke();
  // Schwanzringe
  ctx.strokeStyle = orange[2];
  ctx.lineWidth = 1.6 * k;
  for (let i = 0; i < 3; i++) {
    const p = 0.35 + i * 0.22;
    const tx = cx - 11 * k + (-9 * k) * p * 2;
    const ty = bodyY + 1 * k - 17 * k * p * p;
    ctx.beginPath();
    ctx.moveTo(tx - 2 * k, ty);
    ctx.lineTo(tx + 2 * k, ty);
    ctx.stroke();
  }

  // Rumpf
  ctx.fillStyle = furGradient(ctx, bodyY - 9 * k, bodyY + 9 * k, orange[0], orange[1], orange[2]);
  ctx.beginPath();
  ctx.ellipse(cx, bodyY, 13 * k, 8.5 * k, -0.08, 0, Math.PI * 2);
  ctx.fill();
  // Tigerung
  ctx.strokeStyle = 'rgba(150,88,28,0.5)';
  ctx.lineWidth = 1.6 * k;
  for (let i = 0; i < 4; i++) {
    const sx = cx - 8 * k + i * 5 * k;
    ctx.beginPath();
    ctx.moveTo(sx, bodyY - 7 * k);
    ctx.quadraticCurveTo(sx + 1.5 * k, bodyY - 3 * k, sx - 0.5 * k, bodyY + 1 * k);
    ctx.stroke();
  }
  // Heller Bauch
  ctx.fillStyle = 'rgba(252,236,206,0.7)';
  ctx.beginPath();
  ctx.ellipse(cx + 1 * k, bodyY + 5 * k, 9 * k, 3.4 * k, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pfoten
  ctx.fillStyle = '#f6e0b8';
  for (const ox of [-6, 2, 8]) {
    ctx.beginPath();
    ctx.ellipse(cx + ox * k, bodyY + 8 * k, 3 * k, 2 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Kopf
  const hx = cx + 11 * k, hy = bodyY - 9 * k;
  ctx.fillStyle = furGradient(ctx, hy - 6 * k, hy + 6 * k, orange[0], orange[1], orange[2]);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 7.5 * k, 6.6 * k, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ohren
  for (const [ox, rot] of [[-4, -0.35], [3.5, 0.3]]) {
    ctx.fillStyle = orange[1];
    ctx.beginPath();
    ctx.moveTo(hx + ox * k - 3 * k, hy - 4 * k);
    ctx.lineTo(hx + ox * k + rot * 6 * k, hy - 11 * k);
    ctx.lineTo(hx + ox * k + 3 * k, hy - 4 * k);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(240,170,166,0.85)';
    ctx.beginPath();
    ctx.moveTo(hx + ox * k - 1.4 * k, hy - 5 * k);
    ctx.lineTo(hx + ox * k + rot * 4 * k, hy - 9.5 * k);
    ctx.lineTo(hx + ox * k + 1.4 * k, hy - 5 * k);
    ctx.closePath();
    ctx.fill();
  }

  // Schnauze
  ctx.fillStyle = 'rgba(252,240,214,0.95)';
  ctx.beginPath();
  ctx.ellipse(hx + 3.5 * k, hy + 2.6 * k, 4.4 * k, 3 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e08a8a';
  ctx.beginPath();
  ctx.moveTo(hx + 3.4 * k, hy + 0.6 * k);
  ctx.lineTo(hx + 5.4 * k, hy + 0.6 * k);
  ctx.lineTo(hx + 4.4 * k, hy + 2.2 * k);
  ctx.closePath();
  ctx.fill();
  // Schnurrhaare
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 0.6 * k;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(hx + 5 * k, hy + 2 * k);
    ctx.lineTo(hx + 13 * k, hy + 2 * k + i * 2.4 * k);
    ctx.stroke();
  }

  // Katzenaugen mit Schlitzpupille
  for (const ox of [-2.2, 3.4]) {
    ctx.fillStyle = '#8ed86a';
    ctx.beginPath();
    ctx.ellipse(hx + ox * k, hy - 1 * k, 2.2 * k, 2.5 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e2a18';
    ctx.beginPath();
    ctx.ellipse(hx + ox * k, hy - 1 * k, 0.7 * k, 2.1 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(hx + ox * k - 0.7 * k, hy - 2 * k, 0.6 * k, 0, Math.PI * 2);
    ctx.fill();
  }

  void rng;
  return cv;
}

const cache = new Map();

/**
 * Sprite für ein Tier.
 * @param {string} type  Tierart
 * @param {number} stageIdx nur für Katzen: 0 Kitten, 1 jung, 2 erwachsen
 */
export function getAnimalSprite(type, stageIdx = 2) {
  const key = type === 'cat' ? `cat${stageIdx}` : type;
  if (cache.has(key)) return cache.get(key);

  let cv;
  switch (type) {
    case 'deer': cv = bakeDeer(); break;
    case 'rabbit': cv = bakeRabbit(); break;
    case 'goat': cv = bakeGoat(); break;
    case 'heron': cv = bakeHeron(); break;
    case 'chicken': cv = bakeChicken(); break;
    case 'cat': cv = bakeCat(Math.max(0, Math.min(2, stageIdx))); break;
    default: cv = bakeRabbit(); break;
  }
  cache.set(key, cv);
  return cv;
}
