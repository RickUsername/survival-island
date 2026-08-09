// ============================================
// Sprite des wandernden Händlers
// ============================================
// Ein Marktstand mit Sonnensegel, Kisten und der Figur dahinter.
// Wird einmal gebacken; die Wimpel flattern beim Zeichnen darüber.

import { makeRng } from './noise';

export const M_W = 128;
export const M_H = 118;
export const M_ANCHOR_X = M_W / 2;
export const M_ANCHOR_Y = M_H - 6;

let cache = null;

function bake() {
  const cv = document.createElement('canvas');
  cv.width = M_W;
  cv.height = M_H;
  const ctx = cv.getContext('2d');
  const rng = makeRng(6767);
  const cx = M_ANCHOR_X;
  const ground = M_ANCHOR_Y;

  // Pfosten
  ctx.strokeStyle = '#6b4a26';
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  for (const ox of [-34, 34]) {
    ctx.beginPath();
    ctx.moveTo(cx + ox, ground);
    ctx.lineTo(cx + ox, ground - 62);
    ctx.stroke();
  }

  // Gestreiftes Sonnensegel
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - 42, ground - 60);
  ctx.quadraticCurveTo(cx, ground - 76, cx + 42, ground - 60);
  ctx.lineTo(cx + 42, ground - 52);
  ctx.quadraticCurveTo(cx, ground - 68, cx - 42, ground - 52);
  ctx.closePath();
  ctx.clip();
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#c8503f' : '#f0e2c4';
    ctx.fillRect(cx - 42 + i * 8.4, ground - 80, 8.4, 32);
  }
  ctx.restore();
  // Traufkante
  ctx.strokeStyle = 'rgba(120,60,44,0.7)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - 42, ground - 56);
  ctx.quadraticCurveTo(cx, ground - 72, cx + 42, ground - 56);
  ctx.stroke();
  // Zackenborte
  ctx.fillStyle = '#c8503f';
  for (let i = 0; i < 11; i++) {
    const px = cx - 40 + i * 8;
    const py = ground - 56 + Math.abs(i - 5) * 1.1;
    ctx.beginPath();
    ctx.moveTo(px - 3.4, py);
    ctx.lineTo(px + 3.4, py);
    ctx.lineTo(px, py + 6);
    ctx.closePath();
    ctx.fill();
  }

  // Ladentisch
  const tableY = ground - 26;
  ctx.fillStyle = '#8a6237';
  ctx.fillRect(cx - 38, tableY, 76, 7);
  ctx.fillStyle = '#6b4a26';
  ctx.fillRect(cx - 38, tableY + 6, 76, 3);
  // Tuch darüber
  ctx.fillStyle = '#4a6f8a';
  ctx.beginPath();
  ctx.moveTo(cx - 38, tableY + 8);
  ctx.lineTo(cx + 38, tableY + 8);
  ctx.lineTo(cx + 34, ground - 4);
  ctx.lineTo(cx - 34, ground - 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,52,70,0.4)';
  ctx.lineWidth = 0.9;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 10, tableY + 9);
    ctx.lineTo(cx + i * 9, ground - 5);
    ctx.stroke();
  }

  // Waren auf dem Tisch
  const crate = (x, w, h) => {
    ctx.fillStyle = '#a67a45';
    ctx.fillRect(x, tableY - h, w, h);
    ctx.strokeStyle = '#6f4b26';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, tableY - h + 0.5, w - 1, h - 1);
    ctx.beginPath();
    ctx.moveTo(x, tableY - h * 0.5);
    ctx.lineTo(x + w, tableY - h * 0.5);
    ctx.stroke();
  };
  crate(cx - 34, 18, 13);
  crate(cx + 16, 20, 10);
  // Obstkorb
  ctx.fillStyle = '#b98a4e';
  ctx.beginPath();
  ctx.ellipse(cx - 6, tableY - 4, 11, 5, 0, Math.PI, 0);
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = ['#d8563f', '#e0a03c', '#8ab04a'][i % 3];
    ctx.beginPath();
    ctx.arc(cx - 13 + i * 3 + rng() * 2, tableY - 8 - rng() * 3, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hängende Kräuterbündel
  ctx.strokeStyle = '#7c8f4a';
  ctx.lineWidth = 1.4;
  for (const ox of [-26, 24]) {
    ctx.beginPath();
    ctx.moveTo(cx + ox, ground - 54);
    ctx.lineTo(cx + ox, ground - 44);
    ctx.stroke();
    ctx.fillStyle = '#6f8a3e';
    ctx.beginPath();
    ctx.ellipse(cx + ox, ground - 41, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Der Händler hinter dem Tisch
  const px = cx + 2;
  const headY = tableY - 26;
  // Umhang
  const cloak = ctx.createLinearGradient(px - 12, headY, px + 12, tableY);
  cloak.addColorStop(0, '#4c3a6b');
  cloak.addColorStop(0.5, '#6a5390');
  cloak.addColorStop(1, '#3e2f58');
  ctx.fillStyle = cloak;
  ctx.beginPath();
  ctx.moveTo(px - 11, headY + 8);
  ctx.quadraticCurveTo(px - 14, tableY - 6, px - 12, tableY);
  ctx.lineTo(px + 12, tableY);
  ctx.quadraticCurveTo(px + 14, tableY - 6, px + 11, headY + 8);
  ctx.closePath();
  ctx.fill();
  // Kopf
  ctx.fillStyle = '#d9a983';
  ctx.beginPath();
  ctx.ellipse(px, headY, 7.5, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bart
  ctx.fillStyle = '#e6e2da';
  ctx.beginPath();
  ctx.ellipse(px, headY + 6, 6, 6.5, 0, 0, Math.PI);
  ctx.fill();
  // Schlapphut
  ctx.fillStyle = '#5a4630';
  ctx.beginPath();
  ctx.ellipse(px, headY - 5, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(px + 1, headY - 9, 7.5, 6, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7d6242';
  ctx.fillRect(px - 7.5, headY - 6.5, 15, 2.2);
  // Augen
  ctx.fillStyle = '#2b2118';
  ctx.beginPath(); ctx.arc(px - 2.6, headY, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(px + 2.6, headY, 1.2, 0, Math.PI * 2); ctx.fill();

  return cv;
}

export function getMerchantSprite() {
  if (!cache) cache = bake();
  return cache;
}

/** Flatternde Wimpel an den Pfosten — jeden Frame frisch */
export function drawMerchantPennants(ctx, cx, groundY, t, scale = 1) {
  for (let i = 0; i < 2; i++) {
    const ox = (i === 0 ? -34 : 34) * scale;
    const py = groundY - 62 * scale;
    const wave = Math.sin(t * 3 + i * 2) * 4 * scale;
    ctx.fillStyle = i === 0 ? '#e0a03c' : '#c8503f';
    ctx.beginPath();
    ctx.moveTo(cx + ox, py);
    ctx.quadraticCurveTo(cx + ox + 9 * scale, py + 2 * scale + wave, cx + ox + 17 * scale, py + wave);
    ctx.lineTo(cx + ox + 15 * scale, py + 7 * scale + wave);
    ctx.quadraticCurveTo(cx + ox + 8 * scale, py + 8 * scale + wave, cx + ox, py + 7 * scale);
    ctx.closePath();
    ctx.fill();
  }
}
