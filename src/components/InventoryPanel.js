// ============================================
// Inventar-Panel Komponente
// ============================================

import React, { useMemo } from 'react';
import items from '../data/items';

// Haltbarkeit als Text formatieren
function formatDurability(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${Math.round(minutes)}m`;
}

// Tier-Farben
const TIER_COLORS = {
  wood: '#A0712B',
  stone: '#808080',
  crystal: '#B0C4FF',
};

const TIER_NAMES = {
  wood: 'Holz',
  stone: 'Stein',
  crystal: 'Kristall',
};

export default function InventoryPanel({ inventory, tools, onConsume, onPlant, onClose }) {
  // Alphabetisch sortierte Item-Liste
  const sortedItems = useMemo(() => {
    const list = [];

    // Inventar-Items
    for (const [itemId, data] of Object.entries(inventory)) {
      const itemDef = items[itemId];
      if (itemDef && data.amount > 0) {
        list.push({
          ...itemDef,
          amount: data.amount,
          collectedAt: data.collectedAt,
          canConsume: itemDef.category === 'food' || itemDef.category === 'water',
          plantable: !!itemDef.plantable,
        });
      }
    }

    // Werkzeuge (jetzt Objekte mit Haltbarkeit)
    for (const tool of tools) {
      const itemDef = items[tool.id];
      if (itemDef) {
        const maxDur = itemDef.durability || 60;
        const durPercent = Math.round((tool.durability / maxDur) * 100);
        list.push({
          ...itemDef,
          amount: 1,
          isTool: true,
          canConsume: false,
          toolDurability: tool.durability,
          toolMaxDurability: maxDur,
          toolDurabilityPercent: durPercent,
          toolTier: tool.tier,
        });
      }
    }

    return list.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [inventory, tools]);

  const totalItems = sortedItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Inventar</h2>
          <span style={styles.count}>{totalItems} Gegenstände</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.itemList}>
          {sortedItems.length === 0 ? (
            <p style={styles.empty}>Keine Gegenstände vorhanden.</p>
          ) : (
            sortedItems.map((item, index) => (
              <div key={`${item.id}-${index}`} style={styles.itemRow}>
                <div
                  style={{
                    ...styles.itemIcon,
                    backgroundColor: item.color || '#666',
                  }}
                />
                <div style={styles.itemInfo}>
                  <span style={styles.itemName}>
                    {item.name}
                    {item.isTool && (
                      <span
                        style={{
                          ...styles.toolBadge,
                          backgroundColor: TIER_COLORS[item.toolTier] || '#e67e22',
                        }}
                      >
                        {TIER_NAMES[item.toolTier] || 'Werkzeug'}
                      </span>
                    )}
                  </span>
                  {item.isTool ? (
                    <div style={styles.durabilityContainer}>
                      <div style={styles.durabilityBarBg}>
                        <div
                          style={{
                            ...styles.durabilityBarFill,
                            width: `${item.toolDurabilityPercent}%`,
                            backgroundColor: item.toolDurabilityPercent > 30 ? '#4ade80'
                              : item.toolDurabilityPercent > 10 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span style={styles.durabilityText}>
                        {formatDurability(item.toolDurability)} / {formatDurability(item.toolMaxDurability)}
                      </span>
                    </div>
                  ) : (
                    <span style={styles.itemDesc}>{item.description}</span>
                  )}
                </div>
                <span style={styles.itemAmount}>
                  {item.isTool ? '' : `x${item.amount}`}
                </span>
                {item.canConsume && (
                  <button
                    style={styles.consumeBtn}
                    onClick={() => onConsume(item.id)}
                  >
                    {item.category === 'water' ? 'Trinken' : 'Essen'}
                  </button>
                )}
                {item.plantable && onPlant && (
                  <button
                    style={styles.plantBtn}
                    onClick={() => onPlant(item.id)}
                  >
                    Pflanzen
                  </button>
                )}
              </div>
            ))
          )}
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
    zIndex: 100,
  },
  panel: {
    backgroundColor: '#1a1a2e',
    border: '2px solid #444',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: '1px solid #333',
    gap: '10px',
  },
  title: {
    margin: 0,
    color: '#fff',
    fontSize: '18px',
    flex: 1,
  },
  count: {
    color: '#999',
    fontSize: '13px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  itemList: {
    overflowY: 'auto',
    padding: '8px',
    flex: 1,
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    padding: '30px',
    fontSize: '14px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: '4px',
  },
  itemIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  itemName: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  itemDesc: {
    color: '#888',
    fontSize: '11px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  toolBadge: {
    fontSize: '9px',
    color: '#fff',
    padding: '1px 6px',
    borderRadius: '4px',
    fontWeight: 'normal',
  },
  durabilityContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '3px',
  },
  durabilityBarBg: {
    flex: 1,
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  durabilityBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s',
  },
  durabilityText: {
    color: '#888',
    fontSize: '10px',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
  },
  itemAmount: {
    color: '#ccc',
    fontSize: '14px',
    fontFamily: 'monospace',
    minWidth: '36px',
    textAlign: 'right',
  },
  consumeBtn: {
    padding: '6px 12px',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  plantBtn: {
    padding: '6px 12px',
    backgroundColor: '#8B6914',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
};
