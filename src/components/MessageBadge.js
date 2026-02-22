// ============================================
// Message-Badge - Ungelesene Nachrichten Zaehler
// ============================================

import React from 'react';

export default function MessageBadge({ count }) {
  if (!count || count <= 0) return null;

  return (
    <span style={styles.badge}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

const styles = {
  badge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#e74c3c',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 'bold',
    minWidth: '16px',
    height: '16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    lineHeight: 1,
  },
};
