import { useEffect, useState } from "react";
import { Box, Typography, useMediaQuery } from "@mui/material";

// Shared persistent audio state so all pages share the same mute toggle
let globalAudio = null;
let globalMuted = true;
const listeners = new Set();

function getAudio() {
  if (!globalAudio) {
    globalAudio = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
    globalAudio.loop = true;
    globalAudio.volume = 0.35;
  }
  return globalAudio;
}

export default function AudioButton() {
  const [muted, setMuted] = useState(globalMuted);
  const isMobile = useMediaQuery("(max-width:1024px)");

  // Subscribe to global state changes
  useEffect(() => {
    const sync = (v) => setMuted(v);
    listeners.add(sync);
    return () => listeners.delete(sync);
  }, []);

  const toggle = () => {
    const audio = getAudio();
    if (globalMuted) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
    globalMuted = !globalMuted;
    listeners.forEach((fn) => fn(globalMuted));
  };

  if (isMobile) return null;

  return (
    <Box sx={{
      position: "fixed", bottom: 28, right: 28, zIndex: 99998,
      display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
    }}>
      <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase" }}>
        ON/OFF
      </Typography>
      <Box
        onClick={toggle}
        sx={{
          width: 40, height: 40, borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(30,35,30,0.7)",
          backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          transition: "border 0.2s, box-shadow 0.2s",
          "&:hover": { border: "1px solid rgba(0,255,150,0.5)", boxShadow: "0 0 10px rgba(0,255,150,0.2)" },
        }}
      >
        {muted ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </Box>
    </Box>
  );
}
