// ============================================
// Hobby-Bildschirm - aktive Stricken/Hobby-Session
// ============================================
// Stoppuhr-Modus, blockiert Sammelreisen.
// Während aktivem Hobby: Stimmung sinkt nicht, dafür gibt's am Ende moodGain.

import React, { useState, useEffect } from 'react';
import {
  getElapsedHobbyTime,
  formatHobbyTime,
} from '../systems/HobbySystem';
import NeedsBar from './NeedsBar';

export default function HobbyScreen({
  hobby,
  needs,
  activeProjectName,
  onPause,
  onResume,
  onCancel,
}) {
  const [elapsed, setElapsed] = useState(0);

  // Timer aktualisieren
  useEffect(() => {
    const interval = setInterval(() => {
      if (hobby) setElapsed(getElapsedHobbyTime(hobby));
    }, 250);
    return () => clearInterval(interval);
  }, [hobby]);

  if (!hobby) return null;

  const isPaused = !!hobby.pausedAt;

  return (
    <div style={styles.container}>
      <div style={styles.background}>
        <div style={styles.bgPattern} />
      </div>

      {/* Titel */}
      <div style={styles.titleBox}>
        <span style={styles.titleIcon}>🧶</span>
        <span style={styles.title}>Hobby</span>
      </div>

      {/* Modus-Badge */}
      <div style={styles.modeBadge}>
        <span style={styles.modeText}>Stoppuhr-Modus</span>
      </div>

      {/* Aktives Projekt Badge */}
      {activeProjectName ? (
        <div style={styles.projectBadge}>
          <span style={styles.projectIcon}>🪡</span>
          <span style={styles.projectText}>{activeProjectName}</span>
        </div>
      ) : (
        <div style={styles.noProjectBadge}>
          <span style={styles.noProjectText}>Kein Projekt ausgewählt</span>
        </div>
      )}

      {/* Strick-Animation */}
      <div style={styles.knittingScene}>
        <span style={{ ...styles.knittingEmoji, animation: isPaused ? 'none' : 'wiggle 1.2s ease-in-out infinite' }}>
          🧶
        </span>
      </div>

      {/* Timer */}
      <div style={styles.timerContainer}>
        <div style={styles.timer}>{formatHobbyTime(elapsed)}</div>
      </div>

      {/* Status */}
      <div style={styles.status}>
        {isPaused ? (
          <span style={styles.pausedText}>⏸ PAUSIERT</span>
        ) : (
          <span style={styles.activeText}>● Hobby läuft...</span>
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
          ⏹ Stopp & Beenden
        </button>
      </div>

      {/* Hinweis */}
      <p style={styles.hint}>
        Zeit läuft endlos. Beim Beenden bekommst du Stimmung dazu — keine Items.
        {activeProjectName && ` Hobbyzeit wird "${activeProjectName}" gutgeschrieben.`}
      </p>

      {/* Wiggle-Animation Keyframes */}
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
      `}</style>
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
    gap: 'min(12px, 1.5vh)',
    zIndex: 50,
    padding: '12px',
    overflow: 'auto',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    opacity: 0.12,
  },
  bgPattern: {
    width: '200%',
    height: '200%',
    background: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(176,126,204,0.4) 35px, rgba(176,126,204,0.4) 70px)',
  },
  titleBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    zIndex: 1,
  },
  titleIcon: {
    fontSize: 'min(36px, 7vw)',
  },
  title: {
    color: '#fff',
    fontSize: 'min(28px, 5vw)',
    fontWeight: 'bold',
  },
  modeBadge: {
    backgroundColor: 'rgba(176,126,204,0.2)',
    border: '1px solid #B07ECC',
    borderRadius: '20px',
    padding: '4px 14px',
    zIndex: 1,
  },
  modeText: {
    color: '#B07ECC',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  projectBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(176,126,204,0.3)',
    border: '1px solid #B07ECC',
    borderRadius: '20px',
    padding: '6px 16px',
    zIndex: 1,
  },
  projectIcon: { fontSize: '16px' },
  projectText: {
    color: '#B07ECC',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  noProjectBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '20px',
    padding: '6px 16px',
    zIndex: 1,
  },
  noProjectText: {
    color: '#888',
    fontSize: '13px',
    fontStyle: 'italic',
  },
  knittingScene: {
    zIndex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '8px 0',
  },
  knittingEmoji: {
    fontSize: 'min(64px, 12vw)',
    transformOrigin: 'center bottom',
  },
  timerContainer: {
    zIndex: 1,
  },
  timer: {
    fontSize: 'min(56px, 10vw)',
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  status: { zIndex: 1 },
  pausedText: {
    color: '#f59e0b',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  activeText: {
    color: '#B07ECC',
    fontSize: '18px',
  },
  needsContainer: { zIndex: 1 },
  buttons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    zIndex: 1,
  },
  pauseBtn: {
    padding: '12px 20px',
    backgroundColor: '#f59e0b',
    color: '#000',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: 'min(16px, 3.5vw)',
    fontWeight: 'bold',
    minWidth: 'min(180px, 40vw)',
  },
  resumeBtn: {
    padding: '12px 20px',
    backgroundColor: '#B07ECC',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: 'min(16px, 3.5vw)',
    fontWeight: 'bold',
    minWidth: 'min(180px, 40vw)',
  },
  cancelBtn: {
    padding: '12px 20px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: 'min(16px, 3.5vw)',
    fontWeight: 'bold',
    minWidth: 'min(180px, 40vw)',
  },
  hint: {
    color: '#666',
    fontSize: '13px',
    textAlign: 'center',
    maxWidth: '420px',
    zIndex: 1,
  },
};
