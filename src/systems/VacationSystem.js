// ============================================
// Urlaubsmodus-System
// ============================================

import { VACATION_HOURS_PER_YEAR } from '../utils/constants';

// Verbleibende Urlaubsstunden berechnen
export function getRemainingVacationHours(vacation) {
  const currentYear = new Date().getFullYear();

  // Jahreswechsel: Kontingent zurücksetzen
  if (vacation.currentYear !== currentYear) {
    return VACATION_HOURS_PER_YEAR;
  }

  // Aktuell laufenden Urlaub einrechnen
  let used = vacation.usedHoursThisYear;
  if (vacation.isActive && vacation.activatedAt) {
    const activeMs = Date.now() - vacation.activatedAt;
    const activeHours = activeMs / (60 * 60 * 1000);
    used += activeHours;
  }

  return Math.max(0, VACATION_HOURS_PER_YEAR - used);
}

// Verbleibende Urlaubstage (für Anzeige)
export function getRemainingVacationDays(vacation) {
  return getRemainingVacationHours(vacation) / 24;
}

// Urlaub aktivieren
export function activateVacation(vacation) {
  if (vacation.isActive) return vacation;

  const remaining = getRemainingVacationHours(vacation);
  if (remaining <= 0) return vacation;

  return {
    ...vacation,
    isActive: true,
    activatedAt: Date.now(),
    currentYear: new Date().getFullYear(),
  };
}

// Urlaub deaktivieren
export function deactivateVacation(vacation) {
  if (!vacation.isActive) return vacation;

  const activeMs = Date.now() - (vacation.activatedAt || Date.now());
  const activeHours = activeMs / (60 * 60 * 1000);

  return {
    ...vacation,
    isActive: false,
    activatedAt: null,
    usedHoursThisYear: vacation.usedHoursThisYear + activeHours,
    currentYear: new Date().getFullYear(),
  };
}

// Prüfen ob Urlaub automatisch enden muss (Kontingent aufgebraucht)
export function checkVacationExpiry(vacation) {
  if (!vacation.isActive) return vacation;

  const remaining = getRemainingVacationHours(vacation);
  if (remaining <= 0) {
    return deactivateVacation(vacation);
  }

  return vacation;
}

// Urlaubs-Info formatieren
export function formatVacationInfo(vacation) {
  const remaining = getRemainingVacationHours(vacation);
  const days = Math.floor(remaining / 24);
  const hours = Math.floor(remaining % 24);

  return {
    isActive: vacation.isActive,
    remainingDays: days,
    remainingHours: hours,
    totalRemainingHours: remaining,
    displayText: `${days}T ${hours}h`,
  };
}
