// ============================================
// Hobby-Panel - Tagebuch & Session-Start
// ============================================
// Spieler klickt auf Figur -> öffnet dieses Panel.
// Hier kann man Hobbyprojekte anlegen/löschen und Session starten.

import React, { useState } from 'react';

// Zeit formatieren: ms -> "Xh Ym" oder "Xm"
function formatTime(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function HobbyPanel({
  hobbyDiary,
  onAddProject,
  onDeleteProject,
  onStartHobby,
  onClose,
}) {
  const [newProjectName, setNewProjectName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleAddProject = () => {
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    onAddProject(trimmed);
    setNewProjectName('');
  };

  const handleDelete = (projectId) => {
    if (confirmDelete === projectId) {
      onDeleteProject(projectId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(projectId);
    }
  };

  // Sortiert nach totalTimeMs absteigend
  const sortedProjects = [...(hobbyDiary?.projects || [])].sort(
    (a, b) => b.totalTimeMs - a.totalTimeMs
  );
  const totalAllTime = sortedProjects.reduce((sum, p) => sum + p.totalTimeMs, 0);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>🧶 Hobby-Tagebuch</h2>
          <button style={styles.closeBtn} onClick={onClose}>&#10005;</button>
        </div>

        {/* Gesamt-Hobbyzeit */}
        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>Gesamte Hobbyzeit</span>
          <span style={styles.totalTime}>{formatTime(totalAllTime)}</span>
        </div>

        {/* Neues Projekt anlegen */}
        <div style={styles.addRow}>
          <input
            type="text"
            style={styles.input}
            placeholder="Neues Projekt (z.B. Pulli stricken)..."
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddProject()}
            maxLength={50}
          />
          <button
            style={{ ...styles.addBtn, opacity: newProjectName.trim() ? 1 : 0.5 }}
            onClick={handleAddProject}
            disabled={!newProjectName.trim()}
          >
            + Hinzu.
          </button>
        </div>

        {/* Projekt-Liste */}
        <div style={styles.projectList}>
          {sortedProjects.length === 0 ? (
            <p style={styles.empty}>
              Noch keine Hobbyprojekte angelegt.
              <br />
              <span style={styles.emptyHint}>
                Lege ein Projekt an (z.B. Stricken, Aquarell, Lesen) und starte
                eine Hobby-Session, um deine Hobbyzeit zu tracken.
              </span>
            </p>
          ) : (
            sortedProjects.map(project => (
              <div key={project.id} style={styles.projectRow}>
                <div style={styles.projectInfo}>
                  <span style={styles.projectName}>{project.name}</span>
                  <span style={styles.projectTime}>{formatTime(project.totalTimeMs)}</span>
                </div>
                <div style={styles.projectActions}>
                  <button
                    style={styles.startProjectBtn}
                    onClick={() => onStartHobby(project.id)}
                  >
                    ▶ Starten
                  </button>
                  <button
                    style={{
                      ...styles.deleteBtn,
                      backgroundColor: confirmDelete === project.id
                        ? 'rgba(231, 76, 60, 0.8)'
                        : 'rgba(255,255,255,0.08)',
                    }}
                    onClick={() => handleDelete(project.id)}
                  >
                    {confirmDelete === project.id ? 'Sicher?' : 'X'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Ohne Projekt starten */}
        <div style={styles.footer}>
          <button style={styles.startNoProjectBtn} onClick={() => onStartHobby(null)}>
            ▶ Ohne Projekt starten
          </button>
          <p style={styles.hint}>
            Hobby gibt Stimmung, aber keine Ressourcen. Hunger und Durst sinken
            normal weiter. Projekte überleben den Tod.
          </p>
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
    border: '2px solid #B07ECC',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid #333',
  },
  title: {
    margin: 0,
    color: '#B07ECC',
    fontSize: '18px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 18px',
    backgroundColor: 'rgba(176, 126, 204, 0.15)',
    borderBottom: '1px solid #333',
  },
  totalLabel: {
    color: '#aaa',
    fontSize: '13px',
  },
  totalTime: {
    color: '#B07ECC',
    fontSize: '18px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  addRow: {
    display: 'flex',
    gap: '8px',
    padding: '12px 18px',
    borderBottom: '1px solid #333',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    backgroundColor: '#0a0a1a',
    border: '2px solid #444',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  addBtn: {
    padding: '10px 14px',
    backgroundColor: '#B07ECC',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  projectList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 18px',
    minHeight: '120px',
    maxHeight: '320px',
  },
  empty: {
    color: '#888',
    fontSize: '14px',
    textAlign: 'center',
    padding: '20px 0',
    lineHeight: '1.6',
  },
  emptyHint: {
    color: '#666',
    fontSize: '12px',
  },
  projectRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    gap: '8px',
  },
  projectInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  projectName: {
    color: '#ddd',
    fontSize: '14px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  projectTime: {
    color: '#B07ECC',
    fontSize: '13px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  projectActions: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  startProjectBtn: {
    padding: '6px 12px',
    backgroundColor: '#B07ECC',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  deleteBtn: {
    border: 'none',
    color: '#999',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: '6px',
  },
  footer: {
    padding: '14px 18px',
    borderTop: '1px solid #333',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  startNoProjectBtn: {
    padding: '12px',
    backgroundColor: '#7c5fa0',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  hint: {
    margin: 0,
    color: '#666',
    fontSize: '11px',
    textAlign: 'center',
    lineHeight: '1.4',
  },
};
