// Minimal "techno" cursor for desktop: a green core dot that tracks the
// pointer exactly, and a thin segmented ring (a targeting reticle) that
// trails slightly behind.
//   - over buttons, cards, links: the ring opens up and turns slowly
//   - over the split handle: the ring becomes a vertical bar (drag sideways)
//   - over text fields: the native text cursor is shown instead
//   - pressing: the ring tightens
// Only on devices with a precise pointer; reduced-motion: no trailing/turning.

import { useEffect, useRef } from "react";

const GREEN = "#00CD1F";
const RING = 30;          // ring diameter, px
const TRAIL_MS = 70;      // ring's trailing time constant; time-based, so the
                          // feel is the same at any frame rate (~0.2s to settle)

const INTERACTIVE =
  'a, button, [role="button"], [role="tab"], label, select, summary, ' +
  '.MuiButtonBase-root, [data-cursor="pointer"], [onclick]';
const TEXT = 'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]';
const RESIZE = '.handle-pill, [data-cursor="resize"]';

const finePointer = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: fine)").matches;
const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Elements with cursor:pointer set in their styles also count as interactive
const looksClickable = (el) => {
  for (let n = el, i = 0; n && n !== document.body && i < 6; n = n.parentElement, i++) {
    if (n.dataset && n.dataset.cursor === "default") return false;
    const c = n.style && n.style.cursor;
    if (c === "pointer") return true;
  }
  return false;
};

export default function TechCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (!finePointer()) return undefined;
    const root = document.documentElement;
    root.classList.add("tech-cursor");

    const dot = dotRef.current, ring = ringRef.current;
    const still = reducedMotion();
    let x = -100, y = -100, rx = -100, ry = -100;
    let state = "default", visible = false, raf = 0;

    const setState = (s) => {
      if (s === state) return;
      state = s;
      ring.dataset.state = s;
      dot.dataset.state = s;
    };

    // The cursor the site itself sets for an element (pointer on cards,
    // col-resize on the handle…). Our `cursor: none` rule masks it, so lift
    // the rule for one synchronous style read; nothing is painted meanwhile.
    const nativeCursor = new WeakMap();
    const siteCursor = (el) => {
      if (nativeCursor.has(el)) return nativeCursor.get(el);
      root.classList.remove("tech-cursor");
      const c = getComputedStyle(el).cursor;
      root.classList.add("tech-cursor");
      nativeCursor.set(el, c);
      return c;
    };

    const classify = (el) => {
      if (!el || !el.closest) return "default";
      if (el.closest(TEXT)) return "text";
      if (el.closest(RESIZE)) return "resize";
      if (el.closest(INTERACTIVE)) return "link";
      const c = siteCursor(el);
      if (c === "text") return "text";
      if (/resize/.test(c)) return "resize";
      if (c === "pointer" || looksClickable(el)) return "link";
      return "default";
    };

    const show = (v) => {
      if (v === visible) return;
      visible = v;
      dot.style.opacity = ring.style.opacity = v ? "" : "0";
    };

    const onMove = (e) => {
      x = e.clientX; y = e.clientY;
      if (!visible) { rx = x; ry = y; }
      show(true);
      setState(classify(e.target));
    };
    const onDown = () => { ring.dataset.pressed = "1"; };
    const onUp = () => { delete ring.dataset.pressed; };
    const onLeave = (e) => { if (!e.relatedTarget) show(false); };

    let last = 0;
    const tick = (t) => {
      const dt = last ? Math.min(100, t - last) : 16;
      last = t;
      const k = still ? 1 : 1 - Math.exp(-dt / TRAIL_MS);
      rx += (x - rx) * k;
      ry += (y - ry) * k;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseout", onLeave);
    raf = requestAnimationFrame(tick);
    show(false);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseout", onLeave);
      root.classList.remove("tech-cursor");
    };
  }, []);

  return (
    <>
      <style>{`
        @media (pointer: fine) {
          html.tech-cursor, html.tech-cursor * { cursor: none !important; }
          html.tech-cursor input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]),
          html.tech-cursor textarea, html.tech-cursor [contenteditable="true"] { cursor: text !important; }
        }
        .tc-dot, .tc-ring {
          position: fixed; left: 0; top: 0; z-index: 2147483647;
          pointer-events: none; will-change: transform;
          transition: opacity 0.2s ease;
        }
        .tc-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: ${GREEN};
          box-shadow: 0 0 6px rgba(0,205,31,0.9), 0 0 14px rgba(0,205,31,0.35);
        }
        .tc-dot[data-state="text"] { opacity: 0 !important; }
        .tc-ring { width: ${RING}px; height: ${RING}px; }
        .tc-ring svg { display: block; width: 100%; height: 100%; overflow: visible;
          transition: transform 0.35s cubic-bezier(.2,.8,.2,1), opacity 0.25s ease; }
        .tc-ring .tc-arcs { transform-origin: 50% 50%; transition: opacity 0.25s ease; }
        .tc-ring .tc-bar { opacity: 0; transition: opacity 0.2s ease; }
        .tc-ring[data-state="link"] svg { transform: scale(1.45); }
        .tc-ring[data-state="link"] .tc-arcs { animation: tcSpin 9s linear infinite; }
        .tc-ring[data-state="link"] circle.tc-c { stroke: ${GREEN}; stroke-opacity: 0.95; }
        .tc-ring[data-state="resize"] .tc-arcs { opacity: 0; }
        .tc-ring[data-state="resize"] .tc-bar { opacity: 1; }
        .tc-ring[data-state="text"] svg { opacity: 0; transform: scale(0.6); }
        .tc-ring[data-pressed] svg { transform: scale(0.75); }
        .tc-ring[data-pressed][data-state="link"] svg { transform: scale(1.15); }
        @keyframes tcSpin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .tc-ring[data-state="link"] .tc-arcs { animation: none; }
          .tc-ring svg { transition: none; }
        }
        @media (pointer: coarse) { .tc-dot, .tc-ring { display: none; } }
      `}</style>

      <div ref={ringRef} className="tc-ring" aria-hidden data-state="default">
        <svg viewBox="0 0 30 30">
          {/* four arcs with gaps at the compass points, reticle-style */}
          <g className="tc-arcs">
            <circle className="tc-c" cx="15" cy="15" r="13" fill="none"
              stroke="rgba(220,255,226,0.75)" strokeWidth="1"
              strokeDasharray="15.4 5" strokeDashoffset="7.7"
              style={{ transition: "stroke 0.25s, stroke-opacity 0.25s" }} />
          </g>
          {/* resize state: vertical bar with side ticks */}
          <g className="tc-bar" stroke={GREEN} strokeWidth="1.2" strokeLinecap="round" fill="none">
            <line x1="15" y1="4" x2="15" y2="26" />
            <path d="M9.5 12.5 L6.5 15 L9.5 17.5 M20.5 12.5 L23.5 15 L20.5 17.5" />
          </g>
        </svg>
      </div>
      <div ref={dotRef} className="tc-dot" aria-hidden data-state="default" />
    </>
  );
}
