// ============================================
// Tier-Info-Dialog - Hunger, Füttern, Wegschicken
// ============================================

import React from 'react';
import { ANIMAL_TYPES, ANIMAL_HUNGER_MAX } from '../systems/AnimalSystem';

export default function AnimalInfoDialog({ animal, inventory, onFeed, onDismiss, onClose }) {
  if (!animal) return null;

  const def = ANIMAL_TYPES[animal.type];
  const name = def?.name || animal.type;
  const hunger = animal.hunger ?? ANIMAL_HUNGER_MAX;
  const hungerPercent = Math.max(0, Math.min(100, (hunger / ANIMAL_HUNGER_MAX) * 100));

  // Hunger-Stufe für Farbe und Text
  const getHungerInfo = () => {
    if (hungerPercent > 70) return { color: '#2ecc71', text: 'Satt', emoji: '😊' };
    if (hungerPercent > 40) return { color: '#f1c40f', text: 'Hungrig', emoji: '😐' };
    if (hungerPercent > 15) return { color: '#e67e22', text: 'Sehr hungrig', emoji: '😟' };
    return { color: '#e74c3c', text: 'Kurz vor dem Verhungern!', emoji: '😫' };
  };

  const hungerInfo = getHungerInfo();

  // Verfügbares Futter zählen
  const fruitCount = inventory?.fruit?.amount || 0;
  const berryCount = inventory?.berry?.amount || 0;
  const hayCount = inventory?.hay?.amount || 0;
  const hasFruit = fruitCount > 0;
  const hasBerry = berryCount > 0;
  const hasHay = hayCount > 0;
  const canFeed = hasFruit || hasBerry || hasHay;

  // Tage seit Spawn
  const daysSinceSpawn = Math.floor((Date.now() - (animal.spawnedAt || Date.now())) / (24 * 60 * 60 * 1000));

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        {/* Tier-Kopfbereich */}
        <div style={styles.header}>
          <div style={{
            ...styles.animalIcon,
            backgroundColor: def?.color || '#888',
          }}>
            {animal.type === 'deer' && '🦌'}
            {animal.type === 'heron' && '🐦'}
            {animal.type === 'goat' && '🐐'}
            {animal.type === 'rabbit' && '🐇'}
          </div>
          <div>
            <h3 style={styles.title}>{name}</h3>
            <p style={styles.subtitle}>
              {daysSinceSpawn === 0 ? 'Heute angekommen' : `Seit ${daysSinceSpawn} ${daysSinceSpawn === 1 ? 'Tag' : 'Tagen'} hier`}
            </p>
          </div>
        </div>

        {/* Hunger-Balken */}
        <div style={styles.hungerSection}>
          <div style={styles.hungerLabel}>
            <span>{hungerInfo.emoji} Hunger</span>
            <span style={{ color: hungerInfo.color }}>{hungerInfo.text}</span>
          </div>
          <div style={styles.hungerBarBg}>
            <div style={{
              ...styles.hungerBarFill,
              width: `${hungerPercent}%`,
              backgroundColor: hungerInfo.color,
            }} />
          </div>
          <p style={styles.hungerValue}>
            {Math.round(hunger)} / {ANIMAL_HUNGER_MAX}
          </p>
        </div>

        {/* Info-Text */}
        <p style={styles.infoText}>
          {name} braucht <strong>1 Obst pro Tag</strong> zum Überleben.
          {hungerPercent <= 15 && ' Schnell füttern, sonst verhungert es!'}
          {hungerPercent > 70 && ' Es geht ihm gut.'}
        </p>

        {/* Füttern-Bereich */}
        <div style={styles.feedSection}>
          <p style={styles.feedTitle}>Füttern:</p>
          <div style={styles.feedButtons}>
            <button
              style={{
                ...styles.feedBtn,
                opacity: hasFruit ? 1 : 0.4,
                cursor: hasFruit ? 'pointer' : 'default',
              }}
              onClick={() => hasFruit && onFeed('fruit')}
              disabled={!hasFruit}
            >
              <span style={styles.feedIcon}>🍊</span>
              <span>Obst ({fruitCount})</span>
              <span style={styles.feedValue}>+100%</span>
            </button>
            <button
              style={{
                ...styles.feedBtn,
                opacity: hasBerry ? 1 : 0.4,
                cursor: hasBerry ? 'pointer' : 'default',
              }}
              onClick={() => hasBerry && onFeed('berry')}
              disabled={!hasBerry}
            >
              <span style={styles.feedIcon}>🫐</span>
              <span>Beere ({berryCount})</span>
              <span style={styles.feedValue}>+50%</span>
            </button>
            <button
              style={{
                ...styles.feedBtn,
                opacity: hasHay ? 1 : 0.4,
                cursor: hasHay ? 'pointer' : 'default',
              }}
              onClick={() => hasHay && onFeed('hay')}
              disabled={!hasHay}
            >
              <span style={styles.feedIcon}>🌾</span>
              <span>Heu ({hayCount})</span>
              <span style={styles.feedValue}>+30%</span>
            </button>
          </div>
          {!canFeed && (
            <p style={styles.noFoodHint}>
              Kein Futter vorhanden! Sammle Obst im Wald oder Beeren.
            </p>
          )}
        </div>

        {/* Buttons */}
        <div style={styles.buttons}>
          <button style={styles.closeBtn} onClick={onClose}>
            Schliessen
          </button>
          <button style={styles.dismissBtn} onClick={onDismiss}>
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
    padding: '20px',
    width: '90%',
    maxWidth: '380px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  animalIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  title: {
    color: '#e67e22',
    fontSize: '18px',
    margin: 0,
  },
  subtitle: {
    color: '#888',
    fontSize: '12px',
    margin: '2px 0 0',
  },
  hungerSection: {
    marginBottom: '12px',
  },
  hungerLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#ccc',
    fontSize: '13px',
    marginBottom: '4px',
  },
  hungerBarBg: {
    width: '100%',
    height: '14px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '7px',
    overflow: 'hidden',
  },
  hungerBarFill: {
    height: '100%',
    borderRadius: '7px',
    transition: 'width 0.3s ease',
  },
  hungerValue: {
    color: '#666',
    fontSize: '11px',
    textAlign: 'right',
    margin: '2px 0 0',
  },
  infoText: {
    color: '#aaa',
    fontSize: '12px',
    lineHeight: '1.4',
    margin: '0 0 14px',
    padding: '8px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '6px',
  },
  feedSection: {
    marginBottom: '16px',
  },
  feedTitle: {
    color: '#ccc',
    fontSize: '13px',
    fontWeight: 'bold',
    margin: '0 0 8px',
  },
  feedButtons: {
    display: 'flex',
    gap: '8px',
  },
  feedBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '10px 8px',
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    color: '#ccc',
    border: '1px solid rgba(46, 204, 113, 0.3)',
    borderRadius: '8px',
    fontSize: '12px',
  },
  feedIcon: {
    fontSize: '20px',
  },
  feedValue: {
    color: '#2ecc71',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  noFoodHint: {
    color: '#e74c3c',
    fontSize: '11px',
    margin: '6px 0 0',
    textAlign: 'center',
  },
  buttons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  closeBtn: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#ccc',
    border: '1px solid #555',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  dismissBtn: {
    padding: '10px 16px',
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    color: '#e74c3c',
    border: '1px solid rgba(231, 76, 60, 0.4)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
  },
};
