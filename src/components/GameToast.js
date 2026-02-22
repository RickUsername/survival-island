// ============================================
// Generische Toast-Benachrichtigung
// ============================================

import React, { useEffect, useState, useRef } from 'react';

export default function GameToast({ emoji, message, onDismiss, duration = 4000 }) {
  const [visible, setVisible] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!message) return;

    // Einblenden
    const showTimer = setTimeout(() => setVisible(true), 50);

    // Nach duration ausblenden
    const hideTimer = setTimeout(() => {
      setVisible(false);
      // Nach Fade-Out-Animation onDismiss aufrufen
      setTimeout(() => {
        if (onDismissRef.current) onDismissRef.current();
      }, 400);
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [message, duration]); // onDismiss bewusst NICHT in Dependencies (Ref stattdessen)

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
    top: 'calc(20px + env(safe-area-inset-top, 0px))',
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
