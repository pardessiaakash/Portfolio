// First thing a desktop visitor sees: a dark screen with a loader while the
// intro frames download, so the flythrough never stalls or skips ahead.
// When everything is in, "Enter the Design Lab" appears; the intro starts
// only after it's clicked (or Enter / Space is pressed).
import React, { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import GlassButton from "./GlassButton";

const PRIMARY = "#00CD1F";

// On a slow connection, offer a way in without waiting for the whole intro.
const SKIP_OFFER_MS = 6000;

export default function IntroLoader({ progress, ready, leaving, onEnter, onSkipIntro }) {
  const btnRef = useRef(null);
  const [offerSkip, setOfferSkip] = useState(false);
  useEffect(() => {
    if (ready) return undefined;
    const t = setTimeout(() => setOfferSkip(true), SKIP_OFFER_MS);
    return () => clearTimeout(t);
  }, [ready]);
  // Enter (or Space) enters once ready, without moving focus to the button
  // (which would show its keyboard focus ring to mouse users)
  useEffect(() => {
    if (!ready || leaving) return undefined;
    const onKey = (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEnter(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, leaving, onEnter]);
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <Box role="dialog" aria-modal="true" aria-label="Loading the portfolio" sx={{
      position: "fixed", inset: 0, zIndex: 100000,
      // solid black at 90%: the opening frame of the flight shows through faintly
      background: "rgba(0,0,0,0.9)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: leaving ? 0 : 1, transition: "opacity 0.6s ease",
      pointerEvents: leaving ? "none" : "auto",
    }}>
      <Typography component="p" sx={{ fontSize: "12px", fontWeight: 400, letterSpacing: "4px", textTransform: "uppercase", m: 0,
        color: "rgba(255,255,255,0.55)", mb: "14px", position: "relative" }}>
        Akash P · Design Lab
      </Typography>

      <Box sx={{ position: "relative", height: 132, width: 340, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "flex-start" }}>
        {!ready ? (
          <>
            <Typography aria-live="polite" sx={{ fontSize: "44px", fontWeight: 700, color: "#fff",
              fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
              {pct}<Box component="span" sx={{ color: PRIMARY, fontSize: "24px", ml: "4px" }}>%</Box>
            </Typography>
            <Box sx={{ mt: "18px", width: 300, height: 2, borderRadius: 2, background: "rgba(255,255,255,0.12)",
              position: "relative", overflow: "hidden" }}>
              <Box sx={{ position: "absolute", inset: 0, width: `${pct}%`,
                background: `linear-gradient(90deg, rgba(0,205,31,0.2), ${PRIMARY})`,
                boxShadow: "0 0 10px rgba(0,205,31,0.7)", transition: "width 0.3s ease" }} />
            </Box>
            <Typography sx={{ mt: "14px", fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>
              Loading the experience…
            </Typography>
            {offerSkip && onSkipIntro && (
              <Box component="button" type="button" onClick={onSkipIntro} sx={{
                mt: "14px", p: "6px 10px", border: 0, background: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: "13px", color: "rgba(255,255,255,0.8)",
                textDecoration: "underline", textUnderlineOffset: "4px", textDecorationColor: "rgba(0,205,31,0.7)",
                animation: "enterIn 0.5s ease-out",
                "@keyframes enterIn": { from: { opacity: 0 }, to: { opacity: 1 } },
                "&:hover, &:focus-visible": { color: PRIMARY },
              }}>
                Slow connection? Skip the intro
              </Box>
            )}
          </>
        ) : (
          <>
            <GlassButton ref={btnRef} onClick={onEnter} size="lg" sx={{
              mt: "8px",
              animation: "enterIn 0.5s ease-out",
              "@keyframes enterIn": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "none" } },
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }}>
              Enter the Design Lab
            </GlassButton>
            <Typography sx={{ mt: "16px", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
              Click, or press Enter
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}
