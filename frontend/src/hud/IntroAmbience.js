// Life in the intro while the visitor isn't scrolling:
// - the frame tilts and shifts with the cursor (a slight 3D "look around"),
//   with a slow idle drift so it never feels frozen;
// - rain keeps falling in the city part of the flight, in two depths that
//   shift by different amounts with the cursor, which sells the depth.
// Both ease out before the hand-off frame, so the live UI still lands
// exactly on the HUD drawn into the sequence. Off for reduced motion.
import { useEffect, useRef } from "react";

const RAIN = { from: 6, full: 12, fadeAt: 96, to: 114 };   // frames
const PARALLAX_OFF = { at: 128, to: 150 };                  // ease to 0 here
// strength of the cursor "look around": degrees, pixels, overscan to hide
// the edges, and how quickly the scene follows the cursor (higher = snappier)
const MOVE = { rotY: 5, rotX: 3.5, shiftX: 42, shiftY: 28, overscan: 0.16, follow: 9 };

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

    // two depths of rain: far = short, faint, slow; near = long, brighter, fast
    const make = (n, near) => Array.from({ length: n }, () => ({
      x: Math.random(), y: Math.random(),
      len: near ? 18 + Math.random() * 22 : 8 + Math.random() * 10,
      v: near ? 1.6 + Math.random() * 0.8 : 0.8 + Math.random() * 0.4,   // screen heights / s
      a: near ? 0.22 + Math.random() * 0.18 : 0.10 + Math.random() * 0.10,
    }));
    const layers = [{ drops: make(140, false), depth: 30 }, { drops: make(70, true), depth: 95 }];

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
      const ix = Math.sin(t / 2600) * 0.22, iy = Math.cos(t / 3400) * 0.16;
      const px = (cur.x + ix) * level, py = (cur.y + iy) * level;

      if (level > 0.001) {
        scene.style.transform =
          `perspective(1800px) rotateY(${px * MOVE.rotY}deg) rotateX(${-py * MOVE.rotX}deg) ` +
          `translate3d(${-px * MOVE.shiftX}px, ${-py * MOVE.shiftY}px, 0) scale(${1 + MOVE.overscan * level})`;
      } else if (scene.style.transform) {
        scene.style.transform = "";
      }

      // rain
      const wantRain = on ? rainLevel(f) : 0;
      rainA += (wantRain - rainA) * Math.min(1, dt * 3);
      ctx.clearRect(0, 0, w, h);
      if (rainA < 0.01) return;
      const slant = 0.18 + cur.x * 0.12;           // wind leans with the cursor
      ctx.lineCap = "round";
      for (const { drops, depth } of layers) {
        const ox = -px * depth, oy = -py * depth * 0.6;
        ctx.lineWidth = depth > 20 ? 1.3 : 0.8;
        for (const d of drops) {
          d.y += d.v * dt;
          if (d.y > 1.1) { d.y = -0.1; d.x = Math.random() * 1.2 - 0.1; }
          const x = d.x * w + ox, y = d.y * h + oy;
          ctx.strokeStyle = `rgba(200,225,235,${d.a * rainA})`;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - d.len * slant, y + d.len);
          ctx.stroke();
        }
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
