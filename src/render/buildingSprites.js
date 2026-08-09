// ============================================
// Gebäude-Sprites — Unterstand Stufe 1 bis 5, Regenfänger
// ============================================
// Vorher waren das flache Rechtecke mit ein paar Strichen. Hier bekommen
// die Bauten Materialstruktur, Dachüberstand, Tiefe und warmes Fensterlicht.
// Jede Stufe wird einmal gebacken und danach nur noch geblittet.

import { makeRng } from './noise';

export const BUILD_W = 132;
export const BUILD_H = 128;
export const BUILD_ANCHOR_X = BUILD_W / 2;
export const BUILD_ANCHOR_Y = BUILD_H - 8; // Standfläche

// --- Kleine Materialhelfer ---

/** Holzbretter mit Maserung */
function planks(ctx, x, y, w, h, rng, base, dark, vertical = false) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);

  const count = vertical ? Math.round(w / 9) : Math.round(h / 8);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  for (let i = 1; i < count; i++) {
    const p = i / count;
    ctx.globalAlpha = 0.45 + rng() * 0.3;
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(x + w * p, y);
      ctx.lineTo(x + w * p, y + h);
    } else {
      ctx.moveTo(x, y + h * p);
      ctx.lineTo(x + w, y + h * p);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Maserung
  ctx.strokeStyle = dark;
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 14; i++) {
    ctx.globalAlpha = 0.18 + rng() * 0.16;
    const gy = y + rng() * h;
    const gx = x + rng() * w * 0.6;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.quadraticCurveTo(gx + w * 0.15, gy + (rng() - 0.5) * 3, gx + w * 0.3, gy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Plastik: links dunkler, rechts heller
  const shade = ctx.createLinearGradient(x, 0, x + w, 0);
  shade.addColorStop(0, 'rgba(0,0,0,0.26)');
  shade.addColorStop(0.4, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(255,240,210,0.14)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
}

/** Bruchsteinmauer aus versetzten Quadern */
function stonework(ctx, x, y, w, h, rng) {
  ctx.fillStyle = '#7d7a72';
  ctx.fillRect(x, y, w, h);

  const rowH = 9;
  for (let r = 0; r * rowH < h; r++) {
    const gy = y + r * rowH;
    const gh = Math.min(rowH, y + h - gy) - 1;
    if (gh <= 1) continue;
    let gx = x + (r % 2 === 0 ? 0 : -6);
    while (gx < x + w) {
      const gw = 12 + rng() * 12;
      const drawX = Math.max(x, gx);
      const drawW = Math.min(gx + gw, x + w) - drawX;
      if (drawW > 1) {
        const v = 108 + rng() * 46;
        ctx.fillStyle = `rgb(${v | 0},${(v - 4) | 0},${(v - 12) | 0})`;
        ctx.fillRect(drawX, gy, drawW - 1.2, gh);
        // Lichtkante oben
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fillRect(drawX, gy, drawW - 1.2, 1.4);
      }
      gx += gw;
    }
  }

  const shade = ctx.createLinearGradient(x, 0, x + w, 0);
  shade.addColorStop(0, 'rgba(0,0,0,0.3)');
  shade.addColorStop(0.45, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(255,244,220,0.12)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
}

/** Strohdach mit Halmstruktur */
function thatch(ctx, pts, rng) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.clip();

  const minX = Math.min(...pts.map(p => p[0]));
  const maxX = Math.max(...pts.map(p => p[0]));
  const minY = Math.min(...pts.map(p => p[1]));
  const maxY = Math.max(...pts.map(p => p[1]));

  const g = ctx.createLinearGradient(0, minY, 0, maxY);
  g.addColorStop(0, '#d8b862');
  g.addColorStop(0.6, '#bb9843');
  g.addColorStop(1, '#8f7130');
  ctx.fillStyle = g;
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

  // Halme
  for (let i = 0; i < 130; i++) {
    const sx = minX + rng() * (maxX - minX);
    const sy = minY + rng() * (maxY - minY);
    const len = 4 + rng() * 8;
    ctx.strokeStyle = rng() > 0.5
      ? `rgba(230,206,140,${0.2 + rng() * 0.3})`
      : `rgba(112,88,38,${0.16 + rng() * 0.24})`;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (rng() - 0.5) * 3, sy + len);
    ctx.stroke();
  }
  ctx.restore();

  // Ausgefranste Traufkante
  ctx.strokeStyle = 'rgba(120,94,40,0.6)';
  ctx.lineWidth = 1;
  const eaveY = Math.max(...pts.map(p => p[1]));
  for (let x = minX; x < maxX; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x, eaveY - 1);
    ctx.lineTo(x + (rng() - 0.5) * 1.5, eaveY + 1.5 + rng() * 2.5);
    ctx.stroke();
  }
}

/** Ziegeldach in Reihen */
function tiles(ctx, x, y, w, h, rng, hue = '#a4453a') {
  ctx.fillStyle = hue;
  ctx.fillRect(x, y, w, h);

  const rowH = 6;
  for (let r = 0; r * rowH < h; r++) {
    const gy = y + r * rowH;
    const offset = (r % 2) * 5;
    for (let gx = x - offset; gx < x + w; gx += 10) {
      const v = 150 + rng() * 46;
      ctx.fillStyle = `rgb(${v | 0},${(v * 0.44) | 0},${(v * 0.36) | 0})`;
      const dx = Math.max(x, gx);
      const dw = Math.min(gx + 9, x + w) - dx;
      if (dw > 0.5) {
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(dx, gy, dw, rowH - 0.8, 1.6) : ctx.rect(dx, gy, dw, rowH - 0.8);
        ctx.fill();
      }
    }
    // Schattenfuge unter jeder Reihe
    ctx.fillStyle = 'rgba(60,20,16,0.24)';
    ctx.fillRect(x, gy + rowH - 1.4, w, 1.4);
  }

  const shade = ctx.createLinearGradient(x, 0, x + w, 0);
  shade.addColorStop(0, 'rgba(0,0,0,0.24)');
  shade.addColorStop(0.5, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(255,230,200,0.14)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
}

/** Fenster mit Rahmen, Sprossen und Glasreflex. Nachts warm erleuchtet. */
function window_(ctx, x, y, w, h, lit) {
  // Laibung
  ctx.fillStyle = '#3a2a18';
  ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);

  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  if (lit) {
    g.addColorStop(0, '#ffd98f');
    g.addColorStop(1, '#f0a63f');
  } else {
    g.addColorStop(0, '#8fb6cc');
    g.addColorStop(0.5, '#5f8298');
    g.addColorStop(1, '#42606f');
  }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  // Glasreflex
  if (!lit) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w * 0.62, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w * 0.38, y + h);
    ctx.closePath();
    ctx.fill();
  }

  // Sprossen
  ctx.strokeStyle = '#4a3520';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  ctx.strokeStyle = '#5a4326';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x, y, w, h);
}

/** Tür mit Brettern, Beschlag und Klinke */
function door(ctx, x, y, w, h) {
  ctx.fillStyle = '#3b2612';
  ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 1.5);

  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#5a3a1c');
  g.addColorStop(0.55, '#79512a');
  g.addColorStop(1, '#4a2f16');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = 'rgba(40,24,10,0.6)';
  ctx.lineWidth = 0.9;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + (w / 3) * i, y);
    ctx.lineTo(x + (w / 3) * i, y + h);
    ctx.stroke();
  }
  // Querbeschläge
  ctx.fillStyle = 'rgba(52,48,44,0.85)';
  ctx.fillRect(x, y + h * 0.2, w, 1.6);
  ctx.fillRect(x, y + h * 0.72, w, 1.6);
  // Klinke
  ctx.fillStyle = '#d2b358';
  ctx.beginPath();
  ctx.arc(x + w - 2.6, y + h * 0.52, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

// --- Die fünf Ausbaustufen ---

function bakeShelter(level, lit) {
  const cv = document.createElement('canvas');
  cv.width = BUILD_W;
  cv.height = BUILD_H;
  const ctx = cv.getContext('2d');
  const rng = makeRng(3100 + level * 617 + (lit ? 13 : 0));
  const cx = BUILD_ANCHOR_X;
  const ground = BUILD_ANCHOR_Y;

  switch (level) {
    case 1: {
      // Unterstand: schräges Blätterdach auf zwei Stangen
      const bx = cx - 34;

      // Laubstreu als Liegefläche
      ctx.fillStyle = '#5c6b3c';
      ctx.beginPath();
      ctx.ellipse(cx, ground - 3, 32, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 34; i++) {
        ctx.fillStyle = rng() > 0.5 ? 'rgba(126,142,74,0.8)' : 'rgba(150,124,58,0.8)';
        ctx.beginPath();
        ctx.ellipse(cx + (rng() - 0.5) * 58, ground - 3 + (rng() - 0.5) * 17,
          3 + rng() * 2.4, 1.6 + rng(), rng() * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stützstangen
      ctx.strokeStyle = '#6b4a26';
      ctx.lineCap = 'round';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(bx + 6, ground); ctx.lineTo(bx + 11, ground - 52); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + 58, ground); ctx.lineTo(bx + 55, ground - 30); ctx.stroke();
      // Querbalken
      ctx.lineWidth = 3.6;
      ctx.strokeStyle = '#5c3f20';
      ctx.beginPath(); ctx.moveTo(bx + 8, ground - 50); ctx.lineTo(bx + 56, ground - 29); ctx.stroke();

      // Blätterdach: viele überlappende Zweige
      for (let layer = 0; layer < 3; layer++) {
        const dy = layer * 5;
        ctx.fillStyle = ['#2f6a20', '#3d8129', '#4e9633'][layer];
        for (let i = 0; i < 22; i++) {
          const p = i / 21;
          const lx = bx + 4 + p * 56 + (rng() - 0.5) * 5;
          const ly = ground - 52 + p * 22 + dy + (rng() - 0.5) * 4;
          ctx.beginPath();
          ctx.ellipse(lx, ly, 7 + rng() * 4, 3.6 + rng() * 2, 0.38 + (rng() - 0.5) * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Bindungen aus Bast
      ctx.strokeStyle = 'rgba(196,168,96,0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(bx + 10, ground - 50, 4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx + 55, ground - 29, 3.4, 0, Math.PI * 2); ctx.stroke();
      break;
    }

    case 2: {
      // Hütte: Holzwand, Strohdach, eine Tür, ein Fenster
      const w = 62, h = 40;
      const bx = cx - w / 2;
      const by = ground - h;

      planks(ctx, bx, by, w, h, rng, '#8a6437', '#5f4322', true);

      // Eckpfosten
      ctx.fillStyle = '#5f4322';
      ctx.fillRect(bx - 2.5, by, 4, h);
      ctx.fillRect(bx + w - 1.5, by, 4, h);

      thatch(ctx, [[bx - 11, by + 2], [cx, by - 30], [bx + w + 11, by + 2]], rng);
      // Firstbalken
      ctx.strokeStyle = 'rgba(92,68,28,0.8)';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(cx, by - 30); ctx.lineTo(cx, by - 24); ctx.stroke();

      door(ctx, cx - 8, ground - 25, 16, 25);
      window_(ctx, bx + 8, by + 9, 13, 12, lit);
      break;
    }

    case 3: {
      // Blockhaus: gestapelte Rundbalken, Giebeldach, Schornstein
      const w = 68, h = 44;
      const bx = cx - w / 2;
      const by = ground - h;

      // Rundbalken übereinander
      const logH = 8;
      for (let i = 0; i * logH < h; i++) {
        const ly = by + i * logH;
        const lh = Math.min(logH, by + h - ly);
        const g = ctx.createLinearGradient(0, ly, 0, ly + lh);
        g.addColorStop(0, '#8a6234');
        g.addColorStop(0.45, '#a67c44');
        g.addColorStop(1, '#6b4a26');
        ctx.fillStyle = g;
        ctx.fillRect(bx, ly, w, lh - 0.8);
        // Balkenenden ragen über
        ctx.fillStyle = '#7a5530';
        ctx.beginPath(); ctx.ellipse(bx - 2, ly + lh / 2, 3.4, lh / 2 - 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(bx + w + 2, ly + lh / 2, 3.4, lh / 2 - 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(70,48,24,0.5)';
        ctx.beginPath(); ctx.ellipse(bx + w + 2, ly + lh / 2, 1.8, lh / 2 - 2, 0, 0, Math.PI * 2); ctx.fill();
      }
      const shade = ctx.createLinearGradient(bx, 0, bx + w, 0);
      shade.addColorStop(0, 'rgba(0,0,0,0.26)');
      shade.addColorStop(0.45, 'rgba(0,0,0,0)');
      shade.addColorStop(1, 'rgba(255,240,210,0.12)');
      ctx.fillStyle = shade;
      ctx.fillRect(bx, by, w, h);

      // Giebeldach aus Schindeln
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(bx - 10, by + 3);
      ctx.lineTo(cx, by - 30);
      ctx.lineTo(bx + w + 10, by + 3);
      ctx.closePath();
      ctx.clip();
      tiles(ctx, bx - 12, by - 32, w + 24, 40, rng, '#6d4b2c');
      ctx.restore();
      // Firstbalken
      ctx.strokeStyle = '#4b3218';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx - 10, by + 3); ctx.lineTo(cx, by - 30); ctx.lineTo(bx + w + 10, by + 3);
      ctx.stroke();

      // Schornstein
      stonework(ctx, bx + w - 22, by - 24, 11, 20, rng);
      ctx.fillStyle = '#5b5750';
      ctx.fillRect(bx + w - 24, by - 26, 15, 4);

      door(ctx, cx - 9, ground - 28, 18, 28);
      window_(ctx, bx + 8, by + 10, 14, 13, lit);
      window_(ctx, bx + w - 22, by + 10, 14, 13, lit);
      break;
    }

    case 4: {
      // Steinhaus: Bruchsteinmauer, Ziegeldach, Fensterbänke
      const w = 74, h = 46;
      const bx = cx - w / 2;
      const by = ground - h;

      stonework(ctx, bx, by, w, h, rng);
      // Eckquader
      ctx.fillStyle = 'rgba(150,146,138,0.9)';
      for (let i = 0; i * 10 < h; i++) {
        const qy = by + i * 10;
        const qw = i % 2 === 0 ? 8 : 5;
        ctx.fillRect(bx, qy, qw, 9);
        ctx.fillRect(bx + w - qw, qy, qw, 9);
      }

      // Ziegeldach mit Überstand
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(bx - 12, by + 4);
      ctx.lineTo(cx, by - 32);
      ctx.lineTo(bx + w + 12, by + 4);
      ctx.closePath();
      ctx.clip();
      tiles(ctx, bx - 14, by - 34, w + 28, 44, rng);
      ctx.restore();
      // Firstziegel
      ctx.fillStyle = '#8d3a30';
      ctx.beginPath();
      ctx.ellipse(cx, by - 31, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Traufe
      ctx.fillStyle = 'rgba(50,18,14,0.5)';
      ctx.fillRect(bx - 12, by + 3, w + 24, 2.4);

      stonework(ctx, bx + w - 24, by - 26, 12, 22, rng);
      ctx.fillStyle = '#5b5750';
      ctx.fillRect(bx + w - 26, by - 28, 16, 4);

      door(ctx, cx - 10, ground - 30, 20, 30);
      // Türvordach
      ctx.fillStyle = '#6b4a26';
      ctx.beginPath();
      ctx.moveTo(cx - 15, ground - 32);
      ctx.lineTo(cx + 15, ground - 32);
      ctx.lineTo(cx + 12, ground - 36);
      ctx.lineTo(cx - 12, ground - 36);
      ctx.closePath();
      ctx.fill();

      for (const fx of [bx + 9, bx + w - 24]) {
        window_(ctx, fx, by + 12, 15, 14, lit);
        // Fensterbank
        ctx.fillStyle = '#b6b1a6';
        ctx.fillRect(fx - 2.5, by + 26, 20, 2.4);
      }
      break;
    }

    default: {
      // Stufe 5: Fachwerkhaus mit zwei Etagen und Blumenkasten
      const w = 78, h = 58;
      const bx = cx - w / 2;
      const by = ground - h;

      // Sockel aus Stein
      stonework(ctx, bx, ground - 16, w, 16, rng);

      // Fachwerk: heller Putz mit dunklen Balken
      ctx.fillStyle = '#e6dcc4';
      ctx.fillRect(bx, by, w, h - 16);
      // Putzstruktur
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = `rgba(190,178,150,${0.1 + rng() * 0.16})`;
        ctx.beginPath();
        ctx.arc(bx + rng() * w, by + rng() * (h - 16), 1 + rng() * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Balkenwerk
      ctx.strokeStyle = '#5c3f22';
      ctx.lineWidth = 4;
      ctx.strokeRect(bx + 2, by + 2, w - 4, h - 20);
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(bx + 2, by + (h - 16) / 2); ctx.lineTo(bx + w - 2, by + (h - 16) / 2);
      // Andreaskreuze
      ctx.moveTo(bx + 4, by + 4); ctx.lineTo(bx + 26, by + (h - 16) / 2 - 2);
      ctx.moveTo(bx + 26, by + 4); ctx.lineTo(bx + 4, by + (h - 16) / 2 - 2);
      ctx.moveTo(bx + w - 4, by + 4); ctx.lineTo(bx + w - 26, by + (h - 16) / 2 - 2);
      ctx.moveTo(bx + w - 26, by + 4); ctx.lineTo(bx + w - 4, by + (h - 16) / 2 - 2);
      ctx.stroke();

      // Walmdach
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(bx - 13, by + 3);
      ctx.lineTo(cx - 14, by - 30);
      ctx.lineTo(cx + 14, by - 30);
      ctx.lineTo(bx + w + 13, by + 3);
      ctx.closePath();
      ctx.clip();
      tiles(ctx, bx - 15, by - 32, w + 30, 42, rng, '#8d5c40');
      ctx.restore();
      ctx.strokeStyle = '#4a2e1c';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(bx - 13, by + 3); ctx.lineTo(cx - 14, by - 30);
      ctx.lineTo(cx + 14, by - 30); ctx.lineTo(bx + w + 13, by + 3);
      ctx.stroke();
      // Firstziegel
      ctx.fillStyle = '#7c4c33';
      ctx.fillRect(cx - 15, by - 32, 30, 3.4);

      // Schornstein mit Rauchfang
      stonework(ctx, bx + w - 26, by - 28, 13, 24, rng);
      ctx.fillStyle = '#5b5750';
      ctx.fillRect(bx + w - 28, by - 31, 17, 4.5);

      // Obergeschoss-Fenster
      window_(ctx, cx - 22, by + 8, 15, 14, lit);
      window_(ctx, cx + 7, by + 8, 15, 14, lit);
      // Erdgeschoss
      door(ctx, cx - 11, ground - 34, 22, 34);
      window_(ctx, bx + 8, by + 30, 14, 13, lit);
      window_(ctx, bx + w - 22, by + 30, 14, 13, lit);

      // Blumenkasten unter dem linken Fenster
      ctx.fillStyle = '#6b4a26';
      ctx.fillRect(bx + 5, by + 44, 20, 5);
      for (let i = 0; i < 9; i++) {
        const fx = bx + 7 + i * 2.2;
        ctx.fillStyle = '#4e8a34';
        ctx.fillRect(fx, by + 40, 1.4, 4.5);
        ctx.fillStyle = ['#e05a6a', '#f0c040', '#d878b8'][i % 3];
        ctx.beginPath();
        ctx.arc(fx + 0.7, by + 39.5, 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }

  return cv;
}

/** Regenfänger: Holzgestell mit gespanntem Tuch und Fass */
function bakeCollector(filled) {
  const cv = document.createElement('canvas');
  cv.width = BUILD_W;
  cv.height = BUILD_H;
  const ctx = cv.getContext('2d');
  const rng = makeRng(8800 + (filled ? 3 : 0));
  const cx = BUILD_ANCHOR_X;
  const ground = BUILD_ANCHOR_Y;

  // Vier Beine
  ctx.strokeStyle = '#6b4a26';
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  const legs = [[-24, -2], [24, -2], [-18, 4], [18, 4]];
  for (const [ox, oy] of legs) {
    ctx.beginPath();
    ctx.moveTo(cx + ox * 0.75, ground + oy);
    ctx.lineTo(cx + ox, ground - 34);
    ctx.stroke();
  }

  // Gespanntes Tuch, in der Mitte durchhängend
  const g = ctx.createLinearGradient(0, ground - 40, 0, ground - 24);
  g.addColorStop(0, '#c9bda0');
  g.addColorStop(1, '#9c9078');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - 26, ground - 38);
  ctx.quadraticCurveTo(cx, ground - 24, cx + 26, ground - 38);
  ctx.lineTo(cx + 26, ground - 41);
  ctx.quadraticCurveTo(cx, ground - 28, cx - 26, ground - 41);
  ctx.closePath();
  ctx.fill();
  // Falten
  ctx.strokeStyle = 'rgba(90,82,66,0.35)';
  ctx.lineWidth = 0.9;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 7, ground - 40 + Math.abs(i) * 0.8);
    ctx.quadraticCurveTo(cx + i * 7.5, ground - 32, cx + i * 8, ground - 26 + Math.abs(i) * 1.6);
    ctx.stroke();
  }

  // Wasser im Tuch
  if (filled) {
    ctx.fillStyle = 'rgba(96,164,196,0.85)';
    ctx.beginPath();
    ctx.moveTo(cx - 17, ground - 32);
    ctx.quadraticCurveTo(cx, ground - 24, cx + 17, ground - 32);
    ctx.quadraticCurveTo(cx, ground - 28, cx - 17, ground - 32);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(220,244,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx - 5, ground - 29, 5, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Auffangfass darunter
  const bg = ctx.createLinearGradient(cx - 13, 0, cx + 13, 0);
  bg.addColorStop(0, '#5c3f20');
  bg.addColorStop(0.5, '#8a6237');
  bg.addColorStop(1, '#4d3419');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(cx - 12, ground - 22);
  ctx.lineTo(cx + 12, ground - 22);
  ctx.lineTo(cx + 10, ground);
  ctx.lineTo(cx - 10, ground);
  ctx.closePath();
  ctx.fill();
  // Dauben
  ctx.strokeStyle = 'rgba(40,26,12,0.45)';
  ctx.lineWidth = 0.9;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 4.6, ground - 22);
    ctx.lineTo(cx + i * 3.9, ground);
    ctx.stroke();
  }
  // Eisenreifen
  ctx.strokeStyle = '#4a4640';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - 11.6, ground - 18); ctx.lineTo(cx + 11.6, ground - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 10.4, ground - 6); ctx.lineTo(cx + 10.4, ground - 6); ctx.stroke();
  // Fassöffnung
  ctx.fillStyle = filled ? '#3f7f9c' : '#2e2418';
  ctx.beginPath();
  ctx.ellipse(cx, ground - 22, 12, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (filled) {
    ctx.fillStyle = 'rgba(190,230,248,0.45)';
    ctx.beginPath();
    ctx.ellipse(cx - 3, ground - 22.6, 5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  void rng;
  return cv;
}

const cache = new Map();

/** Unterstand-Sprite; `lit` schaltet warmes Fensterlicht ein */
export function getShelterSprite(level, lit) {
  const lvl = Math.max(1, Math.min(5, level || 1));
  const key = `s${lvl}${lit ? 'L' : ''}`;
  if (!cache.has(key)) cache.set(key, bakeShelter(lvl, !!lit));
  return cache.get(key);
}

/** Regenfänger-Sprite; `filled` zeigt gesammeltes Wasser */
export function getCollectorSprite(filled) {
  const key = `c${filled ? 'F' : ''}`;
  if (!cache.has(key)) cache.set(key, bakeCollector(!!filled));
  return cache.get(key);
}
