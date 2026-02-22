import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Graceful fallback: if env vars are missing, export null
// This allows the game to work without Supabase configured
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'sb-survival-island-auth',
        // Navigator Lock ersetzen — verhindert Timeout-Fehler
        // wenn mehrere Tabs offen sind oder Locks hängen bleiben
        lock: async (name, acquireTimeout, fn) => {
          return await fn();
        },
      },
    })
  : null;
