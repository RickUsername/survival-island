// ============================================
// Cheat-Konsole - Zum Testen von Items
// ============================================
// Format: rick<itemname_deutsch><anzahl>
// Beispiel: rickholz50, rickstein55, rickkristall3

import React, { useState } from 'react';
import items from '../data/items';

// Deutsche Item-Namen auf Item-IDs mappen
const GERMAN_NAME_TO_ID = {};
for (const [id, item] of Object.entries(items)) {
  GERMAN_NAME_TO_ID[item.name.toLowerCase()] = id;
}

// Spezial-Cheats die keine Items sind
const SPECIAL_CHEATS = {
  'regen1': { type: 'weather', value: 'rainy', label: 'Regen aktiviert' },
  'regen0': { type: 'weather', value: 'sunny', label: 'Regen deaktiviert' },
  // Tier-Cheats
  'reiher': { type: 'animal', value: 'heron', label: '🐾 Reiher gespawnt' },
  'ziege': { type: 'animal', value: 'goat', label: '🐾 Ziege gespawnt' },
  'reh': { type: 'animal', value: 'deer', label: '🐾 Reh gespawnt' },
  'hase': { type: 'animal', value: 'rabbit', label: '🐾 Hase gespawnt' },
  // Baum-Stufen-Cheats
  'baum1': { type: 'tree_stage', value: 1, label: '🌱 Baum auf Stufe 1' },
  'baum2': { type: 'tree_stage', value: 2, label: '🌿 Baum auf Stufe 2' },
  'baum3': { type: 'tree_stage', value: 3, label: '🌿 Baum auf Stufe 3' },
  'baum4': { type: 'tree_stage', value: 4, label: '🪴 Baum auf Stufe 4' },
  'baum5': { type: 'tree_stage', value: 5, label: '🌳 Baum auf Stufe 5' },
  'baum6': { type: 'tree_stage', value: 6, label: '🌳 Baum auf Stufe 6' },
  'baum7': { type: 'tree_stage', value: 7, label: '🌳 Baum auf Stufe 7' },
  'baum8': { type: 'tree_stage', value: 8, label: '🌲 Baum auf Stufe 8' },
  'baum9': { type: 'tree_stage', value: 9, label: '🌲 Baum auf Stufe 9' },
  'baum10': { type: 'tree_stage', value: 10, label: '🌲 Baum auf Stufe 10 (Maximum)' },
  // Samen-Cheats
  'samen1': { type: 'item', itemId: 'tree_seed', amount: 1, label: '🌰 1x Baumsamen' },
  'samen2': { type: 'item', itemId: 'tree_seed', amount: 2, label: '🌰 2x Baumsamen' },
  'samen3': { type: 'item', itemId: 'tree_seed', amount: 3, label: '🌰 3x Baumsamen' },
  'samen4': { type: 'item', itemId: 'tree_seed', amount: 4, label: '🌰 4x Baumsamen' },
  'samen5': { type: 'item', itemId: 'tree_seed', amount: 5, label: '🌰 5x Baumsamen' },
  'samen6': { type: 'item', itemId: 'tree_seed', amount: 6, label: '🌰 6x Baumsamen' },
  'samen7': { type: 'item', itemId: 'tree_seed', amount: 7, label: '🌰 7x Baumsamen' },
  'samen8': { type: 'item', itemId: 'tree_seed', amount: 8, label: '🌰 8x Baumsamen' },
  'samen9': { type: 'item', itemId: 'tree_seed', amount: 9, label: '🌰 9x Baumsamen' },
  'samen10': { type: 'item', itemId: 'tree_seed', amount: 10, label: '🌰 10x Baumsamen' },
  // Unkraut/Heu-Cheats (simuliert X × 8h Spawns)
  'heu1': { type: 'weed_spawn', value: 1, label: '🌿 Unkraut: 8h Spawn (2 neue)' },
  'heu2': { type: 'weed_spawn', value: 2, label: '🌿 Unkraut: 16h Spawn (4 neue)' },
  'heu3': { type: 'weed_spawn', value: 3, label: '🌿 Unkraut: 24h Spawn (6 neue)' },
  'heu4': { type: 'weed_spawn', value: 4, label: '🌿 Unkraut: 32h Spawn (8 neue)' },
  'heu5': { type: 'weed_spawn', value: 5, label: '🌿 Unkraut: 40h Spawn (10 neue)' },
  'heu6': { type: 'weed_spawn', value: 6, label: '🌿 Unkraut: 48h Spawn (12 neue)' },
  'heu7': { type: 'weed_spawn', value: 7, label: '🌿 Unkraut: 56h Spawn (14 neue)' },
  'heu8': { type: 'weed_spawn', value: 8, label: '🌿 Unkraut: 64h Spawn (16 neue)' },
  'heu9': { type: 'weed_spawn', value: 9, label: '🌿 Unkraut: 72h Spawn (18 neue)' },
  'heu10': { type: 'weed_spawn', value: 10, label: '🌿 Unkraut: 80h Spawn (20 neue)' },
  // Werkzeug-Cheats
  'kristallaxt': { type: 'add_tool', value: 'crystal_axe', label: '🪓 Kristallaxt erhalten' },
  'steinaxt': { type: 'add_tool', value: 'stone_axe', label: '🪓 Steinaxt erhalten' },
  'holzaxt': { type: 'add_tool', value: 'wood_axe', label: '🪓 Holzaxt erhalten' },
  // Inventar leeren
  'inventar0': { type: 'clear_inventory', label: '🗑️ Inventar & Werkzeuge geleert' },
  // Cheat-Liste anzeigen
  'liste': { type: 'show_list', label: 'Cheat-Liste geöffnet' },
};

// Cheat-Code parsen: "rick<name><anzahl>" oder "rick<spezial>"
function parseCheatCode(code) {
  const trimmed = code.trim().toLowerCase();

  // Muss mit "rick" beginnen
  if (!trimmed.startsWith('rick')) return null;

  const rest = trimmed.slice(4); // "rick" entfernen
  if (!rest) return null;

  // Spezial-Cheats prüfen
  const special = SPECIAL_CHEATS[rest];
  if (special) {
    return { ...special, cheatType: 'special' };
  }

  // Zahl am Ende extrahieren
  const match = rest.match(/^(.+?)(\d+)$/);
  if (!match) return null;

  const germanName = match[1];
  const amount = parseInt(match[2], 10);

  if (isNaN(amount)) return null;

  // Bedürfnis-Cheats: essen/wasser/stimmung + Wert (0-100)
  const NEED_CHEATS = {
    'essen': { need: 'hunger', emoji: '🍖' },
    'wasser': { need: 'thirst', emoji: '💧' },
    'stimmung': { need: 'mood', emoji: '😊' },
  };
  const needCheat = NEED_CHEATS[germanName];
  if (needCheat && amount >= 0 && amount <= 100) {
    return {
      type: 'set_need',
      need: needCheat.need,
      value: amount,
      label: `${needCheat.emoji} ${germanName.charAt(0).toUpperCase() + germanName.slice(1)} auf ${amount}%`,
      cheatType: 'special',
    };
  }

  if (amount <= 0) return null;

  // Deutschen Namen auf Item-ID mappen
  const itemId = GERMAN_NAME_TO_ID[germanName];
  if (!itemId) return null;

  return { type: 'item', itemId, amount, itemName: items[itemId].name };
}

export default function CheatConsole({ onAddItem, onCheatCommand, onClose }) {
  const [input, setInput] = useState('');
  const [log, setLog] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const result = parseCheatCode(input);

    if (result && result.cheatType === 'special' && result.type === 'item') {
      // Spezial-Cheat der ein Item gibt (z.B. samen)
      onAddItem(result.itemId, result.amount);
      setLog(prev => [
        { text: `✓ ${result.label}`, success: true },
        ...prev.slice(0, 9),
      ]);
    } else if (result && result.cheatType === 'special') {
      onCheatCommand(result);
      setLog(prev => [
        { text: `✓ ${result.label}`, success: true },
        ...prev.slice(0, 9),
      ]);
    } else if (result && result.type === 'item') {
      onAddItem(result.itemId, result.amount);
      setLog(prev => [
        { text: `✓ ${result.amount}x ${result.itemName} hinzugefügt`, success: true },
        ...prev.slice(0, 9),
      ]);
    } else {
      setLog(prev => [
        { text: '✗ Ungültiger Code', success: false },
        ...prev.slice(0, 9),
      ]);
    }

    setInput('');
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>🔧 Cheat-Konsole</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Cheatcode"
            style={styles.input}
            autoFocus
          />
          <button type="submit" style={styles.submitBtn}>
            OK
          </button>
        </form>

        {/* Log */}
        {log.length > 0 && (
          <div style={styles.log}>
            {log.map((entry, i) => (
              <div
                key={i}
                style={{
                  ...styles.logEntry,
                  color: entry.success ? '#4ade80' : '#ef4444',
                }}
              >
                {entry.text}
              </div>
            ))}
          </div>
        )}
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
    border: '2px solid #e67e22',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '450px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid #333',
  },
  title: {
    margin: 0,
    color: '#e67e22',
    fontSize: '18px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  help: {
    padding: '10px 18px',
    backgroundColor: 'rgba(230, 126, 34, 0.1)',
    borderBottom: '1px solid #333',
  },
  helpText: {
    color: '#ccc',
    fontSize: '13px',
    margin: '0 0 4px',
  },
  helpExample: {
    color: '#888',
    fontSize: '12px',
    margin: 0,
  },
  code: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    color: '#e67e22',
  },
  form: {
    display: 'flex',
    gap: '8px',
    padding: '12px 18px',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    backgroundColor: '#0a0a1a',
    border: '2px solid #444',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    fontFamily: 'monospace',
    outline: 'none',
  },
  submitBtn: {
    padding: '10px 20px',
    backgroundColor: '#e67e22',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  itemList: {
    padding: '10px 18px',
    borderTop: '1px solid #333',
  },
  itemListTitle: {
    color: '#888',
    fontSize: '11px',
    margin: '0 0 6px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  itemGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  itemTag: {
    fontSize: '11px',
    color: '#ccc',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
  },
  log: {
    padding: '8px 18px 14px',
    maxHeight: '150px',
    overflowY: 'auto',
  },
  logEntry: {
    fontSize: '13px',
    fontFamily: 'monospace',
    padding: '3px 0',
  },
};
