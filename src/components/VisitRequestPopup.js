// ============================================
// Besuchsanfrage-Popup - Eingehende Anfrage
// ============================================

import React, { useEffect, useState } from 'react';

const AUTO_DECLINE_SECONDS = 60;

export default function VisitRequestPopup({ visitorName, onAccept, onDecline }) {
  const [countdown, setCountdown] = useState(AUTO_DECLINE_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDecline]);

  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        <div style={styles.icon}>🏝️</div>
        <h3 style={styles.title}>Besuchsanfrage</h3>
        <p style={styles.text}>
          <strong>{visitorName}</strong> moechte deine Insel besuchen!
        </p>
        <p style={styles.countdown}>
          Automatische Ablehnung in {countdown}s
        </p>
        <div style={styles.buttons}>
          <button style={styles.declineBtn} onClick={onDecline}>
            Ablehnen
          </button>
          <button style={styles.acceptBtn} onClick={onAccept}>
            Annehmen
          </button>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  popup: {
    backgroundColor: '#1a1a2e',
    border: '2px solid #3498db',
    borderRadius: '16px',
    padding: '24px',
    width: '90%',
    maxWidth: '340px',
    textAlign: 'center',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  title: {
    color: '#3498db',
    fontSize: '18px',
    margin: '0 0 12px',
  },
  text: {
    color: '#ddd',
    fontSize: '14px',
    margin: '0 0 8px',
  },
  countdown: {
    color: '#888',
    fontSize: '12px',
    margin: '0 0 16px',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  declineBtn: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    color: '#e74c3c',
    border: '1px solid rgba(231, 76, 60, 0.4)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  acceptBtn: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    color: '#2ecc71',
    border: '1px solid rgba(46, 204, 113, 0.4)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
};
