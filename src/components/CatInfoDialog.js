// ============================================
// Katzen-Info-Dialog - Streicheln, Füttern, Wegschicken
// ============================================

import React, { useState, useEffect } from 'react';
import {
  CAT_AFFECTION_MAX,
  CAT_FEED_AFFECTION,
  getCatStage,
  getCatAgeDays,
  canPetCat,
  getPetCooldownRemaining,
} from '../systems/CatSystem';

export default function CatInfoDialog({ cat, inventory, onPet, onFeed, onDismiss, onClose }) {
  const [cooldownText, setCooldownText] = useState('');

  // Cooldown-Timer aktualisieren
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getPetCooldownRemaining(cat);
      if (remaining > 0) {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setCooldownText(`${mins}:${secs.toString().padStart(2, '0')}`);
      } else {
        setCooldownText('');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cat]);

  const stage = getCatStage(cat.spawnedAt);
  const ageDays = Math.floor(getCatAgeDays(cat.spawnedAt));
  const affection = cat.affection ?? CAT_AFFECTION_MAX;
  const affectionPercent = Math.max(0, Math.min(1, affection / CAT_AFFECTION_MAX));
  const canPet = canPetCat(cat);

  // Zuneigungsstatus-Text
  let affectionStatus, affectionColor;
  if (affectionPercent > 0.7) {
    affectionStatus = 'Glücklich';
    affectionColor = '#FF69B4';
  } else if (affectionPercent > 0.4) {
    affectionStatus = 'Zufrieden';
    affectionColor = '#f1c40f';
  } else if (affectionPercent > 0.15) {
    affectionStatus = 'Einsam';
    affectionColor = '#e67e22';
  } else {
    affectionStatus = 'Vernachlässigt';
    affectionColor = '#e74c3c';
  }

  // Verfügbare Futteroptionen
  const feedOptions = [
    { id: 'fish', name: 'Fisch', emoji: '🐟', gain: CAT_FEED_AFFECTION.fish },
    { id: 'cooked_fish', name: 'Geb. Fisch', emoji: '🍳', gain: CAT_FEED_AFFECTION.cooked_fish },
    { id: 'fruit', name: 'Obst', emoji: '🍊', gain: CAT_FEED_AFFECTION.fruit },
    { id: 'berry', name: 'Beere', emoji: '🫐', gain: CAT_FEED_AFFECTION.berry },
    { id: 'hay', name: 'Heu', emoji: '🌾', gain: CAT_FEED_AFFECTION.hay },
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.icon}>{stage === 'kitten' ? '🐱' : '🐈'}</span>
          <div>
            <h3 style={styles.name}>
              {stage === 'kitten' ? 'Kätzchen' : 'Katze'}
            </h3>
            <span style={styles.stage}>
              {stage === 'kitten' ? 'Kätzchen' : 'Erwachsen'} • {ageDays} {ageDays === 1 ? 'Tag' : 'Tage'} alt
            </span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Zuneigungsbalken */}
        <div style={styles.section}>
          <div style={styles.barLabel}>
            <span style={{ color: affectionColor }}>❤️ Zuneigung</span>
            <span style={{ color: affectionColor, fontWeight: 'bold' }}>
              {affectionStatus} ({Math.round(affection)}%)
            </span>
          </div>
          <div style={styles.barBg}>
            <div style={{
              ...styles.barFill,
              width: `${affectionPercent * 100}%`,
              backgroundColor: affectionColor,
            }} />
          </div>
        </div>

        {/* Streicheln Button */}
        <div style={styles.section}>
          <button
            style={{
              ...styles.petBtn,
              opacity: canPet ? 1 : 0.5,
            }}
            onClick={() => canPet && onPet()}
            disabled={!canPet}
          >
            {canPet ? '🤗 Streicheln (+10 ❤️)' : `⏳ Cooldown ${cooldownText}`}
          </button>
        </div>

        {/* Füttern */}
        <div style={styles.section}>
          <p style={styles.sectionTitle}>Füttern (erhöht Zuneigung)</p>
          <div style={styles.feedGrid}>
            {feedOptions.map(opt => {
              const count = inventory?.[opt.id]?.amount || 0;
              return (
                <button
                  key={opt.id}
                  style={{
                    ...styles.feedBtn,
                    opacity: count > 0 ? 1 : 0.4,
                  }}
                  onClick={() => count > 0 && onFeed(opt.id)}
                  disabled={count <= 0}
                >
                  <span style={styles.feedEmoji}>{opt.emoji}</span>
                  <span style={styles.feedName}>{opt.name}</span>
                  <span style={styles.feedGain}>+{opt.gain} ❤️</span>
                  <span style={styles.feedCount}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Info-Text */}
        <p style={styles.hint}>
          Deine Katze braucht tägliche Zuneigung. Streichle und füttere sie regelmäßig!
        </p>

        {/* Wegschicken */}
        <button style={styles.dismissBtn} onClick={onDismiss}>
          Wegschicken
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  panel: {
    backgroundColor: '#1a1a2e',
    border: '2px solid #FF69B4',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '400px',
    maxHeight: '85vh',
    overflowY: 'auto',
    padding: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px',
  },
  icon: {
    fontSize: '36px',
  },
  name: {
    margin: 0,
    color: '#fff',
    fontSize: '20px',
  },
  stage: {
    color: '#888',
    fontSize: '13px',
  },
  closeBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  section: {
    marginBottom: '14px',
  },
  barLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    marginBottom: '4px',
  },
  barBg: {
    width: '100%',
    height: '10px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '5px',
    transition: 'width 0.5s ease',
  },
  petBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#FF69B4',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#888',
    fontSize: '12px',
    margin: '0 0 8px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  feedGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  feedBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '8px 10px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid #444',
    borderRadius: '8px',
    cursor: 'pointer',
    minWidth: '65px',
    flex: '1 0 auto',
  },
  feedEmoji: {
    fontSize: '20px',
  },
  feedName: {
    color: '#ccc',
    fontSize: '11px',
  },
  feedGain: {
    color: '#FF69B4',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  feedCount: {
    color: '#666',
    fontSize: '10px',
  },
  hint: {
    color: '#666',
    fontSize: '12px',
    textAlign: 'center',
    margin: '0 0 14px',
  },
  dismissBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: 'transparent',
    color: '#888',
    border: '1px solid #444',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
  },
};
