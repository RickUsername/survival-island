// ============================================
// Tier-Wegschicken-Dialog - Bestätigung
// ============================================

import React from 'react';
import { ANIMAL_TYPES } from '../systems/AnimalSystem';

export default function AnimalDismissDialog({ animal, onConfirm, onCancel }) {
  if (!animal) return null;

  const def = ANIMAL_TYPES[animal.type];
  const name = def?.name || animal.type;

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        <h3 style={styles.title}>Tier wegschicken?</h3>
        <p style={styles.text}>
          Möchtest du <strong>{name}</strong> wirklich wegschicken?
        </p>
        <p style={styles.info}>
          Das Tier verlässt die Insel und kommt nicht wieder.
        </p>
        <div style={styles.buttons}>
          <button style={styles.cancelBtn} onClick={onCancel}>
            Behalten
          </button>
          <button style={styles.confirmBtn} onClick={onConfirm}>
            Wegschicken
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 150,
  },
  panel: {
    backgroundColor: '#1a1a2e',
    border: '2px solid #e67e22',
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '360px',
    textAlign: 'center',
  },
  title: {
    color: '#e67e22',
    fontSize: '18px',
    margin: '0 0 12px',
  },
  text: {
    color: '#ccc',
    fontSize: '14px',
    margin: '0 0 8px',
  },
  info: {
    color: '#888',
    fontSize: '12px',
    margin: '0 0 20px',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  cancelBtn: {
    padding: '10px 24px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#ccc',
    border: '1px solid #555',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  confirmBtn: {
    padding: '10px 24px',
    backgroundColor: '#e67e22',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
};
