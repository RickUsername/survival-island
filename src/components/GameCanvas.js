// ============================================
// Spiel-Canvas - Rendert die Karte und den Spieler
// ============================================

import React, { useRef, useEffect, useCallback } from 'react';
import {
  TILE_SIZE, MAP_COLS, MAP_ROWS, MAP_WIDTH, MAP_HEIGHT,
  TILE_COLORS, TILE_TYPES,
} from '../utils/constants';
import homeMap, { TREE_POSITION } from '../data/homeMap';
import { ANIMAL_TYPES, ANIMAL_HUNGER_MAX } from '../systems/AnimalSystem';

export default function GameCanvas({ gameState, onMapClick, onMouseMove, placementGhost, canvasSize }) {
  const canvasRef = useRef(null);
  const animFrame = useRef(null);

  // Skalierung berechnen damit Map den Viewport ausfüllt
  const getScale = useCallback(() => {
    const scaleX = canvasSize.width / MAP_WIDTH;
    const scaleY = canvasSize.height / MAP_HEIGHT;
    return Math.max(scaleX, scaleY); // cover (Map füllt Viewport komplett)
  }, [canvasSize]);

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
    switch (tileType) {
      case TILE_TYPES.TREE:
        // Baumstamm
        ctx.fillStyle = '#5c3a1e';
        ctx.fillRect(x + 26, y + 35, 12, 29);
        // Baumkrone
        ctx.fillStyle = '#2d7a1e';
        ctx.beginPath();
        ctx.arc(x + 32, y + 25, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e6016';
        ctx.beginPath();
        ctx.arc(x + 28, y + 20, 14, 0, Math.PI * 2);
        ctx.fill();
        break;

      case TILE_TYPES.WATER:
        // Welleneffekt
        ctx.fillStyle = '#4a8de5';
        const time = Date.now() / 1000;
        for (let i = 0; i < 3; i++) {
          const waveY = y + 15 + i * 18 + Math.sin(time + col + i) * 3;
          ctx.fillRect(x + 5, waveY, TILE_SIZE - 10, 2);
        }
        break;

      case TILE_TYPES.ROCK:
        // Stein-Form
        ctx.fillStyle = '#6a6a6a';
        ctx.beginPath();
        ctx.moveTo(x + 10, y + TILE_SIZE - 10);
        ctx.lineTo(x + 20, y + 12);
        ctx.lineTo(x + 45, y + 10);
        ctx.lineTo(x + TILE_SIZE - 8, y + TILE_SIZE - 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#999';
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 12);
        ctx.lineTo(x + 32, y + 8);
        ctx.lineTo(x + 45, y + 10);
        ctx.lineTo(x + 32, y + 20);
        ctx.closePath();
        ctx.fill();
        break;

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

      case TILE_TYPES.SAND:
        // Sand-Textur
        ctx.fillStyle = '#d4c07a';
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(
            x + (i * 13 + 3) % TILE_SIZE,
            y + (i * 17 + 7) % TILE_SIZE,
            2, 2
          );
        }
        break;

      case TILE_TYPES.GRASS:
        // Gras-Details
        ctx.fillStyle = '#5a9c4f';
        ctx.fillRect(x + 10, y + 20, 2, 8);
        ctx.fillRect(x + 30, y + 40, 2, 8);
        ctx.fillRect(x + 50, y + 15, 2, 8);
        break;

      default:
        break;
    }

    // Gitterlinien (dezent)
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
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
    const size = 40 + level * 6;
    const offset = (TILE_SIZE - size) / 2;

    // Wände
    ctx.fillStyle = `hsl(30, ${30 + level * 10}%, ${40 + level * 5}%)`;
    ctx.fillRect(sx + offset, sy + offset + 10, size, size - 10);

    // Dach
    ctx.fillStyle = `hsl(15, ${40 + level * 8}%, ${30 + level * 5}%)`;
    ctx.beginPath();
    ctx.moveTo(sx + offset - 5, sy + offset + 10);
    ctx.lineTo(sx + TILE_SIZE / 2, sy + offset - 8);
    ctx.lineTo(sx + offset + size + 5, sy + offset + 10);
    ctx.closePath();
    ctx.fill();

    // Tür
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(sx + TILE_SIZE / 2 - 6, sy + offset + size - 18, 12, 18);

    // Level-Anzeige
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv.${level}`, sx + TILE_SIZE / 2, sy + offset);
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

        default:
          // Fallback: einfacher Kreis
          ctx.fillStyle = def.color;
          ctx.beginPath();
          ctx.arc(ax, ay, half, 0, Math.PI * 2);
          ctx.fill();
          break;
      }

      ctx.restore();

      // Hunger-Balken über dem Tier zeichnen
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

  // Wetter-Overlay
  const drawWeather = useCallback((ctx, width, height) => {
    if (!gameState || gameState.weather !== 'rainy') return;

    const time = Date.now();

    // Dunkler Himmel-Overlay (zuerst, damit Tropfen darüber liegen)
    ctx.fillStyle = 'rgba(0, 10, 30, 0.2)';
    ctx.fillRect(0, 0, width, height);

    // Regentropfen - viele kleine, schnelle Tropfen
    const dropCount = 200;
    const speed = time / 30; // Schnelle Bewegung

    for (let i = 0; i < dropCount; i++) {
      // Pseudo-Zufall pro Tropfen basierend auf Index
      const seed = i * 7919 + 1327;
      const xBase = (seed * 13) % width;
      const ySpeed = 4 + (seed % 3); // Verschiedene Geschwindigkeiten
      const dropLen = 10 + (seed % 12); // Verschiedene Längen

      const x = (xBase + speed * 0.3) % (width + 40) - 20;
      const y = (speed * ySpeed + (seed * 47) % height) % (height + dropLen) - dropLen;

      // Wind-Effekt: leicht schräg
      const windOffset = -3;

      // Tropfen zeichnen
      ctx.strokeStyle = `rgba(160, 190, 230, ${0.2 + (seed % 30) / 100})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + windOffset, y + dropLen);
      ctx.stroke();
    }

    // Splash-Effekte am Boden (weniger, aber sichtbar)
    ctx.fillStyle = 'rgba(160, 190, 230, 0.15)';
    for (let i = 0; i < 30; i++) {
      const seed = i * 3571 + 997;
      const sx = (seed * 29 + time / 8) % width;
      const sy = height - 20 + (seed % 40);
      const phase = (time / 200 + seed) % 1;

      if (phase < 0.3) {
        const radius = phase * 8;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [gameState]);

  // Ausgangs-Markierungen zeichnen
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

  // Render-Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const ctx = canvas.getContext('2d');

    const render = () => {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;

      const camera = getCameraOffset();
      const scale = getScale();

      // Hintergrund
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Skalierung anwenden
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(scale, scale);

      // Kacheln zeichnen (ohne Kamera-Offset, da bereits via transform)
      const zeroCamera = { x: 0, y: 0 };
      for (let row = 0; row < MAP_ROWS; row++) {
        for (let col = 0; col < MAP_COLS; col++) {
          drawTile(ctx, col, row, homeMap[row][col], zeroCamera);
        }
      }

      // Gebäude
      drawBuildings(ctx, zeroCamera);

      // Wachsender Baum
      drawGrowingTree(ctx, zeroCamera);

      // Abgeworfene Samen
      drawDroppedSeeds(ctx, zeroCamera);

      // Unkraut
      drawWeeds(ctx, zeroCamera);

      // Gepflanzte Bäume
      drawPlantedTrees(ctx, zeroCamera);

      // Tiere
      drawAnimals(ctx, zeroCamera);

      // Ghost-Vorschau (Platzierungsmodus)
      drawPlacementGhost(ctx, zeroCamera);

      // Spieler (nur wenn nicht auf Sammelreise)
      if (!gameState.gathering) {
        drawPlayer(ctx, zeroCamera);
      }

      // Ausgangs-Markierungen
      drawExitMarkers(ctx, zeroCamera);

      ctx.restore();

      // Wetter-Overlay (nicht skaliert, läuft über ganzen Viewport)
      drawWeather(ctx, canvas.width, canvas.height);

      animFrame.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrame.current) {
        cancelAnimationFrame(animFrame.current);
      }
    };
  }, [gameState, canvasSize, placementGhost, getCameraOffset, getScale, drawTile, drawPlayer, drawBuildings, drawGrowingTree, drawDroppedSeeds, drawWeeds, drawPlantedTrees, drawAnimals, drawPlacementGhost, drawWeather, drawExitMarkers]);

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
