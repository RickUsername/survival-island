// ============================================
// Trade-Window - Handeln und Schenken
// ============================================

import React, { useCallback } from 'react';
import { useMultiplayer } from '../contexts/MultiplayerContext';
import items from '../data/items';

export default function TradeWindow({ myInventory, partnerName, onTradeComplete, onClose }) {
  const mp = useMultiplayer();
  const trade = mp?.activeTrade;

  if (!trade || !mp) return null;

  const isInitiator = trade.initiator_id === mp.getUserId();
  // Besser: Wir schauen welche Items "unsere" sind
  const myItems = isInitiator ? (trade.initiator_items || []) : (trade.partner_items || []);
  const theirItems = isInitiator ? (trade.partner_items || []) : (trade.initiator_items || []);
  const myConfirmed = isInitiator ? trade.initiator_confirmed : trade.partner_confirmed;
  const theirConfirmed = isInitiator ? trade.partner_confirmed : trade.initiator_confirmed;

  return (
    <TradeWindowInner
      trade={trade}
      mp={mp}
      myInventory={myInventory}
      partnerName={partnerName}
      myItems={myItems}
      theirItems={theirItems}
      myConfirmed={myConfirmed}
      theirConfirmed={theirConfirmed}
      isInitiator={isInitiator}
      onTradeComplete={onTradeComplete}
      onClose={onClose}
    />
  );
}

function TradeWindowInner({
  trade, mp, myInventory, partnerName,
  myItems, theirItems, myConfirmed, theirConfirmed,
  isInitiator, onTradeComplete, onClose,
}) {
  // Verfuegbare Items (die man handeln kann)
  const tradeableItems = Object.entries(myInventory || {})
    .filter(([id, data]) => data.amount > 0 && items[id])
    .map(([id, data]) => ({
      itemId: id,
      name: items[id].name,
      amount: data.amount,
      alreadyOffered: myItems.find(i => i.itemId === id)?.amount || 0,
    }));

  const handleAddItem = useCallback((itemId) => {
    const current = myItems.find(i => i.itemId === itemId);
    const inventoryAmount = myInventory[itemId]?.amount || 0;
    const currentOffer = current?.amount || 0;

    if (currentOffer >= inventoryAmount) return;

    const newItems = current
      ? myItems.map(i => i.itemId === itemId ? { ...i, amount: i.amount + 1 } : i)
      : [...myItems, { itemId, amount: 1 }];

    mp.updateMyTradeItems(newItems);
  }, [myItems, myInventory, mp]);

  const handleRemoveItem = useCallback((itemId) => {
    const current = myItems.find(i => i.itemId === itemId);
    if (!current) return;

    const newItems = current.amount <= 1
      ? myItems.filter(i => i.itemId !== itemId)
      : myItems.map(i => i.itemId === itemId ? { ...i, amount: i.amount - 1 } : i);

    mp.updateMyTradeItems(newItems);
  }, [myItems, mp]);

  const handleConfirm = useCallback(async () => {
    const result = await mp.confirmMyTrade();
    if (result && result.initiator_confirmed && result.partner_confirmed) {
      // Beide bestaetigt -> Trade wird vom Host ausgefuehrt
      if (onTradeComplete) {
        onTradeComplete(result);
      }
    }
  }, [mp, onTradeComplete]);

  const handleCancel = useCallback(async () => {
    await mp.cancelMyTrade();
    onClose();
  }, [mp, onClose]);

  return (
    <div style={styles.overlay}>
      <div style={styles.window}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>🤝 Handel</h2>
          <p style={styles.subtitle}>
            Du kannst auch schenken — lass die andere Seite einfach leer.
          </p>
        </div>

        {/* Dual-Panel */}
        <div style={styles.tradeArea}>
          {/* Mein Angebot */}
          <div style={styles.tradePanel}>
            <h3 style={styles.panelTitle}>Mein Angebot</h3>
            <div style={styles.offeredItems}>
              {myItems.length === 0 ? (
                <p style={styles.emptyOffer}>Keine Items gewaehlt</p>
              ) : (
                myItems.map(item => (
                  <div key={item.itemId} style={styles.offeredItem}>
                    <span style={styles.itemName}>
                      {items[item.itemId]?.name || item.itemId}
                    </span>
                    <div style={styles.amountControls}>
                      <button
                        style={styles.amountBtn}
                        onClick={() => handleRemoveItem(item.itemId)}
                      >-</button>
                      <span style={styles.amountText}>{item.amount}</span>
                      <button
                        style={styles.amountBtn}
                        onClick={() => handleAddItem(item.itemId)}
                      >+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Item-Auswahl */}
            <div style={styles.itemSelector}>
              <p style={styles.selectorLabel}>Item hinzufuegen:</p>
              <div style={styles.itemGrid}>
                {tradeableItems.map(item => (
                  <button
                    key={item.itemId}
                    style={{
                      ...styles.itemBtn,
                      opacity: item.alreadyOffered >= item.amount ? 0.4 : 1,
                    }}
                    onClick={() => handleAddItem(item.itemId)}
                    disabled={item.alreadyOffered >= item.amount}
                  >
                    <span style={styles.itemBtnName}>{item.name}</span>
                    <span style={styles.itemBtnCount}>
                      {item.alreadyOffered > 0
                        ? `${item.amount - item.alreadyOffered} uebrig`
                        : `×${item.amount}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bestaetigen */}
            <button
              style={{
                ...styles.confirmBtn,
                backgroundColor: myConfirmed ? 'rgba(46, 204, 113, 0.4)' : 'rgba(46, 204, 113, 0.15)',
                borderColor: myConfirmed ? '#2ecc71' : 'rgba(46, 204, 113, 0.3)',
              }}
              onClick={handleConfirm}
            >
              {myConfirmed ? '✅ Bestaetigt' : '☐ Bestaetigen'}
            </button>
          </div>

          {/* Divider */}
          <div style={styles.divider}>
            <span style={styles.dividerIcon}>⇄</span>
          </div>

          {/* Partner-Angebot */}
          <div style={styles.tradePanel}>
            <h3 style={styles.panelTitle}>{partnerName}'s Angebot</h3>
            <div style={styles.offeredItems}>
              {theirItems.length === 0 ? (
                <p style={styles.emptyOffer}>Keine Items gewaehlt</p>
              ) : (
                theirItems.map(item => (
                  <div key={item.itemId} style={styles.offeredItem}>
                    <span style={styles.itemName}>
                      {items[item.itemId]?.name || item.itemId}
                    </span>
                    <span style={styles.amountTextReadonly}>×{item.amount}</span>
                  </div>
                ))
              )}
            </div>

            {/* Partner-Bestaetigungs-Status */}
            <div style={styles.partnerStatus}>
              {theirConfirmed
                ? <span style={styles.confirmedText}>✅ Hat bestaetigt</span>
                : <span style={styles.waitingText}>⏳ Wartet...</span>}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={styles.buttons}>
          <button style={styles.cancelBtn} onClick={handleCancel}>
            Abbrechen
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
    zIndex: 250,
  },
  window: {
    backgroundColor: '#1a1a2e',
    border: '2px solid #f1c40f',
    borderRadius: '16px',
    padding: '20px',
    width: '95%',
    maxWidth: '600px',
    maxHeight: '85vh',
    overflow: 'auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '16px',
  },
  title: {
    color: '#f1c40f',
    fontSize: '20px',
    margin: '0 0 4px',
  },
  subtitle: {
    color: '#888',
    fontSize: '12px',
    margin: 0,
  },
  tradeArea: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  tradePanel: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '12px',
  },
  panelTitle: {
    color: '#ddd',
    fontSize: '14px',
    margin: '0 0 10px',
    textAlign: 'center',
  },
  offeredItems: {
    minHeight: '60px',
    marginBottom: '10px',
  },
  emptyOffer: {
    color: '#555',
    fontSize: '12px',
    textAlign: 'center',
    padding: '16px 0',
  },
  offeredItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '6px',
    marginBottom: '4px',
  },
  itemName: {
    color: '#ccc',
    fontSize: '12px',
  },
  amountControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  amountBtn: {
    width: '22px',
    height: '22px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '4px',
    color: '#ddd',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  amountText: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: 'bold',
    minWidth: '20px',
    textAlign: 'center',
  },
  amountTextReadonly: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  itemSelector: {
    marginBottom: '10px',
  },
  selectorLabel: {
    color: '#888',
    fontSize: '11px',
    margin: '0 0 6px',
  },
  itemGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    maxHeight: '100px',
    overflow: 'auto',
  },
  itemBtn: {
    padding: '4px 8px',
    backgroundColor: 'rgba(241, 196, 15, 0.1)',
    border: '1px solid rgba(241, 196, 15, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: '#ddd',
  },
  itemBtnName: {
    fontSize: '11px',
  },
  itemBtnCount: {
    fontSize: '9px',
    color: '#888',
  },
  confirmBtn: {
    width: '100%',
    padding: '10px',
    border: '1px solid',
    borderRadius: '8px',
    color: '#2ecc71',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
  },
  dividerIcon: {
    color: '#f1c40f',
    fontSize: '24px',
  },
  partnerStatus: {
    textAlign: 'center',
    padding: '10px 0',
  },
  confirmedText: {
    color: '#2ecc71',
    fontSize: '13px',
  },
  waitingText: {
    color: '#888',
    fontSize: '13px',
  },
  buttons: {
    display: 'flex',
    justifyContent: 'center',
  },
  cancelBtn: {
    padding: '10px 32px',
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    color: '#e74c3c',
    border: '1px solid rgba(231, 76, 60, 0.4)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
};
