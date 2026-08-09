// ============================================
// Begehbares Biom während der Sammelreise
// ============================================
// Nutzt dieselbe Render-Engine wie die Heimatinsel: gebackenes Terrain,
// Baumsprites, Tageslicht, Wind, Partikel und Licht-Komposition. Die Figur
// läuft frei umher, während der Timer weiterläuft — die Beute wird nach wie
// vor am Ende der Reise berechnet, hier gibt es nur die Landschaft dazu.

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { TILE_SIZE, TILE_TYPES, COLLISION_TILES } from '../utils/constants';
import { BIOME_MAPS, biomeStart } from '../data/biomeMaps';
import { getTerrain, getWaterMask } from '../render/terrain';
import {
  getTreeSprite, getBushSprite, treeJitter,
  TREE_W, TREE_H, TREE_ANCHOR_X, TREE_ANCHOR_Y, BUSH_W, BUSH_H,
} from '../render/treeSprites';
import { getAtmosphere, applyWeather } from '../render/atmosphere';
import { applyLighting, dropShadow, contactShadow } from '../render/lighting';
import { canvasDpr } from '../render/quality';
import { windStrength, sway } from '../render/wind';
import {
  drawButterflies, drawFireflies, drawMotes, drawFallingLeaves,
  drawRain, drawSplashes, drawStars, drawWetSheen,
  drawSnow, drawLightning, drawFogBanks,
} from '../render/particles';
import { hash2, valueNoise } from '../render/noise';

const WALK_SPEED = 2.6;

export default function BiomeCanvas({ direction, weather, timeOverride, canvasSize, onFound }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const posRef = useRef(null);
  const targetRef = useRef(null);
  const facingRef = useRef(1);
  const movingRef = useRef(false);
  const atmoRef = useRef(null);
  const foundRef = useRef(new Set());
  const [, force] = useState(0);

  const biome = BIOME_MAPS[direction] || BIOME_MAPS.north;
  const map = biome.map;
  const rows = map.length;
  const cols = map[0].length;
  const worldW = cols * TILE_SIZE;
  const worldH = rows * TILE_SIZE;

  // Startposition einmalig setzen
  if (!posRef.current) posRef.current = biomeStart(direction);

  // Sammelbare Funde: feste Plätze je Biom, rein visuell
  const spots = useRef(null);
  if (!spots.current) {
    const list = [];
    for (let i = 0; i < 14; i++) {
      const c = 2 + Math.floor(hash2(i, 1, biome.seed) * (cols - 4));
      const r = 2 + Math.floor(hash2(i, 2, biome.seed) * (rows - 4));
      if (map[r][c] !== TILE_TYPES.GRASS) continue;
      list.push({ id: `s${i}`, x: c * TILE_SIZE + 32, y: r * TILE_SIZE + 32 });
    }
    spots.current = list;
  }

  const getScale = useCallback(() => {
    // Näher dran als auf der Heimatinsel — man soll die Landschaft spüren
    return Math.max(canvasSize.width / worldW, canvasSize.height / worldH, 0.9);
  }, [canvasSize, worldW, worldH]);

  const getCamera = useCallback(() => {
    const scale = getScale();
    const p = posRef.current;
    const cw = canvasSize.width;
    const ch = canvasSize.height;
    const sw = worldW * scale;
    const sh = worldH * scale;

    let x = cw / 2 - p.x * scale;
    let y = ch / 2 - p.y * scale;
    x = sw >= cw ? Math.min(0, Math.max(cw - sw, x)) : (cw - sw) / 2;
    y = sh >= ch ? Math.min(0, Math.max(ch - sh, y)) : (ch - sh) / 2;
    return { x, y, scale };
  }, [canvasSize, getScale, worldW, worldH]);

  // --- Bewegung ---
  useEffect(() => {
    const id = setInterval(() => {
      const p = posRef.current;
      const t = targetRef.current;
      if (!t) { movingRef.current = false; return; }

      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < WALK_SPEED) {
        targetRef.current = null;
        movingRef.current = false;
        return;
      }
      if (Math.abs(dx) > 1) facingRef.current = dx > 0 ? 1 : -1;

      const nx = p.x + (dx / dist) * WALK_SPEED;
      const ny = p.y + (dy / dist) * WALK_SPEED;
      const c = Math.floor(nx / TILE_SIZE);
      const r = Math.floor(ny / TILE_SIZE);
      if (c < 0 || r < 0 || c >= cols || r >= rows) { targetRef.current = null; return; }
      if (COLLISION_TILES.includes(map[r][c])) { targetRef.current = null; return; }

      p.x = nx;
      p.y = ny;
      movingRef.current = true;

      // Funde einsammeln, an denen man vorbeikommt
      for (const s of spots.current) {
        if (foundRef.current.has(s.id)) continue;
        if (Math.hypot(p.x - s.x, p.y - s.y) < 34) {
          foundRef.current.add(s.id);
          force(v => v + 1);
          if (onFound) onFound();
        }
      }
    }, 1000 / 60);
    return () => clearInterval(id);
  }, [cols, rows, map, onFound]);

  // --- Zeichnen ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let lastW = 0, lastH = 0, lastDpr = 0;

    const render = () => {
      const t = Date.now() / 1000;
      const w = canvasSize.width;
      const h = canvasSize.height;
      const dpr = canvasDpr();

      if (lastW !== w || lastH !== h || lastDpr !== dpr) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        lastW = w; lastH = h; lastDpr = dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const atmo = applyWeather(getAtmosphere(new Date(), timeOverride ?? null), weather);
      atmoRef.current = atmo;
      const wet = !!atmo.wet;
      const snowy = !!atmo.snow;
      const windAmt = windStrength(t, wet) * (atmo.storm ? 1.9 : 1);

      // Himmel
      const sky = atmo.sky;
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, `rgb(${sky[0] | 0},${sky[1] | 0},${sky[2] | 0})`);
      bg.addColorStop(1, `rgb(${sky[0] * 0.55 | 0},${sky[1] * 0.55 | 0},${sky[2] * 0.6 | 0})`);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      drawStars(ctx, t, w, h, atmo.starAlpha * 0.9);

      const cam = getCamera();
      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.scale, cam.scale);

      // Boden
      ctx.drawImage(getTerrain(map, biome.key, biome.seed), 0, 0);

      // Wasseroberfläche
      const cells = getWaterMask(map, biome.key, biome.seed);
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      for (const c of cells) {
        const v = (Math.sin(c.x * 0.05 + c.y * 0.028 + t * 1.5) * 0.6
                 + Math.sin(c.x * 0.021 - c.y * 0.045 + t * 0.9) * 0.4) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(190,225,245,${0.05 + v * 0.11})`;
        ctx.fillRect(c.x - 16, c.y - 16, 32, 32);
      }
      ctx.restore();
      // Sonnenglitzern
      const sparkle = Math.max(0, atmo.sunAlt) * 0.9;
      if (sparkle > 0.03) {
        for (let i = 0; i < cells.length; i += 2) {
          const c = cells[i];
          const s = Math.sin(t * 2.4 + hash2(c.x | 0, c.y | 0, 61) * 30);
          if (s < 0.87) continue;
          ctx.fillStyle = `rgba(255,252,232,${(s - 0.87) / 0.13 * sparkle})`;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, 2.4, 1.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Windwellen über dem Gras
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      for (let b = 0; b < 4; b++) {
        const offset = (t * (90 + b * 34) + b * 431) % (worldW + 700) - 350;
        const yBase = (b / 4) * worldH + Math.sin(t * 0.3 + b) * 60;
        const bh = 140 + b * 45;
        const a = (0.1 + valueNoise(t * 0.4 + b, 0, 91) * 0.16) * windAmt;
        const g = ctx.createLinearGradient(offset, 0, offset + 300, 0);
        g.addColorStop(0, 'rgba(255,255,240,0)');
        g.addColorStop(0.5, `rgba(255,255,236,${a})`);
        g.addColorStop(1, 'rgba(255,255,240,0)');
        ctx.fillStyle = g;
        ctx.fillRect(offset, yBase - bh / 2, 300, bh);
      }
      ctx.restore();

      // Sammelbare Funde
      for (const s of spots.current) {
        if (foundRef.current.has(s.id)) continue;
        const pulse = 0.6 + Math.sin(t * 2.6 + s.x) * 0.4;
        const halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 22);
        halo.addColorStop(0, `rgba(255,238,160,${0.4 * pulse})`);
        halo.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,248,206,${0.7 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y - Math.sin(t * 2 + s.y) * 3, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Bäume und Büsche, nach Tiefe sortiert ---
      const flora = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tile = map[r][c];
          if (tile !== TILE_TYPES.TREE && tile !== TILE_TYPES.BUSH) continue;
          const j = treeJitter(c, r);
          const big = tile === TILE_TYPES.TREE;
          let by = r * TILE_SIZE + TILE_SIZE - 6 + j.dy;
          if (big) by = Math.max(by, (TREE_ANCHOR_Y - 24) * j.scale);
          flora.push({ c, r, j, big, bx: c * TILE_SIZE + TILE_SIZE / 2 + j.dx, by });
        }
      }
      for (const f of flora) {
        dropShadow(ctx, f.bx, f.by, (f.big ? 46 : 27) * f.j.scale, (f.big ? 26 : 15) * f.j.scale, atmo, 1.5);
      }

      const p = posRef.current;
      const all = flora.map(f => ({ y: f.by, f }));
      all.push({ y: p.y + 24, player: true });
      all.sort((a, b) => a.y - b.y);

      for (const e of all) {
        if (e.player) { drawWalker(ctx, p, facingRef.current, movingRef.current, atmo); continue; }
        const f = e.f;
        const sprite = f.big ? getTreeSprite(f.c, f.r) : getBushSprite(f.c, f.r);
        const bend = sway(f.bx, f.by, t + f.j.phase, windAmt, f.big ? 2.6 : 1.8);
        ctx.save();
        ctx.translate(f.bx, f.by);
        ctx.transform(1, 0, bend * 0.05, 1, 0, 0);
        ctx.scale(f.j.flip ? -f.j.scale : f.j.scale, f.j.scale);
        ctx.drawImage(sprite, f.big ? -TREE_ANCHOR_X : -BUSH_W / 2,
          f.big ? -TREE_ANCHOR_Y : -(BUSH_H - 6),
          f.big ? TREE_W : BUSH_W, f.big ? TREE_H : BUSH_H);
        ctx.restore();
      }

      // Kleintiere der Luft
      if (!wet && !snowy) {
        drawMotes(ctx, t, 30, Math.max(0, atmo.sunAlt) * 0.4 + atmo.goldenness * 0.35);
        drawButterflies(ctx, t, 6, Math.max(0, Math.min(1, (atmo.sunAlt - 0.05) * 3)));
      }
      drawFireflies(ctx, t, 14, Math.max(0, Math.min(1, (-atmo.sunAlt - 0.02) * 4)));
      const autumn = atmo.season < -0.1 && atmo.season > -0.85;
      drawFallingLeaves(ctx, t, autumn ? 24 : 8, 0.75, autumn ? 'autumn' : 'green');

      ctx.restore();

      applyLighting(ctx, w, h, atmo, []);

      if (wet) {
        drawWetSheen(ctx, w, h, atmo.storm ? 1.25 : 1);
        drawRain(ctx, t, w, h, atmo.storm ? 1.45 : 1, 0.55 + windAmt * 0.5);
        drawSplashes(ctx, t, w, h, 1);
      }
      if (atmo.storm) drawLightning(ctx, t, w, h);
      if (snowy) drawSnow(ctx, t, w, h, 1, 0.4 + windAmt * 0.4);
      if (atmo.fog) drawFogBanks(ctx, t, w, h, 1);

      rafRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(rafRef.current);
  }, [canvasSize, getCamera, map, biome, rows, cols, worldW, worldH, weather, timeOverride]);

  // Klick = hingehen
  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cam = getCamera();
    const wx = (e.clientX - rect.left - cam.x) / cam.scale;
    const wy = (e.clientY - rect.top - cam.y) / cam.scale;
    const c = Math.floor(wx / TILE_SIZE);
    const r = Math.floor(wy / TILE_SIZE);
    if (c < 0 || r < 0 || c >= cols || r >= rows) return;
    if (COLLISION_TILES.includes(map[r][c])) return;
    targetRef.current = { x: wx, y: wy };
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ display: 'block', cursor: 'pointer', touchAction: 'none' }}
    />
  );
}

/** Kompakte Wandererfigur — dieselbe Silhouette wie auf der Heimatinsel */
function drawWalker(ctx, p, face, moving, atmo) {
  const now = Date.now();
  const walk = moving ? Math.sin(now / 115) : 0;
  const bob = Math.abs(walk) * 1.6;
  const S = 1.1;
  const px = p.x;
  const py = p.y;
  const feetY = py + 20 * S;

  if (atmo) dropShadow(ctx, px, feetY, 14, 6.5, atmo, 1.3);
  contactShadow(ctx, px, feetY, 10, 3.6, 0.3);

  ctx.lineCap = 'round';
  // Haare hinten
  ctx.fillStyle = '#DCBA43';
  ctx.beginPath();
  ctx.ellipse(px, py - 12 * S - bob, 7.6 * S, 14 * S, 0, 0, Math.PI * 2);
  ctx.fill();
  // Beine
  ctx.strokeStyle = '#232338';
  ctx.lineWidth = 5.4 * S;
  ctx.beginPath();
  ctx.moveTo(px - 3.4 * S, py + 4 * S - bob);
  ctx.lineTo(px - 3.4 * S - walk * 5, feetY);
  ctx.moveTo(px + 3.4 * S, py + 4 * S - bob);
  ctx.lineTo(px + 3.4 * S + walk * 5, feetY);
  ctx.stroke();
  // Rumpf
  const g = ctx.createLinearGradient(px, py - 8 * S - bob, px, py + 5 * S);
  g.addColorStop(0, '#59A6DC');
  g.addColorStop(0.6, '#8FC069');
  g.addColorStop(1, '#C9DA4C');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(px - 8.4 * S, py - 8 * S - bob);
  ctx.lineTo(px + 8.4 * S, py - 8 * S - bob);
  ctx.lineTo(px + 7.4 * S, py + 5 * S - bob);
  ctx.lineTo(px - 7.4 * S, py + 5 * S - bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(26,48,64,0.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Arme
  ctx.strokeStyle = '#7FB86C';
  ctx.lineWidth = 4.4 * S;
  ctx.beginPath();
  ctx.moveTo(px - 8 * S, py - 6 * S - bob);
  ctx.lineTo(px - 10.5 * S + walk * 4, py + 3 * S - bob);
  ctx.moveTo(px + 8 * S, py - 6 * S - bob);
  ctx.lineTo(px + 10.5 * S - walk * 4, py + 3 * S - bob);
  ctx.stroke();
  // Kopf
  ctx.fillStyle = '#F2BC9F';
  ctx.beginPath();
  ctx.ellipse(px, py - 17 * S - bob, 8 * S, 8.6 * S, 0, 0, Math.PI * 2);
  ctx.fill();
  // Haare oben
  ctx.fillStyle = '#E9C94F';
  ctx.beginPath();
  ctx.ellipse(px, py - 20 * S - bob, 9.6 * S, 6.6 * S, 0, 0, Math.PI * 2);
  ctx.fill();
  // Augen
  ctx.fillStyle = '#22405C';
  ctx.beginPath();
  ctx.arc(px + face * 1 * S - 2.6 * S, py - 16.4 * S - bob, 1.3 * S, 0, Math.PI * 2);
  ctx.arc(px + face * 1 * S + 2.6 * S, py - 16.4 * S - bob, 1.3 * S, 0, Math.PI * 2);
  ctx.fill();
}
