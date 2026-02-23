import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({
  user: null,
  loading: true,
  isAdmin: false,
  signInWithUsername: async () => {},
  signUpWithUsername: async () => {},
  signOut: async () => {},
});

// Benutzername → interne Fake-Email (Supabase braucht eine Email)
function usernameToEmail(username) {
  return `${username.toLowerCase().trim()}@survival-island.local`;
}

// Admin-Status aus Supabase prüfen
async function checkAdminStatus(userId) {
  if (!supabase || !userId) return false;
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .single();
    if (error || !data) return false;
    return true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Auf localhost immer Admin (für lokales Testen)
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const [isAdmin, setIsAdmin] = useState(isLocalhost);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session (mit Timeout-Schutz)
    const timeout = setTimeout(() => {
      // Fallback: nach 5 Sekunden trotzdem weitermachen
      setLoading(false);
    }, 5000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const admin = await checkAdminStatus(currentUser.id);
        setIsAdmin(admin);
      }
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false); // Bei Fehler trotzdem weitermachen (offline)
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          const admin = await checkAdminStatus(currentUser.id);
          setIsAdmin(admin);
        } else {
          setIsAdmin(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithUsername = async (username, password) => {
    if (!supabase) return { error: 'Supabase nicht konfiguriert' };
    const email = usernameToEmail(username);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message?.includes('Invalid login credentials')) {
        return { error: { message: 'Benutzername oder Passwort falsch' } };
      }
      return { error };
    }
    return { error: null };
  };

  const signUpWithUsername = async (username, password) => {
    if (!supabase) return { error: 'Supabase nicht konfiguriert' };

    if (username.length < 3) {
      return { error: { message: 'Benutzername muss mindestens 3 Zeichen lang sein' } };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { error: { message: 'Nur Buchstaben, Zahlen, _ und - erlaubt' } };
    }

    const email = usernameToEmail(username);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });

    if (error) {
      if (error.message?.includes('already registered')) {
        return { error: { message: 'Dieser Benutzername ist bereits vergeben' } };
      }
      return { error };
    }

    return { error: null, data };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAdmin,
      signInWithUsername,
      signUpWithUsername,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
