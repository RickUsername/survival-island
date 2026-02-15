// ============================================
// Abriss-Dialog - Bestätigung zum Gebäude abreißen
// ============================================

import React from 'react';

const BUILDING_NAMES = {
  shelter: 'Unterstand',
  campfire: 'Lagerfeuer',
  water_collector: 'Regenfänger',
};

export default function DemolishDialog({ building, onConfirm, onCancel }) {
  if (!building) return null;

  const name = BUILDING_NAMES[building.type] || building.type;

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        <h3 style={styles.title}>Gebäude abreißen?</h3>
        <p style={styles.text}>
          Möchtest du <strong>{name}</strong> wirklich abreißen?
        </p>
        <p style={styles.warning}>
          Das Gebäude wird zerstört und die Materialien gehen verloren!
        </p>
        <div style={styles.buttons}>
          <button style={styles.cancelBtn} onClick={onCancel}>
            Abbrechen
          </button>
          <button style={styles.confirmBtn} onClick={onConfirm}>
            Abreißen
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
    border: '2px solid #ef4444',
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '360px',
    textAlign: 'center',
  },
  title: {
    color: '#ef4444',
    fontSize: '18px',
    margin: '0 0 12px',
  },
  text: {
    color: '#ccc',
    fontSize: '14px',
    margin: '0 0 8px',
  },
  warning: {
    color: '#f59e0b',
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
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
};
