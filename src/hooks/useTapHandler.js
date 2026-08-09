// ============================================
// Zuverlässiges Antippen auf Leinwänden
// ============================================
// Die Leinwände stehen auf touch-action: none, weil Zoomen und Wischen
// selbst gesteuert werden. Der Preis: mobile Browser bilden das
// click-Ereignis danach nur noch unzuverlässig nach — auf dem Handy kam
// etwa jeder vierte Tipp an. Deshalb wird der Tipp hier direkt aus
// Pointer-Ereignissen gebildet, die immer und sofort feuern.
//
// Als Tipp zählt: ein einzelner Finger, kurz, ohne nennenswerte Bewegung.
// Zwei Finger (Pinch-Zoom) und Wischgesten lösen bewusst nichts aus.

import { useRef, useCallback } from 'react';

const TAP_MOVE_LIMIT = 12;    // CSS-Pixel Wackeln, die noch als Tipp gelten
const TAP_TIME_LIMIT = 700;   // ms — darüber ist es ein Halten, kein Tipp

export default function useTapHandler(onTap) {
  const active = useRef(new Set());
  const start = useRef(null);
  const wasMulti = useRef(false);

  const onPointerDown = useCallback((e) => {
    // Rechte/mittlere Maustaste ignorieren
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    active.current.add(e.pointerId);
    if (active.current.size > 1) {
      wasMulti.current = true;
      start.current = null;
      return;
    }
    // Zeiger einfangen, damit das Loslassen auch außerhalb ankommt
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* egal */ }
    start.current = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId };
  }, []);

  const onPointerUp = useCallback((e) => {
    active.current.delete(e.pointerId);
    const s = start.current;

    // Erst wenn alle Finger weg sind, entscheiden — sonst würde das
    // Loslassen des ersten Fingers beim Zoomen als Tipp durchgehen.
    if (active.current.size > 0) return;

    const multi = wasMulti.current;
    wasMulti.current = false;
    start.current = null;
    if (multi || !s || s.id !== e.pointerId) return;
    if (Date.now() - s.t > TAP_TIME_LIMIT) return;
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > TAP_MOVE_LIMIT) return;

    onTap(e);
  }, [onTap]);

  const onPointerCancel = useCallback((e) => {
    active.current.delete(e.pointerId);
    if (active.current.size === 0) wasMulti.current = false;
    start.current = null;
  }, []);

  return { onPointerDown, onPointerUp, onPointerCancel };
}

// Gemeinsame Stile für antippbare Leinwände: kein blauer Aufblitzer beim
// Tippen (der füllt bei einer bildschirmfüllenden Leinwand das ganze Bild),
// keine Textauswahl, kein Kontextmenü beim Halten.
export const TAPPABLE_CANVAS_STYLE = {
  WebkitTapHighlightColor: 'transparent',
  WebkitTouchCallout: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
};
