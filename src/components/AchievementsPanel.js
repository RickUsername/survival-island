// ============================================
// Errungenschaften-Panel
// ============================================

import React from 'react';
import { ACHIEVEMENTS } from '../systems/AchievementSystem';

export default function AchievementsPanel({ achievements, onClose }) {
  const unlockedIds = achievements?.unlockedIds || [];
  const unlockedCount = unlockedIds.length;
  const totalCount = ACHIEVEMENTS.length;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Errungenschaften</h2>
          <button style={styles.closeBtn} onClick={onClose}>&#10005;</button>
        </div>

        {/* Fortschritt */}
        <div style={styles.progressRow}>
          <span style={styles.progressLabel}>Fortschritt</span>
          <span style={styles.progressValue}>
            {unlockedCount} / {totalCount}
          </span>
        </div>
        <div style={styles.progressBarBg}>
          <div
            style={{
              ...styles.progressBarFill,
              width: `${(unlockedCount / totalCount) * 100}%`,
            }}
          />
        </div>

        {/* Liste */}
        <div style={styles.list}>
          {ACHIEVEMENTS.map(ach => {
            const unlocked = unlockedIds.includes(ach.id);
            return (
              <div
                key={ach.id}
                style={{
                  ...styles.row,
                  opacity: unlocked ? 1 : 0.4,
                }}
              >
                <span style={styles.rowEmoji}>
                  {unlocked ? ach.emoji : '🔒'}
                </span>
                <div style={styles.rowInfo}>
                  <span style={{
                    ...styles.rowName,
                    color: unlocked ? '#ffd700' : '#666',
                  }}>
                    {ach.name}
                  </span>
                  <span style={styles.rowDesc}>
                    {ach.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hinweis */}
        <div style={styles.hint}>
          Errungenschaften bleiben auch nach dem Tod erhalten.
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  panel: {
    backgroundColor: '#1a1a2e',
    border: '2px solid #ffd700',
    borderRadius: '12px',
    padding: '20px',
    maxWidth: '450px',
    width: '90%',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    color: '#ffd700',
    fontSize: '20px',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  progressRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  progressLabel: {
    color: '#888',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  progressValue: {
    color: '#ffd700',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  progressBarBg: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '16px',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffd700',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
    maxHeight: '50vh',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: '8px',
  },
  rowEmoji: {
    fontSize: '24px',
    width: '32px',
    textAlign: 'center',
    flexShrink: 0,
  },
  rowInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  rowName: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  rowDesc: {
    color: '#888',
    fontSize: '12px',
  },
  hint: {
    color: '#666',
    fontSize: '11px',
    textAlign: 'center',
  },
};
