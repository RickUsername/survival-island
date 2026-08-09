// ============================================
// Handelsfenster des wandernden Händlers
// ============================================
// Er nimmt kein Geld — es wird Ware gegen Ware getauscht. Jedes Angebot
// gilt einmal pro Besuchstag.

import React from 'react';
import items from '../data/items';
import {
  getMerchantStock, canAfford, itemName, getGreeting, daysUntilMerchant,
} from '../systems/MerchantSystem';

export default function MerchantDialog({ gameState, onClose, onTrade }) {
  const stock = getMerchantStock();
  const traded = gameState?.merchantTraded || [];
  const inventory = gameState?.inventory || {};

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.avatar}>🧙</span>
          <div>
            <h3 style={styles.title}>Wandernder Händler</h3>
            <p style={styles.greeting}>„{getGreeting()}"</p>
          </div>
        </div>

        <div style={styles.list}>
          {stock.map(offer => {
            const done = traded.includes(offer.id);
            const affordable = canAfford(offer, inventory);
            return (
              <div key={offer.id} style={{ ...styles.offer, opacity: done ? 0.45 : 1 }}>
                <div style={styles.offerCols}>
                  <div style={styles.side}>
                    {offer.give.map(g => (
                      <div key={g.id} style={styles.stack}>
                        <span style={{ ...styles.dot, background: items[g.id]?.color || '#888' }} />
                        <span style={styles.amount}>{g.amount}×</span>
                        <span style={styles.name}>{itemName(g.id)}</span>
                        <span style={{
                          ...styles.have,
                          color: (inventory[g.id]?.amount || 0) >= g.amount ? '#7fd6a0' : '#e08a8a',
                        }}>
                          ({inventory[g.id]?.amount || 0})
                        </span>
                      </div>
                    ))}
                  </div>

                  <span style={styles.arrow}>→</span>

                  <div style={styles.side}>
                    <div style={styles.stack}>
                      <span style={{ ...styles.dot, background: items[offer.get.id]?.color || '#888' }} />
                      <span style={styles.amount}>{offer.get.amount}×</span>
                      <span style={{ ...styles.name, color: '#ffe08a' }}>{offer.getName}</span>
                    </div>
                  </div>
                </div>

                <button
                  style={{
                    ...styles.tradeBtn,
                    ...(done || !affordable ? styles.tradeBtnOff : {}),
                  }}
                  disabled={done || !affordable}
                  onClick={() => onTrade(offer)}
                >
                  {done ? '✓ Getauscht' : affordable ? 'Tauschen' : 'Zu wenig'}
                </button>
              </div>
            );
          })}
        </div>

        <p style={styles.footer}>
          Er bleibt nur heute. Nächster Besuch in {daysUntilMerchant(Date.now() + 86400000) + 1} Tagen.
        </p>
        <button style={styles.close} onClick={onClose}>Schließen</button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: '16px',
  },
  dialog: {
    background: '#241f2e', borderRadius: '16px', padding: '18px',
    width: 'min(520px, 95vw)', maxHeight: '90dvh', overflowY: 'auto',
    border: '2px solid rgba(200,170,255,0.2)',
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  header: { display: 'flex', gap: '12px', alignItems: 'center' },
  avatar: { fontSize: '38px' },
  title: { color: '#fff', margin: 0, fontSize: '18px' },
  greeting: { color: '#b6a8d0', margin: '4px 0 0', fontSize: '13px', fontStyle: 'italic' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  offer: {
    background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  offerCols: { display: 'flex', alignItems: 'center', gap: '10px' },
  side: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  stack: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  dot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  amount: { color: '#fff', fontWeight: 'bold' },
  name: { color: '#cfd6e2' },
  have: { fontSize: '11px' },
  arrow: { color: '#8a7fb0', fontSize: '20px' },
  tradeBtn: {
    padding: '10px', borderRadius: '9px', border: '1px solid #7a63b8',
    background: '#5b468a', color: '#fff', fontWeight: 'bold',
    fontSize: '14px', cursor: 'pointer',
  },
  tradeBtnOff: {
    background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)',
    color: '#8a8a96', cursor: 'default',
  },
  footer: { color: '#8a80a0', fontSize: '12px', textAlign: 'center', margin: 0 },
  close: {
    padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 'bold', cursor: 'pointer',
  },
};
