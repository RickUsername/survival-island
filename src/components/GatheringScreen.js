// ============================================
// Sammelreisen-Bildschirm
// ============================================

import React, { useState, useEffect } from 'react';
import {
  getElapsedGatheringTime,
  formatGatheringTime,
  isGatheringComplete,
} from '../systems/GatheringSystem';
import { BIOMES, MAX_GATHERING_DURATION } from '../utils/constants';
import NeedsBar from './NeedsBar';

export default function GatheringScreen({
  gathering,
  needs,
  onPause,
  onResume,
  onCancel,
  onAutoReturn,
}) {
  const [elapsed, setElapsed] = useState(0);

  // Timer aktualisieren
  useEffect(() => {
    const interval = setInterval(() => {
      if (gathering) {
        const time = getElapsedGatheringTime(gathering);
        setElapsed(time);

        // Auto-Rückkehr bei maximaler Zeit
        if (isGatheringComplete(gathering)) {
          onAutoReturn();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gathering, onAutoReturn]);

  if (!gathering) return null;

  const biome = Object.values(BIOMES).find(b => b.direction === gathering.biome);
  const isPaused = gathering.status === 'paused';
  const progress = (elapsed / MAX_GATHERING_DURATION) * 100;

  return (
    <div style={styles.container}>
      {/* Hintergrund-Animation */}
      <div style={styles.background}>
        <div style={{
          ...styles.bgPattern,
          animationPlayState: isPaused ? 'paused' : 'running',
        }} />
      </div>

      {/* Biom-Info */}
      <div style={styles.biomeInfo}>
        <span style={styles.biomeLabel}>Sammelreise</span>
        <span style={styles.biomeName}>{biome?.name || gathering.biome}</span>
      </div>

      {/* Timer */}
      <div style={styles.timerContainer}>
        <div style={styles.timer}>
          {formatGatheringTime(elapsed)}
        </div>
        <div style={styles.maxTime}>
          / {formatGatheringTime(MAX_GATHERING_DURATION)}
        </div>
      </div>

      {/* Fortschrittsbalken */}
      <div style={styles.progressContainer}>
        <div style={{
          ...styles.progressFill,
          width: `${Math.min(100, progress)}%`,
        }} />
      </div>

      {/* Status */}
      <div style={styles.status}>
        {isPaused ? (
          <span style={styles.pausedText}>⏸ PAUSIERT</span>
        ) : (
          <span style={styles.activeText}>● Sammelt...</span>
        )}
      </div>

      {/* Bedürfnis-Balken */}
      <div style={styles.needsContainer}>
        <NeedsBar needs={needs} />
      </div>

      {/* Buttons */}
      <div style={styles.buttons}>
        {isPaused ? (
          <button style={styles.resumeBtn} onClick={onResume}>
            ▶ Weiterlaufen
          </button>
        ) : (
          <button style={styles.pauseBtn} onClick={onPause}>
            ⏸ Pause
          </button>
        )}
        <button style={styles.cancelBtn} onClick={onCancel}>
          ← Abbrechen & Zurückkehren
        </button>
      </div>

      {/* Hinweis */}
      <p style={styles.hint}>
        {isPaused
          ? 'Während der Pause werden keine Items gesammelt und Bedürfnisse pausieren.'
          : 'Je länger die Reise, desto mehr Items. Aber pass auf deine Bedürfnisse auf!'}
      </p>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0a1a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    zIndex: 50,
    padding: '20px',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    opacity: 0.15,
  },
  bgPattern: {
    width: '200%',
    height: '200%',
    background: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.05) 35px, rgba(255,255,255,0.05) 70px)',
    animation: 'slide 4s linear infinite',
  },
  biomeInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 1,
  },
  biomeLabel: {
    color: '#888',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '2px',
  },
  biomeName: {
    color: '#fff',
    fontSize: '28px',
    fontWeight: 'bold',
  },
  timerContainer: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    zIndex: 1,
  },
  timer: {
    fontSize: '56px',
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  maxTime: {
    fontSize: '20px',
    color: '#666',
    fontFamily: 'monospace',
  },
  progressContainer: {
    width: '80%',
    maxWidth: '400px',
    height: '8px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
    zIndex: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: '4px',
    transition: 'width 0.5s linear',
  },
  status: {
    zIndex: 1,
  },
  pausedText: {
    color: '#f59e0b',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  activeText: {
    color: '#4ade80',
    fontSize: '18px',
  },
  needsContainer: {
    zIndex: 1,
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    zIndex: 1,
  },
  pauseBtn: {
    padding: '14px 28px',
    backgroundColor: '#f59e0b',
    color: '#000',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    minWidth: '180px',
  },
  resumeBtn: {
    padding: '14px 28px',
    backgroundColor: '#4ade80',
    color: '#000',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    minWidth: '180px',
  },
  cancelBtn: {
    padding: '14px 28px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    minWidth: '180px',
  },
  hint: {
    color: '#666',
    fontSize: '13px',
    textAlign: 'center',
    maxWidth: '400px',
    zIndex: 1,
  },
};
