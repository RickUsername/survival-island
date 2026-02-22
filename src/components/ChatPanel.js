// ============================================
// Chat-Panel - Nachrichten mit einem Freund
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMultiplayer } from '../contexts/MultiplayerContext';

export default function ChatPanel({ friendId, friendName, onClose }) {
  const mp = useMultiplayer();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const isOnline = mp?.isOnline(friendId);

  // Nachrichten laden
  useEffect(() => {
    if (!mp || !friendId) return;

    const load = async () => {
      const msgs = await mp.loadMessages(friendId);
      setMessages(msgs);
    };
    load();
  }, [mp, friendId]);

  // Live-Updates empfangen
  useEffect(() => {
    if (!mp) return;

    mp.setNewMessageCallback((newMsg) => {
      if (newMsg.sender_id === friendId) {
        setMessages(prev => [...prev, newMsg]);
      }
    });

    return () => mp.setNewMessageCallback(null);
  }, [mp, friendId]);

  // Scroll nach unten bei neuen Nachrichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || sending || !mp) return;
    setSending(true);

    const result = await mp.sendChatMessage(friendId, inputText.trim());
    if (result.success) {
      // Nachricht lokal hinzufuegen
      setMessages(prev => [...prev, {
        id: `local_${Date.now()}`,
        sender_id: mp.getUsername() ? 'self' : null, // placeholder
        receiver_id: friendId,
        content: inputText.trim(),
        created_at: new Date().toISOString(),
        _isMine: true,
      }]);
      setInputText('');
    }
    setSending(false);
  }, [inputText, sending, mp, friendId]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInfo}>
          <span style={{
            ...styles.onlineDot,
            backgroundColor: isOnline ? '#2ecc71' : '#666',
          }} />
          <span style={styles.headerName}>{friendName}</span>
        </div>
        <button style={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Nachrichten */}
      <div style={styles.messages}>
        {messages.length === 0 && (
          <p style={styles.emptyText}>
            Noch keine Nachrichten. Sag Hallo! 👋
          </p>
        )}
        {messages.map((msg, i) => {
          const isMine = msg._isMine || msg.receiver_id === friendId;
          return (
            <div
              key={msg.id || i}
              style={{
                ...styles.msgRow,
                justifyContent: isMine ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                ...styles.msgBubble,
                ...(isMine ? styles.msgMine : styles.msgTheirs),
              }}>
                <p style={styles.msgText}>{msg.content}</p>
                <span style={styles.msgTime}>
                  {new Date(msg.created_at).toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Offline-Hinweis */}
      {!isOnline && (
        <div style={styles.offlineHint}>
          {friendName} ist offline. Nachrichten werden zugestellt.
        </div>
      )}

      {/* Eingabe */}
      <div style={styles.inputRow}>
        <input
          style={styles.input}
          type="text"
          placeholder="Nachricht schreiben..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          maxLength={500}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: !inputText.trim() || sending ? 0.5 : 1,
          }}
          onClick={handleSend}
          disabled={!inputText.trim() || sending}
        >
          📨
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    width: '320px',
    maxHeight: '450px',
    backgroundColor: '#1a1a2e',
    border: '2px solid #3498db',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 180,
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  onlineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  headerName: {
    color: '#ddd',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '2px 6px',
  },
  messages: {
    flex: 1,
    overflow: 'auto',
    padding: '10px 12px',
    maxHeight: '300px',
    minHeight: '150px',
  },
  emptyText: {
    color: '#666',
    fontSize: '13px',
    textAlign: 'center',
    padding: '30px 0',
  },
  msgRow: {
    display: 'flex',
    marginBottom: '6px',
  },
  msgBubble: {
    maxWidth: '75%',
    padding: '8px 12px',
    borderRadius: '12px',
  },
  msgMine: {
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
    borderBottomRightRadius: '4px',
  },
  msgTheirs: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: '4px',
  },
  msgText: {
    color: '#ddd',
    fontSize: '13px',
    margin: 0,
    wordBreak: 'break-word',
  },
  msgTime: {
    color: '#666',
    fontSize: '10px',
    display: 'block',
    textAlign: 'right',
    marginTop: '2px',
  },
  offlineHint: {
    padding: '6px 12px',
    backgroundColor: 'rgba(241, 196, 15, 0.1)',
    color: '#f1c40f',
    fontSize: '11px',
    textAlign: 'center',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    padding: '10px 12px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
  },
  sendBtn: {
    padding: '8px 12px',
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
    border: '1px solid rgba(52, 152, 219, 0.5)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
};
