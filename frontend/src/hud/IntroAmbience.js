// Life in the intro while the visitor isn't scrolling:
// - the frame tilts and shifts with the cursor (a slight 3D "look around"),
//   with a slow idle drift so it never feels frozen;
// - wherever the visitor stops scrolling, the camera hovers and the lights
//   glow and pulse (REST, HOVER, GLOW), and the frame splits into depth
//   layers that move apart with the cursor (DepthParallax);
// - rain keeps falling in the city part of the flight, in two depths that
//   shift by different amounts with the cursor, which sells the depth.
// Both ease out before the hand-off frame, so the live UI still lands
// exactly on the HUD drawn into the sequence. Off for reduced motion.
import { useEffect, useRef } from "react";

const RAIN = { from: 6, full: 12, fadeAt: 96, to: 114 };   // frames
const PARALLAX_OFF = { at: 122, to: 146 };                  // ease to 0 here (before the last HUD frame, 148)
// strength of the cursor "look around": degrees, pixels, overscan to hide
// the edges, and how quickly the scene follows the cursor (higher = snappier)
const MOVE = { rotY: 1.6, rotX: 1.1, shiftX: 14, shiftY: 9, overscan: 0.06, follow: 3 };

// Life while the visitor rests on a frame (eases in after a short pause,
// lets go quickly once scrolling resumes, fades out before the hand-off so
// the live UI still lands exactly on the last frame):
// - HOVER: the camera holds position like a drone in light wind: a slow,
//   uneven drift with a hint of roll (layered sines, never repeating exactly);
// - GLOW: the frame's own lights (neon, windows, ceiling strips) are lifted
//   into a soft glow layer that slowly swells and settles, with the odd faint
//   electrical flicker, so the lights feel powered.
const REST = { ms: 220, easeIn: 3, easeOut: 6, off: { at: 138, to: 147 } };
const HOVER = { x: 7, y: 5, roll: 0.22, overscan: 0.02 };       // px, px, deg, scale
const GLOW = { w: 320, h: 180, threshold: 165, gain: 2.1, min: 0.18, max: 0.55, blur: 14 };

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rainLevel = (f) =>
  f < RAIN.from || f > RAIN.to ? 0
    : f < RAIN.full ? (f - RAIN.from) / (RAIN.full - RAIN.from)
      : f > RAIN.fadeAt ? 1 - (f - RAIN.fadeAt) / (RAIN.to - RAIN.fadeAt) : 1;
const parallaxLevel = (f) => 1 - clamp01((f - PARALLAX_OFF.at) / (PARALLAX_OFF.to - PARALLAX_OFF.at));
const restLevel = (f) => 1 - clamp01((f - REST.off.at) / (REST.off.to - REST.off.at));

export default function IntroAmbience({ canvasRef, depthRef, frame, active }) {
  const rainRef = useRef(null);
  const glowRef = useRef(null);
  const frameRef = useRef(frame);
  const activeRef = useRef(active);
  frameRef.current = frame;
  activeRef.current = active;

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const scene = canvasRef.current;
    const rain = rainRef.current;
    if (!scene || !rain || !glowRef.current || reduce) return undefined;
    const ctx = rain.getContext("2d");

    let w = 0, h = 0;
    const size = () => { w = rain.width = window.innerWidth; h = rain.height = window.innerHeight; };
    size();
    window.addEventListener("resize", size);

    // Natural rain: three depths of thin, fast streaks. Far rain is short,
    // faint and dense; near rain is long, brighter and sparse. Each layer is
    // one batched path (cheap to draw).
    // Cross rain: every drop falls on its own slight slant. About half lean
    // from upper-left to lower-right, half from upper-right to lower-left,
    // a few fall nearly straight; each family sways with its own gusts, so
    // together they read as a soft criss-cross rather than straight lines.
    const slantOf = () => {
      const r = Math.random();
      const fam = r < 0.45 ? 1 : r < 0.9 ? -1 : 0;
      const mag = fam ? 0.12 + Math.random() * 0.26 : (Math.random() - 0.5) * 0.08;
      return { fam, s: fam ? fam * mag : mag };
    };
    const make = (n, len, v) => Array.from({ length: n }, () => ({
      x: Math.random() * 1.5 - 0.25, y: Math.random(),
      len: len[0] + Math.random() * (len[1] - len[0]),
      v: v[0] + Math.random() * (v[1] - v[0]),            // screen heights / s
      ...slantOf(),
    }));
    // 10% more drops than the straight rain had (170 / 90 / 28)
    const layers = [
      { drops: make(187, [9, 16], [1.9, 2.4]), alpha: 0.10, width: 0.6, depth: 6 },
      { drops: make(99, [18, 30], [2.6, 3.2]), alpha: 0.15, width: 0.9, depth: 14 },
      { drops: make(31, [34, 56], [3.6, 4.4]), alpha: 0.22, width: 1.3, depth: 26 },
    ];

    // cursor, normalised to -1..1 from the centre, smoothed
    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    const onMove = (e) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onLeave = () => { target.x = 0; target.y = 0; };
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);

    let level = 0, rainA = 0, last = performance.now(), raf;
    // how settled the visitor is (0 scrolling … 1 resting), and the clock
    // that runs only while resting (so every rest starts from stillness)
    let rest = 0, lastFrame = frameRef.current, lastMove = last, clock = 0;

    // glow layer: the bright parts of the paused frame, small and blurred
    const glow = glowRef.current;
    const gctx = glow.getContext("2d", { willReadFrequently: true });
    glow.width = GLOW.w; glow.height = GLOW.h;
    let glowFrame = -1;
    const buildGlow = () => {
      gctx.clearRect(0, 0, GLOW.w, GLOW.h);
      gctx.drawImage(scene, 0, 0, GLOW.w, GLOW.h);
      let img;
      try { img = gctx.getImageData(0, 0, GLOW.w, GLOW.h); } catch { gctx.clearRect(0, 0, GLOW.w, GLOW.h); return; }
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        // coloured light (neon, warm windows) glows fully; grey sky and
        // clouds only a little
        const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
        const sat = mx > 0 ? (mx - mn) / mx : 0;
        const k = lum > GLOW.threshold
          ? Math.min(1, ((lum - GLOW.threshold) / (255 - GLOW.threshold)) * GLOW.gain) * (0.35 + 0.65 * Math.min(1, sat * 2.5))
          : 0;
        d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; d[i + 3] = 255;
      }
      gctx.putImageData(img, 0, 0);
    };
    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const f = frameRef.current;
      const on = activeRef.current;

      // ease the effect strength (fades in/out smoothly)
      const wantLevel = on ? parallaxLevel(f) : 0;
      level += (wantLevel - level) * Math.min(1, dt * 4);
      cur.x += (target.x - cur.x) * Math.min(1, dt * MOVE.follow);
      cur.y += (target.y - cur.y) * Math.min(1, dt * MOVE.follow);

      // idle drift so a paused frame still breathes
      const ix = Math.sin(t / 3200) * 0.18, iy = Math.cos(t / 4100) * 0.12;
      const px = (cur.x + ix) * level, py = (cur.y + iy) * level;

      // rest: only once the frame has stayed put for a moment
      if (f !== lastFrame) { lastFrame = f; lastMove = t; }
      const resting = on && t - lastMove > REST.ms;
      rest += ((resting ? 1 : 0) - rest) * Math.min(1, dt * (resting ? REST.easeIn : REST.easeOut));
      const r = rest * (on ? restLevel(f) : 0);
      if (r > 0.001) clock += dt; else clock = 0;

      // drone hover: layered slow sines, starting from zero at each rest
      const c = clock;
      const hx = (Math.sin(c / 2.9) * 0.6 + Math.sin(c / 1.7 + 1.3) * 0.25 + Math.sin(c / 5.3 + 0.4) * 0.15) * r;
      const hy = (Math.sin(c / 3.7 + 0.8) * 0.6 + Math.sin(c / 2.1) * 0.3 + Math.sin(c / 6.1 + 2.1) * 0.1) * r;
      const hr = (Math.sin(c / 4.3 + 0.5) * 0.7 + Math.sin(c / 2.6 + 1.9) * 0.3) * r;
      const ramp = Math.min(1, c / 1.5);   // first moments: from still into drift

      const moving = level > 0.001 || r > 0.001;
      const transform = moving
        ? `perspective(1400px) rotateY(${px * MOVE.rotY}deg) rotateX(${-py * MOVE.rotX}deg) ` +
          `translate3d(${-px * MOVE.shiftX + hx * ramp * HOVER.x}px, ${-py * MOVE.shiftY + hy * ramp * HOVER.y}px, 0) ` +
          `rotate(${hr * ramp * HOVER.roll}deg) scale(${1 + MOVE.overscan * level + HOVER.overscan * r})`
        : "";

      // living light: build the glow once per rest, then let it swell
      if (resting && r > 0.02 && glowFrame !== f) { buildGlow(); glowFrame = f; }
      if (!resting && r < 0.02) glowFrame = -1;
      const swell = 0.5 - 0.5 * Math.cos(c * 2 * Math.PI / 5.5);                // slow rise and fall
      const flick = Math.sin(c * 23) * Math.sin(c * 3.1) > 0.93 ? 0.12 : 0;    // rare faint flicker
      const ga = glowFrame === f ? r * ramp * (GLOW.min + (GLOW.max - GLOW.min) * swell - flick) : 0;
      glow.style.opacity = ga > 0.005 ? ga.toFixed(3) : "0";
      glow.style.transform = transform;

      // depth layers: same transform as the frame, plus the cursor (and the
      // hover drift) moving near and far layers apart while the visitor rests
      const depth = depthRef?.current;
      if (depth) {
        if (depth.canvas) depth.canvas.style.transform = transform;
        if (resting && glowFrame !== f) depth.prefetch(f);
        depth.setOffset(px + hx * ramp * 0.35, py + hy * ramp * 0.35, r);
      }

      if (moving) {
        scene.style.transform = transform;
      } else if (scene.style.transform) {
        scene.style.transform = "";
      }

      // rain
      const wantRain = on ? rainLevel(f) : 0;
      rainA += (wantRain - rainA) * Math.min(1, dt * 3);
      ctx.clearRect(0, 0, w, h);
      if (rainA < 0.01) return;
      // each slant family gusts on its own rhythm (and the straight ones barely)
      const gust = {
        1: Math.sin(t / 2300) * 0.05 + Math.sin(t / 700) * 0.015,
        "-1": Math.sin(t / 2900 + 1.7) * 0.05 + Math.sin(t / 830 + 0.6) * 0.015,
        0: Math.sin(t / 3700) * 0.02,
      };
      const aspect = h / w;
      ctx.lineCap = "round";
      for (const { drops, alpha, width, depth } of layers) {
        const ox = -px * depth, oy = -py * depth * 0.5;
        ctx.strokeStyle = `rgba(205,222,232,${alpha * rainA})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        for (const d of drops) {
          const sl = d.s + gust[d.fam] * (d.fam || 1);
          d.y += d.v * dt;
          d.x += d.v * dt * sl * aspect;            // drift sideways along the slant
          if (d.y > 1.08 || d.x < -0.3 || d.x > 1.3) {
            Object.assign(d, slantOf());
            d.y = -0.08 - Math.random() * 0.1;
            // start further upwind, so slanted drops still cover the screen
            d.x = Math.random() * 1.2 - 0.1 - d.s * 0.5;
          }
          const x = d.x * w + ox, y = d.y * h + oy;
          ctx.moveTo(x, y);
          ctx.lineTo(x + d.len * sl, y + d.len);     // short streak along its own path
        }
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      scene.style.transform = "";
    };
  }, [canvasRef, depthRef]);

  return (
    <>
      {/* the paused frame's lights, blurred and screened over it (see GLOW) */}
      <canvas ref={glowRef} aria-hidden
        style={{ position: "absolute", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 2,
          opacity: 0, mixBlendMode: "screen", filter: `blur(${GLOW.blur}px)`, transformOrigin: "50% 50%", willChange: "opacity, transform" }} />
      <canvas ref={rainRef} aria-hidden
        style={{ position: "absolute", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 3 }} />
    </>
  );
}
