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

/** Larger panels: a darker base so text stays easy to read. */
export const glassPanelSx = {
  background:
    "linear-gradient(160deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.025) 35%, rgba(255,255,255,0.012) 100%)",
  backgroundColor: "rgba(10,12,11,0.42)",
  backdropFilter: "blur(28px) saturate(160%) brightness(0.9)",
  WebkitBackdropFilter: "blur(28px) saturate(160%) brightness(0.9)",
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

/**
 * Turns the border gradient while the element is hovered (or focused) and
 * leaves it at its last angle afterwards.
 *   const spin = useSpinOnHover();
 *   <Box ref={spin.ref} {...spin.hoverProps} sx={spinBorderSx()} />
 * For SVG strokes pass onAngle and rotate the gradient yourself.
 */
export function useSpinOnHover({ degPerSec = 150, onAngle } = {}) {
  const ref = useRef(null);
  const angle = useRef(0);
  const raf = useRef(0);
  const last = useRef(0);
  const onAngleRef = useRef(onAngle);
  onAngleRef.current = onAngle;

  const apply = (a) => {
    if (ref.current) ref.current.style.setProperty("--spin", `${a}deg`);
    onAngleRef.current?.(a);
  };
  const tick = (t) => {
    if (last.current) angle.current = (angle.current + (degPerSec * (t - last.current)) / 1000) % 360;
    last.current = t;
    apply(angle.current);
    raf.current = requestAnimationFrame(tick);
  };
  const start = () => {
    if (raf.current || reducedMotion()) return;
    last.current = 0;
    raf.current = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
  };
  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps

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
