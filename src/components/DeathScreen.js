// ============================================
// Tod-Bildschirm
// ============================================

import React from 'react';

const deathMessages = {
  hunger: {
    title: 'Verhungert',
    message: 'Du bist vor Hunger gestorben. Nächstes Mal solltest du mehr Nahrung sammeln.',
    icon: '🍖',
  },
  thirst: {
    title: 'Verdurstet',
    message: 'Du bist vor Durst gestorben. Vergiss nicht, regelmäßig Wasser zu sammeln.',
    icon: '💧',
  },
  mood: {
    title: 'Aufgegeben',
    message: 'Deine Stimmung ist auf Null gesunken. Du hast die Hoffnung verloren.',
    icon: '💔',
  },
};

export default function DeathScreen({ cause, onRestart }) {
  const info = deathMessages[cause] || deathMessages.hunger;

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.icon}>{info.icon}</div>
        <h1 style={styles.title}>{info.title}</h1>
        <p style={styles.message}>{info.message}</p>

        <div style={styles.divider} />

        <p style={styles.resetInfo}>
          Dein Spielstand wird zurückgesetzt.
          Urlaubstage und Tagebuch bleiben erhalten.
        </p>

        <button style={styles.restartBtn} onClick={onRestart}>
          Neues Spiel starten
        </button>
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  panel: {
    backgroundColor: '#1a0a0a',
    border: '2px solid #e74c3c',
    borderRadius: '16px',
    padding: '36px',
    textAlign: 'center',
    maxWidth: '400px',
    width: '90%',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '12px',
  },
  title: {
    color: '#e74c3c',
    fontSize: '32px',
    margin: '0 0 12px',
  },
  message: {
    color: '#ccc',
    fontSize: '16px',
    lineHeight: '1.5',
    margin: '0 0 20px',
  },
  divider: {
    height: '1px',
    backgroundColor: '#333',
    margin: '20px 0',
  },
  resetInfo: {
    color: '#888',
    fontSize: '13px',
    margin: '0 0 20px',
  },
  restartBtn: {
    padding: '14px 40px',
    backgroundColor: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
  },
};
