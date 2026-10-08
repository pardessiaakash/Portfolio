// Dark "liquid glass" styling for the home-screen HUD (Figma frame
// "Main_Landing_Page_For Claude"), plus the hover effect for buttons: the
// gradient border turns while hovered and stays where it stopped on leave.

import { useEffect, useRef } from "react";

/* ── Figma stroke gradient (grey → green → grey along the diagonal) ─────── */

export const STROKE_STOPS = [
  [0, "#8F8F8F"],
  [0.2655, "#636363"],
  [0.4856, "#00CD1F"],
  [0.7092, "#636363"],
  [1, "#8F8F8F"],
];
// CSS direction of the Figma stroke gradient (top-left → bottom-right)
export const STROKE_ANGLE = 144;

const cssStops = STROKE_STOPS.map(([o, c]) => `${c} ${(o * 100).toFixed(1)}%`).join(", ");
export const strokeGradientCss = (spinVar = "var(--spin, 0deg)") =>
  `linear-gradient(calc(${STROKE_ANGLE}deg + ${spinVar}), ${cssStops})`;

/* ── glass surface for rectangular elements ───────────────────────────── */

const GLASS_FILL =
  "linear-gradient(160deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.035) 38%, rgba(255,255,255,0.015) 100%)";
const GLASS_BACKDROP = "blur(22px) saturate(170%)";

/** Translucent dark glass: blurred, saturated backdrop with a lit top edge. */
export const glassSx = ({ shadow = true } = {}) => ({
  background: GLASS_FILL,
  backgroundColor: "rgba(12,14,13,0.28)",
  backdropFilter: GLASS_BACKDROP,
  WebkitBackdropFilter: GLASS_BACKDROP,
  boxShadow: [
    "inset 0 1px 0 rgba(255,255,255,0.16)",     // light catching the top edge
    "inset 0 -1px 1px rgba(0,0,0,0.30)",        // darker lower edge
    "inset 0 0 16px rgba(255,255,255,0.025)",   // soft inner glow
    shadow ? "4px 13px 19px rgba(0,0,0,0.35)" : null, // Figma drop shadow
  ].filter(Boolean).join(", "),
});

/** Glass fill for SVG-shaped elements (the shape itself is the clip). */
export const glassShapeSx = {
  background: GLASS_FILL,
  backgroundColor: "rgba(12,14,13,0.28)",
  backdropFilter: GLASS_BACKDROP,
  WebkitBackdropFilter: GLASS_BACKDROP,
};

/**
 * HUD material: clear dark glass with a faint green cast. About 60% of the
 * (already dimmed) room shows through, heavily blurred so it reads as soft
 * light and colour, never detail. The backdrop is also darkened a little so
 * text keeps strong contrast. A sheen is brightest along the top edge and
 * fades down the panel, like light catching the glass. The specular rim is
 * drawn separately (HudOutline for shaped panels, glassHudRectSx for
 * rectangles).
 */
const HUD_TINT = "rgba(10,20,14,0.42)";     // 42% green-black tint → room clearly shows through
const HUD_BACKDROP = "blur(18px) saturate(170%) brightness(0.95)";
export const glassPanelSx = {
  background: [
    // light catching the top edge, fading down the panel
    "linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.025) 22%, rgba(255,255,255,0) 50%)",
    // faint green glow toward the top-left, ties the glass to the HUD green
    "radial-gradient(120% 90% at 0% 0%, rgba(0,205,31,0.06) 0%, rgba(0,205,31,0) 55%)",
    // slight lift at the bottom-right edge
    "linear-gradient(155deg, rgba(255,255,255,0) 70%, rgba(255,255,255,0.025) 100%)",
  ].join(", "),
  backgroundColor: HUD_TINT,
  backdropFilter: HUD_BACKDROP,
  WebkitBackdropFilter: HUD_BACKDROP,
};

/** Same material for rectangular HUD pieces (the social bar). */
export const glassHudRectSx = {
  ...glassPanelSx,
  isolation: "isolate",
  boxShadow: [
    "inset 0 1px 0 rgba(255,255,255,0.10)",     // top bevel
    "inset 0 1px 2px rgba(0,0,0,0.25)",         // Figma inner shadow
    "inset 0 0 18px rgba(255,255,255,0.03)",    // soft inner glow
    "4px 13px 19px rgba(0,0,0,0.35)",           // Figma drop shadows
    "-16px 0 19px rgba(0,0,0,0.25)",
  ].join(", "),
  // specular rim: light catching the top-left edge, a softer glint at the
  // bottom-right, drawn as a thin ring over the gradient border
  "&::after": {
    content: '""',
    position: "absolute",
    inset: 0,
    borderRadius: "inherit",
    padding: "1px",
    background:
      "linear-gradient(150deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.08) 28%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.22) 100%)",
    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
    pointerEvents: "none",
    zIndex: 2,
  },
};

/**
 * Gradient border ring drawn by ::before, for elements with a CSS
 * border-radius. Its angle follows the --spin custom property, which
 * useSpinOnHover drives.
 */
export const spinBorderSx = (width = 1, { opacity = 1 } = {}) => ({
  position: "relative",
  isolation: "isolate",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    borderRadius: "inherit",
    padding: `${width}px`,
    background: strokeGradientCss(),
    opacity,
    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
    pointerEvents: "none",
    zIndex: 1,
  },
});

/* ── hover rotation ───────────────────────────────────────────────────── */

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Calm, slow turn: one full turn in about 14 s, easing in over ~0.8 s when
// the hover starts and gliding to a stop over ~0.8 s when it ends.
const SPIN = { degPerSec: 26, easeMs: 800 };

/**
 * Turns the border gradient while the element is hovered (or focused) and
 * leaves it at the angle where it came to rest.
 *   const spin = useSpinOnHover();
 *   <Box ref={spin.ref} {...spin.hoverProps} sx={spinBorderSx()} />
 * For SVG strokes pass onAngle and rotate the gradient yourself.
 */
export function useSpinOnHover({ degPerSec = SPIN.degPerSec, easeMs = SPIN.easeMs, onAngle } = {}) {
  const ref = useRef(null);
  const angle = useRef(0);
  const raf = useRef(0);
  const last = useRef(0);
  const speed = useRef(0);      // current speed, 0..1 of degPerSec
  const target = useRef(0);     // 1 while hovered, 0 after
  const onAngleRef = useRef(onAngle);
  onAngleRef.current = onAngle;

  const apply = (a) => {
    if (ref.current) ref.current.style.setProperty("--spin", `${a}deg`);
    onAngleRef.current?.(a);
  };
  const tick = (t) => {
    const dt = last.current ? Math.min(64, t - last.current) : 16;
    last.current = t;
    // ease the speed toward the target (smoothstep-like approach)
    const step = dt / easeMs;
    speed.current += Math.sign(target.current - speed.current) * Math.min(step, Math.abs(target.current - speed.current));
    const eased = speed.current * speed.current * (3 - 2 * speed.current);
    angle.current = (angle.current + (degPerSec * eased * dt) / 1000) % 360;
    apply(angle.current);
    if (target.current === 0 && speed.current <= 0) { raf.current = 0; last.current = 0; return; }
    raf.current = requestAnimationFrame(tick);
  };
  const start = () => {
    if (reducedMotion()) return;
    target.current = 1;
    if (!raf.current) { last.current = 0; raf.current = requestAnimationFrame(tick); }
  };
  const stop = () => { target.current = 0; };   // glides to a stop in tick
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return {
    ref,
    angle,
    hoverProps: { onMouseEnter: start, onMouseLeave: stop, onFocus: start, onBlur: stop },
  };
}

/* ── shape helpers ────────────────────────────────────────────────────── */

/**
 * Rescale an absolute SVG path (M/L/H/V/C/Z) from a w×h box to 0..1, for a
 * clipPath with clipPathUnits="objectBoundingBox" that stretches with its
 * element. (ox, oy) is the box's top-left corner in path coordinates.
 */
export function normalizePath(d, w, h, ox = 0, oy = 0) {
  const tokens = d.match(/[MLHVCZmlhvcz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  let out = "", cmd = "", i = 0, axis = 0;
  for (const t of tokens) {
    if (/[A-Za-z]/.test(t)) { cmd = t.toUpperCase(); out += ` ${cmd}`; i = 0; continue; }
    const v = parseFloat(t);
    if (cmd === "H") axis = 0;
    else if (cmd === "V") axis = 1;
    else axis = i % 2;
    out += ` ${(axis === 0 ? (v - ox) / w : (v - oy) / h).toFixed(5)}`;
    i++;
  }
  return out.trim();
}
