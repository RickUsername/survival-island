// ============================================
// Angel-Minispiel
// ============================================
// Vier Zustände: auswerfen → warten → anschlagen → einholen.
// Bewusst kurz (unter 20 Sekunden), damit es sich zwischendurch spielt
// und nicht mit den langen Sammelreisen konkurriert.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import items from '../data/items';
import {
  getBestRod, biteDelay, rollCatch, FISHING_MOOD_GAIN,
} from '../systems/FishingSystem';

const TIER_IDX = { wood: 0, stone: 1, crystal: 2 };

export default function FishingDialog({ gameState, onClose, onCatch }) {
  const rod = getBestRod(gameState?.tools);
  const [phase, setPhase] = useState(rod ? 'ready' : 'norod');
  const [result, setResult] = useState(null);
  const [marker, setMarker] = useState(0);
  const [zone, setZone] = useState({ start: 0.35, size: 0.3 });

  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const biteAtRef = useRef(0);
  const dirRef = useRef(1);
  const markerRef = useRef(0);

  const clearAll = () => {
    clearTimeout(timerRef.current);
    cancelAnimationFrame(rafRef.current);
  };

  useEffect(() => clearAll, []);

  // --- Auswerfen ---
  const cast = useCallback(() => {
    if (!rod) return;
    setResult(null);
    setPhase('waiting');
    clearAll();
    timerRef.current = setTimeout(() => {
      biteAtRef.current = Date.now();
      setPhase('bite');
      // Verpasst? Nach dem Zeitfenster ist der Fisch weg
      timerRef.current = setTimeout(() => {
        setPhase('missed');
      }, rod.def.biteWindow);
    }, biteDelay());
  }, [rod]);

  // --- Anschlagen ---
  const strike = useCallback(() => {
    if (phase === 'waiting') {
      // Zu früh — der Fisch erschrickt
      clearAll();
      setPhase('early');
      return;
    }
    if (phase !== 'bite') return;

    clearAll();
    // Fangzone zufällig platzieren
    const size = rod.def.catchZone;
    setZone({ start: 0.08 + Math.random() * (0.84 - size), size });
    markerRef.current = 0;
    dirRef.current = 1;
    setPhase('reeling');

    const speed = 0.0125 - TIER_IDX[rod.def.tier] * 0.0012;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(48, now - last);
      last = now;
      markerRef.current += dirRef.current * speed * dt;
      if (markerRef.current >= 1) { markerRef.current = 1; dirRef.current = -1; }
      if (markerRef.current <= 0) { markerRef.current = 0; dirRef.current = 1; }
      setMarker(markerRef.current);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [phase, rod]);

  // --- Einholen ---
  const reel = useCallback(() => {
    if (phase !== 'reeling') return;
    clearAll();
    const m = markerRef.current;
    const hit = m >= zone.start && m <= zone.start + zone.size;

    if (!hit) {
      setPhase('lost');
      return;
    }
    const catchResult = rollCatch(TIER_IDX[rod.def.tier], items);
    setResult(catchResult);
    setPhase('caught');
    onCatch(catchResult, FISHING_MOOD_GAIN);
  }, [phase, zone, rod, onCatch]);

  // Leertaste als Alternative zum Tippen
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      e.preventDefault();
      if (phase === 'ready' || phase === 'missed' || phase === 'early' || phase === 'lost' || phase === 'caught') cast();
      else if (phase === 'waiting' || phase === 'bite') strike();
      else if (phase === 'reeling') reel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, cast, strike, reel]);

  const mainAction = () => {
    if (phase === 'ready' || phase === 'missed' || phase === 'early' || phase === 'lost' || phase === 'caught') cast();
    else if (phase === 'waiting' || phase === 'bite') strike();
    else if (phase === 'reeling') reel();
  };

  const TEXT = {
    norod: { title: 'Keine Angel dabei', hint: 'Im Handwerk lässt sich eine Angel bauen.', btn: 'Schließen' },
    ready: { title: 'Bereit zum Auswerfen', hint: 'Wirf aus und warte auf den Biss.', btn: '🎣 Auswerfen' },
    waiting: { title: 'Die Schnur liegt…', hint: 'Ruhig bleiben. Erst anschlagen, wenn es zuckt.', btn: 'Anschlagen' },
    bite: { title: '❗ Ein Biss!', hint: 'Jetzt! Sofort anschlagen!', btn: '⚡ Anschlagen' },
    reeling: { title: 'Einholen', hint: 'Stoppe den Zeiger im grünen Bereich.', btn: '🎯 Stoppen' },
    caught: { title: '🐟 Gefangen!', hint: '', btn: 'Nochmal auswerfen' },
    missed: { title: 'Zu spät…', hint: 'Der Fisch ist wieder weg.', btn: 'Nochmal auswerfen' },
    early: { title: 'Zu früh angeschlagen', hint: 'Der Fisch ist erschrocken.', btn: 'Nochmal auswerfen' },
    lost: { title: 'Abgerissen', hint: 'Daneben — der Fisch entwischt.', btn: 'Nochmal auswerfen' },
  };
  const txt = TEXT[phase];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>🎣 Angeln</h3>
          {rod && <span style={styles.rod}>{rod.def.label}</span>}
        </div>

        {/* Teichfenster */}
        <div style={{
          ...styles.pond,
          background: phase === 'bite'
            ? 'linear-gradient(180deg,#3f86a8 0%,#1e5578 100%)'
            : 'linear-gradient(180deg,#54a0bd 0%,#26618a 100%)',
        }}>
          <div style={{
            ...styles.bobber,
            transform: `translate(-50%,${phase === 'bite' ? 10 : 0}px) scale(${phase === 'bite' ? 0.85 : 1})`,
          }}>🔴</div>
          {phase === 'bite' && <div style={styles.ripple} />}
          {phase === 'waiting' && <div style={styles.calm}>· · ·</div>}
        </div>

        <div style={styles.phaseTitle}>{txt.title}</div>
        <div style={styles.hint}>{txt.hint}</div>

        {phase === 'reeling' && (
          <div style={styles.barOuter}>
            <div style={{
              ...styles.barZone,
              left: `${zone.start * 100}%`,
              width: `${zone.size * 100}%`,
            }} />
            <div style={{ ...styles.barMarker, left: `${marker * 100}%` }} />
          </div>
        )}

        {phase === 'caught' && result && (
          <div style={styles.result}>
            <span style={styles.resultIcon}>
              {result.itemId === 'fish' ? '🐟' : result.itemId === 'pearl' ? '🦪' : '📦'}
            </span>
            <span>{result.amount}× {result.name}</span>
          </div>
        )}

        <div style={styles.row}>
          {phase !== 'norod' && (
            <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={mainAction}>
              {txt.btn}
            </button>
          )}
          <button style={styles.btn} onClick={onClose}>
            {phase === 'norod' ? txt.btn : 'Aufhören'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: '16px',
  },
  dialog: {
    background: '#1d2430', borderRadius: '16px', padding: '18px',
    width: 'min(440px, 94vw)', border: '2px solid rgba(255,255,255,0.12)',
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#fff', margin: 0, fontSize: '18px' },
  rod: { color: '#8fc6e8', fontSize: '13px' },
  pond: {
    position: 'relative', height: '132px', borderRadius: '12px',
    overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)',
  },
  bobber: {
    position: 'absolute', left: '50%', top: '46%',
    fontSize: '20px', transition: 'transform 0.14s ease-out',
  },
  ripple: {
    position: 'absolute', left: '50%', top: '54%',
    width: '70px', height: '22px', marginLeft: '-35px',
    border: '2px solid rgba(255,255,255,0.5)', borderRadius: '50%',
    animation: 'pulse 0.5s infinite',
  },
  calm: {
    position: 'absolute', left: '50%', top: '62%', transform: 'translateX(-50%)',
    color: 'rgba(255,255,255,0.45)', letterSpacing: '4px', fontSize: '20px',
  },
  phaseTitle: { color: '#fff', fontWeight: 'bold', fontSize: '16px', textAlign: 'center' },
  hint: { color: '#9fb0c2', fontSize: '13px', textAlign: 'center', minHeight: '18px' },
  barOuter: {
    position: 'relative', height: '26px', borderRadius: '13px',
    background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  barZone: {
    position: 'absolute', top: 0, bottom: 0,
    background: 'linear-gradient(180deg,#4fd48a,#2e9c62)',
  },
  barMarker: {
    position: 'absolute', top: '-2px', bottom: '-2px', width: '4px',
    marginLeft: '-2px', background: '#fff', borderRadius: '2px',
    boxShadow: '0 0 6px rgba(255,255,255,0.9)',
  },
  result: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    color: '#ffe08a', fontWeight: 'bold', fontSize: '16px',
    background: 'rgba(255,224,138,0.1)', padding: '10px', borderRadius: '10px',
  },
  resultIcon: { fontSize: '26px' },
  row: { display: 'flex', gap: '8px' },
  btn: {
    flex: 1, padding: '13px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.1)',
    color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
  },
  btnPrimary: { background: '#2e6f9c', borderColor: '#4a97c8' },
};
