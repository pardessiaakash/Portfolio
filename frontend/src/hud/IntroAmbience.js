// Life in the intro while the visitor isn't scrolling:
// - the frame tilts and shifts with the cursor (a slight 3D "look around"),
//   with a slow idle drift so it never feels frozen;
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

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rainLevel = (f) =>
  f < RAIN.from || f > RAIN.to ? 0
    : f < RAIN.full ? (f - RAIN.from) / (RAIN.full - RAIN.from)
      : f > RAIN.fadeAt ? 1 - (f - RAIN.fadeAt) / (RAIN.to - RAIN.fadeAt) : 1;
const parallaxLevel = (f) => 1 - clamp01((f - PARALLAX_OFF.at) / (PARALLAX_OFF.to - PARALLAX_OFF.at));

export default function IntroAmbience({ canvasRef, frame, active }) {
  const rainRef = useRef(null);
  const frameRef = useRef(frame);
  const activeRef = useRef(active);
  frameRef.current = frame;
  activeRef.current = active;

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const scene = canvasRef.current;
    const rain = rainRef.current;
    if (!scene || !rain || reduce) return undefined;
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

      if (level > 0.001) {
        scene.style.transform =
          `perspective(1400px) rotateY(${px * MOVE.rotY}deg) rotateX(${-py * MOVE.rotX}deg) ` +
          `translate3d(${-px * MOVE.shiftX}px, ${-py * MOVE.shiftY}px, 0) scale(${1 + MOVE.overscan * level})`;
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
  }, [canvasRef]);

  return (
    <canvas ref={rainRef} aria-hidden
      style={{ position: "absolute", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 3 }} />
  );
}
