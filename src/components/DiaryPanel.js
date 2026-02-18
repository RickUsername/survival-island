// ============================================
// Tagebuch-Panel - Lernfach-Tracking
// ============================================

import React, { useState } from 'react';

// Zeit formatieren: ms -> "Xh Ym" oder "Xm"
function formatTime(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function DiaryPanel({ diary, onAddTopic, onDeleteTopic, onClose }) {
  const [newTopicName, setNewTopicName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleAddTopic = () => {
    const trimmed = newTopicName.trim();
    if (!trimmed) return;
    onAddTopic(trimmed);
    setNewTopicName('');
  };

  const handleDelete = (topicId) => {
    if (confirmDelete === topicId) {
      onDeleteTopic(topicId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(topicId);
    }
  };

  // Sortiert nach totalTimeMs absteigend
  const sortedTopics = [...(diary.topics || [])].sort((a, b) => b.totalTimeMs - a.totalTimeMs);
  const totalAllTime = sortedTopics.reduce((sum, t) => sum + t.totalTimeMs, 0);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Tagebuch</h2>
          <button style={styles.closeBtn} onClick={onClose}>&#10005;</button>
        </div>

        {/* Gesamt-Lernzeit */}
        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>Gesamte Lernzeit</span>
          <span style={styles.totalTime}>{formatTime(totalAllTime)}</span>
        </div>

        {/* Neues Thema anlegen */}
        <div style={styles.addRow}>
          <input
            type="text"
            style={styles.input}
            placeholder="Neues Thema..."
            value={newTopicName}
            onChange={e => setNewTopicName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTopic()}
            maxLength={50}
          />
          <button
            style={{
              ...styles.addBtn,
              opacity: newTopicName.trim() ? 1 : 0.5,
            }}
            onClick={handleAddTopic}
            disabled={!newTopicName.trim()}
          >
            + Hinzuf.
          </button>
        </div>

        {/* Themen-Liste */}
        <div style={styles.topicList}>
          {sortedTopics.length === 0 ? (
            <p style={styles.empty}>
              Noch keine Themen angelegt.
              <br />
              <span style={styles.emptyHint}>
                Lege ein Thema an und starte eine Sammelreise, um deine Lernzeit zu tracken.
              </span>
            </p>
          ) : (
            sortedTopics.map(topic => (
              <div key={topic.id} style={styles.topicRow}>
                <div style={styles.topicInfo}>
                  <span style={styles.topicName}>{topic.name}</span>
                  <span style={styles.topicTime}>{formatTime(topic.totalTimeMs)}</span>
                </div>
                <button
                  style={{
                    ...styles.deleteBtn,
                    backgroundColor: confirmDelete === topic.id
                      ? 'rgba(231, 76, 60, 0.8)'
                      : 'rgba(255,255,255,0.08)',
                  }}
                  onClick={() => handleDelete(topic.id)}
                >
                  {confirmDelete === topic.id ? 'Sicher?' : 'X'}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Hinweis */}
        <div style={styles.hint}>
          Themen bleiben auch nach dem Tod erhalten.
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
    border: '2px solid #8B7355',
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
    color: '#8B7355',
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
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 18px',
    backgroundColor: 'rgba(139, 115, 85, 0.15)',
    borderBottom: '1px solid #333',
  },
  totalLabel: {
    color: '#aaa',
    fontSize: '13px',
  },
  totalTime: {
    color: '#8B7355',
    fontSize: '18px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  addRow: {
    display: 'flex',
    gap: '8px',
    padding: '12px 18px',
    borderBottom: '1px solid #333',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    backgroundColor: '#0a0a1a',
    border: '2px solid #444',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  addBtn: {
    padding: '10px 14px',
    backgroundColor: '#8B7355',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  topicList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 18px',
    maxHeight: '300px',
  },
  empty: {
    color: '#888',
    fontSize: '14px',
    textAlign: 'center',
    padding: '20px 0',
    lineHeight: '1.6',
  },
  emptyHint: {
    color: '#666',
    fontSize: '12px',
  },
  topicRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  topicInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },
  topicName: {
    color: '#ddd',
    fontSize: '14px',
  },
  topicTime: {
    color: '#8B7355',
    fontSize: '13px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  deleteBtn: {
    border: 'none',
    color: '#999',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: '6px',
    marginLeft: '8px',
  },
  hint: {
    padding: '10px 18px',
    color: '#666',
    fontSize: '11px',
    textAlign: 'center',
    borderTop: '1px solid #333',
  },
};
