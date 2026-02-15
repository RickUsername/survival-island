// ============================================
// Wetter-Anzeige Komponente
// ============================================

import React from 'react';

export default function WeatherDisplay({ weather }) {
  const isSunny = weather === 'sunny';

  return (
    <div style={styles.container}>
      <span style={styles.icon}>{isSunny ? '☀️' : '🌧️'}</span>
      <span style={styles.label}>{isSunny ? 'Sonne' : 'Regen'}</span>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
  },
  icon: {
    fontSize: '20px',
  },
  label: {
    fontWeight: 'bold',
  },
};
