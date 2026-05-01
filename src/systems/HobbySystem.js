// ============================================
// Hobby-System - Stricken & Hobbyprojekte (Stoppuhr-Modus)
// ============================================
// Hobby gibt Stimmung (wie Sammelreise), aber KEINE Ressourcen.
// Während aktivem Hobby: Stimmung bleibt stehen, Hunger/Durst sinken normal.
// hobby-Objekt: { startTime, pausedAt, totalPausedMs, projectId, status }

import { calculateMoodFromGathering } from './NeedsSystem';

// Neue Hobby-Session starten (immer Stoppuhr-Modus)
// projectId: optional aktives Hobbyprojekt (null = ohne Projekt)
export function startHobby(projectId = null) {
  return {
    startTime: Date.now(),
    pausedAt: null,
    totalPausedMs: 0,
    projectId,
    status: 'active',
  };
}

// Verstrichene Hobbyzeit (mit Pausen-Abzug)
export function getElapsedHobbyTime(hobby) {
  if (!hobby) return 0;
  if (hobby.pausedAt) {
    return hobby.pausedAt - hobby.startTime - hobby.totalPausedMs;
  }
  return Date.now() - hobby.startTime - hobby.totalPausedMs;
}

// Hobby pausieren
export function pauseHobby(hobby) {
  if (!hobby || hobby.pausedAt) return hobby;
  return { ...hobby, pausedAt: Date.now(), status: 'paused' };
}

// Hobby fortsetzen
export function resumeHobby(hobby) {
  if (!hobby || !hobby.pausedAt) return hobby;
  const pausedDuration = Date.now() - hobby.pausedAt;
  return {
    ...hobby,
    pausedAt: null,
    totalPausedMs: hobby.totalPausedMs + pausedDuration,
    status: 'active',
  };
}

// Hobby beenden -> liefert Dauer + Stimmungs-Gewinn (analog Sammelreise)
export function finishHobby(hobby) {
  if (!hobby) return { duration: 0, moodGain: 0, projectId: null };
  const duration = getElapsedHobbyTime(hobby);
  const moodGain = calculateMoodFromGathering(duration);
  return { duration, moodGain, projectId: hobby.projectId };
}

// Zeit formatieren (hh:mm:ss)
export function formatHobbyTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Neues Hobbyprojekt-Objekt erstellen
export function createHobbyProject(name) {
  return {
    id: `hobby_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: name.trim(),
    totalTimeMs: 0,
    createdAt: Date.now(),
  };
}
