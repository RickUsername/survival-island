// ============================================
// Klang der Insel — Musik und lebendige Geräuschkulisse
// ============================================
// Die Musik ist eine Datei (public/audio). Die Kulisse dagegen wird
// vollständig in der Web Audio API erzeugt: Wind und Regen aus gefiltertem
// Rauschen, Vögel aus kurzen Gleittönen, Grillen aus getakteten Impulsen.
// Das kostet keinen einzigen zusätzlichen Download und passt sich stufenlos
// an Tageszeit und Wetter an.
//
// Browser erlauben Ton erst nach einer Nutzerinteraktion — deshalb wird
// alles erst bei `unlock()` aufgebaut, das an einen Klick gehängt wird.

const MUSIC_URL = `${process.env.PUBLIC_URL || ''}/audio/pixel-bloom-serenade.mp3`;

let ctx = null;
let master = null;
let musicGain = null;
let ambienceGain = null;
let musicEl = null;
let musicNode = null;

let windGain = null;
let rainGain = null;
let waterGain = null;
let fireGain = null;

let birdTimer = null;
let cricketTimer = null;

let unlocked = false;
let enabled = true;
let musicEnabled = true;

// Aktueller Szenenzustand, damit die Timer wissen, was sie spielen sollen
const scene = { sunAlt: 0.5, weather: 'sunny', nearFire: 0, season: 0 };

/** Weißes Rauschen als wiederverwendbarer Puffer */
function makeNoiseBuffer(seconds = 2) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** Dauerhafte Rauschquelle über einen Filter */
function noiseLayer(buffer, filterType, freq, q, gainValue) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = freq;
  if (q) filter.Q.value = q;

  const gain = ctx.createGain();
  gain.gain.value = gainValue;

  src.connect(filter).connect(gain).connect(ambienceGain);
  src.start();
  return gain;
}

/** Kurzer Vogelruf: zwei bis vier gleitende Töne */
function chirp(baseFreq, when) {
  const notes = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < notes; i++) {
    const t0 = when + i * (0.07 + Math.random() * 0.05);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';

    const f0 = baseFreq * (0.9 + Math.random() * 0.35);
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(f0 * (1.2 + Math.random() * 0.5), t0 + 0.05);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.85, t0 + 0.1);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);

    osc.connect(g).connect(ambienceGain);
    osc.start(t0);
    osc.stop(t0 + 0.14);
  }
}

/** Grillenzirpen: schnelle Impulsfolge auf hoher Frequenz */
function chirrup(when) {
  const pulses = 4 + Math.floor(Math.random() * 4);
  const base = 4200 + Math.random() * 900;
  for (let i = 0; i < pulses; i++) {
    const t0 = when + i * 0.035;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = base;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.018, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.022);
    osc.connect(g).connect(ambienceGain);
    osc.start(t0);
    osc.stop(t0 + 0.03);
  }
}

function scheduleBirds() {
  clearTimeout(birdTimer);
  // Am aktivsten um die Dämmerung, nachts still
  const active = Math.max(0, Math.min(1, (scene.sunAlt + 0.1) * 2.2));
  const wetPenalty = (scene.weather === 'rainy' || scene.weather === 'storm' || scene.weather === 'snow') ? 0.25 : 1;
  const winterPenalty = scene.season < -0.5 ? 0.4 : 1;
  const rate = active * wetPenalty * winterPenalty;

  if (rate > 0.05 && ctx && enabled) {
    chirp(1800 + Math.random() * 1400, ctx.currentTime + 0.05);
  }
  const delay = 1200 + Math.random() * 5000 / Math.max(0.15, rate);
  birdTimer = setTimeout(scheduleBirds, Math.min(delay, 22000));
}

function scheduleCrickets() {
  clearTimeout(cricketTimer);
  const night = Math.max(0, Math.min(1, (-scene.sunAlt - 0.02) * 3));
  const coldPenalty = scene.season < -0.35 ? 0.15 : 1;
  const rate = night * coldPenalty;

  if (rate > 0.08 && ctx && enabled) {
    chirrup(ctx.currentTime + 0.05);
  }
  const delay = 500 + Math.random() * 2200 / Math.max(0.1, rate);
  cricketTimer = setTimeout(scheduleCrickets, Math.min(delay, 15000));
}

/** Baut den Audiograph auf. Muss aus einem Nutzer-Event heraus laufen. */
export function unlock() {
  if (unlocked) {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return;
  }

  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? 1 : 0;
    master.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(master);

    ambienceGain = ctx.createGain();
    ambienceGain.gain.value = 0.9;
    ambienceGain.connect(master);

    const noise = makeNoiseBuffer(3);
    // Wind: tiefes, breites Rauschen
    windGain = noiseLayer(noise, 'lowpass', 420, 0.7, 0.02);
    // Regen: helles Prasseln
    rainGain = noiseLayer(noise, 'highpass', 1100, 0.5, 0);
    // Wasserplätschern vom Teich
    waterGain = noiseLayer(noise, 'bandpass', 780, 1.4, 0.006);
    // Knistern des Feuers
    fireGain = noiseLayer(noise, 'bandpass', 320, 0.9, 0);

    // Musik über ein <audio>-Element (streamt, statt 700 kB zu dekodieren)
    musicEl = new Audio(MUSIC_URL);
    musicEl.loop = true;
    musicEl.crossOrigin = 'anonymous';
    musicEl.volume = 1;
    musicNode = ctx.createMediaElementSource(musicEl);
    musicNode.connect(musicGain);
    if (musicEnabled) {
      musicEl.play().catch(() => {});
      musicGain.gain.setTargetAtTime(0.16, ctx.currentTime, 3);
    }

    scheduleBirds();
    scheduleCrickets();
    unlocked = true;
  } catch (err) {
    console.warn('Audio konnte nicht gestartet werden:', err);
    ctx = null;
  }
}

/**
 * Mischung an die Szene anpassen. Darf jederzeit aufgerufen werden,
 * auch bevor der Ton freigeschaltet ist.
 */
export function setScene({ sunAlt, weather, season, nearFire }) {
  if (sunAlt !== undefined) scene.sunAlt = sunAlt;
  if (weather !== undefined) scene.weather = weather;
  if (season !== undefined) scene.season = season;
  if (nearFire !== undefined) scene.nearFire = nearFire;

  if (!ctx || !unlocked) return;
  const now = ctx.currentTime;
  const smooth = 1.5;

  const stormy = scene.weather === 'storm';
  const rainy = scene.weather === 'rainy' || stormy;
  const snowy = scene.weather === 'snow';

  // Wind frischt bei Sturm deutlich auf
  windGain.gain.setTargetAtTime(stormy ? 0.075 : rainy ? 0.038 : snowy ? 0.03 : 0.018, now, smooth);
  rainGain.gain.setTargetAtTime(stormy ? 0.055 : rainy ? 0.032 : 0, now, smooth);
  waterGain.gain.setTargetAtTime(rainy ? 0.002 : 0.006, now, smooth);
  fireGain.gain.setTargetAtTime(Math.min(1, scene.nearFire) * 0.03, now, 0.8);

  // Nachts leiser
  const nightDamp = scene.sunAlt < -0.1 ? 0.6 : 1;
  ambienceGain.gain.setTargetAtTime(0.9 * nightDamp, now, smooth);
}

/** Ton komplett an/aus */
export function setEnabled(on) {
  enabled = on;
  if (!ctx) return;
  master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.3);
  if (!on && musicEl) musicEl.pause();
  else if (on && musicEnabled && musicEl) musicEl.play().catch(() => {});
}

/** Nur die Musik an/aus (Kulisse läuft weiter) */
export function setMusicEnabled(on) {
  musicEnabled = on;
  if (!ctx || !musicEl) return;
  if (on) {
    musicEl.play().catch(() => {});
    musicGain.gain.setTargetAtTime(0.16, ctx.currentTime, 1.5);
  } else {
    musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.8);
    setTimeout(() => { if (!musicEnabled && musicEl) musicEl.pause(); }, 1200);
  }
}

export function isEnabled() { return enabled; }
export function isMusicEnabled() { return musicEnabled; }

/** Beim Verlassen aufräumen */
export function dispose() {
  clearTimeout(birdTimer);
  clearTimeout(cricketTimer);
  if (musicEl) { musicEl.pause(); musicEl = null; }
  if (ctx) { ctx.close().catch(() => {}); ctx = null; }
  unlocked = false;
}
