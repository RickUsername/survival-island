// ============================================
// Sammelreisen-Bildschirm
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  getElapsedGatheringTime,
  formatGatheringTime,
  isGatheringComplete,
  getTargetDuration,
} from '../systems/GatheringSystem';
import { BIOMES } from '../utils/constants';
import NeedsBar from './NeedsBar';

// Wecker-Sound via Web Audio API (3 aufsteigende Töne)
function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    const now = ctx.currentTime;

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.3);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.3 + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.3 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.3);
      osc.stop(now + i * 0.3 + 0.3);
    });

    // Zweite Welle (Wiederholung nach 1s)
    setTimeout(() => {
      try {
        const ctx2 = new (window.AudioContext || window.webkitAudioContext)();
        const now2 = ctx2.currentTime;
        frequencies.forEach((freq, i) => {
          const osc = ctx2.createOscillator();
          const gain = ctx2.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, now2 + i * 0.3);
          gain.gain.linearRampToValueAtTime(0.35, now2 + i * 0.3 + 0.05);
          gain.gain.linearRampToValueAtTime(0, now2 + i * 0.3 + 0.25);
          osc.connect(gain);
          gain.connect(ctx2.destination);
          osc.start(now2 + i * 0.3);
          osc.stop(now2 + i * 0.3 + 0.3);
        });
      } catch (e) { /* ignore */ }
    }, 1000);
  } catch (e) {
    // Web Audio API nicht verfügbar
  }
}

export default function GatheringScreen({
  gathering,
  needs,
  activeTopicName,
  onPause,
  onResume,
  onCancel,
  onAutoReturn,
}) {
  const [elapsed, setElapsed] = useState(0);
  const alarmPlayedRef = useRef(false);

  // Timer aktualisieren
  useEffect(() => {
    alarmPlayedRef.current = false; // Reset bei neuer Reise
  }, [gathering?.startTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (gathering) {
        const time = getElapsedGatheringTime(gathering);
        setElapsed(time);

        // Auto-Rückkehr bei Zielzeit
        if (isGatheringComplete(gathering)) {
          if (!alarmPlayedRef.current) {
            alarmPlayedRef.current = true;
            playAlarmSound();
          }
          onAutoReturn();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gathering, onAutoReturn]);

  if (!gathering) return null;

  const biome = Object.values(BIOMES).find(b => b.direction === gathering.biome);
  const isPaused = gathering.status === 'paused';
  const targetDuration = getTargetDuration(gathering);
  const progress = (elapsed / targetDuration) * 100;
  const remaining = Math.max(0, targetDuration - elapsed);

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

      {/* Aktives Lernthema Badge */}
      {activeTopicName && (
        <div style={styles.topicBadge}>
          <span style={styles.topicIcon}>📖</span>
          <span style={styles.topicText}>{activeTopicName}</span>
        </div>
      )}

      {/* Timer */}
      <div style={styles.timerContainer}>
        <div style={styles.timer}>
          {formatGatheringTime(elapsed)}
        </div>
        <div style={styles.maxTime}>
          / {formatGatheringTime(targetDuration)}
        </div>
      </div>

      {/* Countdown */}
      <div style={styles.countdown}>
        Noch {formatGatheringTime(remaining)}
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
  topicBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(139, 115, 85, 0.3)',
    border: '1px solid #8B7355',
    borderRadius: '20px',
    padding: '6px 16px',
    zIndex: 1,
  },
  topicIcon: {
    fontSize: '16px',
  },
  topicText: {
    color: '#8B7355',
    fontSize: '14px',
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
  countdown: {
    fontSize: '16px',
    color: '#f59e0b',
    fontFamily: 'monospace',
    zIndex: 1,
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
