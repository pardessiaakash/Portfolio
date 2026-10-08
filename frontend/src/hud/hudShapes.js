// HUD panel outlines from the Figma frame "Main_Landing_Page_For Claude"
// (Main_Big_Tab vector and the chat panel vector).
//
// The outlines are generated from each panel's live size instead of being a
// fixed SVG, so they stay correct while the split handle is dragged: notches,
// steps and corner radii keep their size and only the straight runs stretch.
// Every Figma measurement is multiplied by `k` (panel height / Figma height)
// so the features keep the design's proportions at the panel's height.

import React, { useLayoutEffect, useRef, useState } from "react";
import { STROKE_STOPS, STROKE_ANGLE } from "./glass";

const FIGMA_H = 632; // height of both HUD vectors in the Figma frame

export const hudScale = (h) => h / FIGMA_H;

// Main HUD right-edge step (Figma units): where it starts and how deep it is.
const MAIN_STEP_Y = 171;
const MAIN_STEP = 25.5;

/* ── geometry helpers ─────────────────────────────────────────────────── */

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const len = (v) => Math.hypot(v.x, v.y);
const unit = (v) => { const l = len(v) || 1; return { x: v.x / l, y: v.y / l }; };
const f = (n) => Math.round(n * 100) / 100;

/**
 * Closed outline through `nodes` (clockwise, y down). Each node is
 * { x, y, r } and gets a circular corner of radius r (shrunk if the
 * neighbouring edges are too short, like Figma does). A node may carry
 * `arc: { r, sweep }` to join it to the next node with a circular arc
 * instead of a straight line.
 */
export function buildPath(nodes) {
  const n = nodes.length;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const p = nodes[(i - 1 + n) % n], v = nodes[i], q = nodes[(i + 1) % n];
    const r = v.r || 0;
    if (!r || p.arc || v.arc) { pts.push({ a: v, b: v, r: 0 }); continue; }
    const u1 = unit(sub(p, v)), u2 = unit(sub(q, v));
    const cos = Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y));
    const half = Math.acos(cos) / 2;               // half the interior angle
    let t = r / Math.tan(half);                    // tangent length
    const tMax = Math.min(len(sub(p, v)), len(sub(q, v))) / 2;
    if (t > tMax) t = tMax;
    const rEff = t * Math.tan(half);
    const d1 = sub(v, p), d2 = sub(q, v);
    const sweep = d1.x * d2.y - d1.y * d2.x > 0 ? 1 : 0;
    pts.push({
      a: { x: v.x + u1.x * t, y: v.y + u1.y * t },
      b: { x: v.x + u2.x * t, y: v.y + u2.y * t },
      r: rEff, sweep,
    });
  }
  let d = `M ${f(pts[0].b.x)} ${f(pts[0].b.y)}`;
  for (let i = 1; i <= n; i++) {
    const cur = pts[i % n];
    const prevNode = nodes[(i - 1) % n];
    if (prevNode.arc) {
      d += ` A ${f(prevNode.arc.r)} ${f(prevNode.arc.r)} 0 0 ${prevNode.arc.sweep} ${f(cur.a.x)} ${f(cur.a.y)}`;
    } else {
      d += ` L ${f(cur.a.x)} ${f(cur.a.y)}`;
    }
    if (cur.r > 0) d += ` A ${f(cur.r)} ${f(cur.r)} 0 0 ${cur.sweep} ${f(cur.b.x)} ${f(cur.b.y)}`;
  }
  return d + " Z";
}

/* ── the two HUD shapes ───────────────────────────────────────────────── */

/**
 * Left (main) HUD. Right edge: full width for the top section, then a 45°
 * step inward. Bottom: a lower section between ~40% of the width and the
 * right side, entered and left with 45° corners.
 */
export function mainHudPath(w, h, k = hudScale(h)) {
  const r = 20 * k;
  const stepY = MAIN_STEP_Y * k;   // where the right-edge step starts
  const step = MAIN_STEP * k;      // how far the right edge steps in
  const dropL = 34 * k;            // depth of the bottom section, left side
  const dropR = 32 * k;            // ... right side
  const xL = w * (419.4 / 1056.45);            // bottom section starts
  const xR = w - step - 65.2 * k;              // bottom section ends
  return buildPath([
    { x: 0, y: 0, r },
    { x: w, y: 0, r },
    { x: w, y: stepY, r },
    { x: w - step, y: stepY + step, r },
    { x: w - step, y: h - dropR, r },
    { x: xR, y: h - dropR, r },
    { x: xR - dropR, y: h, r },
    { x: xL + dropL, y: h, r },
    { x: xL, y: h - dropL, r },
    { x: 0, y: h - dropL, r },
  ]);
}

/**
 * Chat HUD. Left edge: set in for the top section, then a 45° step out to
 * full width (mirrors the main HUD's step). Top-right: a circular cut that
 * wraps the orb, concentric with it.
 *   orb = { cx, cy, r } in panel coordinates; gap = space around the orb.
 */
export function chatHudPath(w, h, orb, k = hudScale(h), channel = null) {
  const r = 20 * k;
  // Left edge. With `channel`, it is the main HUD's right edge offset by
  // channel.gap, so the gap between the two HUDs is equally wide along the
  // straight runs, the diagonal and the corners. Without it: Figma values.
  const ch = channel || { inset: 23 * k, stepY: 189.3 * k, step: 22.3 * k, rUpper: r, rLower: r };
  const { inset, stepY, step } = ch;
  const nodes = [{ x: inset, y: 0, r }];
  if (orb) {
    const R = orb.r + 20 * k;      // cut radius: orb plus a ring of space
    const topX = orb.cx - Math.sqrt(Math.max(0, R * R - orb.cy * orb.cy));
    const sideY = orb.cy + Math.sqrt(Math.max(0, R * R - (w - orb.cx) ** 2));
    nodes.push({ x: topX, y: 0, r: 0, arc: { r: R, sweep: 0 } });
    nodes.push({ x: w, y: sideY, r: 0 });
  } else {
    nodes.push({ x: w, y: 0, r });
  }
  nodes.push(
    { x: w, y: h, r },
    { x: 0, y: h, r },
    { x: 0, y: stepY + step, r: ch.rLower },
    { x: inset, y: stepY, r: ch.rUpper },
  );
  return buildPath(nodes);
}

/**
 * Chat left-edge geometry that runs parallel to the main HUD's right edge at
 * distance `gap` (the main HUD's right-edge step, offset outward). Same top,
 * so y values line up; x is measured from the chat panel's left edge, which
 * sits `gap - step` from the main panel's right edge.
 *   upper run:   x = inset            (main's full-width edge + gap)
 *   45° run:     starts gap·(√2−1) lower than main's, same depth
 *   lower run:   x = 0                (main's stepped-in edge + gap)
 *   corners:     concentric with main's (radius r + gap / r − gap)
 */
export function hudChannel(h, gap, k = hudScale(h)) {
  const r = 20 * k;
  const step = MAIN_STEP * k;
  return {
    gap,
    inset: step,
    step,
    stepY: MAIN_STEP_Y * k + gap * (Math.SQRT2 - 1),
    rUpper: r + gap,
    rLower: Math.max(1, r - gap),
  };
}

/* ── size measuring ───────────────────────────────────────────────────── */

/** Layout size of an element (ignores CSS transforms such as the stage scale). */
export function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize((s) =>
      s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/* ── outline stroke ───────────────────────────────────────────────────── */

let gradSeq = 0;

/**
 * Draws the panel's glass edge along `d`: Figma's gradient border, a
 * specular rim lit from the top-left, and a soft inner glow. Sits inside
 * the clipped panel, so a 2px stroke shows as a 1px inside border, like
 * Figma's "inside" stroke.
 */
export function HudOutline({ d, w, h, border = 0 }) {
  // `border`: width of the host's CSS border. Absolute children are placed
  // from the padding box, but `d` (like clip-path) is in border-box pixels.
  const idRef = useRef(null);
  if (!idRef.current) idRef.current = `hud-stroke-${++gradSeq}`;
  if (!d || !w || !h) return null;
  const id = idRef.current;
  // CSS-style gradient line for an angle, in panel pixels
  const line = (deg) => {
    const a = (deg * Math.PI) / 180;
    const dir = { x: Math.sin(a), y: -Math.cos(a) };
    const half = (Math.abs(w * dir.x) + Math.abs(h * dir.y)) / 2;
    const cx = w / 2, cy = h / 2;
    return { x1: cx - dir.x * half, y1: cy - dir.y * half, x2: cx + dir.x * half, y2: cy + dir.y * half };
  };
  return (
    <svg
      width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      style={{ position: "absolute", left: -border, top: -border, pointerEvents: "none", zIndex: 3, overflow: "visible" }}
      aria-hidden
    >
      <defs>
        {/* Figma border: grey → green → grey across the diagonal */}
        <linearGradient id={`${id}-stroke`} gradientUnits="userSpaceOnUse" {...line(STROKE_ANGLE)}>
          {STROKE_STOPS.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
        </linearGradient>
        {/* specular rim: light from the top-left, fading around the edge */}
        <linearGradient id={`${id}-spec`} gradientUnits="userSpaceOnUse" {...line(150)}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="0.28" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.22" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      {/* soft inner glow along the edge (the panel clip keeps it inside) */}
      <path d={d} fill="none" stroke="#fff" strokeOpacity="0.05" strokeWidth="18" filter={`url(#${id}-glow)`} />
      {/* thin inner bevel just inside the edge */}
      <path d={d} fill="none" stroke="#fff" strokeOpacity="0.06" strokeWidth="5" />
      <path d={d} fill="none" stroke={`url(#${id}-stroke)`} strokeWidth="2" />
      <path d={d} fill="none" stroke={`url(#${id}-spec)`} strokeWidth="1.5"
        transform={`translate(${0.6} ${0.8})`} />
    </svg>
  );
}
