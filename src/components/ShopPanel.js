// ============================================
// Shop-Panel - Kauf mit Kristallen
// ============================================

import React, { useMemo } from 'react';
import items from '../data/items';

// Shop-Sortiment
// type: 'item' (geht ins Inventar) | 'chicken' (spawnt erwachsenes Huhn)
export const SHOP_OFFERS = [
  // 8 Blumensamen-Pakete (1 Kristall, je 8 Samen)
  { id: 'sunflower_seed_pack', type: 'item', itemId: 'sunflower_seed', amount: 8, costCrystals: 1 },
  { id: 'rose_seed_pack',      type: 'item', itemId: 'rose_seed',      amount: 8, costCrystals: 1 },
  { id: 'tulip_seed_pack',     type: 'item', itemId: 'tulip_seed',     amount: 8, costCrystals: 1 },
  { id: 'daisy_seed_pack',     type: 'item', itemId: 'daisy_seed',     amount: 8, costCrystals: 1 },
  { id: 'lavender_seed_pack',  type: 'item', itemId: 'lavender_seed',  amount: 8, costCrystals: 1 },
  { id: 'poppy_seed_pack',     type: 'item', itemId: 'poppy_seed',     amount: 8, costCrystals: 1 },
  { id: 'marigold_seed_pack', type: 'item', itemId: 'marigold_seed', amount: 8, costCrystals: 1 },
  { id: 'lily_seed_pack',      type: 'item', itemId: 'lily_seed',      amount: 8, costCrystals: 1 },
  // Erwachsene Hühner (legen täglich ein Ei)
  { id: 'chicken_buy', type: 'chicken', amount: 1, costCrystals: 2 },
];

export default function ShopPanel({ inventory, onPurchase, onClose }) {
  const crystals = inventory.crystal?.amount || 0;

  const offers = useMemo(() => {
    return SHOP_OFFERS.map(offer => {
      const itemDef = offer.type === 'item' ? items[offer.itemId] : null;
      const name = offer.type === 'chicken' ? 'Erwachsenes Huhn' : `${itemDef?.name || offer.itemId} (${offer.amount}er Pack)`;
      const desc = offer.type === 'chicken'
        ? 'Ein erwachsenes Huhn. Legt jeden Tag ein Ei.'
        : itemDef?.description || '';
      const color = offer.type === 'chicken' ? '#E8C8A0' : (itemDef?.color || '#888');
      return { ...offer, name, desc, color };
    });
  }, []);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>🛒 Shop</h2>
          <span style={styles.crystalCounter}>
            <span style={styles.crystalDot} /> {crystals} Kristall{crystals === 1 ? '' : 'e'}
          </span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <p style={styles.intro}>
          Bezahle mit Kristallen. Blumen können auf Grasflächen gepflanzt werden — nach 5 Tagen erblühen sie.
        </p>

        <div style={styles.offerList}>
          {offers.map(offer => {
            const canBuy = crystals >= offer.costCrystals;
            return (
              <div key={offer.id} style={styles.offerCard}>
                <div style={{ ...styles.offerIcon, backgroundColor: offer.color }}>
                  {offer.type === 'chicken' ? '🐔' : '🌱'}
                </div>
                <div style={styles.offerInfo}>
                  <div style={styles.offerName}>{offer.name}</div>
                  <div style={styles.offerDesc}>{offer.desc}</div>
                </div>
                <div style={styles.offerPrice}>
                  <span style={styles.priceCrystal} />
                  <span style={styles.priceText}>{offer.costCrystals}</span>
                </div>
                <button
                  style={{
                    ...styles.buyBtn,
                    ...(canBuy ? {} : styles.buyBtnDisabled),
                  }}
                  disabled={!canBuy}
                  onClick={() => onPurchase(offer)}
                >
                  {canBuy ? 'Kaufen' : 'Zu wenig Kristalle'}
                </button>
              </div>
            );
          })}
        </div>
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
    border: '2px solid #B0C4FF',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '550px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: '1px solid #333',
    gap: '12px',
  },
  title: { margin: 0, color: '#fff', fontSize: '18px', flex: 1 },
  crystalCounter: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#B0C4FF',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  crystalDot: {
    width: '12px',
    height: '12px',
    backgroundColor: '#E0E0FF',
    borderRadius: '3px',
    border: '1px solid #B0C4FF',
    boxShadow: '0 0 4px rgba(176, 196, 255, 0.6)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  intro: {
    color: '#aaa',
    fontSize: '12px',
    margin: '10px 18px 6px',
  },
  offerList: {
    overflowY: 'auto',
    padding: '8px',
    flex: 1,
  },
  offerCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: '6px',
  },
  offerIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  offerInfo: {
    flex: 1,
    minWidth: 0,
  },
  offerName: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  offerDesc: {
    color: '#888',
    fontSize: '11px',
    marginTop: '2px',
  },
  offerPrice: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#B0C4FF',
    fontWeight: 'bold',
  },
  priceCrystal: {
    width: '10px',
    height: '10px',
    backgroundColor: '#E0E0FF',
    borderRadius: '2px',
    boxShadow: '0 0 3px rgba(176, 196, 255, 0.6)',
  },
  priceText: {
    fontSize: '14px',
    fontFamily: 'monospace',
  },
  buyBtn: {
    padding: '8px 14px',
    backgroundColor: '#3a8ade',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  buyBtnDisabled: {
    backgroundColor: '#444',
    color: '#888',
    cursor: 'default',
  },
};
