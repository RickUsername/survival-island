// ============================================
// Spiel-Canvas - Rendert die Karte und den Spieler
// ============================================

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  TILE_SIZE, MAP_COLS, MAP_ROWS, MAP_WIDTH, MAP_HEIGHT, TILE_TYPES,
} from '../utils/constants';
import homeMap, { TREE_POSITION } from '../data/homeMap';
import { ANIMAL_TYPES, ANIMAL_HUNGER_MAX } from '../systems/AnimalSystem';
import { getCatStage, CAT_AFFECTION_MAX } from '../systems/CatSystem';
import { FLOWER_TYPES, getFlowerGrowth, getFlowerStage, isFlowerBlooming } from '../systems/FlowerSystem';
import { isWaterCollectorActive } from '../systems/NeedsSystem';
// --- Render-Engine ---
import { getTerrain, getWaterMask } from '../render/terrain';
import {
  getTreeSprite, getBushSprite, treeJitter,
  TREE_W, TREE_H, TREE_ANCHOR_X, TREE_ANCHOR_Y, BUSH_W, BUSH_H,
} from '../render/treeSprites';
import { getGrowthTree, treeVariant } from '../render/treeGrowth';
import { getShelterSprite, getCollectorSprite, BUILD_ANCHOR_X, BUILD_ANCHOR_Y } from '../render/buildingSprites';
import { getAnimalSprite, A_W, A_GROUND } from '../render/animalSprites';
import { drawChronicle } from '../render/treeChronicle';
import { drawLanternPath } from '../render/lanterns';
import { activeLanterns } from '../systems/StreakSystem';
import { isMerchantHere, MERCHANT_TILE } from '../systems/MerchantSystem';
import { getMerchantSprite, drawMerchantPennants, M_ANCHOR_X, M_ANCHOR_Y } from '../render/merchantSprite';
import { getAtmosphere, applyWeather } from '../render/atmosphere';
import { applyLighting, dropShadow, contactShadow } from '../render/lighting';
import { windStrength, sway } from '../render/wind';
import { getWeedSprite, weedVariant, W_ANCHOR_X, W_ANCHOR_Y } from '../render/weedSprites';
import { canvasDpr } from '../render/quality';
import useTapHandler, { TAPPABLE_CANVAS_STYLE } from '../hooks/useTapHandler';
import {
  drawButterflies, drawFireflies, drawMotes, drawFallingLeaves,
  drawRain, drawSplashes, drawStars, drawWetSheen,
  drawSnow, drawLightning, drawHeatHaze, drawFogBanks,
} from '../render/particles';
import { hash2, valueNoise } from '../render/noise';

export default function GameCanvas({ gameState, onMapClick, onMouseMove, placementGhost, canvasSize, visitorPosition, visitorName, visitMode, hostSnapshot }) {
  const canvasRef = useRef(null);
  const animFrame = useRef(null);

  // Refs für den Render-Loop: So muss requestAnimationFrame nicht bei jedem
  // State-Update neu gestartet werden (das verursachte Frame-Drops)
  const gameStateRef = useRef(gameState);
  const placementGhostRef = useRef(placementGhost);
  const visitModeRef = useRef(visitMode);
  const visitorPositionRef = useRef(visitorPosition);
  const hostSnapshotRef = useRef(hostSnapshot);
  gameStateRef.current = gameState;
  placementGhostRef.current = placementGhost;
  visitModeRef.current = visitMode;
  visitorPositionRef.current = visitorPosition;
  hostSnapshotRef.current = hostSnapshot;

  // Refs für Draw-Funktionen: werden nach jeder useCallback-Änderung aktualisiert,
  // aber der Render-Loop liest nur aus Refs → kein RAF-Neustart nötig
  const drawFnsRef = useRef({});

  // Aktueller Lichtzustand — von der Uhr im HUD ausgelesen
  const atmoRef = useRef(null);
  // Laternen der Baum-Chronik melden hier ihre Lichtpositionen für den Licht-Pass
  const chronicleLightsRef = useRef([]);
  // Blickrichtung der Spielerin (1 = nach rechts), bleibt beim Stehenbleiben erhalten
  const facingRef = useRef(1);
  // Lichtquellen des Laternenwegs (Fokus-Serie)
  const lanternLightsRef = useRef([]);

  // Pinch-to-Zoom: Zoom-Level (1.0 = Standard, rausgezoomt bis gesamte Map sichtbar)
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const pinchRef = useRef({ active: false, startDist: 0, startZoom: 1.0 });

  // Minimaler Zoom: Gesamte Map muss ins Display passen
  const minZoom = Math.min(
    (canvasSize.width / MAP_WIDTH) / Math.max(canvasSize.width / MAP_WIDTH, canvasSize.height / MAP_HEIGHT),
    (canvasSize.height / MAP_HEIGHT) / Math.max(canvasSize.width / MAP_WIDTH, canvasSize.height / MAP_HEIGHT),
    0.7
  );

  // Skalierung berechnen damit Map den Viewport ausfüllt
  const getScale = useCallback(() => {
    const scaleX = canvasSize.width / MAP_WIDTH;
    const scaleY = canvasSize.height / MAP_HEIGHT;
    return Math.max(scaleX, scaleY) * zoomLevel; // cover × Zoom
  }, [canvasSize, zoomLevel]);

  // Kamera-Offset berechnen (Spieler zentriert, skaliert)
  const getCameraOffset = useCallback(() => {
    if (!gameState) return { x: 0, y: 0 };

    const scale = getScale();
    const cw = canvasSize.width;
    const ch = canvasSize.height;
    const scaledMapW = MAP_WIDTH * scale;
    const scaledMapH = MAP_HEIGHT * scale;

    let offsetX = cw / 2 - gameState.player.x * scale;
    let offsetY = ch / 2 - gameState.player.y * scale;

    // Wenn skalierte Map größer als Viewport → an Ränder klemmen
    // Wenn skalierte Map kleiner als Viewport → zentrieren
    if (scaledMapW >= cw) {
      offsetX = Math.min(0, Math.max(cw - scaledMapW, offsetX));
    } else {
      offsetX = (cw - scaledMapW) / 2;
    }
    if (scaledMapH >= ch) {
      offsetY = Math.min(0, Math.max(ch - scaledMapH, offsetY));
    } else {
      offsetY = (ch - scaledMapH) / 2;
    }

    return { x: offsetX, y: offsetY };
  }, [gameState, canvasSize, getScale]);

  // ============================================
  // Landschaft: gebackenes Terrain + animierte Oberflächen
  // ============================================

  // Das Terrain-Canvas wird einmal gebaut und danach nur noch geblittet.
  const terrainRef = useRef(null);
  const waterRef = useRef(null);
  const getTerrainCanvas = () => {
    if (!terrainRef.current) terrainRef.current = getTerrain(homeMap, 'home', 20240);
    return terrainRef.current;
  };
  const getWaterCells = () => {
    if (!waterRef.current) waterRef.current = getWaterMask(homeMap, 'home', 20240);
    return waterRef.current;
  };

  // Wasseroberfläche: Wellen, Glitzern und Spiegelung über dem
  // gebackenen Grund. Nur das hier bewegt sich pro Frame.
  const drawWaterSurface = useCallback((ctx, t, atmo) => {
    const cells = getWaterCells();
    if (!cells.length) return;

    ctx.save();

    // Sanfte Wellenbänder
    ctx.globalCompositeOperation = 'overlay';
    for (const c of cells) {
      const w1 = Math.sin(c.x * 0.05 + c.y * 0.028 + t * 1.5);
      const w2 = Math.sin(c.x * 0.021 - c.y * 0.045 + t * 0.9);
      const v = (w1 * 0.6 + w2 * 0.4) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(190,225,245,${0.05 + v * 0.11 * (1 - c.depth * 0.35)})`;
      ctx.fillRect(c.x - 16, c.y - 16, 32, 32);
    }
    ctx.globalCompositeOperation = 'source-over';

    // Kaustik-Netz im Flachwasser
    ctx.strokeStyle = `rgba(226,248,255,${0.13 + atmo.goldenness * 0.1})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (const c of cells) {
      if (c.depth > 0.55) continue;
      const ph = t * 1.1 + c.x * 0.02 + c.y * 0.015;
      const r = 7 + Math.sin(ph) * 4;
      ctx.moveTo(c.x + r, c.y);
      ctx.ellipse(c.x, c.y, r, r * 0.42, Math.sin(ph * 0.6), 0, Math.PI * 2);
    }
    ctx.stroke();

    // Glitzernde Sonnenreflexe auf der Wasseroberfläche
    const sparkleAlpha = Math.max(0, atmo.sunAlt) * 0.9 + atmo.goldenness * 0.5;
    if (sparkleAlpha > 0.03) {
      for (let i = 0; i < cells.length; i += 2) {
        const c = cells[i];
        const ph = t * 2.4 + hash2(c.x | 0, c.y | 0, 61) * 30;
        const s = Math.sin(ph);
        if (s < 0.86) continue;
        const a = (s - 0.86) / 0.14;
        const r = 1.6 + a * 3.4;
        ctx.fillStyle = `rgba(255,252,232,${a * sparkleAlpha})`;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, r, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Uferschaum
    ctx.strokeStyle = 'rgba(248,253,255,0.3)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (const c of cells) {
      if (c.depth > 0.14) continue;
      const wob = Math.sin(t * 1.6 + c.x * 0.04) * 2.5;
      ctx.moveTo(c.x - 12, c.y + wob);
      ctx.quadraticCurveTo(c.x, c.y + wob + 3, c.x + 12, c.y + wob);
    }
    ctx.stroke();

    ctx.restore();
  }, []);

  // Regentropfen-Ringe auf dem Wasser
  const drawWaterRain = useCallback((ctx, t) => {
    const cells = getWaterCells();
    ctx.strokeStyle = 'rgba(226,244,255,0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < cells.length; i += 3) {
      const c = cells[i];
      const cycle = 0.7 + hash2(c.x | 0, c.y | 0, 83) * 0.6;
      const p = ((t + hash2(c.x | 0, c.y | 0, 84) * cycle) % cycle) / cycle;
      if (p > 0.6) continue;
      const r = p * 13;
      ctx.globalAlpha = (1 - p / 0.6) * 0.45;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, r, r * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, []);

  // Schneedecke auf dem Boden. Liegt unter den Objekten, damit Bäume und
  // Hütten oben drauf stehen — und lässt das Wasser frei, das friert
  // stattdessen weiter unten in drawWaterSurface zu.
  const drawSnowCover = useCallback((ctx, t) => {
    ctx.save();

    // Grundschicht: weiches Weiß über die ganze Insel
    ctx.fillStyle = 'rgba(238,246,255,0.62)';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Verwehungen — dort, wo der Wind den Schnee zusammenschiebt
    for (let i = 0; i < 90; i++) {
      const dx = hash2(i, 1, 1201) * MAP_WIDTH;
      const dy = hash2(i, 2, 1202) * MAP_HEIGHT;
      const r = 26 + hash2(i, 3, 1203) * 58;
      const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, r);
      g.addColorStop(0, 'rgba(255,255,255,0.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(dx, dy, r, r * 0.55, hash2(i, 4, 1204) * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Frei geblasene Stellen, an denen Gras durchschaut
    for (let i = 0; i < 40; i++) {
      const bx = hash2(i, 5, 1205) * MAP_WIDTH;
      const by = hash2(i, 6, 1206) * MAP_HEIGHT;
      const r = 14 + hash2(i, 7, 1207) * 26;
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
      g.addColorStop(0, 'rgba(120,140,110,0.3)');
      g.addColorStop(1, 'rgba(120,140,110,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(bx, by, r, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Funkelnde Eiskristalle
    for (let i = 0; i < 120; i++) {
      const sx = hash2(i, 8, 1208) * MAP_WIDTH;
      const sy = hash2(i, 9, 1209) * MAP_HEIGHT;
      const tw = Math.sin(t * 2.4 + i * 2.1);
      if (tw < 0.9) continue;
      ctx.fillStyle = `rgba(255,255,255,${(tw - 0.9) * 9})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, []);

  // Windwellen über der Wiese: helle Böen, die sichtbar über das Gras laufen
  const drawWindRipples = useCallback((ctx, t, strength) => {
    if (strength < 0.05) return;
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';

    const bands = 5;
    for (let b = 0; b < bands; b++) {
      const speed = 90 + b * 34;
      const offset = (t * speed + b * 431) % (MAP_WIDTH + 700) - 350;
      const yBase = (b / bands) * MAP_HEIGHT + Math.sin(t * 0.3 + b) * 60;
      const h = 130 + b * 45;
      const a = (0.1 + valueNoise(t * 0.4 + b, 0, 91) * 0.16) * strength;

      const g = ctx.createLinearGradient(offset, 0, offset + 300, 0);
      g.addColorStop(0, 'rgba(255,255,240,0)');
      g.addColorStop(0.5, `rgba(255,255,236,${a})`);
      g.addColorStop(1, 'rgba(255,255,240,0)');
      ctx.fillStyle = g;
      ctx.fillRect(offset, yBase - h / 2, 300, h);
    }
    ctx.restore();
  }, []);

  // Randbäume und Büsche: Sprites mit Sonnenschatten und Windbewegung
  //
  // Die Krone ragt gut 130 px über den Stammfuß hinaus. In der obersten
  // Kartenreihe läge sie damit außerhalb des Bildes — deshalb rutschen
  // Bäume dort so weit nach unten, dass die Baumkronen sichtbar bleiben.
  const floraAnchor = useCallback((col, row, tile) => {
    const j = treeJitter(col, row);
    const big = tile === TILE_TYPES.TREE;
    let by = row * TILE_SIZE + TILE_SIZE - 6 + j.dy;
    if (big) by = Math.max(by, (TREE_ANCHOR_Y - 24) * j.scale);
    return { j, big, bx: col * TILE_SIZE + TILE_SIZE / 2 + j.dx, by };
  }, []);

  const drawEdgeFlora = useCallback((ctx, t, atmo, windAmt) => {
    // 1. Durchgang: alle Schatten, damit keiner über einem Baum liegt
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = homeMap[row][col];
        if (tile !== TILE_TYPES.TREE && tile !== TILE_TYPES.BUSH) continue;
        const { j, big, bx, by } = floraAnchor(col, row, tile);
        dropShadow(ctx, bx, by, (big ? 46 : 27) * j.scale, (big ? 26 : 15) * j.scale, atmo, 1.5);
        contactShadow(ctx, bx, by, (big ? 26 : 18) * j.scale, (big ? 9 : 6) * j.scale, 0.3);
      }
    }

    // 2. Durchgang: die Pflanzen selbst, von hinten nach vorn
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = homeMap[row][col];
        if (tile !== TILE_TYPES.TREE && tile !== TILE_TYPES.BUSH) continue;

        const { j, big, bx, by } = floraAnchor(col, row, tile);
        const sprite = big ? getTreeSprite(col, row) : getBushSprite(col, row);
        const w = big ? TREE_W : BUSH_W;
        const h = big ? TREE_H : BUSH_H;
        const ax = big ? TREE_ANCHOR_X : BUSH_W / 2;
        const ay = big ? TREE_ANCHOR_Y : BUSH_H - 6;

        // Der Stamm steht still, die Krone wiegt sich: leichte Scherung
        const bend = sway(bx, by, t + j.phase, windAmt, big ? 2.6 : 1.8);

        ctx.save();
        ctx.translate(bx, by);
        ctx.transform(1, 0, bend * 0.05, 1, 0, 0);
        ctx.scale(j.flip ? -j.scale : j.scale, j.scale);
        ctx.drawImage(sprite, -ax, -ay, w, h);
        ctx.restore();
      }
    }
  }, [floraAnchor]);

  // ============================================
  // Die Spielerin
  // ============================================
  // Etwas größer als vorher (die Umgebung hat deutlich an Detail gewonnen,
  // eine 40-px-Strichfigur fiel dagegen ab), mit Stoffvolumen, Haarsträhnen,
  // Blickrichtung und einer Laufanimation, die auch die Arme mitnimmt.
  const drawPlayer = useCallback((ctx, camera) => {
    if (!gameState) return;

    const px = gameState.player.x + camera.x;
    const py = gameState.player.y + camera.y;
    const now = Date.now();

    // --- Bewegung ---
    const isMoving = !!gameState.player.moving;
    const walk = isMoving ? Math.sin(now / 115) : 0;
    const walk2 = isMoving ? Math.sin(now / 115 + Math.PI / 2) : 0;
    const legSwing = walk * 6;
    const kneeSwing = walk * 3;
    const armSwing = walk * 5;
    const bodyBob = Math.abs(walk) * 1.8;
    const lean = isMoving ? 1.2 : 0;

    // Blickrichtung merken: bestimmt, wohin Gesicht und Haare zeigen
    const dx = (gameState.player.targetX ?? px) - px;
    if (Math.abs(dx) > 1.5) facingRef.current = dx > 0 ? 1 : -1;
    const face = facingRef.current;

    // Ruhiges Atmen im Stand
    const breathe = isMoving ? 0 : Math.sin(now / 1400) * 0.5;

    // --- Körperachse ---
    const S = 1.22;                       // Gesamtmaßstab
    const headY = py - 20 * S - bodyBob + breathe;
    const neckY = py - 11 * S - bodyBob + breathe;
    const shoulderY = py - 8.5 * S - bodyBob + breathe;
    const waistY = py + 1 * S - bodyBob;
    const hipY = py + 5 * S - bodyBob;
    const kneeY = py + 14 * S;
    const feetY = py + 22 * S;

    // --- Schatten ---
    const atmo = atmoRef.current;
    if (atmo) {
      dropShadow(ctx, px + lean, feetY + 1, 16, 7.5, atmo, 1.3);
    }
    contactShadow(ctx, px + lean, feetY + 1, 11, 4, 0.3);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // === Haare hinten (fallen über den Rücken) ===
    const hairBack = ctx.createLinearGradient(px, headY - 6 * S, px, headY + 18 * S);
    hairBack.addColorStop(0, '#E9C94F');
    hairBack.addColorStop(0.55, '#D9B63F');
    hairBack.addColorStop(1, '#B8952F');
    ctx.fillStyle = hairBack;
    ctx.beginPath();
    ctx.ellipse(px - face * 0.8, headY + 9 * S, 8.4 * S, 16 * S, -face * 0.04, 0, Math.PI * 2);
    ctx.fill();
    // Wehende Strähne
    const strand = Math.sin(now / 900) * 1.6 + (isMoving ? -face * 1.8 : 0);
    ctx.strokeStyle = 'rgba(200,168,58,0.75)';
    ctx.lineWidth = 2.2 * S;
    ctx.beginPath();
    ctx.moveTo(px - face * 6 * S, headY + 2 * S);
    ctx.quadraticCurveTo(px - face * 9 * S + strand, headY + 11 * S, px - face * 7 * S + strand * 1.6, headY + 20 * S);
    ctx.stroke();

    // === Beine (Leggings) ===
    const legColor = '#232338';
    const legHi = '#33334e';
    const drawLeg = (side, swing, knee) => {
      const hx = px + side * 3.6 * S;
      ctx.strokeStyle = legColor;
      ctx.lineWidth = 6.2 * S;
      ctx.beginPath();
      ctx.moveTo(hx, hipY);
      ctx.lineTo(hx + side * knee * 0.4 - knee * 0.5, kneeY);
      ctx.stroke();
      ctx.lineWidth = 5 * S;
      ctx.beginPath();
      ctx.moveTo(hx + side * knee * 0.4 - knee * 0.5, kneeY);
      ctx.lineTo(hx - swing, feetY - 2 * S);
      ctx.stroke();
      // Lichtkante vorn
      ctx.strokeStyle = legHi;
      ctx.lineWidth = 1.6 * S;
      ctx.beginPath();
      ctx.moveTo(hx + face * 1.6, hipY + 1);
      ctx.lineTo(hx + face * 1.6 - swing * 0.6, kneeY);
      ctx.stroke();
    };
    // Hinteres Bein zuerst
    if (walk >= 0) { drawLeg(-1, -legSwing, -kneeSwing); drawLeg(1, legSwing, kneeSwing); }
    else { drawLeg(1, legSwing, kneeSwing); drawLeg(-1, -legSwing, -kneeSwing); }

    // === Barfüße ===
    const drawFoot = (side, swing) => {
      const fx = px + side * 3.6 * S - swing;
      ctx.fillStyle = '#F2BC9F';
      ctx.beginPath();
      ctx.ellipse(fx + face * 1.2, feetY, 4.6 * S, 2.7 * S, face * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(198,140,110,0.55)';
      ctx.beginPath();
      ctx.ellipse(fx + face * 0.4, feetY + 1.2 * S, 3 * S, 1.5 * S, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    drawFoot(-1, -legSwing);
    drawFoot(1, legSwing);

    // === Hinterer Arm ===
    const sleeveGrad = (x1, y1, x2, y2) => {
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, '#4E96C8');
      g.addColorStop(0.55, '#7FB86C');
      g.addColorStop(1, '#AFCE58');
      return g;
    };
    const drawArm = (side, swing, back) => {
      const sx = px + side * 8.6 * S;
      const ex = px + side * 11.5 * S - swing * side * 0.2 + swing;
      const ey = hipY + 1 * S;
      // Dunkle Kontur zuerst, damit der Arm sich vom Pulli abhebt —
      // ohne sie verschwimmt er mit dem Rumpf zu einer Fläche.
      ctx.strokeStyle = 'rgba(26,48,64,0.5)';
      ctx.lineWidth = (back ? 6 : 6.8) * S;
      ctx.beginPath();
      ctx.moveTo(sx, shoulderY + 1.5 * S);
      ctx.quadraticCurveTo(sx + side * 2 * S, (shoulderY + ey) / 2, ex, ey);
      ctx.stroke();

      ctx.strokeStyle = sleeveGrad(sx, shoulderY, ex, ey);
      ctx.lineWidth = (back ? 4.6 : 5.2) * S;
      ctx.beginPath();
      ctx.moveTo(sx, shoulderY + 1.5 * S);
      ctx.quadraticCurveTo(sx + side * 2 * S, (shoulderY + ey) / 2, ex, ey);
      ctx.stroke();
      if (back) return { ex, ey };
      // Hand
      ctx.fillStyle = '#F2BC9F';
      ctx.beginPath();
      ctx.arc(ex, ey + 2 * S, 3.1 * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(198,140,110,0.4)';
      ctx.beginPath();
      ctx.arc(ex, ey + 3 * S, 2 * S, 0, Math.PI);
      ctx.fill();
      return { ex, ey };
    };
    const backSide = face > 0 ? -1 : 1;
    const backArm = drawArm(backSide, backSide === 1 ? -armSwing : armSwing, true);
    ctx.fillStyle = '#E3AE93';
    ctx.beginPath();
    ctx.arc(backArm.ex, backArm.ey + 2 * S, 2.8 * S, 0, Math.PI * 2);
    ctx.fill();

    // === Pulli ===
    const pulli = ctx.createLinearGradient(px, shoulderY - 3 * S, px, hipY + 4 * S);
    pulli.addColorStop(0, '#59A6DC');
    pulli.addColorStop(0.32, '#6FBAD6');
    pulli.addColorStop(0.68, '#A6CC5C');
    pulli.addColorStop(1, '#C9DA4C');
    ctx.fillStyle = pulli;
    ctx.beginPath();
    ctx.moveTo(px - 9.2 * S, shoulderY);
    ctx.quadraticCurveTo(px - 10 * S, waistY - 3 * S, px - 8.4 * S, waistY);
    ctx.quadraticCurveTo(px - 8.8 * S, hipY, px - 8.2 * S, hipY + 3 * S);
    ctx.lineTo(px + 8.2 * S, hipY + 3 * S);
    ctx.quadraticCurveTo(px + 8.8 * S, hipY, px + 8.4 * S, waistY);
    ctx.quadraticCurveTo(px + 10 * S, waistY - 3 * S, px + 9.2 * S, shoulderY);
    ctx.closePath();
    ctx.fill();
    // Umriss: hebt die Figur vor der detailreichen Wiese ab
    ctx.strokeStyle = 'rgba(26,48,64,0.42)';
    ctx.lineWidth = 1.3 * S;
    ctx.stroke();

    // Stofffalten
    ctx.strokeStyle = 'rgba(48,86,110,0.22)';
    ctx.lineWidth = 1.1 * S;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(px + i * 4.2 * S, shoulderY + 3 * S);
      ctx.quadraticCurveTo(px + i * 5 * S + walk2 * 0.8, waistY, px + i * 4 * S, hipY + 2 * S);
      ctx.stroke();
    }
    // Schattenseite
    const shadeSide = ctx.createLinearGradient(px - 9 * S, 0, px + 9 * S, 0);
    shadeSide.addColorStop(0, face > 0 ? 'rgba(20,40,60,0.22)' : 'rgba(255,255,255,0.14)');
    shadeSide.addColorStop(0.5, 'rgba(0,0,0,0)');
    shadeSide.addColorStop(1, face > 0 ? 'rgba(255,255,255,0.14)' : 'rgba(20,40,60,0.22)');
    ctx.fillStyle = shadeSide;
    ctx.beginPath();
    ctx.moveTo(px - 9.2 * S, shoulderY);
    ctx.lineTo(px + 9.2 * S, shoulderY);
    ctx.lineTo(px + 8.2 * S, hipY + 3 * S);
    ctx.lineTo(px - 8.2 * S, hipY + 3 * S);
    ctx.closePath();
    ctx.fill();

    // Bündchen am Saum
    ctx.fillStyle = 'rgba(150,168,52,0.85)';
    ctx.fillRect(px - 8.3 * S, hipY + 2.2 * S, 16.6 * S, 2 * S);

    // Rundkragen
    ctx.fillStyle = '#3F86B6';
    ctx.beginPath();
    ctx.ellipse(px, shoulderY - 0.5 * S, 6.2 * S, 2.6 * S, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2E6C96';
    ctx.beginPath();
    ctx.ellipse(px, shoulderY, 4.6 * S, 1.7 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    // === Hals und Kopf ===
    ctx.fillStyle = '#E3AE93';
    ctx.fillRect(px - 2.8 * S, neckY - 1 * S, 5.6 * S, 5 * S);

    const skin = ctx.createRadialGradient(
      px + face * 2 * S, headY - 3 * S, 1,
      px, headY, 11 * S
    );
    skin.addColorStop(0, '#FBD0B6');
    skin.addColorStop(0.7, '#F2BC9F');
    skin.addColorStop(1, '#DCA286');
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(px, headY, 9 * S, 9.6 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    // === Haare vorn ===
    const hairTop = ctx.createLinearGradient(px, headY - 12 * S, px, headY + 4 * S);
    hairTop.addColorStop(0, '#F6DC72');
    hairTop.addColorStop(0.6, '#E9C94F');
    hairTop.addColorStop(1, '#CFAE3C');
    ctx.fillStyle = hairTop;
    // Oberkopf
    ctx.beginPath();
    ctx.ellipse(px, headY - 3.4 * S, 10.8 * S, 7.6 * S, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,92,26,0.35)';
    ctx.lineWidth = 1.1 * S;
    ctx.stroke();
    // Seitlicher Fall
    ctx.beginPath();
    ctx.ellipse(px - 9.4 * S, headY + 3 * S, 3.6 * S, 9.5 * S, 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(px + 9.4 * S, headY + 3 * S, 3.6 * S, 9.5 * S, -0.14, 0, Math.PI * 2);
    ctx.fill();
    // Pony, zur Blickrichtung gescheitelt
    ctx.beginPath();
    ctx.ellipse(px + face * 1.6 * S, headY - 5.4 * S, 9.6 * S, 5 * S, face * 0.06, 0, Math.PI * 2);
    ctx.fill();
    // Einzelne Strähnen
    ctx.strokeStyle = 'rgba(190,158,50,0.5)';
    ctx.lineWidth = 0.9 * S;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(px + i * 3 * S, headY - 10 * S);
      ctx.quadraticCurveTo(px + i * 4 * S + face * 2, headY - 6 * S, px + i * 4.4 * S + face * 3, headY - 2 * S);
      ctx.stroke();
    }
    // Glanzlicht
    ctx.fillStyle = 'rgba(255,244,180,0.45)';
    ctx.beginPath();
    ctx.ellipse(px + face * 2.6 * S, headY - 7.4 * S, 4.4 * S, 2.2 * S, -face * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // === Gesicht (folgt der Blickrichtung) ===
    const eo = face * 1.1 * S;   // Versatz zur Blickseite
    const eye = (side) => {
      const ex = px + side * 3.2 * S + eo;
      const ey = headY + 0.8 * S;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 2.7 * S, 2.9 * S, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4E92BE';
      ctx.beginPath();
      ctx.arc(ex + face * 0.5 * S, ey + 0.3 * S, 1.9 * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22405C';
      ctx.beginPath();
      ctx.arc(ex + face * 0.6 * S, ey + 0.4 * S, 1 * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ex - 0.6 * S, ey - 0.8 * S, 0.75 * S, 0, Math.PI * 2);
      ctx.fill();
      // Wimpernkante
      ctx.strokeStyle = 'rgba(90,64,30,0.55)';
      ctx.lineWidth = 0.9 * S;
      ctx.beginPath();
      ctx.arc(ex, ey, 2.8 * S, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    };
    eye(-1);
    eye(1);

    // Augenbrauen
    ctx.strokeStyle = '#C4A43C';
    ctx.lineWidth = 0.9 * S;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(px + side * 3.2 * S + eo, headY - 2.4 * S, 3 * S, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    }

    // Nase
    ctx.strokeStyle = 'rgba(200,140,112,0.8)';
    ctx.lineWidth = 0.8 * S;
    ctx.beginPath();
    ctx.moveTo(px + eo + face * 0.4, headY + 2 * S);
    ctx.quadraticCurveTo(px + eo + face * 1.2, headY + 3.6 * S, px + eo, headY + 4 * S);
    ctx.stroke();

    // Mund
    ctx.strokeStyle = '#C97A72';
    ctx.lineWidth = 1.1 * S;
    ctx.beginPath();
    ctx.arc(px + eo, headY + 4.8 * S, 2.6 * S, 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.stroke();

    // Wangen
    ctx.fillStyle = 'rgba(240,140,130,0.22)';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(px + side * 5.8 * S + eo * 0.5, headY + 3 * S, 2.6 * S, 1.9 * S, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // === Vorderer Arm (über dem Pulli) ===
    drawArm(-backSide, backSide === 1 ? armSwing : -armSwing, false);
  }, [gameState]);

  // Einzelnes Gebäude an Position zeichnen (wiederverwendbar für normal + ghost)
  // Unterstand — die fünf Ausbaustufen kommen als gebackene Sprites aus
  // render/buildingSprites. Nachts brennt Licht hinter den Fenstern.
  const drawShelter = useCallback((ctx, sx, sy, level, alpha) => {
    const atmo = atmoRef.current;
    const lit = atmo ? atmo.darkness > 0.22 : false;
    const sprite = getShelterSprite(level, lit);
    const cx = sx + TILE_SIZE / 2;
    const cy = sy + TILE_SIZE - 4;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, cx - BUILD_ANCHOR_X, cy - BUILD_ANCHOR_Y);

    // Rauch aus dem Schornstein — erst ab dem Blockhaus
    if (level >= 3 && alpha > 0.9) {
      const t = Date.now() / 1000;
      const smokeX = cx + (level >= 5 ? 24 : 20);
      const smokeY = cy - (level >= 5 ? 92 : 74);
      for (let i = 0; i < 6; i++) {
        const life = 4.2;
        const p = ((t * 0.7 + i * (life / 6)) % life) / life;
        const py = smokeY - p * 52;
        const px = smokeX + Math.sin(p * 3.2 + i) * (5 + p * 15);
        const r = 3.5 + p * 13;
        ctx.fillStyle = `rgba(206,202,196,${(1 - p) * 0.2})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Stufen-Plakette
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(`Lv.${level}`, cx, sy + TILE_SIZE + 8);
    ctx.fillStyle = '#fff';
    ctx.fillText(`Lv.${level}`, cx, sy + TILE_SIZE + 8);
    ctx.restore();
  }, []);

  // Lagerfeuer: geschichtete Flammen, Glut, Funken und Rauch.
  // Nachts ist es außerdem die wichtigste Lichtquelle der Insel.
  const drawCampfire = useCallback((ctx, fx, fy, alpha) => {
    ctx.save();
    ctx.globalAlpha = alpha;

    const t = Date.now() / 1000;
    const cx = fx + TILE_SIZE / 2;
    const cy = fy + 40;
    // Unregelmäßiges Flackern statt gleichmäßigem Sinus
    const flick = 0.72
      + valueNoise(t * 7, 0, 31) * 0.3
      + Math.sin(t * 19) * 0.06;

    // Ascheteller
    ctx.fillStyle = 'rgba(48,40,34,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, 26, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Steinkranz — hintere Steine zuerst
    const stones = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.4;
      stones.push({
        x: cx + Math.cos(a) * 23,
        y: cy + 7 + Math.sin(a) * 11,
        r: 4.6 + hash2(i, 3, 17) * 2.6,
        back: Math.sin(a) < 0,
      });
    }
    const paintStone = (s) => {
      ctx.fillStyle = '#5d5952';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r, s.r * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7b766c';
      ctx.beginPath();
      ctx.ellipse(s.x - s.r * 0.2, s.y - s.r * 0.28, s.r * 0.62, s.r * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    stones.filter(s => s.back).forEach(paintStone);

    // Brennholz
    ctx.strokeStyle = '#4a3220';
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI + 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(a) * 15, cy + 6 - Math.sin(a) * 6);
      ctx.lineTo(cx + Math.cos(a) * 15, cy + 6 + Math.sin(a) * 6);
      ctx.stroke();
    }

    // Glut zwischen den Scheiten
    for (let i = 0; i < 7; i++) {
      const a = hash2(i, 1, 23) * Math.PI * 2;
      const d = hash2(i, 2, 23) * 12;
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 2.2 + i));
      ctx.fillStyle = `rgba(255,${104 + pulse * 90 | 0},32,${0.45 + pulse * 0.45})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + 5 + Math.sin(a) * d * 0.4, 1.8 + pulse * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flammen: drei Zungen, jede mit eigenem Rhythmus
    const flame = (ox, scale, hue, seed) => {
      const wob = valueNoise(t * 5 + seed, 0, 47) - 0.5;
      const hgt = (24 + wob * 9) * scale * flick;
      const wid = (9 + wob * 2.5) * scale;
      const bx = cx + ox;
      const by = cy + 4;

      const g = ctx.createLinearGradient(bx, by, bx, by - hgt);
      g.addColorStop(0, hue[0]);
      g.addColorStop(0.45, hue[1]);
      g.addColorStop(1, hue[2]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(bx - wid, by);
      ctx.quadraticCurveTo(bx - wid * 0.95, by - hgt * 0.5, bx + wob * 6, by - hgt);
      ctx.quadraticCurveTo(bx + wid * 0.95, by - hgt * 0.5, bx + wid, by);
      ctx.quadraticCurveTo(bx, by + 3, bx - wid, by);
      ctx.fill();
    };

    flame(-6, 0.85, ['rgba(210,52,12,0.85)', 'rgba(238,110,20,0.8)', 'rgba(252,190,60,0)'], 0);
    flame(7, 0.78, ['rgba(214,60,14,0.85)', 'rgba(242,128,26,0.8)', 'rgba(252,200,70,0)'], 11);
    flame(0, 1.1, ['rgba(236,88,18,0.95)', 'rgba(250,164,40,0.9)', 'rgba(255,232,140,0)'], 23);
    // Heißer Kern
    flame(0, 0.5, ['rgba(255,206,90,0.95)', 'rgba(255,244,196,0.85)', 'rgba(255,255,240,0)'], 37);

    stones.filter(s => !s.back).forEach(paintStone);

    // Funken
    for (let i = 0; i < 9; i++) {
      const life = 1.1 + hash2(i, 5, 29) * 1.1;
      const p = ((t + hash2(i, 6, 29) * life) % life) / life;
      const sx = cx + (hash2(i, 7, 29) - 0.5) * 16 + Math.sin(t * 3 + i) * 7 * p;
      const sy = cy + 2 - p * (34 + hash2(i, 8, 29) * 26);
      ctx.fillStyle = `rgba(255,${170 + hash2(i, 9, 29) * 70 | 0},70,${(1 - p) * 0.85})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5 * (1 - p * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }

    // Rauchfahne
    for (let i = 0; i < 5; i++) {
      const life = 3.4;
      const p = ((t * 0.85 + i * (life / 5)) % life) / life;
      const sy = cy - 18 - p * 56;
      const sx = cx + Math.sin(p * 3.4 + i) * (7 + p * 16);
      const r = 4 + p * 15;
      ctx.fillStyle = `rgba(196,192,186,${(1 - p) * 0.16})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, []);
  // Regenfänger: gespanntes Tuch über einem Fass. Ob Wasser drin ist,
  // sieht man dem Bau an — das war vorher nicht erkennbar.
  const drawWaterCollector = useCallback((ctx, wx, wy, alpha) => {
    const filled = isWaterCollectorActive(gameStateRef.current?.buildings || {});
    const sprite = getCollectorSprite(filled);
    const cx = wx + TILE_SIZE / 2;
    const cy = wy + TILE_SIZE - 4;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, cx - BUILD_ANCHOR_X, cy - BUILD_ANCHOR_Y);

    // Tropfen vom Tuch ins Fass, während es regnet
    const atmo = atmoRef.current;
    if (filled && atmo?.wet && alpha > 0.9) {
      const t = Date.now() / 1000;
      ctx.strokeStyle = 'rgba(186,222,244,0.75)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        const p = ((t * 1.8 + i * 0.33) % 1);
        const dy = cy - 26 + p * 5;
        ctx.beginPath();
        ctx.moveTo(cx + (i - 1) * 4, dy);
        ctx.lineTo(cx + (i - 1) * 4, dy + 3);
        ctx.stroke();
      }
    }
    ctx.restore();
  }, []);

  // Baum-Wachstumsstufe berechnen (1-10)
  const getTreeStage = useCallback(() => {
    if (!gameState) return 1;
    // Manuell gesetzte Stufe (Cheat)
    if (gameState.treeStage !== null && gameState.treeStage !== undefined) {
      return Math.max(1, Math.min(10, gameState.treeStage));
    }
    // Automatisch nach vergangenen Tagen (365 Tage = Stufe 10)
    const startedAt = gameState.stats?.startedAt || Date.now();
    const daysElapsed = (Date.now() - startedAt) / (24 * 60 * 60 * 1000);
    const stage = Math.floor((daysElapsed / 365) * 10) + 1;
    return Math.max(1, Math.min(10, stage));
  }, [gameState]);

  // Wachsender Baum an Position (col 3, row 3) zeichnen
  // Gemeinsame Baum-Zeichnung für Hauptbaum und gepflanzte Bäume.
  // Schatten und Windbewegung kommen aus derselben Quelle wie bei den
  // Randbäumen, damit alles auf der Insel im selben Takt weht.
  const paintTree = useCallback((ctx, cx, cy, stage, variant, big, t, windAmt, label) => {
    const sprite = getGrowthTree(stage, variant, big);
    const atmo = atmoRef.current;

    if (atmo) {
      const rw = sprite.w * 0.36;
      dropShadow(ctx, cx, cy, rw, rw * 0.6, atmo, 1.4);
      contactShadow(ctx, cx, cy, rw * 0.62, rw * 0.24, 0.3);
    }

    // Junge Bäume wiegen sich stärker als alte
    const stiffness = 1.4 + (stage / 10) * 2.2;
    const bend = sway(cx, cy, t + variant, windAmt, stiffness);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.transform(1, 0, bend * 0.055, 1, 0, 0);
    ctx.drawImage(sprite.canvas, -sprite.w / 2, -sprite.h);
    ctx.restore();

    if (label) {
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(label, cx, cy + 11);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(label, cx, cy + 11);
    }
  }, []);

  // Der Hauptbaum in der Inselmitte — wächst über ein Jahr auf Stufe 10
  const drawGrowingTree = useCallback((ctx, camera, t, windAmt) => {
    if (!gameState) return;

    const stage = getTreeStage();
    const cx = TREE_POSITION.col * TILE_SIZE + camera.x + TILE_SIZE / 2;
    const cy = TREE_POSITION.row * TILE_SIZE + camera.y + TILE_SIZE;

    paintTree(ctx, cx, cy, stage, 0, true, t, windAmt, `Stufe ${stage}`);

    // Jahres-Chronik: Anhänger für jedes Lernthema und Hobbyprojekt.
    // Die Laternen darin sind nachts echte Lichtquellen — die gemeldeten
    // Positionen landen im Licht-Pass.
    const atmo = atmoRef.current;
    const nightGlow = atmo ? Math.min(1, Math.max(0, atmo.darkness * 1.6)) : 0;
    chronicleLightsRef.current = drawChronicle(ctx, cx, cy, stage, gameState, t, nightGlow);
  }, [gameState, getTreeStage, paintTree]);

  // Gepflanzte Bäume — gleiche Optik, eigene Variante je Standort
  const drawPlantedTrees = useCallback((ctx, camera, t, windAmt, filter) => {
    if (!gameState?.plantedTrees || gameState.plantedTrees.length === 0) return;
    const list = filter ? gameState.plantedTrees.filter(filter) : gameState.plantedTrees;

    for (const tree of list) {
      const cx = tree.col * TILE_SIZE + camera.x + TILE_SIZE / 2;
      const cy = tree.row * TILE_SIZE + camera.y + TILE_SIZE;

      // 365 Tage = Stufe 10
      const daysElapsed = (Date.now() - tree.plantedAt) / (24 * 60 * 60 * 1000);
      const stage = Math.max(1, Math.min(10, Math.floor((daysElapsed / 365) * 10) + 1));

      paintTree(ctx, cx, cy, stage, treeVariant(tree.col, tree.row), false, t, windAmt, `Stufe ${stage}`);
    }
  }, [gameState, paintTree]);

  // Gebäude auf der Karte zeichnen (dynamisch aus placedBuildings)
  const drawBuildings = useCallback((ctx, camera, filter) => {
    if (!gameState) return;

    const placed = filter
      ? (gameState.placedBuildings || []).filter(filter)
      : (gameState.placedBuildings || []);
    if (placed.length === 0) return;
    const atmo = atmoRef.current;

    // Schattenwurf zuerst — Gebäude sollen auf dem Boden stehen, nicht darüber schweben
    if (atmo) {
      for (const building of placed) {
        const cx = building.col * TILE_SIZE + camera.x + TILE_SIZE / 2;
        const cy = building.row * TILE_SIZE + camera.y + TILE_SIZE - 6;
        const big = building.type === 'shelter';
        dropShadow(ctx, cx, cy, big ? 34 : 22, big ? 18 : 12, atmo, 1.4);
        contactShadow(ctx, cx, cy, big ? 26 : 17, big ? 8 : 6, 0.3);
      }
    }

    for (const building of placed) {
      const bx = building.col * TILE_SIZE + camera.x;
      const by = building.row * TILE_SIZE + camera.y;

      switch (building.type) {
        case 'shelter':
          drawShelter(ctx, bx, by, building.level || gameState.buildings.shelterLevel, 1);
          break;
        case 'campfire':
          drawCampfire(ctx, bx, by, 1);
          break;
        case 'water_collector':
          drawWaterCollector(ctx, bx, by, 1);
          break;
        default:
          break;
      }
    }
  }, [gameState, drawShelter, drawCampfire, drawWaterCollector]);

  // Ghost-Vorschau für Platzierungsmodus
  const drawPlacementGhost = useCallback((ctx, camera) => {
    if (!placementGhost) return;

    const gx = placementGhost.col * TILE_SIZE + camera.x;
    const gy = placementGhost.row * TILE_SIZE + camera.y;

    // Gültigkeits-Check: Nur Gras + nicht belegt (oder gleichartiges Gebäude zum Upgraden)
    const tileType = homeMap[placementGhost.row]?.[placementGhost.col];
    const isGrass = tileType === TILE_TYPES.GRASS;
    const buildingOnTile = (gameState?.placedBuildings || []).find(
      b => b.col === placementGhost.col && b.row === placementGhost.row
    );
    // Erlaubt: kein Gebäude ODER gleichartiges Gebäude (Upgrade/Ersetzung)
    const isOccupiedByOther = buildingOnTile && buildingOnTile.type !== placementGhost.type;
    const isOccupiedByTree = (gameState?.plantedTrees || []).some(
      t => t.col === placementGhost.col && t.row === placementGhost.row
    );
    const isOccupiedByFlower = (gameState?.placedFlowers || []).some(
      f => f.col === placementGhost.col && f.row === placementGhost.row
    );
    const isMainTree = placementGhost.col === TREE_POSITION.col && placementGhost.row === TREE_POSITION.row;
    const valid = isGrass && !isOccupiedByOther && !isOccupiedByTree && !isOccupiedByFlower && !isMainTree;

    // Markierung (grün = gültig, rot = ungültig)
    ctx.fillStyle = valid ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)';
    ctx.fillRect(gx, gy, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = valid ? 'rgba(46, 204, 113, 0.8)' : 'rgba(231, 76, 60, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(gx + 1, gy + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    // Ghost-Gebäude halbtransparent zeichnen
    const alpha = valid ? 0.6 : 0.3;
    switch (placementGhost.type) {
      case 'shelter':
        drawShelter(ctx, gx, gy, placementGhost.level || 1, alpha);
        break;
      case 'campfire':
        drawCampfire(ctx, gx, gy, alpha);
        break;
      case 'water_collector':
        drawWaterCollector(ctx, gx, gy, alpha);
        break;
      case 'tree_seed': {
        // Kleiner Baum-Setzling Vorschau
        ctx.globalAlpha = alpha;
        const scx = gx + TILE_SIZE / 2;
        const scy = gy + TILE_SIZE - 8;
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(scx - 2, scy - 12, 4, 12);
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.ellipse(scx, scy - 16, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'flower_seed': {
        // Blumensamen-Vorschau (Stiel + Blüte in Sortenfarbe)
        ctx.globalAlpha = alpha;
        const fcx = gx + TILE_SIZE / 2;
        const fcy = gy + TILE_SIZE - 8;
        const def = FLOWER_TYPES[placementGhost.flowerType];
        const petalColor = def?.petalColor || '#F5C033';
        const stemColor = def?.stemColor || '#3a8a2e';
        ctx.strokeStyle = stemColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(fcx, fcy);
        ctx.lineTo(fcx, fcy - 14);
        ctx.stroke();
        ctx.fillStyle = petalColor;
        ctx.beginPath();
        ctx.arc(fcx, fcy - 17, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      default:
        break;
    }
  }, [placementGhost, gameState, drawShelter, drawCampfire, drawWaterCollector]);

  // Tiere auf der Karte zeichnen
  // filter: optionale Auswahl, damit Tiere vor und hinter der Spielerin
  // in zwei getrennten Durchgängen gezeichnet werden können (Tiefensortierung)
  const drawAnimals = useCallback((ctx, camera, filter) => {
    if (!gameState?.animals || gameState.animals.length === 0) return;
    const list = filter ? gameState.animals.filter(filter) : gameState.animals;
    if (list.length === 0) return;

    // Erst alle Schatten, damit kein Tier auf dem Schatten eines anderen liegt
    const atmo = atmoRef.current;
    if (atmo) {
      for (const animal of list) {
        if (!ANIMAL_TYPES[animal.type]) continue;
        const sx = animal.x + camera.x;
        const sy = animal.y + camera.y + 12;
        dropShadow(ctx, sx, sy, 17, 8, atmo, 1.2);
        contactShadow(ctx, sx, sy, 12, 4.5, 0.26);
      }
    }

    for (const animal of list) {
      const def = ANIMAL_TYPES[animal.type];
      if (!def) continue;

      const ax = animal.x + camera.x;
      const ay = animal.y + camera.y;
      const s = def.size;
      const half = s / 2;

      // Blickrichtung (für Flip)
      const facingLeft = animal.dirX < 0;
      const isWalking = Math.abs(animal.dirX || 0) > 0.01 || Math.abs(animal.dirY || 0) > 0.01;

      // Katzen wachsen: Kätzchen sind kleiner und rundlicher
      let stageIdx = 2;
      let sizeK = def.size / 26;
      if (animal.type === 'cat') {
        const kitten = getCatStage(animal.spawnedAt) === 'kitten';
        stageIdx = kitten ? 0 : 2;
        if (kitten) sizeK *= 0.78;
      }

      const sprite = getAnimalSprite(animal.type, stageIdx);

      // Trippeln beim Laufen: leichtes Auf und Ab plus Nicken
      const bob = isWalking ? Math.abs(Math.sin(Date.now() / 150)) * 1.8 : 0;
      const tilt = isWalking ? Math.sin(Date.now() / 150) * 0.035 : 0;

      ctx.save();
      ctx.translate(ax, ay + 10 - bob);
      if (facingLeft) ctx.scale(-1, 1);
      ctx.rotate(tilt);
      ctx.scale(sizeK, sizeK);
      ctx.drawImage(sprite, -A_W / 2, -A_GROUND);
      ctx.restore();

      // Katzen: Zuneigungsbalken (rosa) statt Hungerbalken
      if (animal.type === 'cat') {
        const affection = animal.affection ?? CAT_AFFECTION_MAX;
        const affectionPercent = Math.max(0, Math.min(1, affection / CAT_AFFECTION_MAX));
        const barW = 24;
        const barH = 3;
        const catStageForBar = getCatStage(animal.spawnedAt);
        const catScaleForBar = catStageForBar === 'kitten' ? 0.65 : 1.0;
        const cHalfForBar = (s * catScaleForBar) / 2;
        const barX = ax - barW / 2;
        const barY = ay - cHalfForBar - 10;

        // Hintergrund
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        // Füll-Farbe
        if (affectionPercent > 0.5) {
          ctx.fillStyle = '#FF69B4'; // rosa
        } else if (affectionPercent > 0.2) {
          ctx.fillStyle = '#f1c40f'; // gelb
        } else {
          ctx.fillStyle = '#e74c3c'; // rot
        }
        ctx.fillRect(barX, barY, barW * affectionPercent, barH);

        // Kleines Herz-Icon
        ctx.fillStyle = '#FF69B4';
        ctx.font = '7px sans-serif';
        ctx.fillText('❤', barX - 9, barY + barH);
      } else if (animal.type === 'chicken') {
        // Hühner: kein Statusbalken (verhungern nicht)
      } else {
        // Normale Tiere: Hunger-Balken
        const hunger = animal.hunger ?? ANIMAL_HUNGER_MAX;
        const hungerPercent = Math.max(0, Math.min(1, hunger / ANIMAL_HUNGER_MAX));
        const barW = 24;
        const barH = 3;
        const barX = ax - barW / 2;
        const barY = ay - half - 10;

        // Hintergrund (dunkel)
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        // Füll-Farbe je nach Hunger-Level
        if (hungerPercent > 0.5) {
          ctx.fillStyle = '#2ecc71'; // grün
        } else if (hungerPercent > 0.2) {
          ctx.fillStyle = '#f1c40f'; // gelb
        } else {
          ctx.fillStyle = '#e74c3c'; // rot
        }
        ctx.fillRect(barX, barY, barW * hungerPercent, barH);
      }
    }
  }, [gameState]);

  // Abgeworfene Samen auf der Karte zeichnen
  const drawDroppedSeeds = useCallback((ctx, camera) => {
    if (!gameState?.droppedSeeds || gameState.droppedSeeds.length === 0) return;

    const time = Date.now() / 800;

    for (const seed of gameState.droppedSeeds) {
      const sx = seed.col * TILE_SIZE + TILE_SIZE / 2 + camera.x;
      const sy = seed.row * TILE_SIZE + TILE_SIZE / 2 + camera.y;

      // Leichtes Schaukeln
      const bob = Math.sin(time + seed.col * 3) * 1.5;

      // Schatten
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 8, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Samen (braunes Oval)
      ctx.fillStyle = '#6B4226';
      ctx.beginPath();
      ctx.ellipse(sx, sy + bob, 5, 7, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = '#8B6240';
      ctx.beginPath();
      ctx.ellipse(sx - 1, sy - 2 + bob, 2, 3, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Kleine Spitze oben
      ctx.fillStyle = '#4a2e10';
      ctx.beginPath();
      ctx.moveTo(sx - 1, sy - 6 + bob);
      ctx.lineTo(sx + 1, sy - 6 + bob);
      ctx.lineTo(sx, sy - 9 + bob);
      ctx.closePath();
      ctx.fill();
    }
  }, [gameState]);

  // Unkraut in drei Stufen: Keimling, Büschel, wucherndes Dickicht.
  // Wächst mit demselben Windfeld wie der Rest der Vegetation und hebt
  // sich durch kühleres, dunkleres Grün von der Wiese ab.
  const drawWeeds = useCallback((ctx, camera, t, windAmt) => {
    if (!gameState?.weeds || gameState.weeds.length === 0) return;
    const atmo = atmoRef.current;

    for (const weed of gameState.weeds) {
      const cx = weed.col * TILE_SIZE + camera.x + TILE_SIZE / 2;
      const cy = weed.row * TILE_SIZE + camera.y + TILE_SIZE / 2 + 10;
      const stage = Math.max(1, Math.min(3, weed.stage || 1));

      // Sichtbarer Bodenfleck: hier ist die Wiese verdrängt
      if (stage >= 2) {
        contactShadow(ctx, cx, cy, 13 + stage * 4, 5 + stage * 1.6, 0.16);
      }
      if (atmo && stage === 3) {
        dropShadow(ctx, cx, cy, 15, 8, atmo, 0.7);
      }

      const bend = sway(cx, cy, t, windAmt, 0.9);

      // Gebackenes Büschel blitten. Der Wind wird als Scherung um den
      // Fußpunkt aufgetragen — die Spitzen neigen sich, der Boden bleibt
      // stehen. Optisch dasselbe wie das frühere Biegen jedes Halms,
      // kostet aber ein drawImage statt dutzender Pfade.
      const sprite = getWeedSprite(stage, weedVariant(weed.col, weed.row));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.transform(1, 0, -bend * 2.2 / sprite.maxH, 1, 0, 0);
      ctx.drawImage(sprite.canvas, -W_ANCHOR_X, -W_ANCHOR_Y);
      ctx.restore();
    }
  }, [gameState]);


  // Gepflanzte Blumen zeichnen (wachsen 5 Tage, dann volle Blüte)
  const drawFlowers = useCallback((ctx, camera) => {
    const state = gameStateRef.current;
    if (!state?.placedFlowers || state.placedFlowers.length === 0) return;

    const PLAYER_HEIGHT_PX = 40; // Höhe der Spieler-Figur in Pixeln (ca.)

    for (const flower of state.placedFlowers) {
      const def = FLOWER_TYPES[flower.flowerType];
      if (!def) continue;

      const fx = flower.col * TILE_SIZE + TILE_SIZE / 2 + camera.x;
      const fy = flower.row * TILE_SIZE + TILE_SIZE / 2 + camera.y;

      const growth = getFlowerGrowth(flower.plantedAt);
      const stage = getFlowerStage(flower.plantedAt);
      const blooming = isFlowerBlooming(flower.plantedAt);

      // Volle Blütenhöhe je nach Sorte (Sonnenblume = ganze Person)
      const fullHeight = PLAYER_HEIGHT_PX * def.heightRatio;
      // Während des Wachstums lineare Höhenzunahme von ~10% bis 100%
      const currentHeight = fullHeight * (0.1 + 0.9 * growth);

      // Schatten am Boden
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(fx, fy + 6, 6 + 4 * growth, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      const baseY = fy + 6;          // Bodenhöhe
      const topY = baseY - currentHeight; // Spitze der Pflanze

      // Stängel (sanftes Wiegen mit Sinus-Animation)
      const sway = Math.sin(Date.now() / 700 + flower.col * 1.3 + flower.row * 0.7) * 1.2 * growth;
      ctx.strokeStyle = def.stemColor;
      ctx.lineWidth = Math.max(1.5, 2 + growth * 1.5);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(fx, baseY);
      ctx.quadraticCurveTo(fx + sway * 0.5, baseY - currentHeight * 0.5, fx + sway, topY);
      ctx.stroke();

      // Blätter am Stängel (ab Stage 1)
      if (stage >= 1) {
        ctx.fillStyle = def.stemColor;
        const leafY1 = baseY - currentHeight * 0.4;
        const leafY2 = baseY - currentHeight * 0.65;
        ctx.beginPath();
        ctx.ellipse(fx - 4, leafY1, 5, 2.2, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(fx + 4 + sway * 0.5, leafY2, 5, 2.2, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Blütenkopf
      const headX = fx + sway;
      const headY = topY;
      const headSize = Math.max(2, 4 + growth * (def.heightRatio === 1.0 ? 9 : 5));

      if (stage === 0) {
        // Samen / kleiner Trieb
        ctx.fillStyle = '#3a8a2e';
        ctx.beginPath();
        ctx.arc(headX, headY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (stage <= 2) {
        // Knospe (geschlossen)
        ctx.fillStyle = def.petalEdge;
        ctx.beginPath();
        ctx.ellipse(headX, headY, headSize * 0.5, headSize * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = def.petalColor;
        ctx.beginPath();
        ctx.ellipse(headX, headY + 1, headSize * 0.35, headSize * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Halbblüte oder Vollblüte
        const openness = stage === 3 ? 0.6 : 1.0;
        const petalCount = def.petalCount;
        const petalLength = headSize * (0.9 + openness * 0.4);
        const petalWidth = headSize * 0.45;

        // Blütenblätter (Ring)
        for (let p = 0; p < petalCount; p++) {
          const angle = (p / petalCount) * Math.PI * 2;
          const px = headX + Math.cos(angle) * petalLength * 0.5 * openness;
          const py = headY + Math.sin(angle) * petalLength * 0.5 * openness;

          // Petal-Schatten/Rand
          ctx.fillStyle = def.petalEdge;
          ctx.beginPath();
          ctx.ellipse(px, py, petalLength * 0.55, petalWidth, angle, 0, Math.PI * 2);
          ctx.fill();
          // Petal-Hauptfläche
          ctx.fillStyle = def.petalColor;
          ctx.beginPath();
          ctx.ellipse(px, py, petalLength * 0.45, petalWidth * 0.78, angle, 0, Math.PI * 2);
          ctx.fill();
        }

        // Blütenmitte
        ctx.fillStyle = def.centerColor;
        ctx.beginPath();
        ctx.arc(headX, headY, headSize * 0.6 * openness, 0, Math.PI * 2);
        ctx.fill();

        // Glanzpunkt
        if (blooming) {
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath();
          ctx.arc(headX - headSize * 0.2, headY - headSize * 0.2, headSize * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, []);

  // Wetter wird jetzt in render/particles.js gezeichnet (drawRain/drawSplashes)
  // und über den Licht-Pass eingefärbt.

  // Ausgangs-Markierungen zeichnen
  // Besucher-Avatar zeichnen
  const drawVisitor = useCallback((ctx, camera) => {
    if (!visitorPosition) return;

    const vx = visitorPosition.x + camera.x;
    const vy = visitorPosition.y + camera.y;
    const name = visitorName || 'Besucher';

    // Blauer Kreis (Besucher)
    ctx.save();
    ctx.beginPath();
    ctx.arc(vx, vy, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(52, 152, 219, 0.8)';
    ctx.fill();
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Innerer heller Kreis
    ctx.beginPath();
    ctx.arc(vx, vy - 2, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    // Koerper
    ctx.beginPath();
    ctx.arc(vx, vy + 6, 8, Math.PI, 0);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();

    // Username-Label
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    // Hintergrund
    const textWidth = ctx.measureText(name).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(vx - textWidth / 2 - 4, vy - 28, textWidth + 8, 14);
    // Text
    ctx.fillStyle = '#3498db';
    ctx.fillText(name, vx, vy - 16);

    ctx.restore();
  }, [visitorPosition, visitorName]);

  // Host-Avatar zeichnen (fuer Besucher-Ansicht)
  const drawHostAvatar = useCallback((ctx, camera) => {
    if (!hostSnapshot?.hostPlayer) return;

    const hx = hostSnapshot.hostPlayer.x + camera.x;
    const hy = hostSnapshot.hostPlayer.y + camera.y;

    // Gruener Kreis (Host)
    ctx.save();
    ctx.beginPath();
    ctx.arc(hx, hy, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(46, 204, 113, 0.8)';
    ctx.fill();
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Kopf
    ctx.beginPath();
    ctx.arc(hx, hy - 2, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    // Koerper
    ctx.beginPath();
    ctx.arc(hx, hy + 6, 8, Math.PI, 0);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();

    // Host-Label
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const label = 'Host';
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(hx - textWidth / 2 - 4, hy - 28, textWidth + 8, 14);
    ctx.fillStyle = '#2ecc71';
    ctx.fillText(label, hx, hy - 16);

    ctx.restore();
  }, [hostSnapshot]);

  const drawExitMarkers = useCallback((ctx, camera) => {
    const markers = [
      { label: '▲ Wald', x: 9.5 * TILE_SIZE, y: 0.3 * TILE_SIZE },
      { label: '▼ See', x: 9.5 * TILE_SIZE, y: 14.5 * TILE_SIZE },
      { label: '◄ Felder', x: 0.3 * TILE_SIZE, y: 7 * TILE_SIZE },
      { label: 'Klippen ►', x: 18.2 * TILE_SIZE, y: 7 * TILE_SIZE },
    ];

    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';

    for (const marker of markers) {
      const mx = marker.x + camera.x;
      const my = marker.y + camera.y;

      // Hintergrund
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      const textWidth = ctx.measureText(marker.label).width;
      ctx.fillRect(mx - textWidth / 2 - 6, my - 10, textWidth + 12, 20);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.strokeRect(mx - textWidth / 2 - 6, my - 10, textWidth + 12, 20);

      // Text
      ctx.fillStyle = '#ffd700';
      ctx.fillText(marker.label, mx, my + 4);
    }
  }, []);

  // Draw-Funktionen immer aktuell halten (werden bei gameState-Änderungen neu erstellt,
  // aber der Render-Loop liest sie per Ref → kein RAF-Neustart nötig)
  drawFnsRef.current = {
    getCameraOffset, getScale, drawPlayer, drawBuildings,
    drawGrowingTree, drawDroppedSeeds, drawWeeds, drawPlantedTrees,
    drawFlowers, drawAnimals, drawPlacementGhost, drawExitMarkers,
    drawVisitor, drawHostAvatar,
    drawWaterSurface, drawWaterRain, drawWindRipples, drawEdgeFlora, drawSnowCover,
    getTerrainCanvas,
  };

  // Sammelt alle Lichtquellen der Szene in Bildschirmkoordinaten.
  // Nachts hebt das Lagerfeuer die Umgebung an, Hütten bekommen
  // warmes Fensterlicht.
  const collectLights = useCallback((state, camera, scale, t) => {
    const lights = [];
    const toScreen = (wx, wy) => ({ x: wx * scale + camera.x, y: wy * scale + camera.y });

    for (const b of state.placedBuildings || []) {
      const wx = b.col * TILE_SIZE + TILE_SIZE / 2;
      if (b.type === 'campfire') {
        const p = toScreen(wx, b.row * TILE_SIZE + 40);
        const flick = 0.82 + valueNoise(t * 6, b.col * 7 + b.row, 53) * 0.36;
        lights.push({
          x: p.x, y: p.y,
          radius: 215 * scale * flick,
          color: [255, 148, 56],
          intensity: 1.2 * flick,
        });
      } else if (b.type === 'shelter' && (b.level || 1) >= 2) {
        const p = toScreen(wx, b.row * TILE_SIZE + 42);
        lights.push({
          x: p.x, y: p.y,
          radius: 96 * scale,
          color: [255, 192, 112],
          intensity: 0.5,
        });
      }
    }
    return lights;
  }, []);
  const collectLightsRef = useRef(collectLights);
  collectLightsRef.current = collectLights;

  // Render-Loop: Startet nur einmal und liest alles aus Refs.
  // Vorher wurde der Loop bei jedem gameState-Update (jede Sekunde) komplett
  // abgebrochen und neu gestartet → Frame-Drops und Stottern.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let lastW = 0, lastH = 0, lastDpr = 0;

    const render = () => {
      const state = gameStateRef.current;
      if (!state) {
        animFrame.current = requestAnimationFrame(render);
        return;
      }

      const fns = drawFnsRef.current;
      const vm = visitModeRef.current;
      const t = Date.now() / 1000;

      const w = canvasSize.width;
      const h = canvasSize.height;
      // Retina-Auflösung: ohne das ist auf dem Handy alles weichgezeichnet.
      // Auf 2 begrenzt, damit 3x-Displays nicht 9-fache Pixelmenge rendern.
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

      // --- Lichtstimmung aus echter Uhrzeit + Wetter ---
      // timeOverride: vom Cheat „zeit <stunde>" gesetzt, sonst echte Uhrzeit.
      const atmo = applyWeather(
        getAtmosphere(new Date(), state.timeOverride ?? null),
        state.weather
      );
      atmoRef.current = atmo;
      const wet = !!atmo.wet;                 // Regen oder Gewitter
      const snowy = !!atmo.snow;
      const stormy = !!atmo.storm;
      const foggy = !!atmo.fog;
      const hot = !!atmo.heat;
      const windAmt = windStrength(t, wet) * (stormy ? 1.9 : 1) * (hot ? 0.35 : 1);

      const camera = fns.getCameraOffset();
      const scale = fns.getScale();

      // --- Hintergrund hinter der Insel (Himmel + Sterne) ---
      const sky = atmo.sky;
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, `rgb(${sky[0] | 0},${sky[1] | 0},${sky[2] | 0})`);
      bg.addColorStop(1, `rgb(${sky[0] * 0.55 | 0},${sky[1] * 0.55 | 0},${sky[2] * 0.6 | 0})`);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      drawStars(ctx, t, w, h, atmo.starAlpha * 0.9);

      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(scale, scale);

      const zeroCamera = { x: 0, y: 0 };

      // --- Boden ---
      ctx.drawImage(fns.getTerrainCanvas(), 0, 0);
      fns.drawWaterSurface(ctx, t, atmo);
      if (wet) fns.drawWaterRain(ctx, t);
      fns.drawWindRipples(ctx, t, windAmt * (wet ? 0.4 : 1));
      if (snowy) fns.drawSnowCover(ctx, t);

      // --- Laternenweg der Fokus-Serie ---
      const lanternGlow = Math.min(1, Math.max(0, atmo.darkness * 1.7));
      lanternLightsRef.current = drawLanternPath(
        ctx, activeLanterns(state.streak), lanternGlow, t
      );

      // --- Bodennahe Objekte ---
      fns.drawWeeds(ctx, zeroCamera, t, windAmt);
      fns.drawDroppedSeeds(ctx, zeroCamera);
      fns.drawFlowers(ctx, zeroCamera);

      // --- Aufrechte Objekte, von hinten nach vorn sortiert ---
      // Ohne diese Sortierung stand ein Tier auch dann vor einer Hütte,
      // wenn es eigentlich dahinter läuft.
      fns.drawEdgeFlora(ctx, t, atmo, windAmt);

      // --- Tiefensortierung ---
      // Alles, was auf dem Boden steht, wird nach seiner Standlinie
      // sortiert gezeichnet: Was weiter unten steht, steht vorn. Vorher
      // lagen Tiere grundsätzlich über Häusern und über der Spielerin.
      const entities = [];
      const player = state.gathering ? null : state.player;

      for (const b of state.placedBuildings || []) {
        entities.push({
          y: b.row * TILE_SIZE + TILE_SIZE,
          draw: () => fns.drawBuildings(ctx, zeroCamera, (x) => x === b),
        });
      }
      for (const tr of state.plantedTrees || []) {
        entities.push({
          y: tr.row * TILE_SIZE + TILE_SIZE,
          draw: () => fns.drawPlantedTrees(ctx, zeroCamera, t, windAmt, (x) => x === tr),
        });
      }
      entities.push({
        y: TREE_POSITION.row * TILE_SIZE + TILE_SIZE,
        draw: () => fns.drawGrowingTree(ctx, zeroCamera, t, windAmt),
      });
      for (const a of state.animals || []) {
        entities.push({
          y: a.y + 10,
          draw: () => fns.drawAnimals(ctx, zeroCamera, (x) => x === a),
        });
      }
      if (player) {
        entities.push({
          y: player.y + 27,
          draw: () => fns.drawPlayer(ctx, zeroCamera),
        });
      }

      // Wandernder Händler — nur an seinen Besuchstagen
      if (isMerchantHere()) {
        entities.push({
          y: MERCHANT_TILE.row * TILE_SIZE + TILE_SIZE,
          draw: () => {
            const mx = MERCHANT_TILE.col * TILE_SIZE + TILE_SIZE / 2;
            const my = MERCHANT_TILE.row * TILE_SIZE + TILE_SIZE - 4;
            if (atmo) {
              dropShadow(ctx, mx, my, 40, 20, atmo, 1.3);
              contactShadow(ctx, mx, my, 32, 10, 0.3);
            }
            ctx.drawImage(getMerchantSprite(), mx - M_ANCHOR_X, my - M_ANCHOR_Y);
            drawMerchantPennants(ctx, mx, my, t);
            // Hinweiszeichen über dem Stand
            const bounce = Math.sin(t * 2.4) * 3;
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('💰', mx, my - 96 + bounce);
          },
        });
      }

      entities.sort((a, b) => a.y - b.y);
      for (const e of entities) e.draw();

      // --- Platzierungsvorschau immer obenauf ---
      fns.drawPlacementGhost(ctx, zeroCamera);

      // --- Lebendige Kleinigkeiten ---
      // Bei Regen und Schnee bleiben Schmetterlinge im Trockenen.
      if (!wet && !snowy) {
        drawMotes(ctx, t, hot ? 52 : 34,
          Math.max(0, atmo.sunAlt) * 0.4 + atmo.goldenness * 0.35 + (hot ? 0.2 : 0));
        drawButterflies(ctx, t, 7, Math.max(0, Math.min(1, (atmo.sunAlt - 0.05) * 3)));
      }
      drawFireflies(ctx, t, 16, Math.max(0, Math.min(1, (-atmo.sunAlt - 0.02) * 4)));
      // Jahreszeit bestimmt, was durch die Luft segelt:
      // Herbstlaub dicht, Kirschblüten im Frühling, sonst vereinzelt Grün.
      const season = atmo.season;
      let leafMood = 'green';
      let leafCount = wet ? 10 : 6;
      if (season < -0.1 && season > -0.85) { leafMood = 'autumn'; leafCount = 22; }
      else if (season > 0.05 && season < 0.5) { leafMood = 'blossom'; leafCount = 18; }
      drawFallingLeaves(ctx, t, leafCount, 0.75, leafMood);

      if (vm === 'host') fns.drawVisitor(ctx, zeroCamera);
      if (vm === 'visitor') fns.drawHostAvatar(ctx, zeroCamera);

      ctx.restore();

      // --- Licht, Farbstimmung, Vignette (Bildschirmraum) ---
      const lights = collectLightsRef.current(state, camera, scale, t);
      // Laternen von Chronik und Serienweg hängen in Weltkoordinaten
      for (const cl of chronicleLightsRef.current.concat(lanternLightsRef.current)) {
        lights.push({
          x: cl.x * scale + camera.x,
          y: cl.y * scale + camera.y,
          radius: cl.radius * scale,
          color: [255, 186, 96],
          intensity: cl.intensity,
        });
      }
      applyLighting(ctx, w, h, atmo, lights);

      // --- Wetter liegt über allem ---
      if (wet) {
        const heavy = stormy ? 1.45 : 1;
        drawWetSheen(ctx, w, h, stormy ? 1.25 : 1);
        drawRain(ctx, t, w, h, heavy, 0.55 + windAmt * 0.5);
        drawSplashes(ctx, t, w, h, heavy);
      }
      if (stormy) {
        drawLightning(ctx, t, w, h);
      }
      if (snowy) {
        drawSnow(ctx, t, w, h, 1, 0.4 + windAmt * 0.4);
      }
      if (foggy) {
        drawFogBanks(ctx, t, w, h, 1);
      }
      if (hot) {
        // Flimmern: das bereits gezeichnete Bild bandweise verschoben
        drawHeatHaze(ctx, canvas, t, w, h, dpr);
      }

      // --- Beschriftungen zuletzt, damit sie immer lesbar bleiben ---
      if (vm !== 'visitor') {
        ctx.save();
        ctx.translate(camera.x, camera.y);
        ctx.scale(scale, scale);
        fns.drawExitMarkers(ctx, zeroCamera);
        ctx.restore();
      }

      animFrame.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrame.current) {
        cancelAnimationFrame(animFrame.current);
      }
    };
  }, [canvasSize]);

  // Screen-Koordinaten → Welt-Koordinaten (mit Skalierung)
  const screenToWorld = useCallback((screenX, screenY) => {
    const camera = getCameraOffset();
    const scale = getScale();
    const worldX = (screenX - camera.x) / scale;
    const worldY = (screenY - camera.y) / scale;
    return { worldX, worldY };
  }, [getCameraOffset, getScale]);

  // Tipp-/Klick-Handler — wird von useTapHandler aus Pointer-Ereignissen
  // aufgerufen, nicht aus click. Siehe hooks/useTapHandler.
  const handleTap = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { worldX, worldY } = screenToWorld(clickX, clickY);

    if (onMapClick) {
      onMapClick(worldX, worldY);
    }
  }, [gameState, screenToWorld, onMapClick]);

  const tapProps = useTapHandler(handleTap);

  // Maus-Bewegung (für Ghost-Vorschau im Platzierungsmodus)
  const handleMouseMove = useCallback((e) => {
    if (!onMouseMove) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { worldX, worldY } = screenToWorld(mouseX, mouseY);
    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);

    if (col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS) {
      onMouseMove(col, row);
    }
  }, [onMouseMove, screenToWorld]);

  // Pinch-to-Zoom Touch-Handler
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = {
        active: true,
        startDist: Math.sqrt(dx * dx + dy * dy),
        startZoom: zoomLevel,
      };
    }
  }, [zoomLevel]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && pinchRef.current.active) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / pinchRef.current.startDist;
      const newZoom = Math.max(minZoom, Math.min(2.0, pinchRef.current.startZoom * ratio));
      setZoomLevel(newZoom);
    }
  }, [minZoom]);

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) {
      pinchRef.current.active = false;
    }
  }, []);

  // Touch-Events auf Canvas registrieren (passive: false für preventDefault)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <canvas
      ref={canvasRef}
      data-island="true"
      {...tapProps}
      onMouseMove={handleMouseMove}
      style={{
        display: 'block',
        cursor: placementGhost ? 'crosshair' : 'pointer',
        touchAction: 'none',
        ...TAPPABLE_CANVAS_STYLE,
      }}
    />
  );
}
