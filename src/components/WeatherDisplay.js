// ============================================
// Wetter-Anzeige — Wetter, Tageszeit und Jahreszeit
// ============================================
// Zeigt nicht nur, WAS für Wetter ist, sondern auch was es gerade kostet.
// Sonst bleibt für Spielerinnen unsichtbar, warum die Stimmung im Regen
// plötzlich schneller fällt — und warum sich ein besseres Dach lohnt.

import React, { useState, useEffect } from 'react';
import { WEATHER_TYPES } from '../utils/constants';
import { getWeatherModifiers } from '../systems/NeedsSystem';
import { getSeasonName } from '../systems/WeatherSystem';
import { getAtmosphere } from '../render/atmosphere';

const WEATHER_INFO = {
  [WEATHER_TYPES.SUNNY]: { icon: '☀️', label: 'Sonne' },
  [WEATHER_TYPES.RAINY]: { icon: '🌧️', label: 'Regen' },
  [WEATHER_TYPES.STORM]: { icon: '⛈️', label: 'Gewitter' },
  [WEATHER_TYPES.FOG]: { icon: '🌫️', label: 'Nebel' },
  [WEATHER_TYPES.HEAT]: { icon: '🥵', label: 'Hitze' },
  [WEATHER_TYPES.SNOW]: { icon: '❄️', label: 'Schnee' },
};

const SEASON_ICON = { Frühling: '🌸', Sommer: '🌻', Herbst: '🍂', Winter: '❄️' };

/** Kurzer Klartext, was das Wetter beim aktuellen Unterstand bedeutet */
function effectHint(weather, shelterLevel) {
  const mod = getWeatherModifiers(weather, shelterLevel);
  const parts = [];
  if (mod.mood > 1.06) parts.push(`Stimmung ×${mod.mood.toFixed(2)}`);
  if (mod.hunger > 1.02) parts.push(`Hunger ×${mod.hunger.toFixed(2)}`);
  if (mod.thirst > 1.02) parts.push(`Durst ×${mod.thirst.toFixed(2)}`);
  if (parts.length === 0) return 'Dein Dach hält alles ab';
  return parts.join(' · ');
}

export default function WeatherDisplay({ weather, shelterLevel = 0, timeOverride = null }) {
  const [atmo, setAtmo] = useState(() => getAtmosphere(new Date(), timeOverride));
  const [expanded, setExpanded] = useState(false);

  // Minütlich aktualisieren — schneller muss die Uhr nicht sein
  useEffect(() => {
    const tick = () => setAtmo(getAtmosphere(new Date(), timeOverride));
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [timeOverride]);

  const info = WEATHER_INFO[weather] || WEATHER_INFO[WEATHER_TYPES.SUNNY];
  const season = getSeasonName(new Date());
  const clock = `${String(Math.floor(atmo.hour)).padStart(2, '0')}:${String(Math.floor((atmo.hour % 1) * 60)).padStart(2, '0')}`;

  return (
    <div style={styles.container} onClick={() => setExpanded(v => !v)}>
      <div style={styles.row}>
        <span style={styles.icon}>{info.icon}</span>
        <span style={styles.label}>{info.label}</span>
        <span style={styles.divider} />
        <span style={styles.clock}>{clock}</span>
      </div>
      {expanded && (
        <div style={styles.details}>
          <div style={styles.detailRow}>{atmo.label}</div>
          <div style={styles.detailRow}>{SEASON_ICON[season]} {season}</div>
          <div style={styles.detailRow}>
            🌅 {fmt(atmo.sunrise)} · 🌇 {fmt(atmo.sunset)}
          </div>
          <div style={styles.effect}>{effectHint(weather, shelterLevel)}</div>
        </div>
      )}
    </div>
  );
}

function fmt(h) {
  return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
}

const styles = {
  container: {
    padding: '8px 14px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  icon: {
    fontSize: '20px',
  },
  label: {
    fontWeight: 'bold',
  },
  divider: {
    width: '1px',
    height: '14px',
    background: 'rgba(255,255,255,0.25)',
    margin: '0 2px',
  },
  clock: {
    fontVariantNumeric: 'tabular-nums',
    color: '#cfd8e3',
  },
  details: {
    marginTop: '6px',
    paddingTop: '6px',
    borderTop: '1px solid rgba(255,255,255,0.15)',
    fontSize: '12px',
    color: '#c8d2dd',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  detailRow: {
    whiteSpace: 'nowrap',
  },
  effect: {
    marginTop: '4px',
    color: '#ffd479',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
};
