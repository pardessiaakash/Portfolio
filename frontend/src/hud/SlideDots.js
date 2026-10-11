// Carousel dots shared by the project carousel and full-screen view:
// a sliding window centred on the active slide, fading out to the left and
// right so long decks read as a continuing row. The active slide is a
// glowing green pill.
import React from "react";
import { Box } from "@mui/material";

const PRIMARY = "#00CD1F";
export const DOTS = { slot: 30, view: 330 };   // dot slot width, visible window

export default function SlideDots({ count, current, onSelect, sx }) {
  const fade = "linear-gradient(90deg, transparent 0, #000 30%, #000 70%, transparent 100%)";
  return (
    <Box role="group" aria-label={`Slide ${current + 1} of ${count}`} sx={{
      width: DOTS.view, height: 24, overflow: "hidden", position: "absolute",
      maskImage: fade, WebkitMaskImage: fade, ...sx,
    }}>
      <Box sx={{
        position: "absolute", top: 0, left: 0, height: 24, display: "flex",
        transform: `translateX(${DOTS.view / 2 - (current + 0.5) * DOTS.slot}px)`,
        transition: "transform 0.35s cubic-bezier(.2,.8,.2,1)",
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      }}>
        {Array.from({ length: count }, (_, i) => {
          const dist = Math.abs(i - current);
          const on = i === current;
          return (
            <Box key={i} component="button" aria-label={`Slide ${i + 1}`}
              aria-current={on ? "true" : undefined} onClick={() => onSelect(i)}
              tabIndex={dist > 4 ? -1 : 0}
              sx={{
                width: DOTS.slot, height: 24, p: 0, border: "none", background: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
                "&:focus-visible": { outline: "none" },
                "&:focus-visible > span": { outline: `2px solid ${PRIMARY}`, outlineOffset: "3px" },
                "&:hover > span": { background: on ? PRIMARY : "rgba(255,255,255,0.55)" },
              }}>
              <Box component="span" sx={{
                display: "block", height: 10, borderRadius: "10px",
                width: on ? 28 : 10,
                transform: `scale(${on ? 1 : dist === 1 ? 0.9 : 0.75})`,
                background: on ? PRIMARY : "rgba(255,255,255,0.28)",
                boxShadow: on ? "0 0 10px rgba(0,205,31,0.75)" : "none",
                transition: "width 0.3s ease, transform 0.3s ease, background 0.25s ease",
              }} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
