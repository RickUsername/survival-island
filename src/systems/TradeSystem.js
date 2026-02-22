// ============================================
// Trade-System - Handeln und Schenken
// ============================================

import { supabase } from '../supabaseClient';

// --- Trade erstellen ---
export async function initiateTrade(sessionId, initiatorId, partnerId) {
  if (!supabase || !initiatorId || !partnerId) {
    return { success: false, error: 'Nicht eingeloggt' };
  }

  try {
    const { data, error } = await supabase
      .from('trades')
      .insert({
        session_id: sessionId,
        initiator_id: initiatorId,
        partner_id: partnerId,
        initiator_items: [],
        partner_items: [],
        status: 'negotiating',
      })
      .select()
      .single();

    if (error) {
      console.warn('Trade erstellen fehlgeschlagen:', error.message);
      return { success: false, error: 'Handel konnte nicht gestartet werden' };
    }

    return { success: true, trade: data };
  } catch (err) {
    console.warn('Trade erstellen Fehler:', err);
    return { success: false, error: 'Netzwerkfehler' };
  }
}

// --- Items im Trade aktualisieren ---
export async function updateTradeItems(tradeId, userId, items, isInitiator) {
  if (!supabase || !tradeId) return { success: false };

  try {
    const updateData = isInitiator
      ? {
          initiator_items: items,
          initiator_confirmed: false,
          partner_confirmed: false, // Beide Bestaetigungen zuruecksetzen
        }
      : {
          partner_items: items,
          initiator_confirmed: false,
          partner_confirmed: false,
        };

    const { error } = await supabase
      .from('trades')
      .update(updateData)
      .eq('id', tradeId);

    if (error) {
      console.warn('Trade-Items aktualisieren fehlgeschlagen:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.warn('Trade-Items Fehler:', err);
    return { success: false };
  }
}

// --- Trade bestaetigen ---
export async function confirmTrade(tradeId, isInitiator) {
  if (!supabase || !tradeId) return { success: false };

  try {
    const updateData = isInitiator
      ? { initiator_confirmed: true }
      : { partner_confirmed: true };

    const { data, error } = await supabase
      .from('trades')
      .update(updateData)
      .eq('id', tradeId)
      .select()
      .single();

    if (error) {
      console.warn('Trade bestaetigen fehlgeschlagen:', error.message);
      return { success: false };
    }

    return { success: true, trade: data };
  } catch (err) {
    console.warn('Trade bestaetigen Fehler:', err);
    return { success: false };
  }
}

// --- Trade abbrechen ---
export async function cancelTrade(tradeId) {
  if (!supabase || !tradeId) return { success: false };

  try {
    const { error } = await supabase
      .from('trades')
      .update({ status: 'cancelled' })
      .eq('id', tradeId);

    if (error) {
      console.warn('Trade abbrechen fehlgeschlagen:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.warn('Trade abbrechen Fehler:', err);
    return { success: false };
  }
}

// --- Trade als abgeschlossen markieren ---
export async function completeTrade(tradeId) {
  if (!supabase || !tradeId) return { success: false };

  try {
    const { error } = await supabase
      .from('trades')
      .update({ status: 'completed' })
      .eq('id', tradeId);

    if (error) {
      console.warn('Trade abschliessen fehlgeschlagen:', error.message);
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.warn('Trade abschliessen Fehler:', err);
    return { success: false };
  }
}

// --- Aktiven Trade laden ---
export async function getActiveTrade(sessionId) {
  if (!supabase || !sessionId) return null;

  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'negotiating')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

// --- Items-Tausch lokal ausfuehren ---
// Gibt neue Inventare zurueck { initiatorInventory, partnerInventory }
export function executeTrade(trade, initiatorInventory, partnerInventory) {
  if (!trade) return null;

  const newInitiatorInv = { ...initiatorInventory };
  const newPartnerInv = { ...partnerInventory };

  // 1. Validieren: Hat der Initiator alle angebotenen Items?
  for (const item of (trade.initiator_items || [])) {
    if (!newInitiatorInv[item.itemId] || newInitiatorInv[item.itemId].amount < item.amount) {
      return { success: false, error: 'Nicht genug Items (Anbieter)' };
    }
  }

  // 2. Validieren: Hat der Partner alle angebotenen Items?
  for (const item of (trade.partner_items || [])) {
    if (!newPartnerInv[item.itemId] || newPartnerInv[item.itemId].amount < item.amount) {
      return { success: false, error: 'Nicht genug Items (Partner)' };
    }
  }

  // 3. Initiator-Items entfernen und zum Partner geben
  for (const item of (trade.initiator_items || [])) {
    newInitiatorInv[item.itemId] = {
      ...newInitiatorInv[item.itemId],
      amount: newInitiatorInv[item.itemId].amount - item.amount,
    };
    if (newInitiatorInv[item.itemId].amount <= 0) {
      delete newInitiatorInv[item.itemId];
    }

    if (!newPartnerInv[item.itemId]) {
      newPartnerInv[item.itemId] = { amount: 0, collectedAt: Date.now() };
    }
    newPartnerInv[item.itemId] = {
      ...newPartnerInv[item.itemId],
      amount: newPartnerInv[item.itemId].amount + item.amount,
    };
  }

  // 4. Partner-Items entfernen und zum Initiator geben
  for (const item of (trade.partner_items || [])) {
    newPartnerInv[item.itemId] = {
      ...newPartnerInv[item.itemId],
      amount: newPartnerInv[item.itemId].amount - item.amount,
    };
    if (newPartnerInv[item.itemId].amount <= 0) {
      delete newPartnerInv[item.itemId];
    }

    if (!newInitiatorInv[item.itemId]) {
      newInitiatorInv[item.itemId] = { amount: 0, collectedAt: Date.now() };
    }
    newInitiatorInv[item.itemId] = {
      ...newInitiatorInv[item.itemId],
      amount: newInitiatorInv[item.itemId].amount + item.amount,
    };
  }

  return {
    success: true,
    initiatorInventory: newInitiatorInv,
    partnerInventory: newPartnerInv,
  };
}

// --- Validierung: Hat der Spieler die Items? ---
export function validateTradeItems(items, inventory) {
  if (!items || items.length === 0) return true; // Schenken (leere Seite) ist ok

  for (const item of items) {
    if (!inventory[item.itemId] || inventory[item.itemId].amount < item.amount) {
      return false;
    }
  }
  return true;
}
