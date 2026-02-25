// ============================================
// Statistik-Panel - Spielstatistiken
// ============================================

import React from 'react';
import { ACHIEVEMENTS } from '../systems/AchievementSystem';

// Hilfsfunktion: Millisekunden in lesbares Format
function formatDuration(ms) {
  if (!ms || ms <= 0) return '0 Min';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} Std ${minutes} Min`;
  return `${minutes} Min`;
}

// Hilfsfunktion: Datum formatieren
function formatDate(timestamp) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function StatsPanel({ gameState, onClose }) {
  const { stats, needs, inventory, animals, buildings, tools, biomeVisits,
          achievements, diary, plantedTrees, weeds, eggReceivedFrom, weather } = gameState;

  // Berechnete Werte
  const daysAlive = stats?.startedAt
    ? Math.floor((Date.now() - stats.startedAt) / (24 * 60 * 60 * 1000))
    : 0;

  const totalInventoryItems = Object.values(inventory || {}).reduce((sum, item) => sum + (item.amount || 0), 0);
  const uniqueItemTypes = Object.keys(inventory || {}).length;

  const animalCount = (animals || []).length;
  const catCount = (animals || []).filter(a => a.type === 'cat').length;
  const wildAnimalCount = animalCount - catCount;

  const animalTypes = new Set((animals || []).map(a => a.type));
  const uniqueAnimalTypes = animalTypes.size;

  const totalBiomeVisits = Object.values(biomeVisits || {}).reduce((sum, v) => sum + v, 0);

  const achievementCount = achievements?.unlockedIds?.length || 0;
  const totalAchievements = ACHIEVEMENTS.length;

  const topicCount = diary?.topics?.length || 0;
  const totalStudyTimeMs = (diary?.topics || []).reduce((sum, t) => sum + (t.totalTimeMs || 0), 0);

  const treeCount = (plantedTrees || []).length;
  const weedCount = (weeds || []).length;

  const buildingCount = buildings ? (
    (buildings.shelterLevel > 0 ? 1 : 0) +
    (buildings.hasCampfire ? 1 : 0) +
    (buildings.hasWaterCollector ? 1 : 0)
  ) : 0;

  const toolCount = (tools || []).length;
  const eggCount = eggReceivedFrom?.length || 0;

  const weatherLabel = weather === 'rainy' ? 'Regnerisch' : 'Sonnig';

  const sections = [
    {
      title: 'Allgemein',
      rows: [
        { label: 'Tage überlebt', value: daysAlive },
        { label: 'Spielstart', value: formatDate(stats?.startedAt) },
        { label: 'Tode insgesamt', value: stats?.totalDeaths || 0 },
        { label: 'Aktuelles Wetter', value: weatherLabel },
      ],
    },
    {
      title: 'Bedürfnisse',
      rows: [
        { label: 'Hunger', value: `${Math.round(needs?.hunger || 0)}%` },
        { label: 'Durst', value: `${Math.round(needs?.thirst || 0)}%` },
        { label: 'Stimmung', value: `${Math.round(needs?.mood || 0)}%` },
      ],
    },
    {
      title: 'Sammelreisen',
      rows: [
        { label: 'Sammelreisen gesamt', value: stats?.totalGatheringTrips || 0 },
        { label: 'Items gesammelt (gesamt)', value: stats?.totalItemsCollected || 0 },
        { label: 'Biom-Besuche gesamt', value: totalBiomeVisits },
        { label: 'Norden besucht', value: biomeVisits?.north || 0 },
        { label: 'Süden besucht', value: biomeVisits?.south || 0 },
        { label: 'Osten besucht', value: biomeVisits?.east || 0 },
        { label: 'Westen besucht', value: biomeVisits?.west || 0 },
      ],
    },
    {
      title: 'Inventar',
      rows: [
        { label: 'Items im Inventar', value: totalInventoryItems },
        { label: 'Verschiedene Itemarten', value: uniqueItemTypes },
        { label: 'Werkzeuge', value: toolCount },
      ],
    },
    {
      title: 'Bauen & Pflanzen',
      rows: [
        { label: 'Gebäude', value: buildingCount },
        { label: 'Unterstand-Stufe', value: buildings?.shelterLevel || 0 },
        { label: 'Lagerfeuer', value: buildings?.hasCampfire ? 'Ja' : 'Nein' },
        { label: 'Regenfänger', value: buildings?.hasWaterCollector ? 'Ja' : 'Nein' },
        { label: 'Gepflanzte Bäume', value: treeCount },
        { label: 'Unkraut', value: weedCount },
        { label: 'Hauptbaum gefällt', value: stats?.hasMainTreeFelled ? 'Ja' : 'Nein' },
      ],
    },
    {
      title: 'Tiere',
      rows: [
        { label: 'Tiere auf der Insel', value: animalCount },
        { label: 'Wildtiere', value: wildAnimalCount },
        { label: 'Katzen', value: catCount },
        { label: 'Verschiedene Tierarten', value: uniqueAnimalTypes },
        { label: 'Eier erhalten', value: eggCount },
      ],
    },
    {
      title: 'Kochen & Handwerk',
      rows: [
        { label: 'Schon gekocht', value: stats?.hasCookedMeal ? 'Ja' : 'Nein' },
      ],
    },
    {
      title: 'Tagebuch & Lernen',
      rows: [
        { label: 'Lernfächer', value: topicCount },
        { label: 'Gesamte Lernzeit', value: formatDuration(totalStudyTimeMs) },
      ],
    },
    {
      title: 'Errungenschaften',
      rows: [
        { label: 'Freigeschaltet', value: `${achievementCount} / ${totalAchievements}` },
      ],
    },
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Statistiken</h2>
          <button style={styles.closeBtn} onClick={onClose}>&#10005;</button>
        </div>

        {/* Scrollbarer Inhalt */}
        <div style={styles.content}>
          {sections.map(section => (
            <div key={section.title} style={styles.section}>
              <div style={styles.sectionTitle}>{section.title}</div>
              {section.rows.map(row => (
                <div key={row.label} style={styles.row}>
                  <span style={styles.rowLabel}>{row.label}</span>
                  <span style={styles.rowValue}>{row.value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  panel: {
    backgroundColor: '#1a1a2e',
    border: '2px solid #5dade2',
    borderRadius: '12px',
    padding: '20px',
    maxWidth: '450px',
    width: '90%',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    color: '#5dade2',
    fontSize: '20px',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: '70vh',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sectionTitle: {
    color: '#5dade2',
    fontSize: '13px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '4px',
    borderBottom: '1px solid rgba(93,173,226,0.3)',
    paddingBottom: '4px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 8px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: '4px',
  },
  rowLabel: {
    color: '#aaa',
    fontSize: '13px',
  },
  rowValue: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: 'bold',
  },
};
