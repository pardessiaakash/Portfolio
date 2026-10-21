// Hover sound for the home screen's category cards: the "UI hover for
// interfaces" effect (public/assets/sounds/card-hover-ui.mp3, trimmed to the
// sound itself so it fires instantly).
//
// Played through the Web Audio API: the file is decoded once into memory, so
// each hover starts with no delay and quick sweeps can overlap cleanly.
// Browsers only allow sound after the visitor has interacted with the page
// (a click, tap or key press), so the audio is unlocked on the first such
// gesture; hovers before that stay silent.

const SRC = "/assets/sounds/card-hover-ui.mp3";
const VOLUME = 0.225;    // subtle UI level (halved after review)
const MIN_GAP_MS = 70;   // sweeping across cards quickly never stacks sounds

let ctx = null;
let out = null;
let buffer = null;
let loading = null;
let lastPlay = 0;

// Mute switch, remembered in this browser
const MUTE_KEY = "portfolio-sound-muted";
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { /* storage blocked */ }
const listeners = new Set();
export const isMuted = () => muted;
export function setMuted(v) {
  muted = !!v;
  try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch (e) { /* storage blocked */ }
  listeners.forEach((fn) => fn(muted));
}
export function onMuteChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function setup() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  out = ctx.createGain();
  out.gain.value = VOLUME;
  out.connect(ctx.destination);
  return ctx;
}

function load() {
  if (buffer || loading || !ctx) return loading;
  loading = fetch(SRC)
    .then((r) => r.arrayBuffer())
    .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
    .then((b) => { buffer = b; })
    .catch(() => { loading = null; });   // try again on a later hover
  return loading;
}

// unlock (and fetch the sound) on the first user gesture
if (typeof window !== "undefined") {
  const unlock = () => {
    const c = setup();
    if (!c) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    load();
    ["pointerdown", "keydown", "touchstart"].forEach((ev) => window.removeEventListener(ev, unlock, true));
  };
  ["pointerdown", "keydown", "touchstart"].forEach((ev) => window.addEventListener(ev, unlock, true));
}

/** Play the hover sound (no-op until the page has been interacted with). */
export function playHoverTick() {
  if (muted || !ctx || ctx.state !== "running") return;
  if (!buffer) { load(); return; }
  const now = performance.now();
  if (now - lastPlay < MIN_GAP_MS) return;
  lastPlay = now;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(out);
  src.start();
}
