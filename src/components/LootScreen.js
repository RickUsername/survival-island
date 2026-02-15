// ============================================
// Loot-Anzeige nach Sammelreise
// ============================================

import React from 'react';
import items from '../data/items';
import { formatGatheringTime } from '../systems/GatheringSystem';
import { BIOMES } from '../utils/constants';
import { ANIMAL_TYPES } from '../systems/AnimalSystem';

export default function LootScreen({ lootData, onClose }) {
  if (!lootData) return null;

  const biome = Object.values(BIOMES).find(b => b.direction === lootData.biome);

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <h2 style={styles.title}>Sammelreise abgeschlossen!</h2>

        <div style={styles.info}>
          <span>Biom: <strong>{biome?.name || lootData.biome}</strong></span>
          <span>Dauer: <strong>{formatGatheringTime(lootData.duration)}</strong></span>
          {lootData.moodGain > 0 && (
            <span style={styles.moodGain}>
              Stimmung: +{Math.floor(lootData.moodGain)}
            </span>
          )}
        </div>

        <div style={styles.lootList}>
          {lootData.items.length === 0 ? (
            <p style={styles.empty}>Keine Gegenstände gefunden.</p>
          ) : (
            lootData.items.map((loot, i) => {
              const itemDef = items[loot.itemId];
              return (
                <div key={i} style={styles.lootItem}>
                  <div
                    style={{
                      ...styles.lootIcon,
                      backgroundColor: itemDef?.color || '#666',
                    }}
                  />
                  <span style={styles.lootName}>
                    {itemDef?.name || loot.itemId}
                  </span>
                  <span style={styles.lootAmount}>x{loot.amount}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Neues Tier gespawnt */}
        {lootData.newAnimal && (() => {
          const animalDef = ANIMAL_TYPES[lootData.newAnimal.type];
          return (
            <div style={styles.animalSpawn}>
              <span style={styles.animalIcon}>🐾</span>
              <span style={styles.animalText}>
                Ein <strong>{animalDef?.name || lootData.newAnimal.type}</strong> hat sich auf deiner Insel niedergelassen!
              </span>
            </div>
          );
        })()}

        {/* Kaputte Werkzeuge anzeigen */}
        {lootData.brokenTools && lootData.brokenTools.length > 0 && (
          <div style={styles.brokenTools}>
            {lootData.brokenTools.map((tool, i) => {
              const itemDef = items[tool.id];
              return (
                <div key={i} style={styles.brokenItem}>
                  <span style={styles.brokenIcon}>💔</span>
                  <span style={styles.brokenText}>
                    {itemDef?.name || tool.id} ist zerbrochen!
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <button style={styles.closeBtn} onClick={onClose}>
          Einsammeln
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  panel: {
    backgroundColor: '#1a1a2e',
    border: '2px solid #ffd700',
    borderRadius: '16px',
    padding: '24px',
    width: '90%',
    maxWidth: '400px',
    maxHeight: '80vh',
    overflow: 'auto',
    textAlign: 'center',
  },
  title: {
    color: '#ffd700',
    fontSize: '22px',
    margin: '0 0 16px',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    color: '#ccc',
    fontSize: '14px',
    marginBottom: '16px',
    padding: '10px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
  },
  moodGain: {
    color: '#e91e63',
    fontWeight: 'bold',
  },
  lootList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '20px',
  },
  empty: {
    color: '#666',
    fontSize: '14px',
  },
  lootItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderRadius: '8px',
  },
  lootIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
  },
  lootName: {
    color: '#fff',
    fontSize: '14px',
    flex: 1,
    textAlign: 'left',
  },
  lootAmount: {
    color: '#ffd700',
    fontSize: '16px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  animalSpawn: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    border: '1px solid rgba(46, 204, 113, 0.4)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  animalIcon: {
    fontSize: '24px',
  },
  animalText: {
    color: '#2ecc71',
    fontSize: '14px',
    textAlign: 'left',
  },
  brokenTools: {
    marginBottom: '16px',
    padding: '10px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
  },
  brokenItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 0',
  },
  brokenIcon: {
    fontSize: '16px',
  },
  brokenText: {
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: '14px 40px',
    backgroundColor: '#ffd700',
    color: '#000',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
};
