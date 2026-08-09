// ============================================
// Postkarten-Modus
// ============================================
// Nimmt den aktuellen Blick auf die Insel auf, setzt ihn in einen Rahmen
// mit Datum, Überlebenstagen und Wetter — fertig zum Speichern oder Teilen.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WEATHER_TYPES } from '../utils/constants';
import { getSeasonName } from '../systems/WeatherSystem';
import { getAtmosphere } from '../render/atmosphere';

const WEATHER_LABEL = {
  [WEATHER_TYPES.SUNNY]: '☀️ Sonne',
  [WEATHER_TYPES.RAINY]: '🌧️ Regen',
  [WEATHER_TYPES.STORM]: '⛈️ Gewitter',
  [WEATHER_TYPES.FOG]: '🌫️ Nebel',
  [WEATHER_TYPES.HEAT]: '🥵 Hitze',
  [WEATHER_TYPES.SNOW]: '❄️ Schnee',
};

const CARD_W = 900;
const CARD_H = 640;

export default function PostcardDialog({ gameState, onClose, onSave }) {
  const canvasRef = useRef(null);
  const [caption, setCaption] = useState('');
  const [saved, setSaved] = useState(false);

  const daysAlive = Math.max(
    0,
    Math.floor((Date.now() - (gameState?.stats?.startedAt || Date.now())) / 86400000)
  );

  /** Baut die Karte aus dem aktuellen Spiel-Canvas */
  const compose = useCallback(() => {
    const target = canvasRef.current;
    const source = document.querySelector('canvas[data-island="true"]');
    if (!target || !source) return;

    const ctx = target.getContext('2d');
    target.width = CARD_W;
    target.height = CARD_H;

    const pad = 26;
    const photoW = CARD_W - pad * 2;
    const photoH = CARD_H - pad * 2 - 78;

    // Kartenkarton
    const paper = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    paper.addColorStop(0, '#faf5e8');
    paper.addColorStop(1, '#efe5d0');
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // Papierkorn
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(140,120,90,${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * CARD_W, Math.random() * CARD_H, 1.4, 1.4);
    }

    // Bildausschnitt seitenrichtig einpassen (cover)
    const sAsp = source.width / source.height;
    const dAsp = photoW / photoH;
    let sw = source.width, sh = source.height, sx = 0, sy = 0;
    if (sAsp > dAsp) {
      sw = source.height * dAsp;
      sx = (source.width - sw) / 2;
    } else {
      sh = source.width / dAsp;
      sy = (source.height - sh) / 2;
    }

    ctx.save();
    ctx.shadowColor = 'rgba(60,44,20,0.35)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#fff';
    ctx.fillRect(pad, pad, photoW, photoH);
    ctx.restore();
    ctx.drawImage(source, sx, sy, sw, sh, pad + 5, pad + 5, photoW - 10, photoH - 10);

    // Innenrahmen
    ctx.strokeStyle = 'rgba(90,72,44,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pad + 5, pad + 5, photoW - 10, photoH - 10);

    // Beschriftung
    const baseY = pad + photoH + 34;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4a3a22';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText(caption.trim() || 'Grüße von der Insel', pad + 6, baseY);

    ctx.font = '16px Georgia, serif';
    ctx.fillStyle = '#7a6647';
    const atmo = getAtmosphere(new Date(), gameState?.timeOverride ?? null);
    const date = new Date().toLocaleDateString('de-DE', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const line = `${date} · Tag ${daysAlive} · ${atmo.label} · ${WEATHER_LABEL[gameState?.weather] || ''} · ${getSeasonName(new Date())}`;
    ctx.fillText(line, pad + 6, baseY + 26);

    // Briefmarke
    const stampX = CARD_W - pad - 96;
    const stampY = pad + photoH + 4;
    ctx.fillStyle = '#e8dcc0';
    ctx.fillRect(stampX, stampY, 88, 58);
    ctx.strokeStyle = '#b9a77f';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 2;
    ctx.strokeRect(stampX, stampY, 88, 58);
    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    ctx.font = '26px Georgia, serif';
    ctx.fillText('🏝️', stampX + 44, stampY + 34);
    ctx.font = 'bold 10px Georgia, serif';
    ctx.fillStyle = '#8a7550';
    ctx.fillText('SURVIVAL ISLAND', stampX + 44, stampY + 50);
  }, [caption, daysAlive, gameState]);

  useEffect(() => {
    // Kurz warten, damit das Spiel-Canvas sicher einen Frame gezeichnet hat
    const id = setTimeout(compose, 60);
    return () => clearTimeout(id);
  }, [compose]);

  const download = () => {
    const target = canvasRef.current;
    if (!target) return;
    const link = document.createElement('a');
    link.download = `survival-island-tag-${daysAlive}.png`;
    link.href = target.toDataURL('image/png');
    link.click();
  };

  const keep = () => {
    const target = canvasRef.current;
    if (!target || !onSave) return;
    // Verkleinert ablegen: die Galerie liegt im Spielstand, der bleibt klein
    const thumb = document.createElement('canvas');
    thumb.width = 420;
    thumb.height = Math.round(420 * CARD_H / CARD_W);
    thumb.getContext('2d').drawImage(target, 0, 0, thumb.width, thumb.height);
    onSave({
      id: `pc_${Date.now()}`,
      dataUrl: thumb.toDataURL('image/jpeg', 0.72),
      caption: caption.trim() || 'Grüße von der Insel',
      createdAt: Date.now(),
      day: daysAlive,
    });
    setSaved(true);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>📮 Postkarte</h3>

        <canvas ref={canvasRef} style={styles.preview} />

        <input
          style={styles.input}
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 40))}
          placeholder="Gruß auf die Karte schreiben…"
          maxLength={40}
        />

        <div style={styles.row}>
          <button style={styles.btn} onClick={download}>⬇️ Speichern</button>
          <button
            style={{ ...styles.btn, ...(saved ? styles.btnDone : styles.btnPrimary) }}
            onClick={keep}
            disabled={saved}
          >
            {saved ? '✓ In der Galerie' : '🖼️ Aufbewahren'}
          </button>
          <button style={styles.btn} onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: '16px',
  },
  dialog: {
    backgroundColor: '#1d2430', borderRadius: '16px', padding: '18px',
    maxWidth: '96vw', maxHeight: '92dvh', overflowY: 'auto',
    border: '2px solid rgba(255,255,255,0.12)',
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  title: { color: '#fff', margin: 0, fontSize: '18px' },
  preview: {
    width: '100%', maxWidth: '620px', height: 'auto',
    borderRadius: '8px', display: 'block',
  },
  input: {
    padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '15px',
  },
  row: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  btn: {
    flex: '1 1 auto', padding: '12px 14px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.1)',
    color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
  },
  btnPrimary: { background: '#2e7d5b', borderColor: '#3ba876' },
  btnDone: { background: 'rgba(255,255,255,0.06)', color: '#8fd6b0', cursor: 'default' },
};
