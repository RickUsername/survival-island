// ============================================
// Freundesystem - Anfragen, Liste, Verwaltung
// ============================================

import { supabase } from '../supabaseClient';

// --- Hilfsfunktionen ---

// Sortiert zwei UUIDs fuer konsistente user_a < user_b Reihenfolge
export function sortUserIds(idA, idB) {
  return idA < idB ? { user_a: idA, user_b: idB } : { user_a: idB, user_b: idA };
}

// --- Freundschaftsanfrage senden ---
export async function sendFriendRequest(userId, targetUsername) {
  if (!supabase || !userId || !targetUsername) {
    return { success: false, error: 'Nicht eingeloggt' };
  }

  try {
    // Ziel-User suchen
    const { data: users, error: searchError } = await supabase
      .rpc('find_user_by_username', { search_username: targetUsername });

    if (searchError) {
      console.warn('Benutzersuche fehlgeschlagen:', searchError.message);
      return { success: false, error: 'Suche fehlgeschlagen' };
    }

    if (!users || users.length === 0) {
      return { success: false, error: 'Benutzer nicht gefunden' };
    }

    const targetId = users[0].id;

    // Nicht sich selbst hinzufuegen
    if (targetId === userId) {
      return { success: false, error: 'Du kannst dich nicht selbst hinzufuegen' };
    }

    // Sortierte IDs
    const { user_a, user_b } = sortUserIds(userId, targetId);

    // Pruefen ob bereits eine Freundschaft existiert
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .eq('user_a', user_a)
      .eq('user_b', user_b)
      .single();

    if (existing) {
      if (existing.status === 'accepted') {
        return { success: false, error: 'Ihr seid bereits Freunde' };
      }
      if (existing.status === 'pending') {
        return { success: false, error: 'Anfrage bereits gesendet' };
      }
      // declined -> alten Eintrag loeschen und neu senden
      await supabase.from('friendships').delete().eq('id', existing.id);
    }

    // Freundschaftsanfrage erstellen
    const { error: insertError } = await supabase
      .from('friendships')
      .insert({
        user_a,
        user_b,
        status: 'pending',
        requested_by: userId,
      });

    if (insertError) {
      console.warn('Freundschaftsanfrage fehlgeschlagen:', insertError.message);
      return { success: false, error: 'Anfrage konnte nicht gesendet werden' };
    }

    return { success: true, targetId, targetUsername: users[0].username };
  } catch (err) {
    console.warn('Freundschaftsanfrage Fehler:', err);
    return { success: false, error: 'Netzwerkfehler' };
  }
}

// --- Anfrage annehmen ---
export async function acceptFriendRequest(friendshipId) {
  if (!supabase) return { success: false };

  try {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', friendshipId);

    if (error) {
      console.warn('Freundschaft annehmen fehlgeschlagen:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.warn('Freundschaft annehmen Fehler:', err);
    return { success: false };
  }
}

// --- Anfrage ablehnen ---
export async function declineFriendRequest(friendshipId) {
  if (!supabase) return { success: false };

  try {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', friendshipId);

    if (error) {
      console.warn('Freundschaft ablehnen fehlgeschlagen:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.warn('Freundschaft ablehnen Fehler:', err);
    return { success: false };
  }
}

// --- Freund entfernen ---
export async function removeFriend(friendshipId) {
  if (!supabase) return { success: false };

  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      console.warn('Freund entfernen fehlgeschlagen:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.warn('Freund entfernen Fehler:', err);
    return { success: false };
  }
}

// --- Freundesliste laden (mit Usernames) ---
export async function getFriendsWithNames(userId) {
  if (!supabase || !userId) return [];

  try {
    // Alle akzeptierten Freundschaften laden
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);

    if (error || !data || data.length === 0) return [];

    // Freund-IDs sammeln
    const friendIds = data.map(f => f.user_a === userId ? f.user_b : f.user_a);

    // Batch-Username-Abfrage
    const { data: usernames, error: nameError } = await supabase
      .rpc('find_usernames_by_ids', { user_ids: friendIds });

    if (nameError) {
      console.warn('Usernames laden fehlgeschlagen:', nameError.message);
    }

    // Map fuer schnellen Lookup
    const nameMap = {};
    if (usernames) {
      for (const u of usernames) {
        nameMap[u.id] = u.username;
      }
    }

    return data.map(f => {
      const friendId = f.user_a === userId ? f.user_b : f.user_a;
      return {
        friendshipId: f.id,
        friendId,
        username: nameMap[friendId] || 'Unbekannt',
      };
    });
  } catch (err) {
    console.warn('Freundesliste Fehler:', err);
    return [];
  }
}

// --- Eingehende Anfragen laden (mit Usernames) ---
export async function getPendingRequestsWithNames(userId) {
  if (!supabase || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('status', 'pending')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .neq('requested_by', userId); // Nur eingehende

    if (error || !data || data.length === 0) return [];

    // Absender-IDs (die die Anfrage geschickt haben)
    const senderIds = data.map(f => f.requested_by);

    // Batch-Username-Abfrage
    const { data: usernames } = await supabase
      .rpc('find_usernames_by_ids', { user_ids: senderIds });

    const nameMap = {};
    if (usernames) {
      for (const u of usernames) {
        nameMap[u.id] = u.username;
      }
    }

    return data.map(f => ({
      friendshipId: f.id,
      senderId: f.requested_by,
      senderName: nameMap[f.requested_by] || 'Unbekannt',
      createdAt: f.created_at,
    }));
  } catch (err) {
    console.warn('Pending-Anfragen Fehler:', err);
    return [];
  }
}
