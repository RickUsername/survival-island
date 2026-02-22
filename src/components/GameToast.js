// ============================================
// Generische Toast-Benachrichtigung
// ============================================

import React, { useEffect, useState } from 'react';

export default function GameToast({ emoji, message, onDismiss, duration = 4000 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;

    // Einblenden
    const showTimer = setTimeout(() => setVisible(true), 50);

    // Nach duration ausblenden
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400);
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [message, onDismiss, duration]);

  if (!message) return null;

  return (
    <div style={styles.wrapper}>
      <div
        style={{
          ...styles.toast,
          transform: visible ? 'translateY(0)' : 'translateY(-120%)',
          opacity: visible ? 1 : 0,
        }}
      >
        {emoji && <span style={styles.emoji}>{emoji}</span>}
        <span style={styles.message}>{message}</span>
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
    border: '2px solid #e67e22',
    borderRadius: '12px',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'transform 0.4s ease, opacity 0.4s ease',
    boxShadow: '0 4px 20px rgba(230, 126, 34, 0.3)',
    maxWidth: '90vw',
  },
  emoji: {
    fontSize: '28px',
    flexShrink: 0,
  },
  message: {
    color: '#fff',
    fontSize: '15px',
    fontWeight: 'bold',
  },
};
