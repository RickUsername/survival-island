import { supabase } from '../supabaseClient';

// Upload local game state to Supabase
export async function syncUp(userId, gameState) {
  if (!supabase || !userId || !gameState) return { success: false };

  try {
    const { error } = await supabase
      .from('game_saves')
      .upsert({
        user_id: userId,
        game_state: gameState,
        last_update: gameState.lastUpdate || Date.now(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.warn('Cloud-Sync (Upload) fehlgeschlagen:', error.message);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.warn('Cloud-Sync (Upload) Netzwerkfehler:', err);
    return { success: false, error: err };
  }
}

// Download cloud game state from Supabase
export async function syncDown(userId) {
  if (!supabase || !userId) return { success: false, data: null };

  try {
    const { data, error } = await supabase
      .from('game_saves')
      .select('game_state, last_update')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found -> first time user, no cloud save exists
        return { success: true, data: null };
      }
      console.warn('Cloud-Sync (Download) fehlgeschlagen:', error.message);
      return { success: false, data: null, error };
    }

    return { success: true, data: data.game_state, lastUpdate: data.last_update };
  } catch (err) {
    console.warn('Cloud-Sync (Download) Netzwerkfehler:', err);
    return { success: false, data: null, error: err };
  }
}

// Resolve conflict between local and cloud saves
export function resolveConflict(localState, cloudState, cloudLastUpdate) {
  if (!cloudState) {
    return { winner: 'local', state: localState };
  }

  if (!localState) {
    return { winner: 'cloud', state: cloudState };
  }

  const localTimestamp = localState.lastUpdate || 0;
  const cloudTimestamp = cloudLastUpdate || cloudState.lastUpdate || 0;

  if (cloudTimestamp > localTimestamp) {
    return { winner: 'cloud', state: cloudState };
  } else {
    return { winner: 'local', state: localState };
  }
}

// Full sync operation: download, resolve, and optionally upload
export async function fullSync(userId, localState) {
  if (!supabase || !userId) return { synced: false, state: localState };

  const { success, data: cloudState, lastUpdate: cloudLastUpdate } = await syncDown(userId);

  if (!success) {
    // Network error -> keep local state, try again later
    return { synced: false, state: localState };
  }

  const { winner, state: resolvedState } = resolveConflict(
    localState, cloudState, cloudLastUpdate
  );

  if (winner === 'local' || !cloudState) {
    // Local is newer or no cloud save -> upload local
    await syncUp(userId, localState);
    return { synced: true, state: localState, direction: 'up' };
  } else {
    // Cloud is newer -> use cloud state
    return { synced: true, state: resolvedState, direction: 'down' };
  }
}

// Delete cloud save (used on manual reset if desired)
export async function deleteCloudSave(userId) {
  if (!supabase || !userId) return;

  try {
    await supabase
      .from('game_saves')
      .delete()
      .eq('user_id', userId);
  } catch (err) {
    console.warn('Cloud-Save löschen fehlgeschlagen:', err);
  }
}
