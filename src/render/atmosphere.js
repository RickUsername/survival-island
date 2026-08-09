// ============================================
// Atmosphäre — Tageszeit, Sonnenstand, Licht und Jahreszeit
// ============================================
// Das Spiel läuft auf Echtzeit (Bedürfnisse über Tage, Nahrung verdirbt
// in einer Woche). Also läuft auch die Insel auf Echtzeit: Wer abends
// spielt, sieht Abendrot; wer nachts spielt, sieht Sterne und Lagerfeuer.

import { mix, gradientAt } from './color';

// --- Sonnenauf-/untergang, grob für mitteleuropäische Breiten ---
// Der Tag ist im Sommer ~16,5 h lang, im Winter ~8 h.
function solarTimes(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);
  // Sonnenwende ~21. Juni (Tag 172)
  const season = Math.cos(((dayOfYear - 172) / 365) * Math.PI * 2); // 1 = Sommer
  const halfDay = 6.2 + season * 2.1; // halbe Tageslänge in Stunden
  return { sunrise: 13.1 - halfDay, sunset: 13.1 + halfDay, season };
}

// Farbverlauf des Umgebungslichts über den Sonnenstand.
// t: 0 = tiefe Nacht … 1 = Mittagshöchststand
const AMBIENT_STOPS = [
  { t: 0.00, c: [38, 52, 104] },   // tiefe Nacht — kühles Mondblau
  { t: 0.16, c: [64, 72, 128] },   // späte Nacht
  { t: 0.30, c: [126, 108, 158] },  // blaue Stunde, violett
  { t: 0.42, c: [214, 142, 122] },  // Dämmerungsrot
  { t: 0.54, c: [255, 198, 148] },  // goldene Stunde
  { t: 0.70, c: [255, 236, 206] },  // warmer Vormittag
  { t: 1.00, c: [255, 252, 240] },  // Mittag, fast neutral
];

const SKY_STOPS = [
  { t: 0.00, c: [10, 14, 38] },
  { t: 0.18, c: [24, 30, 66] },
  { t: 0.32, c: [92, 76, 130] },
  { t: 0.44, c: [226, 132, 108] },
  { t: 0.58, c: [255, 186, 126] },
  { t: 0.75, c: [138, 196, 236] },
  { t: 1.00, c: [124, 190, 240] },
];

/**
 * Berechnet den kompletten Lichtzustand für einen Zeitpunkt.
 * @param {Date} now
 * @param {number} overrideHour  optional: Stunde erzwingen (Debug/Cheat)
 */
export function getAtmosphere(now = new Date(), overrideHour = null) {
  const { sunrise, sunset, season } = solarTimes(now);
  const hour = overrideHour !== null
    ? overrideHour
    : now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

  const dayLength = sunset - sunrise;

  // Sonnenhöhe: -1 (Mitternacht) … +1 (Mittag)
  // Über den Tag ein Sinus, nachts weich nach unten fortgesetzt.
  let sunAlt;
  if (hour >= sunrise && hour <= sunset) {
    sunAlt = Math.sin(((hour - sunrise) / dayLength) * Math.PI);
  } else {
    const nightLength = 24 - dayLength;
    const intoNight = hour > sunset ? hour - sunset : hour + (24 - sunset);
    sunAlt = -Math.sin((intoNight / nightLength) * Math.PI) * 0.85;
  }

  // 0..1-Kurve für die Farbverläufe (Nacht → Mittag)
  const t = Math.max(0, Math.min(1, (sunAlt + 0.85) / 1.85));

  const ambient = gradientAt(AMBIENT_STOPS, t);
  const sky = gradientAt(SKY_STOPS, t);

  // Wie stark verdunkelt der Nachthimmel die Szene
  const darkness = Math.max(0, Math.min(1, (0.18 - sunAlt) / 0.85));
  const starAlpha = Math.max(0, Math.min(1, (-sunAlt - 0.05) / 0.35));

  // Sonnenrichtung: morgens von Osten (rechts), abends von Westen (links).
  // Bestimmt, wohin Schatten fallen.
  const dayProgress = Math.max(0, Math.min(1, (hour - sunrise) / dayLength));
  const sunX = Math.cos(dayProgress * Math.PI); // +1 Osten → -1 Westen
  const shadowDir = sunX;                        // Schatten zeigen weg von der Sonne
  // Tief stehende Sonne = lange Schatten
  const shadowLength = 0.55 + (1 - Math.max(0.08, Math.abs(sunAlt))) * 2.4;
  const shadowAlpha = 0.10 + Math.max(0, sunAlt) * 0.22;

  // Warmes Streiflicht bei tiefem Sonnenstand (Sonnenauf-/untergang)
  const goldenness = Math.max(0, 1 - Math.abs(sunAlt - 0.22) / 0.34) * (sunAlt > -0.1 ? 1 : 0);

  // Morgennebel: kurz nach Sonnenaufgang, stärker im Herbst
  const sinceSunrise = hour - sunrise;
  const mist = sinceSunrise > -0.6 && sinceSunrise < 2.2
    ? Math.max(0, 1 - Math.abs(sinceSunrise - 0.5) / 1.7) * (0.55 - season * 0.25)
    : 0;

  return {
    hour,
    sunrise,
    sunset,
    season,          // 1 = Hochsommer, -1 = Hochwinter
    sunAlt,
    t,
    ambient,
    sky,
    darkness,
    starAlpha,
    shadowDir,
    shadowLength,
    shadowAlpha,
    goldenness,
    mist,
    isNight: sunAlt < -0.06,
    isDark: sunAlt < 0.06,
    label: phaseLabel(hour, sunrise, sunset),
  };
}

function phaseLabel(hour, sunrise, sunset) {
  if (hour < sunrise - 1.2) return 'Nacht';
  if (hour < sunrise) return 'Morgendämmerung';
  if (hour < sunrise + 1.5) return 'Sonnenaufgang';
  if (hour < 11) return 'Vormittag';
  if (hour < 15) return 'Mittag';
  if (hour < sunset - 1.5) return 'Nachmittag';
  if (hour < sunset) return 'Goldene Stunde';
  if (hour < sunset + 1.2) return 'Abenddämmerung';
  return 'Nacht';
}

/**
 * Wetter färbt das Licht um. Jede Lage hat eine eigene Handschrift:
 * Regen entsättigt und kühlt, Gewitter verdunkelt zusätzlich, Nebel
 * hebt die Schwarzwerte an, Hitze überstrahlt, Schnee wirft alles
 * ins helle Blau zurück.
 */
export function applyWeather(atmo, weather) {
  switch (weather) {
    case 'rainy':
      return {
        ...atmo,
        ambient: mix(atmo.ambient, [116, 126, 140], 0.52),
        sky: mix(atmo.sky, [88, 96, 112], 0.6),
        shadowAlpha: atmo.shadowAlpha * 0.35,
        shadowLength: atmo.shadowLength * 0.6,
        goldenness: atmo.goldenness * 0.15,
        darkness: Math.min(1, atmo.darkness + 0.18),
        wet: true,
      };

    case 'storm':
      return {
        ...atmo,
        ambient: mix(atmo.ambient, [78, 84, 104], 0.68),
        sky: mix(atmo.sky, [46, 50, 68], 0.75),
        shadowAlpha: atmo.shadowAlpha * 0.18,
        shadowLength: atmo.shadowLength * 0.5,
        goldenness: 0,
        darkness: Math.min(1, atmo.darkness + 0.34),
        wet: true,
        storm: true,
      };

    case 'fog':
      return {
        ...atmo,
        ambient: mix(atmo.ambient, [196, 202, 208], 0.42),
        sky: mix(atmo.sky, [186, 194, 202], 0.7),
        shadowAlpha: atmo.shadowAlpha * 0.22,
        shadowLength: atmo.shadowLength * 0.5,
        goldenness: atmo.goldenness * 0.4,
        // Nebel liegt zusätzlich zum natürlichen Morgendunst
        mist: Math.max(atmo.mist, 0.85),
        fog: true,
      };

    case 'heat':
      return {
        ...atmo,
        ambient: mix(atmo.ambient, [255, 238, 196], 0.4),
        sky: mix(atmo.sky, [212, 214, 190], 0.45),
        shadowAlpha: atmo.shadowAlpha * 1.15,
        goldenness: Math.min(1, atmo.goldenness + 0.18),
        heat: true,
      };

    case 'snow':
      return {
        ...atmo,
        ambient: mix(atmo.ambient, [206, 220, 240], 0.55),
        sky: mix(atmo.sky, [162, 176, 196], 0.62),
        shadowAlpha: atmo.shadowAlpha * 0.3,
        shadowLength: atmo.shadowLength * 0.7,
        goldenness: atmo.goldenness * 0.3,
        darkness: Math.max(0, atmo.darkness - 0.12), // Schnee reflektiert
        snow: true,
      };

    default:
      return atmo;
  }
}
