// ============================================
// Hütten-Innenraum — betreten und einrichten
// ============================================
// Ab Ausbaustufe 2 hat die Hütte ein Inneres. Der Raum wird mit derselben
// Engine gerendert wie die Insel: gebackene Sprites, echtes Tageslicht durch
// die Fenster, Lichtquellen und Licht-Komposition darüber.
//
// Möbel werden hier direkt aus Rohstoffen gebaut. Sie zahlen auf die
// Gemütlichkeit ein — und die bremst den Stimmungsverlust.

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { getAtmosphere, applyWeather } from '../render/atmosphere';
import { applyLighting } from '../render/lighting';
import { drawStars } from '../render/particles';
import { hash2 } from '../render/noise';
import { rgb, mix } from '../render/color';
import {
  CELL, getRoomShell, getRoomTrim, getFurnitureSprite, getFurnitureThumb,
} from '../render/interiorSprites';
import {
  getRoom, availableFurniture, furnitureById, canPlace, furnitureAt,
  canAffordFurniture, missingFor, costLabel, cozyScore, cozyLabel,
  cozyMoodFactor, interiorLights,
} from '../systems/InteriorSystem';

export default function HutInterior({
  gameState, onClose, onPlace, onRemove, onDemolish,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const viewRef = useRef({ scale: 1, offX: 0, offY: 0 });
  const hoverRef = useRef(null);
  const selectedRef = useRef(null);
  const modeRef = useRef('view');

  const [mode, setMode] = useState('view');
  const [selected, setSelected] = useState(null);
  const [size, setSize] = useState({ width: 800, height: 520 });
  const [note, setNote] = useState(null);

  const level = gameState?.buildings?.shelterLevel || 0;
  const room = getRoom(level);
  const inventory = gameState?.inventory || {};

  const score = cozyScore(gameState);
  const factor = cozyMoodFactor(score);
  const catalog = useMemo(() => availableFurniture(level), [level]);

  // Vorschaubilder einmal als Data-URL — die Karten sind reines JSX
  const thumbs = useMemo(() => {
    const out = {};
    for (const def of catalog) {
      const cv = getFurnitureThumb(def.id, 72);
      if (cv) out[def.id] = cv.toDataURL();
    }
    return out;
  }, [catalog]);

  // Der Spielstand ändert sich jeden Frame (Bedürfnisse laufen weiter).
  // Die Renderschleife liest ihn deshalb aus einem Ref statt aus den
  // Abhängigkeiten — sonst würde sie ständig neu aufgebaut.
  const stateRef = useRef(gameState);
  useEffect(() => { stateRef.current = gameState; });
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  // Kurze Hinweise blenden sich von selbst wieder aus
  useEffect(() => {
    if (!note) return undefined;
    const id = setTimeout(() => setNote(null), 2600);
    return () => clearTimeout(id);
  }, [note]);

  // --- Größe der Zeichenfläche ---
  useEffect(() => {
    const measure = () => {
      const el = wrapRef.current;
      if (!el) return;
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [mode]);

  // Escape schließt, B schaltet den Einrichtungsmodus um
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (selectedRef.current) setSelected(null);
        else onClose();
      } else if (e.key === 'b' || e.key === 'B') {
        setMode(m => (m === 'build' ? 'view' : 'build'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // --- Renderschleife ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = getRoomShell(level);
    if (!canvas || !shell) return undefined;

    const ctx = canvas.getContext('2d');
    const trim = getRoomTrim(level);
    let raf = 0;
    let lastW = 0, lastH = 0, lastDpr = 0;

    const render = () => {
      raf = requestAnimationFrame(render);
      const t = Date.now() / 1000;
      const w = size.width;
      const h = size.height;
      if (w < 10 || h < 10) return;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (lastW !== w || lastH !== h || lastDpr !== dpr) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        lastW = w; lastH = h; lastDpr = dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const gs = stateRef.current;
      const live = gs?.interior?.furniture || [];
      const inv = gs?.inventory || {};
      const atmo = applyWeather(
        getAtmosphere(new Date(), gs?.timeOverride ?? null),
        gs?.weather
      );

      // Raum mittig einpassen — mit etwas Luft am Rand, damit er im Bild
      // steht statt es auszufüllen. Nie über 1.25 vergrößern, sonst wird
      // die Textur weich.
      const scale = Math.min((w - 36) / shell.w, (h - 28) / shell.h, 1.25);
      const offX = (w - shell.w * scale) / 2;
      const offY = (h - shell.h * scale) / 2;
      viewRef.current = { scale, offX, offY };

      // Hintergrund hinter dem Raum: dunkles Holz, damit der Raum „steht"
      ctx.fillStyle = '#120d0a';
      ctx.fillRect(0, 0, w, h);
      const bgGlow = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7);
      bgGlow.addColorStop(0, 'rgba(72,52,34,0.55)');
      bgGlow.addColorStop(1, 'rgba(10,7,5,0)');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(offX, offY);
      ctx.scale(scale, scale);

      // --- 1. Himmel hinter den Fenstern ---
      for (const win of shell.windows) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(win.x, win.y, win.w, win.h, 8);
        ctx.clip();

        const sky = atmo.sky;
        const g = ctx.createLinearGradient(0, win.y, 0, win.y + win.h);
        g.addColorStop(0, rgb(sky));
        g.addColorStop(1, rgb(mix(sky, [120, 150, 96], 0.55)));
        ctx.fillStyle = g;
        ctx.fillRect(win.x, win.y, win.w, win.h);

        if (atmo.starAlpha > 0.02) {
          ctx.save();
          ctx.translate(win.x, win.y);
          drawStars(ctx, t, win.w, win.h, atmo.starAlpha);
          ctx.restore();
        }

        // Baumwipfel und Horizont draußen
        ctx.fillStyle = rgb(mix([46, 74, 42], atmo.ambient, 0.42));
        ctx.beginPath();
        ctx.moveTo(win.x, win.y + win.h);
        for (let x = 0; x <= win.w; x += 6) {
          const n = Math.sin(x * 0.09 + level) * 4 + Math.sin(x * 0.23) * 2.5;
          ctx.lineTo(win.x + x, win.y + win.h * 0.62 + n);
        }
        ctx.lineTo(win.x + win.w, win.y + win.h);
        ctx.closePath();
        ctx.fill();

        // Regen am Fenster
        if (atmo.wet) {
          ctx.strokeStyle = 'rgba(206,226,244,0.5)';
          ctx.lineWidth = 1.2;
          for (let i = 0; i < 26; i++) {
            const sx = win.x + hash2(i, 1, 12) * win.w;
            const sy = win.y + ((hash2(i, 2, 12) * win.h + t * (46 + i * 3)) % win.h);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + 1.5, sy + 9);
            ctx.stroke();
          }
          // Tropfen, die auf der Scheibe stehen
          for (let i = 0; i < 14; i++) {
            const dx = win.x + hash2(i, 5, 44) * win.w;
            const dy = win.y + hash2(i, 6, 44) * win.h;
            ctx.fillStyle = 'rgba(220,238,255,0.28)';
            ctx.beginPath();
            ctx.arc(dx, dy, 1.4 + hash2(i, 7, 44) * 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (atmo.snow) {
          for (let i = 0; i < 22; i++) {
            const sx = win.x + ((hash2(i, 1, 88) * win.w + Math.sin(t + i) * 8) % win.w);
            const sy = win.y + ((hash2(i, 2, 88) * win.h + t * 14) % win.h);
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // --- 2. Raumhülle + Fensterrahmen ---
      ctx.drawImage(shell.canvas, 0, 0);
      if (trim) ctx.drawImage(trim.canvas, 0, 0);

      // --- 3. Lichtbahnen durch die Fenster auf den Boden ---
      const dayLight = Math.max(0, 1 - atmo.darkness * 1.25) * (atmo.fog ? 0.55 : 1);
      if (dayLight > 0.04) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const warm = atmo.goldenness || 0;
        for (const win of shell.windows) {
          const cx = win.x + win.w / 2;
          const top = shell.floorY;
          const spread = win.w * 1.5;
          const reach = Math.min(room.rows * CELL * 0.85, 240);
          const g = ctx.createLinearGradient(0, top, 0, top + reach);
          const c = mix([255, 248, 224], [255, 196, 128], warm);
          g.addColorStop(0, rgb(c, 0.3 * dayLight));
          g.addColorStop(1, rgb(c, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(cx - win.w * 0.5, top);
          ctx.lineTo(cx + win.w * 0.5, top);
          ctx.lineTo(cx + spread * 0.5, top + reach);
          ctx.lineTo(cx - spread * 0.5, top + reach);
          ctx.closePath();
          ctx.fill();

          // Staub, der im Lichtstrahl tanzt
          for (let i = 0; i < 16; i++) {
            const p = (hash2(i, 3, 27) + t * 0.045 * (0.5 + hash2(i, 4, 27))) % 1;
            const y = top + p * reach;
            const wide = win.w * 0.5 + (spread - win.w) * 0.5 * p;
            const x = cx + (hash2(i, 5, 27) - 0.5) * 2 * wide
              + Math.sin(t * 0.7 + i * 2) * 5;
            const a = (1 - p) * 0.5 * dayLight;
            ctx.fillStyle = `rgba(255,246,220,${a})`;
            ctx.beginPath();
            ctx.arc(x, y, 1 + hash2(i, 6, 27) * 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // --- 3b. Einrichtungsmodus: Raster UNTER die Möbel legen ---
      if (modeRef.current === 'build') {
        ctx.save();
        ctx.fillStyle = 'rgba(20,14,8,0.18)';
        ctx.fillRect(0, shell.floorY, room.cols * CELL, room.rows * CELL);
        ctx.strokeStyle = 'rgba(255,244,214,0.3)';
        ctx.lineWidth = 1;
        for (let c = 0; c <= room.cols; c++) {
          ctx.beginPath();
          ctx.moveTo(c * CELL, shell.floorY);
          ctx.lineTo(c * CELL, shell.floorY + room.rows * CELL);
          ctx.stroke();
        }
        for (let r = 0; r <= room.rows; r++) {
          ctx.beginPath();
          ctx.moveTo(0, shell.floorY + r * CELL);
          ctx.lineTo(room.cols * CELL, shell.floorY + r * CELL);
          ctx.stroke();
        }
        ctx.restore();
      }

      // --- 4. Möbel: erst Teppiche, dann Objekte nach Tiefe sortiert ---
      const draw = (p) => {
        const sprite = getFurnitureSprite(p.id);
        if (!sprite) return;
        const x = p.col * CELL;
        const y = shell.floorY + (p.row + sprite.def.h) * CELL - sprite.h;
        ctx.drawImage(sprite.canvas, x, y);
      };

      const rugs = [];
      const objects = [];
      for (const p of live) {
        const def = furnitureById(p.id);
        if (!def) continue;
        (def.layer === 'floor' ? rugs : objects).push(p);
      }
      rugs.forEach(draw);
      objects
        .slice()
        .sort((a, b) => {
          const da = a.row + (furnitureById(a.id)?.h || 1);
          const db = b.row + (furnitureById(b.id)?.h || 1);
          return da - db || a.col - b.col;
        })
        .forEach(draw);

      // --- 5. Flackern der Feuerquellen (die Sprites selbst sind gebacken) ---
      const lights = [];
      for (const L of interiorLights(live)) {
        const def = L.def;
        const cx = (L.col + def.w / 2) * CELL;
        const cy = shell.floorY + (L.row + def.h) * CELL - (def.id === 'hearth' ? 46 : 28);
        const flick = def.id === 'lamp'
          ? 0.94 + Math.sin(t * 1.3) * 0.06
          : 0.82 + Math.sin(t * 9.1 + cx) * 0.09 + Math.sin(t * 3.7 + cy) * 0.09;

        // Offenes Feuer wirft spürbar mehr Schein als eine Lampe
        const bloom = def.id === 'hearth' ? 0.5 : 0.3;
        const rad = def.light.radius * (def.id === 'hearth' ? 0.72 : 0.55) * flick;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
        g.addColorStop(0, rgb(def.light.color, bloom * flick));
        g.addColorStop(1, rgb(def.light.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        lights.push({
          x: offX + cx * scale,
          y: offY + cy * scale,
          radius: def.light.radius * scale * flick,
          color: def.light.color,
          intensity: def.light.intensity * flick,
        });
      }

      // --- 6. Einrichtungsmodus: Vorschau und Auswahlrahmen ---
      if (modeRef.current === 'build') {
        ctx.save();
        const sel = selectedRef.current;
        const hov = hoverRef.current;
        if (sel && hov) {
          const def = furnitureById(sel);
          const col = Math.max(0, Math.min(hov.col, room.cols - def.w));
          const row = Math.max(0, Math.min(hov.row, room.rows - def.h));
          const ok = canPlace(live, def, col, row, room)
            && canAffordFurniture(def, inv);

          const sprite = getFurnitureSprite(sel);
          if (sprite) {
            ctx.globalAlpha = 0.62;
            ctx.drawImage(
              sprite.canvas,
              col * CELL,
              shell.floorY + (row + def.h) * CELL - sprite.h
            );
            ctx.globalAlpha = 1;
          }
          ctx.fillStyle = ok ? 'rgba(126,214,150,0.24)' : 'rgba(226,120,110,0.3)';
          ctx.strokeStyle = ok ? 'rgba(150,236,176,0.9)' : 'rgba(246,150,140,0.9)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(
            col * CELL + 2, shell.floorY + row * CELL + 2,
            def.w * CELL - 4, def.h * CELL - 4, 6
          );
          ctx.fill();
          ctx.stroke();
        } else if (hov) {
          const idx = furnitureAt(live, hov.col, hov.row);
          if (idx >= 0) {
            const p = live[idx];
            const def = furnitureById(p.id);
            ctx.strokeStyle = 'rgba(255,196,150,0.95)';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([7, 5]);
            ctx.beginPath();
            ctx.roundRect(
              p.col * CELL + 2, shell.floorY + p.row * CELL + 2,
              def.w * CELL - 4, def.h * CELL - 4, 6
            );
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        ctx.restore();
      }

      ctx.restore();

      // --- 7. Licht-Komposition über alles ---
      applyLighting(ctx, w, h, atmo, lights);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [size, level, room]);

  // --- Zeiger → Rasterzelle ---
  const cellFromEvent = useCallback((e) => {
    const canvas = canvasRef.current;
    const shell = getRoomShell(level);
    if (!canvas || !shell) return null;
    const rect = canvas.getBoundingClientRect();
    const { scale, offX, offY } = viewRef.current;
    const rx = (e.clientX - rect.left - offX) / scale;
    const ry = (e.clientY - rect.top - offY - shell.floorY) / scale;
    const col = Math.floor(rx / CELL);
    const row = Math.floor(ry / CELL);
    if (col < 0 || row < 0 || col >= room.cols || row >= room.rows) return null;
    return { col, row };
  }, [level, room]);

  const handleMove = useCallback((e) => {
    hoverRef.current = cellFromEvent(e);
  }, [cellFromEvent]);

  const handleLeave = useCallback(() => { hoverRef.current = null; }, []);

  const handleClick = useCallback((e) => {
    if (mode !== 'build') return;
    const cell = cellFromEvent(e);
    hoverRef.current = cell;
    if (!cell) return;

    // Immer gegen den aktuellen Spielstand prüfen, nicht gegen den
    // Render-Snapshot — der Loop schreibt jede Sekunde weiter.
    const gs = stateRef.current;
    const live = gs?.interior?.furniture || [];
    const inv = gs?.inventory || {};

    if (selected) {
      const def = furnitureById(selected);
      const col = Math.max(0, Math.min(cell.col, room.cols - def.w));
      const row = Math.max(0, Math.min(cell.row, room.rows - def.h));
      if (!canAffordFurniture(def, inv)) {
        const miss = missingFor(def, inv);
        setNote(`Es fehlt: ${miss.map(m => `${m.need - m.have}× ${m.name}`).join(', ')}`);
        return;
      }
      if (!canPlace(live, def, col, row, room)) {
        setNote('Hier ist kein Platz.');
        return;
      }
      onPlace(def.id, col, row);

      // Reicht das Material für ein weiteres Stück? Sonst Auswahl aufheben,
      // damit der nächste Tipp nicht ins Leere läuft.
      const rest = { ...inv };
      for (const [id, amount] of Object.entries(def.cost)) {
        rest[id] = { ...(inv[id] || {}), amount: (inv[id]?.amount || 0) - amount };
      }
      if (!canAffordFurniture(def, rest)) setSelected(null);
      return;
    }

    const idx = furnitureAt(live, cell.col, cell.row);
    if (idx >= 0) {
      onRemove(idx);
      setNote('Abgebaut — das Material ist zurück im Inventar.');
    }
  }, [mode, selected, cellFromEvent, room, onPlace, onRemove]);

  if (!room) return null;

  const slower = Math.round((1 - factor) * 100);

  return (
    <div style={styles.overlay}>
      <div style={styles.header}>
        <div style={styles.headLeft}>
          <h2 style={styles.title}>{room.name}</h2>
          <span style={styles.sub}>{room.cols} × {room.rows} Felder · Stufe {level}</span>
        </div>

        <div style={styles.cozyBox}>
          <div style={styles.cozyTop}>
            <span style={styles.cozyLabel}>{cozyLabel(score)}</span>
            <span style={styles.cozyVal}>{score} %</span>
          </div>
          <div style={styles.meter}>
            <div style={{
              ...styles.meterFill,
              width: `${score}%`,
              background: score >= 75
                ? 'linear-gradient(90deg,#e8b45c,#ffd98a)'
                : 'linear-gradient(90deg,#7a6a4a,#c9a86a)',
            }} />
          </div>
          <span style={styles.cozyHint}>
            {slower > 0
              ? `Stimmung sinkt ${slower} % langsamer`
              : 'Noch keine Wirkung — stell etwas hinein'}
          </span>
        </div>

        <button style={styles.closeBtn} onClick={onClose}>Verlassen</button>
      </div>

      <div ref={wrapRef} style={styles.stage}>
        <canvas
          ref={canvasRef}
          style={{ ...styles.canvas, cursor: mode === 'build' ? 'pointer' : 'default' }}
          onPointerMove={handleMove}
          onPointerLeave={handleLeave}
          onClick={handleClick}
        />
        {note && <div style={styles.note}>{note}</div>}
      </div>

      <div style={styles.bar}>
        <button
          style={{ ...styles.modeBtn, ...(mode === 'build' ? styles.modeBtnOn : {}) }}
          onClick={() => { setMode(m => (m === 'build' ? 'view' : 'build')); setSelected(null); }}
        >
          {mode === 'build' ? '✓ Fertig eingerichtet' : '🪑 Einrichten'}
        </button>
        <span style={styles.barHint}>
          {mode === 'build'
            ? (selected
              ? 'Tippe auf ein Feld, um es hinzustellen.'
              : 'Wähle ein Möbelstück — oder tippe auf ein vorhandenes, um es abzubauen.')
            : 'Ein gemütliches Zuhause hebt die Stimmung.'}
        </span>
        <button style={styles.demolishBtn} onClick={onDemolish}>Hütte abreißen</button>
      </div>

      {mode === 'build' && (
        <div style={styles.palette}>
          {catalog.map(def => {
            const affordable = canAffordFurniture(def, inventory);
            const isSel = selected === def.id;
            return (
              <button
                key={def.id}
                style={{
                  ...styles.card,
                  ...(isSel ? styles.cardOn : {}),
                  ...(affordable ? {} : styles.cardOff),
                }}
                onClick={() => setSelected(isSel ? null : def.id)}
                title={def.hint}
              >
                <img src={thumbs[def.id]} alt="" style={styles.thumb} />
                <span style={styles.cardName}>{def.name}</span>
                <span style={styles.cardCozy}>+{def.cozy} Gemütlichkeit</span>
                <span style={{
                  ...styles.cardCost,
                  color: affordable ? '#9fb89a' : '#d08a84',
                }}>
                  {costLabel(def)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 260,
    background: 'linear-gradient(180deg,#1a1310 0%,#0d0908 100%)',
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: 'max(12px, env(safe-area-inset-top)) 16px 12px',
    borderBottom: '1px solid rgba(255,220,170,0.14)',
    flexWrap: 'wrap',
  },
  headLeft: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  title: { margin: 0, color: '#f3e4c8', fontSize: '19px', whiteSpace: 'nowrap' },
  sub: { color: '#9c8a6a', fontSize: '12px' },
  cozyBox: {
    flex: '1 1 190px', minWidth: '170px', maxWidth: '320px',
    display: 'flex', flexDirection: 'column', gap: '3px',
  },
  cozyTop: { display: 'flex', justifyContent: 'space-between', fontSize: '12px' },
  cozyLabel: { color: '#e8c98d', fontWeight: 'bold' },
  cozyVal: { color: '#b8a382' },
  meter: {
    height: '8px', borderRadius: '4px', overflow: 'hidden',
    background: 'rgba(255,240,210,0.1)',
  },
  meterFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' },
  cozyHint: { color: '#8c7c64', fontSize: '11px' },
  closeBtn: {
    padding: '10px 16px', borderRadius: '10px',
    border: '1px solid rgba(255,220,170,0.25)',
    background: 'rgba(255,220,170,0.1)', color: '#f0e0c4',
    fontWeight: 'bold', fontSize: '14px', cursor: 'pointer',
  },
  stage: { flex: 1, minHeight: 0, position: 'relative' },
  canvas: { display: 'block', width: '100%', height: '100%', touchAction: 'manipulation' },
  note: {
    position: 'absolute', left: '50%', bottom: '14px', transform: 'translateX(-50%)',
    background: 'rgba(24,16,10,0.9)', color: '#f0dfbe',
    border: '1px solid rgba(255,214,160,0.3)',
    padding: '9px 15px', borderRadius: '10px', fontSize: '13px',
    whiteSpace: 'nowrap', maxWidth: '92vw', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  bar: {
    display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
    padding: '10px 16px',
    borderTop: '1px solid rgba(255,220,170,0.14)',
    background: 'rgba(0,0,0,0.25)',
  },
  modeBtn: {
    padding: '11px 16px', borderRadius: '10px',
    border: '1px solid rgba(255,220,170,0.25)',
    background: 'rgba(255,220,170,0.08)', color: '#f0e0c4',
    fontWeight: 'bold', fontSize: '14px', cursor: 'pointer',
  },
  // Immer die Kurzform `border` setzen, nie nur borderColor daneben —
  // React warnt sonst beim Umschalten über gemischte Shorthand-Properties.
  modeBtnOn: {
    background: '#8a6a3a', border: '1px solid #c8a464', color: '#fff8e8',
  },
  barHint: { flex: 1, color: '#96876e', fontSize: '12.5px', minWidth: '140px' },
  demolishBtn: {
    padding: '9px 13px', borderRadius: '9px',
    border: '1px solid rgba(220,130,120,0.3)',
    background: 'transparent', color: '#c98a82',
    fontSize: '12.5px', cursor: 'pointer',
  },
  palette: {
    display: 'flex', gap: '10px', overflowX: 'auto',
    padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
    background: 'rgba(0,0,0,0.35)',
    borderTop: '1px solid rgba(255,220,170,0.1)',
  },
  card: {
    flex: '0 0 auto', width: '118px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
    padding: '9px 7px', borderRadius: '12px',
    border: '1px solid rgba(255,220,170,0.16)',
    background: 'rgba(255,235,200,0.05)',
    color: '#e8d9bd', cursor: 'pointer', textAlign: 'center',
  },
  cardOn: {
    border: '1px solid #e0b268', background: 'rgba(224,178,104,0.18)',
    boxShadow: '0 0 0 2px rgba(224,178,104,0.3)',
  },
  cardOff: { opacity: 0.45 },
  thumb: { display: 'block', width: '72px', height: '72px' },
  cardName: { fontSize: '12.5px', fontWeight: 'bold' },
  cardCozy: { fontSize: '10.5px', color: '#e0b268' },
  cardCost: { fontSize: '10px', lineHeight: 1.25 },
};
