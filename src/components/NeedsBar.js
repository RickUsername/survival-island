// ============================================
// Bedürfnis-Balken Komponente
// ============================================

import React from 'react';
import { formatNeedValue, isNeedCritical } from '../systems/NeedsSystem';

const needConfig = {
  hunger: { label: 'Hunger', color: '#e67e22', icon: '🍖' },
  thirst: { label: 'Durst', color: '#3498db', icon: '💧' },
  mood: { label: 'Stimmung', color: '#e91e63', icon: '😊' },
};

export default function NeedsBar({ needs, compact }) {
  if (!needs) return null;

  // Kompakter Modus: Nur Icons mit farbigem Punkt
  if (compact) {
    return (
      <div style={styles.compactContainer}>
        {Object.entries(needConfig).map(([key, config]) => {
          const value = needs[key];
          const critical = isNeedCritical(value);
          return (
            <div key={key} style={styles.compactItem}>
              <span style={{ fontSize: '14px' }}>{config.icon}</span>
              <div style={styles.compactBarBg}>
                <div style={{
                  ...styles.compactBarFill,
                  width: `${value}%`,
                  backgroundColor: critical ? '#e74c3c' : config.color,
                }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {Object.entries(needConfig).map(([key, config]) => {
        const value = needs[key];
        const critical = isNeedCritical(value);

        return (
          <div key={key} style={styles.needRow}>
            <span style={styles.icon}>{config.icon}</span>
            <div style={styles.barContainer}>
              <div
                style={{
                  ...styles.barFill,
                  width: `${value}%`,
                  backgroundColor: critical ? '#e74c3c' : config.color,
                  animation: critical ? 'pulse 1s infinite' : 'none',
                }}
              />
            </div>
            <span style={{
              ...styles.value,
              color: critical ? '#e74c3c' : '#fff',
              fontWeight: critical ? 'bold' : 'normal',
            }}>
              {formatNeedValue(value)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  compactContainer: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  compactItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  compactBarBg: {
    width: '28px',
    height: '4px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  compactBarFill: {
    height: '100%',
    borderRadius: '2px',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '10px',
    minWidth: '160px',
  },
  needRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  icon: {
    fontSize: '16px',
    width: '20px',
    textAlign: 'center',
  },
  barContainer: {
    flex: 1,
    height: '14px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: '7px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '7px',
    transition: 'width 1s linear',
  },
  value: {
    fontSize: '12px',
    minWidth: '42px',
    textAlign: 'right',
    fontFamily: 'monospace',
  },
};
