// ============================================
// Besuchs-Overlay - HUD waehrend Besuch
// ============================================

import React, { useState } from 'react';

export default function VisitOverlay({ role, partnerName, onLeave, onKick, onTrade }) {
  const [showRules, setShowRules] = useState(true);

  return (
    <>
      {/* Top-Banner */}
      <div style={styles.banner}>
        <span style={styles.bannerIcon}>
          {role === 'visitor' ? '🏝️' : '👋'}
        </span>
        <span style={styles.bannerText}>
          {role === 'visitor'
            ? `Du besuchst ${partnerName}'s Insel`
            : `${partnerName} besucht deine Insel`}
        </span>
      </div>

      {/* Action-Buttons (rechts oben) */}
      <div style={styles.actions}>
        {onTrade && (
          <button style={styles.tradeBtn} onClick={onTrade}>
            🤝 Handeln
          </button>
        )}
        {role === 'visitor' ? (
          <button style={styles.leaveBtn} onClick={onLeave}>
            🚪 Verlassen
          </button>
        ) : (
          <button style={styles.kickBtn} onClick={onKick}>
            ❌ Rauswerfen
          </button>
        )}
      </div>

      {/* Regeln-Hinweis (nur Besucher, einmal) */}
      {role === 'visitor' && showRules && (
        <div style={styles.rulesOverlay} onClick={() => setShowRules(false)}>
          <div style={styles.rulesBox} onClick={e => e.stopPropagation()}>
            <h3 style={styles.rulesTitle}>Willkommen auf {partnerName}'s Insel!</h3>
            <div style={styles.rulesList}>
              <p style={styles.ruleAllowed}>✅ Tiere streicheln und fuettern</p>
              <p style={styles.ruleAllowed}>✅ Handeln und Schenken</p>
              <p style={styles.ruleAllowed}>✅ Frei herumlaufen</p>
              <p style={styles.ruleDenied}>❌ Items aufsammeln</p>
              <p style={styles.ruleDenied}>❌ Gebaeude abreissen</p>
              <p style={styles.ruleDenied}>❌ Baeume faellen</p>
            </div>
            <button style={styles.rulesOkBtn} onClick={() => setShowRules(false)}>
              Verstanden!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  banner: {
    position: 'fixed',
    top: 'calc(50px + env(safe-area-inset-top, 0px))',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(52, 152, 219, 0.9)',
    color: '#fff',
    padding: '8px 20px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    zIndex: 200,
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 10px rgba(52, 152, 219, 0.3)',
  },
  bannerIcon: {
    fontSize: '18px',
  },
  bannerText: {
    fontSize: '13px',
  },
  actions: {
    position: 'fixed',
    top: 'calc(90px + env(safe-area-inset-top, 0px))',
    right: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: 200,
  },
  tradeBtn: {
    padding: '8px 14px',
    backgroundColor: 'rgba(241, 196, 15, 0.9)',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  leaveBtn: {
    padding: '8px 14px',
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  kickBtn: {
    padding: '8px 14px',
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  rulesOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 400,
  },
  rulesBox: {
    backgroundColor: '#1a1a2e',
    border: '2px solid #3498db',
    borderRadius: '16px',
    padding: '24px',
    width: '90%',
    maxWidth: '340px',
    textAlign: 'center',
  },
  rulesTitle: {
    color: '#3498db',
    fontSize: '16px',
    margin: '0 0 16px',
  },
  rulesList: {
    textAlign: 'left',
    marginBottom: '16px',
  },
  ruleAllowed: {
    color: '#2ecc71',
    fontSize: '13px',
    margin: '6px 0',
  },
  ruleDenied: {
    color: '#e74c3c',
    fontSize: '13px',
    margin: '6px 0',
  },
  rulesOkBtn: {
    padding: '10px 32px',
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
    color: '#3498db',
    border: '1px solid rgba(52, 152, 219, 0.5)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
};
