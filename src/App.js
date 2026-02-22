// ============================================
// Survival Island - Haupt-App
// ============================================

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Game from './components/Game';
import LoginScreen from './components/LoginScreen';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();
  const [skippedLogin, setSkippedLogin] = useState(false);

  // Loading screen while checking auth session
  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a1a',
        color: '#888',
        fontSize: '16px',
      }}>
        Laden...
      </div>
    );
  }

  // Show login screen if not logged in AND hasn't skipped
  if (!user && !skippedLogin) {
    return <LoginScreen onSkip={() => setSkippedLogin(true)} />;
  }

  return <Game />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
