// ============================================
// Freundesliste - Suchen, Anfragen, Freunde
// ============================================

import React, { useState } from 'react';
import { useMultiplayer } from '../contexts/MultiplayerContext';

export default function FriendListPanel({ onOpenChat, onClose }) {
  const mp = useMultiplayer();
  const [searchName, setSearchName] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searchSuccess, setSearchSuccess] = useState('');
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState('friends'); // 'friends' | 'requests'

  if (!mp) return null;

  const { friends, pendingRequests, onlineUsers } = mp;

  const handleSendRequest = async () => {
    if (!searchName.trim() || sending) return;
    setSending(true);
    setSearchError('');
    setSearchSuccess('');

    const result = await mp.sendFriendRequest(searchName.trim());
    if (result.success) {
      setSearchSuccess(`Anfrage an "${searchName}" gesendet!`);
      setSearchName('');
    } else {
      setSearchError(result.error || 'Fehler beim Senden');
    }
    setSending(false);
  };

  const handleAccept = async (friendshipId, senderId) => {
    await mp.acceptFriendRequest(friendshipId, senderId);
  };

  const handleDecline = async (friendshipId) => {
    await mp.declineFriendRequest(friendshipId);
  };

  const handleRemove = async (friendshipId) => {
    if (window.confirm('Freund wirklich entfernen?')) {
      await mp.removeFriend(friendshipId);
    }
  };

  const handleVisit = async (friendId, friendName) => {
    const result = await mp.requestVisit(friendId, friendName);
    if (!result.success) {
      alert(result.error || 'Besuchsanfrage fehlgeschlagen');
    } else {
      alert('Besuchsanfrage gesendet! Warte auf Antwort...');
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>👥 Freunde</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Suche */}
        <div style={styles.searchSection}>
          <div style={styles.searchRow}>
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Benutzername eingeben..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendRequest()}
              maxLength={30}
            />
            <button
              style={{
                ...styles.searchBtn,
                opacity: sending || !searchName.trim() ? 0.5 : 1,
              }}
              onClick={handleSendRequest}
              disabled={sending || !searchName.trim()}
            >
              {sending ? '...' : '➕'}
            </button>
          </div>
          {searchError && <p style={styles.errorText}>{searchError}</p>}
          {searchSuccess && <p style={styles.successText}>{searchSuccess}</p>}
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(tab === 'friends' ? styles.tabActive : {}),
            }}
            onClick={() => setTab('friends')}
          >
            Freunde ({friends.length})
          </button>
          <button
            style={{
              ...styles.tab,
              ...(tab === 'requests' ? styles.tabActive : {}),
              position: 'relative',
            }}
            onClick={() => setTab('requests')}
          >
            Anfragen ({pendingRequests.length})
            {pendingRequests.length > 0 && (
              <span style={styles.requestBadge}>{pendingRequests.length}</span>
            )}
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {tab === 'friends' && (
            <>
              {friends.length === 0 ? (
                <p style={styles.emptyText}>
                  Noch keine Freunde. Suche oben nach einem Benutzernamen!
                </p>
              ) : (
                friends.map(friend => {
                  const isOnline = !!onlineUsers[friend.friendId];
                  return (
                    <div key={friend.friendshipId} style={styles.friendRow}>
                      <div style={styles.friendInfo}>
                        <span style={{
                          ...styles.onlineDot,
                          backgroundColor: isOnline ? '#2ecc71' : '#666',
                        }} />
                        <span style={styles.friendName}>
                          {friend.username}
                        </span>
                        <span style={styles.statusText}>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <div style={styles.friendActions}>
                        <button
                          style={styles.friendActionBtn}
                          onClick={() => onOpenChat(friend.friendId, friend.username)}
                          title="Chat"
                        >
                          💬
                        </button>
                        {isOnline && (
                          <button
                            style={styles.friendActionBtn}
                            onClick={() => handleVisit(friend.friendId, friend.username)}
                            title="Besuchen"
                          >
                            🏝️
                          </button>
                        )}
                        <button
                          style={styles.friendRemoveBtn}
                          onClick={() => handleRemove(friend.friendshipId)}
                          title="Entfernen"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {tab === 'requests' && (
            <>
              {pendingRequests.length === 0 ? (
                <p style={styles.emptyText}>Keine offenen Anfragen.</p>
              ) : (
                pendingRequests.map(req => (
                  <div key={req.friendshipId} style={styles.requestRow}>
                    <span style={styles.requestName}>{req.senderName}</span>
                    <div style={styles.requestActions}>
                      <button
                        style={styles.acceptReqBtn}
                        onClick={() => handleAccept(req.friendshipId, req.senderId)}
                      >
                        ✅ Annehmen
                      </button>
                      <button
                        style={styles.declineReqBtn}
                        onClick={() => handleDecline(req.friendshipId)}
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
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
    zIndex: 150,
  },
  panel: {
    backgroundColor: '#1a1a2e',
    border: '2px solid #3498db',
    borderRadius: '12px',
    padding: '0',
    width: '90%',
    maxWidth: '400px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  title: {
    color: '#3498db',
    fontSize: '18px',
    margin: 0,
  },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  searchSection: {
    padding: '12px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  searchRow: {
    display: 'flex',
    gap: '8px',
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  searchBtn: {
    padding: '8px 14px',
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
    color: '#3498db',
    border: '1px solid rgba(52, 152, 219, 0.5)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: '12px',
    margin: '6px 0 0',
  },
  successText: {
    color: '#2ecc71',
    fontSize: '12px',
    margin: '6px 0 0',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    padding: '10px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: '13px',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    color: '#3498db',
    borderBottomColor: '#3498db',
  },
  requestBadge: {
    marginLeft: '6px',
    backgroundColor: '#e74c3c',
    color: '#fff',
    fontSize: '10px',
    padding: '1px 5px',
    borderRadius: '8px',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '12px 20px',
  },
  emptyText: {
    color: '#666',
    fontSize: '13px',
    textAlign: 'center',
    padding: '20px 0',
  },
  friendRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  friendInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  onlineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  friendName: {
    color: '#ddd',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  statusText: {
    color: '#666',
    fontSize: '11px',
  },
  friendActions: {
    display: 'flex',
    gap: '6px',
  },
  friendActionBtn: {
    padding: '6px 8px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  friendRemoveBtn: {
    padding: '6px 8px',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    border: '1px solid rgba(231, 76, 60, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  requestRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  requestName: {
    color: '#ddd',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  requestActions: {
    display: 'flex',
    gap: '6px',
  },
  acceptReqBtn: {
    padding: '6px 12px',
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    color: '#2ecc71',
    border: '1px solid rgba(46, 204, 113, 0.4)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  declineReqBtn: {
    padding: '6px 8px',
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    color: '#e74c3c',
    border: '1px solid rgba(231, 76, 60, 0.4)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
};
