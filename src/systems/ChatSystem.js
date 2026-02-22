// ============================================
// Chat-System - Nachrichten senden/empfangen
// ============================================

import { supabase } from '../supabaseClient';

// --- Nachricht senden ---
export async function sendMessage(senderId, receiverId, content) {
  if (!supabase || !senderId || !receiverId || !content?.trim()) {
    return { success: false };
  }

  try {
    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: content.trim().substring(0, 500), // Max 500 Zeichen
      });

    if (error) {
      console.warn('Nachricht senden fehlgeschlagen:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.warn('Nachricht senden Fehler:', err);
    return { success: false };
  }
}

// --- Nachrichten laden (zwischen zwei Spielern) ---
export async function getMessages(userId, friendId, limit = 50) {
  if (!supabase || !userId || !friendId) return [];

  try {
    // Zwei separate Queries und zusammenfuegen (zuverlaessiger als .or())
    const { data: sent, error: e1 } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_id', userId)
      .eq('receiver_id', friendId)
      .order('created_at', { ascending: true })
      .limit(limit);

    const { data: received, error: e2 } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_id', friendId)
      .eq('receiver_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (e1 || e2) {
      console.warn('Nachrichten laden fehlgeschlagen:', e1?.message || e2?.message);
      return [];
    }

    // Zusammenfuegen und nach Zeit sortieren
    const all = [...(sent || []), ...(received || [])];
    all.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return all.slice(-limit);
  } catch (err) {
    console.warn('Nachrichten laden Fehler:', err);
    return [];
  }
}

// --- Nachrichten als gelesen markieren ---
export async function markAsRead(userId, friendId) {
  if (!supabase || !userId || !friendId) return;

  try {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', friendId)
      .eq('receiver_id', userId)
      .eq('read', false);
  } catch (err) {
    console.warn('Als gelesen markieren Fehler:', err);
  }
}

// --- Ungelesene Nachrichten zaehlen ---
export async function getUnreadCount(userId) {
  if (!supabase || !userId) return 0;

  try {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('read', false);

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

// --- Live-Chat-Subscription (Realtime) ---
export function subscribeToNewMessages(userId, onMessage) {
  if (!supabase || !userId) return null;

  const channel = supabase
    .channel(`messages:receiver:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        if (onMessage) onMessage(payload.new);
      }
    )
    .subscribe();

  return channel;
}

// --- Subscription aufheben ---
export function unsubscribeFromMessages(channel) {
  if (channel && supabase) {
    supabase.removeChannel(channel);
  }
}
