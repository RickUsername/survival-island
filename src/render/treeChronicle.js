// ============================================
// Jahres-Chronik am Hauptbaum
// ============================================
// Der Baum wächst ohnehin über ein ganzes Jahr auf Stufe 10. Hier wird er
// zusätzlich zum Protokoll der eigenen Arbeit: Für jedes Lernthema im
// Tagebuch und jedes Hobbyprojekt hängt ein Schmuckstück in der Krone.
//
// Je mehr Zeit in ein Thema geflossen ist, desto größer und wertvoller
// wird sein Anhänger — von der schlichten Schnur über das Band bis zur
// Laterne, die nachts wirklich leuchtet.

import { hash2 } from './noise';
import { getGrowthTree } from './treeGrowth';

const HOUR = 60 * 60 * 1000;

// Stufen: ab wie vielen Stunden welcher Anhänger erscheint
const TIERS = [
  { hours: 0,   kind: 'ribbon',   size: 0.75 },
  { hours: 5,   kind: 'ribbon',   size: 1.0 },
  { hours: 15,  kind: 'bead',     size: 1.0 },
  { hours: 40,  kind: 'lantern',  size: 1.0 },
  { hours: 100, kind: 'lantern',  size: 1.35 },
];

const RIBBON_COLORS = [
  ['#e0574f', '#b83f38'], ['#4f8fe0', '#3a6bb0'], ['#59c07a', '#3f9159'],
  ['#e0a94f', '#b8853a'], ['#a874d8', '#7f52aa'], ['#e07fa8', '#b25c81'],
];

function tierFor(ms) {
  const hours = ms / HOUR;
  let t = TIERS[0];
  for (const tier of TIERS) if (hours >= tier.hours) t = tier;
  return t;
}

/**
 * Sammelt alle Anhänger aus dem Spielstand.
 * Rein lesend — das Rendering verändert nichts am Zustand.
 */
export function collectOrnaments(gameState) {
  const out = [];
  if (!gameState) return out;

  for (const topic of gameState.diary?.topics || []) {
    if (!topic.totalTimeMs || topic.totalTimeMs <= 0) continue;
    out.push({
      id: topic.id,
      name: topic.name,
      ms: topic.totalTimeMs,
      source: 'diary',
      ...tierFor(topic.totalTimeMs),
    });
  }

  for (const project of gameState.hobbyDiary?.projects || []) {
    if (!project.totalTimeMs || project.totalTimeMs <= 0) continue;
    out.push({
      id: project.id,
      name: project.name,
      ms: project.totalTimeMs,
      source: 'hobby',
      ...tierFor(project.totalTimeMs),
    });
  }

  // Stabile Reihenfolge, damit Anhänger nicht springen
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return out;
}

/**
 * Position eines Anhängers (relativ zum Stammfuß).
 *
 * Die Anhänger hängen am UNTEREN Kronenrand, wie Schmuck an Zweigspitzen.
 * Mitten im Laub wären sie zwischen den Blättern kaum zu erkennen — hier
 * heben sie sich gegen Stamm und Wiese ab.
 */
function ornamentSpot(index, total, sprite) {
  const perRow = Math.min(Math.max(total, 1), 7);
  const row = Math.floor(index / perRow);
  const i = index % perRow;
  const frac = perRow === 1 ? 0.5 : i / (perRow - 1);

  // Über die volle Kronenbreite verteilen, außen etwas höher (Kronenbogen)
  const spanX = sprite.w * 0.38;
  const x = (frac - 0.5) * 2 * spanX;
  const arc = Math.pow(Math.abs(frac - 0.5) * 2, 2) * sprite.h * 0.06;

  // Weitere Reihen hängen gestaffelt darüber
  const baseY = -sprite.h * 0.42 - row * sprite.h * 0.11;

  return { x, y: baseY - arc };
}

function drawRibbon(ctx, x, y, s, colors, t, phase) {
  const swingA = Math.sin(t * 1.6 + phase) * 0.22;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swingA);

  // Schnur
  ctx.strokeStyle = 'rgba(214,196,150,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -6 * s);
  ctx.lineTo(0, 0);
  ctx.stroke();

  // Zwei Bandschlaufen
  ctx.fillStyle = colors[0];
  ctx.beginPath();
  ctx.ellipse(-3.2 * s, 1.5 * s, 3.2 * s, 2.1 * s, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(3.2 * s, 1.5 * s, 3.2 * s, 2.1 * s, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Knoten
  ctx.fillStyle = colors[1];
  ctx.beginPath();
  ctx.arc(0, 0.8 * s, 1.7 * s, 0, Math.PI * 2);
  ctx.fill();
  // Enden
  ctx.strokeStyle = colors[1];
  ctx.lineWidth = 1.6 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-1 * s, 2 * s);
  ctx.quadraticCurveTo(-2.5 * s, 5 * s, -1.2 * s, 7.5 * s);
  ctx.moveTo(1 * s, 2 * s);
  ctx.quadraticCurveTo(2.5 * s, 5 * s, 1.2 * s, 7.5 * s);
  ctx.stroke();

  ctx.restore();
}

function drawBead(ctx, x, y, s, colors, t, phase) {
  const swingA = Math.sin(t * 1.4 + phase) * 0.26;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swingA);

  ctx.strokeStyle = 'rgba(214,196,150,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -8 * s);
  ctx.lineTo(0, -1 * s);
  ctx.stroke();

  // Drei aufgefädelte Perlen
  for (let i = 0; i < 3; i++) {
    const r = (2.6 - i * 0.4) * s;
    const py = i * 3.1 * s;
    const g = ctx.createRadialGradient(-r * 0.35, py - r * 0.35, 0, 0, py, r);
    g.addColorStop(0, colors[0]);
    g.addColorStop(1, colors[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-r * 0.35, py - r * 0.38, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawLantern(ctx, x, y, s, colors, t, phase, glow) {
  const swingA = Math.sin(t * 1.1 + phase) * 0.18;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swingA);

  // Aufhängung
  ctx.strokeStyle = 'rgba(90,72,44,0.9)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, -9 * s);
  ctx.lineTo(0, -5 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -5 * s, 2.4 * s, Math.PI, 0);
  ctx.stroke();

  // Lichthof zuerst, damit das Papier davor liegt
  if (glow > 0.02) {
    const gr = 26 * s;
    const halo = ctx.createRadialGradient(0, 1.5 * s, 0, 0, 1.5 * s, gr);
    halo.addColorStop(0, `rgba(255,206,120,${0.45 * glow})`);
    halo.addColorStop(0.45, `rgba(255,186,96,${0.14 * glow})`);
    halo.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 1.5 * s, gr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Papierkörper
  const flicker = 0.85 + Math.sin(t * 7 + phase * 3) * 0.12;
  const body = ctx.createLinearGradient(-3.5 * s, 0, 3.5 * s, 0);
  const lit = glow > 0.02;
  body.addColorStop(0, lit ? `rgba(240,168,72,${flicker})` : colors[1]);
  body.addColorStop(0.45, lit ? `rgba(255,222,150,${flicker})` : colors[0]);
  body.addColorStop(1, lit ? `rgba(232,152,60,${flicker})` : colors[1]);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-3.4 * s, -3 * s);
  ctx.quadraticCurveTo(-4.6 * s, 1.5 * s, -3.4 * s, 5.5 * s);
  ctx.lineTo(3.4 * s, 5.5 * s);
  ctx.quadraticCurveTo(4.6 * s, 1.5 * s, 3.4 * s, -3 * s);
  ctx.closePath();
  ctx.fill();

  // Deckel und Boden
  ctx.fillStyle = 'rgba(84,64,40,0.95)';
  ctx.fillRect(-3.8 * s, -3.9 * s, 7.6 * s, 1.5 * s);
  ctx.fillRect(-3.2 * s, 5.2 * s, 6.4 * s, 1.3 * s);

  // Rippen
  ctx.strokeStyle = 'rgba(110,80,44,0.4)';
  ctx.lineWidth = 0.7;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 1.9 * s, -2.6 * s);
    ctx.lineTo(i * 2.4 * s, 5.2 * s);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Zeichnet die Chronik in die Krone des Hauptbaums.
 * @param {number} nightGlow 0..1 — wie stark die Laternen leuchten
 */
export function drawChronicle(ctx, cx, cy, stage, gameState, t, nightGlow = 0) {
  // Vor Stufe 3 ist der Baum ein Keimling, da hängt noch nichts dran
  if (stage < 3) return [];

  const ornaments = collectOrnaments(gameState);
  if (ornaments.length === 0) return [];

  const sprite = getGrowthTree(stage, 0, true);
  // Deutlich größer als der erste Entwurf: als winzige Punkte im Laub
  // waren die Anhänger nicht als Chronik lesbar.
  const scale = 1.5 * Math.min(1, 0.55 + (stage / 10) * 0.45);
  const lights = [];

  ornaments.forEach((orn, i) => {
    const spot = ornamentSpot(i, ornaments.length, sprite);
    const x = cx + spot.x;
    const y = cy + spot.y;
    const s = orn.size * scale * (orn.kind === 'lantern' ? 1.1 : 1);
    const phase = hash2(i, orn.ms | 0, 7331) * Math.PI * 2;

    const colorIdx = Math.floor(hash2(i, orn.name.length, 991) * RIBBON_COLORS.length);
    const colors = orn.source === 'hobby'
      ? ['#d8a0c8', '#a8709c']          // Hobbyprojekte in Wollrosa
      : RIBBON_COLORS[colorIdx % RIBBON_COLORS.length];

    if (orn.kind === 'lantern') {
      drawLantern(ctx, x, y, s, colors, t, phase, nightGlow);
      if (nightGlow > 0.05) {
        lights.push({ x, y: y + 1.5 * s, radius: 54 * s, intensity: 0.5 * nightGlow });
      }
    } else if (orn.kind === 'bead') {
      drawBead(ctx, x, y, s, colors, t, phase);
    } else {
      drawRibbon(ctx, x, y, s, colors, t, phase);
    }
  });

  return lights;
}
