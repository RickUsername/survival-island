// ============================================
// Biom-Bestätigung beim Verlassen der Heimat-Map
// ============================================

import React, { useState } from 'react';
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

export default function BiomePrompt({ direction, diary, onConfirm, onCancel }) {
  const biome = Object.values(BIOMES).find(b => b.direction === direction);
  const [selectedTopicId, setSelectedTopicId] = useState(null);

  if (!biome) return null;

  const topics = diary?.topics || [];

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={{
          ...styles.biomeIcon,
          backgroundColor: biomeColors[direction],
        }}>
          {direction === 'north' ? '\uD83C\uDF32' :
           direction === 'south' ? '\uD83D\uDC1F' :
           direction === 'west' ? '\uD83C\uDF3E' : '\u26F0\uFE0F'}
        </div>

        <h2 style={styles.title}>Sammelreise: {biome.name}</h2>
        <p style={styles.description}>{biomeDescriptions[direction]}</p>

        {/* Lernthema auswählen */}
        <div style={styles.section}>
          <label style={styles.sectionLabel}>Lernthema (optional)</label>
          {topics.length === 0 ? (
            <p style={styles.noTopics}>
              Erstelle Themen im Tagebuch, um Lernzeit zu tracken.
            </p>
          ) : (
            <select
              style={styles.topicSelect}
              value={selectedTopicId || ''}
              onChange={e => setSelectedTopicId(e.target.value || null)}
            >
              <option value="">-- Kein Thema --</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>

        <div style={styles.info}>
          <p>Stoppuhr-Modus: Du entscheidest, wann du zurückkehrst.</p>
          <p>Bedürfnisse laufen weiter – pass auf!</p>
        </div>

        <div style={styles.buttons}>
          <button
            style={styles.confirmBtn}
            onClick={() => onConfirm(selectedTopicId)}
          >
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
    maxWidth: '420px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
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
    margin: '0 0 12px',
  },
  section: {
    textAlign: 'left',
    marginBottom: '14px',
  },
  sectionLabel: {
    color: '#888',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    display: 'block',
    marginBottom: '6px',
  },
  noTopics: {
    color: '#666',
    fontSize: '12px',
    margin: '0',
    fontStyle: 'italic',
  },
  topicSelect: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0a0a1a',
    border: '2px solid #444',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
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
