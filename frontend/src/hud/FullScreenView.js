// Full-screen carousel, from the Figma frame "Full Scree Mode_For Claude".
//
// Opened by the expand button (Expand_Icon) on the category page. A
// 1678 × 963 slide box over the darkened room, prev / next outside its
// edges, the dots below and the Contract_Icon button bottom-right to close.
// Esc also closes; ← / → change slides. Laid out on the same 1920 × 1087
// stage as the category page and scaled to fit the window.

import React, { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { spinBorderSx } from "./glass";
import CustomTooltip from "../CustomTooltip";

const PRIMARY = "#00CD1F";
const STAGE_W = 1920, STAGE_H = 1087;

// Figma geometry (stage pixels)
const BOX = { x: 121, y: 63, w: 1678, h: 963 };
const ARROW = { size: 50, y: 520, prevX: 95, nextX: 1774 };
const CONTRACT = { x: 1741, y: 961, size: 44 };
const DOTS_Y = 1051;                            // 25px below the box

function useFitScale() {
  // like the category page: cover the window, but keep the whole frame
  // (x 95–1824, y 63–1063) inside it
  const calc = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    return Math.min(Math.max(vw / STAGE_W, vh / STAGE_H), vw / 1780, vh / STAGE_H);
  };
  const [s, setS] = useState(calc);
  useEffect(() => {
    const on = () => setS(calc());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return s;
}

const btnSx = (size, border) => ({
  position: "absolute",
  width: size, height: size, p: 0,
  boxSizing: "border-box",
  display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: "10px",
  border,
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(13.55px)", WebkitBackdropFilter: "blur(13.55px)",
  boxShadow: "-1px 3px 13px rgba(0,0,0,0.35), inset 0 1px 2px rgba(0,0,0,0.25)",
  cursor: "pointer",
  transition: "border-color 0.25s ease, background 0.25s ease",
  "&:hover": { borderColor: "rgba(255,255,255,0.9)", background: "rgba(255,255,255,0.08)" },
});

const Chevron = ({ dir }) => (
  <svg width="10" height="18" viewBox="0 0 10 18" aria-hidden>
    <path d={dir === "left" ? "M9 1 1 9l8 8" : "M1 1l8 8-8 8"} fill="none" stroke={PRIMARY}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function FullScreenView({ slides, index, onIndex, onClose, title }) {
  const s = useFitScale();
  const closeRef = useRef(null);
  const n = slides.length;
  const prev = () => onIndex((index + n - 1) % n);
  const next = () => onIndex((index + 1) % n);

  // Esc closes, arrow keys change slides; focus the close button on open
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <Box role="dialog" aria-modal="true" aria-label={`${title ?? "Project"} – full screen`}
      sx={{
        position: "fixed", inset: 0, zIndex: 999, overflow: "hidden",
        // the room, darkened like the category page
        backgroundImage: "url('/assets/images/bg-images/bg.jpg')",
        backgroundSize: "cover", backgroundPosition: "center",
        animation: "fsIn 0.22s ease-out",
        "@keyframes fsIn": { from: { opacity: 0 }, to: { opacity: 1 } },
      }}>
      <Box aria-hidden sx={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 62% 58% at 50% 48%,
          rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.62) 60%, rgba(0,0,0,0.85) 100%)`,
      }} />

      <Box sx={{
        position: "absolute", left: "50%", top: "50%",
        width: STAGE_W, height: STAGE_H,
        transform: `translate(-50%, -50%) scale(${s})`,
      }}>
        {/* slide box with the glass edge */}
        <Box sx={{
          ...spinBorderSx(1),
          position: "absolute", left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h,
          borderRadius: "20px",
          boxShadow: "4px 13px 19px rgba(0,0,0,0.35), inset 0 1px 2px rgba(0,0,0,0.25)",
          background: "#0B141C",
        }}>
          <Box sx={{ position: "absolute", inset: "1px", borderRadius: "19px", overflow: "hidden" }}>
            <Box component="img" src={slides[index]} alt={`${title ?? "Project"} slide ${index + 1}`}
              sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
          </Box>
        </Box>

        {/* prev / next, outside the box edges */}
        <Box component="button" aria-label="Previous slide" onClick={prev}
          sx={{ ...btnSx(ARROW.size, "1px solid rgba(255,255,255,0.6)"), left: ARROW.prevX, top: ARROW.y }}>
          <Chevron dir="left" />
        </Box>
        <Box component="button" aria-label="Next slide" onClick={next}
          sx={{ ...btnSx(ARROW.size, "1px solid rgba(255,255,255,0.6)"), left: ARROW.nextX, top: ARROW.y }}>
          <Chevron dir="right" />
        </Box>

        {/* Contract_Icon: exit full screen */}
        <CustomTooltip title="Exit full screen (Esc)" placement="left"
          wrapperSx={{ position: "absolute", left: CONTRACT.x, top: CONTRACT.y }}>
        <Box component="button" ref={closeRef} aria-label="Exit full screen (Esc)"
          onClick={onClose}
          sx={{ ...btnSx(CONTRACT.size, "1px solid #8F8F8F"), position: "relative",
            outline: "none", "&:focus-visible": { borderColor: PRIMARY } }}>
          <svg width="21" height="21" viewBox="0 0 21 21" aria-hidden>
            {/* four arrows pointing in to the centre */}
            <path d="M1 1l6.5 6.5M7.5 2.5v5h-5M20 1l-6.5 6.5M13.5 2.5v5h5M20 20l-6.5-6.5M13.5 18.5v-5h5M1 20l6.5-6.5M7.5 18.5v-5h-5"
              fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Box>
        </CustomTooltip>

        {/* dots */}
        <Box sx={{
          position: "absolute", top: DOTS_Y, left: BOX.x + BOX.w / 2, transform: "translateX(-50%)",
          display: "flex", gap: "16px",
        }}>
          {slides.map((_, i) => (
            <Box key={i} component="button" aria-label={`Slide ${i + 1}`} aria-current={i === index}
              onClick={() => onIndex(i)}
              sx={{
                width: 12, height: 12, p: 0, borderRadius: "10px", cursor: "pointer",
                boxSizing: "border-box",
                border: i === index ? "none" : "1px solid #DDDDDD",
                background: i === index ? PRIMARY : "rgba(255,255,255,0.03)",
                boxShadow: "-1px 3px 13px rgba(0,0,0,0.35), inset 0 1px 2px rgba(0,0,0,0.25)",
                transition: "background 0.25s ease",
                "&:hover": { background: i === index ? PRIMARY : "rgba(255,255,255,0.25)" },
              }} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
