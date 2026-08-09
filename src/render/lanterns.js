// ============================================
// Laternenweg — sichtbare Belohnung für die Fokus-Serie
// ============================================
// Für jeden Tag mit abgeschlossener Sammelreise oder Hobbysitzung steht
// eine Laterne mehr am Weg quer über die Insel. Abends brennen sie und
// werfen echtes Licht. Reißt die Serie, verlöschen sie über drei Tage
// hinweg — kein hartes Zurück auf null.

import { hash2, valueNoise } from './noise';
import { MAP_WIDTH, MAP_HEIGHT } from '../utils/constants';

const MAX_LANTERNS = 24;

/**
 * Positionen entlang eines sanft geschwungenen Weges.
 * Bewusst durch die untere Inselhälfte, damit sie weder den Hauptbaum
 * noch den Teich stören.
 */
function lanternSpot(i) {
  const t = (i + 0.5) / MAX_LANTERNS;
  const x = 90 + t * (MAP_WIDTH - 180);
  const y = MAP_HEIGHT * 0.30
    + Math.sin(t * Math.PI * 1.7) * MAP_HEIGHT * 0.2
    + (hash2(i, 3, 4409) - 0.5) * 26;
  return { x, y };
}

function drawPost(ctx, x, y, glow, t, i) {
  const h = 30;
  const flick = 0.8 + valueNoise(t * 5 + i * 3, 0, 61) * 0.4;

  // Pfosten
  const g = ctx.createLinearGradient(x - 2, 0, x + 2, 0);
  g.addColorStop(0, '#4a3520');
  g.addColorStop(0.5, '#6e5030');
  g.addColorStop(1, '#3d2b18');
  ctx.fillStyle = g;
  ctx.fillRect(x - 1.8, y - h, 3.6, h);
  // Fuß
  ctx.fillStyle = 'rgba(58,44,26,0.8)';
  ctx.beginPath();
  ctx.ellipse(x, y, 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ausleger
  ctx.strokeStyle = '#5a412a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.quadraticCurveTo(x + 5, y - h - 3, x + 7, y - h + 1);
  ctx.stroke();

  const lx = x + 7;
  const ly = y - h + 4;

  // Lichthof
  if (glow > 0.02) {
    const r = 30 * glow;
    const halo = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
    halo.addColorStop(0, `rgba(255,206,124,${0.42 * glow * flick})`);
    halo.addColorStop(0.4, `rgba(255,182,90,${0.14 * glow * flick})`);
    halo.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Laternengehäuse
  ctx.fillStyle = '#3f3020';
  ctx.fillRect(lx - 3.4, ly - 5.5, 6.8, 1.6);
  ctx.fillRect(lx - 3, ly + 3.6, 6, 1.6);
  const body = ctx.createLinearGradient(lx - 3, 0, lx + 3, 0);
  if (glow > 0.02) {
    body.addColorStop(0, `rgba(226,150,58,${0.85 * flick})`);
    body.addColorStop(0.45, `rgba(255,224,150,${0.95 * flick})`);
    body.addColorStop(1, `rgba(220,142,52,${0.85 * flick})`);
  } else {
    body.addColorStop(0, '#57493a');
    body.addColorStop(0.5, '#786a58');
    body.addColorStop(1, '#4a3d30');
  }
  ctx.fillStyle = body;
  ctx.fillRect(lx - 3, ly - 4, 6, 7.6);
  // Streben
  ctx.strokeStyle = 'rgba(52,40,26,0.75)';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(lx - 3, ly - 4, 6, 7.6);
  ctx.beginPath();
  ctx.moveTo(lx, ly - 4);
  ctx.lineTo(lx, ly + 3.6);
  ctx.stroke();
}

/**
 * Zeichnet den Laternenweg.
 * @param {number} count  brennende Laternen (aus activeLanterns())
 * @param {number} glow   0..1, wie dunkel es ist
 * @returns {Array} Lichtquellen in Weltkoordinaten für den Licht-Pass
 */
export function drawLanternPath(ctx, count, glow, t) {
  const n = Math.min(MAX_LANTERNS, Math.max(0, count));
  if (n === 0) return [];

  const lights = [];
  for (let i = 0; i < n; i++) {
    const { x, y } = lanternSpot(i);
    drawPost(ctx, x, y, glow, t, i);
    if (glow > 0.05) {
      lights.push({ x: x + 7, y: y - 26, radius: 78, intensity: 0.42 * glow });
    }
  }
  return lights;
}

export { MAX_LANTERNS };
