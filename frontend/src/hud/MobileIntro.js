// Mobile intro: a short, portrait cut of the desktop flythrough.
//
// The desktop scrolls through 165 full-size frames; on phones that is too
// heavy and scroll-scrubbing fights the page, so this plays a 4-second
// portrait video (≈1.2 MB) made from the same frames: clouds → city → the
// pod door opening, then fades into the mobile UI.
//
// - Opens on the first frame with the same glass card as the desktop
//   ("Tap to enter the Design lab"); the tap starts the video.
// - "Skip" is always available; the video failing to load or play also
//   skips straight to the UI.
// - Shown once per visit; the parent skips it for reduced-motion users.

import React, { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";

const SRC_MP4 = "/assets/mobile/intro.mp4";    // phones (H.264)
const SRC_WEBM = "/assets/mobile/intro.webm";  // browsers without H.264
const POSTER = "/assets/mobile/intro-poster.jpg";
const PRIMARY = "#00CD1F";
const FADE_MS = 650;

export default function MobileIntro({ onDone }) {
  const videoRef = useRef(null);
  const [stage, setStage] = useState("ready");   // ready → playing → leaving
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setStage("leaving");
    setTimeout(() => {
      onDone?.();
      // lets the mobile UI start its own first-visit hints now it's visible
      window.dispatchEvent(new Event("mobileintro:done"));
    }, FADE_MS);
  };

  const start = () => {
    const v = videoRef.current;
    if (!v) return finish();
    setStage("playing");
    const p = v.play();
    if (p && p.catch) p.catch(() => finish());
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    const onTime = () => v.duration && setProgress(v.currentTime / v.duration);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", finish);
    v.addEventListener("error", finish);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", finish);
      v.removeEventListener("error", finish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box role="dialog" aria-label="Intro" data-mobile-intro sx={{
      position: "fixed", inset: 0, zIndex: 100000, background: "#000",
      opacity: stage === "leaving" ? 0 : 1,
      transition: `opacity ${FADE_MS}ms ease`,
      pointerEvents: stage === "leaving" ? "none" : "auto",
    }}>
      <Box component="video" ref={videoRef} poster={POSTER}
        muted playsInline preload="auto" aria-hidden
        sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}>
        <source src={SRC_MP4} type="video/mp4" />
        <source src={SRC_WEBM} type="video/webm" />
      </Box>

      {/* entry card, same glass as the desktop "Scroll to enter" card */}
      {stage === "ready" && (
        <Box component="button" onClick={start} aria-label="Tap to enter the Design lab"
          sx={{
            position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
            display: "flex", alignItems: "center", gap: 2,
            px: "32px", py: "20px", minWidth: 260,
            borderRadius: "14px",
            background: "rgba(40,50,45,0.55)",
            backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            cursor: "pointer", textAlign: "left", color: "inherit", font: "inherit",
            animation: "introCardIn 0.6s ease-out",
            "@keyframes introCardIn": { from: { opacity: 0, transform: "translate(-50%, -44%)" }, to: { opacity: 1, transform: "translate(-50%, -50%)" } },
          }}>
          {/* tap mark: a dot with a slow pulse ring */}
          <Box aria-hidden sx={{
            position: "relative", width: 22, height: 22, flexShrink: 0,
            "&::before": { content: '""', position: "absolute", inset: 6, borderRadius: "50%", background: PRIMARY },
            "&::after": {
              content: '""', position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${PRIMARY}`,
              animation: "tapPulse 1.6s ease-out infinite",
            },
            "@keyframes tapPulse": { "0%": { transform: "scale(0.6)", opacity: 0.9 }, "100%": { transform: "scale(1.6)", opacity: 0 } },
          }} />
          <Box>
            <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: "15px", fontWeight: 400, lineHeight: 1.5 }}>
              Tap to enter the
            </Typography>
            <Typography sx={{ color: "#fff", fontSize: "14px", fontWeight: 700, lineHeight: 1.3 }}>
              Design lab
            </Typography>
          </Box>
        </Box>
      )}

      {/* skip */}
      <Box component="button" onClick={finish} sx={{
        position: "absolute",
        top: "max(16px, env(safe-area-inset-top))", right: 16,
        minWidth: 64, height: 36, px: "14px",
        borderRadius: "10px",
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(20,24,20,0.45)",
        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        color: "rgba(255,255,255,0.85)", fontSize: "13px", letterSpacing: "0.5px",
        cursor: "pointer",
      }}>
        Skip
      </Box>

      {/* progress, like the desktop's green line */}
      {stage !== "ready" && (
        <Box aria-hidden sx={{
          position: "absolute", left: 24, right: 24,
          bottom: "max(24px, calc(env(safe-area-inset-bottom) + 12px))",
          height: 2, borderRadius: 2, background: "rgba(255,255,255,0.12)", overflow: "hidden",
        }}>
          <Box sx={{ height: "100%", width: `${progress * 100}%`, background: PRIMARY, boxShadow: `0 0 8px ${PRIMARY}`, transition: "width 0.2s linear" }} />
        </Box>
      )}
    </Box>
  );
}
