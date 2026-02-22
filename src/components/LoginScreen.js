import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen({ onSkip }) {
  const { signInWithUsername, signUpWithUsername } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUpWithUsername(username, password);
      if (error) {
        setError(error.message || 'Fehler bei der Registrierung');
      }
    } else {
      const { error } = await signInWithUsername(username, password);
      if (error) {
        setError(error.message || 'Fehler bei der Anmeldung');
      }
    }
    setLoading(false);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <h1 style={styles.title}>🏝️ Survival Island</h1>
        <p style={styles.subtitle}>
          {isSignUp ? 'Konto erstellen' : 'Anmelden'}
        </p>

        {/* Username/Password Form */}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Benutzername"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={styles.input}
            required
            minLength={3}
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Passwort (min. 6 Zeichen)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
            required
            minLength={6}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? 'Laden...' : (isSignUp ? 'Registrieren' : 'Anmelden')}
          </button>
        </form>

        <button
          style={styles.toggleBtn}
          onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
        >
          {isSignUp ? 'Bereits ein Konto? → Anmelden' : 'Noch kein Konto? → Registrieren'}
        </button>

        <div style={styles.dividerSimple} />

        <button style={styles.skipBtn} onClick={onSkip}>
          Ohne Anmeldung spielen
        </button>
        <p style={styles.skipHint}>
          (Spielstand wird nur lokal gespeichert)
        </p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0a0a1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
  },
  panel: {
    backgroundColor: '#1a1a2e',
    border: '2px solid #3a7bd5',
    borderRadius: '16px',
    padding: '36px',
    textAlign: 'center',
    maxWidth: '400px',
    width: '90%',
  },
  title: {
    color: '#4a8c3f',
    fontSize: '28px',
    margin: '0 0 8px',
  },
  subtitle: {
    color: '#ccc',
    fontSize: '16px',
    margin: '0 0 24px',
  },
  dividerSimple: {
    height: '1px',
    backgroundColor: '#333',
    margin: '20px 0',
  },
  input: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0a0a1a',
    color: '#fff',
    border: '1px solid #333',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '10px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  error: {
    color: '#e74c3c',
    fontSize: '13px',
    margin: '0 0 10px',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4a8c3f',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#3a7bd5',
    cursor: 'pointer',
    fontSize: '13px',
    marginTop: '12px',
    padding: '4px',
  },
  skipBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#888',
    border: '1px solid #333',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  skipHint: {
    color: '#555',
    fontSize: '11px',
    marginTop: '8px',
    marginBottom: 0,
  },
};
