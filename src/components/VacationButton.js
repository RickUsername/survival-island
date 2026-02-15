// ============================================
// Urlaubsmodus-Button und Info
// ============================================

import React, { useState } from 'react';
import {
  formatVacationInfo,
  activateVacation,
  deactivateVacation,
} from '../systems/VacationSystem';

export default function VacationButton({ vacation, onVacationChange }) {
  const [showDetails, setShowDetails] = useState(false);
  const info = formatVacationInfo(vacation);

  const handleToggle = () => {
    if (vacation.isActive) {
      onVacationChange(deactivateVacation(vacation));
    } else {
      if (info.totalRemainingHours <= 0) return;
      onVacationChange(activateVacation(vacation));
    }
  };

  return (
    <div style={styles.wrapper}>
      <button
        style={{
          ...styles.button,
          backgroundColor: vacation.isActive
            ? 'rgba(46, 204, 113, 0.9)'
            : 'rgba(0, 0, 0, 0.7)',
        }}
        onClick={() => setShowDetails(!showDetails)}
      >
        <span style={styles.icon}>🏖️</span>
        <span style={styles.label}>
          {vacation.isActive ? 'Urlaub aktiv' : 'Urlaub'}
        </span>
      </button>

      {showDetails && (
        <div style={styles.details}>
          <p style={styles.remaining}>
            Verbleibend: <strong>{info.displayText}</strong>
          </p>
          <p style={styles.hint}>
            {vacation.isActive
              ? 'Bedürfnisse, Wetter und Zeit sind pausiert.'
              : 'Pausiert alle Bedürfnisse und Timer.'}
          </p>
          <button
            style={{
              ...styles.toggleBtn,
              backgroundColor: vacation.isActive ? '#e74c3c' : '#2ecc71',
              opacity: !vacation.isActive && info.totalRemainingHours <= 0 ? 0.5 : 1,
            }}
            onClick={handleToggle}
            disabled={!vacation.isActive && info.totalRemainingHours <= 0}
          >
            {vacation.isActive ? 'Urlaub beenden' : 'Urlaub starten'}
          </button>
          {info.totalRemainingHours <= 0 && !vacation.isActive && (
            <p style={styles.noVacation}>Kein Urlaub mehr verfügbar dieses Jahr.</p>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    position: 'relative',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
  },
  icon: {
    fontSize: '18px',
  },
  label: {
    fontWeight: 'bold',
  },
  details: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: '10px',
    padding: '14px',
    minWidth: '220px',
    zIndex: 20,
    border: '1px solid #444',
  },
  remaining: {
    color: '#fff',
    fontSize: '14px',
    margin: '0 0 6px',
  },
  hint: {
    color: '#888',
    fontSize: '12px',
    margin: '0 0 12px',
  },
  toggleBtn: {
    width: '100%',
    padding: '10px',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  noVacation: {
    color: '#e74c3c',
    fontSize: '11px',
    marginTop: '8px',
    textAlign: 'center',
  },
};
