// ============================================
// Achievement-Toast - Benachrichtigung bei Errungenschaft
// ============================================

import React, { useEffect, useState } from 'react';
import { getAchievementById } from '../systems/AchievementSystem';

export default function AchievementToast({ achievementId, onDismiss }) {
  const [visible, setVisible] = useState(false);

  const achievement = getAchievementById(achievementId);

  useEffect(() => {
    if (!achievementId) return;

    // Einblenden
    const showTimer = setTimeout(() => setVisible(true), 50);

    // Nach 3.5s ausblenden
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400);
    }, 3500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [achievementId, onDismiss]);

  if (!achievement) return null;

  return (
    <div style={styles.wrapper}>
      <div
        style={{
          ...styles.toast,
          transform: visible ? 'translateY(0)' : 'translateY(-120%)',
          opacity: visible ? 1 : 0,
        }}
      >
        <span style={styles.emoji}>{achievement.emoji}</span>
        <div style={styles.textContainer}>
          <span style={styles.label}>Errungenschaft freigeschaltet!</span>
          <span style={styles.name}>{achievement.name}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    position: 'fixed',
    top: '20px',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    zIndex: 500,
    pointerEvents: 'none',
  },
  toast: {
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    border: '2px solid #ffd700',
    borderRadius: '12px',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'transform 0.4s ease, opacity 0.4s ease',
    boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)',
  },
  emoji: {
    fontSize: '32px',
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    color: '#ffd700',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  name: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
  },
};
