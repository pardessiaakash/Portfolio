// First thing a desktop visitor sees: a dark screen with a loader while the
// intro frames download, so the flythrough never stalls or skips ahead.
// When everything is in, "Enter the Design Lab" appears; the intro starts
// only after it's clicked (or Enter / Space is pressed).
import React, { useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";

const PRIMARY = "#00CD1F";

export default function IntroLoader({ progress, ready, leaving, onEnter }) {
  const btnRef = useRef(null);
  useEffect(() => { if (ready) btnRef.current?.focus({ preventScroll: true }); }, [ready]);
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <Box role="dialog" aria-modal="true" aria-label="Loading the portfolio" sx={{
      position: "fixed", inset: 0, zIndex: 100000, background: "#030504",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: leaving ? 0 : 1, transition: "opacity 0.6s ease",
      pointerEvents: leaving ? "none" : "auto",
    }}>
      {/* soft green glow behind the loader */}
      <Box aria-hidden sx={{
        position: "absolute", width: 520, height: 520, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,205,31,0.10) 0%, rgba(0,205,31,0) 65%)",
        filter: "blur(10px)",
      }} />

      <Typography sx={{ fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase",
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
          </>
        ) : (
          <>
            <Box ref={btnRef} component="button" onClick={onEnter} sx={{
              mt: "8px", px: "34px", py: "16px", borderRadius: "999px", cursor: "pointer",
              border: `1px solid ${PRIMARY}`, background: "rgba(0,205,31,0.10)", color: "#fff",
              fontFamily: "inherit", fontSize: "16px", fontWeight: 600, letterSpacing: "0.5px",
              boxShadow: "0 0 24px rgba(0,205,31,0.25)",
              animation: "enterIn 0.5s ease-out, enterPulse 2.4s ease-in-out 0.5s infinite",
              transition: "background 0.2s ease, transform 0.2s ease",
              "&:hover, &:focus-visible": { background: "rgba(0,205,31,0.22)", outline: "none", transform: "scale(1.03)" },
              "@keyframes enterIn": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "none" } },
              "@keyframes enterPulse": { "0%,100%": { boxShadow: "0 0 18px rgba(0,205,31,0.2)" }, "50%": { boxShadow: "0 0 34px rgba(0,205,31,0.45)" } },
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }}>
              Enter the Design Lab
            </Box>
            <Typography sx={{ mt: "16px", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
              Click, or press Enter
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}
