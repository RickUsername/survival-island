// ============================================
// Spiel-Canvas - Rendert die Karte und den Spieler
// ============================================

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  TILE_SIZE, MAP_COLS, MAP_ROWS, MAP_WIDTH, MAP_HEIGHT,
  TILE_COLORS, TILE_TYPES,
} from '../utils/constants';
import homeMap, { TREE_POSITION } from '../data/homeMap';
import { ANIMAL_TYPES, ANIMAL_HUNGER_MAX } from '../systems/AnimalSystem';
import { getCatStage, CAT_AFFECTION_MAX } from '../systems/CatSystem';

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

  // Kachel zeichnen
  const drawTile = useCallback((ctx, col, row, tileType, camera) => {
    const x = col * TILE_SIZE + camera.x;
    const y = row * TILE_SIZE + camera.y;

    // Basis-Farbe
    ctx.fillStyle = TILE_COLORS[tileType] || TILE_COLORS[TILE_TYPES.GRASS];
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Kacheldetails
    // Deterministischer Pseudo-Zufall mit Bit-Mixing (keine linearen Muster)
    const seed = col * 7919 + row * 6271;
    const rand = (i) => {
      let h = (seed + i * 48271) | 0;
      h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
      h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
      h = (h ^ (h >>> 16)) >>> 0;
      return h / 4294967295;
    };

    switch (tileType) {
      case TILE_TYPES.TREE: {
        // === Detaillierter Randbaum mit sichtbarem Stamm ===
        const tcx = x + 32;

        // Bodenschatten (Ellipse unter dem Baum)
        ctx.fillStyle = 'rgba(0,40,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(tcx, y + 60, 24, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wurzeln (sichtbar am Boden)
        ctx.strokeStyle = '#4a2a10';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tcx - 5, y + 52);
        ctx.quadraticCurveTo(x + 8, y + 58, x + 4, y + 63);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tcx + 5, y + 52);
        ctx.quadraticCurveTo(x + 52, y + 56, x + 58, y + 62);
        ctx.stroke();
        // Kleine Wurzel
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tcx - 2, y + 54);
        ctx.quadraticCurveTo(x + 18, y + 60, x + 14, y + 64);
        ctx.stroke();

        // Baumstamm (breit, konisch, deutlich sichtbar)
        ctx.fillStyle = '#5c3a1e';
        ctx.beginPath();
        ctx.moveTo(tcx - 9, y + 56);   // Basis links (breit)
        ctx.lineTo(tcx - 5, y + 22);    // Oben links (schmaler)
        ctx.lineTo(tcx + 5, y + 22);    // Oben rechts
        ctx.lineTo(tcx + 9, y + 56);    // Basis rechts
        ctx.closePath();
        ctx.fill();

        // Rinden-Textur (vertikale + horizontale Linien)
        ctx.strokeStyle = '#3a2210';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tcx - 3, y + 54);
        ctx.lineTo(tcx - 2, y + 26);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tcx + 3, y + 52);
        ctx.lineTo(tcx + 2, y + 28);
        ctx.stroke();
        // Horizontale Rinden-Ringe
        ctx.strokeStyle = '#4a2a14';
        ctx.lineWidth = 0.8;
        for (let ri = 0; ri < 3; ri++) {
          const ry = y + 30 + ri * 8;
          const rw = 6 + (ri * 1.5);
          ctx.beginPath();
          ctx.moveTo(tcx - rw, ry);
          ctx.quadraticCurveTo(tcx, ry + 1.5, tcx + rw, ry);
          ctx.stroke();
        }

        // Hellerer Streifen (Licht auf Rinde)
        ctx.fillStyle = 'rgba(120,80,40,0.25)';
        ctx.beginPath();
        ctx.moveTo(tcx + 1, y + 54);
        ctx.lineTo(tcx + 3, y + 24);
        ctx.lineTo(tcx + 6, y + 24);
        ctx.lineTo(tcx + 7, y + 54);
        ctx.closePath();
        ctx.fill();

        // Ast links
        ctx.strokeStyle = '#4a2a12';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tcx - 4, y + 30);
        ctx.quadraticCurveTo(x + 10, y + 22, x + 6, y + 14);
        ctx.stroke();
        // Ast rechts
        ctx.beginPath();
        ctx.moveTo(tcx + 4, y + 26);
        ctx.quadraticCurveTo(x + 50, y + 18, x + 56, y + 12);
        ctx.stroke();

        // Baumkrone (mehrere Schichten, versetzt nach oben)
        // Schatten-Schicht (größte, dunkelste)
        ctx.fillStyle = '#1a5a10';
        ctx.beginPath();
        ctx.arc(tcx, y + 20, 22, 0, Math.PI * 2);
        ctx.fill();
        // Hauptkrone
        ctx.fillStyle = '#257218';
        ctx.beginPath();
        ctx.arc(tcx - 4, y + 14, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tcx + 8, y + 17, 14, 0, Math.PI * 2);
        ctx.fill();
        // Mittlere Schicht
        ctx.fillStyle = '#2d8a20';
        ctx.beginPath();
        ctx.arc(tcx - 6, y + 10, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tcx + 6, y + 12, 11, 0, Math.PI * 2);
        ctx.fill();
        // Helle Akzente (Sonnenlicht oben)
        ctx.fillStyle = '#3a9a2e';
        ctx.beginPath();
        ctx.arc(tcx - 2, y + 6, 9, 0, Math.PI * 2);
        ctx.fill();
        // Top-Highlight
        ctx.fillStyle = '#4aaa38';
        ctx.beginPath();
        ctx.arc(tcx - 4, y + 4, 5, 0, Math.PI * 2);
        ctx.fill();

        // Gelegentlich Beeren oder Äpfel
        if (rand(0) > 0.5) {
          ctx.fillStyle = '#d03030';
          ctx.beginPath();
          ctx.arc(x + 16 + rand(1) * 30, y + 10 + rand(2) * 16, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        if (rand(5) > 0.7) {
          ctx.fillStyle = '#c82828';
          ctx.beginPath();
          ctx.arc(x + 20 + rand(6) * 24, y + 16 + rand(7) * 10, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case TILE_TYPES.WATER: {
        // Welleneffekt
        ctx.fillStyle = '#4a8de5';
        const time = Date.now() / 1000;
        for (let i = 0; i < 3; i++) {
          const waveY = y + 15 + i * 18 + Math.sin(time + col + i) * 3;
          ctx.fillRect(x + 5, waveY, TILE_SIZE - 10, 2);
        }
        break;
      }

      case TILE_TYPES.BUSH:
        // Busch
        ctx.fillStyle = '#4a8c3f'; // Gras-Hintergrund
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#3d8a2e';
        ctx.beginPath();
        ctx.arc(x + 32, y + 38, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2d7a1e';
        ctx.beginPath();
        ctx.arc(x + 26, y + 34, 12, 0, Math.PI * 2);
        ctx.fill();
        // Beeren
        ctx.fillStyle = '#e03040';
        ctx.beginPath(); ctx.arc(x + 38, y + 32, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 28, y + 42, 3, 0, Math.PI * 2); ctx.fill();
        break;

      case TILE_TYPES.GRASS: {
        // === Detaillierter Rasen ===
        // Basis-Farbvariation pro Tile (natürliche Patches)
        const shade = rand(0) * 0.1 - 0.05;
        const gr = Math.round(74 + shade * 180);
        const gg = Math.round(140 + shade * 180);
        const gb = Math.round(63 + shade * 180);
        ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Weiche Farbflecken (heller/dunkler Patches für Tiefe)
        ctx.fillStyle = `rgba(${60 + Math.floor(rand(40) * 30)}, ${120 + Math.floor(rand(41) * 40)}, ${40 + Math.floor(rand(42) * 30)}, 0.3)`;
        ctx.beginPath();
        ctx.ellipse(x + 10 + rand(43) * 44, y + 10 + rand(44) * 44, 12 + rand(45) * 8, 8 + rand(46) * 6, rand(47) * Math.PI, 0, Math.PI * 2);
        ctx.fill();
        // Zweiter Patch
        ctx.fillStyle = `rgba(${80 + Math.floor(rand(50) * 20)}, ${155 + Math.floor(rand(51) * 25)}, ${55 + Math.floor(rand(52) * 20)}, 0.25)`;
        ctx.beginPath();
        ctx.ellipse(x + 20 + rand(53) * 30, y + 20 + rand(54) * 30, 10 + rand(55) * 6, 7 + rand(56) * 4, rand(57) * Math.PI, 0, Math.PI * 2);
        ctx.fill();

        // Grashalme (10-14 Stück pro Tile)
        const bladeCount = 10 + Math.floor(rand(1) * 5);
        for (let i = 0; i < bladeCount; i++) {
          const bx = x + 3 + rand(i * 4 + 10) * 58;
          const by = y + 12 + rand(i * 4 + 11) * 42;
          const bh = 4 + rand(i * 4 + 12) * 8;
          const lean = (rand(i * 4 + 13) - 0.5) * 5;
          const greenVal = 130 + Math.floor(rand(i * 4 + 14) * 50);
          // Halm
          ctx.strokeStyle = `rgba(60, ${greenVal}, 35, 0.55)`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx + lean * 0.5, by - bh * 0.5, bx + lean, by - bh);
          ctx.stroke();
        }

        // Gras-Büschel (2-3 dichtere Stellen)
        const tuftCount = 2 + Math.floor(rand(60) * 2);
        for (let t = 0; t < tuftCount; t++) {
          const tx2 = x + 8 + rand(t * 5 + 70) * 48;
          const ty2 = y + 10 + rand(t * 5 + 71) * 44;
          ctx.fillStyle = `rgba(55, ${140 + Math.floor(rand(t * 5 + 72) * 30)}, 40, 0.35)`;
          ctx.beginPath();
          ctx.ellipse(tx2, ty2, 4 + rand(t * 5 + 73) * 3, 2.5, rand(t * 5 + 74) * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }

        // Blumen (1-3 pro Tile, divers verteilt)
        const flowerCount = 1 + Math.floor(rand(200) * 3);
        for (let f = 0; f < flowerCount; f++) {
          const base = 210 + f * 13;
          // 40% Chance pro Slot, dass tatsächlich eine Blume erscheint
          if (rand(base) > 0.6) continue;
          const fx = x + 4 + rand(base + 1) * 54;
          const fy = y + 4 + rand(base + 2) * 54;
          const flowerType = rand(base + 3);

          if (flowerType > 0.8) {
            // Gänseblümchen (weiß mit gelbem Kern)
            ctx.fillStyle = '#fff';
            for (let p = 0; p < 5; p++) {
              const angle = (p / 5) * Math.PI * 2 + rand(base + 4) * 0.5;
              ctx.beginPath();
              ctx.ellipse(fx + Math.cos(angle) * 3, fy + Math.sin(angle) * 3, 2, 1.2, angle, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = '#f0d020';
            ctx.beginPath();
            ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
            ctx.fill();
          } else if (flowerType > 0.6) {
            // Butterblume (gelb)
            ctx.fillStyle = '#f0c020';
            for (let p = 0; p < 4; p++) {
              const angle = (p / 4) * Math.PI * 2 + rand(base + 5) * 0.3;
              ctx.beginPath();
              ctx.arc(fx + Math.cos(angle) * 2, fy + Math.sin(angle) * 2, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = '#e0a010';
            ctx.beginPath();
            ctx.arc(fx, fy, 1.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (flowerType > 0.4) {
            // Klee (3 kleine grüne Blätter)
            ctx.fillStyle = '#3a8a28';
            for (let p = 0; p < 3; p++) {
              const angle = (p / 3) * Math.PI * 2 - Math.PI / 2;
              ctx.beginPath();
              ctx.ellipse(fx + Math.cos(angle) * 2.5, fy + Math.sin(angle) * 2.5, 2.5, 1.8, angle, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.strokeStyle = '#2a6a18';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(fx, fy + 2);
            ctx.lineTo(fx, fy + 6);
            ctx.stroke();
          } else if (flowerType > 0.2) {
            // Lila Blume
            ctx.fillStyle = '#9060c0';
            for (let p = 0; p < 4; p++) {
              const angle = (p / 4) * Math.PI * 2 + rand(base + 6) * 0.4;
              ctx.beginPath();
              ctx.arc(fx + Math.cos(angle) * 1.8, fy + Math.sin(angle) * 1.8, 1.3, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = '#f0e060';
            ctx.beginPath();
            ctx.arc(fx, fy, 1, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Rosa Blume
            ctx.fillStyle = '#c06090';
            for (let p = 0; p < 5; p++) {
              const angle = (p / 5) * Math.PI * 2 + rand(base + 7) * 0.3;
              ctx.beginPath();
              ctx.arc(fx + Math.cos(angle) * 2, fy + Math.sin(angle) * 2, 1.4, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = '#f0d0e0';
            ctx.beginPath();
            ctx.arc(fx, fy, 1.1, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Kleiner Stein (10% Chance)
        if (rand(3) > 0.9) {
          const sx2 = x + 12 + rand(30) * 40;
          const sy2 = y + 14 + rand(31) * 36;
          ctx.fillStyle = '#7a7a6a';
          ctx.beginPath();
          ctx.ellipse(sx2, sy2, 3.5, 2, rand(32) * Math.PI, 0, Math.PI * 2);
          ctx.fill();
          // Highlight
          ctx.fillStyle = '#9a9a88';
          ctx.beginPath();
          ctx.ellipse(sx2 - 0.5, sy2 - 0.5, 2, 1.2, rand(32) * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      default:
        break;
    }

    // Gitterlinien (dezent)
    ctx.strokeStyle = 'rgba(0,0,0,0.03)';
    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
  }, []);

  // Spielerin zeichnen (blonde Frau, blau-gelb Gradient-Pulli, schwarze Leggings, barfuß)
  const drawPlayer = useCallback((ctx, camera) => {
    if (!gameState) return;

    const px = gameState.player.x + camera.x;
    const py = gameState.player.y + camera.y;

    // Lauf-Animation
    const isMoving = gameState.player.targetX !== undefined || gameState.player.moving;
    const walkCycle = isMoving ? Math.sin(Date.now() / 120) : 0;
    const legSwing = walkCycle * 5;
    const kneeSwing = walkCycle * 2.5;
    const armSwing = walkCycle * 4;
    const bodyBob = Math.abs(walkCycle) * 1.5;
    const bodyLean = isMoving ? 1.5 : 0; // Leichte Vorneigung beim Laufen

    // Basis-Koordinaten (Figur ist ~40px hoch, Mittelpunkt bei Hüfte)
    const headY = py - 16 - bodyBob;
    const neckY = py - 8 - bodyBob;
    const shoulderY = py - 6 - bodyBob;
    const waistY = py + 2 - bodyBob;
    const hipY = py + 5 - bodyBob;
    const kneeY = py + 13;
    const feetY = py + 20;

    // Schatten (wird größer/kleiner mit Bewegung)
    const shadowScale = isMoving ? 0.85 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(px + bodyLean, feetY + 2, 11 * shadowScale, 4 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // === Haare hinten (Langhaar, fällt über Rücken) ===
    ctx.fillStyle = '#E8C84A';
    ctx.beginPath();
    ctx.ellipse(px - 1, headY + 8, 7, 14, -0.05, 0, Math.PI * 2);
    ctx.fill();
    // Haarsträhnen-Highlight hinten
    ctx.fillStyle = '#F5D76E';
    ctx.beginPath();
    ctx.ellipse(px + 1, headY + 6, 5, 11, 0.05, 0, Math.PI * 2);
    ctx.fill();

    // === Beine (schwarze Leggings) ===
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Linkes Bein (Oberschenkel + Unterschenkel)
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 5.5;
    // Oberschenkel
    ctx.beginPath();
    ctx.moveTo(px - 4, hipY);
    ctx.lineTo(px - 4 - kneeSwing, kneeY);
    ctx.stroke();
    // Unterschenkel
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(px - 4 - kneeSwing, kneeY);
    ctx.lineTo(px - 4 - legSwing, feetY - 2);
    ctx.stroke();

    // Rechtes Bein (Oberschenkel + Unterschenkel)
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(px + 4, hipY);
    ctx.lineTo(px + 4 + kneeSwing, kneeY);
    ctx.stroke();
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(px + 4 + kneeSwing, kneeY);
    ctx.lineTo(px + 4 + legSwing, feetY - 2);
    ctx.stroke();

    // === Barfuß (hautfarbene Füße) ===
    ctx.fillStyle = '#F5C1A8';
    // Linker Fuß
    ctx.beginPath();
    ctx.ellipse(px - 4 - legSwing + 1, feetY, 4, 2.5, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Rechter Fuß
    ctx.beginPath();
    ctx.ellipse(px + 4 + legSwing + 1, feetY, 4, 2.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
    // Fußrücken-Schattierung
    ctx.fillStyle = '#E8AD90';
    ctx.beginPath();
    ctx.ellipse(px - 4 - legSwing, feetY + 0.5, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(px + 4 + legSwing, feetY + 0.5, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // === Körper / Pulli (blau-zu-gelb Gradient) ===
    const pulliGrad = ctx.createLinearGradient(px, shoulderY - 2, px, hipY + 3);
    pulliGrad.addColorStop(0, '#5BA4D9');    // Oben: Kräftiges Blau
    pulliGrad.addColorStop(0.35, '#6DB8D6');  // Mitte-oben: Hellblau
    pulliGrad.addColorStop(0.7, '#A8CD5A');   // Mitte-unten: Grüngelb
    pulliGrad.addColorStop(1, '#C8D94A');      // Unten: Gelb-Grün

    // Pulli-Torso (leicht tailliert)
    ctx.fillStyle = pulliGrad;
    ctx.beginPath();
    ctx.moveTo(px - 9, shoulderY);          // Linke Schulter
    ctx.lineTo(px + 9, shoulderY);          // Rechte Schulter
    ctx.lineTo(px + 8, waistY);             // Rechte Taille (etwas schmaler)
    ctx.lineTo(px + 7.5, hipY + 2);         // Rechte Hüfte
    ctx.lineTo(px - 7.5, hipY + 2);         // Linke Hüfte
    ctx.lineTo(px - 8, waistY);             // Linke Taille
    ctx.closePath();
    ctx.fill();

    // Pulli-Saum (unterer Rand, etwas dunkler)
    ctx.strokeStyle = '#B8C840';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px - 7.5, hipY + 2);
    ctx.lineTo(px + 7.5, hipY + 2);
    ctx.stroke();

    // Rundkragen
    ctx.fillStyle = '#4E96C8';
    ctx.beginPath();
    ctx.ellipse(px, shoulderY, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // === Arme (Pulli-Ärmel mit Gradient + Haut-Hände) ===
    // Linker Arm
    const leftArmGrad = ctx.createLinearGradient(px - 9, shoulderY, px - 13 + armSwing, hipY);
    leftArmGrad.addColorStop(0, '#5BA4D9');
    leftArmGrad.addColorStop(0.6, '#8BBD5C');
    leftArmGrad.addColorStop(1, '#A8CD5A');
    ctx.strokeStyle = leftArmGrad;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(px - 9, shoulderY + 2);
    ctx.lineTo(px - 13 + armSwing, hipY);
    ctx.stroke();

    // Rechter Arm
    const rightArmGrad = ctx.createLinearGradient(px + 9, shoulderY, px + 13 - armSwing, hipY);
    rightArmGrad.addColorStop(0, '#5BA4D9');
    rightArmGrad.addColorStop(0.6, '#8BBD5C');
    rightArmGrad.addColorStop(1, '#A8CD5A');
    ctx.strokeStyle = rightArmGrad;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(px + 9, shoulderY + 2);
    ctx.lineTo(px + 13 - armSwing, hipY);
    ctx.stroke();

    // Hände (Hautfarbe)
    ctx.fillStyle = '#F5C1A8';
    ctx.beginPath();
    ctx.arc(px - 13 + armSwing, hipY + 1, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 13 - armSwing, hipY + 1, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // === Kopf ===
    // Hals
    ctx.fillStyle = '#F5C1A8';
    ctx.fillRect(px - 2.5, neckY - 1, 5, 5);

    // Kopf (Hautfarbe, leicht oval)
    ctx.fillStyle = '#F5C1A8';
    ctx.beginPath();
    ctx.ellipse(px, headY, 8.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // === Haare (blond, voluminös, gewellt) ===
    // Haupthaar-Volumen (Oberkopf)
    ctx.fillStyle = '#E8C84A';
    ctx.beginPath();
    ctx.ellipse(px, headY - 3, 10.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stirn-Pony (leicht seitlich)
    ctx.fillStyle = '#F0D45A';
    ctx.beginPath();
    ctx.ellipse(px + 1, headY - 5, 9.5, 5, 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Seitliches Haar links (lang, gewellt)
    ctx.fillStyle = '#E8C84A';
    ctx.beginPath();
    ctx.ellipse(px - 9, headY + 3, 3.5, 9, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Strähne links unten
    ctx.fillStyle = '#D4B83E';
    ctx.beginPath();
    ctx.ellipse(px - 8, headY + 10, 2.5, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Seitliches Haar rechts (lang, gewellt)
    ctx.fillStyle = '#E8C84A';
    ctx.beginPath();
    ctx.ellipse(px + 9, headY + 3, 3.5, 9, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // Strähne rechts unten
    ctx.fillStyle = '#D4B83E';
    ctx.beginPath();
    ctx.ellipse(px + 8, headY + 10, 2.5, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Haar-Highlight (Glanzpunkt oben)
    ctx.fillStyle = 'rgba(255, 235, 140, 0.4)';
    ctx.beginPath();
    ctx.ellipse(px + 2, headY - 6, 4, 2.5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // === Gesicht ===
    // Augen (leicht mandelförmig)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(px - 3, headY + 0.5, 2.5, 2.8, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(px + 3, headY + 0.5, 2.5, 2.8, 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Iris (blaugrau)
    ctx.fillStyle = '#5A9EC8';
    ctx.beginPath();
    ctx.arc(px - 2.5, headY + 0.8, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 3.5, headY + 0.8, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Pupillen (dunkel)
    ctx.fillStyle = '#2a4a6a';
    ctx.beginPath();
    ctx.arc(px - 2.3, headY + 1, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 3.7, headY + 1, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Augen-Glanzpunkt
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - 3, headY + 0.2, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 3, headY + 0.2, 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Augenbrauen (fein, blond)
    ctx.strokeStyle = '#C8A840';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(px - 3, headY - 2, 3, 1.1 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px + 3, headY - 2, 3, 1.15 * Math.PI, 1.9 * Math.PI);
    ctx.stroke();

    // Nase (dezent)
    ctx.strokeStyle = '#E0A890';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(px, headY + 1.5);
    ctx.lineTo(px - 0.5, headY + 3.5);
    ctx.stroke();

    // Mund (freundliches Lächeln)
    ctx.strokeStyle = '#D4837A';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, headY + 5, 2.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Wangen (sanftes Rouge)
    ctx.fillStyle = 'rgba(255, 140, 140, 0.18)';
    ctx.beginPath();
    ctx.arc(px - 5.5, headY + 2.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 5.5, headY + 2.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }, [gameState]);

  // Einzelnes Gebäude an Position zeichnen (wiederverwendbar für normal + ghost)
  const drawShelter = useCallback((ctx, sx, sy, level, alpha) => {
    ctx.globalAlpha = alpha;
    const cx = sx + TILE_SIZE / 2;

    switch (level) {
      case 1: {
        // === Unterstand: Schräges Blätterdach auf 2 Stöcken ===
        // Laubstreu am Boden
        ctx.fillStyle = '#5a7a3a';
        ctx.fillRect(sx + 10, sy + 48, 44, 14);
        ctx.fillStyle = '#4a6a2f';
        ctx.fillRect(sx + 14, sy + 50, 36, 10);

        // Stöcke (Stützen)
        ctx.strokeStyle = '#6b4226';
        ctx.lineWidth = 3;
        // Linker Stock
        ctx.beginPath();
        ctx.moveTo(sx + 14, sy + 58);
        ctx.lineTo(sx + 18, sy + 22);
        ctx.stroke();
        // Rechter Stock
        ctx.beginPath();
        ctx.moveTo(sx + 50, sy + 58);
        ctx.lineTo(sx + 46, sy + 30);
        ctx.stroke();

        // Schräges Blätterdach
        ctx.fillStyle = '#3d7a1a';
        ctx.beginPath();
        ctx.moveTo(sx + 8, sy + 38);
        ctx.lineTo(sx + 16, sy + 16);
        ctx.lineTo(sx + 56, sy + 24);
        ctx.lineTo(sx + 52, sy + 42);
        ctx.closePath();
        ctx.fill();
        // Blatt-Streifen
        ctx.fillStyle = '#4d8a2a';
        ctx.beginPath();
        ctx.moveTo(sx + 10, sy + 34);
        ctx.lineTo(sx + 18, sy + 18);
        ctx.lineTo(sx + 54, sy + 26);
        ctx.lineTo(sx + 50, sy + 38);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 2: {
        // === Hütte: Holzwände, Strohdach, Tür, Fenster ===
        const w = 44, h = 30;
        const bx = cx - w / 2, by = sy + 28;

        // Holzwände
        ctx.fillStyle = '#8B6B3F';
        ctx.fillRect(bx, by, w, h);
        // Holz-Planken-Linien
        ctx.strokeStyle = '#6b4f2a';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(bx, by + i * (h / 4));
          ctx.lineTo(bx + w, by + i * (h / 4));
          ctx.stroke();
        }

        // Strohdach
        ctx.fillStyle = '#c4a243';
        ctx.beginPath();
        ctx.moveTo(bx - 6, by);
        ctx.lineTo(cx, sy + 10);
        ctx.lineTo(bx + w + 6, by);
        ctx.closePath();
        ctx.fill();
        // Stroh-Streifen
        ctx.strokeStyle = '#a88a30';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx - 2, by - 3);
        ctx.lineTo(cx, sy + 14);
        ctx.lineTo(bx + w + 2, by - 3);
        ctx.stroke();

        // Tür
        ctx.fillStyle = '#3a2010';
        ctx.fillRect(cx - 5, by + h - 16, 10, 16);
        // Türknauf
        ctx.fillStyle = '#c0a040';
        ctx.beginPath();
        ctx.arc(cx + 2, by + h - 8, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Fenster
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(bx + 5, by + 6, 8, 8);
        ctx.strokeStyle = '#5a3a1a';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 5, by + 6, 8, 8);
        // Fensterkreuz
        ctx.beginPath();
        ctx.moveTo(bx + 9, by + 6);
        ctx.lineTo(bx + 9, by + 14);
        ctx.moveTo(bx + 5, by + 10);
        ctx.lineTo(bx + 13, by + 10);
        ctx.stroke();
        break;
      }
      case 3: {
        // === Blockhaus: Blockbalken-Wände, Giebeldach, Schornstein, 2 Fenster ===
        const w = 48, h = 32;
        const bx = cx - w / 2, by = sy + 26;

        // Blockbalken-Wände
        ctx.fillStyle = '#7a5a30';
        ctx.fillRect(bx, by, w, h);
        // Balken-Linien
        ctx.strokeStyle = '#5a3a18';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          const yy = by + 3 + i * 6;
          ctx.beginPath();
          ctx.moveTo(bx, yy);
          ctx.lineTo(bx + w, yy);
          ctx.stroke();
        }
        // Balken-Enden (überstehend)
        ctx.fillStyle = '#6a4a28';
        ctx.fillRect(bx - 3, by, 3, h);
        ctx.fillRect(bx + w, by, 3, h);

        // Giebeldach
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.moveTo(bx - 5, by);
        ctx.lineTo(cx, sy + 8);
        ctx.lineTo(bx + w + 5, by);
        ctx.closePath();
        ctx.fill();
        // Dachfirst
        ctx.strokeStyle = '#5a2a08';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx - 5, by);
        ctx.lineTo(cx, sy + 8);
        ctx.lineTo(bx + w + 5, by);
        ctx.stroke();

        // Schornstein
        ctx.fillStyle = '#666';
        ctx.fillRect(bx + w - 12, sy + 6, 8, 14);
        ctx.fillStyle = '#555';
        ctx.fillRect(bx + w - 13, sy + 4, 10, 4);

        // Tür
        ctx.fillStyle = '#3a2010';
        ctx.fillRect(cx - 6, by + h - 18, 12, 18);
        ctx.fillStyle = '#c0a040';
        ctx.beginPath();
        ctx.arc(cx + 3, by + h - 9, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // 2 Fenster
        for (const fx of [bx + 5, bx + w - 13]) {
          ctx.fillStyle = '#87CEEB';
          ctx.fillRect(fx, by + 8, 8, 8);
          ctx.strokeStyle = '#5a3a1a';
          ctx.lineWidth = 1;
          ctx.strokeRect(fx, by + 8, 8, 8);
          ctx.beginPath();
          ctx.moveTo(fx + 4, by + 8);
          ctx.lineTo(fx + 4, by + 16);
          ctx.moveTo(fx, by + 12);
          ctx.lineTo(fx + 8, by + 12);
          ctx.stroke();
        }
        break;
      }
      case 4: {
        // === Steinhaus: Steinmauer, Ziegeldach, 2 Fenster mit Rahmen, Rauch ===
        const w = 50, h = 34;
        const bx = cx - w / 2, by = sy + 24;

        // Steinmauer
        ctx.fillStyle = '#888';
        ctx.fillRect(bx, by, w, h);
        // Steinmuster
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        for (let row = 0; row < 4; row++) {
          const yy = by + row * 8;
          ctx.beginPath();
          ctx.moveTo(bx, yy + 8);
          ctx.lineTo(bx + w, yy + 8);
          ctx.stroke();
          const stoneOffset = row % 2 === 0 ? 0 : 10;
          for (let col = stoneOffset; col < w; col += 20) {
            ctx.beginPath();
            ctx.moveTo(bx + col, yy);
            ctx.lineTo(bx + col, yy + 8);
            ctx.stroke();
          }
        }

        // Ziegeldach
        ctx.fillStyle = '#B0463C';
        ctx.beginPath();
        ctx.moveTo(bx - 6, by);
        ctx.lineTo(cx, sy + 6);
        ctx.lineTo(bx + w + 6, by);
        ctx.closePath();
        ctx.fill();
        // Dachziegel-Linien
        ctx.strokeStyle = '#8a3028';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) {
          const t = i / 4;
          const ly = by + (sy + 6 - by) * t;
          const lx1 = bx - 6 + (cx - bx + 6) * t - (1 - t) * 4;
          const lx2 = bx + w + 6 - (bx + w + 6 - cx) * t + (1 - t) * 4;
          ctx.beginPath();
          ctx.moveTo(lx1, ly);
          ctx.lineTo(lx2, ly);
          ctx.stroke();
        }

        // Schornstein mit Rauch
        ctx.fillStyle = '#555';
        ctx.fillRect(bx + w - 14, sy + 2, 10, 16);
        ctx.fillStyle = '#444';
        ctx.fillRect(bx + w - 15, sy, 12, 4);
        // Rauch
        ctx.fillStyle = 'rgba(200,200,200,0.4)';
        const t = (Date.now() / 800) % 3;
        for (let i = 0; i < 3; i++) {
          const smokeY = sy - 2 - (t + i * 4) * 2;
          const smokeR = 2 + i * 1.5;
          ctx.beginPath();
          ctx.arc(bx + w - 9 + Math.sin(t + i) * 2, smokeY, smokeR, 0, Math.PI * 2);
          ctx.fill();
        }

        // Tür (größer)
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(cx - 7, by + h - 20, 14, 20);
        ctx.strokeStyle = '#3a1a08';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 7, by + h - 20, 14, 20);
        // Türknauf
        ctx.fillStyle = '#d4a840';
        ctx.beginPath();
        ctx.arc(cx + 4, by + h - 10, 2, 0, Math.PI * 2);
        ctx.fill();

        // 2 Fenster mit Rahmen
        for (const fx of [bx + 4, bx + w - 14]) {
          // Rahmen
          ctx.fillStyle = '#5a3a1a';
          ctx.fillRect(fx - 1, by + 8, 12, 12);
          // Glas
          ctx.fillStyle = '#a0d8f0';
          ctx.fillRect(fx, by + 9, 10, 10);
          // Kreuz
          ctx.strokeStyle = '#5a3a1a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(fx + 5, by + 9);
          ctx.lineTo(fx + 5, by + 19);
          ctx.moveTo(fx, by + 14);
          ctx.lineTo(fx + 10, by + 14);
          ctx.stroke();
        }
        break;
      }
      case 5:
      default: {
        // === Villa: Zweistöckig, Balkon, mehrere Fenster, Steinfundament, verziertes Dach ===
        const w = 54, h = 42;
        const bx = cx - w / 2, by = sy + 18;

        // Steinfundament
        ctx.fillStyle = '#777';
        ctx.fillRect(bx - 2, by + h - 4, w + 4, 6);

        // Untergeschoss
        ctx.fillStyle = '#c8b898';
        ctx.fillRect(bx, by + h / 2, w, h / 2);
        // Obergeschoss
        ctx.fillStyle = '#d4c4a8';
        ctx.fillRect(bx, by, w, h / 2);
        // Geschoss-Trennung
        ctx.fillStyle = '#8a7a5a';
        ctx.fillRect(bx, by + h / 2 - 1, w, 3);

        // Verziertes Dach
        ctx.fillStyle = '#6a2828';
        ctx.beginPath();
        ctx.moveTo(bx - 6, by);
        ctx.lineTo(cx, sy + 2);
        ctx.lineTo(bx + w + 6, by);
        ctx.closePath();
        ctx.fill();
        // Dachverzierung
        ctx.strokeStyle = '#4a1818';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx - 6, by);
        ctx.lineTo(cx, sy + 2);
        ctx.lineTo(bx + w + 6, by);
        ctx.stroke();
        // Dachspitze-Ornament
        ctx.fillStyle = '#d4a840';
        ctx.beginPath();
        ctx.arc(cx, sy + 1, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Schornstein
        ctx.fillStyle = '#555';
        ctx.fillRect(bx + w - 12, sy - 2, 8, 14);
        ctx.fillStyle = '#444';
        ctx.fillRect(bx + w - 13, sy - 4, 10, 4);
        // Rauch
        ctx.fillStyle = 'rgba(200,200,200,0.35)';
        const t5 = (Date.now() / 900) % 3;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(bx + w - 8 + Math.sin(t5 + i) * 2, sy - 6 - (t5 + i * 3) * 2, 2 + i, 0, Math.PI * 2);
          ctx.fill();
        }

        // Balkon (Obergeschoss Mitte)
        ctx.fillStyle = '#8a7a5a';
        ctx.fillRect(cx - 12, by + h / 2 - 3, 24, 3);
        // Balkongeländer
        ctx.strokeStyle = '#6a5a3a';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 12, by + h / 2 - 10, 24, 8);
        // Geländer-Stäbe
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(cx - 10 + i * 7, by + h / 2 - 10);
          ctx.lineTo(cx - 10 + i * 7, by + h / 2 - 2);
          ctx.stroke();
        }

        // Tür (Untergeschoss, mittig)
        ctx.fillStyle = '#3a1a08';
        ctx.fillRect(cx - 7, by + h - 18, 14, 18);
        // Tür-Rahmen
        ctx.strokeStyle = '#8a7a5a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 7, by + h - 18, 14, 18);
        // Türknauf
        ctx.fillStyle = '#d4a840';
        ctx.beginPath();
        ctx.arc(cx + 4, by + h - 9, 2, 0, Math.PI * 2);
        ctx.fill();

        // Fenster Obergeschoss (3 Stück)
        for (const fx of [bx + 4, cx - 4, bx + w - 12]) {
          ctx.fillStyle = '#a0d8f0';
          ctx.fillRect(fx, by + 6, 8, 10);
          ctx.strokeStyle = '#5a4a2a';
          ctx.lineWidth = 1;
          ctx.strokeRect(fx, by + 6, 8, 10);
          ctx.beginPath();
          ctx.moveTo(fx + 4, by + 6);
          ctx.lineTo(fx + 4, by + 16);
          ctx.moveTo(fx, by + 11);
          ctx.lineTo(fx + 8, by + 11);
          ctx.stroke();
        }
        // Fenster Untergeschoss (2 Stück, neben Tür)
        for (const fx of [bx + 4, bx + w - 12]) {
          ctx.fillStyle = '#a0d8f0';
          ctx.fillRect(fx, by + h / 2 + 4, 8, 10);
          ctx.strokeStyle = '#5a4a2a';
          ctx.lineWidth = 1;
          ctx.strokeRect(fx, by + h / 2 + 4, 8, 10);
          ctx.beginPath();
          ctx.moveTo(fx + 4, by + h / 2 + 4);
          ctx.lineTo(fx + 4, by + h / 2 + 14);
          ctx.moveTo(fx, by + h / 2 + 9);
          ctx.lineTo(fx + 8, by + h / 2 + 9);
          ctx.stroke();
        }
        break;
      }
    }

    // Level-Anzeige
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeText(`Lv.${level}`, cx, sy + TILE_SIZE - 2);
    ctx.fillText(`Lv.${level}`, cx, sy + TILE_SIZE - 2);
    ctx.globalAlpha = 1;
  }, []);

  const drawCampfire = useCallback((ctx, fx, fy, alpha) => {
    ctx.globalAlpha = alpha;
    const time = Date.now() / 200;

    // Steine um Feuer
    ctx.fillStyle = '#666';
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(
        fx + 32 + Math.cos(angle) * 16,
        fy + 36 + Math.sin(angle) * 12,
        5, 0, Math.PI * 2
      );
      ctx.fill();
    }

    // Flammen
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.arc(fx + 32, fy + 30 + Math.sin(time) * 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(fx + 32, fy + 28 + Math.sin(time + 1) * 3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff3300';
    ctx.beginPath();
    ctx.arc(fx + 28, fy + 32 + Math.sin(time + 2) * 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }, []);

  const drawWaterCollector = useCallback((ctx, wx, wy, alpha) => {
    ctx.globalAlpha = alpha;

    // Holzgestell
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(wx + 10, wy + 15, 4, 35);
    ctx.fillRect(wx + 50, wy + 15, 4, 35);

    // Auffangschale
    ctx.fillStyle = '#A0522D';
    ctx.beginPath();
    ctx.moveTo(wx + 8, wy + 20);
    ctx.lineTo(wx + 56, wy + 20);
    ctx.lineTo(wx + 48, wy + 32);
    ctx.lineTo(wx + 16, wy + 32);
    ctx.closePath();
    ctx.fill();

    // Wasser drin
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(wx + 18, wy + 24, 28, 6);
    ctx.globalAlpha = 1;
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
  const drawGrowingTree = useCallback((ctx, camera) => {
    if (!gameState) return;

    const stage = getTreeStage();
    const tx = TREE_POSITION.col * TILE_SIZE + camera.x;
    const ty = TREE_POSITION.row * TILE_SIZE + camera.y;
    const cx = tx + TILE_SIZE / 2;  // Mitte der Tile
    const cy = ty + TILE_SIZE;       // Basis unten

    // Skalierung: Stufe 1 = 0.2×, Stufe 10 = 1.0× (also 5× Wachstum)
    const scale = 0.2 + (stage - 1) * (0.8 / 9);

    // Stammhöhe und -breite skaliert (mächtiger Baum bei Stufe 10: ~4 Tiles hoch)
    const trunkH = 150 * scale;
    const trunkW = Math.max(6, 45 * scale);
    const crownR = Math.max(10, 100 * scale);
    const crownR2 = Math.max(8, 72 * scale);

    // Schatten
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, crownR * 0.6, 4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stamm
    ctx.fillStyle = stage <= 3 ? '#8B7355' : '#5c3a1e';
    ctx.fillRect(cx - trunkW / 2, cy - trunkH - 4, trunkW, trunkH);

    // Stufe 1-2: Setzling (nur dünner Stiel + paar Blätter)
    if (stage <= 2) {
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.ellipse(cx, cy - trunkH - 6, crownR * 0.8, crownR * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      // Stufe 2: zweites Blatt
      if (stage === 2) {
        ctx.fillStyle = '#388E3C';
        ctx.beginPath();
        ctx.ellipse(cx - 3, cy - trunkH - 4, crownR * 0.5, crownR * 0.6, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // Stufe 3-5: Junger Baum (einfache Krone)
    if (stage <= 5) {
      // Haupt-Krone
      ctx.fillStyle = '#2d7a1e';
      ctx.beginPath();
      ctx.arc(cx, cy - trunkH - crownR * 0.6, crownR, 0, Math.PI * 2);
      ctx.fill();
      // Schatten-Krone
      ctx.fillStyle = '#1e6016';
      ctx.beginPath();
      ctx.arc(cx - crownR * 0.2, cy - trunkH - crownR * 0.8, crownR2, 0, Math.PI * 2);
      ctx.fill();
      // Ab Stufe 5: Extra-Blätter
      if (stage >= 5) {
        ctx.fillStyle = '#3a8c28';
        ctx.beginPath();
        ctx.arc(cx + crownR * 0.4, cy - trunkH - crownR * 0.3, crownR2 * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // Stufe 6-8: Ausgewachsener Baum (volle Krone mit Details)
    if (stage <= 8) {
      // Äste (ab Stufe 7)
      if (stage >= 7) {
        ctx.strokeStyle = '#5c3a1e';
        ctx.lineWidth = Math.max(2, 3 * scale);
        ctx.beginPath();
        ctx.moveTo(cx, cy - trunkH * 0.6);
        ctx.lineTo(cx - crownR * 0.8, cy - trunkH - crownR * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy - trunkH * 0.7);
        ctx.lineTo(cx + crownR * 0.7, cy - trunkH - crownR * 0.2);
        ctx.stroke();
      }
      // Haupt-Krone
      ctx.fillStyle = '#2d7a1e';
      ctx.beginPath();
      ctx.arc(cx, cy - trunkH - crownR * 0.7, crownR, 0, Math.PI * 2);
      ctx.fill();
      // Zweite Krone
      ctx.fillStyle = '#1e6016';
      ctx.beginPath();
      ctx.arc(cx - crownR * 0.3, cy - trunkH - crownR, crownR2, 0, Math.PI * 2);
      ctx.fill();
      // Dritte Krone
      ctx.fillStyle = '#3a8c28';
      ctx.beginPath();
      ctx.arc(cx + crownR * 0.35, cy - trunkH - crownR * 0.5, crownR2 * 0.9, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Stufe 9-10: Mächtiger alter Baum (Wurzeln, volle Krone, Lichtreflexe)
    // Wurzeln
    ctx.fillStyle = '#5c3a1e';
    ctx.beginPath();
    ctx.moveTo(cx - trunkW, cy - 4);
    ctx.lineTo(cx - trunkW * 1.5, cy);
    ctx.lineTo(cx - trunkW * 0.3, cy - 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + trunkW, cy - 4);
    ctx.lineTo(cx + trunkW * 1.5, cy);
    ctx.lineTo(cx + trunkW * 0.3, cy - 2);
    ctx.closePath();
    ctx.fill();

    // Dicke Äste
    ctx.strokeStyle = '#5c3a1e';
    ctx.lineWidth = Math.max(3, 4 * scale);
    ctx.beginPath();
    ctx.moveTo(cx, cy - trunkH * 0.5);
    ctx.lineTo(cx - crownR, cy - trunkH - crownR * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - trunkH * 0.6);
    ctx.lineTo(cx + crownR * 0.9, cy - trunkH - crownR * 0.3);
    ctx.stroke();

    // Große Haupt-Krone
    ctx.fillStyle = '#2d7a1e';
    ctx.beginPath();
    ctx.arc(cx, cy - trunkH - crownR * 0.8, crownR * 1.1, 0, Math.PI * 2);
    ctx.fill();
    // Links
    ctx.fillStyle = '#1e6016';
    ctx.beginPath();
    ctx.arc(cx - crownR * 0.5, cy - trunkH - crownR * 1.0, crownR2 * 1.1, 0, Math.PI * 2);
    ctx.fill();
    // Rechts
    ctx.fillStyle = '#3a8c28';
    ctx.beginPath();
    ctx.arc(cx + crownR * 0.5, cy - trunkH - crownR * 0.6, crownR2, 0, Math.PI * 2);
    ctx.fill();
    // Oben
    ctx.fillStyle = '#257818';
    ctx.beginPath();
    ctx.arc(cx - crownR * 0.1, cy - trunkH - crownR * 1.3, crownR2 * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Lichtreflexe (Stufe 10)
    if (stage === 10) {
      ctx.fillStyle = 'rgba(255,255,200,0.15)';
      ctx.beginPath();
      ctx.arc(cx + crownR * 0.3, cy - trunkH - crownR * 1.0, crownR * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stufen-Anzeige (klein)
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Stufe ${stage}`, cx, cy + 8);
  }, [gameState, getTreeStage]);

  // Gebäude auf der Karte zeichnen (dynamisch aus placedBuildings)
  const drawBuildings = useCallback((ctx, camera) => {
    if (!gameState) return;

    const placed = gameState.placedBuildings || [];

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
    const isMainTree = placementGhost.col === TREE_POSITION.col && placementGhost.row === TREE_POSITION.row;
    const valid = isGrass && !isOccupiedByOther && !isOccupiedByTree && !isMainTree;

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
      default:
        break;
    }
  }, [placementGhost, gameState, drawShelter, drawCampfire, drawWaterCollector]);

  // Tiere auf der Karte zeichnen
  const drawAnimals = useCallback((ctx, camera) => {
    if (!gameState?.animals || gameState.animals.length === 0) return;

    for (const animal of gameState.animals) {
      const def = ANIMAL_TYPES[animal.type];
      if (!def) continue;

      const ax = animal.x + camera.x;
      const ay = animal.y + camera.y;
      const s = def.size;
      const half = s / 2;

      // Blickrichtung (für Flip)
      const facingLeft = animal.dirX < 0;

      ctx.save();
      if (facingLeft) {
        ctx.translate(ax, ay);
        ctx.scale(-1, 1);
        ctx.translate(-ax, -ay);
      }

      switch (animal.type) {
        case 'deer': {
          // Reh - braun, elegant
          // Schatten
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath();
          ctx.ellipse(ax, ay + half + 2, half * 0.7, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          // Körper
          ctx.fillStyle = '#A0522D';
          ctx.beginPath();
          ctx.ellipse(ax, ay + 2, half * 0.7, half * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          // Kopf
          ctx.fillStyle = '#8B4513';
          ctx.beginPath();
          ctx.arc(ax + half * 0.5, ay - half * 0.2, half * 0.35, 0, Math.PI * 2);
          ctx.fill();
          // Geweih
          ctx.strokeStyle = '#654321';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(ax + half * 0.5, ay - half * 0.5);
          ctx.lineTo(ax + half * 0.7, ay - half);
          ctx.lineTo(ax + half * 0.9, ay - half * 0.7);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ax + half * 0.5, ay - half * 0.5);
          ctx.lineTo(ax + half * 0.3, ay - half);
          ctx.stroke();
          // Auge
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(ax + half * 0.6, ay - half * 0.25, 1.5, 0, Math.PI * 2);
          ctx.fill();
          // Beine
          ctx.strokeStyle = '#8B4513';
          ctx.lineWidth = 2;
          const legOff = animal.state === 'walking' ? Math.sin(Date.now() / 150) * 3 : 0;
          ctx.beginPath();
          ctx.moveTo(ax - half * 0.3, ay + half * 0.3);
          ctx.lineTo(ax - half * 0.3, ay + half + legOff);
          ctx.moveTo(ax + half * 0.3, ay + half * 0.3);
          ctx.lineTo(ax + half * 0.3, ay + half - legOff);
          ctx.stroke();
          break;
        }

        case 'heron': {
          // Reiher - grau-blau, langer Hals
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.beginPath();
          ctx.ellipse(ax, ay + half + 2, half * 0.4, 2, 0, 0, Math.PI * 2);
          ctx.fill();
          // Körper
          ctx.fillStyle = '#B0C4DE';
          ctx.beginPath();
          ctx.ellipse(ax, ay + 4, half * 0.5, half * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          // Hals
          ctx.strokeStyle = '#B0C4DE';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(ax + half * 0.3, ay);
          ctx.quadraticCurveTo(ax + half * 0.4, ay - half * 0.5, ax + half * 0.2, ay - half * 0.8);
          ctx.stroke();
          // Kopf
          ctx.fillStyle = '#9BB0C8';
          ctx.beginPath();
          ctx.arc(ax + half * 0.2, ay - half * 0.8, half * 0.22, 0, Math.PI * 2);
          ctx.fill();
          // Schnabel
          ctx.fillStyle = '#DAA520';
          ctx.beginPath();
          ctx.moveTo(ax + half * 0.35, ay - half * 0.85);
          ctx.lineTo(ax + half * 0.8, ay - half * 0.8);
          ctx.lineTo(ax + half * 0.35, ay - half * 0.72);
          ctx.closePath();
          ctx.fill();
          // Auge
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(ax + half * 0.25, ay - half * 0.83, 1.2, 0, Math.PI * 2);
          ctx.fill();
          // Beine (lang und dünn)
          ctx.strokeStyle = '#DAA520';
          ctx.lineWidth = 1.5;
          const hLegOff = animal.state === 'walking' ? Math.sin(Date.now() / 200) * 4 : 0;
          ctx.beginPath();
          ctx.moveTo(ax - 2, ay + half * 0.3);
          ctx.lineTo(ax - 2, ay + half + 2 + hLegOff);
          ctx.moveTo(ax + 3, ay + half * 0.3);
          ctx.lineTo(ax + 3, ay + half + 2 - hLegOff);
          ctx.stroke();
          break;
        }

        case 'goat': {
          // Ziege - grau-braun, Hörner
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath();
          ctx.ellipse(ax, ay + half + 2, half * 0.6, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          // Körper
          ctx.fillStyle = '#C4A882';
          ctx.beginPath();
          ctx.ellipse(ax, ay + 2, half * 0.65, half * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          // Kopf
          ctx.fillStyle = '#B89B6E';
          ctx.beginPath();
          ctx.arc(ax + half * 0.55, ay - half * 0.15, half * 0.3, 0, Math.PI * 2);
          ctx.fill();
          // Hörner
          ctx.strokeStyle = '#8B7355';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ax + half * 0.5, ay - half * 0.35);
          ctx.quadraticCurveTo(ax + half * 0.3, ay - half * 0.8, ax + half * 0.5, ay - half * 0.7);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ax + half * 0.6, ay - half * 0.35);
          ctx.quadraticCurveTo(ax + half * 0.8, ay - half * 0.8, ax + half * 0.6, ay - half * 0.7);
          ctx.stroke();
          // Bart
          ctx.strokeStyle = '#A0886B';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ax + half * 0.65, ay);
          ctx.lineTo(ax + half * 0.65, ay + half * 0.2);
          ctx.stroke();
          // Auge
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(ax + half * 0.6, ay - half * 0.2, 1.5, 0, Math.PI * 2);
          ctx.fill();
          // Beine
          ctx.strokeStyle = '#B89B6E';
          ctx.lineWidth = 2;
          const gLegOff = animal.state === 'walking' ? Math.sin(Date.now() / 140) * 3 : 0;
          ctx.beginPath();
          ctx.moveTo(ax - half * 0.3, ay + half * 0.3);
          ctx.lineTo(ax - half * 0.35, ay + half + gLegOff);
          ctx.moveTo(ax + half * 0.2, ay + half * 0.3);
          ctx.lineTo(ax + half * 0.25, ay + half - gLegOff);
          ctx.stroke();
          break;
        }

        case 'rabbit': {
          // Hase - klein, lange Ohren
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.beginPath();
          ctx.ellipse(ax, ay + half, half * 0.5, 2, 0, 0, Math.PI * 2);
          ctx.fill();
          // Körper
          ctx.fillStyle = '#D2B48C';
          ctx.beginPath();
          ctx.ellipse(ax, ay + 2, half * 0.55, half * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          // Kopf
          ctx.fillStyle = '#C8A87A';
          ctx.beginPath();
          ctx.arc(ax + half * 0.4, ay - half * 0.1, half * 0.35, 0, Math.PI * 2);
          ctx.fill();
          // Ohren
          ctx.fillStyle = '#D2B48C';
          ctx.beginPath();
          ctx.ellipse(ax + half * 0.25, ay - half * 0.7, 2.5, half * 0.35, -0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(ax + half * 0.5, ay - half * 0.7, 2.5, half * 0.35, 0.2, 0, Math.PI * 2);
          ctx.fill();
          // Ohr-Inneres (rosa)
          ctx.fillStyle = '#E8B4B4';
          ctx.beginPath();
          ctx.ellipse(ax + half * 0.25, ay - half * 0.7, 1.2, half * 0.2, -0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(ax + half * 0.5, ay - half * 0.7, 1.2, half * 0.2, 0.2, 0, Math.PI * 2);
          ctx.fill();
          // Auge
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(ax + half * 0.5, ay - half * 0.15, 1.2, 0, Math.PI * 2);
          ctx.fill();
          // Schwanz (Puschel)
          ctx.fillStyle = '#E8DCC8';
          ctx.beginPath();
          ctx.arc(ax - half * 0.5, ay + 2, 3, 0, Math.PI * 2);
          ctx.fill();
          // (Hase hüpft über die Bewegungs-AI)
          break;
        }

        case 'cat': {
          // Katze — Kätzchen (65% Größe) oder Erwachsen (100%)
          const catStage = getCatStage(animal.spawnedAt);
          const catScale = catStage === 'kitten' ? 0.65 : 1.0;
          const cs = s * catScale;
          const cHalf = cs / 2;
          const isSleeping = animal.catState === 'sleeping';
          const isWalking = animal.catState === 'slow_walk' || animal.catState === 'fast_walk';
          const walkSpeed = animal.catState === 'fast_walk' ? 120 : 200;

          // Schatten
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath();
          ctx.ellipse(ax, ay + cHalf + 2, cHalf * 0.7, 3 * catScale, 0, 0, Math.PI * 2);
          ctx.fill();

          if (isSleeping) {
            // Schlafend: zusammengerollt
            ctx.fillStyle = '#F5A623';
            ctx.beginPath();
            ctx.ellipse(ax, ay + 2, cHalf * 0.6, cHalf * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            // Kopf auf Körper
            ctx.fillStyle = '#E09510';
            ctx.beginPath();
            ctx.arc(ax + cHalf * 0.3, ay - cHalf * 0.1, cHalf * 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Geschlossene Augen (Striche)
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ax + cHalf * 0.2, ay - cHalf * 0.15);
            ctx.lineTo(ax + cHalf * 0.4, ay - cHalf * 0.15);
            ctx.stroke();
            // Schwanz eingerollt
            ctx.strokeStyle = '#E09510';
            ctx.lineWidth = 2 * catScale;
            ctx.beginPath();
            ctx.arc(ax - cHalf * 0.2, ay + cHalf * 0.15, cHalf * 0.35, 0.5, Math.PI * 1.5);
            ctx.stroke();
            // z z z
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = `${8 * catScale}px sans-serif`;
            const bob = Math.sin(Date.now() / 600) * 2;
            ctx.fillText('z', ax + cHalf * 0.5, ay - cHalf * 0.5 + bob);
            ctx.fillText('z', ax + cHalf * 0.7, ay - cHalf * 0.8 + bob * 0.7);
          } else {
            // Wach: stehend / laufend
            // Körper
            ctx.fillStyle = '#F5A623';
            ctx.beginPath();
            ctx.ellipse(ax, ay + 2, cHalf * 0.6, cHalf * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();
            // Kopf
            ctx.fillStyle = '#E09510';
            ctx.beginPath();
            ctx.arc(ax + cHalf * 0.5, ay - cHalf * 0.15, cHalf * 0.32, 0, Math.PI * 2);
            ctx.fill();
            // Ohren (Dreiecke)
            ctx.fillStyle = '#F5A623';
            ctx.beginPath();
            ctx.moveTo(ax + cHalf * 0.3, ay - cHalf * 0.4);
            ctx.lineTo(ax + cHalf * 0.2, ay - cHalf * 0.75);
            ctx.lineTo(ax + cHalf * 0.45, ay - cHalf * 0.45);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(ax + cHalf * 0.55, ay - cHalf * 0.4);
            ctx.lineTo(ax + cHalf * 0.75, ay - cHalf * 0.75);
            ctx.lineTo(ax + cHalf * 0.7, ay - cHalf * 0.35);
            ctx.closePath();
            ctx.fill();
            // Ohr-Inneres (rosa)
            ctx.fillStyle = '#FFB6C1';
            ctx.beginPath();
            ctx.moveTo(ax + cHalf * 0.32, ay - cHalf * 0.42);
            ctx.lineTo(ax + cHalf * 0.25, ay - cHalf * 0.65);
            ctx.lineTo(ax + cHalf * 0.43, ay - cHalf * 0.45);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(ax + cHalf * 0.57, ay - cHalf * 0.42);
            ctx.lineTo(ax + cHalf * 0.7, ay - cHalf * 0.65);
            ctx.lineTo(ax + cHalf * 0.67, ay - cHalf * 0.37);
            ctx.closePath();
            ctx.fill();
            // Augen
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(ax + cHalf * 0.42, ay - cHalf * 0.2, 1.5 * catScale, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ax + cHalf * 0.58, ay - cHalf * 0.2, 1.5 * catScale, 0, Math.PI * 2);
            ctx.fill();
            // Nase (kleines rosa Dreieck)
            ctx.fillStyle = '#FF69B4';
            ctx.beginPath();
            ctx.moveTo(ax + cHalf * 0.5, ay - cHalf * 0.08);
            ctx.lineTo(ax + cHalf * 0.46, ay - cHalf * 0.02);
            ctx.lineTo(ax + cHalf * 0.54, ay - cHalf * 0.02);
            ctx.closePath();
            ctx.fill();
            // Schnurrhaare
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 0.5;
            // Links
            ctx.beginPath();
            ctx.moveTo(ax + cHalf * 0.35, ay - cHalf * 0.05);
            ctx.lineTo(ax + cHalf * 0.05, ay - cHalf * 0.12);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(ax + cHalf * 0.35, ay);
            ctx.lineTo(ax + cHalf * 0.05, ay + cHalf * 0.05);
            ctx.stroke();
            // Rechts
            ctx.beginPath();
            ctx.moveTo(ax + cHalf * 0.65, ay - cHalf * 0.05);
            ctx.lineTo(ax + cHalf * 0.95, ay - cHalf * 0.12);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(ax + cHalf * 0.65, ay);
            ctx.lineTo(ax + cHalf * 0.95, ay + cHalf * 0.05);
            ctx.stroke();
            // Schwanz (kurviger Strich)
            ctx.strokeStyle = '#E09510';
            ctx.lineWidth = 2.5 * catScale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ax - cHalf * 0.55, ay + 2);
            ctx.quadraticCurveTo(
              ax - cHalf * 0.9, ay - cHalf * 0.3,
              ax - cHalf * 0.7, ay - cHalf * 0.5
            );
            ctx.stroke();
            ctx.lineCap = 'butt';
            // Beine (mit Laufanimation)
            ctx.strokeStyle = '#E09510';
            ctx.lineWidth = 2 * catScale;
            const cLegOff = isWalking ? Math.sin(Date.now() / walkSpeed) * 3 * catScale : 0;
            ctx.beginPath();
            ctx.moveTo(ax - cHalf * 0.25, ay + cHalf * 0.3);
            ctx.lineTo(ax - cHalf * 0.25, ay + cHalf + cLegOff);
            ctx.moveTo(ax + cHalf * 0.15, ay + cHalf * 0.3);
            ctx.lineTo(ax + cHalf * 0.15, ay + cHalf - cLegOff);
            ctx.stroke();
            // Hinterbeine
            ctx.beginPath();
            ctx.moveTo(ax - cHalf * 0.1, ay + cHalf * 0.3);
            ctx.lineTo(ax - cHalf * 0.1, ay + cHalf - cLegOff * 0.5);
            ctx.moveTo(ax + cHalf * 0.3, ay + cHalf * 0.3);
            ctx.lineTo(ax + cHalf * 0.3, ay + cHalf + cLegOff * 0.5);
            ctx.stroke();
          }
          break;
        }

        default:
          // Fallback: einfacher Kreis
          ctx.fillStyle = def.color;
          ctx.beginPath();
          ctx.arc(ax, ay, half, 0, Math.PI * 2);
          ctx.fill();
          break;
      }

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

  // Unkraut auf der Karte zeichnen (3 Stufen)
  const drawWeeds = useCallback((ctx, camera) => {
    if (!gameState?.weeds || gameState.weeds.length === 0) return;

    for (const weed of gameState.weeds) {
      const wx = weed.col * TILE_SIZE + camera.x;
      const wy = weed.row * TILE_SIZE + camera.y;
      const cx = wx + TILE_SIZE / 2;
      const cy = wy + TILE_SIZE / 2;

      const time = Date.now() / 2000;
      const sway = Math.sin(time + weed.col * 2 + weed.row * 3) * 1.5;

      switch (weed.stage) {
        case 1: {
          // Stufe 1: Kleine Keimlinge (sichtbare gruene Sproesslinge)
          // Dunkleres Gruen damit es sich vom Gras abhebt
          ctx.strokeStyle = '#3D6B0F';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(cx - 7, cy + 12);
          ctx.quadraticCurveTo(cx - 6 + sway * 0.5, cy + 4, cx - 5 + sway, cy - 4);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + 5, cy + 12);
          ctx.quadraticCurveTo(cx + 4 + sway * 0.5, cy + 4, cx + 6 + sway, cy - 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx - 1, cy + 12);
          ctx.quadraticCurveTo(cx + sway * 0.3, cy + 4, cx + sway * 0.5, cy);
          ctx.stroke();
          // Kleine Blaettchen an den Spitzen
          ctx.fillStyle = '#4A8C1B';
          ctx.beginPath();
          ctx.ellipse(cx - 5 + sway, cy - 5, 3, 2, -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(cx + 6 + sway, cy - 3, 3, 2, 0.4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 2: {
          // Stufe 2: Mittelgroßes gruenes Unkraut (dickere Halme, Blaetter)
          ctx.strokeStyle = '#556B2F';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx - 4, cy + 12);
          ctx.quadraticCurveTo(cx - 3 + sway * 0.5, cy + 2, cx - 6 + sway, cy - 8);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + 4, cy + 12);
          ctx.quadraticCurveTo(cx + 3 + sway * 0.5, cy, cx + 7 + sway, cy - 6);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx, cy + 12);
          ctx.quadraticCurveTo(cx + sway * 0.3, cy + 2, cx + sway * 0.5, cy - 4);
          ctx.stroke();
          // Gruene Blaetter
          ctx.fillStyle = '#7CBA3E';
          ctx.beginPath();
          ctx.ellipse(cx - 6 + sway, cy - 9, 5, 3, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(cx + 7 + sway, cy - 7, 5, 3, 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#8ED450';
          ctx.beginPath();
          ctx.ellipse(cx + sway * 0.5, cy - 5, 4, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 3:
        default: {
          // Stufe 3: Goldenes Heu (voll ausgewachsen, deutlich anders als Stufe 2)
          // Basis: bueschel aus goldenen Halmen
          ctx.strokeStyle = '#C4A035';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx - 8, cy + 16);
          ctx.quadraticCurveTo(cx - 6 + sway, cy - 2, cx - 12 + sway * 2, cy - 18);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx - 2, cy + 16);
          ctx.quadraticCurveTo(cx - 1 + sway * 0.5, cy - 4, cx - 3 + sway, cy - 22);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + 4, cy + 16);
          ctx.quadraticCurveTo(cx + 3 + sway * 0.8, cy - 2, cx + 2 + sway, cy - 20);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + 10, cy + 16);
          ctx.quadraticCurveTo(cx + 8 + sway, cy, cx + 14 + sway * 2, cy - 16);
          ctx.stroke();
          // Dicke goldene Aehren oben
          ctx.fillStyle = '#DAB94E';
          ctx.beginPath();
          ctx.ellipse(cx - 12 + sway * 2, cy - 20, 4, 7, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(cx - 3 + sway, cy - 24, 4, 7, 0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(cx + 2 + sway, cy - 22, 4, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(cx + 14 + sway * 2, cy - 18, 4, 6, 0.3, 0, Math.PI * 2);
          ctx.fill();
          // Goldener Schimmer
          ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
          ctx.beginPath();
          ctx.ellipse(cx + sway, cy - 6, 18, 20, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
    }
  }, [gameState]);

  // Gepflanzte Bäume zeichnen (wachsen über Zeit)
  const drawPlantedTrees = useCallback((ctx, camera) => {
    if (!gameState?.plantedTrees || gameState.plantedTrees.length === 0) return;

    for (const tree of gameState.plantedTrees) {
      const tx = tree.col * TILE_SIZE + camera.x;
      const ty = tree.row * TILE_SIZE + camera.y;
      const cx = tx + TILE_SIZE / 2;
      const cy = ty + TILE_SIZE;

      // Stufe berechnen: 365 Tage = Stufe 10
      const daysElapsed = (Date.now() - tree.plantedAt) / (24 * 60 * 60 * 1000);
      const stage = Math.max(1, Math.min(10, Math.floor((daysElapsed / 365) * 10) + 1));

      // Skalierung (kleiner als Hauptbaum, ~60% Größe)
      const baseScale = 0.6;
      const scale = (0.25 + (stage - 1) * (0.75 / 9)) * baseScale;

      const trunkH = 90 * scale;
      const trunkW = Math.max(4, 30 * scale);
      const crownR = Math.max(6, 66 * scale);

      // Schatten
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 2, crownR * 0.5, 3 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stamm
      ctx.fillStyle = stage <= 3 ? '#8B7355' : '#5c3a1e';
      ctx.fillRect(cx - trunkW / 2, cy - trunkH - 4, trunkW, trunkH);

      if (stage <= 2) {
        // Setzling
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.ellipse(cx, cy - trunkH - 6, crownR * 0.8, crownR * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Krone
        ctx.fillStyle = '#2d7a1e';
        ctx.beginPath();
        ctx.arc(cx, cy - trunkH - crownR * 0.6, crownR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e6016';
        ctx.beginPath();
        ctx.arc(cx - crownR * 0.2, cy - trunkH - crownR * 0.8, crownR * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stufen-Anzeige
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Stufe ${stage}`, cx, cy + 6);
    }
  }, [gameState]);

  // Wetter-Overlay (optimiert: alle Tropfen in einem einzigen Path gezeichnet
  // statt 200 einzelner stroke()-Aufrufe pro Frame)
  const drawWeather = useCallback((ctx, width, height) => {
    const state = gameStateRef.current;
    if (!state || state.weather !== 'rainy') return;

    const time = Date.now();

    // Dunkler Himmel-Overlay (zuerst, damit Tropfen darüber liegen)
    ctx.fillStyle = 'rgba(0, 10, 30, 0.2)';
    ctx.fillRect(0, 0, width, height);

    // Regentropfen - alle in einem Batch (1 stroke statt 200)
    const dropCount = 150;
    const speed = time / 30;

    ctx.strokeStyle = 'rgba(160, 190, 230, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < dropCount; i++) {
      const seed = i * 7919 + 1327;
      const xBase = (seed * 13) % width;
      const ySpeed = 4 + (seed % 3);
      const dropLen = 10 + (seed % 12);

      const x = (xBase + speed * 0.3) % (width + 40) - 20;
      const y = (speed * ySpeed + (seed * 47) % height) % (height + dropLen) - dropLen;

      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + dropLen);
    }

    ctx.stroke();

    // Splash-Effekte am Boden - ebenfalls gebatcht
    ctx.fillStyle = 'rgba(160, 190, 230, 0.15)';
    ctx.beginPath();
    for (let i = 0; i < 20; i++) {
      const seed = i * 3571 + 997;
      const sx = (seed * 29 + time / 8) % width;
      const sy = height - 20 + (seed % 40);
      const phase = (time / 200 + seed) % 1;

      if (phase < 0.3) {
        const radius = phase * 8;
        ctx.moveTo(sx + radius, sy);
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }, []);

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
    getCameraOffset, getScale, drawTile, drawPlayer, drawBuildings,
    drawGrowingTree, drawDroppedSeeds, drawWeeds, drawPlantedTrees,
    drawAnimals, drawPlacementGhost, drawWeather, drawExitMarkers,
    drawVisitor, drawHostAvatar,
  };

  // Render-Loop: Startet nur einmal und liest alles aus Refs.
  // Vorher wurde der Loop bei jedem gameState-Update (jede Sekunde) komplett
  // abgebrochen und neu gestartet → Frame-Drops und Stottern.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let lastW = 0, lastH = 0;

    const render = () => {
      const state = gameStateRef.current;
      if (!state) {
        animFrame.current = requestAnimationFrame(render);
        return;
      }

      const fns = drawFnsRef.current;
      const vm = visitModeRef.current;

      // Canvas-Größe nur setzen wenn nötig (reset löscht GPU-Buffer)
      const w = canvasSize.width;
      const h = canvasSize.height;
      if (lastW !== w || lastH !== h) {
        canvas.width = w;
        canvas.height = h;
        lastW = w;
        lastH = h;
      } else {
        ctx.clearRect(0, 0, w, h);
      }

      const camera = fns.getCameraOffset();
      const scale = fns.getScale();

      // Hintergrund
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);

      // Skalierung anwenden
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(scale, scale);

      // Kacheln zeichnen (ohne Kamera-Offset, da bereits via transform)
      const zeroCamera = { x: 0, y: 0 };
      for (let row = 0; row < MAP_ROWS; row++) {
        for (let col = 0; col < MAP_COLS; col++) {
          fns.drawTile(ctx, col, row, homeMap[row][col], zeroCamera);
        }
      }

      // Gebäude
      fns.drawBuildings(ctx, zeroCamera);

      // Wachsender Baum
      fns.drawGrowingTree(ctx, zeroCamera);

      // Abgeworfene Samen
      fns.drawDroppedSeeds(ctx, zeroCamera);

      // Unkraut
      fns.drawWeeds(ctx, zeroCamera);

      // Gepflanzte Bäume
      fns.drawPlantedTrees(ctx, zeroCamera);

      // Tiere
      fns.drawAnimals(ctx, zeroCamera);

      // Ghost-Vorschau (Platzierungsmodus)
      fns.drawPlacementGhost(ctx, zeroCamera);

      // Spieler (nur wenn nicht auf Sammelreise)
      if (!state.gathering) {
        fns.drawPlayer(ctx, zeroCamera);
      }

      // Besucher-Avatar (Host sieht Besucher)
      if (vm === 'host') {
        fns.drawVisitor(ctx, zeroCamera);
      }

      // Host-Avatar (Besucher sieht Host)
      if (vm === 'visitor') {
        fns.drawHostAvatar(ctx, zeroCamera);
      }

      // Ausgangs-Markierungen (nicht im Besucher-Modus)
      if (vm !== 'visitor') {
        fns.drawExitMarkers(ctx, zeroCamera);
      }

      ctx.restore();

      // Wetter-Overlay (nicht skaliert, läuft über ganzen Viewport)
      fns.drawWeather(ctx, w, h);

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

  // Klick-Handler
  const handleClick = useCallback((e) => {
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
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      style={{
        display: 'block',
        cursor: placementGhost ? 'crosshair' : 'pointer',
        touchAction: 'none',
      }}
    />
  );
}
