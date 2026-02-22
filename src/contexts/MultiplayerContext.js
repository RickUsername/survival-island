// ============================================
// Multiplayer-Context - Realtime, Freunde, Besuche
// ============================================

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { getFriendsWithNames, getPendingRequestsWithNames, sendFriendRequest as sendFriendRequestApi, acceptFriendRequest as acceptFriendRequestApi, declineFriendRequest as declineFriendRequestApi, removeFriend as removeFriendApi } from '../systems/FriendSystem';
import { sendMessage as sendMessageApi, getMessages as getMessagesApi, markAsRead as markAsReadApi, getUnreadCount as getUnreadCountApi, subscribeToNewMessages, unsubscribeFromMessages } from '../systems/ChatSystem';
import { requestVisit as requestVisitApi, acceptVisit as acceptVisitApi, endVisit as endVisitApi } from '../systems/VisitSystem';
import { initiateTrade as initiateTradeApi, updateTradeItems as updateTradeItemsApi, confirmTrade as confirmTradeApi, cancelTrade as cancelTradeApi, completeTrade as completeTradeApi } from '../systems/TradeSystem';

const MultiplayerContext = createContext(null);

export function MultiplayerProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const username = user?.user_metadata?.username || 'Unbekannt';

  // --- State ---
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({}); // { [userId]: { username, online_at } }
  const [unreadCount, setUnreadCount] = useState(0);

  // Besuch
  const [activeVisit, setActiveVisit] = useState(null);
  // { sessionId, role: 'host'|'visitor', partnerId, partnerName }
  const [visitorPosition, setVisitorPosition] = useState(null); // Host sieht Besucher
  const [hostSnapshot, setHostSnapshot] = useState(null); // Besucher sieht Host-Insel
  const [incomingVisitRequest, setIncomingVisitRequest] = useState(null);

  // Trade
  const [activeTrade, setActiveTrade] = useState(null);

  // Refs fuer Channels
  const lobbyChannelRef = useRef(null);
  const notificationChannelRef = useRef(null);
  const visitChannelRef = useRef(null);
  const messageSubscriptionRef = useRef(null);
  const positionIntervalRef = useRef(null);

  // --- Lobby Presence (Online-Status) ---
  useEffect(() => {
    if (!supabase || !userId) return;

    const channel = supabase.channel('presence:lobby', {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = {};
        for (const [key, presences] of Object.entries(state)) {
          if (presences.length > 0) {
            online[key] = {
              username: presences[0].username,
              online_at: presences[0].online_at,
            };
          }
        }
        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            username,
            online_at: new Date().toISOString(),
          });
        }
      });

    lobbyChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      lobbyChannelRef.current = null;
    };
  }, [userId, username]);

  // --- Notifications Channel (Freundschafts-/Besuchsanfragen) ---
  useEffect(() => {
    if (!supabase || !userId) return;

    const channel = supabase.channel(`notifications:${userId}`);

    channel
      .on('broadcast', { event: 'friend_request' }, ({ payload }) => {
        // Neue Freundschaftsanfrage empfangen
        setPendingRequests(prev => [...prev, payload]);
      })
      .on('broadcast', { event: 'friend_accepted' }, () => {
        // Freundschaft angenommen -> Liste aktualisieren
        loadFriends();
      })
      .on('broadcast', { event: 'visit_request' }, ({ payload }) => {
        // Besuchsanfrage empfangen
        setIncomingVisitRequest(payload);
      })
      .on('broadcast', { event: 'visit_accepted' }, ({ payload }) => {
        // Besuch wurde angenommen -> Besucher wechselt in Visit-Mode
        setActiveVisit({
          sessionId: payload.sessionId,
          role: 'visitor',
          partnerId: payload.hostId,
          partnerName: payload.hostName,
        });
        setHostSnapshot(payload.snapshot);
      })
      .on('broadcast', { event: 'visit_ended' }, () => {
        // Besuch wurde beendet
        handleVisitEnd();
      })
      .on('broadcast', { event: 'trade_request' }, ({ payload }) => {
        // Trade-Anfrage empfangen
        setActiveTrade(payload.trade);
      })
      .on('broadcast', { event: 'trade_update' }, ({ payload }) => {
        // Trade-Items aktualisiert
        setActiveTrade(prev => {
          if (!prev) return null;
          const updated = { ...prev, ...payload };
          // Wenn beide bestaetigt haben → Trade-Complete Callback auslösen
          if (updated.initiator_confirmed && updated.partner_confirmed) {
            // Kurz verzoegert, damit State erst gesetzt wird
            setTimeout(() => {
              if (tradeCompleteCallbackRef.current) {
                tradeCompleteCallbackRef.current(updated);
              }
            }, 100);
          }
          return updated;
        });
      })
      .on('broadcast', { event: 'trade_cancelled' }, () => {
        setActiveTrade(null);
      })
      .on('broadcast', { event: 'trade_completed' }, () => {
        setActiveTrade(null);
      })
      .subscribe();

    notificationChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      notificationChannelRef.current = null;
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Visit Channel (Positions-Sync + Aktionen) ---
  useEffect(() => {
    if (!supabase || !activeVisit) {
      // Cleanup
      if (visitChannelRef.current) {
        supabase?.removeChannel(visitChannelRef.current);
        visitChannelRef.current = null;
      }
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }
      setVisitorPosition(null);
      return;
    }

    const channel = supabase.channel(`visit:${activeVisit.sessionId}`);

    channel
      .on('broadcast', { event: 'visitor_position' }, ({ payload }) => {
        // Host empfaengt Besucher-Position
        if (activeVisit.role === 'host') {
          setVisitorPosition(payload);
        }
      })
      .on('broadcast', { event: 'host_position' }, ({ payload }) => {
        // Besucher empfaengt Host-Position
        if (activeVisit.role === 'visitor') {
          setHostSnapshot(prev => prev ? { ...prev, hostPlayer: payload } : null);
        }
      })
      .on('broadcast', { event: 'visitor_action' }, ({ payload }) => {
        // Host empfaengt Besucher-Aktion (pet, feed, etc.)
        if (activeVisit.role === 'host' && visitorActionCallbackRef.current) {
          visitorActionCallbackRef.current(payload);
        }
      })
      .on('broadcast', { event: 'snapshot_update' }, ({ payload }) => {
        // Besucher empfaengt aktualisiertes Snapshot
        if (activeVisit.role === 'visitor' && payload.snapshot) {
          setHostSnapshot(payload.snapshot);
        }
      })
      .subscribe();

    visitChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      visitChannelRef.current = null;
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }
    };
  }, [activeVisit]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Message Subscription ---
  useEffect(() => {
    if (!supabase || !userId) return;

    const channel = subscribeToNewMessages(userId, (newMessage) => {
      setUnreadCount(prev => prev + 1);
      // Wenn Chat offen ist, wird die Nachricht dort gehandelt
      if (newMessageCallbackRef.current) {
        newMessageCallbackRef.current(newMessage);
      }
    });

    messageSubscriptionRef.current = channel;

    return () => {
      unsubscribeFromMessages(channel);
      messageSubscriptionRef.current = null;
    };
  }, [userId]);

  // --- Callbacks fuer Game.js ---
  const visitorActionCallbackRef = useRef(null);
  const inventoryUpdateCallbackRef = useRef(null);
  const newMessageCallbackRef = useRef(null);
  const tradeCompleteCallbackRef = useRef(null);

  const setVisitorActionCallback = useCallback((cb) => {
    visitorActionCallbackRef.current = cb;
  }, []);

  const setInventoryUpdateCallback = useCallback((cb) => {
    inventoryUpdateCallbackRef.current = cb;
  }, []);

  const setNewMessageCallback = useCallback((cb) => {
    newMessageCallbackRef.current = cb;
  }, []);

  const setTradeCompleteCallback = useCallback((cb) => {
    tradeCompleteCallbackRef.current = cb;
  }, []);

  // --- Initiale Daten laden ---
  const loadFriends = useCallback(async () => {
    if (!userId) return;
    const data = await getFriendsWithNames(userId);
    setFriends(data);
  }, [userId]);

  const loadPendingRequests = useCallback(async () => {
    if (!userId) return;
    const data = await getPendingRequestsWithNames(userId);
    setPendingRequests(data);
  }, [userId]);

  const loadUnreadCount = useCallback(async () => {
    if (!userId) return;
    const count = await getUnreadCountApi(userId);
    setUnreadCount(count);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadFriends();
      loadPendingRequests();
      loadUnreadCount();
    }
  }, [userId, loadFriends, loadPendingRequests, loadUnreadCount]);

  // --- Freundschafts-Funktionen ---
  const sendFriendRequest = useCallback(async (targetUsername) => {
    if (!userId) return { success: false, error: 'Nicht eingeloggt' };
    const result = await sendFriendRequestApi(userId, targetUsername);

    if (result.success && result.targetId) {
      // Notification an Ziel-User senden
      const targetChannel = supabase?.channel(`notifications:${result.targetId}`);
      if (targetChannel) {
        await targetChannel.send({
          type: 'broadcast',
          event: 'friend_request',
          payload: { senderId: userId, senderName: username },
        });
        supabase.removeChannel(targetChannel);
      }
      await loadFriends();
    }
    return result;
  }, [userId, username, loadFriends]);

  const acceptFriendRequest = useCallback(async (friendshipId, senderId) => {
    const result = await acceptFriendRequestApi(friendshipId);
    if (result.success) {
      // Notification an Absender
      const senderChannel = supabase?.channel(`notifications:${senderId}`);
      if (senderChannel) {
        await senderChannel.send({
          type: 'broadcast',
          event: 'friend_accepted',
          payload: { userId, username },
        });
        supabase.removeChannel(senderChannel);
      }
      await loadFriends();
      await loadPendingRequests();
    }
    return result;
  }, [userId, username, loadFriends, loadPendingRequests]);

  const declineFriendRequest = useCallback(async (friendshipId) => {
    const result = await declineFriendRequestApi(friendshipId);
    if (result.success) {
      await loadPendingRequests();
    }
    return result;
  }, [loadPendingRequests]);

  const removeFriend = useCallback(async (friendshipId) => {
    const result = await removeFriendApi(friendshipId);
    if (result.success) {
      await loadFriends();
    }
    return result;
  }, [loadFriends]);

  // --- Chat-Funktionen ---
  const sendChatMessage = useCallback(async (receiverId, content) => {
    if (!userId) return { success: false };
    return await sendMessageApi(userId, receiverId, content);
  }, [userId]);

  const loadMessages = useCallback(async (friendId) => {
    if (!userId) return [];
    const msgs = await getMessagesApi(userId, friendId);
    await markAsReadApi(userId, friendId);
    await loadUnreadCount();
    return msgs;
  }, [userId, loadUnreadCount]);

  // --- Besuchs-Funktionen ---
  const requestVisit = useCallback(async (hostId, hostName) => {
    if (!userId) return { success: false };
    const result = await requestVisitApi(userId, hostId);

    if (result.success) {
      // Notification an Host senden
      const hostChannel = supabase?.channel(`notifications:${hostId}`);
      if (hostChannel) {
        await hostChannel.send({
          type: 'broadcast',
          event: 'visit_request',
          payload: {
            sessionId: result.session.id,
            visitorId: userId,
            visitorName: username,
          },
        });
        supabase.removeChannel(hostChannel);
      }
    }
    return result;
  }, [userId, username]);

  const acceptVisitRequest = useCallback(async (sessionId, gameState) => {
    const result = await acceptVisitApi(sessionId, gameState);

    if (result.success) {
      const session = result.session;
      setActiveVisit({
        sessionId: session.id,
        role: 'host',
        partnerId: session.visitor_id,
        partnerName: incomingVisitRequest?.visitorName || 'Besucher',
      });
      setIncomingVisitRequest(null);

      // Notification an Besucher: Besuch angenommen
      const visitorChannel = supabase?.channel(`notifications:${session.visitor_id}`);
      if (visitorChannel) {
        await visitorChannel.send({
          type: 'broadcast',
          event: 'visit_accepted',
          payload: {
            sessionId: session.id,
            hostId: userId,
            hostName: username,
            snapshot: session.host_snapshot,
          },
        });
        supabase.removeChannel(visitorChannel);
      }
    }
    return result;
  }, [userId, username, incomingVisitRequest]);

  const declineVisitRequest = useCallback(async (sessionId) => {
    await endVisitApi(sessionId);
    setIncomingVisitRequest(null);
  }, []);

  const handleVisitEnd = useCallback(() => {
    setActiveVisit(null);
    setVisitorPosition(null);
    setHostSnapshot(null);
    setActiveTrade(null);
  }, []);

  const leaveVisit = useCallback(async () => {
    if (!activeVisit) return;
    await endVisitApi(activeVisit.sessionId);

    // Partner benachrichtigen
    const partnerChannel = supabase?.channel(`notifications:${activeVisit.partnerId}`);
    if (partnerChannel) {
      await partnerChannel.send({
        type: 'broadcast',
        event: 'visit_ended',
        payload: { sessionId: activeVisit.sessionId },
      });
      supabase.removeChannel(partnerChannel);
    }

    handleVisitEnd();
  }, [activeVisit, handleVisitEnd]);

  // --- Position broadcasten (Besucher) ---
  const broadcastPosition = useCallback((x, y) => {
    if (!visitChannelRef.current || !activeVisit) return;

    const event = activeVisit.role === 'visitor' ? 'visitor_position' : 'host_position';
    visitChannelRef.current.send({
      type: 'broadcast',
      event,
      payload: { x, y, username },
    });
  }, [activeVisit, username]);

  // --- Besucher-Aktion broadcasten ---
  const broadcastVisitorAction = useCallback((action) => {
    if (!visitChannelRef.current || activeVisit?.role !== 'visitor') return;

    visitChannelRef.current.send({
      type: 'broadcast',
      event: 'visitor_action',
      payload: action,
    });
  }, [activeVisit]);

  // --- Snapshot-Update senden (Host) ---
  const broadcastSnapshotUpdate = useCallback((snapshot) => {
    if (!visitChannelRef.current || activeVisit?.role !== 'host') return;

    visitChannelRef.current.send({
      type: 'broadcast',
      event: 'snapshot_update',
      payload: { snapshot },
    });
  }, [activeVisit]);

  // --- Trade-Funktionen ---
  const startTrade = useCallback(async () => {
    if (!activeVisit || !userId) return { success: false };

    const result = await initiateTradeApi(
      activeVisit.sessionId,
      userId,
      activeVisit.partnerId
    );

    if (result.success) {
      setActiveTrade(result.trade);

      // Partner benachrichtigen
      const partnerChannel = supabase?.channel(`notifications:${activeVisit.partnerId}`);
      if (partnerChannel) {
        await partnerChannel.send({
          type: 'broadcast',
          event: 'trade_request',
          payload: { trade: result.trade },
        });
        supabase.removeChannel(partnerChannel);
      }
    }
    return result;
  }, [activeVisit, userId]);

  const updateMyTradeItems = useCallback(async (items) => {
    if (!activeTrade || !userId) return;

    const isInitiator = activeTrade.initiator_id === userId;
    await updateTradeItemsApi(activeTrade.id, userId, items, isInitiator);

    // Lokales Update
    const updateData = isInitiator
      ? { initiator_items: items, initiator_confirmed: false, partner_confirmed: false }
      : { partner_items: items, initiator_confirmed: false, partner_confirmed: false };
    setActiveTrade(prev => prev ? { ...prev, ...updateData } : null);

    // Partner benachrichtigen
    if (activeVisit) {
      const partnerChannel = supabase?.channel(`notifications:${activeVisit.partnerId}`);
      if (partnerChannel) {
        await partnerChannel.send({
          type: 'broadcast',
          event: 'trade_update',
          payload: updateData,
        });
        supabase.removeChannel(partnerChannel);
      }
    }
  }, [activeTrade, userId, activeVisit]);

  const confirmMyTrade = useCallback(async () => {
    if (!activeTrade || !userId) return;

    const isInitiator = activeTrade.initiator_id === userId;
    const result = await confirmTradeApi(activeTrade.id, isInitiator);

    if (result.success) {
      setActiveTrade(result.trade);

      // Partner benachrichtigen
      if (activeVisit) {
        const partnerChannel = supabase?.channel(`notifications:${activeVisit.partnerId}`);
        if (partnerChannel) {
          const updateData = isInitiator
            ? { initiator_confirmed: true }
            : { partner_confirmed: true };
          await partnerChannel.send({
            type: 'broadcast',
            event: 'trade_update',
            payload: updateData,
          });
          supabase.removeChannel(partnerChannel);
        }
      }

      return result.trade;
    }
    return null;
  }, [activeTrade, userId, activeVisit]);

  const cancelMyTrade = useCallback(async () => {
    if (!activeTrade) return;

    await cancelTradeApi(activeTrade.id);
    setActiveTrade(null);

    // Partner benachrichtigen
    if (activeVisit) {
      const partnerChannel = supabase?.channel(`notifications:${activeVisit.partnerId}`);
      if (partnerChannel) {
        await partnerChannel.send({
          type: 'broadcast',
          event: 'trade_cancelled',
          payload: {},
        });
        supabase.removeChannel(partnerChannel);
      }
    }
  }, [activeTrade, activeVisit]);

  const completeMyTrade = useCallback(async () => {
    if (!activeTrade) return;

    await completeTradeApi(activeTrade.id);
    setActiveTrade(null);
  }, [activeTrade]);

  // --- Context Value ---
  const value = {
    // State
    friends,
    pendingRequests,
    onlineUsers,
    unreadCount,
    activeVisit,
    visitorPosition,
    hostSnapshot,
    incomingVisitRequest,
    activeTrade,

    // Freunde
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    loadFriends,

    // Chat
    sendChatMessage,
    loadMessages,
    setNewMessageCallback,

    // Besuche
    requestVisit,
    acceptVisitRequest,
    declineVisitRequest,
    leaveVisit,
    broadcastPosition,
    broadcastVisitorAction,
    broadcastSnapshotUpdate,
    setVisitorActionCallback,
    setInventoryUpdateCallback,

    // Trade
    startTrade,
    updateMyTradeItems,
    confirmMyTrade,
    cancelMyTrade,
    completeMyTrade,
    setTradeCompleteCallback,

    // Hilfsfunktionen
    isOnline: (friendId) => !!onlineUsers[friendId],
    getUsername: () => username,
    getUserId: () => userId,
  };

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  const context = useContext(MultiplayerContext);
  return context;
}

export default MultiplayerContext;
