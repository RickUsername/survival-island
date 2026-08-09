import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { getTerrain } from './render/terrain';
import homeMap from './data/homeMap';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Die Insel wird einmalig in ein Offscreen-Canvas gerendert. Das kostet
// auf schwachen Geräten ein paar hundert Millisekunden — deshalb passiert
// es hier im Leerlauf hinter dem Login-Screen und nicht erst im ersten
// Frame des Spiels, wo es als Ruckler sichtbar wäre.
const warmUpTerrain = () => {
  try {
    getTerrain(homeMap, 'home', 20240);
  } catch (err) {
    // Nicht kritisch: GameCanvas backt sonst beim ersten Frame nach
    console.warn('Terrain-Vorberechnung übersprungen:', err);
  }
};
if (typeof window.requestIdleCallback === 'function') {
  window.requestIdleCallback(warmUpTerrain, { timeout: 2000 });
} else {
  setTimeout(warmUpTerrain, 200);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
