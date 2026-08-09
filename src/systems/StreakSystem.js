// ============================================
// Fokus-Streak — Tage mit Sammelreise oder Hobby
// ============================================
// Das Spiel ist im Kern ein Begleiter für echte Arbeitszeit. Der Streak
// belohnt Dranbleiben, ohne zu bestrafen: Bei einer Lücke gehen die
// Laternen am Weg nicht sofort aus, sie verlöschen langsam. Wer einen Tag
// verpasst, verliert also nicht alles.

const DAY = 24 * 60 * 60 * 1000;

/** Lokaler Tagesschlüssel (nicht UTC — der Spieltag richtet sich nach der Uhr) */
export function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(aKey, bKey) {
  const a = new Date(`${aKey}T12:00:00`);
  const b = new Date(`${bKey}T12:00:00`);
  return Math.round((b - a) / DAY);
}

export function getDefaultStreak() {
  return {
    current: 0,       // aktuelle Serie in Tagen
    best: 0,          // Bestwert
    lastDay: null,    // letzter Tag mit abgeschlossener Sitzung
    totalDays: 0,     // Tage insgesamt
    grace: 0,         // Restglut: verbliebene Laternen nach einer Lücke
  };
}

/**
 * Eine abgeschlossene Sitzung (Sammelreise oder Hobby) verbuchen.
 * @returns {{streak: object, changed: boolean, milestone: number|null}}
 */
export function recordSession(streak, ts = Date.now()) {
  const s = { ...getDefaultStreak(), ...(streak || {}) };
  const today = dayKey(ts);

  if (s.lastDay === today) {
    // Heute schon gezählt — mehrere Sitzungen pro Tag erhöhen nichts
    return { streak: s, changed: false, milestone: null };
  }

  const gap = s.lastDay ? daysBetween(s.lastDay, today) : null;

  if (gap === 1 || gap === null) {
    s.current = (s.current || 0) + 1;
  } else if (gap === 2 && s.grace > 0) {
    // Ein einzelner Fehltag kostet die Serie nicht, wenn noch Glut da ist
    s.current = (s.current || 0) + 1;
    s.grace = Math.max(0, s.grace - 1);
  } else {
    s.current = 1;
  }

  s.lastDay = today;
  s.totalDays = (s.totalDays || 0) + 1;
  s.best = Math.max(s.best || 0, s.current);
  // Alle 5 Tage Serie eine zusätzliche Nachsicht, maximal 3
  s.grace = Math.min(3, Math.max(s.grace, Math.floor(s.current / 5)));

  const milestone = MILESTONES.includes(s.current) ? s.current : null;
  return { streak: s, changed: true, milestone };
}

const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];

/**
 * Wie viele Laternen brennen gerade? Nach einer Lücke verlöschen sie
 * langsam, statt sofort auszugehen.
 */
export function activeLanterns(streak, ts = Date.now()) {
  const s = { ...getDefaultStreak(), ...(streak || {}) };
  if (!s.lastDay) return 0;

  const gap = daysBetween(s.lastDay, dayKey(ts));
  if (gap <= 0) return s.current;
  // Pro Fehltag erlischt ein Drittel der Serie
  const fade = Math.max(0, 1 - gap / 3);
  return Math.max(0, Math.round(s.current * fade));
}

/** Ist die Serie heute schon gesichert? */
export function isTodayDone(streak, ts = Date.now()) {
  return !!streak && streak.lastDay === dayKey(ts);
}

/** Text für die Anzeige */
export function streakLabel(streak) {
  const s = streak || getDefaultStreak();
  if (!s.current) return 'Noch keine Serie';
  return `${s.current} Tage in Folge`;
}
