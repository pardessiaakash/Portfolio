// Where the live HUD sits on each frame of the intro, now that the footage
// itself has no HUD (Final_For_Claude.mp4, rendered with the HUD layer off).
//
// Measured from the previous footage (which had the HUD baked in) against the
// clean render, frame by frame: the HUD grows linearly with the frame number,
// scaling about the room's vanishing point P (fit error < 1 px), and fades in
// over frames ~100–111. At LAST_HUD_FRAME (148) the pose is identity: the HUD
// is exactly where the settled UI sits (HUD_SCALE in VideoFlow).
//
// The floor shadow under it is baked into the frames (same scale, same fade),
// so HUD and shadow move as one.

const LAST = 148;
const K = 0.01835;                  // scale change per frame
const P = [964.8, 498.6];           // vanishing point the HUD grows from (1920×1080 frame px)
const C = [960, 540];               // frame centre (the stage's transform origin)
const FADE = [99.5, 111];           // opacity 0 → 1 between these frames

export const INTRO_HUD = { first: 100, last: LAST };

const smooth = (t) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };

/**
 * The HUD's pose on intro frame f, for the stage transform:
 * translate(tx, ty) scale(s), in stage px about the stage centre.
 * Null after the last HUD frame (the settled UI takes over).
 */
export function introPose(f) {
  if (f == null || f < 0 || f > LAST) return null;
  const s = Math.max(0.02, 1 - K * (LAST - f));
  // frame px: p' = P + s (p - P)  →  about the centre: q' = s q + (1 - s)(P - C)
  return {
    s,
    tx: (1 - s) * (P[0] - C[0]),
    ty: (1 - s) * (P[1] - C[1]),
    a: smooth((f - FADE[0]) / (FADE[1] - FADE[0])),
  };
}
