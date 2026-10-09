// Minimal techno "tick" for hovering the home screen's category cards —
// in the spirit of a console dashboard moving between tiles: a short, soft,
// glassy blip with a faint airy echo. Generated with the Web Audio API, so
// there is no file to load.
//
// Browsers only allow sound after the visitor has interacted with the page
// (a click, tap or key press), so the audio context is unlocked on the first
// such gesture; hovers before that stay silent.

let ctx = null;
let out = null;
let lastPlay = 0;

const MIN_GAP_MS = 70;   // sweeping across cards quickly never stacks clicks
const VOLUME = 0.8;      // master level (each layer is quiet on its own)

function setup() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();

  // master → gentle low-pass (keeps it soft) → speakers, plus a short echo
  // send that gives the "space" of a dashboard UI sound
  out = ctx.createGain();
  out.gain.value = VOLUME;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 6500;
  tone.Q.value = 0.4;
  out.connect(tone);
  tone.connect(ctx.destination);

  const delay = ctx.createDelay(0.5);
  delay.delayTime.value = 0.075;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.22;
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  out.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(tone);
  return ctx;
}

// unlock on the first user gesture
if (typeof window !== "undefined") {
  const unlock = () => {
    const c = setup();
    if (c && c.state === "suspended") c.resume().catch(() => {});
    ["pointerdown", "keydown", "touchstart"].forEach((ev) => window.removeEventListener(ev, unlock, true));
  };
  ["pointerdown", "keydown", "touchstart"].forEach((ev) => window.addEventListener(ev, unlock, true));
}

/** One short layer: an oscillator with a quick pitch glide and a fast decay. */
function blip(c, { type, from, to, peak, decay, at }) {
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + 0.045);
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(peak, at + 0.003);      // near-instant attack
  env.gain.exponentialRampToValueAtTime(0.0001, at + decay);    // soft tail
  osc.connect(env);
  env.connect(out);
  osc.start(at);
  osc.stop(at + decay + 0.02);
}

/** Play the hover tick (no-op until the page has been interacted with). */
export function playHoverTick() {
  if (!ctx || ctx.state !== "running") return;
  const now = performance.now();
  if (now - lastPlay < MIN_GAP_MS) return;
  lastPlay = now;

  const t = ctx.currentTime + 0.005;
  // body: a rounded sine that drops slightly in pitch — the "tock"
  blip(ctx, { type: "sine", from: 1580, to: 1180, peak: 0.16, decay: 0.11, at: t });
  // sparkle: a quiet, higher triangle an octave+ above — the glassy edge
  blip(ctx, { type: "triangle", from: 3950, to: 3300, peak: 0.035, decay: 0.05, at: t });
}
