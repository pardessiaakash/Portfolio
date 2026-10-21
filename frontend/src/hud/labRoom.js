// Shared state of the 3D lab room (hud/LabWindow), kept outside React and
// outside the three.js chunk so any page can steer it cheaply.
//
// The room has two resting depths:
//   home  – the eye where the flight ends (the home HUDs float mid-room)
//   inner – the eye pushed in through the glass (the category pages)
// Moving between them is the "step into the lab" dive: the screen stays a
// pane of glass while the eye travels, so the room opens up around you.

import { useEffect, useState } from "react";

export const lab = {
  depth: "home",        // where the eye is heading / resting
  ready: false,         // the room is drawn and can take over the background
  arrive: null,         // depth a page should animate its HUD in for (consumed on mount)
};

const listeners = new Set();
export const subscribeLab = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (e) => listeners.forEach((fn) => fn(e));

export const prefersReducedMotion = typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Move the eye to a resting depth. opts.from = "far" starts from well behind the glass. */
export function setLabDepth(depth, opts = {}) {
  if (lab.depth === depth && !opts.from && !opts.force) return;
  lab.depth = depth;
  emit({ type: "depth", depth, ...opts });
}

// how long the HUDs take to fly out before the next page mounts
export const LEAVE_MS = 420;

/**
 * Go to another page through the room: the current HUDs fly out, the eye
 * dives (or pulls back), and the next page's HUDs arrive while it settles.
 * Falls back to a plain navigation when the room isn't running.
 */
export function travel(navigate, path, depth) {
  if (!lab.ready || prefersReducedMotion) {
    lab.depth = depth;
    navigate(path);
    return;
  }
  lab.arrive = depth;
  emit({ type: "leave", depth });
  setLabDepth(depth);
  setTimeout(() => navigate(path), LEAVE_MS);
}

/** true while this page's HUDs are flying out */
export function useLabLeaving() {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => subscribeLab((e) => { if (e.type === "leave") setLeaving(true); }), []);
  return leaving;
}

/** true once, for a page reached through the room (its HUDs animate in) */
export function useLabArrival(depth) {
  const [arrived] = useState(() => {
    const yes = lab.arrive === depth;
    if (yes) lab.arrive = null;
    return yes;
  });
  return arrived;
}
