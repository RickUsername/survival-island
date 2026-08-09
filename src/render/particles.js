// ============================================
// Partikel — Schmetterlinge, Glühwürmchen, Pollen, Laub, Wetter
// ============================================
// Alles deterministisch aus Zeit + Index berechnet: kein Zustand,
// kein Speicher, kein Nachladen. Die Insel wirkt trotzdem lebendig.

import { valueNoise, hash1 } from './noise';
import { MAP_WIDTH, MAP_HEIGHT } from '../utils/constants';

/** Schmetterlinge: flattern tagsüber über die Wiese */
export function drawButterflies(ctx, t, count, alpha) {
  if (alpha <= 0.01) return;

  for (let i = 0; i < count; i++) {
    const seed = i * 977;
    // Langsame Wanderung über die Karte
    const speed = 0.05 + hash1(seed, 1) * 0.05;
    const bx = (valueNoise(t * speed, seed * 0.1, 401) * 1.3 - 0.15) * MAP_WIDTH;
    const by = (valueNoise(t * speed * 0.8 + 40, seed * 0.1, 402) * 1.3 - 0.15) * MAP_HEIGHT;
    if (bx < -20 || bx > MAP_WIDTH + 20 || by < -20 || by > MAP_HEIGHT + 20) continue;

    // Hüpfende Flugbahn
    const bob = Math.sin(t * 5.5 + i) * 4 + Math.sin(t * 2.1 + i * 2) * 3;
    const y = by + bob;
    const flap = Math.abs(Math.sin(t * 13 + i * 3));
    const wingW = 2.2 + flap * 4.2;
    const hue = hash1(seed, 3);

    const col = hue > 0.72 ? '255,214,86'
      : hue > 0.45 ? '246,246,250'
      : hue > 0.2 ? '236,142,72'
      : '138,176,232';

    ctx.fillStyle = `rgba(${col},${(0.55 + flap * 0.4) * alpha})`;
    ctx.beginPath();
    ctx.ellipse(bx - wingW * 0.55, y, wingW, 3.4, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bx + wingW * 0.55, y, wingW, 3.4, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(50,40,34,${0.6 * alpha})`;
    ctx.fillRect(bx - 0.6, y - 2.4, 1.2, 4.8);
  }
}

/** Glühwürmchen: nachts, mit weichem Puls und Lichthof */
export function drawFireflies(ctx, t, count, alpha) {
  if (alpha <= 0.01) return;

  for (let i = 0; i < count; i++) {
    const seed = i * 613;
    const speed = 0.028 + hash1(seed, 5) * 0.03;
    const fx = valueNoise(t * speed, seed * 0.13, 501) * MAP_WIDTH;
    const fy = valueNoise(t * speed * 0.9 + 70, seed * 0.13, 502) * MAP_HEIGHT;

    // Blinkrhythmus: lange dunkel, kurz hell
    const beat = (t * (0.5 + hash1(seed, 7) * 0.5) + hash1(seed, 9) * 6) % 3.2;
    const glow = beat < 1.1 ? Math.sin((beat / 1.1) * Math.PI) : 0;
    if (glow <= 0.02) continue;

    const a = glow * alpha;
    const halo = ctx.createRadialGradient(fx, fy, 0, fx, fy, 16);
    halo.addColorStop(0, `rgba(214,255,142,${0.5 * a})`);
    halo.addColorStop(0.35, `rgba(168,232,96,${0.18 * a})`);
    halo.addColorStop(1, 'rgba(140,210,70,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(fx, fy, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(242,255,196,${0.95 * a})`;
    ctx.beginPath();
    ctx.arc(fx, fy, 1.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Pollen und Staub, die im Gegenlicht aufblitzen */
export function drawMotes(ctx, t, count, alpha, tint = '255,246,206') {
  if (alpha <= 0.01) return;
  ctx.fillStyle = `rgba(${tint},${alpha})`;

  for (let i = 0; i < count; i++) {
    const seed = i * 331;
    const drift = t * (6 + hash1(seed, 2) * 14);
    const mx = (hash1(seed, 4) * MAP_WIDTH + drift) % MAP_WIDTH;
    const my = (hash1(seed, 6) * MAP_HEIGHT
      + Math.sin(t * 0.7 + i) * 18
      + t * (1 + hash1(seed, 8) * 3)) % MAP_HEIGHT;
    const r = 0.8 + hash1(seed, 10) * 1.5;
    const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.8 + i * 1.7));

    ctx.globalAlpha = alpha * twinkle;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * Fallendes Laub — und im Frühling Blütenblätter.
 * @param {string} mood 'green' | 'autumn' | 'blossom'
 */
export function drawFallingLeaves(ctx, t, count, alpha, mood = 'green') {
  if (alpha <= 0.01 || count <= 0) return;

  for (let i = 0; i < count; i++) {
    const seed = i * 787;
    const fallTime = 9 + hash1(seed, 1) * 8;
    const p = ((t + hash1(seed, 2) * fallTime) % fallTime) / fallTime;

    const startX = hash1(seed, 3) * MAP_WIDTH;
    const lx = startX + Math.sin(p * Math.PI * 4 + i) * 34 + p * 40;
    const ly = -20 + p * (MAP_HEIGHT + 40);
    const spin = p * 11 + i;
    const s = 3.4 + hash1(seed, 5) * 2.6;

    const warm = hash1(seed, 7);
    let col;
    if (mood === 'autumn') {
      col = warm > 0.6 ? '206,116,44' : warm > 0.3 ? '176,74,38' : '214,166,58';
    } else if (mood === 'blossom') {
      col = warm > 0.55 ? '250,222,232' : warm > 0.25 ? '242,192,212' : '252,240,244';
    } else {
      col = warm > 0.5 ? '108,148,58' : '138,166,72';
    }

    ctx.fillStyle = `rgba(${col},${alpha * (0.65 + 0.35 * Math.abs(Math.cos(spin)))})`;
    ctx.beginPath();
    ctx.ellipse(lx, ly, s * Math.abs(Math.cos(spin)) + 0.8, s * 0.55, spin, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Regen in drei Tiefenebenen: ferne Schleier dünn und langsam,
 * nahe Tropfen dick und schnell. Das erzeugt Räumlichkeit.
 */
export function drawRain(ctx, t, w, h, intensity, wind) {
  // Drei Tiefenebenen. Ferne Tropfen sind kurz, dünn und blass, nahe
  // Tropfen länger und kräftiger. Der Neigungswinkel bleibt moderat —
  // stark schräge Striche lesen sich als Kratzer, nicht als Regen.
  const layers = [
    { n: 210, len: 7, speed: 700, width: 0.6, alpha: 0.13 },
    { n: 140, len: 13, speed: 1020, width: 0.9, alpha: 0.2 },
    { n: 60, len: 21, speed: 1450, width: 1.4, alpha: 0.26 },
  ];

  for (const L of layers) {
    ctx.strokeStyle = `rgba(206,226,250,${L.alpha * intensity})`;
    ctx.lineWidth = L.width;
    ctx.beginPath();

    const count = Math.round(L.n * intensity);
    for (let i = 0; i < count; i++) {
      const seed = i * 7919 + L.n;
      const x0 = hash1(seed, 1) * (w + 260) - 130;
      const y0 = hash1(seed, 2) * h;
      const slant = wind * L.len * 0.34;
      const y = (y0 + t * L.speed) % (h + L.len * 2) - L.len;
      const x = (x0 + t * wind * 60) % (w + 260) - 130;
      ctx.moveTo(x, y);
      ctx.lineTo(x - slant, y + L.len);
    }
    ctx.stroke();
  }
}

/** Feuchter Schleier: nasses Grün wird dunkler und kühler */
export function drawWetSheen(ctx, w, h, intensity) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(150,168,186,${0.3 * intensity})`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Diffuser Lichtschleier von oben (Wolkendecke streut das Licht)
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `rgba(196,212,228,${0.16 * intensity})`);
  g.addColorStop(1, `rgba(178,196,214,${0.05 * intensity})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Aufspritzende Ringe am Boden */
export function drawSplashes(ctx, t, w, h, intensity) {
  ctx.strokeStyle = `rgba(206,228,252,${0.3 * intensity})`;
  ctx.lineWidth = 1;

  for (let i = 0; i < Math.round(30 * intensity); i++) {
    const seed = i * 3571;
    const cycle = 0.6 + hash1(seed, 3) * 0.5;
    const p = ((t + hash1(seed, 4) * cycle) % cycle) / cycle;
    if (p > 0.55) continue;

    const sx = hash1(seed, 1) * w;
    const sy = hash1(seed, 2) * h;
    const r = p * 11;
    ctx.globalAlpha = (1 - p / 0.55) * 0.5 * intensity;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r, r * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Schneefall: langsam, taumelnd, in drei Tiefen */
export function drawSnow(ctx, t, w, h, intensity, wind) {
  const layers = [
    { n: 120, r: 1.2, speed: 34, alpha: 0.42, drift: 26 },
    { n: 70, r: 2.0, speed: 52, alpha: 0.6, drift: 38 },
    { n: 32, r: 3.1, speed: 78, alpha: 0.8, drift: 52 },
  ];

  for (const L of layers) {
    ctx.fillStyle = `rgba(248,252,255,${L.alpha * intensity})`;
    const count = Math.round(L.n * intensity);
    for (let i = 0; i < count; i++) {
      const seed = i * 6151 + L.n;
      const x0 = hash1(seed, 1) * w;
      const y0 = hash1(seed, 2) * h;
      const y = (y0 + t * L.speed) % (h + 20) - 10;
      // Taumeln: eine langsame Sinusbahn plus Windversatz
      const x = (x0 + Math.sin(t * 0.6 + i * 1.7) * L.drift + t * wind * 22) % (w + 40) - 20;
      ctx.beginPath();
      ctx.arc(x, y, L.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Blitze: gezackte Bahn plus Aufhellung des ganzen Bildes.
 * Gibt zurück, wie hell der Einschlag gerade ist (0..1) — der
 * Aufrufer kann damit auch Lichtquellen kurz überstrahlen.
 */
export function drawLightning(ctx, t, w, h) {
  // Alle ~7 s ein Blitz, mit Doppelschlag
  const cycle = 7.3;
  const p = (t % cycle) / cycle;
  let flash = 0;
  if (p < 0.012) flash = 1 - p / 0.012;
  else if (p > 0.03 && p < 0.055) flash = (1 - (p - 0.03) / 0.025) * 0.6;
  if (flash <= 0.01) return 0;

  const strikeSeed = Math.floor(t / cycle) * 733;

  // Himmelsaufhellung
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `rgba(196,214,255,${0.5 * flash})`);
  g.addColorStop(0.6, `rgba(170,190,240,${0.16 * flash})`);
  g.addColorStop(1, 'rgba(150,170,220,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Blitzbahn — nur beim Hauptschlag
  if (p < 0.012) {
    const startX = hash1(strikeSeed, 1) * w * 0.8 + w * 0.1;
    ctx.strokeStyle = `rgba(236,244,255,${0.9 * flash})`;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    let x = startX;
    let y = -10;
    ctx.moveTo(x, y);
    const steps = 9;
    for (let i = 1; i <= steps; i++) {
      x += (hash1(strikeSeed + i, 2) - 0.5) * 62;
      y += h * 0.55 / steps;
      ctx.lineTo(x, y);
      // Gelegentlich ein Seitenast
      if (hash1(strikeSeed + i, 3) > 0.72) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + (hash1(strikeSeed + i, 4) - 0.5) * 70, y + 34);
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  }

  return flash;
}

/** Hitzeflimmern: waagerechte Verschiebungsbänder über dem Boden */
export function drawHeatHaze(ctx, srcCanvas, t, w, h, dpr) {
  const bands = 26;
  const bandH = h / bands;
  ctx.save();
  for (let i = 0; i < bands; i++) {
    const y = i * bandH;
    // Unten stärker als oben — dort ist die Luft am heißesten
    const strength = (i / bands) * 2.4;
    const dx = Math.sin(t * 2.2 + i * 0.55) * strength;
    if (Math.abs(dx) < 0.2) continue;
    ctx.drawImage(
      srcCanvas,
      0, y * dpr, w * dpr, bandH * dpr,
      dx, y, w, bandH
    );
  }
  ctx.restore();
}

/** Nebelbänke, die langsam über die Insel ziehen */
export function drawFogBanks(ctx, t, w, h, intensity) {
  if (intensity <= 0.01) return;
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const speed = 12 + i * 7;
    const bx = ((t * speed + i * 431) % (w + 800)) - 400;
    const by = (i / 5) * h + Math.sin(t * 0.18 + i) * 40;
    const bw = 420 + i * 90;
    const bh = 110 + i * 26;

    const g = ctx.createRadialGradient(bx, by, 0, bx, by, bw / 2);
    g.addColorStop(0, `rgba(232,238,244,${0.3 * intensity})`);
    g.addColorStop(0.6, `rgba(226,234,242,${0.12 * intensity})`);
    g.addColorStop(1, 'rgba(220,230,240,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(bx, by, bw / 2, bh / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Sterne für den Nachthimmel hinter der Insel */
export function drawStars(ctx, t, w, h, alpha) {
  if (alpha <= 0.01) return;

  for (let i = 0; i < 130; i++) {
    const seed = i * 2311;
    const sx = hash1(seed, 1) * w;
    const sy = hash1(seed, 2) * h * 0.85;
    const mag = hash1(seed, 3);
    const tw = 0.55 + 0.45 * Math.sin(t * (0.6 + mag * 1.8) + i);
    const r = 0.5 + mag * 1.3;

    ctx.fillStyle = mag > 0.9
      ? `rgba(198,222,255,${alpha * tw})`
      : `rgba(255,252,238,${alpha * tw * (0.35 + mag * 0.6)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
