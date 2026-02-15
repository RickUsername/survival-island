// ============================================
// Biom-Bestätigung beim Verlassen der Heimat-Map
// ============================================

import React from 'react';
import { BIOMES } from '../utils/constants';

const biomeColors = {
  north: '#2d7a1e',
  south: '#3a7bd5',
  west: '#d4a017',
  east: '#808080',
};

const biomeDescriptions = {
  north: 'Dichter Wald mit Holz, Beeren, Pilzen und Lianen.',
  south: 'Ein Süßwassersee mit Fisch, Wasser, Lehm und Seetang.',
  west: 'Offene Felder mit Beeren, Kokosnüssen und Lianen.',
  east: 'Felsige Klippen mit Stein, Eisenerz und seltenen Kristallen.',
};

export default function BiomePrompt({ direction, onConfirm, onCancel }) {
  const biome = Object.values(BIOMES).find(b => b.direction === direction);
  if (!biome) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={{
          ...styles.biomeIcon,
          backgroundColor: biomeColors[direction],
        }}>
          {direction === 'north' ? '🌲' :
           direction === 'south' ? '🐟' :
           direction === 'west' ? '🌾' : '⛰️'}
        </div>

        <h2 style={styles.title}>Sammelreise: {biome.name}</h2>
        <p style={styles.description}>{biomeDescriptions[direction]}</p>

        <div style={styles.info}>
          <p>Max. Dauer: 2 Stunden Echtzeit</p>
          <p>Bedürfnisse laufen weiter!</p>
        </div>

        <div style={styles.buttons}>
          <button style={styles.confirmBtn} onClick={onConfirm}>
            Losziehen!
          </button>
          <button style={styles.cancelBtn} onClick={onCancel}>
            Zurück
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  panel: {
    backgroundColor: '#1a1a2e',
    border: '2px solid #444',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
    maxWidth: '380px',
    width: '90%',
  },
  biomeIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    margin: '0 auto 12px',
  },
  title: {
    color: '#fff',
    fontSize: '22px',
    margin: '0 0 8px',
  },
  description: {
    color: '#aaa',
    fontSize: '14px',
    margin: '0 0 16px',
  },
  info: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    padding: '10px',
    marginBottom: '16px',
    color: '#f59e0b',
    fontSize: '13px',
  },
  buttons: {
    display: 'flex',
    gap: '10px',
  },
  confirmBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#555',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};
