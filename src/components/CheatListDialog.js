// ============================================
// Cheat-Liste - Verschiebbare Übersicht aller Cheats
// ============================================

import React, { useState, useRef, useCallback } from 'react';
import items from '../data/items';

const CHEAT_CATEGORIES = [
  {
    title: 'Wetter',
    cheats: [
      { code: 'rickregen1', desc: 'Regen aktivieren' },
      { code: 'rickregen0', desc: 'Regen deaktivieren' },
    ],
  },
  {
    title: 'Tiere',
    cheats: [
      { code: 'rickreiher', desc: 'Reiher spawnen' },
      { code: 'rickziege', desc: 'Ziege spawnen' },
      { code: 'rickreh', desc: 'Reh spawnen' },
      { code: 'rickhase', desc: 'Hase spawnen' },
    ],
  },
  {
    title: 'Katzen',
    cheats: [
      { code: 'rickei', desc: 'Mysteriöses Ei erhalten' },
      { code: 'rickkatze', desc: 'Katze spawnen' },
      { code: 'rickkatzenalter30', desc: 'Katzenalter auf 30 Tage' },
      { code: 'rickkatzenalter365', desc: 'Katze erwachsen machen' },
    ],
  },
  {
    title: 'Baum',
    cheats: [
      { code: 'rickbaum1 - rickbaum10', desc: 'Baumstufe setzen (1-10)' },
    ],
  },
  {
    title: 'Samen',
    cheats: [
      { code: 'ricksamen1 - ricksamen10', desc: 'Baumsamen erhalten (1-10 Stück)' },
    ],
  },
  {
    title: 'Items (Beispiele)',
    cheats: Object.values(items)
      .filter(i => i.category !== 'tool' && i.category !== 'special')
      .slice(0, 12)
      .map(i => ({
        code: `rick${i.name.toLowerCase().replace(/\s+/g, '')}5`,
        desc: `5x ${i.name}`,
      })),
  },
  {
    title: 'Werkzeuge (Beispiele)',
    cheats: Object.values(items)
      .filter(i => i.category === 'tool')
      .slice(0, 4)
      .map(i => ({
        code: `rick${i.name.toLowerCase().replace(/\s+/g, '')}1`,
        desc: `${i.name}`,
      })),
  },
];

export default function CheatListDialog({ onClose }) {
  const [pos, setPos] = useState({ x: 80, y: 60 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    e.preventDefault();
  }, [pos]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    setPos({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Touch-Support
  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    dragging.current = true;
    dragOffset.current = {
      x: t.clientX - pos.x,
      y: t.clientY - pos.y,
    };
  }, [pos]);

  const handleTouchMove = useCallback((e) => {
    if (!dragging.current) return;
    const t = e.touches[0];
    setPos({
      x: t.clientX - dragOffset.current.x,
      y: t.clientY - dragOffset.current.y,
    });
  }, []);

  const handleTouchEnd = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      style={styles.backdrop}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          ...styles.panel,
          left: pos.x,
          top: pos.y,
        }}
      >
        {/* Titelleiste (verschiebbar) */}
        <div
          style={styles.titleBar}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <span style={styles.title}>Cheat-Liste</span>
          <button style={styles.closeBtn} onClick={onClose}>X</button>
        </div>

        {/* Inhalt */}
        <div style={styles.content}>
          <p style={styles.hint}>
            Format: <code style={styles.code}>rick&lt;name&gt;&lt;anzahl&gt;</code>
          </p>

          {CHEAT_CATEGORIES.map((cat, ci) => (
            <div key={ci} style={styles.category}>
              <h4 style={styles.catTitle}>{cat.title}</h4>
              {cat.cheats.map((cheat, i) => (
                <div key={i} style={styles.cheatRow}>
                  <code style={styles.cheatCode}>{cheat.code}</code>
                  <span style={styles.cheatDesc}>{cheat.desc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    pointerEvents: 'auto',
  },
  panel: {
    position: 'absolute',
    width: '340px',
    maxHeight: '75vh',
    backgroundColor: '#1a1a2e',
    border: '2px solid #e67e22',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    backgroundColor: '#e67e22',
    cursor: 'grab',
    userSelect: 'none',
    touchAction: 'none',
  },
  title: {
    color: '#fff',
    fontSize: '15px',
    fontWeight: 'bold',
  },
  closeBtn: {
    background: 'none',
    border: '2px solid rgba(255,255,255,0.5)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    borderRadius: '4px',
    padding: '2px 8px',
    lineHeight: '1',
  },
  content: {
    padding: '10px 14px',
    overflowY: 'auto',
    flex: 1,
  },
  hint: {
    color: '#888',
    fontSize: '11px',
    margin: '0 0 10px',
  },
  code: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '1px 4px',
    borderRadius: '3px',
    fontFamily: 'monospace',
    color: '#e67e22',
  },
  category: {
    marginBottom: '12px',
  },
  catTitle: {
    color: '#e67e22',
    fontSize: '13px',
    margin: '0 0 4px',
    borderBottom: '1px solid #333',
    paddingBottom: '3px',
  },
  cheatRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '3px 0',
  },
  cheatCode: {
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#4ade80',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: '2px 6px',
    borderRadius: '3px',
    whiteSpace: 'nowrap',
    minWidth: '140px',
  },
  cheatDesc: {
    color: '#aaa',
    fontSize: '11px',
  },
};
