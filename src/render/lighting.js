// ============================================
// Licht-Komposition — Tageslicht, Lichtquellen, Bloom, Vignette
// ============================================
// Die Szene wird neutral gezeichnet; die gesamte Stimmung entsteht hier
// in einem Durchgang darüber. Vorteil: Der Tageszeitwechsel kostet nichts
// extra, und Lagerfeuer wirken nachts wirklich wie Lichtquellen.

import { rgb, mix } from './color';

// Lichtkarte in reduzierter Auflösung — weiche Verläufe brauchen
// keine vollen Pixel, das spart auf dem Handy spürbar Leistung.
const LIGHTMAP_DIV = 3;
let lm = null;

function getLightmap(w, h) {
  const lw = Math.max(1, Math.ceil(w / LIGHTMAP_DIV));
  const lh = Math.max(1, Math.ceil(h / LIGHTMAP_DIV));
  if (!lm || lm.canvas.width !== lw || lm.canvas.height !== lh) {
    const cv = document.createElement('canvas');
    cv.width = lw;
    cv.height = lh;
    lm = { canvas: cv, ctx: cv.getContext('2d') };
  }
  return lm;
}

/**
 * @param {CanvasRenderingContext2D} ctx  Ziel-Kontext (Bildschirm)
 * @param {number} w, h                   Viewport in CSS-Pixeln
 * @param {object} atmo                   aus getAtmosphere()
 * @param {Array}  lights                 [{x,y,radius,color,intensity}] in Bildschirmkoordinaten
 */
export function applyLighting(ctx, w, h, atmo, lights = []) {
  const dark = Math.min(0.82, atmo.darkness);

  // --- 1. Umgebungslicht + Lichtquellen als Multiply-Maske ---
  // Der Multiply-Durchgang läuft IMMER, nicht nur nachts: die Farbe des
  // Sonnenlichts färbt die ganze Szene ein. Mittags ist sie fast weiß und
  // fällt nicht auf, zur goldenen Stunde kippt alles ins Warme, nachts ins
  // Blaue. Genau das macht den Tagesverlauf sichtbar.
  {
    const { canvas: lc, ctx: lx } = getLightmap(w, h);
    const s = 1 / LIGHTMAP_DIV;

    // Nie ganz abdunkeln — die Insel soll auch um drei Uhr nachts lesbar sein
    const base = mix(atmo.ambient, [255, 255, 255], 0.3);
    lx.globalCompositeOperation = 'source-over';
    lx.fillStyle = rgb(base);
    lx.fillRect(0, 0, lc.width, lc.height);

    // Lichtquellen hellen die Maske auf
    if (lights.length) {
      lx.globalCompositeOperation = 'lighter';
      // Kunstlicht fällt erst auf, wenn es dämmert
      const visibility = Math.min(1, dark * 1.6);
      for (const L of lights) {
        const r = L.radius * s;
        const cx = L.x * s;
        const cy = L.y * s;
        if (cx < -r || cy < -r || cx > lc.width + r || cy > lc.height + r) continue;

        const g = lx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const i = L.intensity * visibility;
        g.addColorStop(0, rgb(L.color, 0.7 * i));
        g.addColorStop(0.45, rgb(L.color, 0.3 * i));
        g.addColorStop(1, rgb(L.color, 0));
        lx.fillStyle = g;
        lx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lc, 0, 0, w, h);
    ctx.restore();
  }

  // --- 2. Sättigung nachziehen ---
  // Multiply nimmt Kontrast; ein Hauch Overlay holt ihn zurück, damit
  // die Abendstimmung satt wirkt statt nur dunkel.
  const tintStrength = 0.1 + atmo.goldenness * 0.22 + dark * 0.16;
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = rgb(atmo.ambient, tintStrength);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // --- 2b. Jahreszeit ---
  // Die Insel steht auf einer einzigen gebackenen Textur. Statt sie viermal
  // im Jahr neu zu rendern, kippt hier ein Farbstich die ganze Szene:
  // Frühling frisch und hell, Sommer satt, Herbst warm, Winter kühl und blass.
  const s = atmo.season;              // 1 = Hochsommer, -1 = Hochwinter
  let grade = null;
  if (s < -0.45) {
    // Winter: entsättigt und ins Blaue
    grade = { color: [176, 196, 224], mode: 'overlay', a: 0.2 * Math.min(1, (-s - 0.45) / 0.5) };
  } else if (s < 0.1) {
    // Herbst/Vorfrühling: warmes Braun-Gold
    grade = { color: [214, 150, 74], mode: 'overlay', a: 0.16 * Math.min(1, (0.1 - s) / 0.55) };
  } else if (s < 0.55) {
    // Frühling: frisches Hellgrün
    grade = { color: [186, 222, 132], mode: 'soft-light', a: 0.18 };
  }
  if (grade && grade.a > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = grade.mode;
    ctx.fillStyle = rgb(grade.color, grade.a);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // --- 3. Warmes Streiflicht bei tiefer Sonne ---
  if (atmo.goldenness > 0.02) {
    const fromLeft = atmo.shadowDir > 0; // Sonne im Osten → Licht von rechts
    const gx = fromLeft ? w : 0;
    const g = ctx.createLinearGradient(gx, 0, w - gx, h * 0.6);
    g.addColorStop(0, `rgba(255,196,116,${0.3 * atmo.goldenness})`);
    g.addColorStop(0.5, `rgba(255,168,96,${0.1 * atmo.goldenness})`);
    g.addColorStop(1, 'rgba(255,150,80,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // --- 4. Lichtabgabe der Quellen ---
  // Reines Multiply lässt Feuerschein über grünem Gras giftgrün wirken:
  // das Grün bleibt ja dominant. Deshalb kommt hier zusätzlich echtes
  // warmes Licht dazu — erst ein enger, kräftiger Kern, dann ein weiter
  // weicher Schein.
  if (lights.length && dark > 0.04) {
    const visibility = Math.min(1, dark * 1.6);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      const i = L.intensity * visibility;

      // Kern: färbt den Boden direkt am Feuer wirklich orange
      const rc = L.radius * 0.36;
      const core = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, rc);
      core.addColorStop(0, rgb(L.color, i * 0.24));
      core.addColorStop(0.45, rgb(L.color, i * 0.1));
      core.addColorStop(1, rgb(L.color, 0));
      ctx.fillStyle = core;
      ctx.fillRect(L.x - rc, L.y - rc, rc * 2, rc * 2);

      // Weiter Schein
      const rg = L.radius * 0.95;
      const glow = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, rg);
      glow.addColorStop(0, rgb(L.color, i * 0.11));
      glow.addColorStop(0.45, rgb(L.color, i * 0.045));
      glow.addColorStop(1, rgb(L.color, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(L.x - rg, L.y - rg, rg * 2, rg * 2);
    }
    ctx.restore();
  }

  // --- 5. Nebelschleier am Morgen ---
  if (atmo.mist > 0.02) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgba(222,232,238,${0.34 * atmo.mist})`);
    g.addColorStop(0.55, `rgba(214,226,234,${0.16 * atmo.mist})`);
    g.addColorStop(1, `rgba(206,220,230,${0.05 * atmo.mist})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // --- 6. Vignette ---
  const vig = 0.2 + dark * 0.3;
  const r0 = Math.min(w, h) * 0.42;
  const r1 = Math.max(w, h) * 0.78;
  const v = ctx.createRadialGradient(w / 2, h * 0.48, r0, w / 2, h * 0.5, r1);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(6,10,26,${vig})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Zeichnet einen weichen Schlagschatten unter ein Objekt.
 * Richtung und Länge kommen aus dem Sonnenstand — morgens fallen
 * die Schatten nach Westen, abends nach Osten.
 */
export function dropShadow(ctx, x, y, width, height, atmo, opacityScale = 1) {
  const a = atmo.shadowAlpha * opacityScale;
  if (a <= 0.008) return;

  const skew = -atmo.shadowDir * atmo.shadowLength * 0.55;
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, skew, 0.42, 0, 0);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, width);
  g.addColorStop(0, `rgba(18,26,14,${a})`);
  g.addColorStop(0.6, `rgba(18,26,14,${a * 0.55})`);
  g.addColorStop(1, 'rgba(18,26,14,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Kontaktschatten direkt am Boden — hält Objekte „geerdet" */
export function contactShadow(ctx, x, y, rx, ry, alpha = 0.24) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(12,20,10,${alpha})`);
  g.addColorStop(1, 'rgba(12,20,10,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
