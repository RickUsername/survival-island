// ============================================
// Besuchs-System - Sessions, Snapshots, Regeln
// ============================================

import { supabase } from '../supabaseClient';

// --- Konstanten ---
export const VISIT_EXPIRY_MS = 3 * 60 * 60 * 1000; // 3 Stunden
export const VISITOR_POSITION_INTERVAL = 100; // ms zwischen Position-Updates

// --- Besuchsanfrage senden ---
export async function requestVisit(visitorId, hostId) {
  if (!supabase || !visitorId || !hostId) {
    return { success: false, error: 'Nicht eingeloggt' };
  }

  try {
    const expiresAt = new Date(Date.now() + VISIT_EXPIRY_MS).toISOString();

    const { data, error } = await supabase
      .from('visit_sessions')
      .insert({
        host_id: hostId,
        visitor_id: visitorId,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.warn('Besuchsanfrage fehlgeschlagen:', error.message);
      return { success: false, error: 'Anfrage konnte nicht gesendet werden' };
    }

    return { success: true, session: data };
  } catch (err) {
    console.warn('Besuchsanfrage Fehler:', err);
    return { success: false, error: 'Netzwerkfehler' };
  }
}

// --- Besuch annehmen (Host) ---
export async function acceptVisit(sessionId, hostGameState) {
  if (!supabase || !sessionId) return { success: false };

  try {
    const snapshot = createHostSnapshot(hostGameState);

    const { data, error } = await supabase
      .from('visit_sessions')
      .update({
        status: 'active',
        host_snapshot: snapshot,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.warn('Besuch annehmen fehlgeschlagen:', error.message);
      return { success: false };
    }

    return { success: true, session: data };
  } catch (err) {
    console.warn('Besuch annehmen Fehler:', err);
    return { success: false };
  }
}

// --- Besuch ablehnen / beenden ---
export async function endVisit(sessionId) {
  if (!supabase || !sessionId) return { success: false };

  try {
    const { error } = await supabase
      .from('visit_sessions')
      .update({ status: 'ended' })
      .eq('id', sessionId);

    if (error) {
      console.warn('Besuch beenden fehlgeschlagen:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.warn('Besuch beenden Fehler:', err);
    return { success: false };
  }
}

// --- Aktive Session laden ---
export async function getActiveVisit(userId) {
  if (!supabase || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('visit_sessions')
      .select('*')
      .or(`host_id.eq.${userId},visitor_id.eq.${userId}`)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

// --- Pending Besuchsanfrage laden (fuer Host) ---
export async function getPendingVisitRequest(hostId) {
  if (!supabase || !hostId) return null;

  try {
    const { data, error } = await supabase
      .from('visit_sessions')
      .select('*')
      .eq('host_id', hostId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

// --- Host-Snapshot erstellen ---
// Extrahiert nur die Daten die der Besucher braucht
export function createHostSnapshot(gameState) {
  if (!gameState) return null;

  return {
    placedBuildings: gameState.placedBuildings || [],
    animals: (gameState.animals || []).map(a => ({
      id: a.id,
      type: a.type,
      x: a.x,
      y: a.y,
      state: a.state,
      catState: a.catState,
      catStateTimer: a.catStateTimer,
      hunger: a.hunger,
      affection: a.affection,
      lastPettedAt: a.lastPettedAt,
      spawnedAt: a.spawnedAt,
      dirX: a.dirX,
      dirY: a.dirY,
    })),
    treeStage: gameState.treeStage || 1,
    plantedTrees: gameState.plantedTrees || [],
    weeds: gameState.weeds || [],
    droppedSeeds: gameState.droppedSeeds || [],
    weather: gameState.weather || {},
    // Player-Position des Hosts (damit Besucher ihn sehen kann)
    hostPlayer: {
      x: gameState.player?.x || 640,
      y: gameState.player?.y || 480,
    },
    // Timestamp fuer Sync-Checks
    snapshotAt: Date.now(),
  };
}

// --- Snapshot aktualisieren (Host sendet regelmaessig) ---
export async function updateHostSnapshot(sessionId, gameState) {
  if (!supabase || !sessionId) return;

  try {
    const snapshot = createHostSnapshot(gameState);
    await supabase
      .from('visit_sessions')
      .update({ host_snapshot: snapshot })
      .eq('id', sessionId);
  } catch (err) {
    console.warn('Snapshot-Update fehlgeschlagen:', err);
  }
}

// --- Besuchs-Regeln: Was darf der Besucher? ---
export const VISITOR_PERMISSIONS = {
  canPetAnimals: true,
  canFeedAnimals: true,     // Mit eigenen Items
  canPickUpItems: false,
  canPlaceBuildings: false,
  canDemolishBuildings: false,
  canFellTrees: false,
  canPlantTrees: false,
  canUseExitZones: false,
  canCraft: false,
  canUseInventory: true,    // Eigenes Inventar einsehen (fuer Fuettern/Trade)
  canTrade: true,
  canChat: true,
};
