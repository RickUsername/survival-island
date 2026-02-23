// ============================================
// Sammelreisen-Bildschirm (Timer + Stoppuhr-Modus)
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  getElapsedGatheringTime,
  getRemainingGatheringTime,
  isStopwatchMode,
  isGatheringComplete,
  formatGatheringTime,
} from '../systems/GatheringSystem';
import { BIOMES } from '../utils/constants';
import NeedsBar from './NeedsBar';

// Benachrichtigungs-Berechtigung anfordern
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// System-Benachrichtigung senden (funktioniert auch im Hintergrund)
function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/icon-192.png',
        tag: 'survival-island-alert',
        requireInteraction: true,
      });
    } catch (e) { /* ignore */ }
  }
}

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

const CRITICAL_THRESHOLD = 15; // Benachrichtigung bei < 15%
const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 2-Stunden-Alarm (nur Stoppuhr-Modus)

export default function GatheringScreen({
  gathering,
  needs,
  activeTopicName,
  onPause,
  onResume,
  onCancel,
}) {
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(null);
  const notifiedRef = useRef({ hunger: false, thirst: false, death: false, twoHours: false, timerDone: false });

  const stopwatch = gathering ? isStopwatchMode(gathering) : false;

  // Benachrichtigungs-Berechtigung bei Reisestart anfordern
  useEffect(() => {
    requestNotificationPermission();
    notifiedRef.current = { hunger: false, thirst: false, death: false, twoHours: false, timerDone: false };
  }, [gathering?.startTime]);

  // Timer aktualisieren
  useEffect(() => {
    const interval = setInterval(() => {
      if (gathering) {
        const time = getElapsedGatheringTime(gathering);
        setElapsed(time);

        const rem = getRemainingGatheringTime(gathering);
        setRemaining(rem);

        // Timer-Modus: Alarm wenn Zeit abgelaufen
        if (!stopwatch && rem !== null && rem <= 0 && !notifiedRef.current.timerDone) {
          notifiedRef.current.timerDone = true;
          playAlarmSound();
          sendNotification(
            'Sammelreise abgeschlossen!',
            'Deine Reisezeit ist abgelaufen. Kehre zurück und sammle deinen Loot ein!'
          );
        }

        // Stoppuhr-Modus: 2-Stunden-Erinnerung
        if (stopwatch && time >= TWO_HOURS_MS && !notifiedRef.current.twoHours) {
          notifiedRef.current.twoHours = true;
          playAlarmSound();
          sendNotification(
            'Sammelreise: 2 Stunden erreicht!',
            'Deine Reise läuft seit 2 Stunden. Zeit zurückzukehren?'
          );
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gathering, stopwatch]);

  // Kritische Bedürfnisse überwachen → Benachrichtigung senden
  useEffect(() => {
    if (!needs || !gathering) return;

    const isBackground = document.hidden;

    if (needs.hunger <= 0 || needs.thirst <= 0) {
      if (!notifiedRef.current.death) {
        notifiedRef.current.death = true;
        sendNotification(
          'Dein Charakter stirbt!',
          'Ein Bedürfnis ist auf 0% gefallen. Kehre sofort zurück!'
        );
        if (!isBackground) playAlarmSound();
      }
    } else {
      if (needs.hunger < CRITICAL_THRESHOLD && !notifiedRef.current.hunger) {
        notifiedRef.current.hunger = true;
        sendNotification(
          'Hunger kritisch!',
          `Hunger bei ${Math.round(needs.hunger)}% – kehre bald zurück!`
        );
        if (!isBackground) playAlarmSound();
      }
      if (needs.thirst < CRITICAL_THRESHOLD && !notifiedRef.current.thirst) {
        notifiedRef.current.thirst = true;
        sendNotification(
          'Durst kritisch!',
          `Durst bei ${Math.round(needs.thirst)}% – kehre bald zurück!`
        );
        if (!isBackground) playAlarmSound();
      }
    }
  }, [needs, gathering]);

  if (!gathering) return null;

  const biome = Object.values(BIOMES).find(b => b.direction === gathering.biome);
  const isPaused = gathering.status === 'paused';
  const isComplete = !stopwatch && isGatheringComplete(gathering);

  // Fortschrittsbalken (nur Timer-Modus)
  const targetDuration = gathering.targetDuration;
  const progress = (!stopwatch && targetDuration) ? Math.min(1, elapsed / targetDuration) : null;

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

      {/* Modus-Badge */}
      <div style={{
        ...styles.modeBadge,
        backgroundColor: stopwatch ? 'rgba(245, 158, 11, 0.2)' : 'rgba(39, 174, 96, 0.2)',
        borderColor: stopwatch ? '#f59e0b' : '#27ae60',
      }}>
        <span style={{ color: stopwatch ? '#f59e0b' : '#27ae60', fontSize: '13px', fontWeight: 'bold' }}>
          {stopwatch ? 'Stoppuhr-Modus' : 'Timer-Modus'}
        </span>
      </div>

      {/* Aktives Lernthema Badge */}
      {activeTopicName && (
        <div style={styles.topicBadge}>
          <span style={styles.topicIcon}>📖</span>
          <span style={styles.topicText}>{activeTopicName}</span>
        </div>
      )}

      {/* Timer / Stoppuhr */}
      <div style={styles.timerContainer}>
        {stopwatch ? (
          // Stoppuhr: zählt hoch
          <div style={styles.timer}>
            {formatGatheringTime(elapsed)}
          </div>
        ) : (
          // Timer: zeigt verbleibende Zeit (Countdown)
          <div style={{
            ...styles.timer,
            color: isComplete ? '#4ade80' : remaining != null && remaining < 5 * 60 * 1000 ? '#ef4444' : '#fff',
          }}>
            {isComplete ? '00:00:00' : formatGatheringTime(remaining ?? 0)}
          </div>
        )}
      </div>

      {/* Fortschrittsbalken (nur Timer-Modus) */}
      {progress !== null && (
        <div style={styles.progressBar}>
          <div style={{
            ...styles.progressFill,
            width: `${progress * 100}%`,
            backgroundColor: isComplete ? '#4ade80' : '#27ae60',
          }} />
        </div>
      )}

      {/* Verstrichene Zeit (Timer-Modus) */}
      {!stopwatch && (
        <div style={styles.elapsedLabel}>
          {formatGatheringTime(elapsed)} gesammelt
        </div>
      )}

      {/* Status */}
      <div style={styles.status}>
        {isComplete ? (
          <span style={styles.completeText}>Reise abgeschlossen!</span>
        ) : isPaused ? (
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
        {!isComplete && (
          isPaused ? (
            <button style={styles.resumeBtn} onClick={onResume}>
              ▶ Weiterlaufen
            </button>
          ) : (
            <button style={styles.pauseBtn} onClick={onPause}>
              ⏸ Pause
            </button>
          )
        )}
        <button style={styles.cancelBtn} onClick={onCancel}>
          {isComplete ? '🎒 Loot einsammeln' : '⏹ Stopp & Zurückkehren'}
        </button>
      </div>

      {/* Hinweis */}
      <p style={styles.hint}>
        {isComplete
          ? 'Deine Reise ist abgeschlossen! Kehre zurück, um deinen Loot einzusammeln.'
          : isPaused
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
    fontSize: 'min(28px, 5vw)',
    fontWeight: 'bold',
  },
  modeBadge: {
    borderRadius: '20px',
    padding: '4px 14px',
    border: '1px solid',
    zIndex: 1,
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
    fontSize: 'min(56px, 10vw)',
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  progressBar: {
    width: 'min(300px, 80vw)',
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
    zIndex: 1,
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  elapsedLabel: {
    color: '#888',
    fontSize: '13px',
    zIndex: 1,
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
  completeText: {
    color: '#4ade80',
    fontSize: '20px',
    fontWeight: 'bold',
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
    backgroundColor: '#4ade80',
    color: '#000',
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
    maxWidth: '400px',
    zIndex: 1,
  },
};
